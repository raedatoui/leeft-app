import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { logger } from '../utils/logger';

export const RawExerciseSchema = z.object({
    id: z.number(),
    slug: z.string(),
    name: z.string(),
    videoUrl: z.string().nullable(),
});

export type RawExercise = z.infer<typeof RawExerciseSchema>;

export const ClassifiedExerciseSchema = z.object({
    id: z.number(),
    slug: z.string(),
    name: z.string(),
    videoUrl: z.string().nullable(),
    category: z.string(),
    primaryMuscleGroup: z.string(),
    equipment: z.array(z.string()),
    description: z.string(),
});

export type ClassifiedExercise = z.infer<typeof ClassifiedExerciseSchema>;

export const RawExercisesFileSchema = z.object({
    exercises: z.array(RawExerciseSchema),
});

export function loadExerciseMetadata(): RawExercise[] {
    const metadataPath = join(__dirname, '../', '../', 'data', 'out', 'exercise-metadata.json');
    const metadataContent = readFileSync(metadataPath, 'utf-8');
    const metadata = RawExercisesFileSchema.parse(JSON.parse(metadataContent));
    return metadata.exercises;
}

export function loadClassifiedExercises(): ClassifiedExercise[] {
    const classifiedPath = join(__dirname, '../', '../', 'data', 'exercise-classified.json');
    try {
        const classifiedContent = readFileSync(classifiedPath, 'utf-8');
        return z.array(ClassifiedExerciseSchema).parse(JSON.parse(classifiedContent));
    } catch (_error) {
        // If file doesn't exist or is empty, return empty array
        return [];
    }
}

export function saveClassifiedExercises(exercises: ClassifiedExercise[]): void {
    const classifiedPath = join(__dirname, '../', '../', 'data', 'exercise-classified.json');
    writeFileSync(classifiedPath, JSON.stringify(exercises, null, 2));
    logger.saved(`${exercises.length} classified exercises to exercise-classified.json`);
}
