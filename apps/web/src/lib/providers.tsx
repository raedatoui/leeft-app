'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { getUniqueValues } from '@/lib/exercises';
import { fetchCardioWorkouts, fetchCycles, fetchExerciseMap, fetchWorkouts } from '@/lib/fetchData';
import type { CardioWorkout, DayWorkout, ExerciseMap, MappedCycle, Workout } from '@/types';
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
    const [cardioWorkouts, setCardioWorkouts] = useState<CardioWorkout[]>([]);
    const [allWorkouts, setAllWorkouts] = useState<DayWorkout[]>([]);
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
                // Fetch all data in parallel
                const [wo, cardio, m, cy] = await Promise.all([fetchWorkouts(), fetchCardioWorkouts(), fetchExerciseMap(), fetchCycles()]);

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

                // Map cycles
                const mappedCycles = cy.map((i) => ({
                    ...i,
                    workouts: wo.filter((w) => i.workouts?.includes(w.uuid)),
                }));

                // Group all workouts by date (same day)
                const dayWorkoutsMap = new Map<string, { lifting: Workout[]; cardio: CardioWorkout[] }>();

                // Add lifting workouts
                for (const w of wo) {
                    const dateKey = w.date.toISOString().split('T')[0]; // YYYY-MM-DD
                    const existing = dayWorkoutsMap.get(dateKey) || { lifting: [], cardio: [] };
                    existing.lifting.push(w);
                    dayWorkoutsMap.set(dateKey, existing);
                }

                // Add cardio workouts
                for (const c of cardio) {
                    const dateKey = c.date.toISOString().split('T')[0]; // YYYY-MM-DD
                    const existing = dayWorkoutsMap.get(dateKey) || { lifting: [], cardio: [] };
                    existing.cardio.push(c);
                    dayWorkoutsMap.set(dateKey, existing);
                }

                // Convert to DayWorkout array and sort
                const combined: DayWorkout[] = Array.from(dayWorkoutsMap.entries())
                    .map(([dateKey, { lifting, cardio: cardioList }]) => ({
                        date: new Date(dateKey),
                        // Sort lifting by date/time
                        liftingWorkouts: lifting.sort((a, b) => a.date.getTime() - b.date.getTime()),
                        // Sort cardio by time within day
                        cardioWorkouts: cardioList.sort((a, b) => a.date.getTime() - b.date.getTime()),
                    }))
                    .sort((a, b) => a.date.getTime() - b.date.getTime());

                setWorkouts(wo);
                setCardioWorkouts(cardio);
                setAllWorkouts(combined);
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
        cardioWorkouts,
        allWorkouts,
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
