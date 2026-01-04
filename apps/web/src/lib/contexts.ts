'use client';

import React from 'react';
import type { ExerciseMap, MappedCycle, Workout } from '@/types';

export interface MuscleGroup {
    id: string;
    name: string;
    color: string;
}

interface WorkoutContextType {
    workouts: Workout[];
    exerciseMap: ExerciseMap;
    muscleGroups: MuscleGroup[];
    categories: string[];
    equipmentList: string[];
    cycles: MappedCycle[];
    isLoading: boolean;
    error: Error | null;
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
