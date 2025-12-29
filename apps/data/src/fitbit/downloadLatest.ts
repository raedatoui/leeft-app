import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';
import { fetchActivities, getLatestActivityDate } from './utils';

dotenv.config();

const RAW_LOG_PATH = path.join(__dirname, '../../data/download/fitbit/raw-log.json');

async function loadExistingRawLog(): Promise<any[]> {
    try {
        const content = await fs.readFile(RAW_LOG_PATH, 'utf-8');
        return JSON.parse(content);
    } catch (_error) {
        logger.info('No existing raw log found, will fetch all activities from today');
        return [];
    }
}

async function fetchLatestActivities(): Promise<any[]> {
    const existingLog = await loadExistingRawLog();

    if (existingLog.length === 0) {
        logger.info('No existing activities found, fetching last 60 days...');
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 60);

        return fetchActivities({
            stopDate: thirtyDaysAgo,
        });
    }

    const latestDate = getLatestActivityDate(existingLog);
    if (!latestDate) {
        logger.info('Could not determine latest activity date, fetching last 7 days...');
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        return fetchActivities({
            stopDate: sevenDaysAgo,
        });
    }

    logger.info(`Latest activity in log: ${latestDate}`);

    // Fetch activities after the latest date
    const afterDate = new Date(latestDate);
    afterDate.setDate(afterDate.getDate() + 1); // Start from day after latest

    return fetchActivities({
        afterDate: afterDate.toISOString().split('T')[0],
    });
}

async function mergeAndSaveActivities(newActivities: any[]): Promise<void> {
    if (newActivities.length === 0) {
        logger.info('No new activities to merge');
        return;
    }

    const existingLog = await loadExistingRawLog();

    // Create a set of existing activity IDs to avoid duplicates
    const existingIds = new Set(existingLog.map((activity) => activity.logId || activity.activityId));

    // Filter out activities that already exist
    const uniqueNewActivities = newActivities.filter((activity) => !existingIds.has(activity.logId || activity.activityId));

    if (uniqueNewActivities.length === 0) {
        logger.info('No new unique activities found');
        return;
    }

    // Merge and sort by start time (newest first)
    const mergedActivities = [...existingLog, ...uniqueNewActivities].sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );

    // Save the merged activities
    await fs.writeFile(RAW_LOG_PATH, JSON.stringify(mergedActivities, null, 2));
    logger.info(`Merged ${uniqueNewActivities.length} new activities with ${existingLog.length} existing activities`);
}

export async function main() {
    try {
        logger.fetching('Fetching latest activities...');
        const newActivities = await fetchLatestActivities();
        logger.fetched(`Found ${newActivities.length} new activities.`);

        await mergeAndSaveActivities(newActivities);
        logger.saved('Saved → data/download/fitbit/raw-log.json');
    } catch (e) {
        logger.error(`Error fetching latest activities: ${e}`);
        process.exit(1);
    }
}
