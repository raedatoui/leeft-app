'use client';

import React, { useMemo } from 'react';
import type { CardioWorkout, DayWorkout, ExerciseMap, MappedCycle, MobilityMovement, Workout } from '@/types';

export interface MuscleGroup {
    id: string;
    name: string;
    color: string;
}

// WorkoutDataContext — immutable after load
export interface WorkoutDataContextType {
    workouts: Workout[];
    cardioWorkouts: CardioWorkout[];
    exerciseMap: ExerciseMap;
    muscleGroups: MuscleGroup[];
    categories: string[];
    equipmentList: string[];
    cycles: MappedCycle[];
    mobilityMovements: MobilityMovement[];
}

export const WorkoutDataContext = React.createContext<WorkoutDataContextType | null>(null);

export function useWorkoutData(): WorkoutDataContextType {
    const context = React.useContext(WorkoutDataContext);
    if (!context) {
        throw new Error('useWorkoutData must be used within a WorkoutProvider');
    }
    return context;
}

export function useActiveCardio(): CardioWorkout[] {
    const { cardioWorkouts } = useWorkoutData();
    return cardioWorkouts;
}

export function useActiveAllWorkouts(): DayWorkout[] {
    const { workouts, cardioWorkouts } = useWorkoutData();
    return useMemo(() => groupWorkoutsByDay(workouts, cardioWorkouts), [workouts, cardioWorkouts]);
}

export function startTime(w: { startedAt?: Date; date: Date }): number {
    return (w.startedAt ?? w.date).getTime();
}

// Helper to group workouts by day
export function groupWorkoutsByDay(liftingWorkouts: Workout[], cardioWorkouts: CardioWorkout[]): DayWorkout[] {
    const dayWorkoutsMap = new Map<string, { lifting: Workout[]; cardio: CardioWorkout[] }>();

    for (const w of liftingWorkouts) {
        const dateKey = w.date.toISOString().slice(0, 10);
        const existing = dayWorkoutsMap.get(dateKey) || { lifting: [], cardio: [] };
        existing.lifting.push(w);
        dayWorkoutsMap.set(dateKey, existing);
    }

    for (const c of cardioWorkouts) {
        const dateKey = c.date.toISOString().slice(0, 10);
        const existing = dayWorkoutsMap.get(dateKey) || { lifting: [], cardio: [] };
        existing.cardio.push(c);
        dayWorkoutsMap.set(dateKey, existing);
    }

    return Array.from(dayWorkoutsMap.entries())
        .map(([dateKey, { lifting, cardio: cardioList }]) => ({
            date: new Date(dateKey),
            liftingWorkouts: lifting.sort((a, b) => startTime(a) - startTime(b)),
            cardioWorkouts: cardioList.sort((a, b) => startTime(a) - startTime(b)),
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());
}
