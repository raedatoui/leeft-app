# Web app code review — fix plan

From the 2026-07-11 code review of `apps/web` (4-track review: lib/state, page components, UI components, app shell/CSS/config). Statuses: `[x]` done, `[ ]` open.

## Done

- [x] **1. Lifting dates parsed to local midnight** — `dateFromTitle` (`packages/utils/src/date.ts`) did `new Date(y, m-1, d)` (local) while cardio dates parse as UTC midnight; east of UTC every lifting workout grouped a day early and split from same-day cardio. Fixed: `new Date(Date.UTC(y, m-1, d))`.
- [x] **2. Local-time getters on UTC-midnight dates in hooks** (live bugs in Eastern time at month/year boundaries):
  - `useCardioPageState.ts` — `computeMonthlyTrend` year/month getters, `workoutsByYear` reducer, and `rollingWindowStart` → all UTC now.
  - `useWorkoutLogState.ts` — `availableYears`, `jumpToYear`, `jumpToMonth` → `getUTC*`.
  - `useCyclesPageState.ts` — year bucketing getters and year bounds → `getUTCFullYear`/`Date.UTC`; also `totalBreakDays` now counts inclusively (floor + 1) to match `cycleDays`.
- [x] **3. Silent broken deploys + cryptic fetch failures** — all five fetchers in `lib/fetchData.ts` now check `response.ok` and throw a named-artifact error; `fetchExerciseMap` validates the payload is an array; the three `generateStaticParams` (`cycles/[id]`, `exercises/[id]`, `muscle/[slug]`) no longer swallow errors into `return []` — a failed build-time fetch now fails the build.
- [x] **Playwright removed** — deleted `apps/web/tests/` + `playwright.config.ts`, dropped `@playwright/test` devDep, removed `test-results/`/`playwright-report/` from `.gitignore` and the Testing section from `CLAUDE.md`. (The suite was already broken: it asserted 6 nav links, NAV has 7.)

## Medium priority — open

- [x] **Theme split breaks light mode on failure pages** — fixed: globals.css `.dark` token block re-keyed to `html[data-mode="dark"]` (what next-themes toggles), hardcoded `className="dark"` dropped from layout.tsx, the broken `* { @apply border-border; }` preflight removed (resolved to invalid `hsl(#2a2722)` inside the v2 wrapper), and `error.tsx`/`not-found.tsx` restyled with v2 tokens.
- [x] **Initial-load failure is a dead end** — fixed: v2 wrapper moved outside `Providers` in layout.tsx so loader/error render themed; providers.tsx now shows a styled error state with the artifact-specific message and a "Try again" button that re-runs `loadData`.
- [x] **Latent crash in `computeStats`** — fixed: exercises with `sets.length === 0` are skipped.
- [x] **Pagination indices don't survive dataset changes** — fixed:
  - `workoutLogPageV2.tsx` — Daily view slices/labels/disables by a clamped `pageIndex`; `slideLeft` in the hook pre-clamps before decrementing.
  - `statsPageV2.tsx` — `anchorRef` now tracks the viewed bucket on every navigation (`goToBucket`), so bucket rebuilds (effort toggle, refresh, group change) restore position instead of snapping to today.
- [x] **Filtered workout cards show contradictory numbers** — fixed: when `muscleGroupFilter`/`selectedExercise` hide exercises, header volume sums over the visible ones.
- [x] **`/cardio` "All time" mounts ~6,000 session cards** — fixed: 24 cards/page via TablePager + SwipePager slice; filter/year changes reset the page.

## Low priority — done

Consistency drift:
- [x] Stats table row now shows `w.workVolume`, matching its detail card's `includeWarmup={false}`.
- [x] Shared `CardioStatsGrid` (components/cardio/v2/cardioStatsGrid.tsx) replaces the duplicated tiles + formatters in `cardioSessionCard`/`workoutCard`; zero-value tiles are hidden everywhere (settled convention); `cardioSessionCard` time now comes from `startedAt` via `formatTimeOfDay`.
- [x] Shared `useDropdownPanel` hook (lib/hooks/useDropdownPanel.ts) for `DropdownV2` + `ExerciseLookupV2`; query resets on close (settled convention).
- [x] `lib/chart-theme.ts` deleted; breakdown chart now uses `chartPaletteV2.ts` (extended with `cardio`/`cardioRgb`) + DM Sans/JetBrains fonts. Unused `dateRange` prop removed.
- [x] Range labels settled on newest → oldest (matches the tables' top-to-bottom order); statsPageV2 flipped to match exercisePageV2.

Dead code / duplication:
- [x] One generic `filterByDateRange` in `utils.ts` replaces `filterWorkoutsByDateRange` + `filterCardioWorkoutsByDateRange`.
- [x] Deleted `computeWeekPeriods`, `computeMonthPeriods`, `getCycleDateRange`, `Period`, `ViewMode` from `statsUtils.ts`; `utils.ts` re-exports trimmed to `dateFromTitle`. (Still present but untouched: unused `cn()` + `formatExerciseSets` in utils.ts — not in scope.)
- [x] Dead `.pain-pills`/`.pain-pill` and `.grid-divider` blocks removed from v2.css; CLAUDE.md now documents `.day-panel-inline`/`.day-panel-close`.
- [x] Removed `@radix-ui/*`, `cmdk`, `react-window` (+ types), `class-variance-authority`, and `@tauri-apps/api` (no imports anywhere; `withGlobalTauri` not enabled). Lockfile updated via `pnpm install --lockfile-only`.

Deploy / infra:
- [x] `firebase.json` `trailingSlash` → `true` (matches next.config).
- [x] `sw.js`: navigations are network-first (cache = offline fallback); cache name versioned via `?v=NEXT_PUBLIC_TIMESTAMP` on the registration URL so each deploy's SW activation drops the old cache.
- [x] `layout.tsx`: `title.template` (`%s · Leeft`) + per-route titles on all routes (`generateMetadata` from slug on `/muscle/[slug]`; static section titles on `[id]` routes to avoid per-page artifact re-fetches at build); `themeColor` now media-keyed dark/light.

Follow-up dead-code sweep (2026-07-11, after the review fixes):
- [x] `cn()` + `formatExerciseSets` deleted from `utils.ts` → `clsx`, `tailwind-merge`, `tailwindcss-animate` (no plugin classes used) dropped from package.json/tailwind.config.
- [x] Geist fonts removed entirely (layout decls, body variables, `app/fonts/*.woff`); CLAUDE.md gotcha updated.
- [x] Page-state hooks trimmed to what their single consumers use: `useWorkoutLogState` (dropped miniMode, slidesToShow, selectedMonth, allMonths, and other unexposed v1 fields), `useCardioPageState` (dropped 8 unused fields + orphaned `typeCounts`/`availableTypes` memos + never-passed options), `useCyclesPageState` (dropped `rawCycles`, `setVisibleYear`).
- [x] `lib/calc.ts` re-exports trimmed to the four names web consumes.
- [x] Dead repo-wide `packages/utils` date fns deleted: `parseDate`, `formatDate`, `getLastNDaysRange`, `parseYearMonth`, `formatYearMonth`.

Small UI bugs:
- [x] `typeMix.tsx` — hiddenCount counts against rows actually shown; expander stays visible while expanded.
- [x] `muscleGroupPageV2.tsx` — `maxSets` guard is `|| 1`.
- [x] `workoutLogPageV2.tsx` — daily-mode hero label/stats derive from `dailyDays[0]?.date` (UTC getters).
- [x] `workoutCard.tsx` — copy timer kept in a ref, cleared on re-click and unmount.
- [x] `monthCalendar.tsx` — today key built from local date components (day keys stay UTC).
