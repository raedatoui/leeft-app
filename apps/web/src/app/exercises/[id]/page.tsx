import type { Metadata } from 'next';
import { Suspense } from 'react';
import Loader from '@/components/common/loader';
import { fetchExerciseMap } from '@/lib/fetchData';
import ExercisePageV2 from '@/pageComponents/v2/exercisePageV2';

// Static section title: per-exercise names would re-fetch the artifact for every page at build.
export const metadata: Metadata = { title: 'Exercise' };

// No try/catch: a failed fetch must fail the build, not silently ship zero detail pages.
export async function generateStaticParams() {
    const exercises = await fetchExerciseMap();
    return Array.from(exercises.keys()).map((id) => ({ id }));
}

export default function Page() {
    return (
        <Suspense fallback={<Loader />}>
            <ExercisePageV2 />
        </Suspense>
    );
}
