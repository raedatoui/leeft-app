'use client';

import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import Loader from '@/components/common/loader';
import { AddWorkoutSessionProvider } from '@/lib/addWorkoutSession';
import { getUniqueValues, muscleGroupSlug } from '@/lib/exercises';
import { fetchCardioWorkouts, fetchCycles, fetchExerciseMap, fetchLatestTimestamp, fetchMobilityMovements, fetchWorkouts } from '@/lib/fetchData';
import { type MuscleGroup, WorkoutDataContext, type WorkoutDataContextType } from './contexts';

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

type WorkoutData = Omit<WorkoutDataContextType, 'refresh' | 'refreshing'>;

export function WorkoutProvider({ children }: WorkoutProviderProps) {
    const [data, setData] = useState<WorkoutData | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        const timestamp = await fetchLatestTimestamp();
        const [wo, cardio, m, cy, mobility] = await Promise.all([
            fetchWorkouts(timestamp),
            fetchCardioWorkouts(timestamp),
            fetchExerciseMap(timestamp),
            fetchCycles(timestamp),
            fetchMobilityMovements(timestamp),
        ]);

        const { muscleGroups: uniqueGroups, categories: uniqueCategories, equipmentList: uniqueEquipment } = getUniqueValues(m);

        const canonicalMuscleGroups: MuscleGroup[] = uniqueGroups.map((name, index) => ({
            id: muscleGroupSlug(name),
            name,
            color: PALETTE[index % PALETTE.length] ?? '#888888',
        }));

        const updatedExerciseMap = new Map();
        for (const [id, ex] of m.entries()) {
            const muscleGroupName = ex.primaryMuscleGroup;
            const muscleGroupId = muscleGroupSlug(muscleGroupName);
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
            exerciseMap: updatedExerciseMap,
            muscleGroups: canonicalMuscleGroups,
            categories: uniqueCategories,
            equipmentList: uniqueEquipment,
            cycles: mappedCycles,
            mobilityMovements: mobility,
        });
    }, []);

    const initialLoad = useCallback(() => {
        setError(null);
        loadData().catch((e) => {
            setError(e instanceof Error ? e : new Error('An error occurred fetching data'));
        });
    }, [loadData]);

    useEffect(() => {
        initialLoad();
    }, [initialLoad]);

    const refresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await loadData();
        } catch (e) {
            // keep showing the current data; the full-page error is for the initial load only
            console.warn('Data refresh failed', e);
        } finally {
            setRefreshing(false);
        }
    }, [loadData]);

    if (error)
        return (
            <div className="flex min-h-screen items-center justify-center px-6">
                <div className="text-center">
                    <p className="text-4xl">&#x26A0;</p>
                    <h1 className="mt-2 text-xl font-semibold" style={{ color: 'var(--fg)' }}>
                        Couldn&apos;t load workout data
                    </h1>
                    <p className="mt-1 text-sm" style={{ color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                        {error.message}
                    </p>
                    <button
                        type="button"
                        onClick={initialLoad}
                        className="mt-6 rounded-md px-4 py-2 text-sm font-medium"
                        style={{ background: 'var(--maint)', color: 'var(--bg)' }}
                    >
                        Try again
                    </button>
                </div>
            </div>
        );
    if (!data) return <Loader />;

    return <WorkoutDataContext.Provider value={{ ...data, refresh, refreshing }}>{children}</WorkoutDataContext.Provider>;
}

export default function Providers({ children }: ProvidersProps) {
    return (
        <AddWorkoutSessionProvider>
            <WorkoutProvider>{children}</WorkoutProvider>
        </AddWorkoutSessionProvider>
    );
}
