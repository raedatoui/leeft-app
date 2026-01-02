import fs from 'node:fs/promises';
import path from 'node:path';
import qs from 'node:querystring';
import { z } from 'zod';
import { logger } from '@leeft/utils';

const API_BASE = 'https://api.fitbit.com/1/user/-/activities';
const LIMIT = 100; // max per Fitbit docs
export interface FetchActivitiesOptions {
    beforeDate?: string;
    afterDate?: string;
    stopDate?: Date;
    maxResults?: number;
}

async function getAccessToken(): Promise<string> {
    try {
        const credsPath = path.join(__dirname, 'creds.json');
        const content = await fs.readFile(credsPath, 'utf-8');
        const creds = JSON.parse(content);
        return creds.access_token;
    } catch (_e) {
        throw new Error('Missing or invalid src/fitbit/creds.json. Please run authentication setup.');
    }
}

export const ActivityLevelSchema = z.array(
    z.object({
        minutes: z.number(),
        name: z.string(),
    })
);
export const ActiveZoneMinutesSchema = z.object({
    totalMinutes: z.number(),
    minutesInHeartRateZones: z.array(
        z.object({
            minutes: z.number(),
            zoneName: z.string(),
            order: z.number(),
            type: z.string(),
            minuteMultiplier: z.number(),
        })
    ),
});
export const RawActivitySchema = z.object({
    logId: z.number().optional(),
    activityName: z.string(),
    duration: z.number(),
    logType: z.string(),
    manualValuesSpecified: z.record(z.string(), z.boolean()),
    startTime: z.string(),
    activityLevel: ActivityLevelSchema,
    activeZoneMinutes: ActiveZoneMinutesSchema,
});
export const FitbitActivitySchema = z.object({
    id: z.string(),
    type: z.string(),
    durationMs: z.number(),
    durationMin: z.number(),
    loggedBy: z.enum(['manual', 'tracker', 'auto_detected']),
    date: z.string(),
    zoneMinutes: z.number(),
    effort: ActivityLevelSchema,
});
export type RawActivity = z.infer<typeof RawActivitySchema>;
export type FitbitActivity = z.infer<typeof FitbitActivitySchema>;

export async function fetchActivities(options: FetchActivitiesOptions = {}): Promise<any[]> {
    let offset = 0;
    const matches: any[] = [];
    const { beforeDate, afterDate, stopDate, maxResults } = options;

    while (true) {
        const qsParams: any = {
            sort: 'desc',
            limit: LIMIT,
            offset,
        };

        // Fitbit API requires exactly one of beforeDate or afterDate
        if (afterDate) {
            qsParams.afterDate = afterDate;
        } else {
            qsParams.beforeDate = beforeDate || new Date().toISOString().split('T')[0];
        }

        const accessToken = await getAccessToken();
        const res = await fetch(`${API_BASE}/list.json?${qs.stringify(qsParams)}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!res.ok) {
            throw new Error(`Fetch error ${res.status}: ${(await res.text()).slice(0, 200)}`);
        }

        const { activities } = (await res.json()) as { activities: any[] };
        if (activities.length === 0) break;

        for (const act of activities) {
            const activityDate = new Date(act.startTime);

            // If we're fetching afterDate, skip activities that are too old
            if (afterDate) {
                const afterDateTime = new Date(afterDate);
                if (activityDate <= afterDateTime) {
                    continue; // Skip this activity, it's not newer than our cutoff
                }
            }

            const name = act.activityName.toLowerCase();
            logger.info(name);
            matches.push(act);

            // Check if we've reached the maximum results
            if (maxResults && matches.length >= maxResults) {
                return matches.slice(0, maxResults);
            }
        }

        // Check if we should stop based on date
        if (stopDate) {
            const lastDate = new Date(activities[activities.length - 1].startTime);
            if (lastDate < stopDate) break;
        }

        // If we're using afterDate and got no matches in this batch, we're done
        if (afterDate && activities.length > 0) {
            const oldestInBatch = new Date(activities[activities.length - 1].startTime);
            const afterDateTime = new Date(afterDate);
            if (oldestInBatch <= afterDateTime) {
                break; // All remaining activities will be older
            }
        }

        offset += LIMIT;
    }

    return matches;
}

export function getLatestActivityDate(rawLog: any[]): string | null {
    if (!rawLog || rawLog.length === 0) {
        return null;
    }

    // Find the most recent activity
    const latest = rawLog.reduce((latest, current) => {
        const currentDate = new Date(current.startTime);
        const latestDate = new Date(latest.startTime);
        return currentDate > latestDate ? current : latest;
    });

    return latest.startTime.split('T')[0]; // Return date part only
}

// Comprehensive list of target cardio activity types
export const TARGET_CARDIO_ACTIVITIES = [
    'Run',
    'Swim',
    'Treadmill run',
    'HIIT',
    'Aerobic Workout',
    'Outdoor Bike',
    'Rowing machine',
    'Elliptical',
] as const;

// Activity type groupings for detailed analysis
export const ACTIVITY_GROUPS = {
    runs: ['Run', 'Treadmill run'],
    swims: ['Swim'],
    hiit: ['HIIT'],
    cycling: ['Outdoor Bike'],
    indoor: ['Aerobic Workout', 'Rowing machine', 'Elliptical'],
} as const;

/**
 * Check if an activity type should be included in cardio analysis
 */
export function isTargetCardioActivity(activityType: string): boolean {
    return TARGET_CARDIO_ACTIVITIES.includes(activityType as any);
}

/**
 * Filter activities to only include target cardio types
 */
export function filterTargetCardioActivities(activities: FitbitActivity[]): FitbitActivity[] {
    return activities.filter((activity) => isTargetCardioActivity(activity.type));
}

/**
 * Group activities by type and calculate counts
 */
export function getActivityTypeCounts(activities: FitbitActivity[]): Record<string, number> {
    return activities.reduce(
        (acc, activity) => {
            acc[activity.type] = (acc[activity.type] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );
}

/**
 * Group activities by logging method and calculate counts
 */
export function getLogMethodCounts(activities: FitbitActivity[]): Record<string, number> {
    return activities.reduce(
        (acc, activity) => {
            acc[activity.loggedBy] = (acc[activity.loggedBy] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );
}

/**
 * Calculate date range for a set of activities
 */
export function getActivityDateRange(activities: FitbitActivity[]): {
    earliest: string;
    latest: string;
} {
    if (activities.length === 0) {
        return { earliest: '', latest: '' };
    }

    return {
        earliest: activities.reduce(
            (earliest, activity) => (!earliest || new Date(activity.date) < new Date(earliest) ? activity.date : earliest),
            ''
        ),
        latest: activities.reduce((latest, activity) => (!latest || new Date(activity.date) > new Date(latest) ? activity.date : latest), ''),
    };
}

/**
 * Filter activities by specific groups (runs, swims, etc.)
 */
export function filterActivitiesByGroup(activities: FitbitActivity[], groupName: keyof typeof ACTIVITY_GROUPS): FitbitActivity[] {
    const groupTypes = ACTIVITY_GROUPS[groupName] as readonly string[];
    return activities.filter((activity) => (groupTypes as string[]).includes(activity.type));
}

/**
 * Filter activities by logging method
 */
export function filterActivitiesByLogMethod(activities: FitbitActivity[], logMethod: string): FitbitActivity[] {
    return activities.filter((activity) => activity.loggedBy === logMethod);
}

/**
 * Filter activities based on specific cardio criteria
 * 1. Outdoor runs, >= 20 min
 * 2. All swims (no duration limit)
 * 3. HIIT or Aerobic workouts, >= 15 min
 * 4. Treadmill runs, >= 20 min
 * 5. Elliptical, >= 20 min
 * 6. Bike rides, >= 20 min
 */
export function filterCardioActivitiesByCriteria(activities: FitbitActivity[]): FitbitActivity[] {
    return activities.filter((activity) => {
        const { type, durationMin } = activity;

        // 1. All outdoor runs, north of 20 min
        if (type === 'Run' && durationMin >= 20) {
            return true;
        }

        // 2. All swims count (no duration limit)
        if (type === 'Swim') {
            return true;
        }

        // 3. HIIT or Aerobic workouts, north of 15min
        if ((type === 'HIIT' || type === 'Aerobic Workout') && durationMin >= 15) {
            return true;
        }

        // 4. All treadmill, north of 20 min
        if (type === 'Treadmill run' && durationMin >= 20) {
            return true;
        }

        // 5. All Elliptical, north of 20 min
        if (type === 'Elliptical' && durationMin >= 20) {
            return true;
        }

        // 6. Bike rides, north of 20 min
        if ((type === 'Bike' || type === 'Outdoor Bike') && durationMin >= 20) {
            return true;
        }

        return false;
    });
}

/**
 * Get comprehensive activity statistics
 */
export function getActivityStatistics(activities: FitbitActivity[]) {
    const targetActivities = filterTargetCardioActivities(activities);
    const runs = filterActivitiesByGroup(targetActivities, 'runs');
    const swims = filterActivitiesByGroup(targetActivities, 'swims');
    const hiit = filterActivitiesByGroup(targetActivities, 'hiit');
    const cycling = filterActivitiesByGroup(targetActivities, 'cycling');
    const indoor = filterActivitiesByGroup(targetActivities, 'indoor');
    const manualActivities = filterActivitiesByLogMethod(targetActivities, 'manual');

    return {
        total: activities.length,
        targetActivities: targetActivities.length,
        breakdown: {
            runs: runs.length,
            outdoorRuns: runs.filter((r) => r.type === 'Run').length,
            treadmillRuns: runs.filter((r) => r.type === 'Treadmill run').length,
            swims: swims.length,
            hiit: hiit.length,
            cycling: cycling.length,
            indoor: indoor.length,
            manuallyLogged: manualActivities.length,
        },
        typeBreakdown: getActivityTypeCounts(targetActivities),
        logMethodBreakdown: getLogMethodCounts(targetActivities),
        dateRange: getActivityDateRange(targetActivities),
    };
}
