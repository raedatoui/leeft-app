import { mkdirSync, promises, readFileSync, writeFileSync } from 'node:fs';
import path, { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { logger } from '@leeft/utils';
import {
    type FitbitActivity,
    FitbitActivitySchema,
    filterActivitiesByGroup,
    filterActivitiesByLogMethod,
    filterTargetCardioActivities,
    getActivityStatistics,
    type RawActivity,
    RawActivitySchema,
} from './utils';

// Base directories
const baseDir = path.join(__dirname, '../', '../', 'data', 'out', 'fitbit');
const inputPath = path.join(__dirname, '../', '../', 'data', 'download', 'fitbit', 'raw-log.json');

// Read and parse the Fitbit log JSON file
function loadRawEntries(filePath: string): RawActivity[] {
    const data = readFileSync(filePath, 'utf-8');
    const arr = JSON.parse(data);
    return z.array(RawActivitySchema).parse(arr);
}

// Transform raw entries into simplified, validated parsed entries
function transformEntries(raw: RawActivity[]): FitbitActivity[] {
    return raw.map((entry) => {
        const { logType, manualValuesSpecified } = entry;
        let loggedBy: 'manual' | 'tracker' | 'auto_detected' = logType as any;
        if (Object.values(manualValuesSpecified).some((m) => m)) {
            loggedBy = 'manual';
        }
        const parsed = {
            id: uuidv4(),
            type: entry.activityName,
            durationMs: entry.duration,
            durationMin: entry.duration / 60000,
            loggedBy,
            date: entry.startTime,
            zoneMinutes: entry.activeZoneMinutes.totalMinutes,
            effort: entry.activityLevel,
        };
        return FitbitActivitySchema.parse(parsed);
    });
}

export async function main(): Promise<void> {
    await promises.rm(baseDir, { recursive: true, force: true });
    await promises.mkdir(baseDir, { recursive: true });

    mkdirSync(baseDir, { recursive: true });
    const rawActivities = loadRawEntries(inputPath);
    const activities = transformEntries(rawActivities);

    const filePath = path.join(baseDir, 'processed-log.json');
    writeFileSync(filePath, JSON.stringify(activities, null, 2));

    logger.success(`Log generated in directory: ${baseDir}`);

    logger.count(`Total activities: ${activities.length}`);

    // Get all target cardio activities using shared logic
    const allTargetActivities = filterTargetCardioActivities(activities);

    // Filter activities by groups using shared utilities
    const runs = filterActivitiesByGroup(allTargetActivities, 'runs');
    const swims = filterActivitiesByGroup(allTargetActivities, 'swims');
    const hiit = filterActivitiesByGroup(allTargetActivities, 'hiit');
    const cycling = filterActivitiesByGroup(allTargetActivities, 'cycling');
    const indoor = filterActivitiesByGroup(allTargetActivities, 'indoor');
    const manualActivities = filterActivitiesByLogMethod(allTargetActivities, 'manual');

    // Get comprehensive statistics using shared function
    const stats = getActivityStatistics(activities);

    // Log statistics
    logger.stats('Cardio Activity Statistics:');
    logger.count(`Total Runs (including treadmill): ${stats.breakdown.runs}`);
    logger.count(`  - Outdoor runs: ${stats.breakdown.outdoorRuns}`);
    logger.count(`  - Treadmill runs: ${stats.breakdown.treadmillRuns}`);
    logger.count(`Total Swims: ${stats.breakdown.swims}`);
    logger.count(`Total HIIT workouts: ${stats.breakdown.hiit}`);
    logger.count(`Total Cycling: ${stats.breakdown.cycling}`);
    logger.count(`Total Indoor activities: ${stats.breakdown.indoor}`);
    logger.count(`Manually logged activities: ${stats.breakdown.manuallyLogged}`);
    logger.count(`Total target activities: ${stats.targetActivities}`);

    logger.breakdown('Breakdown by type:');
    Object.entries(stats.typeBreakdown).forEach(([type, count]) => {
        logger.breakdown(`  ${type}: ${count}`);
    });

    logger.breakdown('Breakdown by logging method:');
    Object.entries(stats.logMethodBreakdown).forEach(([method, count]) => {
        logger.breakdown(`  ${method}: ${count}`);
    });

    // Save filtered data
    const outputDir = join(__dirname, '../../data/out/fitbit');

    writeFileSync(join(outputDir, 'target-cardio-activities.json'), JSON.stringify(allTargetActivities, null, 2), { flag: 'w' });

    writeFileSync(join(outputDir, 'runs-and-treadmill.json'), JSON.stringify(runs, null, 2), { flag: 'w' });

    writeFileSync(join(outputDir, 'swims-only.json'), JSON.stringify(swims, null, 2), { flag: 'w' });

    writeFileSync(join(outputDir, 'hiit-workouts.json'), JSON.stringify(hiit, null, 2), { flag: 'w' });

    writeFileSync(join(outputDir, 'cycling-activities.json'), JSON.stringify(cycling, null, 2), { flag: 'w' });

    writeFileSync(join(outputDir, 'indoor-activities.json'), JSON.stringify(indoor, null, 2), { flag: 'w' });

    writeFileSync(join(outputDir, 'manual-target-activities.json'), JSON.stringify(manualActivities, null, 2), { flag: 'w' });

    // Use the comprehensive statistics from shared utilities
    const summary = stats;

    writeFileSync(join(outputDir, 'cardio-summary.json'), JSON.stringify(summary, null, 2), { flag: 'w' });

    logger.saved(`Filtered cardio data saved to: ${outputDir}/`);
    logger.created('Files created:');
    logger.created('  - processed-log.json (entire log)');
    logger.created('  - target-cardio-activities.json (all target activities)');
    logger.created('  - runs-and-treadmill.json (runs + treadmill runs)');
    logger.created('  - swims-only.json (swimming activities)');
    logger.created('  - hiit-workouts.json (HIIT workouts)');
    logger.created('  - cycling-activities.json (cycling activities)');
    logger.created('  - indoor-activities.json (indoor cardio activities)');
    logger.created('  - manual-target-activities.json (manually logged target activities)');
    logger.created('  - cardio-summary.json (statistics summary)');
}
