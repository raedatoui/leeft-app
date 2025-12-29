import { Suspense } from 'react';
import FilteredExerciseList from '@/components/filteredExerciseList';
import { fetchExerciseMap } from '@/lib/fetchData';

export async function generateStaticParams() {
    try {
        const exercises = await fetchExerciseMap();
        const categories = new Set<string>();
        exercises.forEach((ex) => {
            if (ex.category) {
                categories.add(ex.category);
            }
        });
        return Array.from(categories).map((cat) => ({ cat }));
    } catch (error) {
        console.error('Error generating static params:', error);
        return [];
    }
}

export default function Page() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <FilteredExerciseList type="category" />
        </Suspense>
    );
}
