# Leeft data pipeline

Bun scripts that turn raw workout data into the JSON artifacts the web, desktop and iOS apps read.
Everything under `data/` is gitignored — including inputs that exist nowhere else. Read
[TrainHeroic is frozen](#trainheroic-is-frozen--do-not-download) before running anything that
writes to `data/download/`.

```
download → compile → combine → upload
```

## What a run actually does

`pnpm pipeline` (`scripts/shell/pipeline.sh`) runs these in order. `--sync-only` stops before
upload; `--skip-download` skips only the Fitbit fetch.

| Step | Command | Notes |
|---|---|---|
| 1 | `bun firestore:download` | Pulls sessions logged in the web `/add` flow and the iOS app out of `lifting-workouts`. Runs even under `--skip-download` — it's a cheap read, and skipping it would silently drop newly logged workouts. |
| 2 | `bun trainheroic:hydrate` | Re-applies the archive's hand-built enrichment **in place**. Idempotent, ~1s, reports `0 changed` on a normal run. |
| 3 | `bun compile:lifting` | Rebuilds `lifting-log.json` and `exercise-metadata.json` from scratch. |
| 4 | `bun combine:lifting` | Joins workouts onto cycles → `cycles-lifting.json`. |
| 5 | `bun fitbit:download` → `fitbit:process` → `compile:cardio` → `compile:all` | Cardio side. The download auto-refreshes the token; if it has expired, run `bun fitbit:auth`. |
| 6 | `bun combine:all` | Lifting + cardio onto cycles → `cycles-all-workouts.json`. |
| 7 | `./scripts/shell/upload.sh <ts>` | Gzips and uploads the artifacts to GCS under an immutable timestamp, then rewrites the mutable `latest.json` pointer. |
| 8 | `pnpm deploy:web` | Firebase deploy. |

**Nothing here is incremental.** There is no delta path and no cache: every run re-reads the whole
TrainHeroic archive, both Google-era logs, and the whole Firestore write collection, and rebuilds
all ~830 lifting workouts back to January 2020. That is by design — corrections to a 2021 session,
a new exercise alias, or a changed PR rule have to reach every day that references them — but it
has two consequences worth knowing:

- **A rebuilt log is not byte-stable.** `readLog` and `parseTrainHeroicWorkout` mint a fresh
  `uuid` per workout on every compile, so ~819 of the ~830 workouts get new ids each run even when
  no content changed. Only the Firestore-sourced days keep a stable `uuid` — those come from the
  document, because both writers read the existing doc before `setData` so a re-saved day doesn't
  look like a new workout downstream.
- **A run is only as good as `data/download/`.** Since git tracks none of it, a compile against a
  restored or re-fetched archive will happily produce a wrong log without erroring.

Fresh data needs **no rebuild** of web or desktop — the apps resolve `latest.json` at runtime. Only
a brand-new cycle or exercise **id** needs one, so its statically generated detail page exists.

## Lifting compilation

`bun compile:lifting` (`src/compile/compileLifting.ts`) merges four sources into one log:

1. **TrainHeroic archive** — `data/download/trainheroic/workouts/*.json`, the bulk of the history.
   Also the canonical source of the exercise catalog: every exercise seen here is collected into
   `data/out/exercise-metadata.json` as a by-product, plus three hand-added custom movements
   (ids `99000001`–`99000003`).
2. **Google-era logs** — `google-log.json` and `lifting-log-2020.json`. Days whose title already
   exists are skipped with a warning; those duplicate-title warnings on a normal run are expected
   noise.
3. **Firestore `lifting-workouts`** — everything logged in-app, appended by day key. A collision
   with another source keeps **both** entries and warns loudly, rather than silently dropping one.

Then, over the fully merged list:

- **`applyExerciseAliases`** remaps 20 retired exercise ids onto their surviving canonical id
  (`src/compile/exerciseAliases.ts`). TrainHeroic periodically re-creates an exercise under a new
  id; the map is what stops one movement from splitting into two. It runs on the merged list, not
  per source, because the Google-era logs and app-logged days reference retired ids too. Entries
  that collapse onto the same id in the same workout are merged only when both sides were measured
  the same way — concatenating across bases would mix a chin-up `@ 10` (a plate) with one `@ 210`
  (the whole system).
- **`classifyAllWorkouts`** resolves each exercise's `units`, marks work sets and computes volume.
  Only `reps × lb` is tonnage; `isLoaded()` gates every volume sum.
- **`annotatePersonalRecords`** annotates PR-at-the-time per rep count, tiered, keyed by basis.

Output: `data/out/lifting-log.json` and `data/out/exercise-metadata.json`.

### Exercise metadata vs. exercise classified — they drift

Two files describe exercises and only one reaches the app:

| File | Written by | Read by |
|---|---|---|
| `data/out/exercise-metadata.json` | `compile:lifting`, every run | the classify scripts, some analyze scripts |
| `data/exercise-classified.json` | `classify:claude:*` **only** | **the web app** (`exercise-classified_{ts}.json.gz`), the iOS catalog, `readExerciseMap` |

A newly logged exercise lands in metadata immediately and is absent from classified until a
classify run — so it can be logged, compiled, uploaded and rendered with **no name, muscle group or
equipment**, and the only symptom is in the UI. Nothing warns about the gap. Check it with
`bun exercise:compare` before `pnpm push`; classify anything it reports as missing with
`bun classify:claude:single <id>`.

`measurement` (the unit-picker default) lives only in the classified file and is not set by
classification — it is maintained by hand, and `ClassifiedExerciseSchema` has to carry the field or
a load→save round trip strips it from every entry.

## The two Firestore collections

The split is load-bearing, not incidental.

| Collection | Direction | Written by | Read by |
|---|---|---|---|
| `lifting-workouts` | **write store** | web `/add`, iOS session editor | `firestore:download` → `readFirestoreLog()` |
| `lifting-history` | **read store** | `bun firestore:backfill` only | iOS History tab |

`lifting-history` is a pure projection of the whole compiled log — every day since 2020, with PR
tiers and the readiness survey — published one document per `YYYY-MM-DD`. Nothing authors documents
there, which is why `--overwrite` is its normal republish mode: the log has been recompiled and PR
tiers have shifted.

Keeping them apart is what stops `compile:lifting` from reading its own published output back in.
`readFirestoreLog()` reads **only** `lifting-workouts`; if history lived in the same collection,
`mergeFirestoreWorkouts` — which keeps *both* sides of a day collision by design — would duplicate
every day in the archive on the next compile.

**`firestore:backfill` is not part of `pnpm pipeline`.** A session logged today reaches the iOS
History tab only after the next manual `bun firestore:backfill --overwrite`. The two stores drift
between runs; that is expected.

Firestore temporal fields are **ISO strings, never Timestamps** — the REST decoder in
`src/firestore/download.ts` deliberately has no Timestamp handling, so both writers must keep
sending strings.

## TrainHeroic is frozen — do not download

The account stopped receiving data. `bun trainheroic:download` **is no longer in the pipeline, and
running it destroys work that exists in exactly one place.**

The raw archive under `data/download/trainheroic/workouts/` is no longer a faithful copy of the
API's responses. It is enriched in place by `bun trainheroic:hydrate` with:

- the **readiness survey**, which exists only in the account export at
  `data/download/trainheroic/export/` and appears in no API response;
- **four workout titles** corrected to the day they were actually trained;
- **one session reconstructed** that the API cannot serve at all, because it belongs to a coached
  team;
- **nine set-level corrections** (`SET_CORRECTIONS`) — four sessions that logged an assist stack
  instead of the load moved, three with the columns transposed, one with a misplaced decimal point,
  and one run that isn't a lifting exercise.

A download overwrites those files with the API's version and silently drops all of it. Because
`data/` is gitignored, **there is no diff to notice and nothing to revert to** — the next compile
just produces a quietly wrong log. This is why the step was removed from `pipeline.sh` rather than
left in place behind a flag.

If you ever do need to fetch again, run it by hand and follow it immediately with a hydrate:

```bash
bun trainheroic:download '<range>' "$TRAINHEROIC_SESSION_TOKEN"
bun trainheroic:hydrate   # idempotent; reports what it changed, plus duplicate day keys and title drift
```

## Minimum re-run by input

| Input changed | Re-run (from `apps/data`) | Then |
|---|---|---|
| `data/in/cycles.json` | `bun combine:lifting` and/or `bun combine:all` | `pnpm push` |
| TrainHeroic archive (manual download, or a hydrate change) | `bun trainheroic:hydrate` → `bun compile:lifting` → `bun combine:lifting` → `bun combine:all` | `pnpm push`, and `bun firestore:backfill --overwrite` for the iOS History tab |
| Fitbit raw data | `bun fitbit:process` → `bun compile:cardio` → `bun compile:all` → `bun combine:all` | `pnpm push` |
| A newly logged exercise | `bun classify:claude:single <id>` | `pnpm push` (classified goes straight to GCS; it is not a compile input) |

## Environment

`apps/data/.env`:

```
ANTHROPIC_API_KEY=<key>
OPENAI_API_KEY=<key>
```

Uploads need `gsutil`; `firestore:download` and `firestore:backfill` use a `gcloud` token and reach
Firestore over REST with IAM, bypassing the owner-only rules.
