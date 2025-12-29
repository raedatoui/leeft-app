import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '../utils/logger';
import { loadCardioWorkouts, loadLiftingWorkouts } from '../utils/workouts';
import { type AllWorkout, AllWorkoutSchema } from './types';

export function main(): void {
    const liftingWorkouts = loadLiftingWorkouts();
    const cardioWorkouts = loadCardioWorkouts();

    logger.combining('Creating combined workout data...');
    const allWorkouts: AllWorkout[] = [
        // Add lifting workouts
        ...liftingWorkouts.map((workout) =>
            AllWorkoutSchema.parse({
                category: 'lift' as const,
                workout,
            })
        ),
        // Add cardio workouts
        ...cardioWorkouts.map((workout) =>
            AllWorkoutSchema.parse({
                category: 'cardio' as const,
                workout,
            })
        ),
    ];

    // Sort by date
    allWorkouts.sort((a, b) => a.workout.date.getTime() - b.workout.date.getTime());

    logger.summary(`Total combined workouts: ${allWorkouts.length}`);
    logger.count(`  - Lifting: ${liftingWorkouts.length}`);
    logger.count(`  - Cardio: ${cardioWorkouts.length}`);

    // Write combined data
    const outputPath = join(__dirname, '../../data/out/all-workouts-log.json');
    writeFileSync(outputPath, JSON.stringify(allWorkouts, null, 2), { flag: 'w' });

    logger.saved(`Combined workouts saved to: ${outputPath}`);

    // Write summary stats
    const stats = {
        total: allWorkouts.length,
        lifting: liftingWorkouts.length,
        cardio: cardioWorkouts.length,
        cardioByType: cardioWorkouts.reduce(
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
