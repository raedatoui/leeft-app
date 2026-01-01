# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Leeft is a workout tracking application structured as a pnpm monorepo with three packages:
- **`apps/web`**: Next.js 15 (App Router) frontend for visualizing workout data
- **`apps/data`**: Bun-based data processing pipeline for fetching, parsing, and classifying workout data
- **`packages/types`**: Shared Zod schemas used by both apps

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

### Data Pipeline (run from apps/data)
```bash
bun src/compile/index.ts compile-lifting   # Compile lifting logs
bun src/combine/index.ts combine-all       # Aggregate all data
bun src/classify/index.ts claude-all       # Run LLM classification
./daily-sync.sh                            # Full automated pipeline
```

### Deployment
```bash
pnpm deploy:web         # Build and deploy web app to Firebase
```

## Architecture

### Data Flow
1. Raw data downloaded to `apps/data/data/in` or `apps/data/data/download`
2. Scripts compile into structured JSON in `apps/data/data/out`
3. Web UI fetches JSON artifacts to render the dashboard

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

### Type Safety
Never duplicate types between apps. Add shared types to `packages/types`.
