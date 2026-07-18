'use client';

import { Clock, Flame, Heart, Timer, Zap } from 'lucide-react';
import type { FC } from 'react';
import { useEffect, useMemo, useState } from 'react';
import CardioSessionCard from '@/components/cardio/v2/cardioSessionCard';
import EffortTierToggle from '@/components/cardio/v2/effortTierToggle';
import MonthlyBars from '@/components/cardio/v2/monthlyBars';
import TypeMix from '@/components/cardio/v2/typeMix';
import PageTemplateV2 from '@/components/layout/v2/pageTemplateV2';
import DropdownV2, { type DropdownV2Option } from '@/components/ui/v2/dropdownV2';
import SwipePager from '@/components/ui/v2/swipePager';
import TablePager from '@/components/ui/v2/tablePager';
import { formatTableDate } from '@/lib/dateFormatters';
import { type CardioLoggedByFilter, type CardioPeriod, useCardioPageState } from '@/lib/hooks/useCardioPageState';
import { useResponsiveColumns } from '@/lib/hooks/useResponsiveColumns';

const PERIOD_OPTIONS: DropdownV2Option[] = [
    { value: 'ytd', label: 'Year to date' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: 'all', label: 'All time' },
];

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

const StatIcon: FC<{ tone: string; icon: React.ReactNode; label: string; value: string }> = ({ tone, icon, label, value }) => (
    <div className="stat-icn" data-tone={tone}>
        <span className="icn">{icon}</span>
        <span className="body">
            <span className="l">{label}</span>
            <span className="v">{value}</span>
        </span>
    </div>
);

export default function CardioPageV2() {
    const state = useCardioPageState();
    const {
        selectedYear,
        activeType,
        setActiveType,
        period,
        setPeriod,
        effortTier,
        setEffortTier,
        minDuration,
        setMinDuration,
        loggedBy,
        setLoggedBy,
        years,
        scopedWorkouts,
        sortedWorkouts,
        stats,
        distribution,
        monthlyTrend,
        goToPrevYear,
        goToNextYear,
    } = state;

    const typeOrder = useMemo(() => distribution.map((slice) => slice.type), [distribution]);

    // Same-day sessions share one card, in chronological order (sortedWorkouts is newest-day first).
    const dayCards = useMemo(() => {
        const byDay = new Map<string, typeof sortedWorkouts>();
        for (const w of sortedWorkouts) {
            const key = w.date.toISOString().slice(0, 10);
            const group = byDay.get(key);
            if (group) group.push(w);
            else byDay.set(key, [w]);
        }
        return [...byDay.values()].map((group) => group.sort((a, b) => (a.startedAt?.getTime() ?? 0) - (b.startedAt?.getTime() ?? 0)));
    }, [sortedWorkouts]);

    // Slider like the log page's daily view: one grid row of cards per page, page size tracks the responsive column count.
    const columns = useResponsiveColumns();
    const [tablePage, setTablePage] = useState(0);
    // Breakpoint crossings change the page size — snap back to the newest page.
    useEffect(() => {
        setTablePage(0);
    }, [columns]);
    const totalPages = Math.max(1, Math.ceil(dayCards.length / columns));
    const currentPage = Math.min(tablePage, totalPages - 1);
    const pageCards = dayCards.slice(currentPage * columns, currentPage * columns + columns);
    const pageRangeStart = pageCards[0]?.[0]?.date;
    const pageRangeEnd = pageCards[pageCards.length - 1]?.[0]?.date;

    const goPrevPage = () => setTablePage((p) => Math.max(0, p - 1));
    const goNextPage = () => setTablePage((p) => Math.min(totalPages - 1, p + 1));

    const yearLabel =
        period === 'ytd' ? `${selectedYear} · Year-to-date` : period === '30d' ? 'Last 30 days' : period === '90d' ? 'Last 90 days' : 'All time';

    const prevDisabled = years.length === 0 || selectedYear === Math.min(...years);
    const nextDisabled = years.length === 0 || selectedYear === Math.max(...years);

    const allCount = scopedWorkouts.length;

    return (
        <PageTemplateV2 footer={`Cardio · ${sortedWorkouts.length} of ${allCount} sessions`}>
            <section className="hero-row">
                <div className="hero-block">
                    <div className="hero-title medium" style={{ color: 'var(--cardio)' }}>
                        Cardio
                    </div>
                    <div className="hero-meta">
                        <span className="label">Cardio · {yearLabel}</span>
                        <span className="stats">
                            <span className="cardio">
                                <b>{stats.workouts}</b>sessions
                            </span>
                            <span className="cardio">
                                <b>{stats.totalDurationHours}h</b>duration
                            </span>
                            <span className="zone">
                                <b>{stats.totalZoneMinutes}</b>zone min
                            </span>
                            {stats.totalCalories > 0 && (
                                <span>
                                    <b>{stats.totalCalories.toLocaleString()}</b>cal
                                </span>
                            )}
                        </span>
                    </div>
                </div>
            </section>

            <div className="toolbar u-mb-8">
                {period === 'ytd' && (
                    <>
                        <div className="toolbar-grp">
                            <div className="year-nav">
                                <button
                                    type="button"
                                    className="icon-btn sm"
                                    onClick={() => {
                                        goToPrevYear();
                                        setTablePage(0);
                                    }}
                                    disabled={prevDisabled}
                                    aria-label="Previous year"
                                >
                                    <svg
                                        width="12"
                                        height="12"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        aria-hidden="true"
                                    >
                                        <title>Previous</title>
                                        <polyline points="15 18 9 12 15 6" />
                                    </svg>
                                </button>
                                <span className="label-mono" style={{ padding: '0 4px' }}>
                                    {selectedYear}
                                </span>
                                <button
                                    type="button"
                                    className="icon-btn sm"
                                    onClick={() => {
                                        goToNextYear();
                                        setTablePage(0);
                                    }}
                                    disabled={nextDisabled}
                                    aria-label="Next year"
                                >
                                    <svg
                                        width="12"
                                        height="12"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        aria-hidden="true"
                                    >
                                        <title>Next</title>
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <span className="toolbar-divider" />
                    </>
                )}

                <EffortTierToggle
                    value={effortTier}
                    onChange={(v) => {
                        setEffortTier(v);
                        setTablePage(0);
                    }}
                    label="Effort"
                />

                <span className="toolbar-divider" />

                <div className="toolbar-grp">
                    <DropdownV2
                        value={String(minDuration)}
                        options={MIN_DURATION_OPTIONS}
                        onChange={(v) => {
                            setMinDuration(Number(v));
                            setTablePage(0);
                        }}
                        ariaLabel="Minimum duration"
                    />
                    <DropdownV2
                        value={loggedBy}
                        options={LOGGED_BY_OPTIONS}
                        onChange={(v) => {
                            setLoggedBy(v as CardioLoggedByFilter);
                            setTablePage(0);
                        }}
                        ariaLabel="Logged by"
                    />
                </div>

                <div className="toolbar-grp" style={{ marginLeft: 'auto' }}>
                    <span className="label-mono" style={{ padding: '0 8px' }}>
                        Period
                    </span>
                    <DropdownV2
                        value={period}
                        options={PERIOD_OPTIONS}
                        onChange={(v) => {
                            setPeriod(v as CardioPeriod);
                            setTablePage(0);
                        }}
                        ariaLabel="Period"
                    />
                </div>
            </div>

            <section className="stat-strip-icons u-mb-8">
                <StatIcon
                    tone="maint"
                    label="Workouts"
                    value={stats.workouts.toLocaleString()}
                    icon={
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <title>Workouts</title>
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                    }
                />
                <StatIcon tone="cardio" label="Total Hours" value={String(stats.totalDurationHours)} icon={<Clock size={16} />} />
                <StatIcon tone="cardio" label="Avg Duration" value={`${stats.avgDurationMin}m`} icon={<Timer size={16} />} />
                <StatIcon
                    tone="hyper"
                    label="Calories"
                    value={stats.totalCalories >= 10000 ? `${(stats.totalCalories / 1000).toFixed(1)}k` : stats.totalCalories.toLocaleString()}
                    icon={<Flame size={16} />}
                />
                <StatIcon tone="hyper" label="Avg HR" value={stats.avgHeartRate > 0 ? `${stats.avgHeartRate} bpm` : '—'} icon={<Heart size={16} />} />
                <StatIcon tone="zone" label="Zone Minutes" value={stats.totalZoneMinutes.toLocaleString()} icon={<Zap size={16} />} />
            </section>

            <section className="charts-row">
                <div className="chart-zone">
                    <div className="panel-label" style={{ margin: 0 }}>
                        <span>Mix · {allCount} sessions</span>
                        <span className="hint">click a type to filter</span>
                    </div>
                    <TypeMix
                        distribution={distribution}
                        activeType={activeType}
                        onTypeSelect={(t) => {
                            setActiveType(t);
                            setTablePage(0);
                        }}
                    />
                </div>

                <div className="chart-zone">
                    <div className="panel-label" style={{ margin: 0 }}>
                        <span>Monthly · Hours by type</span>
                        <span className="hint">
                            {period === 'ytd' ? selectedYear : period === 'all' ? 'all years' : period === '30d' ? 'last 30d' : 'last 90d'}
                        </span>
                    </div>
                    <MonthlyBars monthlyTrend={monthlyTrend} typeOrder={typeOrder} activeType={activeType} />
                </div>
            </section>

            {sortedWorkouts.length > 0 ? (
                <>
                    <TablePager
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPrev={goPrevPage}
                        onNext={goNextPage}
                        rangeLabel={
                            pageRangeStart && pageRangeEnd ? `${formatTableDate(pageRangeStart)} → ${formatTableDate(pageRangeEnd)}` : undefined
                        }
                    />
                    <SwipePager
                        pageKey={currentPage}
                        onPrev={goPrevPage}
                        onNext={goNextPage}
                        disabled={{ prev: currentPage === 0, next: currentPage >= totalPages - 1 }}
                        className="cardio-grid"
                    >
                        {pageCards.map((group) => (
                            <CardioSessionCard key={group[0].uuid} workouts={group} />
                        ))}
                    </SwipePager>
                </>
            ) : (
                <div className="empty-state">No cardio sessions match the current filters.</div>
            )}
        </PageTemplateV2>
    );
}
