import fs from 'node:fs/promises';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';
import { fetchActivities } from './utils';

dotenv.config();

const ALL_TIME = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 15);
    return d;
})();

async function fetchAllActivities() {
    return fetchActivities({
        stopDate: ALL_TIME,
    });
}

export async function main() {
    try {
        const activities = await fetchAllActivities();
        logger.count(`Found ${activities.length} in total.`);
        // optionally write to a JSON file:
        await fs.writeFile('data/download/fitbit/raw-log.json', JSON.stringify(activities, null, 2));
        logger.saved('Saved → data/download/fitbit/raw-log.json');
    } catch (e) {
        logger.error(`Error fetching activities: ${e}`);
        process.exit(1);
    }
}
