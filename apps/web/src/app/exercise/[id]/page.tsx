import { Suspense } from 'react';
import ExercisePage from '@/components/exercisePage';
import { fetchExerciseMap } from '@/lib/fetchData';

export async function generateStaticParams() {
    try {
        const exercises = await fetchExerciseMap();
        return Array.from(exercises.keys()).map((id) => ({ id }));
    } catch (error) {
        console.error('Error generating static params:', error);
        return [];
    }
}

export default function Page() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ExercisePage />
        </Suspense>
    );
}
