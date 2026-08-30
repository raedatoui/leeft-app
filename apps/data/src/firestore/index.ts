import { logger } from '@leeft/utils';
import { runCLI } from '../utils/cli';
import { backfillLiftingWorkouts } from './backfill';
import { downloadLiftingWorkouts } from './download';
import { migrateReadinessMood } from './migrateReadinessMood';

const commands = {
    download: downloadLiftingWorkouts,
    backfill: backfillLiftingWorkouts,
    'migrate-mood': migrateReadinessMood,
};

runCLI({
    commands,
    name: 'firestore',
    usage: 'bun src/firestore/index.ts <command> [--overwrite]',
    examples: [
        'bun src/firestore/index.ts download',
        'bun src/firestore/index.ts backfill',
        'bun src/firestore/index.ts backfill --overwrite',
        'bun src/firestore/index.ts migrate-mood',
    ],
}).catch((err) => {
    logger.error('Error:');
    logger.error(err);
    process.exit(1);
});
