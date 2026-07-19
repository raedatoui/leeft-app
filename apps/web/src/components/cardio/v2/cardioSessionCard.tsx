'use client';

import { Timer } from 'lucide-react';
import type { FC } from 'react';
import CardioStatsGrid from '@/components/cardio/v2/cardioStatsGrid';
import { EffortChart } from '@/components/cardio/v2/effortChart';
import { cardioColors, cardioIcons } from '@/lib/cardio-theme';
import { formatTimeOfDay } from '@/lib/dateFormatters';
import type { CardioWorkout } from '@/types';

interface CardioSessionCardProps {
    /** All sessions logged on the same UTC day, in chronological order. */
    workouts: CardioWorkout[];
}

const WEEKDAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CardioSessionCard: FC<CardioSessionCardProps> = ({ workouts }) => {
    const first = workouts[0];
    if (!first) return null;
    const date = first.date;
    const dayLabel = `${MONTH_SHORT[date.getUTCMonth()]} ${date.getUTCDate()}`;
    const weekday = WEEKDAY[date.getUTCDay()];
    // `date` is the UTC-midnight day key; wall-clock time lives on `startedAt`.
    // Single-session cards show the time in the day meta; multi-session cards show it per session.
    const soloTime = workouts.length === 1 && first.startedAt ? formatTimeOfDay(first.startedAt) : '';
    const dayMeta = soloTime ? `${weekday} · ${soloTime}` : weekday;

    return (
        <article className="cardio-cell">
            <div className="top">
                <div className="icons">
                    {workouts.map((w) => {
                        const Icon = cardioIcons[w.type] ?? Timer;
                        return (
                            <span key={w.uuid} className="icon" style={{ color: cardioColors[w.type] ?? '#888888' }}>
                                <Icon size={18} />
                            </span>
                        );
                    })}
                </div>
                <div className="day">
                    <div className="d">{dayLabel}</div>
                    {dayMeta}
                </div>
            </div>

            {workouts.map((w) => (
                <section key={w.uuid} className="sess">
                    <h3 style={{ color: cardioColors[w.type] ?? '#888888' }}>
                        {w.type}
                        {workouts.length > 1 && w.startedAt && <span className="at">{formatTimeOfDay(w.startedAt)}</span>}
                    </h3>
                    <CardioStatsGrid workout={w} showDuration />
                    {w.effort && w.effort.length > 0 && <EffortChart effort={w.effort} />}
                </section>
            ))}
        </article>
    );
};

export default CardioSessionCard;
