// Pure formatting/aggregation helpers for the /add flow's in-progress (unsaved) exercise drafts.

import { type ColumnUnits, DEFAULT_COLUMN_UNITS, formatSetValue, isLoaded, unitLabel } from '@/lib/setUnits';
import type { Workout } from '@/types';

export interface DraftSet {
    reps: number;
    weight: number;
    isWorkSet: boolean;
    // UI-only "checked off" affordance — not part of SetDetail, excluded from the save payload.
    done: boolean;
}

export interface DraftExercise {
    exerciseId: number;
    sets: DraftSet[];
    // Copied off the exercise map when the exercise is picked, so a restored draft can label its
    // rows before the CDN dataset lands (or at all, offline). Absent in sessions stored before
    // this field existed — always read through a fallback.
    name?: string;
    // What the two set columns are counting. Seeded from the exercise's catalog `measurement` when
    // it's picked, then whatever the pickers say. Absent in sessions stored before this field
    // existed — always read through `unitsOf`.
    units?: ColumnUnits;
}

export const unitsOf = (ex: DraftExercise): ColumnUnits => ex.units ?? DEFAULT_COLUMN_UNITS;

export function fmtClock(ms: number): string {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = String(s % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

// Only completed (checked-off) sets count toward volume — an entered but unchecked set is a plan,
// not work done — and only reps-times-pounds is tonnage at all: a plank or a sled push has none.
export function exerciseVolume(ex: DraftExercise, workOnly: boolean): number {
    if (!isLoaded(unitsOf(ex))) return 0;
    return ex.sets.reduce((sum, s) => sum + (!s.done || (workOnly && !s.isWorkSet) ? 0 : s.weight * s.reps), 0);
}

export interface SessionRecord {
    exerciseId: number;
    reps: number;
    weight: number;
}

// Per-rep-count records set this session — same semantics as the exercise-detail trophy
// (history first, then earlier sets this session raise the bar; rep counts with no history
// never flag), except only checked-off sets count: an unchecked set is a plan, not a record.
export function sessionRecords(exercises: DraftExercise[], workouts: Workout[]): SessionRecord[] {
    const records: SessionRecord[] = [];
    for (const ex of exercises) {
        // Only a pounds ladder has records to beat here; seconds and inches rank nothing.
        if (!isLoaded(unitsOf(ex))) continue;
        const running = new Map<number, number>(); // reps -> standing max weight
        for (const w of workouts) {
            for (const we of w.exercises) {
                if (we.exerciseId !== ex.exerciseId) continue;
                // History on another basis is a different ladder — a chin-up "@ 10" (a plate) must
                // not set the bar for a chin-up "@ 210" (the whole system).
                if (!isLoaded(we.units)) continue;
                for (const s of we.sets) {
                    if (!s.isWorkSet || !s.reps) continue;
                    const prev = running.get(s.reps);
                    if (prev === undefined || s.weight > prev) running.set(s.reps, s.weight);
                }
            }
        }
        const beaten = new Map<number, number>(); // reps -> best new weight this session
        for (const s of ex.sets) {
            if (!s.done || !s.reps || !s.weight) continue;
            const prev = running.get(s.reps);
            if (prev !== undefined && s.weight > prev) {
                running.set(s.reps, s.weight);
                beaten.set(s.reps, s.weight);
            }
        }
        for (const [reps, weight] of beaten) records.push({ exerciseId: ex.exerciseId, reps, weight });
    }
    return records;
}

// TrainHeroic-style summary line: "3 x 12 @ 135lb" when uniform, else "10,14,14 @ 50,65,65lb".
// The unit suffix follows the load column, and drops away entirely when there is no load.
export function exerciseSummary(ex: DraftExercise): string {
    if (ex.sets.length === 0) return 'no sets yet';
    const units = unitsOf(ex);
    const suffix = units.weight === 'none' ? '' : unitLabel(units.weight).toLowerCase();
    const reps = ex.sets.map((s) => formatSetValue(s.reps, units.reps));
    const weights = ex.sets.map((s) => s.weight);
    const uniform = reps.every((r) => r === reps[0]) && weights.every((w) => w === weights[0]);
    const lead = uniform ? `${ex.sets.length} x ${reps[0]}` : reps.join(',');
    if (units.weight === 'none') return lead;
    return uniform ? `${lead} @ ${weights[0]}${suffix}` : `${lead} @ ${weights.join(',')}${suffix}`;
}
