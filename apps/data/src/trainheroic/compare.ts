import { difference } from 'lodash';
import { readTrainHeroicFiles } from '../compile/readFiles';
import { logger } from '../utils/logger';

export function compare() {
    const files = readTrainHeroicFiles();

    for (const file of Object.entries(files)) {
        const data = JSON.parse(file[1].content);
        const d1 = data.saved_workout.workoutSets;
        const d2 = data.workout.workoutSets;
        logger.info(`Comparing: ${file[1].name}`);
        logger.info(JSON.stringify(difference(d1, d2)));
        logger.info('-------------------');
    }
}

async function main() {
    compare();
}

main().catch((err) => {
    logger.error(`Error: ${err}`);
    process.exit(1);
});
