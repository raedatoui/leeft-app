'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ControlCard } from '@/components/common/controlCard';
import PageTemplate from '@/components/layout/pageTemplate';
import WorkoutList from '@/components/overview/liftingWorkoutList';
import OverviewStats from '@/components/overview/overviewStats';
import WorkoutBreakdownChart from '@/components/overview/workoutBreakdownChart';
import { Button } from '@/components/ui/button';
import { useWorkouts } from '@/lib/contexts';
import { aggregateForChart, computeOverviewStats, filterCardioWorkoutsByDateRange, type AggregateBy } from '@/lib/overview-utils';
import { filterWorkoutsByDateRange } from '@/lib/utils';

const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function OverviewPage() {
    const { workouts, cardioWorkouts, exerciseMap, isLoading, error } = useWorkouts();

    // Date filter state
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
    const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

    // Chart aggregation state (separate from date filter)
    const [aggregateBy, setAggregateBy] = useState<AggregateBy>('month');

    // Compute available years from all workouts (descending)
    const years = useMemo(() => {
        const yearSet = new Set<number>();
        workouts.forEach((w) => yearSet.add(w.date.getFullYear()));
        cardioWorkouts.forEach((w) => yearSet.add(w.date.getFullYear()));
        return Array.from(yearSet).sort((a, b) => b - a);
    }, [workouts, cardioWorkouts]);

    // Get months that have workouts for the selected year
    const availableMonths = useMemo(() => {
        const monthSet = new Set<number>();
        workouts.forEach((w) => {
            if (w.date.getFullYear() === selectedYear) {
                monthSet.add(w.date.getMonth());
            }
        });
        cardioWorkouts.forEach((w) => {
            if (w.date.getFullYear() === selectedYear) {
                monthSet.add(w.date.getMonth());
            }
        });
        return Array.from(monthSet).sort((a, b) => a - b);
    }, [workouts, cardioWorkouts, selectedYear]);

    // Get weeks within selected month
    const availableWeeks = useMemo(() => {
        if (selectedMonth === null) return [];
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const totalWeeks = Math.ceil(daysInMonth / 7);
        return Array.from({ length: totalWeeks }, (_, i) => i + 1);
    }, [selectedYear, selectedMonth]);

    // Determine current view level
    const viewLevel = useMemo(() => {
        if (selectedWeek !== null) return 'week';
        if (selectedMonth !== null) return 'month';
        return 'year';
    }, [selectedMonth, selectedWeek]);

    // Available aggregation options based on view level
    const aggregationOptions = useMemo((): AggregateBy[] => {
        switch (viewLevel) {
            case 'year':
                return ['month', 'week', 'day'];
            case 'month':
                return ['week', 'day'];
            case 'week':
                return ['day']; // Week always shows days
        }
    }, [viewLevel]);

    // Reset aggregation when it's no longer valid for the view level
    useMemo(() => {
        if (!aggregationOptions.includes(aggregateBy)) {
            setAggregateBy(aggregationOptions[0]);
        }
    }, [aggregationOptions, aggregateBy]);

    // Year navigation
    const goToPrevYear = () => {
        const idx = years.indexOf(selectedYear);
        if (idx < years.length - 1) {
            setSelectedYear(years[idx + 1]);
            setSelectedMonth(null);
            setSelectedWeek(null);
            setAggregateBy('month');
        }
    };

    const goToNextYear = () => {
        const idx = years.indexOf(selectedYear);
        if (idx > 0) {
            setSelectedYear(years[idx - 1]);
            setSelectedMonth(null);
            setSelectedWeek(null);
            setAggregateBy('month');
        }
    };

    // Month navigation
    const goToPrevMonth = () => {
        if (selectedMonth === null) {
            if (availableMonths.length > 0) {
                setSelectedMonth(availableMonths[availableMonths.length - 1]);
                setSelectedWeek(null);
                setAggregateBy('week');
            }
            return;
        }
        const idx = availableMonths.indexOf(selectedMonth);
        if (idx > 0) {
            setSelectedMonth(availableMonths[idx - 1]);
            setSelectedWeek(null);
        }
    };

    const goToNextMonth = () => {
        if (selectedMonth === null) {
            if (availableMonths.length > 0) {
                setSelectedMonth(availableMonths[0]);
                setSelectedWeek(null);
                setAggregateBy('week');
            }
            return;
        }
        const idx = availableMonths.indexOf(selectedMonth);
        if (idx < availableMonths.length - 1) {
            setSelectedMonth(availableMonths[idx + 1]);
            setSelectedWeek(null);
        }
    };

    // Week navigation
    const goToPrevWeek = () => {
        if (selectedWeek === null) {
            if (availableWeeks.length > 0) {
                setSelectedWeek(availableWeeks[availableWeeks.length - 1]);
                setAggregateBy('day');
            }
            return;
        }
        if (selectedWeek > 1) {
            setSelectedWeek(selectedWeek - 1);
        }
    };

    const goToNextWeek = () => {
        if (selectedWeek === null) {
            if (availableWeeks.length > 0) {
                setSelectedWeek(1);
                setAggregateBy('day');
            }
            return;
        }
        if (selectedWeek < availableWeeks.length) {
            setSelectedWeek(selectedWeek + 1);
        }
    };

    // Compute date range based on selections
    const dateRange = useMemo(() => {
        if (selectedMonth !== null && selectedWeek !== null) {
            const startDay = (selectedWeek - 1) * 7 + 1;
            const endDay = Math.min(selectedWeek * 7, new Date(selectedYear, selectedMonth + 1, 0).getDate());
            const start = new Date(selectedYear, selectedMonth, startDay, 0, 0, 0, 0);
            const end = new Date(selectedYear, selectedMonth, endDay, 23, 59, 59, 999);
            return { start, end };
        }
        if (selectedMonth !== null) {
            const start = new Date(selectedYear, selectedMonth, 1);
            const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);
            return { start, end };
        }
        const start = new Date(selectedYear, 0, 1);
        const end = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
        return { start, end };
    }, [selectedYear, selectedMonth, selectedWeek]);

    // Format labels
    const monthLabel = useMemo(() => {
        if (selectedMonth === null) return null;
        const monthName = MONTH_NAMES_FULL[selectedMonth];
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        return `${monthName} 1-${daysInMonth}, ${selectedYear}`;
    }, [selectedYear, selectedMonth]);

    const weekLabel = useMemo(() => {
        if (selectedMonth === null || selectedWeek === null) return null;
        const startDay = (selectedWeek - 1) * 7 + 1;
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const endDay = Math.min(selectedWeek * 7, daysInMonth);
        const monthName = MONTH_NAMES_FULL[selectedMonth];
        return `${monthName} ${startDay}-${endDay}, ${selectedYear}`;
    }, [selectedYear, selectedMonth, selectedWeek]);

    // Filter workouts by date range
    const filteredLiftingWorkouts = useMemo(() => {
        return filterWorkoutsByDateRange(workouts, dateRange.start, dateRange.end);
    }, [workouts, dateRange]);

    const filteredCardioWorkouts = useMemo(() => {
        return filterCardioWorkoutsByDateRange(cardioWorkouts, dateRange.start, dateRange.end);
    }, [cardioWorkouts, dateRange]);

    // Compute stats and chart data
    const stats = useMemo(
        () => computeOverviewStats(filteredLiftingWorkouts, filteredCardioWorkouts),
        [filteredLiftingWorkouts, filteredCardioWorkouts]
    );

    const chartData = useMemo(() => {
        return aggregateForChart(filteredLiftingWorkouts, filteredCardioWorkouts, aggregateBy, dateRange);
    }, [filteredLiftingWorkouts, filteredCardioWorkouts, aggregateBy, dateRange]);

    if (isLoading) return <div className="p-8 text-center">Loading...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Error: {error.message}</div>;

    return (
        <PageTemplate
            title="Overview"
            stickyHeader={
                <div className="flex flex-col gap-4">
                    <ControlCard className="w-full">
                        <div className="flex flex-col gap-4">
                            {/* Year selector */}
                            <div className="flex items-center gap-3">
                                <h2 className="text-3xl font-black tracking-tight text-primary">{selectedYear}</h2>
                                <div className="h-6 w-px bg-border mx-2" />
                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={goToPrevYear}
                                        disabled={selectedYear === Math.min(...years)}
                                        size="icon"
                                        variant="outline"
                                        className="h-8 w-8 rounded-full"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        onClick={goToNextYear}
                                        disabled={selectedYear === Math.max(...years)}
                                        size="icon"
                                        variant="outline"
                                        className="h-8 w-8 rounded-full"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Month filter */}
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-muted-foreground w-14">Month</span>
                                <Button
                                    onClick={() => {
                                        setSelectedMonth(null);
                                        setSelectedWeek(null);
                                        setAggregateBy('month');
                                    }}
                                    variant={selectedMonth === null ? 'default' : 'outline'}
                                    size="sm"
                                    className="h-7 px-3 text-xs"
                                >
                                    All
                                </Button>
                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={goToPrevMonth}
                                        disabled={availableMonths.length === 0 || (selectedMonth !== null && availableMonths.indexOf(selectedMonth) === 0)}
                                        size="icon"
                                        variant="outline"
                                        className="h-7 w-7 rounded-full"
                                    >
                                        <ChevronLeft className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        onClick={goToNextMonth}
                                        disabled={availableMonths.length === 0 || (selectedMonth !== null && availableMonths.indexOf(selectedMonth) === availableMonths.length - 1)}
                                        size="icon"
                                        variant="outline"
                                        className="h-7 w-7 rounded-full"
                                    >
                                        <ChevronRight className="h-3 w-3" />
                                    </Button>
                                </div>
                                {monthLabel && <span className="text-sm font-medium">{monthLabel}</span>}
                            </div>

                            {/* Week filter (only when month is selected) */}
                            {selectedMonth !== null && (
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-muted-foreground w-14">Week</span>
                                    <Button
                                        onClick={() => {
                                            setSelectedWeek(null);
                                            setAggregateBy('week');
                                        }}
                                        variant={selectedWeek === null ? 'default' : 'outline'}
                                        size="sm"
                                        className="h-7 px-3 text-xs"
                                    >
                                        All
                                    </Button>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            onClick={goToPrevWeek}
                                            disabled={availableWeeks.length === 0 || (selectedWeek !== null && selectedWeek === 1)}
                                            size="icon"
                                            variant="outline"
                                            className="h-7 w-7 rounded-full"
                                        >
                                            <ChevronLeft className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            onClick={goToNextWeek}
                                            disabled={availableWeeks.length === 0 || (selectedWeek !== null && selectedWeek === availableWeeks.length)}
                                            size="icon"
                                            variant="outline"
                                            className="h-7 w-7 rounded-full"
                                        >
                                            <ChevronRight className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    {weekLabel && <span className="text-sm font-medium">{weekLabel}</span>}
                                </div>
                            )}

                            {/* Chart aggregation control */}
                            {aggregationOptions.length > 1 && (
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-muted-foreground w-14">Group</span>
                                    <div className="flex items-center gap-1">
                                        {aggregationOptions.map((option) => (
                                            <Button
                                                key={option}
                                                onClick={() => setAggregateBy(option)}
                                                variant={aggregateBy === option ? 'default' : 'outline'}
                                                size="sm"
                                                className="h-7 px-3 text-xs capitalize"
                                            >
                                                {option}s
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </ControlCard>

                    {/* Stats */}
                    <OverviewStats stats={stats} />
                </div>
            }
        >
            <div className="space-y-6 mt-4">
                {/* Chart */}
                <WorkoutBreakdownChart data={chartData} aggregateBy={aggregateBy} dateRange={dateRange} />

                {/* Workouts list */}
                <WorkoutList liftingWorkouts={filteredLiftingWorkouts} cardioWorkouts={filteredCardioWorkouts} exerciseMap={exerciseMap} />
            </div>
        </PageTemplate>
    );
}
