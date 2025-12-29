'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import ExerciseView from '@/components/exercise';
import PageTemplate from '@/components/pageTemplate';
import { Button } from '@/components/ui/button';
import { useWorkouts } from '@/lib/contexts';

export default function ExercisePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const { workouts, exerciseMap, cycles, isLoading, error } = useWorkouts();
    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;

    const exerciseId = params.id;
    const exercise = exerciseMap.get(exerciseId?.toString() ?? '');
    const cycleId = searchParams.get('cycleId');

    if (!exercise) {
        return <div>Exercise not found</div>;
    }

    const selectedCycle = cycleId ? cycles.find((c) => c.uuid === cycleId) : null;
    const filteredWorkouts = selectedCycle ? workouts.filter((w) => selectedCycle.workouts.some((cw) => cw.uuid === w.uuid)) : workouts;

    return (
        <PageTemplate>
            {selectedCycle && (
                <div className="mb-4 flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg border">
                    <span className="text-sm">
                        Filtered by cycle: <span className="font-semibold">{selectedCycle.name}</span>
                    </span>
                    <Link href={`/exercise/${exerciseId}`}>
                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted">
                            <X size={14} />
                        </Button>
                    </Link>
                </div>
            )}
            <ExerciseView workouts={filteredWorkouts} exercise={exercise} exerciseMap={exerciseMap} cycleId={cycleId || undefined} />
        </PageTemplate>
    );
}
