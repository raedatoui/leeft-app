'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import EffortTierToggle from '@/components/cardio/v2/effortTierToggle';
import PageTemplateV2 from '@/components/layout/v2/pageTemplateV2';
import DropdownV2 from '@/components/ui/v2/dropdownV2';
import { WorkoutCard } from '@/components/workouts/v2/workoutCard';
import { type EffortTier, matchesTier } from '@/lib/cardio-effort';
import { useActiveCardio, useWorkoutData } from '@/lib/contexts';
import { formatTableDate, MONTHS_LONG, MONTHS_SHORT } from '@/lib/dateFormatters';
import {
    type AggregateBy,
    aggregateForChart,
    computeOverviewStats,
    filterCardioWorkoutsByDateRange,
    formatNumber,
    getWeekEnd,
    getWeekStart,
} from '@/lib/statsUtils';
import { filterWorkoutsByDateRange } from '@/lib/utils';
import type { CardioWorkout, Workout } from '@/types';

const WorkoutBreakdownChart = dynamic(() => import('@/components/stats/v2/workoutBreakdownChartV2'), { ssr: false });

type GroupBy = 'year' | 'month' | 'week';

const GROUP_TO_AGGREGATE: Record<GroupBy, AggregateBy> = {
    year: 'month',
    month: 'week',
    week: 'day',
};

interface Bucket {
    label: string;
    start: Date;
    end: Date;
}

type Row = { kind: 'lifting'; date: Date; workout: Workout } | { kind: 'cardio'; date: Date; workout: CardioWorkout };

const PAGE_SIZE = 10;

function formatWeekLabel(start: Date, end: Date): string {
    const sm = MONTHS_SHORT[start.getUTCMonth()];
    const em = MONTHS_SHORT[end.getUTCMonth()];
    const sy = start.getUTCFullYear();
    const ey = end.getUTCFullYear();
    if (sy !== ey) return `${sm} ${start.getUTCDate()}, ${sy} – ${em} ${end.getUTCDate()}, ${ey}`;
    if (sm === em) return `${sm} ${start.getUTCDate()}–${end.getUTCDate()}, ${ey}`;
    return `${sm} ${start.getUTCDate()} – ${em} ${end.getUTCDate()}, ${ey}`;
}

function formatDuration(minutes: number): string {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function computeBuckets(min: Date, max: Date, groupBy: GroupBy): Bucket[] {
    const buckets: Bucket[] = [];
    if (groupBy === 'year') {
        for (let y = min.getUTCFullYear(); y <= max.getUTCFullYear(); y++) {
            buckets.push({
                label: String(y),
                start: new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0)),
                end: new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999)),
            });
        }
    } else if (groupBy === 'month') {
        let y = min.getUTCFullYear();
        let m = min.getUTCMonth();
        while (y < max.getUTCFullYear() || (y === max.getUTCFullYear() && m <= max.getUTCMonth())) {
            buckets.push({
                label: `${MONTHS_LONG[m]} ${y}`,
                start: new Date(Date.UTC(y, m, 1, 0, 0, 0, 0)),
                end: new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)),
            });
            m++;
            if (m > 11) {
                m = 0;
                y++;
            }
        }
    } else {
        let cur = getWeekStart(min);
        const limit = getWeekStart(max);
        while (cur <= limit) {
            const e = getWeekEnd(cur);
            buckets.push({ label: formatWeekLabel(cur, e), start: new Date(cur), end: e });
            cur = new Date(cur);
            cur.setUTCDate(cur.getUTCDate() + 7);
        }
    }
    return buckets.reverse();
}

function findBucketIndex(buckets: Bucket[], target: Date): number {
    const t = target.getTime();
    for (let i = 0; i < buckets.length; i++) {
        const b = buckets[i];
        if (b && t >= b.start.getTime() && t <= b.end.getTime()) return i;
    }
    return 0;
}

function StatsTableRow({ row, isSelected, onSelect }: { row: Row; isSelected: boolean; onSelect: () => void }) {
    const date = <div className="date">{formatTableDate(row.date)}</div>;
    const indicator = <div className="pr-flag">{isSelected ? '›' : ''}</div>;
    if (row.kind === 'lifting') {
        const w = row.workout;
        return (
            <button type="button" className="pr-row stats-row" data-selected={isSelected || undefined} onClick={onSelect}>
                {date}
                <div className="weight">
                    <span className="dot lift">●</span>
                    {formatNumber(w.volume)} lbs
                </div>
                <div className="sets-detail">{formatDuration(w.duration / 1000 / 60)}</div>
                <div className="sets-detail">{w.rpe !== null ? w.rpe.toFixed(1) : '—'}</div>
                {indicator}
            </button>
        );
    }
    const c = row.workout;
    return (
        <button type="button" className="pr-row stats-row" data-selected={isSelected || undefined} onClick={onSelect}>
            {date}
            <div className="weight">
                <span className="dot cardio">●</span>
                {c.type}
            </div>
            <div className="sets-detail">{formatDuration(c.durationMin)}</div>
            <div className="sets-detail">{c.calories ? `${c.calories} cal` : '—'}</div>
            {indicator}
        </button>
    );
}

export default function StatsPageV2() {
    const { workouts, exerciseMap, muscleGroups } = useWorkoutData();
    const allCardio = useActiveCardio();
    const [effortTier, setEffortTier] = useState<EffortTier>('medium');
    const cardioWorkouts = useMemo(() => allCardio.filter((w) => matchesTier(w, effortTier)), [allCardio, effortTier]);

    const muscleGroupColor = useMemo(() => {
        const lookup = new Map(muscleGroups.map((mg) => [mg.id, mg.color]));
        return (id: string | undefined) => (id ? lookup.get(id) : undefined);
    }, [muscleGroups]);

    const dateBounds = useMemo(() => {
        const dates = [...workouts.map((w) => w.date), ...cardioWorkouts.map((c) => c.date)];
        if (dates.length === 0) return null;
        const times = dates.map((d) => d.getTime());
        return { min: new Date(Math.min(...times)), max: new Date(Math.max(...times)) };
    }, [workouts, cardioWorkouts]);

    const [groupBy, setGroupBy] = useState<GroupBy>('year');
    const [bucketIndex, setBucketIndex] = useState(0);
    const [tablePage, setTablePage] = useState(0);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    // Period to land on when buckets are rebuilt (e.g. on group change). null = jump to today.
    const anchorRef = useRef<Date | null>(null);

    const buckets = useMemo(() => {
        if (!dateBounds) return [];
        return computeBuckets(dateBounds.min, dateBounds.max, groupBy);
    }, [dateBounds, groupBy]);

    useEffect(() => {
        if (buckets.length === 0) {
            setBucketIndex(0);
            return;
        }
        setBucketIndex(findBucketIndex(buckets, anchorRef.current ?? new Date()));
        setTablePage(0);
        setSelectedKey(null);
    }, [buckets]);

    const safeBucketIndex = Math.min(bucketIndex, Math.max(0, buckets.length - 1));
    const currentBucket = buckets[safeBucketIndex];

    const filteredLifting = useMemo(() => {
        if (!currentBucket) return [];
        return filterWorkoutsByDateRange(workouts, currentBucket.start, currentBucket.end);
    }, [workouts, currentBucket]);

    const filteredCardio = useMemo(() => {
        if (!currentBucket) return [];
        return filterCardioWorkoutsByDateRange(cardioWorkouts, currentBucket.start, currentBucket.end);
    }, [cardioWorkouts, currentBucket]);

    const stats = useMemo(() => computeOverviewStats(filteredLifting, filteredCardio), [filteredLifting, filteredCardio]);
    const totalZoneMin = useMemo(() => filteredCardio.reduce((sum, c) => sum + (c.zoneMinutes ?? 0), 0), [filteredCardio]);

    const chartData = useMemo(() => {
        if (!currentBucket) return null;
        return aggregateForChart(filteredLifting, filteredCardio, GROUP_TO_AGGREGATE[groupBy], {
            start: currentBucket.start,
            end: currentBucket.end,
        });
    }, [filteredLifting, filteredCardio, currentBucket, groupBy]);

    const rows: Row[] = useMemo(() => {
        const lifts: Row[] = filteredLifting.map((w) => ({ kind: 'lifting', date: w.date, workout: w }));
        const cards: Row[] = filteredCardio.map((c) => ({ kind: 'cardio', date: c.date, workout: c }));
        return [...lifts, ...cards].sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [filteredLifting, filteredCardio]);

    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    const currentPage = Math.min(tablePage, totalPages - 1);
    const pageStart = currentPage * PAGE_SIZE;
    const pageRows = rows.slice(pageStart, pageStart + PAGE_SIZE);

    const pageRangeStart = pageRows[pageRows.length - 1]?.date;
    const pageRangeEnd = pageRows[0]?.date;

    const selectedRow = useMemo(() => rows.find((r) => r.workout.uuid === selectedKey) ?? pageRows[0] ?? null, [rows, selectedKey, pageRows]);

    if (!dateBounds || !currentBucket) {
        return (
            <PageTemplateV2>
                <div className="empty-state">No workouts to show.</div>
            </PageTemplateV2>
        );
    }

    const goPrevBucket = () => {
        setBucketIndex(Math.min(buckets.length - 1, safeBucketIndex + 1));
        setTablePage(0);
        setSelectedKey(null);
    };
    const goNextBucket = () => {
        setBucketIndex(Math.max(0, safeBucketIndex - 1));
        setTablePage(0);
        setSelectedKey(null);
    };

    const onGroupChange = (g: GroupBy) => {
        if (g === groupBy) return;
        // Keep the user on the period they're viewing instead of snapping back to today.
        anchorRef.current = currentBucket.end;
        setGroupBy(g);
        setTablePage(0);
        setSelectedKey(null);
    };

    const goPrevPage = () => {
        setTablePage((p) => Math.max(0, p - 1));
        setSelectedKey(null);
    };
    const goNextPage = () => {
        setTablePage((p) => Math.min(totalPages - 1, p + 1));
        setSelectedKey(null);
    };

    const detailDay = selectedRow
        ? {
              date: selectedRow.date,
              liftingWorkouts: selectedRow.kind === 'lifting' ? [selectedRow.workout] : [],
              cardioWorkouts: selectedRow.kind === 'cardio' ? [selectedRow.workout] : [],
          }
        : null;

    return (
        <PageTemplateV2 footer={`Stats · ${currentBucket.label} · ${stats.totalWorkouts} workouts`}>
            <section className="hero-row">
                <div className="hero-block">
                    <div className="hero-title medium" style={{ color: 'var(--maint)' }}>
                        Stats
                    </div>
                    <div className="hero-meta">
                        <span className="label">Stats · {currentBucket.label}</span>
                        <span className="stats">
                            <span>
                                <b>{stats.totalWorkouts}</b>total
                            </span>
                            <span className="strength">
                                <b>{stats.liftingCount}</b>lift
                            </span>
                            <span className="cardio">
                                <b>{stats.cardioCount}</b>cardio
                            </span>
                            <span>
                                <b>{formatNumber(stats.totalVolume)}</b>lbs
                            </span>
                            <span>
                                <b>{stats.avgRpe !== null ? stats.avgRpe.toFixed(1) : '—'}</b>avg rpe
                            </span>
                            <span className="zone">
                                <b>{totalZoneMin}</b>zone min
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
                        onClick={goPrevBucket}
                        disabled={safeBucketIndex >= buckets.length - 1}
                        aria-label="Older bucket"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <title>Older</title>
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <span className="toolbar-pos">
                        <b>{safeBucketIndex + 1}</b>
                        <span className="sep">/</span>
                        {buckets.length}
                    </span>
                    <button type="button" className="icon-btn sm" onClick={goNextBucket} disabled={safeBucketIndex === 0} aria-label="Newer bucket">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <title>Newer</title>
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>
                    <DropdownV2
                        value={String(safeBucketIndex)}
                        options={buckets.map((b, i) => ({ value: String(i), label: b.label }))}
                        onChange={(v) => {
                            setBucketIndex(Number(v));
                            setTablePage(0);
                            setSelectedKey(null);
                        }}
                        ariaLabel="Bucket"
                    />
                </div>

                <span className="toolbar-divider" />

                <div className="toolbar-grp">
                    <span className="label-mono" style={{ padding: '0 8px' }}>
                        Group
                    </span>
                    <div className="seg" role="radiogroup" aria-label="Group by">
                        <button type="button" className={`seg-btn${groupBy === 'year' ? ' active' : ''}`} onClick={() => onGroupChange('year')}>
                            Year
                        </button>
                        <button type="button" className={`seg-btn${groupBy === 'month' ? ' active' : ''}`} onClick={() => onGroupChange('month')}>
                            Month
                        </button>
                        <button type="button" className={`seg-btn${groupBy === 'week' ? ' active' : ''}`} onClick={() => onGroupChange('week')}>
                            Week
                        </button>
                    </div>
                </div>

                <span className="toolbar-divider" />

                <EffortTierToggle value={effortTier} onChange={setEffortTier} />
            </div>

            {chartData && chartData.length > 0 && (
                <section className="charts-row charts-row-single u-mb-8">
                    <div className="chart-zone">
                        <WorkoutBreakdownChart
                            data={chartData}
                            aggregateBy={GROUP_TO_AGGREGATE[groupBy]}
                            dateRange={{ start: currentBucket.start, end: currentBucket.end }}
                            onPointClick={() => {}}
                            selectedIndex={null}
                        />
                    </div>
                </section>
            )}

            {rows.length === 0 ? (
                <div className="empty-state">No workouts in this {groupBy}.</div>
            ) : (
                <section className="zones-2">
                    <div className="zone-2">
                        <div className="panel-label" style={{ margin: '0 0 12px' }}>
                            <span>
                                Workouts · {rows.length} session{rows.length === 1 ? '' : 's'}
                            </span>
                            <span className="hint">click a row for details</span>
                        </div>

                        <div className="pr-pager">
                            <button type="button" className="icon-btn sm" onClick={goPrevPage} disabled={currentPage === 0} aria-label="Newer page">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <title>Previous</title>
                                    <polyline points="15 18 9 12 15 6" />
                                </svg>
                            </button>
                            <span className="pr-pager-pos">
                                Page <b>{currentPage + 1}</b> / {totalPages}
                            </span>
                            <button
                                type="button"
                                className="icon-btn sm"
                                onClick={goNextPage}
                                disabled={currentPage >= totalPages - 1}
                                aria-label="Older page"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <title>Next</title>
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </button>
                            {pageRangeStart && pageRangeEnd && (
                                <span className="pr-pager-range">
                                    {formatTableDate(pageRangeStart)} → {formatTableDate(pageRangeEnd)}
                                </span>
                            )}
                        </div>

                        <div className="pr-table">
                            <div className="pr-row head stats-row">
                                <div>Date</div>
                                <div>Activity</div>
                                <div>Duration</div>
                                <div>RPE / Cal</div>
                                <div />
                            </div>
                            {pageRows.map((r) => {
                                const isSelected = selectedKey === r.workout.uuid || (selectedKey === null && r === pageRows[0]);
                                return (
                                    <StatsTableRow
                                        key={r.workout.uuid}
                                        row={r}
                                        isSelected={isSelected}
                                        onSelect={() => setSelectedKey(r.workout.uuid)}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    <div className="zone-2">
                        <div className="panel-label" style={{ margin: '0 0 16px' }}>
                            <span>Workout Detail</span>
                        </div>

                        {detailDay && (
                            <WorkoutCard
                                key={`${detailDay.date.toISOString()}-${selectedRow?.workout.uuid ?? ''}`}
                                day={detailDay}
                                exerciseMap={exerciseMap}
                                includeWarmup={false}
                                muscleGroupColor={muscleGroupColor}
                            />
                        )}
                    </div>
                </section>
            )}
        </PageTemplateV2>
    );
}
