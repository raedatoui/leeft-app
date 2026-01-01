import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Exercise, SetDetail, Workout } from './types';
import { logger } from '../utils/logger';

interface ClassifiedSet extends SetDetail {
    isWorkSet: boolean;
}

interface ClassifiedExercise extends Omit<Exercise, 'sets'> {
    sets: ClassifiedSet[];
}

interface ClassifiedWorkout extends Omit<Workout, 'exercises'> {
    exercises: ClassifiedExercise[];
}

interface ClassifyOptions {
    threshold: number; // 0-1, e.g., 0.85 for 85%
}

/**
 * Checks if a set is still warming up by looking at future sets.
 * If any future set has BOTH higher weight AND higher reps, the current set is still a warmup.
 * (You're still building up if a later set is heavier AND has more reps)
 */
function isStillWarmingUp(sets: SetDetail[], currentIndex: number): boolean {
    const current = sets[currentIndex];
    const currentReps = current.reps ?? 0;

    for (let i = currentIndex + 1; i < sets.length; i++) {
        const futureSet = sets[i];
        const futureReps = futureSet.reps ?? 0;

        // If a future set has both higher weight AND higher reps, we're still warming up
        if (futureSet.weight > current.weight && futureReps > currentReps) {
            return true;
        }
    }

    return false;
}

/**
 * Classifies sets within an exercise as warmup or work sets.
 *
 * Algorithm:
 * 1. If all weights are equal → all work sets
 * 2. If max weight is 0 (bodyweight) → all work sets
 * 3. Find max weight → calculate threshold (e.g., 85% of max)
 * 4. Find first set at or above threshold → candidate for work set boundary
 * 5. Check if any future set has BOTH higher weight AND higher reps
 *    - If yes, this set is still a warmup (keep looking for real work sets)
 * 6. Sets before boundary = warmup, at/after = work
 */
function classifyExerciseSets(sets: SetDetail[], options: ClassifyOptions): ClassifiedSet[] {
    if (sets.length === 0) {
        return [];
    }

    // Single set = work set
    if (sets.length === 1) {
        return [{ ...sets[0], isWorkSet: true }];
    }

    const weights = sets.map((s) => s.weight);
    const maxWeight = Math.max(...weights);
    const minWeight = Math.min(...weights);

    // All weights equal → all work sets (no warmups recorded)
    if (maxWeight === minWeight) {
        return sets.map((s) => ({ ...s, isWorkSet: true }));
    }

    // Bodyweight exercises (max weight = 0) → all work sets
    if (maxWeight === 0) {
        return sets.map((s) => ({ ...s, isWorkSet: true }));
    }

    const targetThreshold = maxWeight * options.threshold;

    // Find first REAL work set: above threshold AND no future set with both higher weight and higher reps
    let firstWorkIndex = -1;
    for (let i = 0; i < sets.length; i++) {
        if (sets[i].weight >= targetThreshold && !isStillWarmingUp(sets, i)) {
            firstWorkIndex = i;
            break;
        }
    }

    // If no set qualifies (shouldn't happen), all are work
    if (firstWorkIndex === -1) {
        return sets.map((s) => ({ ...s, isWorkSet: true }));
    }

    // Classify: before firstWorkIndex = warmup, at/after = work
    return sets.map((s, i) => ({
        ...s,
        isWorkSet: i >= firstWorkIndex,
    }));
}

function classifyWorkout(workout: Workout, options: ClassifyOptions): ClassifiedWorkout {
    return {
        ...workout,
        exercises: workout.exercises.map((exercise) => ({
            ...exercise,
            sets: classifyExerciseSets(exercise.sets, options),
        })),
    };
}

export function classifyAllWorkouts(workouts: Workout[], options: ClassifyOptions): ClassifiedWorkout[] {
    return workouts.map((w) => classifyWorkout(w, options));
}

export function main(): void {
    // Parse threshold from CLI args (default 0.85)
    const thresholdArg = process.argv.find((arg) => arg.startsWith('--threshold='));
    const threshold = thresholdArg ? parseFloat(thresholdArg.split('=')[1]) : 0.85;

    if (threshold < 0 || threshold > 1) {
        logger.error('Threshold must be between 0 and 1 (e.g., 0.85 for 85%)');
        process.exit(1);
    }

    logger.info(`Using threshold: ${(threshold * 100).toFixed(0)}%`);

    // Read input file
    const inputPath = join(__dirname, '../', '../', 'data', 'out', 'lifting-log.json');
    const inputData = JSON.parse(readFileSync(inputPath, 'utf-8'));

    // Parse dates back to Date objects
    const workouts: Workout[] = inputData.workouts.map((w: Workout & { date: string }) => ({
        ...w,
        date: new Date(w.date),
    }));

    logger.info(`Processing ${workouts.length} workouts...`);

    // Classify all workouts
    const classifiedWorkouts = classifyAllWorkouts(workouts, { threshold });

    // Calculate stats
    let totalSets = 0;
    let warmupSets = 0;
    let workSets = 0;

    for (const workout of classifiedWorkouts) {
        for (const exercise of workout.exercises) {
            for (const set of exercise.sets) {
                totalSets++;
                if (set.isWorkSet) {
                    workSets++;
                } else {
                    warmupSets++;
                }
            }
        }
    }

    logger.info(`Total sets: ${totalSets}`);
    logger.info(`Warmup sets: ${warmupSets} (${((warmupSets / totalSets) * 100).toFixed(1)}%)`);
    logger.info(`Work sets: ${workSets} (${((workSets / totalSets) * 100).toFixed(1)}%)`);

    // Write output file
    const outputPath = join(__dirname, '../', '../', 'data', 'out', 'lifting-log-sets.json');
    writeFileSync(outputPath, JSON.stringify({ workouts: classifiedWorkouts }, null, 4));

    logger.success(`Classified lifting log saved to: data/out/lifting-log-sets.json`);
}
