'use client';

import React, { useMemo } from 'react';
import type { CardioWorkout, DayWorkout, ExerciseMap, MappedCycle, Workout } from '@/types';

export interface MuscleGroup {
    id: string;
    name: string;
    color: string;
}

// WorkoutDataContext — immutable after load
export interface WorkoutDataContextType {
    workouts: Workout[];
    cardioWorkouts: CardioWorkout[];
    cardioWorkoutsStrict: CardioWorkout[];
    exerciseMap: ExerciseMap;
    muscleGroups: MuscleGroup[];
    categories: string[];
    equipmentList: string[];
    cycles: MappedCycle[];
}

// CardioSettingsContext — changes on user toggle
export interface CardioSettingsContextType {
    useStrictCardio: boolean;
    setUseStrictCardio: (value: boolean) => void;
}

export const WorkoutDataContext = React.createContext<WorkoutDataContextType | null>(null);
export const CardioSettingsContext = React.createContext<CardioSettingsContextType | null>(null);

export function useWorkoutData(): WorkoutDataContextType {
    const context = React.useContext(WorkoutDataContext);
    if (!context) {
        throw new Error('useWorkoutData must be used within a WorkoutProvider');
    }
    return context;
}

export function useCardioSettings(): CardioSettingsContextType {
    const context = React.useContext(CardioSettingsContext);
    if (!context) {
        throw new Error('useCardioSettings must be used within a WorkoutProvider');
    }
    return context;
}

export function useActiveCardio(): CardioWorkout[] {
    const { cardioWorkouts, cardioWorkoutsStrict } = useWorkoutData();
    const { useStrictCardio } = useCardioSettings();
    return useMemo(() => (useStrictCardio ? cardioWorkoutsStrict : cardioWorkouts), [useStrictCardio, cardioWorkouts, cardioWorkoutsStrict]);
}

export function useActiveAllWorkouts(): DayWorkout[] {
    const { workouts, cardioWorkouts, cardioWorkoutsStrict } = useWorkoutData();
    const { useStrictCardio } = useCardioSettings();
    return useMemo(
        () => groupWorkoutsByDay(workouts, useStrictCardio ? cardioWorkoutsStrict : cardioWorkouts),
        [workouts, useStrictCardio, cardioWorkouts, cardioWorkoutsStrict]
    );
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
            liftingWorkouts: lifting.sort((a, b) => a.date.getTime() - b.date.getTime()),
            cardioWorkouts: cardioList.sort((a, b) => a.date.getTime() - b.date.getTime()),
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());
}
