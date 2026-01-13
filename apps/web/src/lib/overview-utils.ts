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
}

export interface OverviewStats {
    totalWorkouts: number;
    liftingCount: number;
    cardioCount: number;
    totalVolume: number;
    avgRpe: number | null;
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
 * - week: ~52 bars or 4-5 bars depending on range
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
            return {
                label,
                tooltip: `${MONTH_NAMES_FULL[monthIndex]} 1-${daysInMonth}, ${year}`,
                liftingCount: 0,
                cardioCount: 0,
            };
        });

        for (const workout of liftingWorkouts) {
            const month = workout.date.getMonth();
            data[month].liftingCount++;
        }

        for (const workout of cardioWorkouts) {
            const month = workout.date.getMonth();
            data[month].cardioCount++;
        }

        return data;
    }

    if (aggregateBy === 'week') {
        // Aggregate by calendar weeks within the date range
        const data: ChartDataPoint[] = [];
        let currentWeekStart = getWeekStart(dateRange.start);

        // If week starts before range, adjust
        if (currentWeekStart < dateRange.start) {
            currentWeekStart = new Date(dateRange.start);
        }

        let weekNum = 1;
        while (currentWeekStart <= dateRange.end) {
            const weekEnd = new Date(currentWeekStart);
            weekEnd.setDate(currentWeekStart.getDate() + 6);
            if (weekEnd > dateRange.end) {
                weekEnd.setTime(dateRange.end.getTime());
            }

            const tooltip = formatWeekRange(currentWeekStart, weekEnd);
            data.push({
                label: `W${weekNum}`,
                tooltip,
                liftingCount: 0,
                cardioCount: 0,
            });

            // Count workouts in this week
            for (const workout of liftingWorkouts) {
                if (workout.date >= currentWeekStart && workout.date <= weekEnd) {
                    data[data.length - 1].liftingCount++;
                }
            }

            for (const workout of cardioWorkouts) {
                if (workout.date >= currentWeekStart && workout.date <= weekEnd) {
                    data[data.length - 1].cardioCount++;
                }
            }

            currentWeekStart = new Date(currentWeekStart);
            currentWeekStart.setDate(currentWeekStart.getDate() + 7);
            weekNum++;
        }

        return data;
    }

    // aggregateBy === 'day'
    // Individual day bars
    const data: ChartDataPoint[] = [];
    const currentDate = new Date(dateRange.start);

    while (currentDate <= dateRange.end) {
        const dayName = DAY_NAMES_SHORT[currentDate.getDay()];
        const dayNum = currentDate.getDate();
        const monthName = MONTH_NAMES_SHORT[currentDate.getMonth()];
        const dateYear = currentDate.getFullYear();

        data.push({
            label: `${dayName} ${dayNum}`,
            tooltip: `${DAY_NAMES_SHORT[currentDate.getDay()]}, ${monthName} ${dayNum}, ${dateYear}`,
            liftingCount: 0,
            cardioCount: 0,
        });

        currentDate.setDate(currentDate.getDate() + 1);
    }

    // Count workouts for each day
    for (const workout of liftingWorkouts) {
        const dayIndex = Math.floor((workout.date.getTime() - dateRange.start.getTime()) / (24 * 60 * 60 * 1000));
        if (dayIndex >= 0 && dayIndex < data.length) {
            data[dayIndex].liftingCount++;
        }
    }

    for (const workout of cardioWorkouts) {
        const dayIndex = Math.floor((workout.date.getTime() - dateRange.start.getTime()) / (24 * 60 * 60 * 1000));
        if (dayIndex >= 0 && dayIndex < data.length) {
            data[dayIndex].cardioCount++;
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
