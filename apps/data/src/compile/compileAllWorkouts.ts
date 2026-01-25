import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '@leeft/utils';
import { loadCardioWorkouts, loadCardioWorkoutsStrict, loadLiftingWorkouts } from '../utils/workouts';
import { type AllWorkout, AllWorkoutSchema } from './types';

export function main(): void {
    const liftingWorkouts = loadLiftingWorkouts();
    const cardioWorkouts = loadCardioWorkouts();
    const cardioWorkoutsStrict = loadCardioWorkoutsStrict();

    // === PERMISSIVE COMBINED LOG ===
    logger.combining('Creating combined workout data (permissive)...');
    const allWorkouts: AllWorkout[] = [
        ...liftingWorkouts.map((workout) =>
            AllWorkoutSchema.parse({
                category: 'lift' as const,
                workout,
            })
        ),
        ...cardioWorkouts.map((workout) =>
            AllWorkoutSchema.parse({
                category: 'cardio' as const,
                workout,
            })
        ),
    ];
    allWorkouts.sort((a, b) => a.workout.date.getTime() - b.workout.date.getTime());

    logger.summary(`Permissive - Total: ${allWorkouts.length}`);
    logger.count(`  - Lifting: ${liftingWorkouts.length}`);
    logger.count(`  - Cardio: ${cardioWorkouts.length}`);

    const outputPath = join(__dirname, '../../data/out/all-workouts-log.json');
    writeFileSync(outputPath, JSON.stringify(allWorkouts, null, 2), { flag: 'w' });
    logger.saved(`Combined workouts (permissive) saved to: ${outputPath}`);

    // === STRICT COMBINED LOG ===
    logger.combining('Creating combined workout data (strict)...');
    const allWorkoutsStrict: AllWorkout[] = [
        ...liftingWorkouts.map((workout) =>
            AllWorkoutSchema.parse({
                category: 'lift' as const,
                workout,
            })
        ),
        ...cardioWorkoutsStrict.map((workout) =>
            AllWorkoutSchema.parse({
                category: 'cardio' as const,
                workout,
            })
        ),
    ];
    allWorkoutsStrict.sort((a, b) => a.workout.date.getTime() - b.workout.date.getTime());

    logger.summary(`Strict - Total: ${allWorkoutsStrict.length}`);
    logger.count(`  - Lifting: ${liftingWorkouts.length}`);
    logger.count(`  - Cardio (strict): ${cardioWorkoutsStrict.length}`);

    const strictOutputPath = join(__dirname, '../../data/out/all-workouts-log-strict.json');
    writeFileSync(strictOutputPath, JSON.stringify(allWorkoutsStrict, null, 2), { flag: 'w' });
    logger.saved(`Combined workouts (strict) saved to: ${strictOutputPath}`);

    // === STATS (permissive for backward compatibility) ===
    const stats = {
        total: allWorkouts.length,
        lifting: liftingWorkouts.length,
        cardio: cardioWorkouts.length,
        cardioStrict: cardioWorkoutsStrict.length,
        cardioByType: cardioWorkouts.reduce(
            (acc, workout) => {
                acc[workout.type] = (acc[workout.type] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>
        ),
        cardioByTypeStrict: cardioWorkoutsStrict.reduce(
            (acc, workout) => {
                acc[workout.type] = (acc[workout.type] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>
        ),
        dateRange: {
            earliest: allWorkouts[0]?.workout.date,
            latest: allWorkouts[allWorkouts.length - 1]?.workout.date,
        },
    };

    const statsPath = join(__dirname, '../../data/out/all-workout-stats.json');
    writeFileSync(statsPath, JSON.stringify(stats, null, 2), { flag: 'w' });
    logger.saved(`Workout statistics saved to: ${statsPath}`);
}
