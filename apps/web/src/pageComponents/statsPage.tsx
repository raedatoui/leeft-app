'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CardioModeToggle } from '@/components/common/cardioModeToggle';
import { ControlCard } from '@/components/common/controlCard';
import PageTemplate from '@/components/layout/pageTemplate';
import WorkoutList from '@/components/stats/liftingWorkoutList';
import OverviewStats from '@/components/stats/overviewStats';
import dynamic from 'next/dynamic';

const WorkoutBreakdownChart = dynamic(() => import('@/components/stats/workoutBreakdownChart'), { ssr: false });
import { Button } from '@/components/ui/button';
import { useActiveCardio, useWorkoutData } from '@/lib/contexts';
import { type AggregateBy, aggregateForChart, type ChartDataPoint, computeOverviewStats, filterCardioWorkoutsByDateRange } from '@/lib/statsUtils';
import { filterWorkoutsByDateRange } from '@/lib/utils';

const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function StatsPage() {
    const { workouts, exerciseMap } = useWorkoutData();
    const cardioWorkouts = useActiveCardio();

    // Date filter state
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
    const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
    const [listFilter, setListFilter] = useState<{ start: Date; end: Date; label: string } | null>(null);
    const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);

    // Chart aggregation state (separate from date filter)
    const [aggregateBy, setAggregateBy] = useState<AggregateBy>('month');

    // Compute available years from all workouts (descending)
    const years = useMemo(() => {
        const yearSet = new Set<number>();
        workouts.forEach((w) => {
            yearSet.add(w.date.getFullYear());
        });
        cardioWorkouts.forEach((w) => {
            yearSet.add(w.date.getFullYear());
        });
        return Array.from(yearSet).sort((a, b) => b - a);
    }, [workouts, cardioWorkouts]);

    // Get months that have workouts for the selected year
    // const availableMonths = useMemo(() => {
    //     const monthSet = new Set<number>();
    //     workouts.forEach((w) => {
    //         if (w.date.getFullYear() === selectedYear) {
    //             monthSet.add(w.date.getMonth());
    //         }
    //     });
    //     cardioWorkouts.forEach((w) => {
    //         if (w.date.getFullYear() === selectedYear) {
    //             monthSet.add(w.date.getMonth());
    //         }
    //     });
    //     return Array.from(monthSet).sort((a, b) => a - b);
    // }, [workouts, cardioWorkouts, selectedYear]);

    // Get weeks within selected month
    // const availableWeeks = useMemo(() => {
    //     if (selectedMonth === null) return [];
    //     const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    //     const totalWeeks = Math.ceil(daysInMonth / 7);
    //     return Array.from({ length: totalWeeks }, (_, i) => i + 1);
    // }, [selectedYear, selectedMonth]);

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
        const defaultOption = aggregationOptions[0];
        if (!aggregationOptions.includes(aggregateBy) && defaultOption) {
            setAggregateBy(defaultOption);
        }
    }, [aggregationOptions, aggregateBy]);

    // Year navigation
    const goToPrevYear = () => {
        const idx = years.indexOf(selectedYear);
        const prevYear = years[idx + 1];
        if (prevYear !== undefined) {
            setSelectedYear(prevYear);
            setSelectedMonth(null);
            setSelectedWeek(null);
            setListFilter(null);
            setSelectedBarIndex(null);
            setAggregateBy('month');
        }
    };

    const goToNextYear = () => {
        const idx = years.indexOf(selectedYear);
        const nextYear = years[idx - 1];
        if (nextYear !== undefined) {
            setSelectedYear(nextYear);
            setSelectedMonth(null);
            setSelectedWeek(null);
            setListFilter(null);
            setSelectedBarIndex(null);
            setAggregateBy('month');
        }
    };

    // Chart drill-down handler - toggle bar selection
    const handleChartClick = (point: ChartDataPoint, index: number) => {
        if (selectedBarIndex === index) {
            // Clicking same bar - deselect
            setSelectedBarIndex(null);
            setListFilter(null);
        } else if (point.dateRange) {
            // Select new bar
            setSelectedBarIndex(index);
            setListFilter({
                start: point.dateRange.start,
                end: point.dateRange.end,
                label: point.tooltip, // Use full date range from tooltip
            });
        }
    };

    // Reset view handler
    const resetView = () => {
        // If we have a list filter, clear it first
        if (listFilter) {
            setListFilter(null);
            setSelectedBarIndex(null);
            return;
        }
        // Otherwise reset drill-down
        setSelectedMonth(null);
        setSelectedWeek(null);
        setSelectedBarIndex(null);
        setAggregateBy('month');
    };

    // Compute date range for CHART (based on year/month/week selections)
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

    // Compute date range for LIST (respecting listFilter if set)
    const listDateRange = useMemo(() => {
        if (listFilter) {
            return { start: listFilter.start, end: listFilter.end };
        }
        return dateRange;
    }, [listFilter, dateRange]);

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

    // Filter workouts by LIST date range
    const filteredLiftingWorkouts = useMemo(() => {
        return filterWorkoutsByDateRange(workouts, listDateRange.start, listDateRange.end);
    }, [workouts, listDateRange]);

    const filteredCardioWorkouts = useMemo(() => {
        return filterCardioWorkoutsByDateRange(cardioWorkouts, listDateRange.start, listDateRange.end);
    }, [cardioWorkouts, listDateRange]);

    // Compute total workouts for the CURRENT SELECTED YEAR (for averages)
    const yearStats = useMemo(() => {
        const lifting = workouts.filter((w) => w.date.getFullYear() === selectedYear).length;
        const cardio = cardioWorkouts.filter((w) => w.date.getFullYear() === selectedYear).length;
        return { total: lifting + cardio };
    }, [workouts, cardioWorkouts, selectedYear]);

    // Compute stats based on LIST range (but add averages based on year)
    const stats = useMemo(() => {
        const baseStats = computeOverviewStats(filteredLiftingWorkouts, filteredCardioWorkouts);

        let averageWorkouts: { label: string; value: string } | undefined;

        if (aggregateBy === 'month') {
            averageWorkouts = {
                label: 'Avg / Month',
                value: (yearStats.total / 12).toFixed(1),
            };
        } else if (aggregateBy === 'week') {
            averageWorkouts = {
                label: 'Avg / Week',
                value: (yearStats.total / 52).toFixed(1),
            };
        }

        return {
            ...baseStats,
            averageWorkouts,
        };
    }, [filteredLiftingWorkouts, filteredCardioWorkouts, aggregateBy, yearStats]);

    // Chart data uses the CHART date range (so it shows the whole week even if a day is selected)
    // But we need to filter the workouts passed to aggregateForChart to match the chart range
    const chartLiftingWorkouts = useMemo(() => {
        return filterWorkoutsByDateRange(workouts, dateRange.start, dateRange.end);
    }, [workouts, dateRange]);

    const chartCardioWorkouts = useMemo(() => {
        return filterCardioWorkoutsByDateRange(cardioWorkouts, dateRange.start, dateRange.end);
    }, [cardioWorkouts, dateRange]);

    const chartData = useMemo(() => {
        return aggregateForChart(chartLiftingWorkouts, chartCardioWorkouts, aggregateBy, dateRange);
    }, [chartLiftingWorkouts, chartCardioWorkouts, aggregateBy, dateRange]);

    return (
        <PageTemplate
            title="Overview"
            stickyHeader={
                <div className="flex flex-col gap-4">
                    <ControlCard className="w-full">
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                                {/* Year selector */}
                                <div className="flex items-center gap-3 shrink-0">
                                    <h2 className="text-3xl font-black tracking-tight text-primary leading-none">{selectedYear}</h2>
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

                                {/* Chart aggregation control */}
                                {aggregationOptions.length > 1 && (
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium text-muted-foreground">Group</span>
                                        <div className="flex items-center gap-1">
                                            {aggregationOptions.map((option) => (
                                                <Button
                                                    key={option}
                                                    onClick={() => {
                                                        setAggregateBy(option);
                                                        setSelectedBarIndex(null);
                                                        setListFilter(null);
                                                    }}
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

                                {/* Cardio mode toggle */}
                                <CardioModeToggle showCounts={false} />

                                {/* Active Filter Display / Reset */}
                                {(selectedMonth !== null || listFilter !== null) && (
                                    <div className="flex items-center gap-2 ml-auto">
                                        <span className="text-sm font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                                            {monthLabel}
                                            {weekLabel ? ` • ${weekLabel.split(',')[0]}` : ''}
                                            {listFilter ? ` • ${listFilter.label}` : ''}
                                        </span>
                                        <Button
                                            onClick={resetView}
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                        >
                                            Reset
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </ControlCard>

                    {/* Stats */}
                    <OverviewStats stats={stats} />
                </div>
            }
        >
            <div className="space-y-6 mt-4">
                {/* Chart */}
                <WorkoutBreakdownChart
                    data={chartData}
                    aggregateBy={aggregateBy}
                    dateRange={dateRange}
                    onPointClick={handleChartClick}
                    selectedIndex={selectedBarIndex}
                />

                {/* Workouts list */}
                <WorkoutList
                    liftingWorkouts={filteredLiftingWorkouts}
                    cardioWorkouts={filteredCardioWorkouts}
                    exerciseMap={exerciseMap}
                    dateRangeLabel={listFilter?.label}
                />
            </div>
        </PageTemplate>
    );
}
