'use client';

import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { getUniqueValues } from '@/lib/exercises';
import { fetchCardioWorkouts, fetchCardioWorkoutsStrict, fetchCycles, fetchExerciseMap, fetchWorkouts } from '@/lib/fetchData';
import { CardioSettingsContext, type MuscleGroup, WorkoutDataContext, type WorkoutDataContextType } from './contexts';

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
    const [data, setData] = useState<WorkoutDataContextType | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [useStrictCardio, setUseStrictCardio] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [wo, cardio, cardioStrict, m, cy] = await Promise.all([
                    fetchWorkouts(),
                    fetchCardioWorkouts(),
                    fetchCardioWorkoutsStrict(),
                    fetchExerciseMap(),
                    fetchCycles(),
                ]);

                const { muscleGroups: uniqueGroups, categories: uniqueCategories, equipmentList: uniqueEquipment } = getUniqueValues(m);

                const canonicalMuscleGroups: MuscleGroup[] = uniqueGroups.map((name, index) => ({
                    id: name.toLowerCase().replace(/\s+/g, '-'),
                    name,
                    color: PALETTE[index % PALETTE.length] ?? '#888888',
                }));

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

                const mappedCycles = cy.map((i) => ({
                    ...i,
                    workouts: wo.filter((w) => i.workouts?.includes(w.uuid)),
                }));

                setData({
                    workouts: wo,
                    cardioWorkouts: cardio,
                    cardioWorkoutsStrict: cardioStrict,
                    exerciseMap: updatedExerciseMap,
                    muscleGroups: canonicalMuscleGroups,
                    categories: uniqueCategories,
                    equipmentList: uniqueEquipment,
                    cycles: mappedCycles,
                });
            } catch (e) {
                setError(e instanceof Error ? e : new Error('An error occurred fetching data'));
            }
        }

        fetchData();
    }, []);

    const cardioSettingsValue = useMemo(() => ({ useStrictCardio, setUseStrictCardio }), [useStrictCardio]);

    if (error) return <div className="p-8 text-center text-red-500">Error: {error.message}</div>;
    if (!data) return <div className="p-8 text-center">Loading...</div>;

    return (
        <WorkoutDataContext.Provider value={data}>
            <CardioSettingsContext.Provider value={cardioSettingsValue}>{children}</CardioSettingsContext.Provider>
        </WorkoutDataContext.Provider>
    );
}

export default function Providers({ children }: ProvidersProps) {
    return <WorkoutProvider>{children}</WorkoutProvider>;
}
