// Test cases

import { logger } from '@leeft/utils';
import { parseAbr } from './extractDay';

const testCases = [
    {
        input: '4 x 5 @ 95, 135, 155, 155 lb',
        expected: [
            { reps: 5, weight: 95 },
            { reps: 5, weight: 135 },
            { reps: 5, weight: 155 },
            { reps: 5, weight: 155 },
        ],
    },
    {
        input: '5, 5, 3, 3, 5, 5 @ 135, 185, 225, 255, 275, 275 lb',
        expected: [
            { reps: 5, weight: 135 },
            { reps: 5, weight: 185 },
            { reps: 3, weight: 225 },
            { reps: 3, weight: 255 },
            { reps: 5, weight: 275 },
            { reps: 5, weight: 275 },
        ],
    },
    {
        input: '3 x 10 @ 182 lb',
        expected: [
            { reps: 10, weight: 182 },
            { reps: 10, weight: 182 },
            { reps: 10, weight: 182 },
        ],
    },
    {
        input: '1 x 11:00 @ 135 lb',
        expected: [{ time: '11:00', weight: 135 }],
    },
    {
        input: '3 x 1:00 ',
        expected: [
            { time: '1:00', weight: 0 },
            { time: '1:00', weight: 0 },
            { time: '1:00', weight: 0 },
        ],
    },
];

export function main(): void {
    testCases.forEach(({ input, expected }, index) => {
        const result = parseAbr(input);
        const isTestPassed = JSON.stringify(result) === JSON.stringify(expected);

        if (isTestPassed) {
            logger.success(`Test ${index + 1} passed.`);
        } else {
            logger.error(`Test ${index + 1} failed: Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);
        }
    });
}
