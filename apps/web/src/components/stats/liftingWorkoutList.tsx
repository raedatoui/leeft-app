'use client';

import { Dumbbell, Heart } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DayCard from '@/components/workouts/dayCard';
import { formatNumber } from '@/lib/statsUtils';
import { cn } from '@/lib/utils';
import type { CardioWorkout, DayWorkout, ExerciseMap, Workout } from '@/types';

interface WorkoutListProps {
    liftingWorkouts: Workout[];
    cardioWorkouts: CardioWorkout[];
    exerciseMap: ExerciseMap;
    dateRangeLabel?: string | null;
}

type CombinedWorkout = { type: 'lifting'; workout: Workout; date: Date } | { type: 'cardio'; workout: CardioWorkout; date: Date };

function formatDate(date: Date): string {
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDuration(minutes: number): string {
    if (minutes < 60) {
        return `${Math.round(minutes)} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export default function WorkoutList({ liftingWorkouts, cardioWorkouts, exerciseMap, dateRangeLabel }: WorkoutListProps) {
    const [selectedWorkout, setSelectedWorkout] = useState<CombinedWorkout | null>(null);

    const combinedWorkouts = useMemo(() => {
        const lifting: CombinedWorkout[] = liftingWorkouts.map((w) => ({ type: 'lifting', workout: w, date: w.date }));
        const cardio: CombinedWorkout[] = cardioWorkouts.map((w) => ({ type: 'cardio', workout: w, date: w.date }));
        return [...lifting, ...cardio].sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [liftingWorkouts, cardioWorkouts]);

    const totalCount = liftingWorkouts.length + cardioWorkouts.length;

    // Build DayWorkout for selected workout
    const selectedDayWorkout: DayWorkout | null = useMemo(() => {
        if (!selectedWorkout) return null;
        if (selectedWorkout.type === 'lifting') {
            return {
                date: selectedWorkout.workout.date,
                liftingWorkouts: [selectedWorkout.workout],
                cardioWorkouts: [],
            };
        }
        return {
            date: selectedWorkout.workout.date,
            liftingWorkouts: [],
            cardioWorkouts: [selectedWorkout.workout],
        };
    }, [selectedWorkout]);

    const getWorkoutKey = (item: CombinedWorkout) => {
        return item.type === 'lifting' ? item.workout.uuid : item.workout.uuid;
    };

    const isSelected = (item: CombinedWorkout) => {
        if (!selectedWorkout) return false;
        return getWorkoutKey(item) === getWorkoutKey(selectedWorkout);
    };

    if (totalCount === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Workouts</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-center py-8">No workouts in this period</CardContent>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Workout list */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg">
                        Workouts ({totalCount})
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                            {liftingWorkouts.length} lifting, {cardioWorkouts.length} cardio
                        </span>
                        {dateRangeLabel && <span className="block text-sm font-medium text-primary mt-1">{dateRangeLabel}</span>}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                    <div className="divide-y divide-border">
                        {combinedWorkouts.map((item) => {
                            const selected = isSelected(item);
                            if (item.type === 'lifting') {
                                const workout = item.workout;
                                return (
                                    <button
                                        type="button"
                                        key={workout.uuid}
                                        onClick={() => setSelectedWorkout(selected ? null : item)}
                                        className={cn(
                                            'flex items-center gap-4 py-3 w-full text-left transition-colors',
                                            'hover:bg-muted/50 -mx-2 px-2 rounded',
                                            selected && 'bg-primary/10 hover:bg-primary/15'
                                        )}
                                    >
                                        <Dumbbell className="h-4 w-4 text-amber-500 shrink-0" />
                                        <div className="flex-1 grid grid-cols-4 gap-4 items-center text-sm">
                                            <span className="font-medium">{formatDate(workout.date)}</span>
                                            <span className="text-muted-foreground">
                                                <span className="text-foreground font-medium">{formatNumber(workout.volume)}</span> lbs
                                            </span>
                                            <span className="text-muted-foreground">{formatDuration(workout.duration)}</span>
                                            <span className="text-muted-foreground">
                                                RPE: <span className="text-foreground font-medium">{workout.rpe !== null ? workout.rpe : '-'}</span>
                                            </span>
                                        </div>
                                    </button>
                                );
                            }
                            const workout = item.workout;
                            return (
                                <button
                                    type="button"
                                    key={workout.uuid}
                                    onClick={() => setSelectedWorkout(selected ? null : item)}
                                    className={cn(
                                        'flex items-center gap-4 py-3 w-full text-left transition-colors',
                                        'hover:bg-muted/50 -mx-2 px-2 rounded',
                                        selected && 'bg-primary/10 hover:bg-primary/15'
                                    )}
                                >
                                    <Heart className="h-4 w-4 text-blue-500 shrink-0" />
                                    <div className="flex-1 grid grid-cols-4 gap-4 items-center text-sm">
                                        <span className="font-medium">{formatDate(workout.date)}</span>
                                        <span className="text-muted-foreground">
                                            <span className="text-foreground font-medium">{workout.type}</span>
                                        </span>
                                        <span className="text-muted-foreground">{formatDuration(workout.durationMin)}</span>
                                        <span className="text-muted-foreground">
                                            {workout.calories ? (
                                                <>
                                                    <span className="text-foreground font-medium">{workout.calories}</span> cal
                                                </>
                                            ) : (
                                                '-'
                                            )}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Day card detail */}
            {selectedDayWorkout ? (
                <DayCard dayWorkout={selectedDayWorkout} exerciseMap={exerciseMap} miniMode={false} />
            ) : (
                <Card className="flex items-center justify-center">
                    <CardContent className="text-muted-foreground text-center py-8">Click a workout to see details</CardContent>
                </Card>
            )}
        </div>
    );
}
