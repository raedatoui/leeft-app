import { Suspense } from 'react';
import Loader from '@/components/common/loader';
import { fetchExerciseMap } from '@/lib/fetchData';
import ExercisePageV2 from '@/pageComponents/v2/exercisePageV2';

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
        <Suspense fallback={<Loader />}>
            <ExercisePageV2 />
        </Suspense>
    );
}
