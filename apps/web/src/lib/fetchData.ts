import { z } from 'zod';
import { dateFromTitle } from '@/lib/utils';
import {
    type CardioWorkout,
    CardioWorkoutSchema,
    type Cycle,
    CycleSchema,
    type ExerciseMap,
    ExerciseMetadataSchema,
    type Workout,
    WorkoutSchema,
} from '@/types';

const CDN_BASE_URL = process.env.NEXT_PUBLIC_CDN_URL;
const TIMESTAMP = process.env.NEXT_PUBLIC_TIMESTAMP;

export async function fetchWorkouts(): Promise<Workout[]> {
    const response = await fetch(`${CDN_BASE_URL}/lifting-log_${TIMESTAMP}.json.gz`, {
        cache: 'no-cache', // or 'force-cache' or 'reload' depending on needs
    });
    const data = await response.json();
    const { workouts } = z
        .object({
            workouts: z.array(z.object({ date: z.string(), title: z.string() }).and(z.record(z.string(), z.unknown()))),
        })
        .parse(data);
    console.log(workouts.length);
    return workouts.map((w) => {
        return WorkoutSchema.parse({
            ...w,
            date: dateFromTitle(w.title),
        });
    });
}

export async function fetchExerciseMap(): Promise<ExerciseMap> {
    const response = await fetch(`${CDN_BASE_URL}/exercise-classified_${TIMESTAMP}.json.gz`, {
        cache: 'no-cache', // or 'force-cache' or 'reload' depending on needs
    });
    const data = await response.json();
    return new Map(
        data.map((exercise: unknown) => {
            const ex = ExerciseMetadataSchema.parse(exercise);
            return [ex.id.toString(), ex];
        })
    );
}

export async function fetchCycles(): Promise<Cycle[]> {
    const response = await fetch(`${CDN_BASE_URL}/cycles-lifting_${TIMESTAMP}.json.gz`, {
        cache: 'no-cache', // or 'force-cache' or 'reload' depending on needs
    });
    const data = await response.json();
    return z.array(CycleSchema).parse(data);
}

export async function fetchCardioWorkouts(): Promise<CardioWorkout[]> {
    const response = await fetch(`${CDN_BASE_URL}/cardio-log_${TIMESTAMP}.json.gz`, {
        cache: 'no-cache',
    });
    const data = await response.json();
    return z
        .array(z.object({ date: z.string() }).and(z.record(z.string(), z.unknown())))
        .parse(data)
        .map((w) => CardioWorkoutSchema.parse({ ...w, date: new Date(w.date) }));
}
