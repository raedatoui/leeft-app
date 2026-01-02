import { logger } from '@leeft/utils';
import { parseTrainHeroicWorkout } from './extractDay';
import { readTrainHeroicFile } from './readFiles';
import { type ExerciseMetadata, ExerciseMetadataSchema, RawWorkoutSchema } from './types';

const mapOfRawDate = new Map<string, boolean>();
const mapOfWorkoutTitle = new Map<string, boolean>();
const exerciseMap = new Map<number, ExerciseMetadata>();

function testCompileDay(workoutFile: string): void {
    const testFile = readTrainHeroicFile(workoutFile);

    try {
        const jsonData = JSON.parse(testFile.content);
        const raw = RawWorkoutSchema.parse(jsonData);

        raw.saved_workout.workoutSets.forEach((ws) => {
            const ex = ws.workoutSetExercises[0];
            if (!exerciseMap.has(ex.exercise_id)) {
                const metadata = ExerciseMetadataSchema.parse({
                    id: ex.exercise_id,
                    slug: ex.exercise_title.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
                    name: ex.exercise_title,
                    videoUrl: ex.video_url ?? null,
                    category: '',
                    primaryMuscleGroup: '',
                    equipment: [],
                });
                exerciseMap.set(ex.exercise_id, metadata);
            }
        });

        const workout = parseTrainHeroicWorkout(jsonData);

        if (mapOfRawDate.has(raw.date)) {
            logger.warning(`Duplicate workout found for date ${raw.date} in file ${testFile.name}, skipping`);
        }
        if (mapOfWorkoutTitle.has(workout.title)) {
            logger.warning(`Duplicate workout found for date ${workout.title} in file ${testFile.name}, skipping`);
        }
    } catch (error) {
        logger.error(`Error processing file ${testFile.name}: ${error}`);
    }
}

export function main(): void {
    const workoutFile = process.argv[2];
    if (!workoutFile) {
        logger.error('Usage: compile:test <workout-file>');
        process.exit(1);
    }
    testCompileDay(workoutFile);
}
