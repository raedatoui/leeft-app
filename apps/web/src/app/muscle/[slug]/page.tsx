import { Suspense } from 'react';
import Loader from '@/components/common/loader';
import { getUniqueValues, muscleGroupSlug } from '@/lib/exercises';
import { fetchExerciseMap } from '@/lib/fetchData';
import MuscleGroupPageV2 from '@/pageComponents/v2/muscleGroupPageV2';

export async function generateStaticParams() {
    try {
        const exercises = await fetchExerciseMap();
        const { muscleGroups } = getUniqueValues(exercises);
        return muscleGroups.map((name) => ({ slug: muscleGroupSlug(name) }));
    } catch (error) {
        console.error('Error generating static params:', error);
        return [];
    }
}

export default function Page() {
    return (
        <Suspense fallback={<Loader />}>
            <MuscleGroupPageV2 />
        </Suspense>
    );
}
