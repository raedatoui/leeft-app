// Per-exercise session derivation shared by the exercise detail and compare pages.

import { type CalculationMethod, defaultMaxCalculator, oneRepMaxCalculators } from '@/lib/calc';
import { isLoaded } from '@/lib/setUnits';
import { inTimeRange, type ResolvedTimeRange } from '@/lib/timeRange';
import type { MappedWorkout, RepRange, SetDetail, Workout } from '@/types';

export interface ExerciseSessionRow {
    workout: MappedWorkout;
    sets: SetDetail[];
    topSet: SetDetail | undefined;
    workSetCount: number;
    workVolume: number;
    metric: number;
    /** False when the session wasn't measured in reps x lb — a plank, a sled push, or a chin-up
     *  logged as added plate. Such a session has no metric to plot and no rep range to filter on,
     *  but its sets are still worth listing, so it stays in the rows and leaves the chart. */
    loaded: boolean;
    /** PR tier of this session's top set (from the data pipeline), or undefined if not a PR. */
    prTier: SetDetail['prTier'];
}

export interface ExerciseSessionStats {
    pr: number;
    totalSets: number;
    sessionCount: number;
    volume: number;
}

export interface ExerciseSessionFilters {
    method: CalculationMethod;
    repRange: RepRange;
    range: ResolvedTimeRange;
    /** Restrict to these workout uuids (cycle filter); null/undefined = no restriction. */
    cycleWorkoutIds?: Set<string> | null;
}

export function computeExerciseSessions(workouts: Workout[], exerciseId: number, filters: ExerciseSessionFilters): ExerciseSessionRow[] {
    const { method, repRange, range, cycleWorkoutIds } = filters;
    const showPRSet = method === defaultMaxCalculator || oneRepMaxCalculators.some((m) => m === method);

    const filtered = workouts
        .filter((w) => w.exercises.some((e) => e.exerciseId === exerciseId))
        .filter((w) => inTimeRange(w.date, range))
        .filter((w) => !cycleWorkoutIds || cycleWorkoutIds.has(w.uuid))
        .filter((w) => {
            const sel = w.exercises.find((e) => e.exerciseId === exerciseId);
            if (!sel) return false;
            // A rep range is meaningless against seconds or inches — filtering on it would empty
            // the page for every movement that isn't reps x lb.
            if (!isLoaded(sel.units)) return true;
            return sel.sets.some((s) => s.reps && s.reps >= repRange.min && s.reps <= repRange.max);
        })
        .sort((a, b) => a.date.getTime() - b.date.getTime());

    const rows: ExerciseSessionRow[] = [];
    for (const w of filtered) {
        const selected = w.exercises.find((e) => e.exerciseId === exerciseId);
        if (!selected) continue;
        const loaded = isLoaded(selected.units);
        const mw: MappedWorkout = { ...w, selected, weight: 0 };
        // Off the pounds basis there is no weight to run a 1RM formula over, so the metric becomes
        // the top rep count — which is where the progression actually lives for a bodyweight
        // movement. `loaded` tells the page which of the two it is holding.
        const metric = loaded ? method.calculator(mw, repRange) : Math.max(0, ...selected.sets.map((s) => s.reps ?? 0));
        if (loaded && metric <= 0) continue;
        mw.weight = metric;

        const filteredSets = loaded ? selected.sets.filter((s) => s.reps && s.reps >= repRange.min && s.reps <= repRange.max) : selected.sets;
        let topSet: SetDetail | undefined;
        for (const s of filteredSets) {
            if (!topSet || s.weight > topSet.weight) topSet = s;
        }
        // PR markers come from the data pipeline (per-rep-count, tiered), not a per-filter running max.
        // Shown for weight / 1RM methods, where the top set is the meaningful PR set.
        const prTier = showPRSet ? topSet?.prTier : undefined;
        const workSetCount = selected.sets.filter((s) => s.isWorkSet).length;

        rows.push({
            workout: mw,
            sets: selected.sets,
            topSet,
            loaded,
            workSetCount,
            workVolume: selected.workVolume,
            metric,
            prTier,
        });
    }
    return rows;
}

export function computeExerciseStats(sessions: ExerciseSessionRow[]): ExerciseSessionStats {
    let pr = 0;
    let totalSets = 0;
    let volume = 0;
    for (const s of sessions) {
        if (s.metric > pr) pr = s.metric;
        totalSets += s.workSetCount;
        volume += s.workVolume;
    }
    return { pr, totalSets, sessionCount: sessions.length, volume };
}
