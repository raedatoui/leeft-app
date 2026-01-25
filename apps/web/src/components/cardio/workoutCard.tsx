'use client';

import { Activity, Bike, Flame, Footprints, Heart, LucideProps, PersonStanding, Timer, Waves, Zap } from 'lucide-react';
import type { FC } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { CardioType, CardioWorkout } from '@/types';
import { EffortBar } from '../workouts/cardioCard/effortBar';

// Cardio icons and colors
const cardioIcons: Record<CardioType, FC<LucideProps>> = {
    Run: Footprints,
    'Treadmill run': Footprints,
    Swim: Waves,
    Bike: Bike,
    'Outdoor Bike': Bike,
    Elliptical: PersonStanding,
    'Rowing machine': PersonStanding,
    HIIT: Flame,
    'Aerobic Workout': Heart,
    Walk: Footprints,
    'Circuit Training': Activity,
    'Interval Workout': Timer,
    Bootcamp: Zap,
    Aerobics: Heart,
};

const cardioColors: Record<CardioType, string> = {
    Run: '#FF5252',
    'Treadmill run': '#FF5252',
    Swim: '#2196F3',
    Bike: '#4CAF50',
    'Outdoor Bike': '#4CAF50',
    Elliptical: '#9C27B0',
    'Rowing machine': '#FF9800',
    HIIT: '#E91E63',
    'Aerobic Workout': '#00BCD4',
    Walk: '#8BC34A',
    'Circuit Training': '#673AB7',
    'Interval Workout': '#FF5722',
    Bootcamp: '#795548',
    Aerobics: '#E91E63',
};

interface CardioWorkoutCardProps {
    workout: CardioWorkout;
}

const CardioWorkoutCard: FC<CardioWorkoutCardProps> = ({ workout }) => {
    const Icon = cardioIcons[workout.type] || Timer;
    const accentColor = cardioColors[workout.type] || '#888888';
    const activeEffortMinutes = workout.effort?.filter((e) => e.name !== 'sedentary').reduce((sum, e) => sum + e.minutes, 0) ?? 0;

    const dateDisplay = workout.date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        weekday: 'short',
        timeZone: 'UTC',
    });

    return (
        <Card className="rounded-xl font-mono h-full">
            <CardHeader className="p-3 pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${accentColor}20` }}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <span className="font-bold" style={{ color: accentColor }}>
                            {workout.type}
                        </span>
                    </div>
                    <span className="text-sm text-muted-foreground">{dateDisplay}</span>
                </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-3">
                {/* Duration and zone minutes */}
                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                        <Timer className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{Math.round(workout.durationMin)}m</span>
                    </div>
                    {workout.zoneMinutes !== undefined && workout.zoneMinutes > 0 && (
                        <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Zone:</span>
                            <span className="font-semibold text-yellow-400">{workout.zoneMinutes}m</span>
                        </div>
                    )}
                </div>

                {/* Effort bar */}
                {workout.effort && activeEffortMinutes > 0 && <EffortBar effort={workout.effort} />}

                {/* Additional metrics */}
                {(workout.averageHeartRate || workout.calories || workout.steps) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        {workout.averageHeartRate && (
                            <div className="flex items-center gap-1">
                                <Heart className="h-3.5 w-3.5 text-red-500" />
                                <span>{workout.averageHeartRate} bpm</span>
                            </div>
                        )}
                        {workout.calories && (
                            <div className="flex items-center gap-1">
                                <Flame className="h-3.5 w-3.5 text-orange-500" />
                                <span>{workout.calories} cal</span>
                            </div>
                        )}
                        {workout.steps && (
                            <div className="flex items-center gap-1">
                                <Footprints className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">{workout.steps.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Logged by indicator */}
                <div className="text-xs text-muted-foreground/60">
                    {workout.loggedBy === 'manual' ? 'Manual' : workout.loggedBy === 'tracker' ? 'Tracker' : 'Auto'}
                </div>
            </CardContent>
        </Card>
    );
};

export default CardioWorkoutCard;
