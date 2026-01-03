import { useEffect, useMemo, useState } from 'react';
import type { CycleDetailViewProps } from './types';
import CycleDetailViewJSX from './view';

export default function CycleDetailView({ cycle, exerciseMap }: CycleDetailViewProps) {
    const [miniMode, setMiniMode] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [slidesToShow, setSlidesToShow] = useState(4);
    const [responsiveColumns, setResponsiveColumns] = useState(4);
    const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
    const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);
    const [includeWarmup, setIncludeWarmup] = useState(true);

    // Detect responsive breakpoints
    useEffect(() => {
        const updateColumns = () => {
            const width = window.innerWidth;
            let newColumns = 4;
            if (width < 640) {
                newColumns = 1; // Mobile
            } else if (width < 1024) {
                newColumns = 2; // Tablet
            } else if (width < 1280) {
                newColumns = 3; // Small desktop
            } else {
                newColumns = slidesToShow; // Large desktop - use user selection
            }
            setResponsiveColumns((prev) => {
                if (prev !== newColumns) {
                    setCurrentIndex(0); // Reset index when columns change
                    return newColumns;
                }
                return prev;
            });
        };
        updateColumns();
        window.addEventListener('resize', updateColumns);
        return () => window.removeEventListener('resize', updateColumns);
    }, [slidesToShow]);

    const effectiveSlidesToShow = responsiveColumns;
    const slideCount = useMemo(
        () => Math.ceil((cycle?.workouts?.length || 0) / effectiveSlidesToShow),
        [cycle?.workouts?.length, effectiveSlidesToShow]
    );

    const slideLeft = () => {
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
    };

    const slideRight = () => {
        setCurrentIndex((prev) => Math.min(prev + 1, slideCount - 1));
    };

    const muscleGroupStats = useMemo(() => {
        const stats: Record<string, { sets: number; workouts: Set<string> }> = {};

        if (!cycle.workouts) return [];

        for (const workout of cycle.workouts) {
            for (const exercise of workout.exercises) {
                const metadata = exerciseMap.get(exercise.exerciseId.toString());
                if (metadata?.primaryMuscleGroup) {
                    const group = metadata.primaryMuscleGroup;
                    const workSetCount = exercise.sets.filter((s) => s.isWorkSet).length;
                    if (!stats[group]) {
                        stats[group] = { sets: 0, workouts: new Set() };
                    }
                    stats[group].sets += workSetCount;
                    stats[group].workouts.add(workout.uuid);
                }
            }
        }

        return Object.entries(stats)
            .map(([group, data]) => ({ group, sets: data.sets, workouts: data.workouts.size }))
            .sort((a, b) => b.sets - a.sets);
    }, [cycle.workouts, exerciseMap]);

    const selectedExercise = selectedExerciseId ? exerciseMap.get(selectedExerciseId) : null;

    return (
        <CycleDetailViewJSX
            cycle={cycle}
            exerciseMap={exerciseMap}
            miniMode={miniMode}
            setMiniMode={setMiniMode}
            currentIndex={currentIndex}
            setCurrentIndex={setCurrentIndex}
            slidesToShow={slidesToShow}
            setSlidesToShow={setSlidesToShow}
            responsiveColumns={responsiveColumns}
            selectedExerciseId={selectedExerciseId}
            setSelectedExerciseId={setSelectedExerciseId}
            selectedMuscleGroup={selectedMuscleGroup}
            setSelectedMuscleGroup={setSelectedMuscleGroup}
            includeWarmup={includeWarmup}
            setIncludeWarmup={setIncludeWarmup}
            muscleGroupStats={muscleGroupStats}
            slideCount={slideCount}
            effectiveSlidesToShow={effectiveSlidesToShow}
            slideLeft={slideLeft}
            slideRight={slideRight}
            selectedExercise={selectedExercise}
        />
    );
}
