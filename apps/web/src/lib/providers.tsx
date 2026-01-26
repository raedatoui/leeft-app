'use client';

import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { getUniqueValues } from '@/lib/exercises';
import { fetchCardioWorkouts, fetchCardioWorkoutsStrict, fetchCycles, fetchExerciseMap, fetchWorkouts } from '@/lib/fetchData';
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

// Helper to group workouts by day
function groupWorkoutsByDay(liftingWorkouts: Workout[], cardioWorkouts: CardioWorkout[]): DayWorkout[] {
    const dayWorkoutsMap = new Map<string, { lifting: Workout[]; cardio: CardioWorkout[] }>();

    // Add lifting workouts
    for (const w of liftingWorkouts) {
        const dateKey = w.date.toISOString().slice(0, 10); // YYYY-MM-DD
        const existing = dayWorkoutsMap.get(dateKey) || { lifting: [], cardio: [] };
        existing.lifting.push(w);
        dayWorkoutsMap.set(dateKey, existing);
    }

    // Add cardio workouts
    for (const c of cardioWorkouts) {
        const dateKey = c.date.toISOString().slice(0, 10); // YYYY-MM-DD
        const existing = dayWorkoutsMap.get(dateKey) || { lifting: [], cardio: [] };
        existing.cardio.push(c);
        dayWorkoutsMap.set(dateKey, existing);
    }

    // Convert to DayWorkout array and sort
    return Array.from(dayWorkoutsMap.entries())
        .map(([dateKey, { lifting, cardio: cardioList }]) => ({
            date: new Date(dateKey),
            liftingWorkouts: lifting.sort((a, b) => a.date.getTime() - b.date.getTime()),
            cardioWorkouts: cardioList.sort((a, b) => a.date.getTime() - b.date.getTime()),
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function WorkoutProvider({ children }: WorkoutProviderProps) {
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [cardioWorkouts, setCardioWorkouts] = useState<CardioWorkout[]>([]);
    const [cardioWorkoutsStrict, setCardioWorkoutsStrict] = useState<CardioWorkout[]>([]);
    const [allWorkouts, setAllWorkouts] = useState<DayWorkout[]>([]);
    const [allWorkoutsStrict, setAllWorkoutsStrict] = useState<DayWorkout[]>([]);
    const [exerciseMap, setExerciseMap] = useState<ExerciseMap>(new Map());
    const [cycles, setCycles] = useState<MappedCycle[]>([]);
    const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [equipmentList, setEquipmentList] = useState<string[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Strict mode toggle - default to strict (more accurate)
    const [useStrictCardio, setUseStrictCardio] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch all data in parallel (including both cardio versions)
                const [wo, cardio, cardioStrict, m, cy] = await Promise.all([
                    fetchWorkouts(),
                    fetchCardioWorkouts(),
                    fetchCardioWorkoutsStrict(),
                    fetchExerciseMap(),
                    fetchCycles(),
                ]);

                // 1. Extract unique values and canonicalize muscle groups
                const { muscleGroups: uniqueGroups, categories: uniqueCategories, equipmentList: uniqueEquipment } = getUniqueValues(m);

                const canonicalMuscleGroups = uniqueGroups.map((name, index) => ({
                    id: name.toLowerCase().replace(/\s+/g, '-'),
                    name,
                    color: PALETTE[index % PALETTE.length] ?? '#888888',
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

                // Group workouts by day for both permissive and strict
                const combined = groupWorkoutsByDay(wo, cardio);
                const combinedStrict = groupWorkoutsByDay(wo, cardioStrict);

                setWorkouts(wo);
                setCardioWorkouts(cardio);
                setCardioWorkoutsStrict(cardioStrict);
                setAllWorkouts(combined);
                setAllWorkoutsStrict(combinedStrict);
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

    // Compute active workouts based on strict mode toggle
    const activeCardioWorkouts = useMemo(() => {
        return useStrictCardio ? cardioWorkoutsStrict : cardioWorkouts;
    }, [useStrictCardio, cardioWorkouts, cardioWorkoutsStrict]);

    const activeAllWorkouts = useMemo(() => {
        return useStrictCardio ? allWorkoutsStrict : allWorkouts;
    }, [useStrictCardio, allWorkouts, allWorkoutsStrict]);

    const value = {
        workouts,
        cardioWorkouts,
        cardioWorkoutsStrict,
        allWorkouts,
        allWorkoutsStrict,
        exerciseMap,
        muscleGroups,
        categories,
        equipmentList,
        cycles,
        isLoading,
        error,
        // Strict mode
        useStrictCardio,
        setUseStrictCardio,
        activeCardioWorkouts,
        activeAllWorkouts,
    };

    return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export default function Providers({ children }: ProvidersProps) {
    return <WorkoutProvider>{children}</WorkoutProvider>;
}
