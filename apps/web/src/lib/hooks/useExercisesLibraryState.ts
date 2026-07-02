'use client';

import { useMemo, useState } from 'react';
import { type MuscleGroup, useWorkoutData } from '@/lib/contexts';
import type { ExerciseMap, ExerciseMetadata } from '@/types';

export interface ExercisesHeadlineStats {
    count: number;
    muscleCount: number;
    categoryCount: number;
    equipmentCount: number;
}

export interface ExerciseUsageStats {
    sessionCount: number;
    setCount: number;
    maxWeight: number;
    volume: number;
}

export interface ExercisesLibraryState {
    muscleFilter: string;
    setMuscleFilter: (val: string) => void;
    categoryFilter: string;
    setCategoryFilter: (val: string) => void;
    equipmentFilter: string;
    setEquipmentFilter: (val: string) => void;
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    filteredExercises: ExerciseMetadata[];
    headlineStats: ExercisesHeadlineStats;
    muscleGroups: MuscleGroup[];
    categories: string[];
    equipmentList: string[];
    exerciseMap: ExerciseMap;
    statsByExerciseId: Map<number, ExerciseUsageStats>;
}

export interface UseExercisesLibraryStateOptions {
    initialMuscleFilter?: string;
    initialCategoryFilter?: string;
    initialEquipmentFilter?: string;
    initialSearchQuery?: string;
}

export function useExercisesLibraryState(opts: UseExercisesLibraryStateOptions = {}): ExercisesLibraryState {
    const { exerciseMap, muscleGroups, categories, equipmentList, workouts } = useWorkoutData();
    const [muscleFilter, setMuscleFilter] = useState(opts.initialMuscleFilter ?? 'all');
    const [categoryFilter, setCategoryFilter] = useState(opts.initialCategoryFilter ?? 'all');
    const [equipmentFilter, setEquipmentFilter] = useState(opts.initialEquipmentFilter ?? 'all');
    const [searchQuery, setSearchQuery] = useState(opts.initialSearchQuery ?? '');

    const filteredExercises = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return Array.from(exerciseMap.values())
            .filter((ex) => {
                const matchesMuscle = muscleFilter === 'all' || ex.primaryMuscleGroup === muscleFilter;
                const matchesCategory = categoryFilter === 'all' || ex.category === categoryFilter;
                const matchesEquipment = equipmentFilter === 'all' || ex.equipment?.includes(equipmentFilter);
                const matchesSearch = q === '' || ex.name.toLowerCase().includes(q);
                return matchesMuscle && matchesCategory && matchesEquipment && matchesSearch;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [exerciseMap, muscleFilter, categoryFilter, equipmentFilter, searchQuery]);

    const headlineStats = useMemo<ExercisesHeadlineStats>(() => {
        const muscles = new Set<string>();
        const cats = new Set<string>();
        const equips = new Set<string>();

        for (const ex of filteredExercises) {
            if (ex.primaryMuscleGroup) muscles.add(ex.primaryMuscleGroup);
            if (ex.category) cats.add(ex.category);
            if (ex.equipment) {
                for (const eq of ex.equipment) {
                    equips.add(eq);
                }
            }
        }

        return {
            count: filteredExercises.length,
            muscleCount: muscles.size,
            categoryCount: cats.size,
            equipmentCount: equips.size,
        };
    }, [filteredExercises]);

    const statsByExerciseId = useMemo(() => {
        const map = new Map<number, ExerciseUsageStats>();
        for (const w of workouts) {
            for (const ex of w.exercises) {
                if (ex.sets.length === 0) continue;
                const entry = map.get(ex.exerciseId) ?? { sessionCount: 0, setCount: 0, maxWeight: 0, volume: 0 };
                entry.sessionCount += 1;
                entry.volume += ex.workVolume;
                for (const s of ex.sets) {
                    if (s.isWorkSet) entry.setCount += 1;
                    if (s.weight > entry.maxWeight) entry.maxWeight = s.weight;
                }
                map.set(ex.exerciseId, entry);
            }
        }
        return map;
    }, [workouts]);

    return {
        muscleFilter,
        setMuscleFilter,
        categoryFilter,
        setCategoryFilter,
        equipmentFilter,
        setEquipmentFilter,
        searchQuery,
        setSearchQuery,
        filteredExercises,
        headlineStats,
        muscleGroups,
        categories,
        equipmentList,
        exerciseMap,
        statsByExerciseId,
    };
}
