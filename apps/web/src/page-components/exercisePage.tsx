'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import ExerciseView from '@/components/exercise';
import PageTemplate from '@/components/pageTemplate';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWorkouts } from '@/lib/contexts';

export default function ExercisePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const { workouts, exerciseMap, cycles, isLoading, error } = useWorkouts();
    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;

    const exerciseId = params?.id;
    const exercise = exerciseMap.get(exerciseId?.toString() ?? '');
    const cycleId = searchParams?.get('cycleId');

    if (!exercise) {
        return <div>Exercise not found</div>;
    }

    const selectedCycle = cycleId ? cycles.find((c) => c.uuid === cycleId) : null;
    const filteredWorkouts = selectedCycle ? workouts.filter((w) => selectedCycle.workouts.some((cw) => cw.uuid === w.uuid)) : workouts;

    return (
        <PageTemplate
            title={exercise.name}
            titleChildren={
                <div className="pl-3 flex flex-col gap-3 w-full lg:w-auto">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center sm:items-center">
                        <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-0 sm:mt-[8px]">
                            {exercise.equipment.map((item) => (
                                <Badge key={item} variant="secondary" className="h-fit">
                                    {item}
                                </Badge>
                            ))}
                            <Badge variant="secondary" className="h-fit">
                                {exercise.primaryMuscleGroup}
                            </Badge>
                            <Badge variant="secondary" className="h-fit">
                                {exercise.category}
                            </Badge>
                        </div>
                    </div>
                </div>
            }
        >
            {selectedCycle && (
                <div className="mb-4 flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg border">
                    <span className="text-sm">
                        Filtered by cycle: <span className="font-semibold">{selectedCycle.name}</span>
                    </span>
                    <Link href={`/exercises/${exerciseId}`}>
                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted">
                            <X size={14} />
                        </Button>
                    </Link>
                </div>
            )}
            <ExerciseView workouts={filteredWorkouts} exercise={exercise} exerciseMap={exerciseMap} cycleId={cycleId || undefined} hideTitle={true} />
        </PageTemplate>
    );
}
