import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '@leeft/utils';
import { type WorkoutItem, WorkoutItemsSchema } from './schema';

const headers: Record<string, string> = {
    'cache-control': 'no-cache',
    origin: 'https://account.trainheroic.com',
    pragma: 'no-cache',
    priority: 'u=1, i',
    referer: 'https://account.trainheroic.com/',
    'sec-ch-ua': 'Google Chrome;v=147, Not.A/Brand;v=8, Chromium;v=147',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': 'macOS',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
};

async function getWorkoutsByRange(range: string): Promise<WorkoutItem[]> {
    const url = `https://api.trainheroic.com/public/programworkout/range?${range}`;
    logger.fetching(`data from ${url}`);
    const options = {
        method: 'GET',
        headers,
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

async function getWorkout(workoutId: number, teamId: number): Promise<any> {
    const url = `https://api.trainheroic.com/3.0/athlete/savedworkout/${workoutId}/team/${teamId}?preview=false`;
    const options = {
        method: 'GET',
        headers,
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
    headers['Session-Token'] = sessionToken;
    const workouts = await getWorkoutsByRange(range);
    logger.info(`Found ${workouts.length} workouts`);
    logger.saving(`data to file: ${range}.json`);
    saveWorkoutLog(range, workouts);
    for (const item of workouts) {
        const data = await getWorkout(item.id, item.team_id);
        logger.saving(`data for workout ${item.id}`);
        saveWorkout(item, data);
    }
}
