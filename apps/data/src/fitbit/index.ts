import { runCLI } from '../utils/cli';
import { logger } from '@leeft/utils';
import { main as auth } from './auth';
import { main as downloadAll } from './downloadAll';
import { main as downloadLatest } from './downloadLatest';
import { main as processLog } from './processLog';

const commands = {
    auth,
    download: downloadLatest,
    'download-all': downloadAll,
    process: processLog,
};

runCLI({
    commands,
    usage: 'bun src/fitbit/index.ts <command> [args...]',
    examples: [
        'bun src/fitbit/index.ts auth         # Authenticate with Fitbit',
        'bun src/fitbit/index.ts download-all # Download all activity data',
        'bun src/fitbit/index.ts download     # Download latest activity data',
        'bun src/fitbit/index.ts process      # Download latest activity data',
    ],
}).catch((err) => {
    logger.error('Error:');
    logger.error(err);
    process.exit(1);
});
