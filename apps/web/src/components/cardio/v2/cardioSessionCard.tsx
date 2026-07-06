'use client';

import { Timer } from 'lucide-react';
import type { FC } from 'react';
import { EffortChart } from '@/components/cardio/v2/effortChart';
import { cardioColors, cardioIcons } from '@/lib/cardio-theme';
import type { CardioWorkout } from '@/types';

interface CardioSessionCardProps {
    workout: CardioWorkout;
}

const WEEKDAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatTime(d: Date): string {
    // Cardio session times come in as locale-naive Date instances; render in UTC to match the rest of v2.
    const h = d.getUTCHours();
    const m = d.getUTCMinutes();
    if (h === 0 && m === 0) return '';
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatDistanceKm(km: number): string {
    return `${km.toFixed(km >= 10 ? 1 : 2)} km`;
}

function formatPaceSecPerKm(sec: number): string {
    const min = Math.floor(sec / 60);
    const rem = Math.round(sec - min * 60);
    return `${min}:${String(rem).padStart(2, '0')} /km`;
}

const CardioSessionCard: FC<CardioSessionCardProps> = ({ workout }) => {
    const Icon = cardioIcons[workout.type] ?? Timer;
    const color = cardioColors[workout.type] ?? '#888888';

    const date = workout.date;
    const dayLabel = `${MONTH_SHORT[date.getUTCMonth()]} ${date.getUTCDate()}`;
    const weekday = WEEKDAY[date.getUTCDay()];
    const time = formatTime(date);
    const dayMeta = time ? `${weekday} · ${time}` : weekday;

    return (
        <article className="cardio-cell">
            <div className="top">
                <div className="icon" style={{ color }}>
                    <Icon size={18} />
                </div>
                <div className="day">
                    <div className="d">{dayLabel}</div>
                    {dayMeta}
                </div>
            </div>

            <h3 style={{ color }}>{workout.type}</h3>

            <div className="stats-grid">
                <div className="stat-mini">
                    <span className="v">{Math.round(workout.durationMin)} min</span>
                    <span className="l">Duration</span>
                </div>
                {workout.distance !== undefined && workout.distance > 0 && (
                    <div className="stat-mini">
                        <span className="v">{formatDistanceKm(workout.distance)}</span>
                        <span className="l">Distance</span>
                    </div>
                )}
                {workout.pace !== undefined && workout.pace > 0 && (
                    <div className="stat-mini">
                        <span className="v">{formatPaceSecPerKm(workout.pace)}</span>
                        <span className="l">Pace</span>
                    </div>
                )}
                {workout.zoneMinutes !== undefined && workout.zoneMinutes > 0 && (
                    <div className="stat-mini">
                        <span className="v">{workout.zoneMinutes}</span>
                        <span className="l">Zone Min</span>
                    </div>
                )}
                {workout.averageHeartRate !== undefined && (
                    <div className="stat-mini">
                        <span className="v">{workout.averageHeartRate}</span>
                        <span className="l">Avg HR</span>
                    </div>
                )}
                {workout.calories !== undefined && (
                    <div className="stat-mini">
                        <span className="v">{workout.calories.toLocaleString()}</span>
                        <span className="l">Calories</span>
                    </div>
                )}
                {workout.steps !== undefined && (
                    <div className="stat-mini">
                        <span className="v">{workout.steps.toLocaleString()}</span>
                        <span className="l">Steps</span>
                    </div>
                )}
            </div>

            {workout.effort && workout.effort.length > 0 && <EffortChart effort={workout.effort} />}
        </article>
    );
};

export default CardioSessionCard;
