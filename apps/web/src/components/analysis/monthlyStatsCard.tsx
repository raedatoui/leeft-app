import { Timer } from 'lucide-react';
import { TopExercisesList } from '@/components/analysis/topExercisesList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkoutStatsGrid } from '@/components/workouts/workoutStatsGrid';
import { cardioColors, cardioIcons } from '@/lib/cardio-theme';
import { cn, computeStats, formatYearMonth } from '@/lib/utils';
import type { CardioType, CardioWorkout, ExerciseMap, Workout } from '@/types';

interface MonthlyStatsCardProps {
    yearMonth: string;
    workouts: Workout[];
    cardioWorkouts?: CardioWorkout[];
    exerciseMap: ExerciseMap;
    includeWarmup: boolean;
    className?: string;
}

function computeCardioStats(cardioWorkouts: CardioWorkout[]) {
    if (cardioWorkouts.length === 0) {
        return { count: 0, totalHours: 0, avgDuration: 0, totalZoneMinutes: 0, typeCounts: {} as Record<CardioType, number> };
    }

    const totalDurationMin = cardioWorkouts.reduce((sum, w) => sum + w.durationMin, 0);
    const typeCounts = cardioWorkouts.reduce(
        (acc, w) => {
            acc[w.type] = (acc[w.type] || 0) + 1;
            return acc;
        },
        {} as Record<CardioType, number>
    );

    return {
        count: cardioWorkouts.length,
        totalHours: Math.round((totalDurationMin / 60) * 10) / 10,
        avgDuration: Math.round(totalDurationMin / cardioWorkouts.length),
        totalZoneMinutes: cardioWorkouts.reduce((sum, w) => sum + (w.zoneMinutes || 0), 0),
        typeCounts,
    };
}

export function MonthlyStatsCard({ yearMonth, workouts, cardioWorkouts = [], exerciseMap, includeWarmup, className }: MonthlyStatsCardProps) {
    const { workoutCount, avgExercises, topExercises } = computeStats(workouts);
    const totalVolume = workouts.reduce((sum, w) => sum + (includeWarmup ? w.volume : w.workVolume) || 0, 0);
    const avgVolume = totalVolume / workoutCount;
    const cardioStats = computeCardioStats(cardioWorkouts);

    // Get top 3 cardio types by count
    const topCardioTypes = Object.entries(cardioStats.typeCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3) as [CardioType, number][];

    return (
        <Card
            className={cn('bg-black relative overflow-hidden group transition-all duration-300', 'hover:shadow-none hover:scale-[1.02]', className)}
        >
            {/* Subtle gradient overlay - using a neutral/primary default since we don't have cycle types */}
            <div
                className={cn(
                    'absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-300 bg-gradient-to-br from-primary/20 to-transparent'
                )}
            />

            <CardHeader className="pb-3 relative">
                <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-primary text-lg sm:text-xl font-bold flex items-center gap-2 group-hover:text-primary transition-colors">
                            {formatYearMonth(yearMonth)}
                        </CardTitle>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-3 pt-0 relative">
                {/* Lifting Stats */}
                {workoutCount > 0 && (
                    <div className="space-y-2">
                        <WorkoutStatsGrid workoutCount={workoutCount} avgExercises={avgExercises} avgVolume={avgVolume} />
                        <TopExercisesList exercises={topExercises} exerciseMap={exerciseMap} limit={5} />
                    </div>
                )}

                {/* Cardio Stats */}
                {cardioStats.count > 0 && (
                    <div className="space-y-2">
                        {workoutCount > 0 && <div className="border-t border-zinc-800 pt-3" />}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-zinc-900/50 rounded-lg p-2 border border-zinc-800 text-center">
                                <div className="text-xl font-bold text-cyan-400">{cardioStats.count}</div>
                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Cardio</div>
                            </div>
                            <div className="bg-zinc-900/50 rounded-lg p-2 border border-zinc-800 text-center">
                                <div className="text-xl font-bold text-blue-400">{cardioStats.totalHours}h</div>
                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Duration</div>
                            </div>
                            <div className="bg-zinc-900/50 rounded-lg p-2 border border-zinc-800 text-center">
                                <div className="text-xl font-bold text-yellow-400">{cardioStats.totalZoneMinutes.toLocaleString()}</div>
                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Zone Min</div>
                            </div>
                        </div>

                        {/* Top cardio types */}
                        {topCardioTypes.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                                {topCardioTypes.map(([type, count]) => {
                                    const Icon = cardioIcons[type] || Timer;
                                    const color = cardioColors[type] || '#888888';
                                    return (
                                        <div
                                            key={type}
                                            className="flex items-center gap-1.5 text-xs bg-zinc-900/50 rounded-full px-2 py-1 border border-zinc-800"
                                        >
                                            <Icon className="h-3 w-3" style={{ color }} />
                                            <span className="text-muted-foreground">{type}</span>
                                            <span className="font-bold" style={{ color }}>
                                                {count}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Empty state */}
                {workoutCount === 0 && cardioStats.count === 0 && (
                    <div className="text-center text-muted-foreground py-4 text-sm">No workouts this month</div>
                )}
            </CardContent>
        </Card>
    );
}
