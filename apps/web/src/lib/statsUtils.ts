import { DOWS_SHORT, MONTHS_LONG, MONTHS_SHORT } from '@/lib/dateFormatters';
import type { CardioWorkout, Workout } from '@/types';

export type AggregateBy = 'month' | 'week' | 'day';

export interface ChartDataPoint {
    label: string;
    tooltip: string; // Full date or date range for tooltip
    liftingCount: number;
    cardioCount: number;
    dateRange?: { start: Date; end: Date }; // Optional range for the point
}

export interface OverviewStats {
    totalWorkouts: number;
    liftingCount: number;
    cardioCount: number;
    totalVolume: number;
    avgRpe: number | null;
    averageWorkouts?: {
        label: string;
        value: string;
    };
}

/**
 * Get the Monday of the week containing the given date (UTC)
 */
export function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    d.setUTCDate(diff);
    d.setUTCHours(0, 0, 0, 0);
    return d;
}

/**
 * Get the Sunday of the week containing the given date (UTC)
 */
export function getWeekEnd(date: Date): Date {
    const start = getWeekStart(date);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    end.setUTCHours(23, 59, 59, 999);
    return end;
}

/**
 * Format a date range as "Jan 6-12, 2025" or "Dec 30 - Jan 5, 2025"
 */
function formatWeekRange(start: Date, end: Date): string {
    const startMonth = MONTHS_SHORT[start.getUTCMonth()];
    const endMonth = MONTHS_SHORT[end.getUTCMonth()];
    const startDay = start.getUTCDate();
    const endDay = end.getUTCDate();
    const year = end.getUTCFullYear();

    if (startMonth === endMonth) {
        return `${startMonth} ${startDay}-${endDay}, ${year}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

/**
 * Aggregate workout data for chart display
 * - month: 12 bars for each month (when viewing year)
 * - week: 7-day chunks (1-7, 8-14, etc.) to match OverviewPage logic
 * - day: Individual day bars
 */
export function aggregateForChart(
    liftingWorkouts: Workout[],
    cardioWorkouts: CardioWorkout[],
    aggregateBy: AggregateBy,
    dateRange: { start: Date; end: Date }
): ChartDataPoint[] {
    const year = dateRange.start.getUTCFullYear();

    if (aggregateBy === 'month') {
        // 12 bars for each month
        const data: ChartDataPoint[] = MONTHS_SHORT.map((label, monthIndex) => {
            const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
            const start = new Date(Date.UTC(year, monthIndex, 1));
            const end = new Date(Date.UTC(year, monthIndex, daysInMonth, 23, 59, 59, 999));
            return {
                label,
                tooltip: `${MONTHS_LONG[monthIndex]} 1-${daysInMonth}, ${year}`,
                liftingCount: 0,
                cardioCount: 0,
                dateRange: { start, end },
            };
        });

        for (const workout of liftingWorkouts) {
            const month = workout.date.getUTCMonth();
            const point = data[month];
            if (point) point.liftingCount++;
        }

        for (const workout of cardioWorkouts) {
            const month = workout.date.getUTCMonth();
            const point = data[month];
            if (point) point.cardioCount++;
        }

        return data;
    }

    if (aggregateBy === 'week') {
        // Aggregate by 7-day chunks to match OverviewPage logic
        const data: ChartDataPoint[] = [];

        // We assume dateRange starts at the beginning of a month for this logic to align with "Week 1", "Week 2"
        // If dateRange spans multiple months, this logic repeats per month or treats it as a continuum?
        // OverviewPage passes a specific month range when in 'month' view.
        // Let's implement robust 7-day chunking from the start of the range.

        const rangeStart = new Date(dateRange.start);
        const rangeEnd = new Date(dateRange.end);
        let currentChunkStart = new Date(rangeStart);
        let weekNum = 1;

        while (currentChunkStart <= rangeEnd) {
            // End of this 7-day chunk
            const chunkEnd = new Date(currentChunkStart);
            chunkEnd.setUTCDate(currentChunkStart.getUTCDate() + 6);

            // Cap at rangeEnd (which should be end of month in OverviewPage)
            if (chunkEnd > rangeEnd) {
                chunkEnd.setTime(rangeEnd.getTime());
                chunkEnd.setUTCHours(23, 59, 59, 999); // Ensure end of day
            } else {
                chunkEnd.setUTCHours(23, 59, 59, 999);
            }

            const tooltip = formatWeekRange(currentChunkStart, chunkEnd);
            const point: ChartDataPoint = {
                label: `W${weekNum}`,
                tooltip,
                liftingCount: 0,
                cardioCount: 0,
                dateRange: { start: new Date(currentChunkStart), end: new Date(chunkEnd) },
            };
            data.push(point);

            // Count workouts in this chunk
            for (const workout of liftingWorkouts) {
                if (workout.date >= currentChunkStart && workout.date <= chunkEnd) {
                    point.liftingCount++;
                }
            }

            for (const workout of cardioWorkouts) {
                if (workout.date >= currentChunkStart && workout.date <= chunkEnd) {
                    point.cardioCount++;
                }
            }

            // Next chunk
            currentChunkStart = new Date(chunkEnd);
            currentChunkStart.setUTCDate(currentChunkStart.getUTCDate() + 1);
            currentChunkStart.setUTCHours(0, 0, 0, 0);
            weekNum++;
        }

        return data;
    }

    // aggregateBy === 'day'
    // Individual day bars
    const data: ChartDataPoint[] = [];
    const currentDate = new Date(dateRange.start);
    // Ensure we start at 00:00:00
    currentDate.setUTCHours(0, 0, 0, 0);

    const rangeEndDate = new Date(dateRange.end);
    rangeEndDate.setUTCHours(23, 59, 59, 999);

    while (currentDate <= rangeEndDate) {
        const dayName = DOWS_SHORT[currentDate.getUTCDay()];
        const dayNum = currentDate.getUTCDate();
        const monthName = MONTHS_SHORT[currentDate.getUTCMonth()];
        const dateYear = currentDate.getUTCFullYear();

        const dayStart = new Date(currentDate);
        const dayEnd = new Date(currentDate);
        dayEnd.setUTCHours(23, 59, 59, 999);

        data.push({
            label: `${dayName} ${dayNum}`,
            tooltip: `${DOWS_SHORT[currentDate.getUTCDay()]}, ${monthName} ${dayNum}, ${dateYear}`,
            liftingCount: 0,
            cardioCount: 0,
            dateRange: { start: dayStart, end: dayEnd },
        });

        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    // Count workouts for each day
    for (const workout of liftingWorkouts) {
        // Use exact date comparison or index map
        // Since we iterate days sequentially, we can just check range
        // Optimization: create a map or just loop?
        // Data size is small (max 31 days usually), loop is fine.
        // Or mapping by day index.
        // const dayIndex = Math.floor((workout.date.getTime() - dateRange.start.getTime()) / (24 * 60 * 60 * 1000));
        // Need to be careful with day boundaries and timezones.
        // Let's use simple check against our generated data points to be safe.

        // Find matching data point
        const point = data.find((d) => d.dateRange && workout.date >= d.dateRange.start && workout.date <= d.dateRange.end);
        if (point) {
            point.liftingCount++;
        }
    }

    for (const workout of cardioWorkouts) {
        const point = data.find((d) => d.dateRange && workout.date >= d.dateRange.start && workout.date <= d.dateRange.end);
        if (point) {
            point.cardioCount++;
        }
    }

    return data;
}

/**
 * Compute overview statistics
 */
export function computeOverviewStats(liftingWorkouts: Workout[], cardioWorkouts: CardioWorkout[]): OverviewStats {
    const liftingCount = liftingWorkouts.length;
    const cardioCount = cardioWorkouts.length;
    const totalVolume = liftingWorkouts.reduce((sum, w) => sum + w.volume, 0);

    const workoutsWithRpe = liftingWorkouts.filter((w) => w.rpe !== null);
    const avgRpe = workoutsWithRpe.length > 0 ? workoutsWithRpe.reduce((sum, w) => sum + (w.rpe ?? 0), 0) / workoutsWithRpe.length : null;

    return {
        totalWorkouts: liftingCount + cardioCount,
        liftingCount,
        cardioCount,
        totalVolume,
        avgRpe,
    };
}

/**
 * Format a number with commas
 */
export function formatNumber(num: number): string {
    return num.toLocaleString('en-US');
}

/**
 * Format a volume: raw under 1k, "12.3k" under 1M, "1.23M" above.
 */
export function formatVolume(n: number): string {
    if (n < 1000) return Math.round(n).toLocaleString();
    if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
    return `${(n / 1_000_000).toFixed(2)}M`;
}
