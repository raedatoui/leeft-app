'use client';

import { Bike, ChevronLeft, ChevronRight, Flame, Footprints, Heart, PersonStanding, Timer, Waves } from 'lucide-react';
import type { FC } from 'react';
import { useMemo, useState } from 'react';
import CardioDistributionChart from '@/components/cardio/distributionChart';
import CardioStats from '@/components/cardio/stats';
import CardioTrendsChart from '@/components/cardio/trendsChart';
import CardioWorkoutCard from '@/components/cardio/workoutCard';
import { ControlCard } from '@/components/common/controlCard';
import PageTemplate from '@/components/layout/pageTemplate';
import { Button } from '@/components/ui/button';
import { useWorkouts } from '@/lib/contexts';
import type { CardioType, CardioWorkout } from '@/types';

// Cardio icons and colors (shared with DayCard)
export const cardioIcons: Record<CardioType, FC<{ className?: string }>> = {
    Run: Footprints,
    'Treadmill run': Footprints,
    Swim: Waves,
    Bike: Bike,
    'Outdoor Bike': Bike,
    Elliptical: PersonStanding,
    'Rowing machine': PersonStanding,
    HIIT: Flame,
    'Aerobic Workout': Heart,
};

export const cardioColors: Record<CardioType, string> = {
    Run: '#FF5252',
    'Treadmill run': '#FF5252',
    Swim: '#2196F3',
    Bike: '#4CAF50',
    'Outdoor Bike': '#4CAF50',
    Elliptical: '#9C27B0',
    'Rowing machine': '#FF9800',
    HIIT: '#E91E63',
    'Aerobic Workout': '#00BCD4',
};

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

    const { cardioWorkouts, isLoading, error } = useWorkouts();

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
        if (idx < years.length - 1) {
            setSelectedYear(years[idx + 1]);
        }
    };

    // Navigate to next year
    const goToNextYear = () => {
        const idx = years.indexOf(selectedYear);
        if (idx > 0) {
            setSelectedYear(years[idx - 1]);
        }
    };

    if (isLoading) return <div className="p-8 text-center">Loading...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Error: {error.message}</div>;

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
                    <CardioDistributionChart workouts={yearWorkouts} />
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
