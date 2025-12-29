import { logger } from '../utils/logger';
import { main as combineAllMain } from './combineAll';
import { main as combineLiftingMain } from './combineLifting';

const commands = {
    'combine-lifting': combineLiftingMain,
    'combine-all': combineAllMain,
};

export { commands };

async function main() {
    const command = process.argv[2];

    if (!command || !commands[command as keyof typeof commands]) {
        logger.error(`Available commands: ${Object.keys(commands).join(', ')}`);
        logger.error('Usage: bun src/combine/index.ts <command>');
        logger.info('Examples:');
        logger.info('  bun src/combine/index.ts combine-lifting  # Combine lifting workouts with cycles');
        logger.info('  bun src/combine/index.ts combine-all      # Combine all workouts (lifting + cardio) with cycles');
        process.exit(1);
    }

    // Remove the command from argv so individual functions get their expected args
    process.argv.splice(2, 1);

    await commands[command as keyof typeof commands]();
}

// Only run main if this file is executed directly
if (require.main === module) {
    main().catch((err) => {
        logger.error(`Error: ${err}`);
        process.exit(1);
    });
}
