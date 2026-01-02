import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import type { AllWorkout } from '../compile/types';
import { isWithinInterval, normalizeToMidnightUTC } from '@leeft/utils';
import { logger } from '@leeft/utils';
import { type Cycle, CycleSchema } from './types';

export function addWorkoutsToCycles(workouts: { uuid: string; date: Date }[], cycles: Cycle[]): void {
    workouts.forEach((workout) => {
        // Ensure workout date is normalized
        const normalizedWorkoutDate = normalizeToMidnightUTC(workout.date);

        cycles.forEach((cycle) => {
            const [startDate, endDate] = cycle.dates.map(normalizeToMidnightUTC);

            if (isWithinInterval(normalizedWorkoutDate, startDate, endDate)) {
                if (!cycle.workouts) {
                    cycle.workouts = [];
                }
                cycle.workouts.push(workout.uuid);
            }
        });
    });
}

export function loadAllWorkouts(): AllWorkout[] {
    logger.loading('Loading combined workouts (lifting + cardio)...');
    const allWorkoutsPath = join(__dirname, '../', '../', 'data', 'out', 'all-workouts-combined.json');
    const allWorkoutsJson = JSON.parse(readFileSync(allWorkoutsPath, 'utf8'));
    const allWorkouts: AllWorkout[] = z.array(z.any()).parse(allWorkoutsJson);

    logger.loaded(`Loaded ${allWorkouts.length} total workouts (lifting + cardio)`);
    return allWorkouts;
}

export function loadCycles(): Cycle[] {
    logger.loading('Loading cycles...');
    const cyclesLog = join(__dirname, '../', '../', 'data', 'in', 'cycles.json');
    const cyclesJson = JSON.parse(readFileSync(cyclesLog, 'utf8'));
    const rr = z
        .object({ cycles: z.array(z.any()) })
        .parse(cyclesJson)
        .cycles.map((c) => ({
            uuid: c.uuid || uuidv4(),
            name: c.name,
            location: c.location,
            type: c.type,
            note: c.note,
            workouts: [],
            dates: z
                .array(z.string())
                .parse(c.dates)
                .map((d) => new Date(d)),
        }));
    const cycles = z.array(CycleSchema).parse(rr);

    logger.loaded(`Loaded ${cycles.length} cycles`);
    return cycles;
}
