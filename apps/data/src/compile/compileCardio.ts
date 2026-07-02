import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '@leeft/utils';
import {
    type FitbitActivity,
    FitbitActivitySchema,
    filterCardioActivitiesByCriteria,
    filterCardioActivitiesByCriteriaStrict,
    getActivityTypeCounts,
    identifyQuestionableActivities,
} from '../fitbit/utils';
import { type CardioWorkout, CardioWorkoutSchema } from './types';

function convertFitbitToCardioWorkout(activity: FitbitActivity): CardioWorkout {
    return CardioWorkoutSchema.parse({
        uuid: activity.id,
        date: new Date(activity.date),
        startedAt: activity.startedAt,
        type: activity.type,
        durationMs: activity.durationMs,
        durationMin: activity.durationMin,
        loggedBy: activity.loggedBy,
        zoneMinutes: activity.zoneMinutes,
        hrZones: activity.hrZones,
        effort: activity.effort,
        averageHeartRate: activity.averageHeartRate,
        distance: activity.distance,
        pace: activity.pace,
        calories: activity.calories,
        steps: activity.steps,
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

    // === DIAGNOSTIC FILTERS (not used to build the shipped log — the UI filters by effort tier) ===
    const cardioActivities = filterCardioActivitiesByCriteria(fitbitActivities);
    logger.filtered(`Permissive filter (diagnostic): ${cardioActivities.length} activities`);

    const cardioActivitiesStrict = filterCardioActivitiesByCriteriaStrict(fitbitActivities);
    logger.filtered(`Strict filter (diagnostic): ${cardioActivitiesStrict.length} activities`);

    const questionable = identifyQuestionableActivities(cardioActivities);
    logger.filtered(`Questionable activities: ${questionable.length}`);

    // === CONVERT ALL ACTIVITIES ===
    logger.converting('Converting to cardio workout format...');
    const cardioWorkouts = fitbitActivities.map(convertFitbitToCardioWorkout);

    // Sort by date
    cardioWorkouts.sort((a, b) => a.date.getTime() - b.date.getTime());

    const typeCounts = getActivityTypeCounts(fitbitActivities);
    logger.breakdown('Activity type breakdown:');
    Object.entries(typeCounts).forEach(([type, count]) => {
        logger.count(`  ${type}: ${count}`);
    });

    logger.compiled(`All activities: ${cardioWorkouts.length} workouts`);

    // === WRITE CARDIO LOG (all activities) ===
    const outputPath = join(__dirname, '../../data/out/cardio-log.json');
    writeFileSync(outputPath, JSON.stringify(cardioWorkouts, null, 2), { flag: 'w' });
    logger.saved(`Cardio workouts saved to: ${outputPath}`);

    // === WRITE ANALYSIS (local-only diagnostics) ===
    const analysis = {
        summary: {
            totalCount: cardioWorkouts.length,
            permissiveCount: cardioActivities.length,
            strictCount: cardioActivitiesStrict.length,
            questionableCount: questionable.length,
        },
        permissiveBreakdown: {
            byType: getActivityTypeCounts(cardioActivities),
            byLogMethod: cardioActivities.reduce(
                (acc, a) => {
                    acc[a.loggedBy] = (acc[a.loggedBy] || 0) + 1;
                    return acc;
                },
                {} as Record<string, number>
            ),
        },
        strictBreakdown: {
            byType: getActivityTypeCounts(cardioActivitiesStrict),
            byLogMethod: cardioActivitiesStrict.reduce(
                (acc, a) => {
                    acc[a.loggedBy] = (acc[a.loggedBy] || 0) + 1;
                    return acc;
                },
                {} as Record<string, number>
            ),
        },
        questionableWorkouts: questionable.map((q) => ({
            id: q.activity.id,
            date: q.activity.date,
            type: q.activity.type,
            durationMin: Math.round(q.activity.durationMin),
            loggedBy: q.activity.loggedBy,
            zoneMinutes: q.activity.zoneMinutes,
            effortScore: q.effortScore,
            averageHeartRate: q.activity.averageHeartRate,
            reasons: q.reasons,
        })),
    };

    const analysisPath = join(__dirname, '../../data/out/cardio-analysis.json');
    writeFileSync(analysisPath, JSON.stringify(analysis, null, 2), { flag: 'w' });
    logger.saved(`Cardio analysis saved to: ${analysisPath}`);

    // === WRITE STATS ===
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
