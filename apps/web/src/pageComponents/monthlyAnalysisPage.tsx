'use client';

import { Dumbbell } from 'lucide-react';
import { useMemo, useState } from 'react';
import { MonthlyStatsCard } from '@/components/analysis/monthlyStatsCard';
import { CardioModeToggle } from '@/components/common/cardioModeToggle';
import { ControlCard } from '@/components/common/controlCard';
import PageTemplate from '@/components/layout/pageTemplate';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useWorkouts } from '@/lib/contexts';

const groupByMonth = <T extends { date: Date }>(items: T[]) => {
    return items.reduce(
        (acc, item) => {
            const yearMonth = `${item.date.getUTCFullYear()}-${(item.date.getUTCMonth() + 1).toString().padStart(2, '0')}`;
            if (!acc[yearMonth]) acc[yearMonth] = [];
            acc[yearMonth].push(item);
            return acc;
        },
        {} as Record<string, T[]>
    );
};

export default function WorkoutAnalysis() {
    const { workouts, activeCardioWorkouts, exerciseMap, isLoading, error } = useWorkouts();
    const [includeWarmup, setIncludeWarmup] = useState(true);

    // Compute grouped data
    const { groupedWorkouts, groupedCardio, sortedMonths, totalVolume, totalCardioHours, totalZoneMinutes, dateRange } = useMemo(() => {
        const grouped = groupByMonth(workouts);
        const cardioGrouped = groupByMonth(activeCardioWorkouts);

        // Get all unique months from both lifting and cardio (newest first)
        const allMonths = new Set([...Object.keys(grouped), ...Object.keys(cardioGrouped)]);
        const sorted = Array.from(allMonths).sort().reverse();

        const volume = workouts.reduce((sum, w) => sum + (includeWarmup ? w.volume : w.workVolume) || 0, 0);

        const cardioHours = activeCardioWorkouts.reduce((sum, w) => sum + w.durationMin, 0) / 60;
        const zoneMinutes = activeCardioWorkouts.reduce((sum, w) => sum + (w.zoneMinutes || 0), 0);

        // Date range from all workouts
        const allDates = [...workouts.map((w) => w.date.getTime()), ...activeCardioWorkouts.map((w) => w.date.getTime())];
        const range =
            allDates.length > 0
                ? {
                      start: new Date(Math.min(...allDates)),
                      end: new Date(Math.max(...allDates)),
                  }
                : { start: new Date(), end: new Date() };

        return {
            groupedWorkouts: grouped,
            groupedCardio: cardioGrouped,
            sortedMonths: sorted,
            totalVolume: volume,
            totalCardioHours: Math.round(cardioHours * 10) / 10,
            totalZoneMinutes: zoneMinutes,
            dateRange: range,
        };
    }, [workouts, activeCardioWorkouts, includeWarmup]);

    if (isLoading) return <div>Loading...</div>;

    if (error) return <div>Error: {error.message}</div>;

    return (
        <PageTemplate
            title="Monthly Analysis"
            stickyHeader={
                <div className="flex flex-col gap-4">
                    {/* Controls */}
                    <ControlCard className="w-full">
                        <div className="grid grid-cols-2 lg:flex lg:items-center lg:justify-center gap-3 sm:gap-6">
                            {/* Lifting stats */}
                            <div className="text-center">
                                <div className="text-xl sm:text-2xl font-bold text-primary">{workouts.length}</div>
                                <div className="text-xs text-muted-foreground">Lifting</div>
                            </div>

                            <div className="text-center">
                                <div className="text-xl sm:text-2xl font-bold text-primary">
                                    {totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                                <div className="text-xs text-muted-foreground">Volume</div>
                            </div>

                            <div className="flex items-center justify-center gap-2.5 text-xs font-bold uppercase tracking-tighter">
                                <Label htmlFor="warmup-mode" className="cursor-pointer">
                                    <Dumbbell className="h-4 w-4 text-muted-foreground" />
                                </Label>
                                <Switch
                                    id="warmup-mode"
                                    checked={!includeWarmup}
                                    onCheckedChange={(checked) => setIncludeWarmup(!checked)}
                                    className="scale-90"
                                />
                            </div>

                            {/* Cardio stats */}
                            <div className="h-6 w-px bg-border hidden lg:block" />

                            <div className="text-center">
                                <div className="text-xl sm:text-2xl font-bold text-cyan-400">{activeCardioWorkouts.length}</div>
                                <div className="text-xs text-muted-foreground">Cardio</div>
                            </div>

                            <div className="text-center">
                                <div className="text-xl sm:text-2xl font-bold text-blue-400">{totalCardioHours}h</div>
                                <div className="text-xs text-muted-foreground">Duration</div>
                            </div>

                            <div className="text-center">
                                <div className="text-xl sm:text-2xl font-bold text-yellow-400">{totalZoneMinutes.toLocaleString()}</div>
                                <div className="text-xs text-muted-foreground">Zone Min</div>
                            </div>

                            <div className="flex items-center justify-center">
                                <CardioModeToggle showCounts={false} />
                            </div>

                            {/* Date range */}
                            <div className="text-center col-span-2 lg:col-span-1">
                                <div className="text-xs sm:text-sm font-medium text-muted-foreground">
                                    <div className="hidden sm:block">
                                        {dateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} -{' '}
                                        {dateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>

                                    <div className="sm:hidden">
                                        {dateRange.start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} -{' '}
                                        {dateRange.end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ControlCard>
                </div>
            }
        >
            {/* Monthly Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {sortedMonths.map((yearMonth) => (
                    <MonthlyStatsCard
                        key={yearMonth}
                        yearMonth={yearMonth}
                        workouts={groupedWorkouts[yearMonth] || []}
                        cardioWorkouts={groupedCardio[yearMonth] || []}
                        exerciseMap={exerciseMap}
                        includeWarmup={includeWarmup}
                    />
                ))}
            </div>
        </PageTemplate>
    );
}
