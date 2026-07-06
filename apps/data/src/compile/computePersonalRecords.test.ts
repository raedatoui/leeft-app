import { describe, expect, test } from 'bun:test';
import { annotatePersonalRecords } from './computePersonalRecords';
import type { SetDetail, Workout } from './types';

const set = (order: number, reps: number | undefined, weight: number, isWorkSet = true): SetDetail => ({ order, reps, weight, isWorkSet });

const wo = (uuid: string, dateISO: string, sets: SetDetail[], exerciseId = 1): Workout => ({
    uuid,
    date: new Date(dateISO),
    title: dateISO,
    duration: 0,
    rpe: null,
    volume: 0,
    workVolume: 0,
    exercises: [{ exerciseId, order: 0, volume: 0, workVolume: 0, sets }],
});

const tiers = (w: Workout, exIdx = 0) => w.exercises[exIdx].sets.map((s) => s.prTier);

describe('annotatePersonalRecords', () => {
    test('flags PR-at-the-time per rep count and promotes beaten -> active -> allTime', () => {
        const [a, b] = annotatePersonalRecords([
            wo('u1', '2024-01-01', [set(0, 2, 300), set(1, 3, 290)]),
            wo('u2', '2024-02-01', [set(0, 2, 310), set(1, 2, 305)]), // 310 beats 300; 305 < 310 not a PR
        ]);
        // u1: 300x2 was a 2-rep PR then beaten by 310; 290x3 is still the 3-rep record (active)
        expect(tiers(a)).toEqual(['beaten', 'active']);
        // u2: 310x2 is the current 2-rep record and heaviest overall -> allTime; 305x2 not a PR
        expect(tiers(b)).toEqual(['allTime', undefined]);
    });

    test('every set carries isPR=true exactly when it has a prTier', () => {
        const [a] = annotatePersonalRecords([wo('u1', '2024-01-01', [set(0, 1, 400), set(1, 1, 390)])]);
        const flags = a.exercises[0].sets.map((s) => [s.isPR, s.prTier]);
        expect(flags).toEqual([
            [true, 'allTime'],
            [undefined, undefined], // 390 < 400, not a PR
        ]);
    });

    test('ignores warmups and rep-less sets; ties do not flag', () => {
        const [w] = annotatePersonalRecords([
            wo('u1', '2024-01-01', [
                set(0, 1, 500, false), // warmup, even though heaviest
                set(1, undefined, 350), // no reps -> skipped
                set(2, 1, 350), // first 1-rep work set -> PR
                set(3, 1, 350), // tie (not strictly greater) -> not a PR
            ]),
        ]);
        expect(tiers(w)).toEqual([undefined, undefined, 'allTime', undefined]);
    });

    test('rep buckets are independent (no cross-rep monotonicity)', () => {
        // a later, lighter 1-rep still flags as a 1RM PR despite a heavier 2-rep existing
        const [a, b] = annotatePersonalRecords([wo('u1', '2024-01-01', [set(0, 2, 360)]), wo('u2', '2024-02-01', [set(0, 1, 350)])]);
        expect(tiers(a)).toEqual(['allTime']); // 360x2 heaviest overall
        expect(tiers(b)).toEqual(['active']); // 350x1 is the standing 1-rep record
    });

    test('per-exercise isolation: same set order across exercises does not collide', () => {
        const w: Workout = {
            ...wo('u1', '2024-01-01', [set(0, 1, 100)], 1),
            exercises: [
                { exerciseId: 1, order: 0, volume: 0, workVolume: 0, sets: [set(0, 1, 100)] },
                { exerciseId: 2, order: 1, volume: 0, workVolume: 0, sets: [set(0, 1, 200)] },
            ],
        };
        const [out] = annotatePersonalRecords([w]);
        expect(out.exercises[0].sets[0].prTier).toBe('allTime'); // record for exercise 1
        expect(out.exercises[1].sets[0].prTier).toBe('allTime'); // record for exercise 2
    });

    test('is independent of input array order (sorts by date internally)', () => {
        const newer = wo('u2', '2024-02-01', [set(0, 2, 310)]);
        const older = wo('u1', '2024-01-01', [set(0, 2, 300)]);
        const [first, second] = annotatePersonalRecords([newer, older]); // passed out of order
        // returns in original (input) order, but tiers reflect true chronology
        expect(first.uuid).toBe('u2');
        expect(first.exercises[0].sets[0].prTier).toBe('allTime'); // 310 (2024-02) is the record
        expect(second.exercises[0].sets[0].prTier).toBe('beaten'); // 300 (2024-01) came first, since beaten
    });
});
