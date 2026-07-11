import { z } from 'zod';
import { dateFromTitle } from '@/lib/utils';
import {
    type CardioWorkout,
    CardioWorkoutSchema,
    type Cycle,
    CycleSchema,
    type ExerciseMap,
    ExerciseMetadataSchema,
    type MobilityMovement,
    MobilityMovementSchema,
    type Workout,
    WorkoutSchema,
} from '@/types';

const CDN_BASE_URL = process.env.NEXT_PUBLIC_CDN_URL;
const TIMESTAMP = process.env.NEXT_PUBLIC_TIMESTAMP ?? '';

// Resolves the current data timestamp from the mutable latest.json pointer on GCS,
// falling back to the build-time env timestamp (e.g. offline, pointer not yet uploaded).
export async function fetchLatestTimestamp(): Promise<string> {
    try {
        const response = await fetch(`${CDN_BASE_URL}/latest.json`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`latest.json fetch failed: ${response.status}`);
        const { timestamp } = z.object({ timestamp: z.string() }).parse(await response.json());
        return timestamp;
    } catch {
        return TIMESTAMP;
    }
}

export async function fetchWorkouts(timestamp: string = TIMESTAMP): Promise<Workout[]> {
    const response = await fetch(`${CDN_BASE_URL}/lifting-log_${timestamp}.json.gz`, {
        cache: 'no-cache', // or 'force-cache' or 'reload' depending on needs
    });
    if (!response.ok) throw new Error(`lifting-log_${timestamp} fetch failed: ${response.status}`);
    const data = await response.json();
    const { workouts } = z
        .object({
            workouts: z.array(z.object({ date: z.string(), title: z.string() }).and(z.record(z.string(), z.unknown()))),
        })
        .parse(data);
    return workouts.map((w) => {
        return WorkoutSchema.parse({
            ...w,
            date: dateFromTitle(w.title),
        });
    });
}

export async function fetchExerciseMap(timestamp: string = TIMESTAMP): Promise<ExerciseMap> {
    const response = await fetch(`${CDN_BASE_URL}/exercise-classified_${timestamp}.json.gz`, {
        cache: 'no-cache', // or 'force-cache' or 'reload' depending on needs
    });
    if (!response.ok) throw new Error(`exercise-classified_${timestamp} fetch failed: ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error(`exercise-classified_${timestamp} payload is not an array`);
    return new Map(
        data.map((exercise: unknown) => {
            const ex = ExerciseMetadataSchema.parse(exercise);
            return [ex.id.toString(), ex];
        })
    );
}

export async function fetchCycles(timestamp: string = TIMESTAMP): Promise<Cycle[]> {
    const response = await fetch(`${CDN_BASE_URL}/cycles-lifting_${timestamp}.json.gz`, {
        cache: 'no-cache', // or 'force-cache' or 'reload' depending on needs
    });
    if (!response.ok) throw new Error(`cycles-lifting_${timestamp} fetch failed: ${response.status}`);
    const data = await response.json();
    return z.array(CycleSchema).parse(data);
}

export async function fetchMobilityMovements(timestamp: string = TIMESTAMP): Promise<MobilityMovement[]> {
    const response = await fetch(`${CDN_BASE_URL}/mobility-movements_${timestamp}.json.gz`, {
        cache: 'no-cache',
    });
    if (!response.ok) throw new Error(`mobility-movements_${timestamp} fetch failed: ${response.status}`);
    const data = await response.json();
    return z
        .array(MobilityMovementSchema)
        .parse(data)
        .filter((m) => m.status === 'active');
}

export async function fetchCardioWorkouts(timestamp: string = TIMESTAMP): Promise<CardioWorkout[]> {
    const response = await fetch(`${CDN_BASE_URL}/cardio-log_${timestamp}.json.gz`, {
        cache: 'no-cache',
    });
    if (!response.ok) throw new Error(`cardio-log_${timestamp} fetch failed: ${response.status}`);
    const data = await response.json();
    return z
        .array(z.object({ date: z.string() }).and(z.record(z.string(), z.unknown())))
        .parse(data)
        .map((w) => CardioWorkoutSchema.parse({ ...w, date: new Date(w.date) }));
}
