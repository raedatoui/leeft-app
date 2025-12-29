import { Suspense } from 'react';
import FilteredExerciseList from '@/components/filteredExerciseList';
import { fetchExerciseMap } from '@/lib/fetchData';

export async function generateStaticParams() {
    try {
        const exercises = await fetchExerciseMap();
        const groups = new Set<string>();
        exercises.forEach((ex) => {
            if (ex.primaryMuscleGroup) {
                groups.add(ex.primaryMuscleGroup);
            }
        });
        return Array.from(groups).map((group) => ({ group }));
    } catch (error) {
        console.error('Error generating static params:', error);
        return [];
    }
}

export default function Page() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <FilteredExerciseList type="muscle" />
        </Suspense>
    );
}
