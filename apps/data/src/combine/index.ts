import { logger } from '@leeft/utils';
import { runCLI } from '../utils/cli';
import { main as combineAllMain } from './combineAll';
import { main as combineLiftingMain } from './combineLifting';

const commands = {
    'combine-lifting': combineLiftingMain,
    'combine-all': combineAllMain,
};

export { commands };

runCLI({
    commands,
    usage: 'bun src/combine/index.ts <command>',
    examples: [
        'bun src/combine/index.ts combine-lifting  # Combine lifting workouts with cycles',
        'bun src/combine/index.ts combine-all      # Combine all workouts (lifting + cardio) with cycles',
    ],
}).catch((err) => {
    logger.error('Error:');
    logger.error(err);
    process.exit(1);
});
