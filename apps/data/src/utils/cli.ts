import { logger } from './logger';

export interface CommandMap {
    [key: string]: () => Promise<void> | void;
}

export interface CLIOptions {
    commands: CommandMap;
    usage?: string;
    examples?: string[];
}

export async function runCLI({ commands, usage, examples }: CLIOptions) {
    const command = process.argv[2];

    if (!command || !commands[command]) {
        logger.error(`Available commands: ${Object.keys(commands).join(', ')}`);
        if (usage) {
            logger.error(`Usage: ${usage}`);
        }
        if (examples?.length) {
            logger.error('Examples:');
            examples.forEach((example) => {
                logger.error(`  ${example}`);
            });
        }
        process.exit(1);
    }

    // Remove the command from argv so individual functions get their expected args
    process.argv.splice(2, 1);

    await commands[command]();
}
