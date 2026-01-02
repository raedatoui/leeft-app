import { randomUUID } from 'node:crypto';
import { readTrainHeroicFiles } from '../compile/readFiles';
import { logger } from '@leeft/utils';
import { analyze, WorkoutFileSchema, type WorkoutSummary } from './utils';

export async function main() {
    const workouts: WorkoutSummary[] = [];
    const files = readTrainHeroicFiles();
    files.forEach((file) => {
        try {
            const data = JSON.parse(file.content);
            const workout = WorkoutFileSchema.parse(data);

            const exercises = workout.workout.workoutSets.flatMap((set) => set.workoutSetExercises).map((ex) => ex.title);

            workouts.push({
                date: new Date(workout.workout.title),
                uuid: randomUUID(), // workout.workout.id,
                exerciseCount: exercises.length,
                filename: file.name,
                exercises,
            });
        } catch (error) {
            logger.error(`Error processing ${file.name}:`);
            logger.error(error);
        }
    });

    analyze(workouts);
}
