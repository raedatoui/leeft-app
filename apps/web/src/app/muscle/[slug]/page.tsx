import type { Metadata } from 'next';
import { Suspense } from 'react';
import Loader from '@/components/common/loader';
import { getUniqueValues, muscleGroupSlug } from '@/lib/exercises';
import { fetchExerciseMap } from '@/lib/fetchData';
import MuscleGroupPageV2 from '@/pageComponents/v2/muscleGroupPageV2';

// The slug is a readable muscle-group name — no fetch needed for the title.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    return { title: slug.charAt(0).toUpperCase() + slug.slice(1) };
}

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
