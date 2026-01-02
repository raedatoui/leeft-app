import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '@leeft/utils';
import { loadAllWorkouts } from '../utils/workouts';
import { addWorkoutsToCycles, loadCycles } from './utils';

export function main() {
    const allWorkouts = loadAllWorkouts();
    const cycles = loadCycles();

    logger.combining('Adding all workouts (lifting + cardio) to cycles...');

    // Extract just uuid and date for matching
    const workoutsForMatching = allWorkouts.map((w) => ({
        uuid: w.workout.uuid,
        date: w.workout.date,
    }));

    addWorkoutsToCycles(workoutsForMatching, cycles);

    const outputPath = join(__dirname, '../', '../', 'data', 'out', 'cycles-all-workouts.json');
    writeFileSync(outputPath, JSON.stringify(cycles, null, 2), { flag: 'w' });

    logger.saved(`Combined all workouts and cycles saved to: ${outputPath}`);
    logger.count(`Total cycles: ${cycles.length}`);

    // Count lifting vs cardio from the combined data
    const liftingCount = allWorkouts.filter((w) => w.category === 'lift').length;
    const cardioCount = allWorkouts.filter((w) => w.category === 'cardio').length;
    logger.count(`Total workouts: ${allWorkouts.length} (${liftingCount} lifting + ${cardioCount} cardio)`);
}
