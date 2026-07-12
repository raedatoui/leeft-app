'use client';

import { Timer } from 'lucide-react';
import type { FC } from 'react';
import CardioStatsGrid from '@/components/cardio/v2/cardioStatsGrid';
import { EffortChart } from '@/components/cardio/v2/effortChart';
import { cardioColors, cardioIcons } from '@/lib/cardio-theme';
import { formatTimeOfDay } from '@/lib/dateFormatters';
import type { CardioWorkout } from '@/types';

interface CardioSessionCardProps {
    workout: CardioWorkout;
}

const WEEKDAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CardioSessionCard: FC<CardioSessionCardProps> = ({ workout }) => {
    const Icon = cardioIcons[workout.type] ?? Timer;
    const color = cardioColors[workout.type] ?? '#888888';

    const date = workout.date;
    const dayLabel = `${MONTH_SHORT[date.getUTCMonth()]} ${date.getUTCDate()}`;
    const weekday = WEEKDAY[date.getUTCDay()];
    // `date` is the UTC-midnight day key; wall-clock time lives on `startedAt`.
    const time = workout.startedAt ? formatTimeOfDay(workout.startedAt) : '';
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

            <CardioStatsGrid workout={workout} showDuration />

            {workout.effort && workout.effort.length > 0 && <EffortChart effort={workout.effort} />}
        </article>
    );
};

export default CardioSessionCard;
