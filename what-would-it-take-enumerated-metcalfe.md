# Plan: Migrate from static JSON on GCS to Firestore, with a UI write path

## Context

Today the app is read-only: the Bun pipeline compiles JSON artifacts, `scripts/upload.ts` gzips them to `gs://typedef/leeft/` with a timestamp, and the static-export web app fetches four of them client-side (`fetchData.ts`), pinned by `NEXT_PUBLIC_TIMESTAMP`. Any data change means pipeline → upload → env bump → redeploy. The goal is a **write path from the UI** (log lifting workouts, manage cycles, edit/annotate data) with **no backend service of our own** — the app stays a Next.js static export on Firebase Hosting. Reads stay public; writes are restricted to the owner's Google account.

**Re-examination of `not-the-older-workouts-sunny-ritchie.md`** (the `startedAt` pass): that plan is already implemented — `startedAt` is in the schemas and `groupWorkoutsByDay` sorts by it. Its "Next pass" section recommended Postgres *contingent on building a 3rd backend app with Google login*. That premise has changed: the user has since chosen to stay serverless/static, which flips the recommendation to **Firestore** (see comparison). Nothing else in that plan needs revisiting; `startedAt` maps cleanly into the Firestore docs as an ISO string.

Current volumes (measured): 809 lifting workouts (3.8 MB), 5,957 cardio workouts (4.6 MB), 193 exercises (108 KB), 81 cycles (63 KB). `all-workouts-log.json` and `cycles-all-workouts.json` are uploaded but unused by the web app — dropped from the migration.

## Firestore vs Google Cloud Postgres

| Criterion | Firestore | Cloud SQL Postgres |
|---|---|---|
| Static export, no backend | Native: browser client SDK + security rules; firebase-admin for scripts | **Disqualifying**: Postgres can't be exposed to browsers; requires an API layer (Cloud Run/Functions) — the backend the user ruled out |
| Write auth | Firebase Auth Google sign-in + rules (`request.auth.uid == OWNER_UID`), same project as Hosting | Auth built into the API layer (JWT, CORS…) |
| Cost | Free tier ~50k reads / 20k writes / 1 GiB per day. With the chunk model below (~55 reads cold, ~1 warm, ~9 MB data) → **$0/mo** | Smallest always-on instance **~$10–15/mo** + API cost, for a 9 MB single-user dataset |
| Relational fit | Weak joins — but irrelevant: cycle→workout joins and all stats are already computed client-side over the full in-memory dataset, and that stays | Real SQL joins/aggregations — only valuable if a server did the querying |
| Migration effort | Small: seed script + swap `fetchData.ts` internals; providers/contexts/pages untouched | Large: schema, API service, deploy, auth middleware, client rewrite |

Adjacent options: **Firebase Data Connect** = GCP's Postgres-behind-a-client-SDK, but it still runs a paid Cloud SQL instance (~$10+/mo floor). **Supabase** = free-tier Postgres with client SDK + RLS, but off-GCP, second vendor, free projects pause on inactivity.

**Recommendation: Firestore.** Under the serverless/static constraint it's the only option giving public reads, owner-gated writes, and build-script access with zero servers and zero monthly cost. Firestore's real hazard here — per-document read billing against ~7,000 records — is solved by the data model, not by switching databases.

## Firestore data model (designed around read billing)

Naive 1-doc-per-workout = ~7,040 reads/load. Instead: **quarterly chunk docs + a manifest + IndexedDB cache**.

```
meta/manifest          1 doc — { chunks: { "<chunkId>": { updatedAt: millis, hash } } }
lifting/{YYYY-Qn}      ~26 docs — { updatedAt, workouts: { [uuid]: Workout } }   (~145 KB avg)
cardio/{YYYY-Qn}       ~26 docs — { updatedAt, workouts: { [uuid]: CardioWorkout } } (~180 KB avg)
app/exercises          1 doc — { updatedAt, exercises: { [id]: ExerciseMetadata } } (~110 KB)
app/cycles             1 doc — { updatedAt, cycles: { [uuid]: Cycle } }  (WITHOUT workouts[] — see below)
```

- Quarterly buckets keep docs far under the 1 MiB limit (yearly cardio would average ~750 KB — too close). Sync script asserts serialized chunk < 800 KB and fails loudly.
- **Read budget**: cold load = 1 + 26 + 26 + 2 ≈ **55 reads**. Warm load: read manifest (1 read), compare each chunk's `updatedAt` against IndexedDB cache (`idb-keyval`, chunkId → `{updatedAt, data}`), fetch only stale chunks → typically **1 read**. Manual caching, not Firestore `persistentLocalCache` — deterministic, works with `firestore/lite`, avoids offline-persistence quirks. (Firestore data bundles considered; manifest scheme is near-equal cost with less machinery.)
- **Dates stored as ISO strings** inside chunk maps, not Firestore Timestamps — `z.coerce.date` handles strings but NOT Timestamp objects. Only `updatedAt` metadata uses millis. `packages/types` schemas work unmodified.
- **Cycle membership moves client-side**: port `addWorkoutsToCycles` (`apps/data/src/combine/utils.ts:9`, date-interval matching) to `packages/utils` and run it in `providers.tsx`. Cycles become pure user data (name, type, dates, location, note); a cycle edit is one field write and re-associates workouts instantly.
- **Date canonicalization at seed time**: apply the `dateFromTitle(title)` correction (currently done client-side at `fetchData.ts:29`) in the seed/sync script so stored `date` is canonical and quarter bucketing matches; the web fetch layer then drops the rewrite.

## Auth

- Enable Google provider in Firebase Auth (project `api-project-992432653598`); authorize the leeft-log domain + localhost.
- New `apps/web/src/lib/auth.tsx`: `AuthProvider` + `useAuth()` → `{user, isOwner, signIn, signOut}`; `isOwner = user?.uid === process.env.NEXT_PUBLIC_OWNER_UID`. Lazy-`import('firebase/auth')` only when a `leeft:wasSignedIn` localStorage flag exists or the sign-in button is clicked (keeps auth out of the anonymous bundle).
- Sign-in affordance: small icon button in the v2 header (`components/layout/v2/headerV2.tsx`) — `signInWithPopup`, avatar dot when signed in.
- New `apps/web/firestore.rules`, registered via a `firestore` key in `apps/web/firebase.json`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == "<OWNER_UID>";
    }
  }
}
```

## Implementation

### Phase 0 — freeze IDs, provision, seed (~0.5–1 day)
1. `apps/data/scripts/freeze-cycle-uuids.ts`: mint uuids for entries in `data/in/cycles.json` lacking one (same logic as `combine/utils.ts:44`) and write them back — cycle uuids are currently regenerated per pipeline run; must be stable before Firestore references them.
2. Enable Firestore + Auth in the Firebase console; deploy rules.
3. `scripts/seed-firestore.ts` (Bun + `firebase-admin`, ADC): read `apps/data/data/out/{lifting-log,cardio-log,cycles-lifting}.json` (strip cycles' `workouts[]`) + `apps/data/data/exercise-classified.json`; apply `dateFromTitle` correction; bucket by quarter; batched `set(..., {merge: true})` (≤500 ops); write manifest with per-chunk `updatedAt` + content hash. Deterministic doc IDs + merge = idempotent. Chunking logic in a shared `scripts/lib/firestore-chunks.ts` (reused by sync).

### Phase 1 — web read rewire (~1–2 days)
4. `apps/web/src/lib/firebase.ts`: modular init, `firebase/app` + **`firebase/firestore/lite`** (REST-based, ~40–50 KB gzip; no realtime/offline needed). Config via `NEXT_PUBLIC_FIREBASE_*` env vars.
5. `apps/web/src/lib/cache.ts`: IndexedDB helpers (add `idb-keyval`).
6. Rewrite `apps/web/src/lib/fetchData.ts` internals as one `loadAll()`: manifest read → per-chunk cache-or-fetch → Zod parse (new `LiftingChunkSchema`/`CardioChunkSchema`/`ManifestSchema` in `packages/types/src/index.ts`) → flatten maps to date-sorted arrays → return the **same four shapes** as today.
7. `apps/web/src/lib/providers.tsx`: swap the `Promise.all` of four fetchers for `loadAll()`; hydrate cycles with the ported `addWorkoutsToCycles`. `contexts.ts` and all pages stay untouched.
8. Dynamic routes under static export:
   - `/exercises/[id]`: keep `generateStaticParams`, but fetch the `app/exercises` doc at build time via the public Firestore REST endpoint (plain `fetch` in Node — reads are public, no SDK). Make a fetch failure fail the build loudly (today's silent `[]` would build zero pages).
   - `/cycles/[id]`: keep `generateStaticParams` for existing cycles, plus emit a `_shell` sentinel page; add to `apps/web/firebase.json`: `"rewrites": [{"source": "/cycles/**", "destination": "/cycles/_shell.html"}]`. Hosting serves exact files first, so only unknown (UI-created) cycle ids hit the shell, which derives the real id from `usePathname()`. New cycles work without rebuild.

### Phase 2 — auth + first write: cycles (~1 day)
9. `auth.tsx`, header sign-in button (per Auth section above).
10. `apps/web/src/lib/mutations.ts`: `saveCycle(cycle)` / `deleteCycle(uuid)` — one batched write: `update(app/cycles, {["cycles."+uuid]: cycle})` + manifest bump; then update IndexedDB cache and context in place (narrow `updateCycles` setter on the provider — no refetch).
11. UI: owner-only "New cycle" on `/cycles` and "Edit" on `/cycles/[id]` — plain form per v2 constraints (native `<select>` for type, paired `<input type="date">`, scoped v2 CSS classes, **no Radix**). Validate with `CycleSchema` before write. Membership is client-computed, so a saved date range shows its workouts immediately.

### Phase 3 — pipeline rewire + GCS retirement (~0.5–1 day)
12. `scripts/sync-firestore.ts` (shares `firestore-chunks.ts`): rebuild chunk contents from pipeline outputs, compare content hashes against `meta/manifest`, and for changed chunks write **per-uuid field paths** (`update({["workouts."+uuid]: data})`) — the pipeline upserts uuids it knows and never deletes/overwrites uuids it doesn't (protects future UI-created workouts and UI-owned fields). Bump manifest in the same batch. After seed, the UI owns `app/cycles`; the pipeline stops writing cycles but keeps syncing `app/exercises` from `exercise-classified.json`.
13. Root `package.json`: add `"sync": "bun scripts/sync-firestore.ts"`; point `refresh` at it. Keep GCS upload during a short parity window, then delete `scripts/upload.ts` and drop `NEXT_PUBLIC_TIMESTAMP`/`NEXT_PUBLIC_CDN_URL` from `apps/web/.env.local`.

### Phase 4+ — later write UIs (outlines only)
- **Annotate/edit workouts**: a pipeline-untouched `notes: {[uuid]: {note?, rpe?}}` map alongside `workouts` in each chunk doc (sync never writes `notes.*`, so re-ingest can't clobber). Fetch layer overlays notes onto workouts. ~1 day.
- **Lifting-workout logger**: owner-only form — exercise picker from `exerciseMap`, set rows, duration/RPE; port volume/workVolume calc from `apps/data/src/compile` into `packages/utils`; mint uuid v4; write = one field-path update on `lifting/{quarter}` + manifest bump. ~2–3 days.

## Types cleanup (ride-along)

- Chunk/manifest schemas go in `packages/types/src/index.ts` (single source of truth).
- Replace the duplicate `EffortSchema`/`CardioWorkoutSchema` in `apps/data/src/compile/types.ts` with imports from `@leeft/types`.

## Files summary

| File | Change |
|---|---|
| `apps/data/scripts/freeze-cycle-uuids.ts` | new — stabilize cycle uuids in `data/in/cycles.json` |
| `scripts/seed-firestore.ts`, `scripts/sync-firestore.ts`, `scripts/lib/firestore-chunks.ts` | new — seed + incremental sync (replaces `scripts/upload.ts`) |
| `packages/types/src/index.ts` | chunk/manifest schemas |
| `packages/utils` | ported `addWorkoutsToCycles` |
| `apps/web/src/lib/firebase.ts`, `cache.ts`, `auth.tsx`, `mutations.ts` | new — SDK init, IndexedDB cache, auth, writes |
| `apps/web/src/lib/fetchData.ts` | internals → Firestore `loadAll()`, same output shapes |
| `apps/web/src/lib/providers.tsx` | `loadAll()` + client-side cycle membership + `updateCycles` setter |
| `apps/web/firestore.rules`, `apps/web/firebase.json` | rules; `/cycles/**` shell rewrite |
| `apps/web/src/app/cycles/[id]/`, `exercises/[id]/page.tsx` | build-time REST fetch; `_shell` param; fail loudly |
| `components/layout/v2/headerV2.tsx` + cycle form components | sign-in button; cycle create/edit UI |

## Risks

- **1 MiB doc limit**: quarterly chunks average 145–180 KB; sync asserts < 800 KB.
- **Zod vs Timestamp**: `z.coerce.date` can't parse Firestore Timestamps — mitigated by ISO-string storage; any stray Timestamp must be `.toDate()`-ed in the fetch layer only.
- **Rules mistakes = public writes**: rules are the entire security boundary; get the owner UID right.
- **Bundle size**: `firestore/lite` + lazy auth ≈ 50–60 KB gzip for anonymous readers.
- **Pipeline/UI write races**: enforced (not just documented) in `sync-firestore.ts` via per-uuid field paths and never touching `notes.*` / unknown uuids.
- **Build-time Firestore dependency**: `generateStaticParams` now needs Firestore reachable at build; fail the build on fetch errors instead of silently emitting zero pages.
