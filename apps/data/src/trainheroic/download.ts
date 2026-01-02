import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '@leeft/utils';
import { type WorkoutItem, WorkoutItemsSchema } from './schema';

async function getWorkoutsByRange(range: string, sessionToken: string): Promise<WorkoutItem[]> {
    const url = `https://api.trainheroic.com/public/programworkout/range?${range}`;
    logger.fetching(`data from ${url}`);
    const options = {
        method: 'GET',
        headers: {
            'Session-Token': sessionToken,
        },
    };

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }
        const data = await response.json();
        logger.info(JSON.stringify(data));
        return WorkoutItemsSchema.parse(data);
    } catch (error) {
        logger.error(`Error fetching data: ${error}`);
        return [];
    }
}

function saveWorkoutLog(filename: string, workouts: WorkoutItem[]): void {
    const f = join(__dirname, '../', '../', 'data', 'download', 'trainheroic', 'calendar', `${filename}.json`);
    writeFileSync(f, JSON.stringify(workouts, null, 2));
}

function saveWorkout(workout: WorkoutItem, data: any): void {
    const filename = join(__dirname, '../', '../', 'data', 'download', 'trainheroic', 'workouts', `workout-${workout.id}.json`);
    try {
        writeFileSync(filename, JSON.stringify(data, null, 2));
        logger.saved(`data to ${filename}`);
    } catch (error) {
        logger.error(`Error saving data for workout ${workout.id}: ${error}`);
    }
}

async function getWorkout(workoutId: number, teamId: number, sessionToken: string): Promise<any> {
    const url = `https://api.trainheroic.com/3.0/athlete/savedworkout/${workoutId}/team/${teamId}?preview=false`;
    const options = {
        method: 'GET',
        headers: {
            'Session-Token': sessionToken,
        },
    };

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        logger.error(`Error fetching data: ${error}`);
        return null;
    }
}

export async function downloadWorkouts(range: string, sessionToken: string) {
    logger.downloading(`workouts: ${range}`);
    const workouts = await getWorkoutsByRange(range, sessionToken);
    logger.info(`Found ${workouts.length} workouts`);
    logger.saving(`data to file: ${range}.json`);
    saveWorkoutLog(range, workouts);
    for (const item of workouts) {
        const data = await getWorkout(item.id, item.team_id, sessionToken);
        logger.saving(`data for workout ${item.id}`);
        saveWorkout(item, data);
    }
}
