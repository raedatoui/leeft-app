'use client';

import { Calendar, MapPin, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import ExerciseView from '@/components/exercise';
import WorkoutSlider from '@/components/slider';
import SliderControls from '@/components/sliderControls';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatDate } from '@/lib/utils';
import type { ExerciseMap, MappedCycle } from '@/types';

interface CycleDetailViewProps {
    cycle: MappedCycle;
    exerciseMap: ExerciseMap;
}

export default function CycleDetailView({ cycle, exerciseMap }: CycleDetailViewProps) {
    const [miniMode, setMiniMode] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [slidesToShow, setSlidesToShow] = useState(4);
    const [responsiveColumns, setResponsiveColumns] = useState(4);
    const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

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

    // Helper to determine cycle color (reused from cyclesPage logic style)
    const getCycleColor = (type: string) => {
        switch (type) {
            case 'hypertrophy':
                return 'text-red-500 border-red-500';
            case 'break':
                return 'text-blue-500 border-blue-500';
            case 'maintenance':
                return 'text-yellow-500 border-yellow-500';
            case 'strength':
                return 'text-green-500 border-green-500';
            default:
                return 'text-yellow-500 border-yellow-500';
        }
    };

    const cycleColorClass = getCycleColor(cycle.type);

    const muscleGroupStats = useMemo(() => {
        const stats: Record<string, number> = {};

        if (!cycle.workouts) return [];

        for (const workout of cycle.workouts) {
            for (const exercise of workout.exercises) {
                const metadata = exerciseMap.get(exercise.exerciseId.toString());
                if (metadata?.primaryMuscleGroup) {
                    const group = metadata.primaryMuscleGroup;
                    const workSetCount = exercise.sets.filter((s) => s.isWorkSet).length;
                    stats[group] = (stats[group] || 0) + workSetCount;
                }
            }
        }

        return Object.entries(stats).sort((a, b) => b[1] - a[1]);
    }, [cycle.workouts, exerciseMap]);

    const selectedExercise = selectedExerciseId ? exerciseMap.get(selectedExerciseId) : null;

    return (
        <div className="flex flex-col gap-6">
            {/* Header Section */}
            <div className="flex flex-col gap-2">
                {/* Name + Type + Meta - all horizontal */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <h2 className={cn('text-xl sm:text-2xl font-bold tracking-tight uppercase leading-none', cycleColorClass.split(' ')[0])}>
                        {cycle.name}
                    </h2>
                    <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                        <Calendar size={14} className="text-primary/60" />
                        <span>
                            {formatDate(cycle.dates[0])} — {formatDate(cycle.dates[1])}
                        </span>
                    </div>
                    {cycle.location && (
                        <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                            <MapPin size={14} className="text-primary/60" />
                            <span>{cycle.location}</span>
                        </div>
                    )}
                    <div className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-xs font-bold">
                        {cycle.workouts?.length || 0} Workouts
                    </div>
                    <div className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-xs font-bold">
                        {Math.ceil((new Date(cycle.dates[1]).getTime() - new Date(cycle.dates[0]).getTime()) / (1000 * 60 * 60 * 24)) + 1} Days
                    </div>
                </div>

                {cycle.note && (
                    <div className="text-muted-foreground max-w-4xl text-sm leading-relaxed border-l-2 border-primary/20 pl-4 py-1 italic">
                        {cycle.note}
                    </div>
                )}
            </div>

            {/* Muscle Group Stats */}
            {muscleGroupStats.length > 0 && (
                <div className="flex flex-wrap gap-3">
                    {muscleGroupStats.map(([group, count]) => (
                        <Badge key={group} variant="secondary" className="text-sm py-2 px-5 capitalize font-bold tracking-tight">
                            {group} <span className="text-primary ml-2 opacity-70">{count} sets</span>
                        </Badge>
                    ))}
                </div>
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
                            />
                        </div>
                    )}

                    {/* Slider */}
                    {cycle.workouts && cycle.workouts.length > 0 ? (
                        <WorkoutSlider
                            workouts={cycle.workouts}
                            exerciseMap={exerciseMap}
                            miniMode={miniMode}
                            currentIndex={currentIndex}
                            setCurrentIndex={setCurrentIndex}
                            slidesToShow={effectiveSlidesToShow}
                            cycleId={cycle.uuid}
                            reverse={false}
                            onExerciseClick={(id) => setSelectedExerciseId(id)}
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
