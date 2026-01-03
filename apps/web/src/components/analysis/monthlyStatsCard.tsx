import { TopExercisesList } from '@/components/analysis/topExercisesList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkoutStatsGrid } from '@/components/workouts/workoutStatsGrid';
import { cn, computeStats } from '@/lib/utils';
import type { ExerciseMap, Workout } from '@/types';

interface MonthlyStatsCardProps {
    yearMonth: string;
    workouts: Workout[];
    exerciseMap: ExerciseMap;
    includeWarmup: boolean;
    className?: string;
}

const formatMonthYear = (yearMonth: string) => {
    const [year, month] = yearMonth.split('-');
    const date = new Date(Number.parseInt(year, 10), Number.parseInt(month, 10) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

export function MonthlyStatsCard({ yearMonth, workouts, exerciseMap, includeWarmup, className }: MonthlyStatsCardProps) {
    const { workoutCount, avgExercises, topExercises } = computeStats(workouts);
    const totalVolume = workouts.reduce((sum, w) => sum + (includeWarmup ? w.volume : w.workVolume) || 0, 0);
    const avgVolume = totalVolume / workoutCount;

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
                            {formatMonthYear(yearMonth)}
                        </CardTitle>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-2 pt-0 relative">
                <div className="space-y-2">
                    <WorkoutStatsGrid workoutCount={workoutCount} avgExercises={avgExercises} avgVolume={avgVolume} />
                </div>

                <TopExercisesList exercises={topExercises} exerciseMap={exerciseMap} limit={5} />
            </CardContent>
        </Card>
    );
}
