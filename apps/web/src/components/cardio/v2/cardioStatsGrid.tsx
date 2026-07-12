import type { FC } from 'react';
import type { CardioWorkout } from '@/types';

export function formatDistanceKm(km: number): string {
    return `${km.toFixed(km >= 10 ? 1 : 2)} km`;
}

export function formatPaceSecPerKm(sec: number): string {
    const min = Math.floor(sec / 60);
    const rem = Math.round(sec - min * 60);
    return `${min}:${String(rem).padStart(2, '0')} /km`;
}

interface CardioStatsGridProps {
    workout: CardioWorkout;
    /** The /cardio session cell shows duration as a tile; the workout card already shows it in the headline. */
    showDuration?: boolean;
}

/** Shared stat tiles for a cardio session (workout card + /cardio session cell). Zero-value tiles are hidden. */
const CardioStatsGrid: FC<CardioStatsGridProps> = ({ workout, showDuration = false }) => (
    <div className="cardio-stats-grid">
        {showDuration && (
            <div className="ks">
                <span className="v">{Math.round(workout.durationMin)} min</span>
                <span className="l">Duration</span>
            </div>
        )}
        {workout.distance != null && workout.distance > 0 && (
            <div className="ks">
                <span className="v" style={{ color: 'var(--cardio)' }}>
                    {formatDistanceKm(workout.distance)}
                </span>
                <span className="l">Distance</span>
            </div>
        )}
        {workout.pace != null && workout.pace > 0 && (
            <div className="ks">
                <span className="v">{formatPaceSecPerKm(workout.pace)}</span>
                <span className="l">Pace</span>
            </div>
        )}
        {workout.zoneMinutes != null && workout.zoneMinutes > 0 && (
            <div className="ks">
                <span className="v" style={{ color: 'var(--zone)' }}>
                    {workout.zoneMinutes}
                </span>
                <span className="l">Zone Min</span>
            </div>
        )}
        {workout.averageHeartRate != null && (
            <div className="ks">
                <span className="v">{workout.averageHeartRate}</span>
                <span className="l">Avg HR</span>
            </div>
        )}
        {workout.calories != null && (
            <div className="ks">
                <span className="v">{workout.calories.toLocaleString()}</span>
                <span className="l">Calories</span>
            </div>
        )}
        {workout.steps != null && (
            <div className="ks">
                <span className="v">{workout.steps.toLocaleString()}</span>
                <span className="l">Steps</span>
            </div>
        )}
    </div>
);

export default CardioStatsGrid;
