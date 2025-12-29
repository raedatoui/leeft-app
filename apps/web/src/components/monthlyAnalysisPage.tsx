'use client';

import Link from 'next/link';
import PageTemplate from '@/components/pageTemplate';
import { Card, CardContent } from '@/components/ui/card';
import { useWorkouts } from '@/lib/contexts';
import { computeStats } from '@/lib/utils';
import type { ExerciseMap, Workout } from '@/types';

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

const MonthlyStats = ({ yearMonth, workouts, exerciseMap }: { yearMonth: string; workouts: Workout[]; exerciseMap: ExerciseMap }) => {
    const { workoutCount, avgExercises, topExercises } = computeStats(workouts);
    const totalVolume = workouts.reduce((sum, w) => sum + (w.volume || 0), 0);
    const avgVolume = totalVolume / workoutCount;

    return (
        <Card className="bg-black hover:border-primary/50 hover:shadow-lg transition-all w-full max-w-[750px]">
            <CardContent className="py-3 px-3 sm:px-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h3 className="text-lg sm:text-xl font-bold text-primary">{formatMonthYear(yearMonth)}</h3>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-zinc-900/50 rounded-lg p-2 sm:p-3 border border-zinc-800">
                            <div className="text-xl sm:text-2xl font-bold">{workoutCount}</div>
                            <div className="text-xs text-muted-foreground">Workouts</div>
                        </div>
                        <div className="bg-zinc-900/50 rounded-lg p-2 sm:p-3 border border-zinc-800">
                            <div className="text-xl sm:text-2xl font-bold">{avgExercises.toFixed(1)}</div>
                            <div className="text-xs text-muted-foreground">Avg exercises</div>
                        </div>
                        <div className="bg-zinc-900/50 rounded-lg p-2 sm:p-3 border border-zinc-800">
                            <div className="text-xl sm:text-2xl font-bold">{avgVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                            <div className="text-xs text-muted-foreground">Avg Volume</div>
                        </div>
                    </div>
                </div>

                <div>
                    <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <span>Top exercises</span>
                        <div className="flex-1 h-px bg-zinc-800" />
                    </div>
                    <ul className="space-y-2">
                        {topExercises.slice(0, 5).map((ex) => (
                            <li key={ex.id} className="flex items-start gap-2 text-sm">
                                <span className="text-muted-foreground mt-0.5">→</span>
                                <div className="flex-1">
                                    <Link href={`/exercise/${ex.id}`} className="font-semibold hover:text-primary transition-colors">
                                        {exerciseMap.get(ex.id.toString())?.name || 'Unknown'}
                                    </Link>
                                    <div className="text-xs text-muted-foreground">
                                        {ex.count} times • max {ex.maxWeight}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
};

export default function WorkoutAnalysis() {
    const { workouts, exerciseMap, isLoading, error } = useWorkouts();
    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;

    const groupedWorkouts = groupByMonth(workouts);
    const sortedMonths = Object.keys(groupedWorkouts).sort();

    const totalVolume = workouts.reduce((sum, w) => sum + (w.volume || 0), 0);
    const dateRange = {
        start: new Date(Math.min(...workouts.map((w) => w.date.getTime()))),
        end: new Date(Math.max(...workouts.map((w) => w.date.getTime()))),
    };

    return (
        <PageTemplate>
            <div className="flex flex-col gap-4">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row items-start lg:items-start justify-between gap-4">
                    <div className="w-full lg:w-auto">
                        <h2 className="text-2xl sm:text-4xl font-bold text-primary text-center md:text-left">Monthly Analysis</h2>
                    </div>
                    <Card className="w-full lg:w-auto">
                        <CardContent className="py-2 px-3 sm:px-4">
                            <div className="grid grid-cols-2 lg:flex lg:items-center gap-3 sm:gap-6">
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
                        </CardContent>
                    </Card>
                </div>

                {/* Monthly Breakdown */}
                <div className="flex flex-col items-center gap-4">
                    {sortedMonths.reverse().map((yearMonth) => (
                        <MonthlyStats key={yearMonth} yearMonth={yearMonth} workouts={groupedWorkouts[yearMonth]} exerciseMap={exerciseMap} />
                    ))}
                </div>
            </div>
        </PageTemplate>
    );
}
