'use client';

import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Columns, Eye, MapPin } from 'lucide-react';
import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import PageTemplate from '@/components/pageTemplate';
import WorkoutSlider from '@/components/slider2';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useWorkouts } from '@/lib/contexts';
import { cn, formatDate } from '@/lib/utils';

interface CycleDetailsPageProps {
    id: string;
}

export default function CycleDetailsPage({ id }: CycleDetailsPageProps) {
    const { cycles, exerciseMap, isLoading, error } = useWorkouts();
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

    const cycle = useMemo(() => cycles.find((c) => c.uuid === id), [cycles, id]);

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

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;
    if (!cycle) return <div>Cycle not found</div>;

    const cycleColorClass = getCycleColor(cycle.type);

    return (
        <PageTemplate>
            <div className="flex flex-col gap-6">
                {/* Header Section */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors w-fit">
                        <Link href="/cycles" className="flex items-center gap-2">
                            <ArrowLeft size={16} />
                            <span>Back to Cycles</span>
                        </Link>
                    </div>

                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl sm:text-5xl font-bold">{cycle.name}</h1>
                                <Badge variant="outline" className={cn('capitalize text-base px-3 py-1', cycleColorClass)}>
                                    {cycle.type}
                                </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={14} />
                                    <span>
                                        {formatDate(cycle.dates[0])} – {formatDate(cycle.dates[1])}
                                    </span>
                                </div>
                                {cycle.location && (
                                    <div className="flex items-center gap-1.5">
                                        <MapPin size={14} />
                                        <span>{cycle.location}</span>
                                    </div>
                                )}
                                <div className="text-foreground font-medium">{cycle.workouts?.length || 0} Workouts</div>
                            </div>
                            {cycle.note && <p className="text-muted-foreground max-w-2xl mt-1 text-sm leading-relaxed">{cycle.note}</p>}
                        </div>

                        {/* Controls */}
                        <Card className="w-full lg:w-auto">
                            <CardContent className="py-2 px-3 sm:px-4">
                                <div className="flex items-center gap-3 sm:gap-4 w-full lg:w-auto justify-between lg:justify-start">
                                    <Button onClick={slideLeft} disabled={currentIndex === 0} size="icon" variant="default" className="rounded-full">
                                        <ChevronLeft className="h-5 w-5" />
                                    </Button>

                                    <div className="flex items-center gap-2 text-xs">
                                        <Label htmlFor="mini-mode" className="cursor-pointer">
                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                        </Label>
                                        <Switch id="mini-mode" checked={!miniMode} onCheckedChange={(checked) => setMiniMode(!checked)} />
                                    </div>

                                    {/* Slides Per Page Control */}
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

                                    <div className="text-xs text-muted-foreground min-w-[3ch] text-center">
                                        {currentIndex + 1}/{slideCount || 1}
                                    </div>

                                    <Button
                                        onClick={slideRight}
                                        disabled={currentIndex >= slideCount - 1}
                                        size="icon"
                                        variant="default"
                                        className="rounded-full"
                                    >
                                        <ChevronRight className="h-5 w-5" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

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
                    />
                ) : (
                    <div className="flex items-center justify-center h-64 border rounded-lg bg-muted/10 text-muted-foreground">
                        No workouts recorded for this cycle.
                    </div>
                )}
            </div>
        </PageTemplate>
    );
}
