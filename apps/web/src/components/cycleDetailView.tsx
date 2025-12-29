'use client';

import { Calendar, MapPin } from 'lucide-react';
import { useMemo, useState } from 'react';
import WorkoutSlider from '@/components/slider';
import SliderControls from '@/components/sliderControls';
import { Badge } from '@/components/ui/badge';
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

    // Detect responsive breakpoints
    React.useEffect(() => {
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
                    stats[group] = (stats[group] || 0) + exercise.sets.length;
                }
            }
        }

        return Object.entries(stats).sort((a, b) => b[1] - a[1]);
    }, [cycle.workouts, exerciseMap]);

    return (
        <div className="flex flex-col gap-10">
            {/* Header Section */}
            <div className="flex flex-col gap-6">
                {/* Title */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 pt-2">
                    <h1 className="text-5xl sm:text-5xl font-black tracking-tighter uppercase leading-none">{cycle.name}</h1>
                    <Badge variant="outline" className={cn('capitalize text-xl px-5 py-2 font-black border-2 w-fit h-fit', cycleColorClass)}>
                        {cycle.type}
                    </Badge>
                </div>

                {/* Meta Information */}
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-muted-foreground text-sm font-semibold tracking-widest">
                        <div className="flex items-center gap-2.5">
                            <Calendar size={18} className="text-primary/60" />
                            <span>
                                {formatDate(cycle.dates[0])} — {formatDate(cycle.dates[1])}
                            </span>
                        </div>
                        {cycle.location && (
                            <div className="flex items-center gap-2.5">
                                <MapPin size={18} className="text-primary/60" />
                                <span>{cycle.location}</span>
                            </div>
                        )}
                        <div className="px-2.5 py-1 rounded bg-secondary text-secondary-foreground text-xs font-bold">
                            {cycle.workouts?.length || 0} Workouts
                        </div>
                    </div>

                    {cycle.note && (
                        <div className="text-muted-foreground max-w-4xl text-lg leading-relaxed border-l-4 border-primary/10 pl-6 py-2 italic bg-muted/30 rounded-r-lg">
                            {cycle.note}
                        </div>
                    )}
                </div>
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

            {/* Slider Section */}
            <div className="flex flex-col gap-4">
                {/* Controls */}
                {cycle.workouts && cycle.workouts.length > 0 && (
                    <div className="flex justify-start">
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
                    />
                ) : (
                    <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-2xl bg-muted/5 text-muted-foreground font-medium">
                        No workouts recorded for this cycle.
                    </div>
                )}
            </div>
        </div>
    );
}
