'use client';

import { Clock, Flame, Heart, Timer, Zap } from 'lucide-react';
import type { FC } from 'react';
import CardioSessionCard from '@/components/cardio/v2/cardioSessionCard';
import DonutChart from '@/components/cardio/v2/donutChart';
import TrendChart from '@/components/cardio/v2/trendChart';
import PageTemplateV2 from '@/components/layout/v2/pageTemplateV2';
import DropdownV2, { type DropdownV2Option } from '@/components/ui/v2/dropdownV2';
import { cardioColors } from '@/lib/cardio-theme';
import { type CardioPeriod, useCardioPageState } from '@/lib/hooks/useCardioPageState';
import type { CardioType } from '@/types';

const PERIOD_OPTIONS: DropdownV2Option[] = [
    { value: 'ytd', label: 'Year to date' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: 'all', label: 'All time' },
];

// Short display names for filter pills (the full enum names are too long for pill chrome).
const TYPE_SHORT: Partial<Record<CardioType, string>> = {
    'Treadmill run': 'Treadmill',
    'Outdoor Bike': 'Bike',
    'Rowing machine': 'Rowing',
    'Aerobic Workout': 'Aerobic',
};

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
        useStrictCardio,
        setUseStrictCardio,
        selectedYear,
        activeType,
        setActiveType,
        period,
        setPeriod,
        years,
        yearWorkouts,
        periodWorkouts,
        sortedWorkouts,
        typeCounts,
        availableTypes,
        stats,
        distribution,
        monthlyTrend,
        goToPrevYear,
        goToNextYear,
    } = state;

    const yearLabel =
        period === 'ytd' ? `${selectedYear} · Year-to-date` : period === '30d' ? 'Last 30 days' : period === '90d' ? 'Last 90 days' : 'All time';

    const prevDisabled = years.length === 0 || selectedYear === Math.min(...years);
    const nextDisabled = years.length === 0 || selectedYear === Math.max(...years);

    const allCount = period === 'ytd' ? yearWorkouts.length : periodWorkouts.length;

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
                                    onClick={goToPrevYear}
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
                                    onClick={goToNextYear}
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

                <div className="toolbar-grp">
                    <span className="label-mono" style={{ padding: '0 8px' }}>
                        Type
                    </span>
                    <div className="filter-pills">
                        <button type="button" className={`filter-pill${activeType === null ? ' active' : ''}`} onClick={() => setActiveType(null)}>
                            All <span className="count">{allCount}</span>
                        </button>
                        {availableTypes.map((type) => {
                            const isActive = activeType === type;
                            return (
                                <button
                                    key={type}
                                    type="button"
                                    className={`filter-pill${isActive ? ' active' : ''}`}
                                    onClick={() => setActiveType(isActive ? null : type)}
                                >
                                    <span className="swatch" style={{ background: cardioColors[type] ?? 'var(--muted)' }} />
                                    {TYPE_SHORT[type] ?? type}
                                    <span className="count">{typeCounts[type] ?? 0}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <span className="toolbar-divider" />

                <div className="toolbar-grp">
                    <span className="label-mono" style={{ padding: '0 8px' }}>
                        Mode
                    </span>
                    <div className="seg" role="radiogroup" aria-label="Cardio mode">
                        <button type="button" className={`seg-btn${!useStrictCardio ? ' active' : ''}`} onClick={() => setUseStrictCardio(false)}>
                            Active
                        </button>
                        <button type="button" className={`seg-btn${useStrictCardio ? ' active' : ''}`} onClick={() => setUseStrictCardio(true)}>
                            Strict
                        </button>
                    </div>
                </div>

                <div className="toolbar-grp" style={{ marginLeft: 'auto' }}>
                    <span className="label-mono" style={{ padding: '0 8px' }}>
                        Period
                    </span>
                    <DropdownV2 value={period} options={PERIOD_OPTIONS} onChange={(v) => setPeriod(v as CardioPeriod)} ariaLabel="Period" />
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
                        <span>Distribution</span>
                        <span className="hint">click to filter</span>
                    </div>
                    <DonutChart distribution={distribution} activeType={activeType} onTypeSelect={setActiveType} totalLabel="Sessions" />
                </div>

                <div className="chart-zone">
                    <div className="panel-label" style={{ margin: 0 }}>
                        <span>Monthly Trend · Duration &amp; Zone Min</span>
                        <span className="hint">
                            {period === 'ytd' ? selectedYear : period === 'all' ? 'all years' : period === '30d' ? 'last 30d' : 'last 90d'}
                        </span>
                    </div>
                    <TrendChart monthlyTrend={monthlyTrend} />
                </div>
            </section>

            {sortedWorkouts.length > 0 ? (
                <section className="cardio-grid">
                    {sortedWorkouts.map((w) => (
                        <CardioSessionCard key={w.uuid} workout={w} />
                    ))}
                </section>
            ) : (
                <div className="empty-state">No cardio sessions match the current filters.</div>
            )}
        </PageTemplateV2>
    );
}
