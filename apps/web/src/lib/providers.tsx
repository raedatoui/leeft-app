'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { fetchCycles, fetchExerciseMap, fetchWorkouts } from '@/lib/fetchData';
import type { ExerciseMap, MappedCycle, Workout } from '@/types';
import { WorkoutContext } from './contexts';

interface ProvidersProps {
    children: React.ReactNode;
}

interface WorkoutProviderProps {
    children: React.ReactNode;
}

export function WorkoutProvider({ children }: WorkoutProviderProps) {
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [exerciseMap, setExerciseMap] = useState<ExerciseMap>(new Map());
    const [cycles, setCycles] = useState<MappedCycle[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch workouts
                const wo = await fetchWorkouts();

                // Fetch exercise metadata
                const m = await fetchExerciseMap();

                // Fetch cycles
                const cy = await fetchCycles();
                const mappedCycles = cy.map((i) => ({
                    ...i,
                    workouts: wo.filter((w) => i.workouts?.includes(w.uuid)),
                }));

                setWorkouts(wo);
                setExerciseMap(m);
                setCycles(mappedCycles);
                setIsLoading(false);
            } catch (e) {
                setError(e instanceof Error ? e : new Error('An error occurred fetching data'));
                setIsLoading(false);
            }
        }

        fetchData();
    }, []); // Empty dependency array means this runs once on mount

    const value = {
        workouts,
        exerciseMap,
        cycles,
        isLoading,
        error,
    };

    return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export default function Providers({ children }: ProvidersProps) {
    return <WorkoutProvider>{children}</WorkoutProvider>;
}
