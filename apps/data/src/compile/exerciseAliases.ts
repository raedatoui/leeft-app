import { setsVolume } from '@leeft/utils';
import type { BaseExercise, BaseWorkout } from './types';

// Retired duplicate exercise ids → surviving canonical id. TrainHeroic occasionally re-creates
// an exercise under a new id; every id here is remapped at compile time so exercise-metadata,
// the lifting log, and PR computation only ever see the survivor. The google-era logs reference
// retired ids too (191, 1634536), so the remap runs on the merged workout list, not per-source.
// Decisions from the 2026-07-18 duplicate analysis (~/tmp/exercise-duplicates-report.md).
export const EXERCISE_ID_ALIASES: Record<number, number> = {
    191: 688606, // Chin-Up (dormant since 2024-10) → Chin-Up (active id)
    38177: 597557, // Seated Chest Press → Seated Chest Press (current TrainHeroic id)
    1634536: 5551489, // Paused Bench Press → Pause Bench Press
    4658937: 4336323, // Incline Smith Machine Bench Press → Smith Machine Incline Bench Press
    4539004: 6535, // Cable Tricep Pushdown → Tricep Pushdown
    53085: 4276, // DB Chest Fly → DB Fly
    // The same backward sled, logged under two names. Both are `time x lb`, both dormant, and
    // they never share a day — Walk is a single 2022 session, Drag ran through 2023.
    688518: 78351, // Backward Sled Walk → Backward Sled Drag

    // The gray-zone groups from the same analysis, adjudicated by Raed over two interactive
    // rounds. All are reps x lb on both sides and none share a day with their survivor.
    41: 687821, // Shoulder Press → Overhead Press (synonym; a 10-week 2021 blip)
    337: 51423, // Seated DB Press → Seated DB Shoulder Press
    5947474: 76842, // Lying Tricep Extension → EZ Bar Lying Tricep Extension (generic name)
    4884882: 4184821, // Dumbbell Ovehead Extension → Overhead Triceps Extension (typo'd re-add)
    688883: 150, // DB Row → 1-Arm DB Row (accidental library pick)
    6529: 53086, // Seated Row → Seated Cable Row
    5623212: 76843, // Barbell Row To Chest → Barbell Row ("to chest" is a cue, not a variant)
    4459358: 4339645, // LF Machine Row → LF Low Row (same Life Fitness station)
    38176: 2710824, // Seated Single Leg Press → Single Leg Press
    5947818: 687503, // DB Walking Lunge → Walking Lunge
    4164: 687503, // DB Lunges → Walking Lunge (three names for one movement)
    4184816: 4672142, // Cross-Body Cable Y- Raise (Side Delt) → Freemotion Y Raises (same station)
    3718: 4841234, // Hip Thrust → Glute Drive (merged despite the equipment difference, Raed's call)
};

export function resolveExerciseId(id: number): number {
    return EXERCISE_ID_ALIASES[id] ?? id;
}

// Remap every workout's exercise entries to canonical ids, merging entries when a retired and
// surviving id were both logged in the same workout (sets concatenated, volume recomputed).
//
// Two entries only merge when they were measured the same way. Nothing in the archive currently
// hits that case, but concatenating sets across bases would put a chin-up "@ 10" (a plate) and one
// "@ 210" (the whole system) in one column — so a mismatch keeps them as separate entries under
// the canonical id rather than silently mixing scales.
export function applyExerciseAliases(workouts: BaseWorkout[]): BaseWorkout[] {
    return workouts.map((workout) => {
        if (!workout.exercises.some((ex) => ex.exerciseId in EXERCISE_ID_ALIASES)) return workout;
        const merged: BaseExercise[] = [];
        for (const exercise of workout.exercises) {
            const canonical = { ...exercise, exerciseId: resolveExerciseId(exercise.exerciseId) };
            const existing = merged.find(
                (ex) => ex.exerciseId === canonical.exerciseId && ex.units.reps === canonical.units.reps && ex.units.weight === canonical.units.weight
            );
            if (existing) {
                existing.sets = [...existing.sets, ...canonical.sets].map((set, index) => ({ ...set, order: index }));
                existing.volume = setsVolume(existing.sets, existing.units);
            } else {
                merged.push(canonical);
            }
        }
        return { ...workout, exercises: merged };
    });
}
