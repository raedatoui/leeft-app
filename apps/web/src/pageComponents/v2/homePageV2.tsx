'use client';

import { Clock, Dumbbell, Flame, Gauge, Hash, Heart, Timer, Trophy, X, Zap } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import type { FC } from 'react';
import { useMemo, useState } from 'react';
import EffortTierToggle from '@/components/cardio/v2/effortTierToggle';
import TypeMix from '@/components/cardio/v2/typeMix';
import { V2_PALETTES } from '@/components/charts/chartPaletteV2';
import type { MonthlySeries } from '@/components/charts/monthlyStackedChartV2';
import PageTemplateV2 from '@/components/layout/v2/pageTemplateV2';
import DropdownV2, { type DropdownV2Option } from '@/components/ui/v2/dropdownV2';
import SwipePager from '@/components/ui/v2/swipePager';
import { TopExercisesPanel } from '@/components/workouts/v2/liftCharts';
import MonthCalendar from '@/components/workouts/v2/monthCalendar';
import { WorkoutCard } from '@/components/workouts/v2/workoutCard';
import { cardioColors } from '@/lib/cardio-theme';
import { MONTHS_LONG } from '@/lib/dateFormatters';
import type { CardioLoggedByFilter } from '@/lib/hooks/useCardioPageState';
import { type Modality, useHomePageState } from '@/lib/hooks/useHomePageState';
import type { DayWorkout } from '@/types';

// Highcharts renders client-side only.
const MonthlyStackedChart = dynamic(() => import('@/components/charts/monthlyStackedChartV2'), { ssr: false });

type ViewMode = 'month' | 'daily';

const MIN_DURATION_OPTIONS: DropdownV2Option[] = [
    { value: '0', label: 'Any length' },
    { value: '10', label: '10+ min' },
    { value: '20', label: '20+ min' },
    { value: '30', label: '30+ min' },
];

const LOGGED_BY_OPTIONS: DropdownV2Option[] = [
    { value: 'all', label: 'Any source' },
    { value: 'tracker', label: 'Tracker' },
    { value: 'manual', label: 'Manual' },
    { value: 'auto_detected', label: 'Auto-detected' },
];

const MODALITIES: { value: Modality; label: string }[] = [
    { value: 'cardio', label: 'Cardio' },
    { value: 'lifting', label: 'Lifting' },
    { value: 'both', label: 'Both' },
];

const StatIcon: FC<{ tone: string; icon: React.ReactNode; label: string; value: string }> = ({ tone, icon, label, value }) => (
    <div className="stat-icn" data-tone={tone}>
        <span className="icn">{icon}</span>
        <span className="body">
            <span className="l">{label}</span>
            <span className="v">{value}</span>
        </span>
    </div>
);

const WorkoutsIcon: FC = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <title>Workouts</title>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const formatVolumeTile = (n: number): string =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 10_000 ? `${Math.round(n / 1000)}k` : n.toLocaleString();

const formatHours = (n: number): string => (n >= 10 ? `${Math.round(n)}h` : `${Math.round(n * 10) / 10}h`);

export default function HomePageV2() {
    const state = useHomePageState();
    const {
        modality,
        setModality,
        selectedYear,
        setSelectedYear,
        includeWarmup,
        setIncludeWarmup,
        effortTier,
        setEffortTier,
        minDuration,
        setMinDuration,
        loggedBy,
        setLoggedBy,
        activeType,
        setActiveType,
        activeMuscleGroup,
        setActiveMuscleGroup,
        activeMuscleGroupId,
        exerciseMap,
        muscleGroups,
        muscleGroupColor,
        years,
        yearDays,
        daysDesc,
        currentPage,
        totalPages,
        pageDays,
        visibleMonth,
        goPrevPage,
        goNextPage,
        jumpToMonth,
        cardioStats,
        cardioDistribution,
        cardioMonthlyTrend,
        liftStats,
        muscleDistribution,
        liftMonthlyVolume,
        prMonthly,
        topExercises,
    } = state;

    const [viewMode, setViewMode] = useState<ViewMode>('daily');
    const [viewMonth, setViewMonth] = useState(() => new Date().getUTCMonth());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [allExpanded, setAllExpanded] = useState(false);

    // Derived (not stored) so a filter change that drops or rebuilds the day auto-clears/refreshes the panel.
    const selectedDay = useMemo(
        () => (selectedDate ? (yearDays.find((d) => d.date.getTime() === selectedDate.getTime()) ?? null) : null),
        [yearDays, selectedDate]
    );

    const showLifting = modality !== 'cardio';
    const showCardio = modality !== 'lifting';

    const monthOptions = useMemo<DropdownV2Option[]>(() => MONTHS_LONG.map((name, i) => ({ value: String(i), label: name })), []);
    const yearOptions = useMemo<DropdownV2Option[]>(() => years.map((y) => ({ value: String(y), label: String(y) })), [years]);

    // Mix label counts are the un-narrowed scope (activeType only mutes charts, like the cardio page).
    const cardioCount = useMemo(() => cardioDistribution.reduce((sum, slice) => sum + slice.count, 0), [cardioDistribution]);

    // Highcharts series — stacked bottom-up in mix rank order, colors resolved to hex (SVG can't use CSS vars).
    const { resolvedTheme } = useTheme();
    const pal = V2_PALETTES[resolvedTheme === 'light' ? 'light' : 'dark'];

    const muscleSeries = useMemo<MonthlySeries[]>(() => {
        const colorByName = new Map(muscleGroups.map((g) => [g.name, g.color]));
        return muscleDistribution.map((slice) => ({
            name: slice.type,
            color: colorByName.get(slice.type) ?? '#888888',
            data: liftMonthlyVolume.map((b) => b.byGroupVolume[slice.type] ?? 0),
        }));
    }, [muscleDistribution, muscleGroups, liftMonthlyVolume]);

    const prSeries = useMemo<MonthlySeries[]>(
        () => [
            { name: 'All-time', color: pal.maint, data: prMonthly.map((b) => b.byTier.allTime) },
            { name: 'Active', color: pal.strength, data: prMonthly.map((b) => b.byTier.active) },
            { name: 'Beaten', color: pal.muted, data: prMonthly.map((b) => b.byTier.beaten) },
        ],
        [prMonthly, pal]
    );

    const cardioHoursSeries = useMemo<MonthlySeries[]>(
        () =>
            cardioDistribution.map((slice) => ({
                name: slice.type,
                color: cardioColors[slice.type] ?? '#888888',
                data: cardioMonthlyTrend.map((b) => (b.byTypeDurationMin[slice.type] ?? 0) / 60),
            })),
        [cardioDistribution, cardioMonthlyTrend]
    );

    // Month view: year carry on month nav, stopping at years without data.
    const goPrevMonth = () => {
        setSelectedDate(null);
        if (viewMonth === 0) {
            if (!years.includes(selectedYear - 1)) return;
            setSelectedYear(selectedYear - 1);
            setViewMonth(11);
        } else {
            setViewMonth(viewMonth - 1);
        }
    };
    const goNextMonth = () => {
        setSelectedDate(null);
        if (viewMonth === 11) {
            if (!years.includes(selectedYear + 1)) return;
            setSelectedYear(selectedYear + 1);
            setViewMonth(0);
        } else {
            setViewMonth(viewMonth + 1);
        }
    };

    const handleDaySelect = (day: DayWorkout) => {
        setSelectedDate((current) => (current && current.getTime() === day.date.getTime() ? null : day.date));
    };

    // Column click in the monthly charts jumps whichever view is active to that month.
    const handleChartMonthSelect = (month: number) => {
        if (viewMode === 'month') {
            setViewMonth(month);
            setSelectedDate(null);
        } else {
            jumpToMonth(String(month));
        }
    };

    // Calendar cells are only clickable when they have data, so "adjacent day" for the panel
    // means the nearest day with data in the visible month, not calendar-day ± 1.
    const visibleMonthDays = useMemo(() => yearDays.filter((d) => d.date.getUTCMonth() === viewMonth), [yearDays, viewMonth]);
    const selectedDayIndex = selectedDay ? visibleMonthDays.findIndex((d) => d.date.getTime() === selectedDay.date.getTime()) : -1;
    const goAdjacentDay = (direction: 1 | -1) => {
        const neighbor = visibleMonthDays[selectedDayIndex + direction];
        if (neighbor) setSelectedDate(neighbor.date);
    };

    const heroLabel = modality === 'both' ? 'Log + Cardio' : modality === 'lifting' ? 'Log' : 'Cardio';

    return (
        <PageTemplateV2 footer={`Home · ${selectedYear} · ${liftStats.workouts} lift · ${cardioStats.workouts} cardio`}>
            <section className="hero-row">
                <div className="hero-block">
                    <div className="hero-title medium" style={{ color: modality === 'cardio' ? 'var(--cardio)' : 'var(--maint)' }}>
                        Home
                    </div>
                    <div className="hero-meta">
                        <span className="label">
                            {heroLabel} · {selectedYear}
                        </span>
                        <span className="stats">
                            {modality === 'both' && (
                                <>
                                    <span className="strength">
                                        <b>{liftStats.workouts}</b>lift
                                    </span>
                                    <span className="cardio">
                                        <b>{cardioStats.workouts}</b>cardio
                                    </span>
                                    <span>
                                        <b>{liftStats.totalVolume.toLocaleString()}</b>lbs
                                    </span>
                                    <span className="zone">
                                        <b>{cardioStats.totalZoneMinutes}</b>zone min
                                    </span>
                                </>
                            )}
                            {modality === 'lifting' && (
                                <>
                                    <span className="strength">
                                        <b>{liftStats.workouts}</b>workouts
                                    </span>
                                    <span>
                                        <b>{liftStats.totalVolume.toLocaleString()}</b>lbs
                                    </span>
                                    <span>
                                        <b>{liftStats.totalSets}</b>sets
                                    </span>
                                    <span className="maint">
                                        <b>{liftStats.prCount}</b>PRs
                                    </span>
                                </>
                            )}
                            {modality === 'cardio' && (
                                <>
                                    <span className="cardio">
                                        <b>{cardioStats.workouts}</b>sessions
                                    </span>
                                    <span className="cardio">
                                        <b>{cardioStats.totalDurationHours}h</b>duration
                                    </span>
                                    <span className="zone">
                                        <b>{cardioStats.totalZoneMinutes}</b>zone min
                                    </span>
                                    {cardioStats.totalCalories > 0 && (
                                        <span>
                                            <b>{cardioStats.totalCalories.toLocaleString()}</b>cal
                                        </span>
                                    )}
                                </>
                            )}
                        </span>
                    </div>
                </div>
            </section>

            <div className="toolbar u-mb-8">
                <div className="toolbar-grp">
                    <button
                        type="button"
                        className="icon-btn sm"
                        onClick={viewMode === 'month' ? goPrevMonth : goPrevPage}
                        disabled={
                            viewMode === 'month' ? viewMonth === 0 && !years.includes(selectedYear - 1) : currentPage === 0
                        }
                        aria-label={viewMode === 'month' ? 'Previous month' : 'Newer'}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <title>Previous</title>
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    {viewMode === 'daily' && (
                        <span className="toolbar-pos">
                            <b>{currentPage + 1}</b>
                            <span className="sep">/</span>
                            {totalPages}
                        </span>
                    )}
                    <DropdownV2
                        value={String(viewMode === 'month' ? viewMonth : visibleMonth)}
                        options={monthOptions}
                        onChange={(v) => {
                            if (viewMode === 'month') {
                                setViewMonth(Number(v));
                                setSelectedDate(null);
                            } else {
                                jumpToMonth(v);
                            }
                        }}
                        ariaLabel="Month"
                    />
                    <DropdownV2
                        value={String(selectedYear)}
                        options={yearOptions}
                        onChange={(v) => {
                            setSelectedYear(Number(v));
                            setSelectedDate(null);
                        }}
                        ariaLabel="Year"
                    />
                    <button
                        type="button"
                        className="icon-btn sm"
                        onClick={viewMode === 'month' ? goNextMonth : goNextPage}
                        disabled={
                            viewMode === 'month'
                                ? viewMonth === 11 && !years.includes(selectedYear + 1)
                                : currentPage >= totalPages - 1
                        }
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
                        Show
                    </span>
                    <div className="seg" role="radiogroup" aria-label="Modality">
                        {MODALITIES.map((m) => (
                            <button
                                key={m.value}
                                type="button"
                                className={`seg-btn${modality === m.value ? ' active' : ''}`}
                                onClick={() => setModality(m.value)}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
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
                    {showLifting && (
                        <button
                            type="button"
                            className="toolbar-control"
                            onClick={() => setIncludeWarmup(!includeWarmup)}
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
                            <span className="switch" data-on={includeWarmup}>
                                <span className="thumb" />
                            </span>
                            <span>Warmup</span>
                        </button>
                    )}
                </div>

                {showCardio && (
                    <>
                        <span className="toolbar-divider" />

                        <EffortTierToggle value={effortTier} onChange={setEffortTier} label="Effort" />

                        <div className="toolbar-grp">
                            <DropdownV2
                                value={String(minDuration)}
                                options={MIN_DURATION_OPTIONS}
                                onChange={(v) => setMinDuration(Number(v))}
                                ariaLabel="Minimum duration"
                            />
                            <DropdownV2
                                value={loggedBy}
                                options={LOGGED_BY_OPTIONS}
                                onChange={(v) => setLoggedBy(v as CardioLoggedByFilter)}
                                ariaLabel="Logged by"
                            />
                        </div>
                    </>
                )}
            </div>

            <section className="stat-strip-icons u-mb-8">
                {modality === 'both' && (
                    <>
                        <StatIcon tone="maint" label="Sessions" value={(liftStats.workouts + cardioStats.workouts).toLocaleString()} icon={<WorkoutsIcon />} />
                        <StatIcon tone="strength" label="Volume" value={`${formatVolumeTile(liftStats.totalVolume)} lbs`} icon={<Dumbbell size={16} />} />
                        <StatIcon tone="strength" label="Sets" value={liftStats.totalSets.toLocaleString()} icon={<Hash size={16} />} />
                        <StatIcon tone="maint" label="PRs" value={liftStats.prCount.toLocaleString()} icon={<Trophy size={16} />} />
                        <StatIcon tone="cardio" label="Cardio Hours" value={String(cardioStats.totalDurationHours)} icon={<Clock size={16} />} />
                        <StatIcon tone="zone" label="Zone Minutes" value={cardioStats.totalZoneMinutes.toLocaleString()} icon={<Zap size={16} />} />
                    </>
                )}
                {modality === 'lifting' && (
                    <>
                        <StatIcon tone="maint" label="Workouts" value={liftStats.workouts.toLocaleString()} icon={<WorkoutsIcon />} />
                        <StatIcon tone="strength" label="Volume" value={`${formatVolumeTile(liftStats.totalVolume)} lbs`} icon={<Dumbbell size={16} />} />
                        <StatIcon tone="strength" label="Sets" value={liftStats.totalSets.toLocaleString()} icon={<Hash size={16} />} />
                        <StatIcon tone="maint" label="PRs" value={liftStats.prCount.toLocaleString()} icon={<Trophy size={16} />} />
                        <StatIcon tone="maint" label="Avg Duration" value={`${liftStats.avgDurationMin}m`} icon={<Timer size={16} />} />
                        <StatIcon tone="hyper" label="Avg RPE" value={liftStats.avgRpe > 0 ? String(liftStats.avgRpe) : '—'} icon={<Gauge size={16} />} />
                    </>
                )}
                {modality === 'cardio' && (
                    <>
                        <StatIcon tone="maint" label="Workouts" value={cardioStats.workouts.toLocaleString()} icon={<WorkoutsIcon />} />
                        <StatIcon tone="cardio" label="Total Hours" value={String(cardioStats.totalDurationHours)} icon={<Clock size={16} />} />
                        <StatIcon tone="cardio" label="Avg Duration" value={`${cardioStats.avgDurationMin}m`} icon={<Timer size={16} />} />
                        <StatIcon
                            tone="hyper"
                            label="Calories"
                            value={
                                cardioStats.totalCalories >= 10000
                                    ? `${(cardioStats.totalCalories / 1000).toFixed(1)}k`
                                    : cardioStats.totalCalories.toLocaleString()
                            }
                            icon={<Flame size={16} />}
                        />
                        <StatIcon
                            tone="hyper"
                            label="Avg HR"
                            value={cardioStats.avgHeartRate > 0 ? `${cardioStats.avgHeartRate} bpm` : '—'}
                            icon={<Heart size={16} />}
                        />
                        <StatIcon tone="zone" label="Zone Minutes" value={cardioStats.totalZoneMinutes.toLocaleString()} icon={<Zap size={16} />} />
                    </>
                )}
            </section>

            {showLifting && (
                <>
                    <section className="charts-row">
                        <div className="chart-zone">
                            <div className="panel-label" style={{ margin: 0 }}>
                                <span>Muscle Mix · {liftStats.totalSets} sets</span>
                                <span className="hint">click a group to filter</span>
                            </div>
                            <TypeMix distribution={muscleDistribution} activeType={activeMuscleGroup} onTypeSelect={setActiveMuscleGroup} />
                        </div>
                        <div className="chart-zone">
                            <div className="panel-label" style={{ margin: 0 }}>
                                <span>Monthly · Volume by muscle</span>
                                <span className="hint">click a month to jump</span>
                            </div>
                            <MonthlyStackedChart
                                series={muscleSeries}
                                activeName={activeMuscleGroup}
                                onMonthClick={handleChartMonthSelect}
                                formatValue={(n) => `${Math.round(n).toLocaleString()} lbs`}
                                formatStackLabel={(n) => formatVolumeTile(Math.round(n))}
                                emptyLabel="No lifting in this period"
                            />
                        </div>
                    </section>
                    <section className="charts-row">
                        <div className="chart-zone">
                            <div className="panel-label" style={{ margin: 0 }}>
                                <span>Top Exercises · by sets</span>
                                <span className="hint">{selectedYear}</span>
                            </div>
                            <TopExercisesPanel rows={topExercises} muscleGroupColor={muscleGroupColor} activeMuscleGroupId={activeMuscleGroupId} />
                        </div>
                        <div className="chart-zone">
                            <div className="panel-label" style={{ margin: 0 }}>
                                <span>Monthly · PRs</span>
                                <span className="hint">click a month to jump</span>
                            </div>
                            <MonthlyStackedChart
                                series={prSeries}
                                onMonthClick={handleChartMonthSelect}
                                formatValue={(n) => `${n} PR${n === 1 ? '' : 's'}`}
                                formatStackLabel={(n) => String(n)}
                                showLegend
                                emptyLabel="No PRs in this period"
                            />
                        </div>
                    </section>
                </>
            )}

            {showCardio && (
                <section className="charts-row">
                    <div className="chart-zone">
                        <div className="panel-label" style={{ margin: 0 }}>
                            <span>Mix · {cardioCount} sessions</span>
                            <span className="hint">click a type to filter</span>
                        </div>
                        <TypeMix distribution={cardioDistribution} activeType={activeType} onTypeSelect={setActiveType} />
                    </div>
                    <div className="chart-zone">
                        <div className="panel-label" style={{ margin: 0 }}>
                            <span>Monthly · Hours by type</span>
                            <span className="hint">click a month to jump</span>
                        </div>
                        <MonthlyStackedChart
                            series={cardioHoursSeries}
                            activeName={activeType}
                            onMonthClick={handleChartMonthSelect}
                            formatValue={formatHours}
                            emptyLabel="No sessions in this period"
                        />
                    </div>
                </section>
            )}

            {viewMode === 'month' ? (
                <>
                    <div className="panel-label">
                        <span>
                            Calendar · {MONTHS_LONG[viewMonth]} {selectedYear}
                        </span>
                        <span className="hint">click a day for detail</span>
                    </div>
                    <div className={`calendar-split${selectedDay ? ' with-panel' : ''}`}>
                        <SwipePager pageKey={selectedYear * 12 + viewMonth} onPrev={goPrevMonth} onNext={goNextMonth}>
                            <MonthCalendar
                                days={yearDays}
                                viewYear={selectedYear}
                                viewMonth={viewMonth}
                                selectedDate={selectedDay?.date ?? null}
                                onDaySelect={handleDaySelect}
                            />
                        </SwipePager>
                        {selectedDay && (
                            <aside className="day-panel-inline" aria-label="Workout details">
                                <button type="button" className="day-panel-close" aria-label="Close" onClick={() => setSelectedDate(null)}>
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
                                        exerciseMap={exerciseMap}
                                        includeWarmup={includeWarmup}
                                        muscleGroupColor={muscleGroupColor}
                                        muscleGroupFilter={activeMuscleGroupId}
                                        initialCompact={!allExpanded}
                                    />
                                </SwipePager>
                            </aside>
                        )}
                    </div>
                </>
            ) : daysDesc.length > 0 ? (
                <>
                    <div className="panel-label">
                        <span>
                            Daily · page {currentPage + 1} of {totalPages}
                        </span>
                    </div>
                    <SwipePager
                        pageKey={currentPage}
                        onPrev={goPrevPage}
                        onNext={goNextPage}
                        disabled={{ prev: currentPage === 0, next: currentPage >= totalPages - 1 }}
                        className="log-grid"
                    >
                        {pageDays.map((day) => (
                            <WorkoutCard
                                key={`${day.date.toISOString()}-${allExpanded}`}
                                day={day}
                                exerciseMap={exerciseMap}
                                includeWarmup={includeWarmup}
                                muscleGroupColor={muscleGroupColor}
                                muscleGroupFilter={activeMuscleGroupId}
                                initialCompact={!allExpanded}
                            />
                        ))}
                    </SwipePager>
                </>
            ) : (
                <div className="empty-state">No workouts match the current filters.</div>
            )}
        </PageTemplateV2>
    );
}
