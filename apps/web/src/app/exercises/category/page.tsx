'use client';

import { useMemo } from 'react';
import ExerciseGroupList from '@/components/exerciseGroupList';
import { useWorkouts } from '@/lib/contexts';

export default function CategoryPage() {
    const { exerciseMap, isLoading, error } = useWorkouts();

    const groups = useMemo(() => {
        const counts = new Map<string, number>();

        exerciseMap.forEach((ex) => {
            const category = ex.category;
            if (category) {
                counts.set(category, (counts.get(category) || 0) + 1);
            }
        });

        return Array.from(counts.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [exerciseMap]);

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;

    return <ExerciseGroupList title="Categories" items={groups} baseUrl="/exercises/category" />;
}
