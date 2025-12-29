'use client';

import { useMemo } from 'react';
import ExerciseGroupList from '@/components/exerciseGroupList';
import { useWorkouts } from '@/lib/contexts';

export default function MuscleGroupPage() {
    const { exerciseMap, isLoading, error } = useWorkouts();

    const groups = useMemo(() => {
        const counts = new Map<string, number>();

        exerciseMap.forEach((ex) => {
            const group = ex.primaryMuscleGroup;
            if (group) {
                counts.set(group, (counts.get(group) || 0) + 1);
            }
        });

        return Array.from(counts.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [exerciseMap]);

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;

    return <ExerciseGroupList title="Muscle Groups" items={groups} baseUrl="/exercises/muscle" />;
}
