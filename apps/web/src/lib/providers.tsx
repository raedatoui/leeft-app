'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { getUniqueValues } from '@/lib/exercises';
import { fetchCycles, fetchExerciseMap, fetchWorkouts } from '@/lib/fetchData';
import type { ExerciseMap, MappedCycle, Workout } from '@/types';
import { type MuscleGroup, WorkoutContext } from './contexts';

interface ProvidersProps {
    children: React.ReactNode;
}

interface WorkoutProviderProps {
    children: React.ReactNode;
}

const PALETTE = [
    '#FF5252', // Red
    '#2196F3', // Blue
    '#4CAF50', // Green
    '#FF9800', // Orange
    '#9C27B0', // Purple
    '#00BCD4', // Cyan
    '#E91E63', // Pink
    '#795548', // Brown
    '#607D8B', // Blue Grey
    '#3F51B5', // Indigo
    '#009688', // Teal
];

export function WorkoutProvider({ children }: WorkoutProviderProps) {
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [exerciseMap, setExerciseMap] = useState<ExerciseMap>(new Map());
    const [cycles, setCycles] = useState<MappedCycle[]>([]);
    const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [equipmentList, setEquipmentList] = useState<string[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch workouts
                const wo = await fetchWorkouts();

                // Fetch exercise metadata
                const m = await fetchExerciseMap();

                // 1. Extract unique values and canonicalize muscle groups
                const { muscleGroups: uniqueGroups, categories: uniqueCategories, equipmentList: uniqueEquipment } = getUniqueValues(m);

                const canonicalMuscleGroups = uniqueGroups.map((name, index) => ({
                    id: name.toLowerCase().replace(/\s+/g, '-'),
                    name,
                    color: PALETTE[index % PALETTE.length],
                }));

                // 2. Update exerciseMap with originalMuscleGroup and primaryMuscleGroup as ID
                const updatedExerciseMap = new Map();
                for (const [id, ex] of m.entries()) {
                    const muscleGroupName = ex.primaryMuscleGroup;
                    const muscleGroupId = muscleGroupName.toLowerCase().replace(/\s+/g, '-');
                    updatedExerciseMap.set(id, {
                        ...ex,
                        originalMuscleGroup: muscleGroupName,
                        primaryMuscleGroup: muscleGroupId,
                    });
                }

                // Fetch cycles
                const cy = await fetchCycles();
                const mappedCycles = cy.map((i) => ({
                    ...i,
                    workouts: wo.filter((w) => i.workouts?.includes(w.uuid)),
                }));

                setWorkouts(wo);
                setExerciseMap(updatedExerciseMap);
                setMuscleGroups(canonicalMuscleGroups);
                setCategories(uniqueCategories);
                setEquipmentList(uniqueEquipment);
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
        muscleGroups,
        categories,
        equipmentList,
        cycles,
        isLoading,
        error,
    };

    return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export default function Providers({ children }: ProvidersProps) {
    return <WorkoutProvider>{children}</WorkoutProvider>;
}
