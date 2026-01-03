import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '@leeft/utils';
import { classifyAllWorkouts } from './classifySets';
import { parseTrainHeroicWorkout } from './extractDay';
import { readLog, readTrainHeroicFiles } from './readFiles';
import { type BaseWorkout, type ExerciseMetadata, ExerciseMetadataSchema, RawWorkoutSchema } from './types';

const mapOfRawDate = new Map<string, boolean>();
const mapOfWorkoutTitle = new Map<string, boolean>();
const exerciseMap = new Map<number, ExerciseMetadata>();

function mergeWorkouts(googleWorkouts: BaseWorkout[], trainHeroicWorkouts: BaseWorkout[]): BaseWorkout[] {
    const mergedWorkouts = [...trainHeroicWorkouts];

    for (const workout of googleWorkouts) {
        if (mapOfWorkoutTitle.has(workout.title)) {
            logger.warning(`Skipping google duplicate workout title: ${workout.title}`);
            continue;
        }

        mapOfWorkoutTitle.set(workout.title, true);
        mapOfRawDate.set(workout.date.toString(), true);
        mergedWorkouts.push(workout);
    }

    return mergedWorkouts.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function compileTrainHeroicWorkouts(): BaseWorkout[] {
    const files = readTrainHeroicFiles();
    const workouts: BaseWorkout[] = [];
    for (const file of files) {
        try {
            const jsonData = JSON.parse(file.content);
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
                logger.warning(`Duplicate workout found for date ${raw.date} in file ${file.name}, skipping`);
                continue;
            }
            if (mapOfWorkoutTitle.has(workout.title)) {
                logger.warning(`Duplicate workout found for date ${workout.title} in file ${file.name}, skipping`);
                continue;
            }

            if (workout.exercises.length > 0) {
                workouts.push(workout);
                mapOfRawDate.set(raw.date, true);
                mapOfWorkoutTitle.set(workout.title, true);
            } else logger.warning(`No exercises found in ${file.name}`);
        } catch (error) {
            logger.error(`Error processing file ${file.name}: ${error}`);
        }
    }
    return workouts;
}

export function main(): void {
    const trainHeroicWorkouts = compileTrainHeroicWorkouts();
    const googleWorkouts = readLog('../../data/download/google/google-log.json');
    const google2020Workouts = readLog('../../data/download/google/lifting-log-2020.json');
    const allWorkouts = google2020Workouts.concat(mergeWorkouts(googleWorkouts, trainHeroicWorkouts));
    // filtering the exercises that have time in them
    // return allExercises
    //     .map((w) => ({
    //         ...w,
    //         exercises: w.exercises.filter((e) => !e.sets.some((set) => 'time' in set)),
    //     }))
    //     .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // only train heroic will have the canonical list of exercises, its ok to keep rewriting the file.
    // if something is new, it will need to be classified without running the entire classification.
    const exerciseList = Array.from(exerciseMap.values()).sort((a, b) => a.id - b.id);
    exerciseList.push(
        {
            id: 99000001,
            name: 'Bird Dogs Per Leg',
            slug: 'bird_dogs_per_leg',
            videoUrl: '',
            category: 'custom',
            primaryMuscleGroup: '',
            equipment: [],
        },
        {
            id: 99000002,
            name: 'Dead Bugs',
            slug: 'dead_bugs',
            videoUrl: '',
            category: 'custom',
            primaryMuscleGroup: '',
            equipment: [],
        },
        {
            id: 99000003,
            name: 'Db Russian Twists',
            slug: 'db_russian_twists',
            videoUrl: '',
            category: 'custom',
            primaryMuscleGroup: '',
            equipment: [],
        }
    );
    const metadataFilename = join(__dirname, '../', '../', 'data', 'out', 'exercise-metadata.json');
    writeFileSync(metadataFilename, JSON.stringify({ exercises: exerciseList }, null, 2));

    // Classify Sets and Compute Work Volume
    const classifiedWorkouts = classifyAllWorkouts(allWorkouts);

    const filename = join(__dirname, '../', '../', 'data', 'out', 'lifting-log.json');
    writeFileSync(filename, JSON.stringify({ workouts: classifiedWorkouts }, null, 2));
    logger.success('Lifting log generated in directory: data/out/lifting-log.json');
}
