import { readExerciseMap, readLog } from '../compile/readFiles';
import { logger } from '@leeft/utils';
import { analyze } from './utils';

function analyzeLiftingLog(logFile = '../../data/out/lifting-log.json'): void {
    const workouts = readLog(logFile);
    const exerciseMap = readExerciseMap();
    const workoutSummaries = workouts.map((w) => ({
        date: w.date,
        exerciseCount: w.exercises.length,
        uuid: w.uuid,
        filename: '',
        exercises: w.exercises.map((e) => {
            if (exerciseMap.get(e.exerciseId.toString()) === undefined) {
                logger.warning(`Missing exercise:, ${e.exerciseId}`);
            }
            return exerciseMap.get(e.exerciseId.toString())?.name ?? 'Unknown';
        }),
    }));
    analyze(workoutSummaries);
}

export async function main() {
    const logFile = process.argv[2];
    analyzeLiftingLog(logFile);
}
