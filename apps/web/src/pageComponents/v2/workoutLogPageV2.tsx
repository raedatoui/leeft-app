'use client';

import { X } from 'lucide-react';
import { useMemo, useState } from 'react';
import EffortTierToggle from '@/components/cardio/v2/effortTierToggle';
import PageTemplateV2 from '@/components/layout/v2/pageTemplateV2';
import DropdownV2, { type DropdownV2Option } from '@/components/ui/v2/dropdownV2';
import SwipePager from '@/components/ui/v2/swipePager';
import MonthCalendar from '@/components/workouts/v2/monthCalendar';
import { WorkoutCard } from '@/components/workouts/v2/workoutCard';
import { useWorkoutData } from '@/lib/contexts';
import { MONTHS_LONG } from '@/lib/dateFormatters';
import { useMuscleGroupColor } from '@/lib/hooks/useMuscleGroupColor';
import { useWorkoutLogState } from '@/lib/hooks/useWorkoutLogState';
import type { DayWorkout } from '@/types';

type ViewMode = 'month' | 'daily';

export default function WorkoutLogPageV2() {
    const state = useWorkoutLogState({ includeWarmup: false });
    const { muscleGroups } = useWorkoutData();

    const muscleGroupColor = useMuscleGroupColor(muscleGroups);

    // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally computed once on mount to seed initial state, not recomputed as workouts load
    const initialView = useMemo(() => {
        const last = state.workouts[state.workouts.length - 1];
        if (last) return { year: last.date.getUTCFullYear(), month: last.date.getUTCMonth() };
        const now = new Date();
        return { year: now.getUTCFullYear(), month: now.getUTCMonth() };
    }, []);

    const [viewMode, setViewMode] = useState<ViewMode>('daily');
    const [viewYear, setViewYear] = useState(initialView.year);
    const [viewMonth, setViewMonth] = useState(initialView.month);
    const [selectedDay, setSelectedDay] = useState<DayWorkout | null>(null);
    const [allExpanded, setAllExpanded] = useState(false);

    const availableYears = useMemo(() => {
        const ys = new Set<number>();
        for (const d of state.workouts) ys.add(d.date.getUTCFullYear());
        return Array.from(ys).sort((a, b) => b - a);
    }, [state.workouts]);

    const monthOptions = useMemo<DropdownV2Option[]>(() => MONTHS_LONG.map((name, i) => ({ value: String(i), label: name })), []);
    const yearOptions = useMemo<DropdownV2Option[]>(() => availableYears.map((y) => ({ value: String(y), label: String(y) })), [availableYears]);

    const goPrevMonth = () => {
        setViewMonth((m) => {
            if (m === 0) {
                setViewYear((y) => y - 1);
                return 11;
            }
            return m - 1;
        });
        setSelectedDay(null);
    };

    const goNextMonth = () => {
        setViewMonth((m) => {
            if (m === 11) {
                setViewYear((y) => y + 1);
                return 0;
            }
            return m + 1;
        });
        setSelectedDay(null);
    };

    // Stats for the visible month — drives the headline meta line.
    const monthStats = useMemo(() => {
        let lift = 0;
        let cardio = 0;
        let liftVolume = 0;
        let zoneMin = 0;
        for (const day of state.workouts) {
            if (day.date.getUTCFullYear() !== viewYear || day.date.getUTCMonth() !== viewMonth) continue;
            lift += day.liftingWorkouts.length;
            cardio += day.cardioWorkouts.length;
            for (const w of day.liftingWorkouts) {
                liftVolume += state.includeWarmup ? w.volume : w.workVolume;
            }
            for (const c of day.cardioWorkouts) {
                zoneMin += c.zoneMinutes ?? 0;
            }
        }
        return { lift, cardio, liftVolume, zoneMin };
    }, [state.workouts, state.includeWarmup, viewYear, viewMonth]);

    const handleDaySelect = (day: DayWorkout) => {
        setSelectedDay((current) => (current && current.date.getTime() === day.date.getTime() ? null : day));
    };

    const monthLabel = `${MONTHS_LONG[viewMonth]} ${viewYear}`;

    // Daily view: latest-first slider — slice the reversed workouts by the hook's slider state.
    const dailyDays = useMemo(() => {
        const reversed = [...state.workouts].reverse();
        const start = state.currentIndex * state.effectiveSlidesToShow;
        return reversed.slice(start, start + state.effectiveSlidesToShow);
    }, [state.workouts, state.currentIndex, state.effectiveSlidesToShow]);

    // Calendar cells are only clickable when they have data, so "adjacent day" for the panel
    // means the nearest day with data in the visible month, not calendar-day ± 1.
    const visibleMonthDays = useMemo(
        () =>
            state.workouts
                .filter((day) => day.date.getUTCFullYear() === viewYear && day.date.getUTCMonth() === viewMonth)
                .sort((a, b) => a.date.getTime() - b.date.getTime()),
        [state.workouts, viewYear, viewMonth]
    );

    const selectedDayIndex = selectedDay ? visibleMonthDays.findIndex((d) => d.date.getTime() === selectedDay.date.getTime()) : -1;

    const goAdjacentDay = (direction: 1 | -1) => {
        const neighbor = visibleMonthDays[selectedDayIndex + direction];
        if (neighbor) setSelectedDay(neighbor);
    };

    return (
        <PageTemplateV2 footer={`${monthLabel} · ${monthStats.lift} lift · ${monthStats.cardio} cardio`}>
            <section className="hero-row">
                <div className="hero-block">
                    <div className="hero-title medium" style={{ color: 'var(--maint)' }}>
                        Log
                    </div>
                    <div className="hero-meta">
                        <span className="label">Workout Log · {monthLabel}</span>
                        <span className="stats">
                            <span className="strength">
                                <b>{monthStats.lift}</b>lift
                            </span>
                            <span className="cardio">
                                <b>{monthStats.cardio}</b>cardio
                            </span>
                            <span>
                                <b>{monthStats.liftVolume.toLocaleString()}</b>lbs
                            </span>
                            <span className="zone">
                                <b>{monthStats.zoneMin}</b>zone min
                            </span>
                        </span>
                    </div>
                </div>
            </section>

            <div className="toolbar u-mb-8">
                <div className="toolbar-grp">
                    <button
                        type="button"
                        className="icon-btn sm"
                        onClick={viewMode === 'month' ? goPrevMonth : state.slideLeft}
                        disabled={viewMode === 'daily' && state.currentIndex === 0}
                        aria-label={viewMode === 'month' ? 'Previous month' : 'Newer'}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <title>Previous</title>
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    {viewMode === 'daily' && (
                        <span className="toolbar-pos">
                            <b>{state.currentIndex + 1}</b>
                            <span className="sep">/</span>
                            {state.slideCount}
                        </span>
                    )}
                    <DropdownV2
                        value={String(viewMonth)}
                        options={monthOptions}
                        onChange={(v) => {
                            const m = Number(v);
                            setViewMonth(m);
                            setSelectedDay(null);
                            if (viewMode === 'daily') state.jumpToMonth(String(m));
                        }}
                        ariaLabel="Month"
                    />
                    <DropdownV2
                        value={String(viewYear)}
                        options={yearOptions}
                        onChange={(v) => {
                            const y = Number(v);
                            setViewYear(y);
                            setSelectedDay(null);
                            if (viewMode === 'daily') state.jumpToYear(String(y));
                        }}
                        ariaLabel="Year"
                    />
                    <button
                        type="button"
                        className="icon-btn sm"
                        onClick={viewMode === 'month' ? goNextMonth : state.slideRight}
                        disabled={viewMode === 'daily' && state.currentIndex >= state.slideCount - 1}
                        aria-label={viewMode === 'month' ? 'Next month' : 'Older'}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <title>Next</title>
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>
                </div>

                <span className="toolbar-divider" />

                <div className="toolbar-grp">
                    <span className="label-mono" style={{ padding: '0 8px' }}>
                        View
                    </span>
                    <div className="seg" role="radiogroup" aria-label="View mode">
                        <button type="button" className={`seg-btn${viewMode === 'month' ? ' active' : ''}`} onClick={() => setViewMode('month')}>
                            Month
                        </button>
                        <button type="button" className={`seg-btn${viewMode === 'daily' ? ' active' : ''}`} onClick={() => setViewMode('daily')}>
                            Daily
                        </button>
                    </div>
                </div>

                <span className="toolbar-divider" />

                <div className="toolbar-grp">
                    <button
                        type="button"
                        className="toolbar-control"
                        onClick={() => setAllExpanded((e) => !e)}
                        title="Expand or collapse all workout cards"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <title>Detail</title>
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                        <span className="switch" data-on={allExpanded}>
                            <span className="thumb" />
                        </span>
                        <span>Detail</span>
                    </button>
                    <button
                        type="button"
                        className="toolbar-control"
                        onClick={() => state.setIncludeWarmup(!state.includeWarmup)}
                        title="Include warmup sets in volume"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <title>Warmup</title>
                            <path d="m6.5 6.5 11 11" />
                            <path d="m21 21-1-1" />
                            <path d="m3 3 1 1" />
                            <path d="m18 22 4-4" />
                            <path d="m2 6 4-4" />
                        </svg>
                        <span className="switch" data-on={state.includeWarmup}>
                            <span className="thumb" />
                        </span>
                        <span>Warmup</span>
                    </button>
                </div>

                <span className="toolbar-divider" />

                <EffortTierToggle value={state.effortTier} onChange={state.setEffortTier} />
            </div>

            {viewMode === 'month' ? (
                <>
                    <div className="panel-label">
                        <span>Calendar · {monthLabel}</span>
                        <span className="hint">click a day for detail</span>
                    </div>
                    <div className={`calendar-split${selectedDay ? ' with-panel' : ''}`}>
                        <SwipePager pageKey={viewYear * 12 + viewMonth} onPrev={goPrevMonth} onNext={goNextMonth}>
                            <MonthCalendar
                                days={state.workouts}
                                viewYear={viewYear}
                                viewMonth={viewMonth}
                                selectedDate={selectedDay?.date ?? null}
                                onDaySelect={handleDaySelect}
                            />
                        </SwipePager>
                        {selectedDay && (
                            <aside className="day-panel-inline" aria-label="Workout details">
                                <button type="button" className="day-panel-close" aria-label="Close" onClick={() => setSelectedDay(null)}>
                                    <X size={14} aria-hidden="true" />
                                </button>
                                <SwipePager
                                    pageKey={selectedDay.date.getTime()}
                                    onPrev={() => goAdjacentDay(-1)}
                                    onNext={() => goAdjacentDay(1)}
                                    disabled={{
                                        prev: selectedDayIndex <= 0,
                                        next: selectedDayIndex === -1 || selectedDayIndex >= visibleMonthDays.length - 1,
                                    }}
                                >
                                    <WorkoutCard
                                        key={`${selectedDay.date.toISOString()}-${allExpanded}`}
                                        day={selectedDay}
                                        exerciseMap={state.exerciseMap}
                                        includeWarmup={state.includeWarmup}
                                        muscleGroupColor={muscleGroupColor}
                                        initialCompact={!allExpanded}
                                    />
                                </SwipePager>
                            </aside>
                        )}
                    </div>
                </>
            ) : dailyDays.length > 0 ? (
                <>
                    <div className="panel-label">
                        <span>
                            Daily · {dailyDays.length} session{dailyDays.length === 1 ? '' : 's'} · page {state.currentIndex + 1} of{' '}
                            {state.slideCount}
                        </span>
                    </div>
                    <SwipePager
                        pageKey={state.currentIndex}
                        onPrev={state.slideLeft}
                        onNext={state.slideRight}
                        disabled={{ prev: state.currentIndex === 0, next: state.currentIndex >= state.slideCount - 1 }}
                        className="log-grid"
                    >
                        {dailyDays.map((day) => (
                            <WorkoutCard
                                key={`${day.date.toISOString()}-${allExpanded}`}
                                day={day}
                                exerciseMap={state.exerciseMap}
                                includeWarmup={state.includeWarmup}
                                muscleGroupColor={muscleGroupColor}
                                initialCompact={!allExpanded}
                            />
                        ))}
                    </SwipePager>
                </>
            ) : (
                <div className="empty-state">No workouts to show.</div>
            )}
        </PageTemplateV2>
    );
}
