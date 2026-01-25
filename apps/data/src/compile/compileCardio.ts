import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '@leeft/utils';
import {
    calculateEffortScore,
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
        type: activity.type,
        durationMs: activity.durationMs,
        durationMin: activity.durationMin,
        loggedBy: activity.loggedBy,
        zoneMinutes: activity.zoneMinutes,
        effort: activity.effort,
        averageHeartRate: activity.averageHeartRate,
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

    // === PERMISSIVE FILTER (current algorithm) ===
    logger.filtering('Filtering cardio activities (permissive)...');
    const cardioActivities = filterCardioActivitiesByCriteria(fitbitActivities);
    logger.filtered(`Permissive filter: ${cardioActivities.length} activities`);

    // === STRICT FILTER (new algorithm) ===
    logger.filtering('Filtering cardio activities (strict)...');
    const cardioActivitiesStrict = filterCardioActivitiesByCriteriaStrict(fitbitActivities);
    logger.filtered(`Strict filter: ${cardioActivitiesStrict.length} activities`);

    // === IDENTIFY QUESTIONABLE ===
    logger.filtering('Identifying questionable activities...');
    const questionable = identifyQuestionableActivities(cardioActivities);
    logger.filtered(`Questionable activities: ${questionable.length}`);

    // Log activity type counts for permissive
    const typeCounts = getActivityTypeCounts(cardioActivities);
    logger.breakdown('Permissive - Activity type breakdown:');
    Object.entries(typeCounts).forEach(([type, count]) => {
        logger.count(`  ${type}: ${count}`);
    });

    // Log activity type counts for strict
    const typeCountsStrict = getActivityTypeCounts(cardioActivitiesStrict);
    logger.breakdown('Strict - Activity type breakdown:');
    Object.entries(typeCountsStrict).forEach(([type, count]) => {
        logger.count(`  ${type}: ${count}`);
    });

    // === CONVERT TO CARDIO WORKOUTS ===
    logger.converting('Converting to cardio workout format...');
    const cardioWorkouts = cardioActivities.map(convertFitbitToCardioWorkout);
    const cardioWorkoutsStrict = cardioActivitiesStrict.map(convertFitbitToCardioWorkout);

    // Sort by date
    cardioWorkouts.sort((a, b) => a.date.getTime() - b.date.getTime());
    cardioWorkoutsStrict.sort((a, b) => a.date.getTime() - b.date.getTime());

    logger.compiled(`Permissive: ${cardioWorkouts.length} workouts`);
    logger.compiled(`Strict: ${cardioWorkoutsStrict.length} workouts`);
    logger.compiled(`Difference: ${cardioWorkouts.length - cardioWorkoutsStrict.length} filtered out by strict`);

    // === WRITE PERMISSIVE CARDIO LOG ===
    const outputPath = join(__dirname, '../../data/out/cardio-log.json');
    writeFileSync(outputPath, JSON.stringify(cardioWorkouts, null, 2), { flag: 'w' });
    logger.saved(`Cardio workouts (permissive) saved to: ${outputPath}`);

    // === WRITE STRICT CARDIO LOG ===
    const strictOutputPath = join(__dirname, '../../data/out/cardio-log-strict.json');
    writeFileSync(strictOutputPath, JSON.stringify(cardioWorkoutsStrict, null, 2), { flag: 'w' });
    logger.saved(`Cardio workouts (strict) saved to: ${strictOutputPath}`);

    // === WRITE ANALYSIS ===
    // Find what was filtered out by strict
    const strictIds = new Set(cardioActivitiesStrict.map((a) => a.id));
    const filteredOut = cardioActivities.filter((a) => !strictIds.has(a.id));

    const analysis = {
        summary: {
            permissiveCount: cardioWorkouts.length,
            strictCount: cardioWorkoutsStrict.length,
            filteredOutCount: filteredOut.length,
            questionableCount: questionable.length,
        },
        permissiveBreakdown: {
            byType: typeCounts,
            byLogMethod: cardioActivities.reduce(
                (acc, a) => {
                    acc[a.loggedBy] = (acc[a.loggedBy] || 0) + 1;
                    return acc;
                },
                {} as Record<string, number>
            ),
        },
        strictBreakdown: {
            byType: typeCountsStrict,
            byLogMethod: cardioActivitiesStrict.reduce(
                (acc, a) => {
                    acc[a.loggedBy] = (acc[a.loggedBy] || 0) + 1;
                    return acc;
                },
                {} as Record<string, number>
            ),
        },
        filteredOutByStrict: filteredOut.map((a) => ({
            id: a.id,
            date: a.date,
            type: a.type,
            durationMin: Math.round(a.durationMin),
            loggedBy: a.loggedBy,
            zoneMinutes: a.zoneMinutes,
            effortScore: calculateEffortScore(a),
            averageHeartRate: a.averageHeartRate,
        })),
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

    // === WRITE STATS (for permissive - backward compatible) ===
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
