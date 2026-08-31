# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Leeft is a workout tracking application structured as a pnpm monorepo with five pnpm packages,
plus a native iOS app that lives in the repo but sits outside the pnpm workspace:
- **`apps/web`**: Next.js 16 (App Router) frontend for visualizing workout data (static export, no SSR)
- **`apps/web-desktop`**: Tauri 2 shell (Rust crate at the package root, no `src-tauri/` folder) that packages `apps/web`'s static export as a macOS app
- **`apps/data`**: Bun-based data processing pipeline for fetching, parsing, and classifying workout data
- **`packages/types`**: Shared Zod schemas used by both apps
- **`packages/utils`**: Shared utilities (calc, date, logger)
- **`apps/native`**: SwiftUI iOS app — the `/add` session editor only. Has no `package.json`, so the `apps/*` workspace glob skips it and `pnpm -r` commands never touch it.

### Prerequisites
- Node.js >= 22
- pnpm (v10.28+)
- Bun (for data pipeline)
- `gsutil` (for GCS uploads)
- Xcode + `xcodegen` (`brew install xcodegen`) — iOS app only

### Environment Variables

**Web app** (`apps/web/.env.local`):
```
NEXT_PUBLIC_CDN_URL=<GCS bucket URL>
NEXT_PUBLIC_TIMESTAMP=<YYYYMMDD_HHMMSS>
```

**Data pipeline** (`apps/data/.env`):
```
ANTHROPIC_API_KEY=<key>
OPENAI_API_KEY=<key>
```

## Common Commands

### Development
```bash
pnpm install            # Install all dependencies
pnpm dev                # Run web app dev server (Next.js)
pnpm wt <branch> [base] # New worktree at .claude/worktrees/<branch> + dedicated dev port (--here adopts the current worktree)
```

### Parallel worktree sessions
`pnpm wt <branch>` (scripts/shell/worktree.sh) creates a worktree at `.claude/worktrees/<branch>` (same place Claude Code's built-in worktree isolation puts them; gitignored), assigns it the lowest free dev port >= 3001 (written to a gitignored `.dev-port` file at the worktree root), copies the gitignored env files, and runs `pnpm install`. The main checkout has no `.dev-port` and stays on port 3000. `git worktree remove` frees the port.

**Standing instructions when this session's repo root is a worktree** (path contains `.claude/worktrees/`):
- No `.dev-port` at the worktree root yet (worktree came from Claude's built-in isolation)? Run `./scripts/shell/worktree.sh --here` once — it assigns the port, copies the env files, and installs deps.
- Start the dev server in the background right away, passing the port explicitly (`PORT=$(cat .dev-port) pnpm dev` — the root `dev` script does not read `.dev-port` itself), and tell the user the URL (`http://localhost:<port>`), so all active sessions are loadable in the browser simultaneously. Starting the server is serving the app, not verification.

### Building & Quality
```bash
pnpm build:web          # Build web app (Next.js static export)
pnpm build:desktop      # Build desktop app (Tauri) + install it to /Applications
pnpm lint               # Lint all apps (Biome)
pnpm check              # Type check and lint all apps
pnpm format             # Format code (Biome)
```

### iOS app
```bash
pnpm build:native       # From root: xcodegen + compile for the simulator (scripts/shell/build-native.sh)
```
```bash
# From apps/native:
xcodegen                # Regenerate Leeft.xcodeproj from project.yml — REQUIRED after adding/moving/renaming any source file
open Leeft.xcodeproj    # Build and run from Xcode (▶︎ with a simulator or device selected)
```
`Leeft.xcodeproj` is generated and gitignored — never hand-edit it, and never commit it. Forgetting
`xcodegen` after adding a file surfaces as `cannot find 'X' in scope` for a file that plainly exists —
which is why `pnpm build:native` always regenerates before it compiles. It targets the simulator, so
it needs no provisioning profile and no device; running on hardware is still Xcode's ▶︎.

### Data Pipeline (run from root)

**`apps/data/README.md` is the full write-up** — what a run actually does and why nothing is
incremental, how lifting compilation merges its four sources, the two Firestore collections, and
why TrainHeroic must not be downloaded. The entries below are the short form.
```bash
pnpm pipeline                 # Full pipeline + deploy (interactive; scripts/shell/pipeline.sh)
pnpm pipeline --sync-only     # Data sync only (no deploy); --skip-download also supported
pnpm refresh                  # Recompile data from existing downloads + push to GCS
pnpm push                     # Upload data artifacts to GCS (scripts/shell/upload.sh)
```

### Data Pipeline (run from apps/data)
```bash
bun compile:lifting         # Compile lifting logs
bun combine:all             # Aggregate all data
bun classify:claude-all     # Run LLM classification
bun trainheroic:missing     # Report export days absent from the archive/log
bun trainheroic:hydrate     # Re-apply the account export's enrichment to the raw archive
bun firestore:backfill      # Publish lifting-log.json to `lifting-history` (--overwrite to republish)
```

**TrainHeroic is frozen and is no longer downloaded by the pipeline.** The account stopped
receiving data, and its raw archive under `data/download/trainheroic/workouts` is now enriched in
place by `bun trainheroic:hydrate`: the readiness survey (which exists only in the account export
at `data/download/trainheroic/export/`, never in any API response), four workout titles corrected
to the day they were actually trained, one session reconstructed that the API cannot serve because
it belongs to a coached team, and nine set-level corrections (`SET_CORRECTIONS`) — four sessions
that logged an assist stack instead of the load moved, three with the columns transposed, one with
a misplaced decimal point, and one run that isn't a lifting exercise. **A download overwrites those files and silently drops all of
it** — so if you ever do run `bun trainheroic:download`, follow it with `bun trainheroic:hydrate`.
The hydrate pass is idempotent and reports what it changed, plus duplicate day keys and title drift.

### Refreshing Data (minimum steps by input)

Pipeline dependency chain: `download → compile → combine → upload`

| Input changed | Minimum re-run (from `apps/data`) | Then |
|---|---|---|
| `data/in/cycles.json` | `bun combine:lifting` and/or `bun combine:all` | `pnpm push` + update timestamp |
| TrainHeroic archive (after a manual download, or a hydrate change) | `bun trainheroic:hydrate` → `bun compile:lifting` → `bun combine:lifting` → `bun combine:all` | `pnpm push` + update timestamp, and `bun firestore:backfill --overwrite` for the iOS History tab |
| Fitbit raw data | `bun fitbit:process` → `bun compile:cardio` → `bun compile:all` → `bun combine:all` | `pnpm push` + update timestamp |

### Analysis Scripts (run from apps/data)
```bash
bun analyze:workouts             # Check TrainHeroic workout file duplicates
bun analyze:exercises:fuzzy      # Basic Levenshtein fuzzy matching
bun analyze:exercises:full       # Comprehensive (exact, substring, fuzzy, attributes)
bun analyze:exercises:semantic   # Semantic detection with normalization
```

### Deployment
```bash
pnpm deploy:web         # Build and deploy web app to Firebase
```

## Architecture

### Data Flow
1. Raw data downloaded to `apps/data/data/in` or `apps/data/data/download`
2. Scripts compile into structured JSON in `apps/data/data/out`
3. `pnpm push` gzips and uploads artifacts to GCS bucket
4. Web UI fetches JSON artifacts via CDN URL + timestamp to render the dashboard

Sessions logged in-app take a loop back through the same pipeline: **the web `/add` flow and the
iOS app both write** to Firestore `lifting-workouts/{YYYY-MM-DD}`, which
`apps/data/src/firestore/download.ts` pulls in over REST (gcloud token, bypassing the owner-only
rules via IAM) and compiles into the artifacts both clients then read back.

**Two Firestore collections, and the split matters.** `lifting-workouts` is the *write* store — the
only thing the two apps post to, and the only thing `readFirestoreLog()` reads. `lifting-history` is
a *read* store: a projection of the whole of `lifting-log.json`, published by
`bun firestore:backfill` and consumed by the iOS History tab. Nothing authors documents in
`lifting-history`, which is why `--overwrite` is its normal republish mode. Keeping them apart is
what stops `compile:lifting` from merging its own published output back in as a duplicate of every
day — `mergeFirestoreWorkouts` keeps *both* sides of a day collision by design.

### Web App Structure
- `app/` — Next.js App Router pages
- `pageComponents/` — page-level orchestration components (separates logic from routing)
- `components/` — UI components organized by domain (charts, exercises, cycles, etc.)
- `lib/` — state management, data fetching, utilities

### Web App State Management
- `WorkoutContext` (React Context API) provides global state
- `WorkoutProvider` in `apps/web/src/lib/providers.tsx` initializes data
- `useWorkouts()` hook from `apps/web/src/lib/contexts.ts` accesses state

### Shared Types
All domain models are Zod schemas in `packages/types/src/index.ts`. The web app re-exports these from `apps/web/src/types.ts`.

Key types: `Workout`, `Exercise`, `Cycle`, `ExerciseMetadata`, `MappedCycle`

### iOS App Structure (`apps/native`)
SwiftUI, iOS 17+, generated by XcodeGen. Two tabs: the `/add` session editor, which writes to
`lifting-workouts`, and a History tab, whose exercise rows open `ExerciseAnalyticsSheet` (the iOS
half of the web's `/exercises/[id]`) and which reads a **different** collection: `lifting-history`,
the pipeline's projection of the whole compiled log (every day since 2020, with PR tiers and the
readiness survey). The two are deliberately separate — `readFirestoreLog()` reads only
`lifting-workouts`, so the compiled log never merges its own published output back in as a
duplicate of every day. The cost is that a session logged today reaches History only after the next
`bun firestore:backfill --overwrite`; the two stores drift between runs, which is expected.
No last/working-max stats — it loads the exercise catalog (`exercise-classified_{ts}.json.gz`,
disk-cached) plus that one collection.
- `Sources/Theme/` — the v2 tokens as Swift constants
- `Sources/Models/` — `Draft` (in-progress session), `ExerciseMetadata`, `LiftingWorkoutDoc`
- `Sources/Services/` — auth, Firestore read/write, catalog fetch, draft file store, Firebase bootstrap
- `Sources/State/SessionModel.swift` — the session reducer; the draft is one Codable blob whose `didSet` writes through
- `Sources/Views/` — `MainTabView` over readiness → live → done (plus detail and picker sheets) and `HistoryView` / `WorkoutCardView`
- `ExerciseAnalyticsSheet` + `ExercisePRChart` — one exercise's history: Swift Charts metric-over-time,
  a scrub-to-inspect card, and the metric / range / rep-range controls. Derives entirely in memory off
  `WorkoutHistoryStore.workouts`; no fetch of its own. **`ExerciseDetailPage` is a different screen** —
  the live-session set editor

`GoogleService-Info.plist` is gitignored (carries the OAuth client id, same reasoning as `apps/web/.env.local`). See `apps/native/README.md` for the Firebase console setup.

## Code Conventions

### Formatting (Biome)
- 4-space indentation
- Single quotes
- Semicolons always
- Line width: 150 characters

### Imports
- Use `@/` for local src imports in web app
- Use `@leeft/types` for shared schemas
- Use `@leeft/utils` for shared utilities

### Type Safety
Never duplicate types between apps. Add shared types to `packages/types`.

## Gotchas
- **Static export**: Web app uses `output: 'export'` — no SSR, no API routes, no server components with data fetching
- **Data timestamp is resolved at runtime**: the upload scripts publish a mutable `latest.json` pointer (`{"timestamp": ...}`, `Cache-Control: no-cache`) to GCS alongside the immutable timestamped artifacts; the app fetches it on load/refresh (`fetchLatestTimestamp` in `lib/fetchData.ts`), so fresh data needs **no rebuild** of web or desktop. `NEXT_PUBLIC_TIMESTAMP` in `apps/web/.env.local` (still auto-rewritten by upload) is only the fallback and feeds build-time `generateStaticParams` — so a **brand-new** cycle/exercise ID still needs a rebuild for its detail page to exist
- **pnpm catalog**: Shared dependency versions (TypeScript, Biome, Zod) are managed in `pnpm-workspace.yaml` `catalog:` — update there, not in individual package.json files
- **Data files gitignored**: All `apps/data/data/` contents are gitignored
- **Date grouping is UTC**: `groupWorkoutsByDay` in `lib/contexts.ts` keys by `toISOString().slice(0, 10)` (UTC). UI must format dates with `getUTC*` methods or off-by-one bugs appear in non-UTC timezones. v2 components do this; v1 uses `toLocaleDateString` (mostly fine because v1 doesn't show full dates in places that would expose the offset). The same trap bites on iOS: any `DatePicker` bound to a date key needs `.environment(\.timeZone, TimeZone(identifier: "UTC")!)`, or it renders UTC midnight in local time and shows the previous day west of Greenwich.
- **Lifting `Workout.duration` is in minutes** (computed in `extractDay.ts` from TrainHeroic's unix-seconds `timestamp_started`/`timestamp_completed`, capped at 100 when 0 or >200). Cardio instead uses both `durationMs` and `durationMin` explicitly — don't assume lifting follows the same convention.
- **A set is two numbers, and `units` on its exercise says what they count.** `BaseExerciseSchema.units`
  is `{ reps, weight }` drawn from `SetUnitSchema` (`reps | time | lb | bw+ | none | feet | inches |
  meters`). The first column holds reps by default, otherwise **whole seconds**, feet or inches; the
  second holds pounds, a plate added on top of bodyweight (`bw+`), or nothing. **Only `reps x lb`
  is tonnage** — `isLoaded()` gates every volume sum, and `computePersonalRecords` keys its ladder
  by basis so a chin-up "@ 10" (a plate) never ranks against one "@ 210" (the whole system).
  `resolveUnits()` settles an all-zero load column as bodyweight, once, in `classifySets`.
- **TrainHeroic's `param_*_type` codes are the unit source of truth**, not the `abr` display string:
  `3`=reps, `1`/`2`=lb, `4`=seconds, `5`/`11`=distance, `7`=inches, `10`=miles. `abr` renders them
  lossily — it omits the weights entirely for `param_2_type: 2` and drops the ` lb` suffix on jumps —
  so `extractDay.parseParams` reads the columns and `parseAbr` is only the fallback for the four
  archive entries carrying no params at all.
- **All weights are in lbs**, not kg — mixed sources (TrainHeroic, Google Fit) are normalized to lbs in the data pipeline. v1 mostly displays the bare number; v2 labels columns `lbs`.
- **Bodyweight movements log as `reps x none`** and carry no volume and no record. Chin-ups, dips
  and assisted pull-ups since late 2024 log **effective load** — bodyweight (~218, sometimes 215 or
  220) minus the assist stack, which moves in 5 lb steps, or plus a plate — so those are ordinary
  `lb` and count normally.
- **The Swift side duplicates contracts by hand** — nothing generates them, so a change on one side silently rots the other. When you touch any of these, touch both:

  | `apps/native` | Source of truth |
  |---|---|
  | `Models/LiftingWorkoutDoc.swift` | `LiftingWorkoutDoc` in `apps/web/src/lib/firebase.ts`, decoded by `apps/data/src/firestore/download.ts`, written by `apps/data/src/firestore/backfill.ts` |
  | `Models/ExerciseMetadata.swift` | `ExerciseMetadataSchema` in `packages/types/src/index.ts` |
  | `Models/CalculationMethod.swift` | `maxCalculators` / `oneRepMaxCalculators` / `getTopSet` / `getTopNSets` in `packages/utils/src/calc.ts` |
  | `Models/TimeRange.swift` | `resolveTimeRange` / `inTimeRange` in `apps/web/src/lib/timeRange.ts` |
  | `Models/ExerciseSession.swift` | `computeExerciseSessions` / `computeExerciseStats` in `apps/web/src/lib/exerciseSessions.ts`, plus `basisLabel` in `apps/web/src/lib/setUnits.ts` |
  | `Theme/Theme.swift` | the `[data-theme="v2"]` token block in `apps/web/src/app/v2.css` |
  | `AuthService.ownerEmail` | `isOwner()` in `apps/web/firestore.rules` |
  | `ReadinessQuestion.all` in `Models/Draft.swift` | `READINESS_QUESTIONS` in `apps/web/src/lib/addWorkoutConstants.ts` — the key set is also the Firestore `readiness` map's keys and the labels `trainheroic:hydrate` maps from |
  | `readinessSymbols` / PR tier colours in `Views/WorkoutCardView.swift` | `READINESS_ICONS` and the `.pr-badge` / `.readiness-*` rules in `workoutCard.tsx` + `v2.css` |
  | `SetUnit` / `ColumnUnits` in `Views/UnitPickerSheet.swift` | `SetUnitSchema` / `ColumnUnitsSchema` in `packages/types/src/index.ts`, surfaced to the web through `apps/web/src/lib/setUnits.ts`. The raw values are the Firestore wire format — `bw+` and `none` especially |
- **Firestore temporal fields are ISO strings, never Timestamps** — the pipeline's REST decoder deliberately has no Timestamp handling. Both writers (web `/add`, iOS) must keep sending strings.
- **Re-saving a day preserves its `uuid`** — both writers read the existing doc before `setData`, so downstream artifacts (PRs, cycles) don't see a re-logged day as a new workout.
- **`units` is optional on the Firestore wire** — documents written before the unit pickers existed
  carry none, and `readFirestoreLog` reads those as `reps x lb`. It is deliberately *not* filled in
  from the catalog's `measurement`: that field is a picker default and is edited freely, so letting
  it reach into stored sessions would let a catalog edit rewrite what a past session meant.

## v2 design system

v1 has been removed; v2 is the only UI, served at the root routes (`/`, `/stats`, `/monthly`, `/cycles`, `/exercises`, `/cardio`). The whole app is wrapped in `<div data-theme="v2">` by the root `app/layout.tsx`, which also loads the v2 fonts and imports `app/v2.css`. The static-export build needs no rewrites.

### Layout
```
apps/web/src/
├── app/
│   ├── layout.tsx               # root: v2 fonts, <div data-theme="v2"> wrapper, imports globals.css + v2.css
│   ├── page.tsx                 # / entry → WorkoutLogPageV2
│   └── v2.css                   # scoped design system, all rules under [data-theme="v2"]
├── components/
│   ├── layout/v2/
│   │   ├── headerV2.tsx         # 🏋️ LEEFT 🏋️ brand + nav
│   │   └── pageTemplateV2.tsx   # shell + header + footer wrapper
│   └── workouts/v2/
│       ├── workoutCard.tsx      # per-day card with cardio + lifting bodies, per-card collapse toggle
│       └── monthCalendar.tsx    # 7-col grid with cardio icons/colors per cell
├── pageComponents/v2/
│   └── workoutLogPageV2.tsx     # / home: hero + toolbar + Month/Daily view + inline day panel
└── lib/hooks/
    └── useWorkoutLogState.ts    # workout-log state hook (consumed by WorkoutLogPageV2)
```

### Design tokens (in `app/v2.css` under `[data-theme="v2"]`)
- **Fonts**: Anton (display) + DM Sans (body) + JetBrains Mono (mono), loaded via `next/font/google` and exposed as `--font-display / --font-body / --font-mono` CSS variables.
- **Palette**: `--bg #0b0a08`, `--surface #14130f`, `--fg #ecebe2`, `--muted #807a6c`, `--muted-2 #5a5448`. Type colors: `--strength #19e68c`, `--hyper #ff3b30`, `--break #5b9bff`, `--maint #ffa000`, `--cardio #00d4ff`, `--zone #ffd60a`. Muscle groups have their own `--mg-*` tokens.
- **Cardio types use v1 palette** (`lib/cardio-theme.ts` → `cardioColors` / `cardioIcons`) for consistency with the calendar's day-cell badges. v2's `--cardio` token is reserved for the generic "cardio" headline color.
- **Yellow `--maint` is the accent** — used for inline `<b>` numbers in stats lines, brand dot, PR markers, the LIFTING headline, today indicator on the calendar.

### Component primitives (all classes scoped under `[data-theme="v2"]`)
- `.shell` — page max-width container (1440px)
- `.nav`, `.brand`, `.nav-links` — top nav chrome
- `.hero-row`, `.hero-title`, `.hero-meta` — page hero with Anton title + meta line
- `.toolbar`, `.toolbar-grp`, `.toolbar-divider`, `.toolbar-pos`, `.toolbar-control` — visible control bar with switches and buttons
- `.switch[data-on]` — iOS-style toggle. The data attribute drives the on/off color
- `.seg`, `.seg-btn.active` — segmented controls (View, Cardio mode)
- `.select.sm` — small mono dropdown for inline use
- `.session`, `.session-title-row`, `.session-vol`, `.exercises` — workout card scaffolding
- `.lift-headline`, `.cardio-headline` — yellow / cyan label rows above per-modality bodies
- `.ex-block`, `.ex-name`, `.ex-vol`, `.sets-table`, `.ex-summary` — exercise renderer (sets table when expanded; one-line summary when compact)
- `.month-cal`, `.month-cal-grid`, `.month-cal-cell` — calendar grid
- `.day-panel-inline`, `.day-panel-close` — right-side slide-in panel
- `.effort-chart`, `.effort-bar`, `.effort-seg`, `.effort-legend` — cardio zone breakdown
- `.stagger > *` — page-load animation utility

### CSS scoping
- The whole stylesheet lives inside one nested rule `[data-theme="v2"] { ... }` using CSS nesting (LightningCSS handles this). Everything under the root `data-theme="v2"` wrapper receives the variables and rules.
- Universal resets (`* { ... }`) and root `html, body` rules are intentionally NOT in `v2.css` — Tailwind preflight already handles those globally.
- `@keyframes` declared outside the `[data-theme="v2"]` block (keyframes can't be scoped).

### State
- Page state lives in presentation-agnostic hooks under `lib/hooks/` (`useWorkoutLogState`, `useCardioPageState`, `useCyclesPageState`, `useExercisesLibraryState`). `useWorkoutLogState` is called as `useWorkoutLogState({ includeWarmup: false })` (warmup default OFF).
- All data context (`WorkoutDataContext`, `CardioSettingsContext`) is mounted ONCE at the root layout via `Providers`.

### Status
All v1 routes have been ported to v2 and v1 was removed; v2 owns the root routes: `/` (workout log), `/stats`, `/monthly` (the old `/analysis` rollup), `/cycles`, `/cycles/[id]`, `/exercises`, `/exercises/[id]`, `/cardio`. Each `app/<route>/page.tsx` renders the matching `pageComponents/v2/<page>V2.tsx`, which consumes a `lib/hooks/use<Page>State.ts` hook.

**Phase 1 reference HTML mocks** are in `design/*.html` — pre-built static prototypes of every page in the v2 style. Use them as visual ground truth; they share `design/shared.css`.

### Mobile layer (≤768px)
All mobile rules live in one nested `@media (max-width: 768px)` block at the end of `v2.css` (plus a ≤1140px nav-gap tweak). The approach:
- **Bottom dock**: `.nav-links` is hidden; `HeaderV2` renders a second `<nav class="dock">` (fixed bottom tab bar, lucide icons, per-section colors via a `--dock-c` custom property, active tab gets a 2px top bar). Hidden ≥769px via the base `.dock { display: none }`.
- **Toolbars become horizontal scroll strips**: `.toolbar` goes `flex-wrap: nowrap; overflow-x: auto` with `flex-shrink: 0` children and a sticky `::after` right-edge fade. Do NOT use `mask-image` for the fade — it would mask the dropdown sheets, which are DOM descendants of the toolbar.
- **Dropdown panels and the log day panel become bottom sheets**: `.dd-v2-panel`, `.exercise-lookup-panel`, `.day-panel-inline` switch to `position: fixed` above the dock (dd sheets z-95 > day sheet z-90 > dock z-70). `position: fixed` is what lets them escape the toolbar's scroll clip; this requires no transformed/filtered ancestors, so on mobile `.stagger > *` swaps to the transform-free `leeft-v2-fade` keyframes.
- **Tables re-grid instead of shrinking**: `.pr-row.stats-row` and exercise `.pr-row`s become two-line grid rows via explicit `grid-area` placements keyed to child order in the TSX (`.pr-row.head` is hidden); `.tl-month`/`.month-x` labels thin out via `nth-child` + `visibility: hidden`.
- `.shell` gets bottom padding for dock clearance; `overflow-x: clip` (not `hidden` — that would break the sticky nav) guards against stray overflow.

### Gotchas specific to v2
- **Radix portals leak**: shadcn's Radix-based primitives (Select, Dialog, Popover) mount to `document.body`, escaping `[data-theme="v2"]`. v2 components avoid Radix; use plain `<select>`, custom dropdowns, or anchor portals via the `container` prop.
- **Per-card local state resets on day key change**: `<WorkoutTable key={day.date.toISOString()} />` in `DayPanel` forces remount when the panel switches days, so `initialCompact` is re-applied.
- **`useWorkoutLogState` defaults are SSR-safe**: state defaults are derived from `opts` arg, not from `window`/`document`. The `useEffect` that adjusts `responsiveColumns` runs only client-side.
