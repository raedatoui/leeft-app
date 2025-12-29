import { runCLI } from '../utils/cli';
import { logger } from '../utils/logger';
import { main as claudeAll } from './claudeAllAndSave';
import { main as claudeTest } from './claudeSingle';
import { main as claudeSingle } from './claudeSingleAndSave';
import { main as openaiTest } from './openaiSingle';

const commands = {
    'claude-all': claudeAll,
    'claude-single': claudeSingle,
    'claude-test': claudeTest,
    'openai-test': openaiTest,
};

runCLI({
    commands,
    usage: 'bun src/classify/index.ts <command> [args...]',
    examples: [
        'bun src/classify/index.ts claude-all',
        'bun src/classify/index.ts claude-single 2974',
        'bun src/classify/index.ts claude-test "Exercise Name"',
        'bun src/classify/index.ts openai-test "Exercise Name"',
    ],
}).catch((err) => {
    logger.error('Error:');
    logger.error(err);
    process.exit(1);
});
