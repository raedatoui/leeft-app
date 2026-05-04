import { logger } from '@leeft/utils';
import { runCLI } from '../utils/cli';
import { downloadWorkouts } from './download';
import { runParseScreenshots } from './parseScreenshot';

async function download() {
    const range = process.argv[2];
    const sessionToken = process.argv[3];

    if (!range || !sessionToken) {
        logger.error('Usage: bun src/trainheroic/index.ts download <range> <session-token>');
        process.exit(1);
    }

    await downloadWorkouts(range, sessionToken);
}

async function parseScreenshots() {
    const date = process.argv[2];
    const imagePaths = process.argv.slice(3);

    if (!date || imagePaths.length === 0) {
        logger.error('Usage: bun src/trainheroic/index.ts parse-screenshots <YYYY-MM-DD> <image1> [image2 ...]');
        process.exit(1);
    }

    await runParseScreenshots(date, imagePaths);
}

const commands = {
    download,
    'parse-screenshots': parseScreenshots,
};

runCLI({
    commands,
    usage: 'bun src/trainheroic/index.ts <command> [args...]',
    examples: [
        'bun src/trainheroic/index.ts download "start=2024-01-01&end=2024-12-31" <session-token>',
        'bun src/trainheroic/index.ts parse-screenshots 2026-05-02 ~/Desktop/workout-1.png ~/Desktop/workout-2.png',
    ],
}).catch((err) => {
    logger.error('Error:');
    logger.error(err);
    process.exit(1);
});
