import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path, { join } from 'node:path';
import { defaultStartedAt, logger } from '@leeft/utils';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { type BaseWorkout, BaseWorkoutSchema, type ExerciseMetadata, ExerciseMetadataSchema } from './types';

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

export function readLog(workoutLog: string): BaseWorkout[] {
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
            BaseWorkoutSchema.parse({
                ...w,
                uuid: uuidv4(),
                // Legacy Google logs carry only a pseudo time; use the noon-ET default.
                startedAt: defaultStartedAt(w.date),
            })
        );
}

export function readFirestoreLog(): BaseWorkout[] {
    const filePath = join(__dirname, '../', '../', 'data', 'download', 'firestore', 'lifting-workouts.json');
    if (!existsSync(filePath)) {
        logger.warning(`No Firestore log at ${filePath} — run \`bun firestore:download\`. Skipping app-logged workouts.`);
        return [];
    }
    const content = JSON.parse(readFileSync(filePath, 'utf8'));
    return z
        .object({ workouts: z.array(z.any()) })
        .parse(content)
        .workouts.map((w) =>
            // Unlike readLog, the uuid comes from the doc and is never re-minted — the app keeps it
            // stable across re-saves so downstream artifacts don't see a re-save as a new workout.
            // `date` is a strict z.date(); `startedAt` is z.coerce.date() and takes the ISO string.
            // A document written before the unit pickers carries no `units`; the schema defaults it.
            BaseWorkoutSchema.parse({ ...w, date: new Date(w.date) })
        );
}

export function readExerciseMap(): Map<string, ExerciseMetadata> {
    const path = join(__dirname, '../', '../', 'data', 'exercise-classified.json');
    const content = JSON.parse(readFileSync(path, 'utf8'));
    const parsed = z.array(ExerciseMetadataSchema).parse(content);
    return new Map(parsed.map((exercise) => [exercise.id.toString(), exercise]));
}
