'use client';

import { useMemo } from 'react';
import CycleDetailView from '@/components/cycles/detail';
import CycleHeader from '@/components/cycles/header';
import PageTemplate from '@/components/layout/pageTemplate';
import { useWorkoutData } from '@/lib/contexts';

interface CycleDetailsPageProps {
    id: string;
}

export default function CycleDetailsPage({ id }: CycleDetailsPageProps) {
    const { cycles, exerciseMap } = useWorkoutData();

    const cycle = useMemo(() => cycles.find((c) => c.uuid === id), [cycles, id]);

    if (!cycle) return <div>Cycle not found</div>;

    return (
        <PageTemplate title="Training Cycles" stickyHeader={<CycleHeader cycle={cycle} />}>
            <div className="mt-6">
                <CycleDetailView cycle={cycle} exerciseMap={exerciseMap} />
            </div>
        </PageTemplate>
    );
}
