import { logger } from '@leeft/utils';
import { runCLI } from '../utils/cli';
import { downloadLiftingWorkouts } from './download';

const commands = {
    download: downloadLiftingWorkouts,
};

runCLI({
    commands,
    usage: 'bun src/firestore/index.ts <command>',
    examples: ['bun src/firestore/index.ts download'],
}).catch((err) => {
    logger.error('Error:');
    logger.error(err);
    process.exit(1);
});
