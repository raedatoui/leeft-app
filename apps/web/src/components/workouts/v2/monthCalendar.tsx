'use client';

import { Dumbbell, Timer } from 'lucide-react';
import type { FC } from 'react';
import { cardioColors, cardioIcons } from '@/lib/cardio-theme';
import type { CardioWorkout, DayWorkout } from '@/types';

interface MonthCalendarProps {
    /** All days with workouts (any year). The calendar filters to the visible month. */
    days: DayWorkout[];
    viewYear: number;
    /** 0-indexed month (0 = January). */
    viewMonth: number;
    selectedDate: Date | null;
    onDaySelect: (day: DayWorkout) => void;
}

const DOW_LABELS = [
    { key: 'mon', label: 'M' },
    { key: 'tue', label: 'T' },
    { key: 'wed', label: 'W' },
    { key: 'thu', label: 'T' },
    { key: 'fri', label: 'F' },
    { key: 'sat', label: 'S' },
    { key: 'sun', label: 'S' },
];

const utcDateKey = (d: Date): string => {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

const cardioBadge = (workout: CardioWorkout) => {
    const Icon = cardioIcons[workout.type] ?? Timer;
    const color = cardioColors[workout.type] ?? 'var(--cardio)';
    return { Icon, color, label: workout.type };
};

export const MonthCalendar: FC<MonthCalendarProps> = ({ days, viewYear, viewMonth, selectedDate, onDaySelect }) => {
    // Index days by UTC date for O(1) lookup.
    const byDate = new Map<string, DayWorkout>();
    for (const d of days) {
        byDate.set(utcDateKey(d.date), d);
    }

    // First day of the month and weekday offset for the leading blank cells.
    const first = new Date(Date.UTC(viewYear, viewMonth, 1));
    const lastDayNum = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
    // Monday-first: shift Sunday (getUTCDay() === 0) to the last column.
    const leadingBlanks = (first.getUTCDay() + 6) % 7;

    // Build cells: blanks + days.
    const cells: ({ date: Date; key: string } | null)[] = [];
    for (let i = 0; i < leadingBlanks; i++) cells.push(null);
    for (let day = 1; day <= lastDayNum; day++) {
        const date = new Date(Date.UTC(viewYear, viewMonth, day));
        cells.push({ date, key: utcDateKey(date) });
    }
    // Pad the trailing row so the grid is always a multiple of 7.
    while (cells.length % 7 !== 0) cells.push(null);

    // "Today" is the user's wall-clock date (local components), while day keys are
    // UTC-midnight calendar dates — utcDateKey(new Date()) would ring tomorrow's cell every evening.
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const selectedKey = selectedDate ? utcDateKey(selectedDate) : null;

    return (
        <div className="month-cal">
            <div className="month-cal-dows">
                {DOW_LABELS.map((d) => (
                    <div key={d.key} className="month-cal-dow">
                        {d.label}
                    </div>
                ))}
            </div>

            <div className="month-cal-grid">
                {cells.map((cell, i) => {
                    // biome-ignore lint/suspicious/noArrayIndexKey: cells is fully rebuilt from viewYear/viewMonth each render; blanks are stateless and never reorder
                    if (!cell) return <div key={`blank-${i}`} className="month-cal-cell empty" />;
                    const day = byDate.get(cell.key);
                    const hasWorkout = !!day;
                    const isToday = cell.key === todayKey;
                    const isSelected = cell.key === selectedKey;

                    return (
                        <button
                            type="button"
                            key={cell.key}
                            className={`month-cal-cell${hasWorkout ? ' has-workout' : ''}${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`}
                            onClick={() => day && onDaySelect(day)}
                            disabled={!hasWorkout}
                            aria-label={`${cell.date.toUTCString().slice(0, 16)}${hasWorkout ? ' (workout)' : ''}`}
                        >
                            <span className="day-num">{cell.date.getUTCDate()}</span>
                            {day && (
                                <span className="day-icons">
                                    {day.liftingWorkouts.length > 0 && (
                                        <span className="day-icon" style={{ color: 'var(--maint)' }} title="Lifting">
                                            <Dumbbell size={12} aria-hidden="true" />
                                        </span>
                                    )}
                                    {day.cardioWorkouts.map((c) => {
                                        const { Icon, color, label } = cardioBadge(c);
                                        return (
                                            <span key={c.uuid} className="day-icon" style={{ color }} title={label}>
                                                <Icon size={12} aria-hidden="true" />
                                            </span>
                                        );
                                    })}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default MonthCalendar;
