'use client';

import { Clock, Flame, Heart, Timer, Zap } from 'lucide-react';
import type { FC } from 'react';
import { useMemo } from 'react';
import { ControlCard } from '@/components/common/controlCard';
import type { CardioWorkout } from '@/types';

interface CardioStatsProps {
    workouts: CardioWorkout[];
}

const CardioStats: FC<CardioStatsProps> = ({ workouts }) => {
    const stats = useMemo(() => {
        if (workouts.length === 0) {
            return {
                totalWorkouts: 0,
                totalDurationHours: 0,
                avgDurationMin: 0,
                totalCalories: 0,
                avgHeartRate: 0,
                totalZoneMinutes: 0,
            };
        }

        const totalDurationMin = workouts.reduce((sum, w) => sum + w.durationMin, 0);
        const workoutsWithCalories = workouts.filter((w) => w.calories !== undefined);
        const workoutsWithHeartRate = workouts.filter((w) => w.averageHeartRate !== undefined);

        return {
            totalWorkouts: workouts.length,
            totalDurationHours: Math.round((totalDurationMin / 60) * 10) / 10,
            avgDurationMin: Math.round(totalDurationMin / workouts.length),
            totalCalories: workoutsWithCalories.reduce((sum, w) => sum + (w.calories || 0), 0),
            avgHeartRate:
                workoutsWithHeartRate.length > 0
                    ? Math.round(workoutsWithHeartRate.reduce((sum, w) => sum + (w.averageHeartRate || 0), 0) / workoutsWithHeartRate.length)
                    : 0,
            totalZoneMinutes: workouts.reduce((sum, w) => sum + (w.zoneMinutes || 0), 0),
        };
    }, [workouts]);

    const statItems = [
        { icon: Timer, label: 'Workouts', value: stats.totalWorkouts.toLocaleString(), color: 'text-primary' },
        { icon: Clock, label: 'Total Hours', value: stats.totalDurationHours.toLocaleString(), color: 'text-blue-400' },
        { icon: Timer, label: 'Avg Duration', value: `${stats.avgDurationMin}m`, color: 'text-cyan-400' },
        { icon: Flame, label: 'Calories', value: stats.totalCalories.toLocaleString(), color: 'text-orange-400' },
        { icon: Heart, label: 'Avg HR', value: stats.avgHeartRate > 0 ? `${stats.avgHeartRate} bpm` : '-', color: 'text-red-400' },
        { icon: Zap, label: 'Zone Minutes', value: stats.totalZoneMinutes.toLocaleString(), color: 'text-yellow-400' },
    ];

    return (
        <ControlCard className="w-full">
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                {statItems.map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                        <item.icon className={`h-4 w-4 ${item.color}`} />
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                        <span className={`font-bold ${item.color}`}>{item.value}</span>
                    </div>
                ))}
            </div>
        </ControlCard>
    );
};

export default CardioStats;
