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

- [ ] **Theme split breaks light mode on failure pages** — `app/layout.tsx:68` hardcodes `<html className="dark">` (Tailwind/shadcn tokens) while the toggle switches next-themes' `data-mode` (what v2.css keys on). In light mode `error.tsx` renders near-white `text-foreground` on the cream v2 background. Related: `v2.css:55` redefines `--border` as hex while globals.css applies `* { @apply border-border; }` → `hsl(#2a2722)` is invalid → borders collapse to `currentColor`. Fix: key the `.dark` token block to `html[data-mode="dark"]`, or restyle `error.tsx`/`not-found.tsx` with v2 tokens (`var(--fg)`, `var(--muted)`); rename the clashing v2 tokens or drop the `border-border` preflight rule.
- [ ] **Initial-load failure is a dead end** — `lib/providers.tsx:103` renders a bare red `Error: <raw message>` outside the v2 wrapper with no retry; the `error.tsx` boundary never fires because Providers catches the error itself. Fix: styled error state with a "Try again" button reusing the existing `refresh`/`loadData` machinery. (Fetch errors are at least descriptive now after fix 3.)
- [ ] **Latent crash in `computeStats`** — `lib/utils.ts:44` `ex.sets.reduce(...)` with no initial value throws on `sets: []` (schema allows it; two other call sites guard it). One bad entry in a runtime data refresh bricks `/cycles`. Fix: skip exercises with `sets.length === 0`.
- [ ] **Pagination indices don't survive dataset changes**:
  - `workoutLogPageV2.tsx:97-101` — Daily view slices by unclamped `currentIndex`; paging deep then shrinking the list (effort tier) yields an empty page and "102 / 40". Fix: clamp like the other pages (`Math.min(currentIndex, slideCount - 1)`).
  - `statsPageV2.tsx:172-180` — bucket-reset effect fires on `buckets` array *identity* (effort toggle, refresh), snapping the user back to today; `anchorRef` is never cleared. Fix: anchor on `currentBucket.end` before any state that rebuilds buckets, or key the effect on `groupBy` + bound values.
- [ ] **Filtered workout cards show contradictory numbers** — `workoutCard.tsx:176-177` header volume is always the whole workout's while sets/ex counts respect `muscleGroupFilter`/`selectedExercise` (visible on `/cycles/[id]` and exercise detail panel). Fix: when filtered, sum volume over the filtered exercises.
- [ ] **`/cardio` "All time" mounts ~6,000 session cards** — `cardioPageV2.tsx:237-239` has no pagination. Fix: paginate with the existing TablePager/SwipePager slice pattern.

## Low priority — open

Consistency drift:
- [ ] Stats table row shows warmup-inclusive `w.volume` while its detail card renders `includeWarmup={false}` (`statsPageV2.tsx:122` vs `424`) — pick one convention.
- [ ] `cardioSessionCard.tsx` vs `workoutCard.tsx` duplicate cardio formatters (`formatDistanceKm`, pace) and disagree on zero-value tiles; extract a shared stats grid. Also `cardioSessionCard` derives time from `date` (empty at UTC midnight) instead of `startedAt`.
- [ ] `DropdownV2` vs `ExerciseLookupV2` duplicate the open/outside-click/Escape mechanism and disagree on query reset — extract a shared hook.
- [ ] `/stats` breakdown chart uses the legacy v1 palette + Geist fonts (`lib/chart-theme.ts`) while sibling charts use `chartPaletteV2.ts` — fold one into the other. Its `dateRange` prop is also unused; delete it.
- [ ] Pager range-label direction is flipped between `exercisePageV2.tsx:114` (newest→oldest) and `statsPageV2.tsx:217` (oldest→newest) — settle one.

Dead code / duplication:
- [ ] `filterWorkoutsByDateRange` duplicated in `utils.ts` and `statsUtils.ts` — share one generic.
- [ ] Dead exports in `statsUtils.ts` (`computeWeekPeriods` — has a latent DST bug, `computeMonthPeriods`, `getCycleDateRange`) and unused `@leeft/utils` re-exports in `utils.ts` — delete.
- [ ] Dead CSS blocks in `v2.css`: `.pain-pills`/`.pain-pill` (~3119), `.grid-divider` (~1332). CLAUDE.md still documents the removed `.day-panel-backdrop`.
- [ ] Unused deps in `apps/web/package.json`: all `@radix-ui/*`, `cmdk`, `react-window` (+ types), `class-variance-authority` (verify `@tauri-apps/api` against src-tauri glue before removing).

Deploy / infra:
- [ ] `trailingSlash: true` (next.config, needed for Tauri) vs `"trailingSlash": false` (`apps/web/firebase.json`) → 301 on every deep-link hard load. Fix firebase.json to `true`.
- [ ] `public/sw.js` — single never-rotated cache-first cache: old build chunks accumulate forever; users always see the previous deploy first. Version the cache name per build and/or network-first for navigations.
- [ ] `layout.tsx` metadata: static `title: 'Leeft'` on all routes (add `title.template` + per-route/`generateMetadata` titles); `themeColor` pinned dark — use `media`-keyed variants.

Small UI bugs:
- [ ] `typeMix.tsx:77` — "+N more types" off by one when the active type is appended below the fold (`hiddenCount = distribution.length - rows.length`).
- [ ] `muscleGroupPageV2.tsx:108` — `maxSets` can be 0 → `NaN%` bar widths; guard with `|| 1`.
- [ ] `workoutLogPageV2.tsx` — Daily-view hero month label/stats don't track slider paging; derive from `dailyDays[0]?.date` (UTC getters) in daily mode.
- [ ] `workoutCard.tsx:189` — copy-button `setTimeout` never cleared on re-click/unmount; keep the id in a ref.
- [ ] `monthCalendar.tsx:60` — "today" ring is the UTC day, so it sits on tomorrow's cell every evening; either accept (consistent with UTC keys) or build the key from local components.
