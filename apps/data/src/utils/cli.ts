import { logger } from '@leeft/utils';

export interface CommandMap {
    [key: string]: () => Promise<void> | void;
}

export interface CLIOptions {
    commands: CommandMap;
    /** Prefix for the step banner title, for CLIs whose command names alone are ambiguous ('download' -> 'Firestore download') */
    name?: string;
    usage?: string;
    examples?: string[];
}

const BLUE = '\x1b[0;34m';
const GREEN = '\x1b[0;32m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const NC = '\x1b[0m';
const RULE = '─'.repeat(62);

function stepTitle(name: string | undefined, command: string): string {
    const words = `${name ? `${name} ` : ''}${command}`.replace(/-/g, ' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
}

function fmtTime(ms: number): string {
    const s = Math.round(ms / 1000);
    return s >= 60 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`;
}

export async function runCLI({ commands, name, usage, examples }: CLIOptions) {
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

    // refresh.sh / pipeline.sh already frame each step — don't print a second banner under them
    const framed = !!process.env.LEEFT_STEP_FRAMED;
    const title = stepTitle(name, command);
    const start = Date.now();

    if (!framed) {
        console.log('');
        console.log(`${BLUE}${BOLD}▶  ${title}${NC}`);
        console.log(`${DIM}${RULE}${NC}`);
    }

    await commands[command]();

    if (!framed) {
        console.log(`${GREEN}✓  ${title}${NC} ${DIM}· ${fmtTime(Date.now() - start)}${NC}`);
    }
}
