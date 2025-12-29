'use client';

import { Calendar, ChevronLeft, ChevronRight, Columns, Eye } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import PageTemplate from '@/components/pageTemplate';
import WorkoutSlider from '@/components/slider2';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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
        <PageTemplate>
            <div className="flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <h2 className="text-2xl sm:text-4xl font-bold text-primary text-center md:text-left w-full lg:w-auto">Workouts Log</h2>
                    <Card className="w-full lg:w-auto">
                        <CardContent className="py-2 px-3 sm:px-4">
                            <div className="flex items-center gap-3 sm:gap-4">
                                {/* Navigation and Toggle Row */}
                                <div className="flex items-center gap-3 sm:gap-4 w-full lg:w-auto justify-between lg:justify-start">
                                    {/* Left Navigation Button */}
                                    <Button onClick={slideLeft} disabled={currentIndex === 0} size="icon" variant="default" className="rounded-full">
                                        <ChevronLeft className="h-5 w-5" />
                                    </Button>

                                    {/* View Mode Toggle */}
                                    <div className="flex items-center gap-2 text-xs">
                                        <Label htmlFor="mini-mode" className="cursor-pointer">
                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                        </Label>
                                        <Switch id="mini-mode" checked={!miniMode} onCheckedChange={(checked) => setMiniMode(!checked)} />
                                    </div>

                                    {/* Year Selector */}
                                    {availableYears.length > 0 && (
                                        <div className="flex items-center gap-2 text-xs">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <Select onValueChange={jumpToYear}>
                                                <SelectTrigger className="w-[80px] h-7 text-xs">
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

                                    {/* Slides Per Page Control - Hidden below xl breakpoint */}
                                    {responsiveColumns === slidesToShow && (
                                        <div className="flex items-center gap-2 text-xs">
                                            <Columns className="h-4 w-4 text-muted-foreground" />
                                            <Select
                                                value={slidesToShow.toString()}
                                                onValueChange={(value) => {
                                                    setSlidesToShow(Number(value));
                                                    setCurrentIndex(0);
                                                }}
                                            >
                                                <SelectTrigger className="w-[60px] h-7 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {[3, 4, 5, 6, 7, 8].map((num) => (
                                                        <SelectItem key={num} value={num.toString()}>
                                                            {num}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {/* Slide Counter */}
                                    <div className="text-xs text-muted-foreground">
                                        {currentIndex + 1}/{slideCount}
                                    </div>

                                    {/* Right Navigation Button */}
                                    <Button
                                        onClick={slideRight}
                                        disabled={currentIndex === slideCount - 1}
                                        size="icon"
                                        variant="default"
                                        className="rounded-full"
                                    >
                                        <ChevronRight className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
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
