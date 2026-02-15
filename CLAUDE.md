# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Leeft is a workout tracking application structured as a pnpm monorepo with four packages:
- **`apps/web`**: Next.js 16 (App Router) frontend for visualizing workout data (static export, no SSR)
- **`apps/data`**: Bun-based data processing pipeline for fetching, parsing, and classifying workout data
- **`packages/types`**: Shared Zod schemas used by both apps
- **`packages/utils`**: Shared utilities (calc, date, logger)

### Prerequisites
- Node.js >= 22
- pnpm (v10.28+)
- Bun (for data pipeline)
- `gsutil` (for GCS uploads)

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
pnpm dev:web            # Run web app dev server (Next.js)
pnpm dev:data           # Run data pipeline dev mode
```

### Building & Quality
```bash
pnpm build              # Build all apps
pnpm lint               # Lint all apps (Biome)
pnpm check              # Type check and lint all apps
pnpm format             # Format code (Biome)
```

### Data Pipeline (run from root)
```bash
pnpm pipeline               # Full pipeline + deploy (interactive)
pnpm pipeline:sync          # Data sync only (no deploy)
pnpm upload                 # Upload data to GCS
```

### Data Pipeline (run from apps/data)
```bash
bun compile:lifting         # Compile lifting logs
bun combine:all             # Aggregate all data
bun classify:claude-all     # Run LLM classification
```

### Analysis Scripts (run from apps/data)
```bash
bun analyze:workouts             # Check TrainHeroic workout file duplicates
bun analyze:exercises:fuzzy      # Basic Levenshtein fuzzy matching
bun analyze:exercises:full       # Comprehensive (exact, substring, fuzzy, attributes)
bun analyze:exercises:semantic   # Semantic detection with normalization
```

### Testing
```bash
pnpm --filter @leeft/web exec playwright test   # Run Playwright E2E tests
```

### Deployment
```bash
pnpm deploy:web         # Build and deploy web app to Firebase
```

## Architecture

### Data Flow
1. Raw data downloaded to `apps/data/data/in` or `apps/data/data/download`
2. Scripts compile into structured JSON in `apps/data/data/out`
3. `pnpm upload` gzips and uploads artifacts to GCS bucket
4. Web UI fetches JSON artifacts via CDN URL + timestamp to render the dashboard

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
- **Timestamp after pipeline**: After running the data pipeline, update `NEXT_PUBLIC_TIMESTAMP` in `apps/web/.env.local` to match the new upload
- **pnpm catalog**: Shared dependency versions (TypeScript, Biome, Zod) are managed in `pnpm-workspace.yaml` `catalog:` — update there, not in individual package.json files
- **Data files gitignored**: All `apps/data/data/` contents are gitignored
