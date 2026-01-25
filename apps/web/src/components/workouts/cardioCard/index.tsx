import { Activity, Bike, Flame, Footprints, Heart, LucideProps, PersonStanding, Timer, Waves, Zap } from 'lucide-react';
import type { FC } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { CardioType, CardioWorkout, GroupedCardio } from '@/types';
import { EffortBar } from './effortBar';

interface CardioCardProps {
    workout: GroupedCardio;
    miniMode: boolean;
}

// Map cardio types to icons
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

// Map cardio types to accent colors
const cardioColors: Record<CardioType, string> = {
    Run: '#FF5252', // Red
    'Treadmill run': '#FF5252',
    Swim: '#2196F3', // Blue
    Bike: '#4CAF50', // Green
    'Outdoor Bike': '#4CAF50',
    Elliptical: '#9C27B0', // Purple
    'Rowing machine': '#FF9800', // Orange
    HIIT: '#E91E63', // Pink
    'Aerobic Workout': '#00BCD4', // Cyan
    Walk: '#8BC34A',
    'Circuit Training': '#673AB7',
    'Interval Workout': '#FF5722',
    Bootcamp: '#795548',
    Aerobics: '#E91E63',
};

// Single activity row component
const ActivityRow: FC<{ activity: CardioWorkout; miniMode: boolean }> = ({ activity, miniMode }) => {
    const Icon = cardioIcons[activity.type] || Timer;
    const accentColor = cardioColors[activity.type] || '#888888';

    const durationDisplay = `${Math.round(activity.durationMin)}m`;

    // Calculate total active effort minutes (excluding sedentary)
    const activeEffortMinutes = activity.effort?.filter((e) => e.name !== 'sedentary').reduce((sum, e) => sum + e.minutes, 0) ?? 0;

    return (
        <div className="py-3 first:pt-0 last:pb-0">
            {/* Activity Header */}
            <div className="flex items-center gap-3 mb-2">
                <div className="p-1.5 rounded-md" style={{ backgroundColor: `${accentColor}20` }}>
                    <Icon className="h-4 w-4" style={{ color: accentColor }} />
                </div>
                <span className="font-bold text-sm" style={{ color: accentColor }}>
                    {activity.type}
                </span>
                <span className="text-sm text-muted-foreground">{durationDisplay}</span>
                {activity.zoneMinutes !== undefined && activity.zoneMinutes > 0 && (
                    <span className="text-sm text-muted-foreground">| Zone: {activity.zoneMinutes}m</span>
                )}
            </div>

            {/* Effort Visualization */}
            {!miniMode && activity.effort && activity.effort.length > 0 && activeEffortMinutes > 0 && (
                <div className="ml-9">
                    <EffortBar effort={activity.effort} />
                </div>
            )}

            {/* Optional Metrics */}
            {!miniMode && (activity.averageHeartRate || activity.calories || activity.steps) && (
                <div className="ml-9 mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {activity.averageHeartRate && (
                        <div className="flex items-center gap-1.5">
                            <Heart className="h-3.5 w-3.5 text-red-500" />
                            <span>{activity.averageHeartRate} bpm</span>
                        </div>
                    )}
                    {activity.calories && (
                        <div className="flex items-center gap-1.5">
                            <Flame className="h-3.5 w-3.5 text-orange-500" />
                            <span>{activity.calories} cal</span>
                        </div>
                    )}
                    {activity.steps && (
                        <div className="flex items-center gap-1.5">
                            <Footprints className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">{activity.steps.toLocaleString()} steps</span>
                        </div>
                    )}
                </div>
            )}

            {/* Mini Mode Summary */}
            {miniMode && activity.effort && (
                <div className="ml-9 text-xs text-muted-foreground">
                    {activity.effort
                        .filter((e) => e.minutes > 0 && e.name !== 'sedentary')
                        .map((e) => `${e.minutes}m ${e.name}`)
                        .join(' / ')}
                </div>
            )}
        </div>
    );
};

const CardioCard: FC<CardioCardProps> = ({ workout, miniMode }) => {
    const { date, workouts } = workout;

    const dateDisplay = new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    });

    // Calculate totals for header
    const totalDuration = workouts.reduce((sum, w) => sum + w.durationMin, 0);
    const totalActivities = workouts.length;

    // Get primary icon (first activity's icon)
    const primaryType = workouts[0]?.type;
    const PrimaryIcon = primaryType ? cardioIcons[primaryType] || Timer : Timer;
    const primaryColor = primaryType ? cardioColors[primaryType] || '#888888' : '#888888';

    return (
        <Card className="rounded-xl font-mono w-full h-full flex flex-col">
            <CardHeader className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${primaryColor}20` }}>
                        <PrimaryIcon className="h-5 w-5" style={{ color: primaryColor }} />
                    </div>
                    <h2 className="text-lg font-semibold text-center flex-1">{dateDisplay}</h2>
                    <div className="w-9" /> {/* Spacer for balance */}
                </div>

                {/* Summary Stats Row */}
                <div className="flex gap-2 text-sm text-muted-foreground flex-wrap justify-center">
                    <span>
                        {totalActivities} {totalActivities === 1 ? 'activity' : 'activities'}
                    </span>
                    <span>|</span>
                    <span>{Math.round(totalDuration)}m total</span>
                </div>
            </CardHeader>

            <CardContent className="overflow-y-auto flex-1 p-3 pt-0">
                <div className="divide-y">
                    {workouts.map((activity) => (
                        <ActivityRow key={activity.uuid} activity={activity} miniMode={miniMode} />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default CardioCard;
