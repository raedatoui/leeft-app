import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '../utils/logger';
import { loadLiftingWorkouts } from '../utils/workouts';
import { addWorkoutsToCycles, loadCycles } from './utils';

export function main() {
    const workouts = loadLiftingWorkouts();
    const cycles = loadCycles();

    logger.combining('Adding lifting workouts to cycles...');
    const workoutsForMatching = workouts.map((w) => ({
        uuid: w.uuid,
        date: w.date,
    }));
    addWorkoutsToCycles(workoutsForMatching, cycles);

    const outputPath = join(__dirname, '../', '../', 'data', 'out', 'cycles-lifting.json');
    writeFileSync(outputPath, JSON.stringify(cycles, null, 2), { flag: 'w' });

    logger.saved(`Combined lifting workouts and cycles saved to: ${outputPath}`);
    logger.count(`Total cycles: ${cycles.length}`);
    logger.count(`Total lifting workouts: ${workouts.length}`);
}
