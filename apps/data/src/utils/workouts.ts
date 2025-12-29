import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { type AllWorkout, type CardioWorkout, CardioWorkoutSchema, type Workout, WorkoutSchema } from '../compile/types';
import { logger } from './logger';

export function loadLiftingWorkouts(): Workout[] {
    logger.loading('Loading lifting workouts...');
    const workoutsLog = join(__dirname, '../../data/out/lifting-log.json');
    const workoutsJson = JSON.parse(readFileSync(workoutsLog, 'utf8'));
    const workouts = z
        .object({ workouts: z.array(z.any()) })
        .parse(workoutsJson)
        .workouts.map((w) => ({
            ...w,
            date: new Date(w.date),
        }))
        .map((w) => WorkoutSchema.parse(w));

    logger.loaded(`Loaded ${workouts.length} lifting workouts`);
    return workouts;
}

export function loadCardioWorkouts(): CardioWorkout[] {
    logger.loading('Loading cardio workouts...');
    const cardioLog = join(__dirname, '../../data/out/cardio-log.json');
    const cardioJson = JSON.parse(readFileSync(cardioLog, 'utf8'));
    const cardioWorkouts = z
        .array(z.any())
        .parse(cardioJson)
        .map((w) => ({
            ...w,
            date: new Date(w.date),
        }))
        .map((w) => CardioWorkoutSchema.parse(w));

    logger.loaded(`Loaded ${cardioWorkouts.length} cardio workouts`);
    return cardioWorkouts;
}

export function loadAllWorkouts(): AllWorkout[] {
    logger.loading('Loading combined workouts (lifting + cardio)...');
    const allWorkoutsPath = join(__dirname, '../../data/out/all-workouts-log.json');
    const allWorkoutsJson = JSON.parse(readFileSync(allWorkoutsPath, 'utf8'));
    const allWorkouts: AllWorkout[] = z
        .array(z.any())
        .parse(allWorkoutsJson)
        .map((w) => ({
            ...w,
            workout: {
                ...w.workout,
                date: new Date(w.workout.date),
            },
        }));

    logger.loaded(`Loaded ${allWorkouts.length} total workouts (lifting + cardio)`);
    return allWorkouts;
}
