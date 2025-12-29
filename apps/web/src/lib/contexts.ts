'use client';

import React from 'react';
import type { ExerciseMap, MappedCycle, Workout } from '@/types';

interface WorkoutContextType {
    workouts: Workout[];
    exerciseMap: ExerciseMap;
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
