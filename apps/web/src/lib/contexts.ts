'use client';

import React from 'react';
import type { CardioWorkout, DayWorkout, ExerciseMap, MappedCycle, Workout } from '@/types';

export interface MuscleGroup {
    id: string;
    name: string;
    color: string;
}

interface WorkoutContextType {
    workouts: Workout[];
    cardioWorkouts: CardioWorkout[];
    cardioWorkoutsStrict: CardioWorkout[];
    allWorkouts: DayWorkout[];
    allWorkoutsStrict: DayWorkout[];
    exerciseMap: ExerciseMap;
    muscleGroups: MuscleGroup[];
    categories: string[];
    equipmentList: string[];
    cycles: MappedCycle[];
    isLoading: boolean;
    error: Error | null;
    // Strict mode toggle
    useStrictCardio: boolean;
    setUseStrictCardio: (value: boolean) => void;
    // Computed values based on strict mode
    activeCardioWorkouts: CardioWorkout[];
    activeAllWorkouts: DayWorkout[];
}

const WorkoutContext = React.createContext<WorkoutContextType | undefined>(undefined);

export function useWorkouts() {
    const context = React.useContext(WorkoutContext);
    if (!context) {
        throw new Error('useWorkouts must be used within a WorkoutProvider');
    }
    return context;
}

export { WorkoutContext };
