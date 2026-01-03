import {
    type BaseExercise,
    BaseExerciseSchema,
    type BaseSet,
    BaseSetSchema,
    type BaseWorkout,
    BaseWorkoutSchema,
    type Exercise,
    type ExerciseMetadata,
    ExerciseMetadataSchema,
    ExerciseSchema,
    type RawWorkout,
    RawWorkoutSchema,
    type SetDetail,
    SetSchema,
    type Workout,
    WorkoutSchema,
} from '@leeft/types';
import { z } from 'zod';

export {
    RawWorkoutSchema,
    ExerciseMetadataSchema,
    BaseExerciseSchema,
    BaseSetSchema,
    BaseWorkoutSchema,
    SetSchema,
    ExerciseSchema,
    WorkoutSchema,
    type RawWorkout,
    type ExerciseMetadata,
    type BaseExercise,
    type BaseSet,
    type BaseWorkout,
    type Exercise,
    type SetDetail,
    type Workout,
};

// Effort level breakdown for cardio workouts
export const EffortSchema = z.object({
    minutes: z.number(),
    name: z.enum(['sedentary', 'lightly', 'fairly', 'very']),
});

// Cardio workout schema for Fitbit activities
export const CardioWorkoutSchema = z.object({
    uuid: z.uuid(),
    date: z.date(),
    type: z.enum(['Run', 'Swim', 'Treadmill run', 'HIIT', 'Aerobic Workout', 'Outdoor Bike', 'Rowing machine', 'Elliptical', 'Bike']),
    durationMs: z.number(),
    durationMin: z.number(),
    loggedBy: z.enum(['tracker', 'manual', 'auto_detected']),
    zoneMinutes: z.number().optional(),
    effort: z.array(EffortSchema).optional(),
    calories: z.number().optional(),
    averageHeartRate: z.number().optional(),
    steps: z.number().optional(),
});

// Union type for all workout categories
export const AllWorkoutSchema = z.discriminatedUnion('category', [
    z.object({
        category: z.literal('lift'),
        workout: WorkoutSchema, // Use existing Workout type from types.ts
    }),
    z.object({
        category: z.literal('cardio'),
        workout: CardioWorkoutSchema,
    }),
]);

export type CardioWorkout = z.infer<typeof CardioWorkoutSchema>;
export type AllWorkout = z.infer<typeof AllWorkoutSchema>;
