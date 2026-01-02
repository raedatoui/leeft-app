import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '@leeft/utils';
import { parseTrainHeroicWorkout } from './extractDay';

export function main(): void {
    const file = readFileSync(join(__dirname, '../', '../', 'data', 'download', 'trainheroic', 'workouts', 'workout-105950067.json'), 'utf8');
    const extractedExercises = parseTrainHeroicWorkout(JSON.parse(file));
    logger.info(JSON.stringify(extractedExercises, null, 2));
}
