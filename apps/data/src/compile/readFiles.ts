import { readdirSync, readFileSync } from 'node:fs';
import path, { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { type ExerciseMetadata, ExerciseMetadataSchema, type Workout, WorkoutSchema } from './types';

export type JsonFile = {
    name: string;
    content: string;
};

export function readTrainHeroicFile(workoutFile: string): JsonFile {
    const filePath = join(__dirname, '../', '../', 'data', 'download', 'trainheroic', 'workouts', workoutFile);
    const content = readFileSync(filePath, 'utf8');
    return {
        name: workoutFile,
        content,
    };
}

export function readTrainHeroicFiles(): JsonFile[] {
    const directoryPath = join(__dirname, '../', '../', 'data', 'download', 'trainheroic', 'workouts');

    const files = readdirSync(directoryPath)
        .filter((file) => path.extname(file) === '.json')
        .sort();

    const allFiles: JsonFile[] = [];
    for (const file of files) {
        const filePath = path.join(directoryPath, file);
        try {
            const content = readFileSync(filePath, 'utf8');
            allFiles.push({
                name: file,
                content,
            });
        } catch (error) {
            logger.error(`Error reading file ${file}: ${error}`);
        }
    }
    return allFiles;
}

export function readLog(workoutLog: string): Workout[] {
    const path = join(__dirname, workoutLog);
    const content = JSON.parse(readFileSync(path, 'utf8'));
    return z
        .object({ workouts: z.array(z.any()) })
        .parse(content)
        .workouts.map((w) => ({
            ...w,
            date: new Date(w.date),
        }))
        .map((w) =>
            WorkoutSchema.parse({
                ...w,
                uuid: uuidv4(),
            })
        );
}

export function readExerciseMap(): Map<string, ExerciseMetadata> {
    const path = join(__dirname, '../', '../', 'data', 'exercise-classified.json');
    const content = JSON.parse(readFileSync(path, 'utf8'));
    const parsed = z.array(ExerciseMetadataSchema).parse(content);
    return new Map(parsed.map((exercise) => [exercise.id.toString(), exercise]));
}
