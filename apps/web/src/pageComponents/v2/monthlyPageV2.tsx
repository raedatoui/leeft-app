'use client';

import { useMemo, useState } from 'react';
import MonthCellV2 from '@/components/analysis/v2/monthCellV2';
import EffortTierToggle from '@/components/cardio/v2/effortTierToggle';
import PageTemplateV2 from '@/components/layout/v2/pageTemplateV2';
import { type EffortTier, matchesTier } from '@/lib/cardio-effort';
import { useActiveCardio, useWorkoutData } from '@/lib/contexts';
import { MONTHS_SHORT } from '@/lib/dateFormatters';
import { formatNumber } from '@/lib/statsUtils';
import type { CardioWorkout, Workout } from '@/types';

type RangeFilter = 'all' | 'last12' | string;

function yearMonthKey(d: Date): string {
    return `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, '0')}`;
}

function groupByMonth<T extends { date: Date }>(items: T[]): Record<string, T[]> {
    const acc: Record<string, T[]> = {};
    for (const item of items) {
        const key = yearMonthKey(item.date);
        const bucket = acc[key] ?? [];
        bucket.push(item);
        acc[key] = bucket;
    }
    return acc;
}

function formatDateLong(d: Date): string {
    return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate().toString().padStart(2, '0')}, ${d.getUTCFullYear()}`;
}

function compareYearMonthDesc(a: string, b: string): number {
    return b.localeCompare(a);
}

export default function MonthlyPageV2() {
    const { workouts, exerciseMap, muscleGroups } = useWorkoutData();
    const allCardio = useActiveCardio();

    const [includeWarmup, setIncludeWarmup] = useState(true);
    const [range, setRange] = useState<RangeFilter>('all');
    const [effortTier, setEffortTier] = useState<EffortTier>('medium');

    const activeCardio = useMemo(() => allCardio.filter((w) => matchesTier(w, effortTier)), [allCardio, effortTier]);

    const groupedLift = useMemo(() => groupByMonth(workouts), [workouts]);
    const groupedCardio = useMemo(() => groupByMonth(activeCardio), [activeCardio]);

    const availableYears = useMemo(() => {
        const ys = new Set<number>();
        for (const w of workouts) ys.add(w.date.getUTCFullYear());
        for (const c of activeCardio) ys.add(c.date.getUTCFullYear());
        return Array.from(ys).sort((a, b) => b - a);
    }, [workouts, activeCardio]);

    const allMonths = useMemo(() => {
        const set = new Set<string>([...Object.keys(groupedLift), ...Object.keys(groupedCardio)]);
        return Array.from(set).sort(compareYearMonthDesc);
    }, [groupedLift, groupedCardio]);

    const visibleMonths = useMemo(() => {
        if (range === 'all') return allMonths;
        if (range === 'last12') return allMonths.slice(0, 12);
        return allMonths.filter((m) => m.startsWith(`${range}-`));
    }, [allMonths, range]);

    const visibleLift: Workout[] = useMemo(() => visibleMonths.flatMap((m) => groupedLift[m] ?? []), [visibleMonths, groupedLift]);
    const visibleCardio: CardioWorkout[] = useMemo(() => visibleMonths.flatMap((m) => groupedCardio[m] ?? []), [visibleMonths, groupedCardio]);

    const totals = useMemo(() => {
        const liftCount = visibleLift.length;
        const cardioCount = visibleCardio.length;
        const totalVolume = visibleLift.reduce((s, w) => s + (includeWarmup ? w.volume : w.workVolume), 0);
        const zoneMin = visibleCardio.reduce((s, c) => s + (c.zoneMinutes ?? 0), 0);
        const dates = [...visibleLift.map((w) => w.date), ...visibleCardio.map((c) => c.date)];
        let dateRange: { start: Date; end: Date } | null = null;
        if (dates.length > 0) {
            const times = dates.map((d) => d.getTime());
            dateRange = { start: new Date(Math.min(...times)), end: new Date(Math.max(...times)) };
        }
        return { liftCount, cardioCount, totalVolume, zoneMin, dateRange };
    }, [visibleLift, visibleCardio, includeWarmup]);

    const rangeLabel = range === 'all' ? 'All Time' : range === 'last12' ? 'Last 12 Months' : range;

    const currentYM = yearMonthKey(new Date());

    return (
        <PageTemplateV2 footer={`Monthly Stats · ${visibleMonths.length} month${visibleMonths.length === 1 ? '' : 's'} shown`}>
            <section className="hero-row">
                <div className="hero-block">
                    <div className="hero-title medium" style={{ color: 'var(--maint)' }}>
                        Monthly Stats
                    </div>
                    <div className="hero-meta">
                        <span className="label">Monthly Rollup · {rangeLabel}</span>
                        <span className="stats">
                            <span className="strength">
                                <b>{totals.liftCount}</b>lift sessions
                            </span>
                            <span className="cardio">
                                <b>{totals.cardioCount}</b>cardio
                            </span>
                            <span>
                                <b>{formatNumber(Math.round(totals.totalVolume))}</b>lbs total
                            </span>
                            <span className="zone">
                                <b>{totals.zoneMin}</b>zone min
                            </span>
                        </span>
                    </div>
                </div>

                {totals.dateRange && (
                    <div className="hero-actions">
                        <span className="label-mono">
                            {formatDateLong(totals.dateRange.start)} → {formatDateLong(totals.dateRange.end)}
                        </span>
                    </div>
                )}
            </section>

            <div className="toolbar u-mb-8">
                <div className="toolbar-grp">
                    <button
                        type="button"
                        className="toolbar-control"
                        onClick={() => setIncludeWarmup((w) => !w)}
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
                        <span>Include Warmup</span>
                    </button>
                </div>

                <span className="toolbar-divider" />

                <EffortTierToggle value={effortTier} onChange={setEffortTier} />

                <div className="toolbar-grp" style={{ marginLeft: 'auto' }}>
                    <select
                        className="select sm"
                        value={range}
                        onChange={(e) => setRange(e.target.value as RangeFilter)}
                        aria-label="Date range filter"
                    >
                        <option value="all">All Time</option>
                        <option value="last12">Last 12 months</option>
                        {availableYears.map((y) => (
                            <option key={y} value={String(y)}>
                                {y}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {visibleMonths.length === 0 ? (
                <div className="empty-state">No workouts in the selected range.</div>
            ) : (
                <>
                    <div className="panel-label">
                        <span>Months · {visibleMonths.length} shown</span>
                        <span className="hint">{rangeLabel}</span>
                    </div>
                    <section className="month-grid">
                        {visibleMonths.map((ym) => (
                            <MonthCellV2
                                key={ym}
                                yearMonth={ym}
                                workouts={groupedLift[ym] ?? []}
                                cardioWorkouts={groupedCardio[ym] ?? []}
                                exerciseMap={exerciseMap}
                                muscleGroups={muscleGroups}
                                includeWarmup={includeWarmup}
                                isCurrent={ym === currentYM}
                            />
                        ))}
                    </section>
                </>
            )}
        </PageTemplateV2>
    );
}
