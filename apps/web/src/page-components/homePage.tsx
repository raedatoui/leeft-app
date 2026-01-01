'use client';

import { Calendar } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import PageTemplate from '@/components/pageTemplate';
import WorkoutSlider from '@/components/slider';
import SliderControls from '@/components/sliderControls';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkouts } from '@/lib/contexts';

export default function HomePage() {
    const { workouts, exerciseMap, isLoading, error } = useWorkouts();
    const [miniMode, setMiniMode] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [slidesToShow, setSlidesToShow] = useState(4);
    const [responsiveColumns, setResponsiveColumns] = useState(4);

    // Extract available years from workouts
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        workouts.forEach((workout) => {
            years.add(workout.date.getFullYear());
        });
        return Array.from(years).sort((a, b) => b - a); // Most recent first
    }, [workouts]);

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
    const slideCount = useMemo(() => Math.ceil(workouts.length / effectiveSlidesToShow), [workouts.length, effectiveSlidesToShow]);

    const slideLeft = () => {
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
    };

    const slideRight = () => {
        setCurrentIndex((prev) => Math.min(prev + 1, slideCount - 1));
    };

    const jumpToYear = (year: string) => {
        if (!year) return;

        // Reverse workouts like the slider does
        const reversedWorkouts = [...workouts].reverse();

        // Find first workout of the selected year
        const workoutIndex = reversedWorkouts.findIndex((workout) => workout.date.getFullYear() === Number(year));

        if (workoutIndex !== -1) {
            // Calculate which slide contains this workout
            const slideIndex = Math.floor(workoutIndex / effectiveSlidesToShow);
            setCurrentIndex(slideIndex);
        }
    };

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;

    return (
        <PageTemplate
            title="Workouts Log"
            stickyHeader={
                <div className="flex justify-center w-full">
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
                    >
                        {/* Year Selector */}
                        {availableYears.length > 0 && (
                            <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-tighter">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <Select onValueChange={jumpToYear}>
                                    <SelectTrigger className="w-[80px] h-9 text-xs border-none bg-muted/60 font-bold">
                                        <SelectValue placeholder="Year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableYears.map((year) => (
                                            <SelectItem key={year} value={year.toString()}>
                                                {year}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </SliderControls>
                </div>
            }
        >
            <div className="flex flex-col gap-4 pt-4">
                <WorkoutSlider
                    workouts={workouts}
                    exerciseMap={exerciseMap}
                    miniMode={miniMode}
                    currentIndex={currentIndex}
                    setCurrentIndex={setCurrentIndex}
                    slidesToShow={effectiveSlidesToShow}
                />
            </div>
        </PageTemplate>
    );
}
