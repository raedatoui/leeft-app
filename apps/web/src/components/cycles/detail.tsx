import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import MuscleGroupVolumeChart from '@/components/charts/muscleGroupVolumeChart';
import MuscleGroupWorkSetsChart from '@/components/charts/muscleGroupWorkSetsChart';
import ExerciseView from '@/components/exercises/exercise-item';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LiftingWorkoutSlider, SliderControls } from '@/components/workouts/slider';
import { useWorkouts } from '@/lib/contexts';
import { cn } from '@/lib/utils';
import type { ExerciseMap, MappedCycle } from '@/types';

interface CycleDetailViewProps {
    cycle: MappedCycle;
    exerciseMap: ExerciseMap;
}

export default function CycleDetailView({ cycle, exerciseMap }: CycleDetailViewProps) {
    const { muscleGroups } = useWorkouts();
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

    const renderBadge = ({ group, sets, workouts }: { group: string; sets: number; workouts: number }) => {
        const muscleGroup = muscleGroups.find((m) => m.id === group);
        const color = muscleGroup?.color || '#888888';
        const name = muscleGroup?.name || group;

        return (
            <Badge
                key={group}
                variant={selectedMuscleGroup === group ? 'default' : 'secondary'}
                className={cn(
                    'text-sm py-2 px-4 capitalize font-bold tracking-tight cursor-pointer transition-all flex items-center gap-2',
                    selectedMuscleGroup === group ? 'ring-2 ring-offset-2 ring-offset-background' : 'hover:bg-secondary/80'
                )}
                style={{
                    borderColor: selectedMuscleGroup === group ? color : undefined,
                }}
                onClick={() => setSelectedMuscleGroup(selectedMuscleGroup === group ? null : group)}
            >
                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: color }} />
                <span>{name}</span>
                <span
                    className={cn('ml-1 text-xs font-normal', selectedMuscleGroup === group ? 'text-primary-foreground/80' : 'text-muted-foreground')}
                >
                    {workouts}w / {sets}s
                </span>
            </Badge>
        );
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Muscle Group Stats */}
            {muscleGroupStats.length > 0 && <div className="flex flex-wrap flex-row gap-3">{muscleGroupStats.map(renderBadge)}</div>}

            {/* Muscle Group Work Sets Chart (Overview) */}
            {!selectedMuscleGroup && cycle.workouts && <MuscleGroupWorkSetsChart workouts={cycle.workouts} exerciseMap={exerciseMap} />}

            {/* Muscle Group Volume Chart (Detail) */}
            {selectedMuscleGroup && cycle.workouts && (
                <MuscleGroupVolumeChart workouts={cycle.workouts} muscleGroup={selectedMuscleGroup} exerciseMap={exerciseMap} />
            )}

            {/* Inline Exercise View */}
            {selectedExerciseId && selectedExercise ? (
                <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-white">{selectedExercise.name}</h3>
                        <Button
                            onClick={() => setSelectedExerciseId(null)}
                            size="icon"
                            variant="default"
                            className="rounded-full h-10 w-10 shadow-md"
                        >
                            <X className="h-6 w-6" />
                        </Button>
                    </div>
                    <ExerciseView
                        workouts={cycle.workouts || []}
                        exercise={selectedExercise}
                        exerciseMap={exerciseMap}
                        cycleId={cycle.uuid}
                        hideSelector={true}
                    />
                </div>
            ) : (
                /* Slider Section */
                <div className="flex flex-col gap-4">
                    {/* Controls */}
                    {cycle.workouts && cycle.workouts.length > 0 && (
                        <div className="flex justify-center">
                            <SliderControls
                                currentIndex={currentIndex}
                                slideCount={slideCount}
                                miniMode={miniMode}
                                onMiniModeChange={(checked) => setMiniMode(!checked)}
                                slidesToShow={slidesToShow}
                                onSlidesToShowChange={(val) => {
                                    setSlidesToShow(val);
                                    setCurrentIndex(0);
                                }}
                                responsiveColumns={responsiveColumns}
                                onPrev={slideLeft}
                                onNext={slideRight}
                                includeWarmup={includeWarmup}
                                onIncludeWarmupChange={setIncludeWarmup}
                            />
                        </div>
                    )}

                    {/* Slider */}
                    {cycle.workouts && cycle.workouts.length > 0 ? (
                        <LiftingWorkoutSlider
                            workouts={cycle.workouts}
                            exerciseMap={exerciseMap}
                            miniMode={miniMode}
                            currentIndex={currentIndex}
                            setCurrentIndex={setCurrentIndex}
                            slidesToShow={effectiveSlidesToShow}
                            cycleId={cycle.uuid}
                            reverse={false}
                            onExerciseClick={(id) => setSelectedExerciseId(id)}
                            muscleGroupFilter={selectedMuscleGroup}
                            includeWarmup={includeWarmup}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-2xl bg-muted/5 text-muted-foreground font-medium">
                            No workouts recorded for this cycle.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
