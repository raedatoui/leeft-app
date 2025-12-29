'use client';

import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import ExerciseList from '@/components/exerciseList';
import { useWorkouts } from '@/lib/contexts';

interface FilteredExerciseListProps {
    type: 'muscle' | 'equipment' | 'category';
}

export default function FilteredExerciseList({ type }: FilteredExerciseListProps) {
    const params = useParams();
    const { exerciseMap, isLoading, error } = useWorkouts();

    // Extract the dynamic parameter based on the type
    const paramValue = useMemo(() => {
        if (type === 'muscle') return params.group as string;
        if (type === 'equipment') return params.item as string;
        if (type === 'category') return params.cat as string;
        return '';
    }, [type, params]);

    const decodedValue = useMemo(() => (paramValue ? decodeURIComponent(paramValue) : ''), [paramValue]);

    const filteredExercises = useMemo(() => {
        if (!decodedValue) return [];

        const result = [];
        for (const ex of exerciseMap.values()) {
            let match = false;
            if (type === 'muscle') {
                match = ex.primaryMuscleGroup === decodedValue;
            } else if (type === 'category') {
                match = ex.category === decodedValue;
            } else if (type === 'equipment') {
                match = ex.equipment.includes(decodedValue);
            }

            if (match) {
                result.push(ex);
            }
        }
        return result.sort((a, b) => a.name.localeCompare(b.name));
    }, [exerciseMap, decodedValue, type]);

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;

    const parentUrl = `/exercises/${type}`;
    const parentLabel = type === 'muscle' ? 'Muscle Groups' : type === 'category' ? 'Categories' : 'Equipment';

    return <ExerciseList title={decodedValue} exercises={filteredExercises} parentUrl={parentUrl} parentLabel={parentLabel} />;
}
