import { Suspense } from 'react';
import Loader from '@/components/common/loader';
import { getUniqueValues, muscleGroupSlug } from '@/lib/exercises';
import { fetchExerciseMap } from '@/lib/fetchData';
import MuscleGroupPageV2 from '@/pageComponents/v2/muscleGroupPageV2';

// No try/catch: a failed fetch must fail the build, not silently ship zero detail pages.
export async function generateStaticParams() {
    const exercises = await fetchExerciseMap();
    const { muscleGroups } = getUniqueValues(exercises);
    return muscleGroups.map((name) => ({ slug: muscleGroupSlug(name) }));
}

export default function Page() {
    return (
        <Suspense fallback={<Loader />}>
            <MuscleGroupPageV2 />
        </Suspense>
    );
}
