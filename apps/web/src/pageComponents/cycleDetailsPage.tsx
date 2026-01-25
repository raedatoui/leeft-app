'use client';

import { useMemo } from 'react';
import CycleDetailView from '@/components/cycles/detail';
import CycleHeader from '@/components/cycles/header';
import PageTemplate from '@/components/layout/pageTemplate';
import { useWorkouts } from '@/lib/contexts';

interface CycleDetailsPageProps {
    id: string;
}

export default function CycleDetailsPage({ id }: CycleDetailsPageProps) {
    const { cycles, exerciseMap, isLoading, error } = useWorkouts();

    const cycle = useMemo(() => cycles.find((c) => c.uuid === id), [cycles, id]);

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;
    if (!cycle) return <div>Cycle not found</div>;

    return (
        <PageTemplate title="Training Cycles" stickyHeader={<CycleHeader cycle={cycle} />}>
            <div className="mt-6">
                <CycleDetailView cycle={cycle} exerciseMap={exerciseMap} />
            </div>
        </PageTemplate>
    );
}
