import type { Workout } from './types';

type PrTier = 'allTime' | 'active' | 'beaten';

/**
 * Annotates each set with `isPR` / `prTier` using "PR-at-the-time", per exact rep count.
 *
 * Phase 1 walks every exercise's WORK sets in chronological order, tracking a running max
 * weight per (exerciseId, reps). A set is a PR iff its weight STRICTLY exceeds the running
 * max for its own rep count at that point in time (so a 1-rep PR subsumes "heaviest single").
 *
 * Phase 2 assigns a display tier to each PR set:
 *   - allTime: the single heaviest set ever for the exercise, irrespective of rep count
 *   - active:  currently the standing record for its rep count
 *   - beaten:  was a record when performed, since surpassed for that rep count
 *
 * Flags are emitted ONLY on PR sets; every other set keeps its existing shape. Warmups and
 * sets without `reps` are never PRs. The pass sorts a copy by date internally, so it does not
 * depend on the order of the input array.
 */
export function annotatePersonalRecords(workouts: Workout[]): Workout[] {
    const keyOf = (uuid: string, exId: number, order: number) => `${uuid}:${exId}:${order}`;
    const curMax = new Map<number, Map<number, number>>(); // exId -> reps -> max weight
    const holder = new Map<number, Map<number, string>>(); // exId -> reps -> current-record setKey
    const prs: { key: string; exId: number; reps: number; weight: number; date: Date }[] = [];

    // Phase 1: walk in true chronological order (self-contained; no reliance on input order).
    const ordered = [...workouts].sort((a, b) => a.date.getTime() - b.date.getTime());
    for (const w of ordered) {
        for (const ex of w.exercises) {
            let rm = curMax.get(ex.exerciseId);
            let hm = holder.get(ex.exerciseId);
            if (!rm || !hm) {
                rm = new Map();
                hm = new Map();
                curMax.set(ex.exerciseId, rm);
                holder.set(ex.exerciseId, hm);
            }
            for (const s of ex.sets) {
                if (!s.isWorkSet || s.reps === undefined) continue;
                const prev = rm.get(s.reps);
                if (prev === undefined || s.weight > prev) {
                    const key = keyOf(w.uuid, ex.exerciseId, s.order);
                    rm.set(s.reps, s.weight);
                    hm.set(s.reps, key);
                    prs.push({ key, exId: ex.exerciseId, reps: s.reps, weight: s.weight, date: w.date });
                }
            }
        }
    }

    // Phase 2: every PR defaults to 'beaten'; current rep-record holders -> 'active';
    // heaviest active set per exercise -> 'allTime' (tie: more reps, then earliest date).
    const tier = new Map<string, PrTier>();
    for (const p of prs) tier.set(p.key, 'beaten');

    const activeKeys = new Set<string>();
    for (const hm of holder.values()) for (const key of hm.values()) activeKeys.add(key);
    for (const key of activeKeys) tier.set(key, 'active');

    const best = new Map<number, { key: string; weight: number; reps: number; date: Date }>();
    for (const p of prs) {
        if (!activeKeys.has(p.key)) continue;
        const b = best.get(p.exId);
        if (
            !b ||
            p.weight > b.weight ||
            (p.weight === b.weight && p.reps > b.reps) ||
            (p.weight === b.weight && p.reps === b.reps && p.date < b.date)
        ) {
            best.set(p.exId, { key: p.key, weight: p.weight, reps: p.reps, date: p.date });
        }
    }
    for (const b of best.values()) tier.set(b.key, 'allTime');

    // Apply (immutable; map original order, flags only on PR sets).
    return workouts.map((w) => ({
        ...w,
        exercises: w.exercises.map((ex) => ({
            ...ex,
            sets: ex.sets.map((s) => {
                const t = tier.get(keyOf(w.uuid, ex.exerciseId, s.order));
                return t ? { ...s, isPR: true, prTier: t } : s;
            }),
        })),
    }));
}
