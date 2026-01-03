'use client';

import { Dumbbell } from 'lucide-react';
import { useState } from 'react';
import { ControlCard } from '@/components/controlCard';
import PageTemplate from '@/components/pageTemplate';
import { TopExercisesList } from '@/components/topExercisesList';
import { WorkoutStatsGrid } from '@/components/workoutStatsGrid';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useWorkouts } from '@/lib/contexts';
import { computeStats } from '@/lib/utils';
import type { ExerciseMap, Workout } from '@/types';

// ... (existing helper functions: groupByMonth, formatMonthYear, MonthlyStats) ...

const groupByMonth = (workouts: Workout[]) => {
    return workouts.reduce(
        (acc, workout) => {
            const yearMonth = `${workout.date.getUTCFullYear()}-${(workout.date.getUTCMonth() + 1).toString().padStart(2, '0')}`;
            if (!acc[yearMonth]) acc[yearMonth] = [];
            acc[yearMonth].push(workout);
            return acc;
        },
        {} as Record<string, Workout[]>
    );
};

const formatMonthYear = (yearMonth: string) => {
    const [year, month] = yearMonth.split('-');
    const date = new Date(Number.parseInt(year, 10), Number.parseInt(month, 10) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const MonthlyStats = ({
    yearMonth,
    workouts,
    exerciseMap,
    includeWarmup,
}: {
    yearMonth: string;
    workouts: Workout[];
    exerciseMap: ExerciseMap;
    includeWarmup: boolean;
}) => {
    const { workoutCount, avgExercises, topExercises } = computeStats(workouts);
    const totalVolume = workouts.reduce((sum, w) => sum + (includeWarmup ? w.volume : w.workVolume) || 0, 0);
    const avgVolume = totalVolume / workoutCount;

    return (
        <Card className="bg-black transition-all duration-300 w-full h-full hover:scale-[1.02] hover:shadow-none">
            <CardContent className="py-3 px-3 sm:px-4 space-y-4 flex flex-col h-full">
                <div className="flex flex-col gap-4">
                    <h3 className="text-lg sm:text-xl font-bold text-primary">{formatMonthYear(yearMonth)}</h3>
                    <WorkoutStatsGrid workoutCount={workoutCount} avgExercises={avgExercises} avgVolume={avgVolume} />
                </div>

                <TopExercisesList exercises={topExercises} exerciseMap={exerciseMap} limit={5} />
            </CardContent>
        </Card>
    );
};

export default function WorkoutAnalysis() {
    const { workouts, exerciseMap, isLoading, error } = useWorkouts();
    const [includeWarmup, setIncludeWarmup] = useState(true);

    if (isLoading) return <div>Loading...</div>;

    if (error) return <div>Error: {error.message}</div>;

    const groupedWorkouts = groupByMonth(workouts);

    const sortedMonths = Object.keys(groupedWorkouts).sort();

    const totalVolume = workouts.reduce((sum, w) => sum + (includeWarmup ? w.volume : w.workVolume) || 0, 0);

    const dateRange = {
        start: new Date(Math.min(...workouts.map((w) => w.date.getTime()))),

        end: new Date(Math.max(...workouts.map((w) => w.date.getTime()))),
    };

    return (
        <PageTemplate
            title="Monthly Analysis"
            stickyHeader={
                <div className="flex flex-col gap-4">
                    {/* Controls */}
                    <ControlCard className="w-full">
                        <div className="grid grid-cols-2 lg:flex lg:items-center lg:justify-center gap-3 sm:gap-6">
                            <div className="text-center">
                                <div className="text-xl sm:text-2xl font-bold text-primary">{workouts.length}</div>
                                <div className="text-xs text-muted-foreground">Total Workouts</div>
                            </div>

                            <div className="text-center">
                                <div className="text-xl sm:text-2xl font-bold text-primary">
                                    {totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                                <div className="text-xs text-muted-foreground">Total Volume</div>
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

                            <div className="text-center col-span-2 lg:col-span-1">
                                <div className="text-xs sm:text-sm font-medium text-primary">
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
                {sortedMonths.reverse().map((yearMonth) => (
                    <MonthlyStats
                        key={yearMonth}
                        yearMonth={yearMonth}
                        workouts={groupedWorkouts[yearMonth]}
                        exerciseMap={exerciseMap}
                        includeWarmup={includeWarmup}
                    />
                ))}
            </div>
        </PageTemplate>
    );
}
