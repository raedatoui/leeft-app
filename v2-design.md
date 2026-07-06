# Integrate v2 design system alongside v1

## Context

The new design language is fully prototyped in `design/*.html` (Anton + DM Sans + JetBrains Mono, warm-dark editorial palette). The user wants both styles live concurrently — `/v2/...` routes for the new look, existing routes untouched — while keeping component **state and data unchanged**. Iteration on individual components happens after scaffolding lands.

We start with the **homepage (workout log)** because `WorkoutLogView` is already split into a state container (`index.tsx`) and pure JSX view (`view.tsx`), making it the cleanest first target. The priority component to nail is the **workout table** (the per-exercise sets table from `LiftingCard`'s `ExerciseViewRow`) — that's the densest, most data-rich piece and it'll set the bar for everything downstream.

Static export (`output: 'export'`) means no middleware/rewrites; everything is file-system routes.

## Architecture decisions

1. **Routing**: `app/v2/` subtree. Static export turns each `page.tsx` into an HTML file.
2. **Providers**: Root `app/layout.tsx` already wraps `<Providers>` around `{children}`. The nested `app/v2/layout.tsx` is purely structural — **does not re-mount providers**. v2 components inherit `WorkoutDataContext` and `CardioSettingsContext` automatically.
3. **CSS isolation**: New `apps/web/src/app/v2.css` derived from `design/shared.css`, every selector scoped under `[data-theme="v2"]`. Universal resets (`* { box-sizing }`) and top-level `html, body` rules **must be stripped** — Tailwind preflight already handles those globally and they'd override v1.
4. **Fonts**: Replace the `@import url(google fonts)` in `shared.css` with `next/font/google` in `app/v2/layout.tsx`. Three families (Anton 400, DM Sans 400/500/600/700, JetBrains Mono 400/500/600), exposed as `--font-display / --font-body / --font-mono` CSS variables, attached to the v2 wrapper div. Avoids render-blocking external fetch and keeps offline static-export reproducible.
5. **Logic sharing**: Extract presentation-agnostic state from each pageComponent into `lib/hooks/use<Page>State.ts`. v1 refactored to consume the hook (behavior identical). v2 imports the same hook. Bug fixes flow to both.
6. **Domain components**: Phase 1 — v2 pageComponents render new markup inline. Phase 2 — extract recurring patterns into `components/v2/` once duplication shows up. Avoids designing primitives upfront.
7. **Cross-link**: Plain `<Link href="/v2">` / `<Link href="/">` toggle in both headers. Static export resolves at build time.

### Known gotchas (acknowledged)

- `<html className="dark">` is a phantom — no `dark:` utilities are used anywhere in the app. v2 ignores it entirely.
- Tailwind v4 auto-detection picks up `pageComponents/v2/**` and `components/v2/**` automatically; the legacy `tailwind.config.ts` content glob is currently inert (good to leave alone).
- Radix portals (Select/Popover/Dialog) escape `[data-theme="v2"]` because they mount to `document.body`. **Phase 1 avoids Radix in v2 components.** Phase 2 either uses `Portal container` to anchor inside the v2 subtree or builds non-portaled v2 primitives.
- Geist body fonts will load on `/v2/*` too because the root layout owns `<body>`. Cannot override that from a nested layout. Live with it; just keep `next/font/google` weights minimal.

## Phase 1: scaffolding + workout log + workout table

### Files to create

```
apps/web/src/
├── app/v2/
│   ├── layout.tsx                  # next/font/google + <div data-theme="v2"> + import v2.css
│   └── page.tsx                    # /v2 → renders <WorkoutLogPageV2 />
├── app/v2.css                      # transformed copy of design/shared.css (scoped, fontless)
├── pageComponents/v2/
│   └── workoutLogPageV2.tsx        # pure JSX — consumes useWorkoutLogState() hook
├── components/layout/v2/
│   ├── pageTemplateV2.tsx          # shell + nav slots
│   └── headerV2.tsx                # 🏋️ LEEFT 🏋️ + nav + v1↔v2 toggle
├── components/workouts/v2/
│   └── workoutTable.tsx            # PRIORITY: per-exercise sets table (replaces ExerciseViewRow visually)
└── lib/hooks/
    └── useWorkoutLogState.ts       # extracted from WorkoutLogView/index.tsx
```

### Files to modify (v1 — behavior preserved)

- `apps/web/src/components/workouts/logView/index.tsx` — replace inline state with `useWorkoutLogState()` call. Pass-through props to `<WorkoutLogViewJSX>` unchanged. **No behavior change.**

### Step-by-step tasks

1. **Extract `useWorkoutLogState()`** (`lib/hooks/useWorkoutLogState.ts`)
   - Move every `useState` / `useMemo` / `useEffect` / handler from `components/workouts/logView/index.tsx` lines 7–124 into this hook.
   - Hook returns the exact prop shape currently passed to `<WorkoutLogViewJSX>`.
   - Refactor `logView/index.tsx` to: `const props = useWorkoutLogState(); return <WorkoutLogViewJSX {...props} />;`
   - **Verify**: existing `/` page renders identically, slider/year nav/cardio toggle all still work.

2. **Add `app/v2.css`**
   - Copy `design/shared.css`. Then transform:
     - Delete `@import url("https://fonts.googleapis.com/...")` line
     - Delete `* { box-sizing: border-box; margin: 0; padding: 0; }` (Tailwind preflight covers it)
     - Move `html, body { ... }` rules to `[data-theme="v2"] { ... }` (keep background, color, font-family — point font-family to `var(--font-body)`)
     - Update font tokens at top: `--display: var(--font-display); --body: var(--font-body); --mono: var(--font-mono);`
     - Prefix every other selector with `[data-theme="v2"] ` — e.g. `.toolbar { ... }` → `[data-theme="v2"] .toolbar { ... }`. (Mechanical pass; ~150 selectors. Acceptable as one-time manual edit; alternatively run a quick Node script.)
   - Import only inside `app/v2/layout.tsx`.

3. **Build `app/v2/layout.tsx`**
   ```tsx
   import { Anton, DM_Sans, JetBrains_Mono } from 'next/font/google';
   import '../v2.css';

   const anton = Anton({ subsets: ['latin'], weight: '400', variable: '--font-display', display: 'swap' });
   const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-body', display: 'swap' });
   const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400','500','600'], variable: '--font-mono', display: 'swap' });

   export default function V2Layout({ children }: { children: React.ReactNode }) {
     return (
       <div data-theme="v2" className={`${anton.variable} ${dmSans.variable} ${jetbrains.variable}`}>
         {children}
       </div>
     );
   }
   ```
   Note: **do NOT** wrap in `<Providers>` again. They're already mounted at the root.

4. **Build `components/layout/v2/headerV2.tsx`** and **`pageTemplateV2.tsx`**
   - Mirror the structure from `design/log.html`: `<nav class="nav">` with brand (`🏋️ LEEFT 🏋️` + sub) and nav links.
   - Add a small `[v1 | v2]` segmented control linking to `/` and `/v2` respectively.
   - `PageTemplateV2` renders the shell wrapper (`<div class="shell">`) + Header + children. No sticky behavior — the v2 design uses an inline toolbar, not a sticky chrome bar.

5. **Build `components/workouts/v2/workoutTable.tsx`** (PRIORITY)
   - Props: identical to v1's `<ExerciseViewRow>` props — `exercise`, `metadata`, `miniMode`, `includeWarmup`, `cycleId`, `onExerciseClick`. Plus a `workout` prop for the surrounding container (date, volume, type).
   - Renders the new `.ex-block` markup from `design/log.html`:
     - Header row with day number, date, duration
     - Title + per-workout volume/sets/ex line
     - For each exercise: muscle-group pip + name (clickable → `onExerciseClick` or Link), per-exercise volume, `<table class="sets-table">` with set#/reps/weight rows. Work sets get class `work` (yellow set#, white reps/weight). Warmup rows hidden when `includeWarmup === false`.
     - Cardio variant: cardio-stats grid instead of table, optional zone breakdown rows.
   - Same data shape as today (`Exercise`, `ExerciseMetadata`, `Workout`, `CardioWorkout` from `@leeft/types`).

6. **Build `pageComponents/v2/workoutLogPageV2.tsx`**
   - `'use client';` + call `useWorkoutLogState()`
   - Render `<PageTemplateV2>` containing:
     - Hero row (`Log` title + week/month/year stats)
     - Toolbar (prev/next + position, Detail switch, Warmup switch, Cols select, Year/Month dropdowns, Active/Strict/Both segmented)
     - Grid of `<WorkoutTable>` cards driven by `useWorkoutLogState()` output
   - Wires the existing handlers (`slideLeft`, `slideRight`, `jumpToYear`, `jumpToMonth`, `setMiniMode`, `setIncludeWarmup`, `setUseStrictCardio`) into the new toolbar's switches/buttons.

7. **`app/v2/page.tsx`**
   ```tsx
   import WorkoutLogPageV2 from '@/pageComponents/v2/workoutLogPageV2';
   export default function Page() { return <WorkoutLogPageV2 />; }
   ```

8. **Cross-link in v1 header** — add the `[v1 | v2]` toggle to `components/layout/header.tsx` so users can flip between styles without typing URLs.

## Verification

- `pnpm dev:web` — open `http://localhost:3000/`. Confirm v1 home renders identically (sticky header, slider, mini mode, year/month dropdowns, cardio mode toggle all working).
- Navigate to `/v2`. Confirm:
  - Anton + DM Sans + JetBrains Mono load (network tab shows `next/font/google` requests, no Google Fonts external URL)
  - Page background is warm-dark, not the v1 cool-dark — proves CSS scoping works
  - Toolbar controls bind to the same state as v1 (e.g., toggling "Warmup" off filters warmup sets out of the rendered tables; switching "Active/Strict" cardio mode flips cardio dataset)
  - Workout table renders per-exercise sets correctly: warmup sets dimmer, work sets bold with yellow set#, weight in kg/lbs as v1
  - Slider prev/next + year/month dropdowns navigate to the same workout indices as v1
  - Click a workout's exercise name → navigates to `/exercises/<id>?cycleId=...` (still v1 detail page; v2 detail comes later)
- Inspect `/` again — confirm zero visual regressions, no new font requests on v1 routes (only Geist).
- `pnpm check` — type check + lint pass.
- `pnpm build` — static export succeeds, `out/v2/index.html` exists alongside `out/index.html`.

## Critical files to read before starting

- `apps/web/src/components/workouts/logView/index.tsx` — source of `useWorkoutLogState` extraction
- `apps/web/src/components/workouts/logView/view.tsx` — current JSX shape; props to mirror
- `apps/web/src/components/workouts/liftingCard/view.tsx` — `ExerciseViewRow` is the v1 workout-table; v2 replicates its data semantics
- `apps/web/src/components/workouts/slider/controls.tsx` — current control surface; v2 toolbar mirrors functionality
- `apps/web/src/lib/contexts.ts` + `lib/providers.tsx` — confirm context interface, no changes
- `design/log.html` — visual reference for v2 markup
- `design/shared.css` — source for `v2.css` transform

## Out of scope (Phase 2+)

- v2 versions of cycles, cycle-detail, stats, exercises, exercise-detail, cardio, analysis routes
- Extracting `WorkoutTable` sub-pieces (header, ex-block, sets-table) into smaller v2 components — done when a second page needs them
- Charts (`MuscleGroupVolumeChart`, etc.) — v2 will need restyled versions; Recharts can be themed via prop, no rewrite needed
- Replacing v1 entirely — only after v2 is feature-complete and battle-tested
