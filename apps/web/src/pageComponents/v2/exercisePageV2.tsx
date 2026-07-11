'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import ExercisePRChart from '@/components/charts/exercisePRChart';
import ExerciseLookupV2 from '@/components/exercises/v2/exerciseLookupV2';
import PageTemplateV2 from '@/components/layout/v2/pageTemplateV2';
import DropdownV2, { type DropdownV2Option } from '@/components/ui/v2/dropdownV2';
import SwipePager from '@/components/ui/v2/swipePager';
import TablePager from '@/components/ui/v2/tablePager';
import TimeRangeSeg from '@/components/ui/v2/timeRangeSeg';
import { WorkoutCard } from '@/components/workouts/v2/workoutCard';
import { type CalculationMethod, defaultMaxCalculator, maxCalculators, oneRepMaxCalculators } from '@/lib/calc';
import { useWorkoutData } from '@/lib/contexts';
import { CYCLE_TYPE_COLOR, CYCLE_TYPE_LABEL_SHORT } from '@/lib/cycleTypes';
import { formatTableDate, MONTHS_SHORT } from '@/lib/dateFormatters';
import { computeExerciseSessions, computeExerciseStats } from '@/lib/exerciseSessions';
import { formatVolume } from '@/lib/statsUtils';
import { resolveTimeRange, type TimeRangeValue } from '@/lib/timeRange';
import type { RepRange } from '@/types';

const PAGE_SIZE = 10;

function formatCycleRange(start: Date, end: Date): string {
    const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
    const startStr = `${MONTHS_SHORT[start.getUTCMonth()]} ${start.getUTCDate()}`;
    const endStr = `${MONTHS_SHORT[end.getUTCMonth()]} ${end.getUTCDate()}`;
    if (sameYear) return `${start.getUTCFullYear()} · ${startStr} → ${endStr}`;
    return `${startStr} ${start.getUTCFullYear()} → ${endStr} ${end.getUTCFullYear()}`;
}

function formatWeight(n: number): string {
    return Math.round(n).toLocaleString();
}

const REPS_OPTIONS = Array.from({ length: 50 }, (_, i) => i + 1);

export default function ExercisePageV2() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { workouts, exerciseMap, cycles, muscleGroups } = useWorkoutData();

    const exerciseId = params?.id?.toString() ?? '';
    const exercise = exerciseMap.get(exerciseId);
    const cycleId = searchParams?.get('cycleId') ?? null;

    const [selectedMethod, setSelectedMethod] = useState<CalculationMethod>(defaultMaxCalculator);
    const [repRange, setRepRange] = useState<RepRange>({ min: 1, max: 50 });
    const [timeRange, setTimeRange] = useState<TimeRangeValue>({ preset: 'all' });
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [tablePage, setTablePage] = useState(0);

    const resolvedRange = useMemo(() => resolveTimeRange(timeRange), [timeRange]);

    const muscleColor = useMemo(() => {
        if (!exercise) return undefined;
        return muscleGroups.find((mg) => mg.id === exercise.primaryMuscleGroup)?.color;
    }, [exercise, muscleGroups]);

    const cycleNameByWorkout = useMemo(() => {
        const map = new Map<string, string>();
        for (const c of cycles) {
            for (const w of c.workouts) {
                map.set(w.uuid, c.name);
            }
        }
        return map;
    }, [cycles]);

    const sessions = useMemo(() => {
        if (!exercise) return [];
        const cycleWorkoutIds = cycleId ? new Set(cycles.find((c) => c.uuid === cycleId)?.workouts.map((w) => w.uuid) ?? []) : null;
        return computeExerciseSessions(workouts, exercise.id, { method: selectedMethod, repRange, range: resolvedRange, cycleWorkoutIds });
    }, [workouts, exercise, cycleId, cycles, repRange, selectedMethod, resolvedRange]);

    const stats = useMemo(() => computeExerciseStats(sessions), [sessions]);

    const reversed = useMemo(() => [...sessions].reverse(), [sessions]);

    const isOneRm = oneRepMaxCalculators.some((m) => m === selectedMethod);

    const cycleOptions = useMemo<DropdownV2Option[]>(() => {
        const filtered = cycles.filter((c) => c.type !== 'break');
        const sorted = [...filtered].sort((a, b) => b.dates[0].getTime() - a.dates[0].getTime());
        return [
            { value: '', label: 'All cycles', sublabel: `${filtered.length} total` },
            ...sorted.map((c) => ({
                value: c.uuid,
                label: c.name,
                sublabel: formatCycleRange(c.dates[0], c.dates[1]),
                trailing: CYCLE_TYPE_LABEL_SHORT[c.type],
                color: CYCLE_TYPE_COLOR[c.type],
                keywords: `${c.type} ${c.dates[0].getUTCFullYear()}`,
            })),
        ];
    }, [cycles]);

    const repsOptions = useMemo<DropdownV2Option[]>(() => REPS_OPTIONS.map((n) => ({ value: String(n), label: String(n) })), []);

    const oneRmOptions = useMemo<DropdownV2Option[]>(
        () => [
            { value: '', label: isOneRm ? '← Max Weight' : '1RM Formula…' },
            ...oneRepMaxCalculators.map((m) => ({ value: m.name, label: m.name, sublabel: m.description })),
        ],
        [isOneRm]
    );

    const totalPages = Math.max(1, Math.ceil(sessions.length / PAGE_SIZE));
    const currentPage = Math.min(tablePage, totalPages - 1);
    const pageStart = currentPage * PAGE_SIZE;
    const pageRows = reversed.slice(pageStart, pageStart + PAGE_SIZE);
    const pageRangeStart = pageRows[0]?.workout.date;
    const pageRangeEnd = pageRows[pageRows.length - 1]?.workout.date;

    const goPrevPage = () => setTablePage((p) => Math.max(0, p - 1));
    const goNextPage = () => setTablePage((p) => Math.min(totalPages - 1, p + 1));

    if (!exercise) {
        return (
            <PageTemplateV2>
                <div className="empty-state">Exercise not found</div>
            </PageTemplateV2>
        );
    }

    const hoveredSession = hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < sessions.length ? sessions[hoveredIndex] : null;
    const detail = hoveredSession ?? sessions[sessions.length - 1];
    const detailCycle = detail ? cycleNameByWorkout.get(detail.workout.uuid) : undefined;

    const handleCycleChange = (newCycleId: string) => {
        const sp = new URLSearchParams(searchParams?.toString() ?? '');
        if (newCycleId) sp.set('cycleId', newCycleId);
        else sp.delete('cycleId');
        const qs = sp.toString();
        router.replace(`/exercises/${exerciseId}${qs ? `?${qs}` : ''}`);
    };

    const selectedCycle = cycleId ? cycles.find((c) => c.uuid === cycleId) : null;

    return (
        <PageTemplateV2 footer={`Exercise · ${exercise.name} · ${stats.sessionCount} sessions tracked`}>
            <div className="breadcrumb">
                <Link href="/exercises">Exercises</Link>
                <span className="sep">/</span>
                <span className="current">{exercise.name}</span>
                <ExerciseLookupV2 exerciseMap={exerciseMap} currentExerciseId={exercise.id.toString()} />
                <ExerciseLookupV2
                    exerciseMap={exerciseMap}
                    currentExerciseId={exercise.id.toString()}
                    triggerLabel="+ Compare"
                    onSelect={(id) => router.push(`/exercises/compare?ids=${exercise.id},${id}`)}
                />
            </div>

            <section className="detail-hero">
                <div className="left">
                    <h1 style={muscleColor ? { color: muscleColor } : undefined}>{exercise.name}</h1>
                    <div className="meta">
                        {exercise.primaryMuscleGroup && (
                            <Link
                                href={`/muscle/${exercise.primaryMuscleGroup}`}
                                className="chip outline"
                                style={muscleColor ? { color: muscleColor, borderColor: muscleColor } : undefined}
                            >
                                {exercise.primaryMuscleGroup}
                            </Link>
                        )}
                        <span className="chip">{exercise.category}</span>
                        {exercise.equipment.map((e) => (
                            <span key={e} className="chip">
                                {e}
                            </span>
                        ))}
                    </div>
                    {exercise.description && <p className="exercise-description">{exercise.description}</p>}
                </div>
                <div className="right stat-grid-4">
                    <div className="stat right">
                        <span className="v" style={{ color: 'var(--maint)' }}>
                            {stats.pr ? formatWeight(stats.pr) : '—'}
                        </span>
                        <span className="l">PR ({selectedMethod.name})</span>
                    </div>
                    <div className="stat right">
                        <span className="v">{stats.totalSets}</span>
                        <span className="l">Total Sets</span>
                    </div>
                    <div className="stat right">
                        <span className="v">{stats.sessionCount}</span>
                        <span className="l">Sessions</span>
                    </div>
                    <div className="stat right">
                        <span className="v">{formatVolume(stats.volume)}</span>
                        <span className="l">Volume</span>
                    </div>
                </div>
            </section>

            <div className="toolbar u-mb-4">
                <div className="toolbar-grp">
                    <span className="label-mono">Reps</span>
                    <DropdownV2
                        value={String(repRange.min)}
                        options={repsOptions}
                        onChange={(v) => {
                            const n = Number(v);
                            setRepRange((r) => ({ min: n, max: Math.max(n, r.max) }));
                            setTablePage(0);
                        }}
                        ariaLabel="Min reps"
                    />
                    <span className="label-mono">–</span>
                    <DropdownV2
                        value={String(repRange.max)}
                        options={repsOptions}
                        onChange={(v) => {
                            const n = Number(v);
                            setRepRange((r) => ({ min: Math.min(r.min, n), max: n }));
                            setTablePage(0);
                        }}
                        ariaLabel="Max reps"
                    />
                </div>

                <span className="toolbar-divider" />

                <div className="toolbar-grp">
                    <span className="label-mono">Method</span>
                    <div className="seg" role="radiogroup" aria-label="Calculation method">
                        {maxCalculators.map((m) => (
                            <button
                                key={m.name}
                                type="button"
                                className={`seg-btn${selectedMethod.name === m.name ? ' active' : ''}`}
                                onClick={() => {
                                    setSelectedMethod(m);
                                    setTablePage(0);
                                }}
                            >
                                {m.name}
                            </button>
                        ))}
                    </div>
                </div>

                <span className="toolbar-divider" />

                <div className="toolbar-grp">
                    <DropdownV2
                        value={isOneRm ? selectedMethod.name : ''}
                        options={oneRmOptions}
                        onChange={(v) => {
                            setTablePage(0);
                            if (!v) {
                                setSelectedMethod(defaultMaxCalculator);
                                return;
                            }
                            const m = oneRepMaxCalculators.find((o) => o.name === v);
                            if (m) setSelectedMethod(m);
                        }}
                        ariaLabel="1RM formula"
                    />
                </div>

                <span className="toolbar-divider" />

                <div className="toolbar-grp">
                    <span className="label-mono">Range</span>
                    <TimeRangeSeg
                        value={timeRange}
                        onChange={(v) => {
                            setTimeRange(v);
                            setTablePage(0);
                        }}
                    />
                </div>

                <div className="toolbar-grp" style={{ marginLeft: 'auto' }}>
                    <DropdownV2
                        value={cycleId ?? ''}
                        options={cycleOptions}
                        onChange={handleCycleChange}
                        ariaLabel="Filter by cycle"
                        align="right"
                        triggerMinWidth={220}
                        panelWidth={380}
                    />
                </div>
            </div>

            <div className="method-explain">
                <span className="name">{selectedMethod.name}</span>
                <span className="desc">{selectedMethod.description}</span>
                <code className="formula">{selectedMethod.formula}</code>
                {selectedCycle && (
                    <>
                        <span className="method-explain-divider" />
                        <span className="method-explain-cycle">
                            Filtered by cycle: <b style={{ color: CYCLE_TYPE_COLOR[selectedCycle.type] }}>{selectedCycle.name}</b>
                            <span className="cycle-banner-range">· {formatCycleRange(selectedCycle.dates[0], selectedCycle.dates[1])}</span>
                        </span>
                        <button type="button" className="icon-btn sm" onClick={() => handleCycleChange('')} aria-label="Clear cycle filter">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <title>Clear</title>
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </>
                )}
            </div>

            {sessions.length === 0 ? (
                <div className="empty-state">No sessions match the current filters.</div>
            ) : (
                <section className="zones-2">
                    <div className="zone-2">
                        <div className="panel-label" style={{ margin: '0 0 12px' }}>
                            <span>{selectedMethod.name} Over Time</span>
                            <span className="hint">★ = PR (gold all-time · green active · gray beaten) · hover to inspect · drag to filter range</span>
                        </div>

                        <ExercisePRChart
                            sessions={sessions.map((s) => ({ date: s.workout.date, metric: s.metric, prTier: s.prTier }))}
                            methodName={selectedMethod.name}
                            onHover={setHoveredIndex}
                            onRangeSelect={(startIndex, endIndex) => {
                                const start = sessions[startIndex]?.workout.date;
                                const end = sessions[endIndex]?.workout.date;
                                if (!start || !end) return;
                                setTimeRange({ preset: 'custom', start, end });
                                setTablePage(0);
                            }}
                        />

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
                            className="pr-table"
                        >
                            <div className="pr-row head">
                                <div>Date</div>
                                <div>{selectedMethod.name}</div>
                                <div>Top Set</div>
                                <div>PR?</div>
                            </div>
                            {pageRows.map((s) => (
                                <div key={s.workout.uuid} className="pr-row">
                                    <div className="date">{formatTableDate(s.workout.date)}</div>
                                    <div className="weight">
                                        {formatWeight(s.metric)}
                                        {selectedMethod === defaultMaxCalculator ? ' lbs' : ''}
                                    </div>
                                    <div className="sets-detail">
                                        {s.topSet
                                            ? `${formatWeight(s.topSet.weight)} × ${s.topSet.reps ?? 0} · ${s.workSetCount} work sets`
                                            : `${s.sets.length} sets`}
                                    </div>
                                    <div className="pr-flag">
                                        {s.prTier && (
                                            <span className="pr-star" data-tier={s.prTier}>
                                                ★
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </SwipePager>
                    </div>

                    <div className="zone-2">
                        <div className="panel-label" style={{ margin: '0 0 16px' }}>
                            <span>Workout Detail</span>
                        </div>

                        {detail && (
                            <>
                                {detailCycle && <div className="detail-cycle-banner">Cycle · {detailCycle}</div>}
                                <WorkoutCard
                                    key={detail.workout.uuid}
                                    day={{ date: detail.workout.date, liftingWorkouts: [detail.workout], cardioWorkouts: [] }}
                                    exerciseMap={exerciseMap}
                                    includeWarmup={false}
                                    selectedExercise={exercise.id.toString()}
                                    cycleId={cycleId ?? undefined}
                                />
                            </>
                        )}
                    </div>
                </section>
            )}
        </PageTemplateV2>
    );
}
