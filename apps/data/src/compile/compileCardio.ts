import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '@leeft/utils';
import { type FitbitActivity, FitbitActivitySchema, filterCardioActivitiesByCriteria, getActivityTypeCounts } from '../fitbit/utils';
import { type CardioWorkout, CardioWorkoutSchema } from './types';

function convertFitbitToCardioWorkout(activity: FitbitActivity): CardioWorkout {
    return CardioWorkoutSchema.parse({
        uuid: activity.id,
        date: new Date(activity.date),
        type: activity.type,
        durationMs: activity.durationMs,
        durationMin: activity.durationMin,
        loggedBy: activity.loggedBy,
        zoneMinutes: activity.zoneMinutes,
        effort: activity.effort,
    });
}

function loadFitbitActivities(): FitbitActivity[] {
    const processedLogPath = join(__dirname, '../../data/out/fitbit/processed-log.json');
    const data = JSON.parse(readFileSync(processedLogPath, 'utf-8'));
    return data.map((activity: any) => FitbitActivitySchema.parse(activity));
}

export function main(): void {
    logger.loading('Loading Fitbit activities...');
    const fitbitActivities = loadFitbitActivities();

    logger.filtering('Filtering cardio activities by specified criteria...');
    const cardioActivities = filterCardioActivitiesByCriteria(fitbitActivities);

    logger.filtered(`Filtered cardio activities: ${cardioActivities.length}`);

    // Log activity type counts
    const typeCounts = getActivityTypeCounts(cardioActivities);
    logger.breakdown('Activity type breakdown:');
    Object.entries(typeCounts).forEach(([type, count]) => {
        logger.count(`  ${type}: ${count}`);
    });

    logger.converting('Converting to cardio workout format...');
    const cardioWorkouts = cardioActivities.map(convertFitbitToCardioWorkout);

    // Sort by date
    cardioWorkouts.sort((a, b) => a.date.getTime() - b.date.getTime());

    logger.compiled(`Total cardio workouts compiled: ${cardioWorkouts.length}`);

    // Write cardio data
    const outputPath = join(__dirname, '../../data/out/cardio-log.json');
    writeFileSync(outputPath, JSON.stringify(cardioWorkouts, null, 2), { flag: 'w' });

    logger.saved(`Cardio workouts saved to: ${outputPath}`);

    // Write summary stats
    const stats = {
        total: cardioWorkouts.length,
        typeBreakdown: cardioWorkouts.reduce(
            (acc, workout) => {
                acc[workout.type] = (acc[workout.type] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>
        ),
        dateRange: {
            earliest: cardioWorkouts[0]?.date,
            latest: cardioWorkouts[cardioWorkouts.length - 1]?.date,
        },
    };

    const statsPath = join(__dirname, '../../data/out/cardio-stats.json');
    writeFileSync(statsPath, JSON.stringify(stats, null, 2), { flag: 'w' });
    logger.saved(`Cardio statistics saved to: ${statsPath}`);
}
