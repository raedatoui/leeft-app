// Pure formatting/aggregation helpers for the /add flow's in-progress (unsaved) exercise drafts.

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
}

export function fmtClock(ms: number): string {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = String(s % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

// Only completed (checked-off) sets count toward volume — an entered but unchecked set is a plan, not work done.
export function exerciseVolume(ex: DraftExercise, workOnly: boolean): number {
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
        const running = new Map<number, number>(); // reps -> standing max weight
        for (const w of workouts) {
            for (const we of w.exercises) {
                if (we.exerciseId !== ex.exerciseId) continue;
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
export function exerciseSummary(ex: DraftExercise): string {
    if (ex.sets.length === 0) return 'no sets yet';
    const reps = ex.sets.map((s) => s.reps);
    const weights = ex.sets.map((s) => s.weight);
    const uniform = reps.every((r) => r === reps[0]) && weights.every((w) => w === weights[0]);
    return uniform ? `${ex.sets.length} x ${reps[0]} @ ${weights[0]}lb` : `${reps.join(',')} @ ${weights.join(',')}lb`;
}
