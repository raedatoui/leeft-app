import { logger } from '@leeft/utils';
import { runCLI } from '../utils/cli';
import { full as exercisesFull, fuzzy as exercisesFuzzy, semantic as exercisesSemantic } from './exerciseDuplicates';
import { main as lifting } from './liftingLog';
import { main as print } from './prettyPrint';
import { main as trainheroic } from './trainheroicLogs';
import { main as workouts } from './workoutDuplicates';

const commands = {
    lifting,
    print,
    trainheroic,
    workouts,
    'exercises-fuzzy': exercisesFuzzy,
    'exercises-full': exercisesFull,
    'exercises-semantic': exercisesSemantic,
};

runCLI({
    commands,
    usage: 'bun src/analyze/index.ts <command> [args...]',
    examples: [
        'bun src/analyze/index.ts lifting',
        'bun src/analyze/index.ts trainheroic',
        'bun src/analyze/index.ts workouts',
        'bun src/analyze/index.ts exercises-fuzzy',
        'bun src/analyze/index.ts exercises-full',
        'bun src/analyze/index.ts exercises-semantic',
    ],
}).catch((err) => {
    logger.error('Error:');
    logger.error(err);
    process.exit(1);
});
