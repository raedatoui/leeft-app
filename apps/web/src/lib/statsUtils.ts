import type { CardioWorkout, MappedCycle, Workout } from '@/types';

export type ViewMode = 'week' | 'month' | 'cycle' | 'year' | 'day';
export type AggregateBy = 'month' | 'week' | 'day';

export interface Period {
    label: string;
    dateRange: { start: Date; end: Date };
}

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

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Get the Monday of the week containing the given date
 */
function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Get the Sunday of the week containing the given date
 */
function getWeekEnd(date: Date): Date {
    const start = getWeekStart(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
}

/**
 * Format a date range as "Jan 6-12, 2025" or "Dec 30 - Jan 5, 2025"
 */
function formatWeekRange(start: Date, end: Date): string {
    const startMonth = start.toLocaleString('en-US', { month: 'short' });
    const endMonth = end.toLocaleString('en-US', { month: 'short' });
    const startDay = start.getDate();
    const endDay = end.getDate();
    const year = end.getFullYear();

    if (startMonth === endMonth) {
        return `${startMonth} ${startDay}-${endDay}, ${year}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

/**
 * Compute week periods from all workouts
 */
export function computeWeekPeriods(workouts: Workout[], cardioWorkouts: CardioWorkout[]): Period[] {
    const allDates = [...workouts.map((w) => w.date), ...cardioWorkouts.map((w) => w.date)];

    if (allDates.length === 0) return [];

    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

    const periods: Period[] = [];
    let currentStart = getWeekStart(minDate);

    while (currentStart <= maxDate) {
        const currentEnd = getWeekEnd(currentStart);
        periods.push({
            label: formatWeekRange(currentStart, currentEnd),
            dateRange: { start: new Date(currentStart), end: new Date(currentEnd) },
        });
        currentStart = new Date(currentStart);
        currentStart.setDate(currentStart.getDate() + 7);
    }

    return periods.reverse();
}

/**
 * Compute month periods from all workouts
 */
export function computeMonthPeriods(workouts: Workout[], cardioWorkouts: CardioWorkout[]): Period[] {
    const allDates = [...workouts.map((w) => w.date), ...cardioWorkouts.map((w) => w.date)];

    if (allDates.length === 0) return [];

    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

    const periods: Period[] = [];
    let currentYear = minDate.getFullYear();
    let currentMonth = minDate.getMonth();

    while (currentYear < maxDate.getFullYear() || (currentYear === maxDate.getFullYear() && currentMonth <= maxDate.getMonth())) {
        const start = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
        const end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
        const label = start.toLocaleString('en-US', { month: 'long', year: 'numeric' });

        periods.push({ label, dateRange: { start, end } });

        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
    }

    return periods.reverse();
}

/**
 * Filter cardio workouts by date range
 */
export function filterCardioWorkoutsByDateRange(cardioWorkouts: CardioWorkout[], startDate: Date, endDate: Date): CardioWorkout[] {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return cardioWorkouts.filter((workout) => {
        const workoutDate = new Date(workout.date);
        return workoutDate >= start && workoutDate <= end;
    });
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
    const year = dateRange.start.getFullYear();

    if (aggregateBy === 'month') {
        // 12 bars for each month
        const data: ChartDataPoint[] = MONTH_NAMES_SHORT.map((label, monthIndex) => {
            const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
            const start = new Date(year, monthIndex, 1);
            const end = new Date(year, monthIndex, daysInMonth, 23, 59, 59, 999);
            return {
                label,
                tooltip: `${MONTH_NAMES_FULL[monthIndex]} 1-${daysInMonth}, ${year}`,
                liftingCount: 0,
                cardioCount: 0,
                dateRange: { start, end },
            };
        });

        for (const workout of liftingWorkouts) {
            const month = workout.date.getMonth();
            const point = data[month];
            if (point) point.liftingCount++;
        }

        for (const workout of cardioWorkouts) {
            const month = workout.date.getMonth();
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
            chunkEnd.setDate(currentChunkStart.getDate() + 6);

            // Cap at rangeEnd (which should be end of month in OverviewPage)
            if (chunkEnd > rangeEnd) {
                chunkEnd.setTime(rangeEnd.getTime());
                chunkEnd.setHours(23, 59, 59, 999); // Ensure end of day
            } else {
                chunkEnd.setHours(23, 59, 59, 999);
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
            currentChunkStart.setDate(currentChunkStart.getDate() + 1);
            currentChunkStart.setHours(0, 0, 0, 0);
            weekNum++;
        }

        return data;
    }

    // aggregateBy === 'day'
    // Individual day bars
    const data: ChartDataPoint[] = [];
    const currentDate = new Date(dateRange.start);
    // Ensure we start at 00:00:00
    currentDate.setHours(0, 0, 0, 0);

    const rangeEndDate = new Date(dateRange.end);
    rangeEndDate.setHours(23, 59, 59, 999);

    while (currentDate <= rangeEndDate) {
        const dayName = DAY_NAMES_SHORT[currentDate.getDay()];
        const dayNum = currentDate.getDate();
        const monthName = MONTH_NAMES_SHORT[currentDate.getMonth()];
        const dateYear = currentDate.getFullYear();

        const dayStart = new Date(currentDate);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);

        data.push({
            label: `${dayName} ${dayNum}`,
            tooltip: `${DAY_NAMES_SHORT[currentDate.getDay()]}, ${monthName} ${dayNum}, ${dateYear}`,
            liftingCount: 0,
            cardioCount: 0,
            dateRange: { start: dayStart, end: dayEnd },
        });

        currentDate.setDate(currentDate.getDate() + 1);
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
 * Get date range from a cycle
 */
export function getCycleDateRange(cycle: MappedCycle): { start: Date; end: Date } {
    return {
        start: cycle.dates[0],
        end: cycle.dates[1],
    };
}

/**
 * Format a number with commas
 */
export function formatNumber(num: number): string {
    return num.toLocaleString('en-US');
}
