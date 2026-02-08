'use client';

import { ChevronLeft, ChevronRight, Timer } from 'lucide-react';
import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import CardioStats from '@/components/cardio/stats';

const CardioDistributionChart = dynamic(() => import('@/components/cardio/distributionChart'), { ssr: false });
const CardioTrendsChart = dynamic(() => import('@/components/cardio/trendsChart'), { ssr: false });
import CardioWorkoutCard from '@/components/cardio/workoutCard';
import { CardioModeToggle } from '@/components/common/cardioModeToggle';
import { ControlCard } from '@/components/common/controlCard';
import PageTemplate from '@/components/layout/pageTemplate';
import { Button } from '@/components/ui/button';
import { cardioColors, cardioIcons } from '@/lib/cardio-theme';
import { useActiveCardio } from '@/lib/contexts';
import type { CardioType, CardioWorkout } from '@/types';

// Display names for cleaner UI
const cardioTypeDisplayNames: Partial<Record<CardioType, string>> = {
    'Treadmill run': 'Treadmill',
    'Outdoor Bike': 'Outdoor Bike',
    'Rowing machine': 'Rowing',
    'Aerobic Workout': 'Aerobic',
};

export default function CardioPage() {
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [activeType, setActiveType] = useState<CardioType | null>(null);

    const cardioWorkouts = useActiveCardio();

    // Group workouts by year
    const workoutsByYear = useMemo(() => {
        if (!cardioWorkouts) return {};
        return cardioWorkouts.reduce(
            (acc, workout) => {
                const year = workout.date.getFullYear();
                if (!acc[year]) acc[year] = [];
                acc[year].push(workout);
                return acc;
            },
            {} as Record<number, CardioWorkout[]>
        );
    }, [cardioWorkouts]);

    // Available years (descending)
    const years = useMemo(() => {
        return Object.keys(workoutsByYear)
            .map(Number)
            .sort((a, b) => b - a);
    }, [workoutsByYear]);

    // Workouts for selected year
    const yearWorkouts = useMemo(() => {
        return workoutsByYear[selectedYear] || [];
    }, [workoutsByYear, selectedYear]);

    // Workouts filtered by type for selected year
    const filteredWorkouts = useMemo(() => {
        if (!activeType) return yearWorkouts;
        return yearWorkouts.filter((w) => w.type === activeType);
    }, [yearWorkouts, activeType]);

    // Type counts for selected year only
    const typeCounts = useMemo((): Partial<Record<CardioType, number>> => {
        return yearWorkouts.reduce(
            (acc, w) => {
                acc[w.type] = (acc[w.type] || 0) + 1;
                return acc;
            },
            {} as Partial<Record<CardioType, number>>
        );
    }, [yearWorkouts]);

    // Get unique types for selected year
    const availableTypes = useMemo(() => {
        return Object.keys(typeCounts) as CardioType[];
    }, [typeCounts]);

    // Sorted workouts for display
    const sortedWorkouts = useMemo(() => {
        return [...filteredWorkouts].sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [filteredWorkouts]);

    // Navigate to previous year
    const goToPrevYear = () => {
        const idx = years.indexOf(selectedYear);
        const prevYear = years[idx + 1];
        if (prevYear !== undefined) {
            setSelectedYear(prevYear);
        }
    };

    // Navigate to next year
    const goToNextYear = () => {
        const idx = years.indexOf(selectedYear);
        const nextYear = years[idx - 1];
        if (nextYear !== undefined) {
            setSelectedYear(nextYear);
        }
    };

    return (
        <PageTemplate
            title="Cardio"
            stickyHeader={
                <div className="flex flex-col gap-4">
                    <ControlCard className="w-full">
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                            {/* Year selector */}
                            <div className="flex items-center gap-3">
                                <h2 className="text-3xl font-black tracking-tight text-primary">{selectedYear}</h2>
                                <div className="h-6 w-px bg-border mx-2" />
                                <div className="flex items-center gap-3">
                                    <Button
                                        onClick={goToPrevYear}
                                        disabled={selectedYear === Math.min(...years)}
                                        size="icon"
                                        variant="outline"
                                        className="h-8 w-8 rounded-full"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        onClick={goToNextYear}
                                        disabled={selectedYear === Math.max(...years)}
                                        size="icon"
                                        variant="outline"
                                        className="h-8 w-8 rounded-full"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="h-6 w-px bg-border mx-2" />
                                <CardioModeToggle showCounts={false} />
                            </div>

                            {/* Type filters */}
                            <div className="flex items-center gap-2 text-xs flex-wrap">
                                <Button
                                    onClick={() => setActiveType(null)}
                                    variant={activeType === null ? 'default' : 'outline'}
                                    size="sm"
                                    className="h-8 gap-2"
                                >
                                    <span>All</span>
                                    <span className="font-bold">{yearWorkouts.length}</span>
                                </Button>
                                {availableTypes.map((type) => {
                                    const isActive = activeType === type;
                                    const count = typeCounts[type] || 0;
                                    const Icon = cardioIcons[type] || Timer;
                                    const color = cardioColors[type] || '#888888';
                                    const displayName = cardioTypeDisplayNames[type] || type;
                                    return (
                                        <Button
                                            key={type}
                                            onClick={() => setActiveType(isActive ? null : type)}
                                            variant={isActive ? 'default' : 'outline'}
                                            size="sm"
                                            className="h-8 gap-2"
                                        >
                                            <Icon className="h-3 w-3" style={{ color: isActive ? undefined : color }} />
                                            <span className="hidden sm:inline">{displayName}</span>
                                            <span className="font-bold">{count}</span>
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    </ControlCard>

                    {/* Stats */}
                    <CardioStats workouts={filteredWorkouts} />
                </div>
            }
        >
            <div className="space-y-8 mt-4">
                {/* Charts for selected year */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <CardioDistributionChart workouts={yearWorkouts} activeType={activeType} onTypeSelect={setActiveType} />
                    <CardioTrendsChart workouts={yearWorkouts} year={selectedYear} />
                </div>

                {/* Workout grid */}
                {sortedWorkouts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {sortedWorkouts.map((workout) => (
                            <CardioWorkoutCard key={workout.uuid} workout={workout} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-12">No cardio workouts found for the selected filters.</div>
                )}
            </div>
        </PageTemplate>
    );
}
