import { logger } from '@leeft/utils';
import { runCLI } from '../utils/cli';
import { main as lifting } from './liftingLog';
import { main as print } from './prettyPrint';
import { main as trainheroic } from './trainheroicLogs';

const commands = {
    lifting,
    print,
    trainheroic,
};

runCLI({
    commands,
    usage: 'bun src/analyze/index.ts <command> [args...]',
    examples: ['bun src/analyze/index.ts lifting', 'bun src/analyze/index.ts print', 'bun src/analyze/index.ts trainheroic'],
}).catch((err) => {
    logger.error('Error:');
    logger.error(err);
    process.exit(1);
});
