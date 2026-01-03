import { logger } from '@leeft/utils';
import { runCLI } from '../utils/cli';
import { main as compileAllMain } from './compileAllWorkouts';
import { main as compileCardio } from './compileCardio';
import { main as compileLifting } from './compileLifting';
import { main as testMain } from './test';
import { main as testAbrMain } from './testAbr';
import { main as testDayMain } from './testDay';

const commands = {
    'compile-lifting': compileLifting,
    'compile-all': compileAllMain,
    'compile-cardio': compileCardio,
    test: testMain,
    'test-abr': testAbrMain,
    'test-day': testDayMain,
};

runCLI({
    commands,
    usage: 'bun src/analyze/index.ts <command> [args...]',
    examples: [
        'bun src/compile/index.ts compile-lifting  # Compile lifting workout data',
        'bun src/compile/index.ts compile-all      # Combine all workouts',
        'bun src/compile/index.ts compile-cardio   # Compile cardio workouts (runs/swims)',
        'bun src/compile/index.ts test <file>      # Test single workout file',
        'bun src/compile/index.ts test-abr         # Test abbreviation parsing',
        'bun src/compile/index.ts test-day         # Test day extraction',
    ],
}).catch((err) => {
    logger.error('Error:');
    logger.error(err);
    process.exit(1);
});
