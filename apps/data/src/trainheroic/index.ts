import { logger } from '@leeft/utils';
import { runCLI } from '../utils/cli';
import { downloadWorkouts } from './download';

async function download() {
    const range = process.argv[2];
    const sessionToken = process.argv[3];

    if (!range || !sessionToken) {
        logger.error('Usage: bun src/trainheroic/index.ts download <range> <session-token>');
        process.exit(1);
    }

    await downloadWorkouts(range, sessionToken);
}

const commands = {
    download,
};

runCLI({
    commands,
    usage: 'bun src/trainheroic/index.ts <command> [args...]',
    examples: ['bun src/trainheroic/index.ts download "start=2024-01-01&end=2024-12-31" <session-token>'],
}).catch((err) => {
    logger.error('Error:');
    logger.error(err);
    process.exit(1);
});
