'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import ExerciseCompareChart from '@/components/charts/exerciseCompareChart';
import ExerciseLookupV2 from '@/components/exercises/v2/exerciseLookupV2';
import PageTemplateV2 from '@/components/layout/v2/pageTemplateV2';
import DropdownV2, { type DropdownV2Option } from '@/components/ui/v2/dropdownV2';
import TimeRangeSeg from '@/components/ui/v2/timeRangeSeg';
import { type CalculationMethod, defaultMaxCalculator, maxCalculators, oneRepMaxCalculators } from '@/lib/calc';
import { useWorkoutData } from '@/lib/contexts';
import { formatTableDate } from '@/lib/dateFormatters';
import { computeExerciseSessions, computeExerciseStats } from '@/lib/exerciseSessions';
import { formatVolume } from '@/lib/statsUtils';
import { resolveTimeRange, type TimeRangeValue } from '@/lib/timeRange';
import type { RepRange } from '@/types';

const MAX_COMPARE = 4;
// CSS-var side of the positional series palette; Highcharts hex twins live in chartPaletteV2.ts.
const SERIES_TOKENS = ['var(--maint)', 'var(--strength)', 'var(--cardio)', 'var(--hyper)'];
const PR_TABLE_SIZE = 8;

const REPS_OPTIONS = Array.from({ length: 50 }, (_, i) => i + 1);

function formatWeight(n: number): string {
    return Math.round(n).toLocaleString();
}

export default function ExerciseComparePageV2() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { workouts, exerciseMap, muscleGroups } = useWorkoutData();

    const [selectedMethod, setSelectedMethod] = useState<CalculationMethod>(defaultMaxCalculator);
    const [repRange, setRepRange] = useState<RepRange>({ min: 1, max: 50 });
    const [timeRange, setTimeRange] = useState<TimeRangeValue>({ preset: 'all' });

    const resolvedRange = useMemo(() => resolveTimeRange(timeRange), [timeRange]);

    const idsParam = searchParams?.get('ids') ?? '';
    const ids = useMemo(() => {
        const out: string[] = [];
        for (const token of idsParam.split(',')) {
            const id = token.trim();
            if (!id || out.includes(id) || !exerciseMap.has(id)) continue;
            out.push(id);
            if (out.length >= MAX_COMPARE) break;
        }
        return out;
    }, [idsParam, exerciseMap]);

    const setIds = (next: string[]) => router.push(next.length ? `/exercises/compare?ids=${next.join(',')}` : '/exercises/compare');
    const addExercise = (id: string) => setIds([...ids, id]);
    const removeExercise = (id: string) => setIds(ids.filter((x) => x !== id));

    const columns = useMemo(
        () =>
            ids.flatMap((id) => {
                const exercise = exerciseMap.get(id);
                if (!exercise) return [];
                const sessions = computeExerciseSessions(workouts, exercise.id, {
                    method: selectedMethod,
                    repRange,
                    range: resolvedRange,
                    cycleWorkoutIds: null,
                });
                return [{ exercise, sessions, stats: computeExerciseStats(sessions) }];
            }),
        [ids, exerciseMap, workouts, selectedMethod, repRange, resolvedRange]
    );

    const isOneRm = oneRepMaxCalculators.some((m) => m === selectedMethod);

    const repsOptions = useMemo<DropdownV2Option[]>(() => REPS_OPTIONS.map((n) => ({ value: String(n), label: String(n) })), []);

    const oneRmOptions = useMemo<DropdownV2Option[]>(
        () => [
            { value: '', label: isOneRm ? '← Max Weight' : '1RM Formula…' },
            ...oneRepMaxCalculators.map((m) => ({ value: m.name, label: m.name, sublabel: m.description })),
        ],
        [isOneRm]
    );

    const footer = columns.length ? `Compare · ${columns.map((c) => c.exercise.name).join(' vs ')}` : 'Compare exercises';

    return (
        <PageTemplateV2 footer={footer}>
            <div className="breadcrumb">
                <Link href="/exercises">Exercises</Link>
                <span className="sep">/</span>
                <span className="current">Compare</span>
            </div>

            <section className="detail-hero">
                <div className="left">
                    <h1>Compare</h1>
                </div>
            </section>

            <div className="compare-legend">
                {columns.map((c, i) => (
                    <span key={c.exercise.id} className="compare-chip">
                        <span className="dot" style={{ background: SERIES_TOKENS[i] }} />
                        <Link href={`/exercises/${c.exercise.id}`}>{c.exercise.name}</Link>
                        <button
                            type="button"
                            className="x"
                            onClick={() => removeExercise(c.exercise.id.toString())}
                            aria-label={`Remove ${c.exercise.name}`}
                        >
                            ×
                        </button>
                    </span>
                ))}
                {ids.length < MAX_COMPARE && (
                    <ExerciseLookupV2 exerciseMap={exerciseMap} excludeIds={ids} triggerLabel="+ Add exercise" onSelect={addExercise} />
                )}
            </div>

            <div className="toolbar u-mb-4">
                <div className="toolbar-grp">
                    <span className="label-mono">Reps</span>
                    <DropdownV2
                        value={String(repRange.min)}
                        options={repsOptions}
                        onChange={(v) => {
                            const n = Number(v);
                            setRepRange((r) => ({ min: n, max: Math.max(n, r.max) }));
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
                                onClick={() => setSelectedMethod(m)}
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
                    <TimeRangeSeg value={timeRange} onChange={setTimeRange} />
                </div>
            </div>

            <div className="method-explain">
                <span className="name">{selectedMethod.name}</span>
                <span className="desc">{selectedMethod.description}</span>
                <code className="formula">{selectedMethod.formula}</code>
            </div>

            {columns.length === 0 ? (
                <div className="empty-state">Pick two exercises to compare.</div>
            ) : (
                <>
                    <div className="compare-chart">
                        <div className="panel-label" style={{ margin: '0 0 12px' }}>
                            <span>{selectedMethod.name} Over Time</span>
                            <span className="hint">hover to inspect · drag to filter range</span>
                        </div>

                        <ExerciseCompareChart
                            series={columns.map((c) => ({
                                name: c.exercise.name,
                                points: c.sessions.map((s) => ({ date: s.workout.date, metric: s.metric })),
                            }))}
                            methodName={selectedMethod.name}
                            onRangeSelect={(start, end) => setTimeRange({ preset: 'custom', start, end })}
                        />
                    </div>

                    <section className="compare-grid">
                        {columns.map((c, i) => {
                            const muscleColor = muscleGroups.find((mg) => mg.id === c.exercise.primaryMuscleGroup)?.color;
                            const recent = c.sessions.slice(-PR_TABLE_SIZE).reverse();
                            return (
                                <div key={c.exercise.id} className="compare-col">
                                    <div className="col-head">
                                        <h2 style={{ color: SERIES_TOKENS[i] }}>{c.exercise.name}</h2>
                                        {c.exercise.primaryMuscleGroup && (
                                            <Link
                                                href={`/muscle/${c.exercise.primaryMuscleGroup}`}
                                                className="chip outline"
                                                style={muscleColor ? { color: muscleColor, borderColor: muscleColor } : undefined}
                                            >
                                                {c.exercise.primaryMuscleGroup}
                                            </Link>
                                        )}
                                        <button
                                            type="button"
                                            className="icon-btn sm"
                                            onClick={() => removeExercise(c.exercise.id.toString())}
                                            aria-label={`Remove ${c.exercise.name}`}
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
                                                <title>Remove</title>
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                        </button>
                                    </div>

                                    <div className="col-stats">
                                        <div className="stat">
                                            <span className="v" style={{ color: SERIES_TOKENS[i] }}>
                                                {c.stats.pr ? formatWeight(c.stats.pr) : '—'}
                                            </span>
                                            <span className="l">PR ({selectedMethod.name})</span>
                                        </div>
                                        <div className="stat">
                                            <span className="v">{c.stats.sessionCount}</span>
                                            <span className="l">Sessions</span>
                                        </div>
                                        <div className="stat">
                                            <span className="v">{c.stats.totalSets}</span>
                                            <span className="l">Total Sets</span>
                                        </div>
                                        <div className="stat">
                                            <span className="v">{formatVolume(c.stats.volume)}</span>
                                            <span className="l">Volume</span>
                                        </div>
                                    </div>

                                    {c.sessions.length === 0 ? (
                                        <div className="empty-state">No sessions match the current filters.</div>
                                    ) : (
                                        <div className="pr-table">
                                            <div className="pr-row head">
                                                <div>Date</div>
                                                <div>{selectedMethod.name}</div>
                                                <div>Top Set</div>
                                                <div>PR?</div>
                                            </div>
                                            {recent.map((s) => (
                                                <div key={s.workout.uuid} className="pr-row">
                                                    <div className="date">{formatTableDate(s.workout.date)}</div>
                                                    <div className="weight">{formatWeight(s.metric)}</div>
                                                    <div className="sets-detail">
                                                        {s.topSet
                                                            ? `${formatWeight(s.topSet.weight)} × ${s.topSet.reps ?? 0}`
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
                                            {c.sessions.length > PR_TABLE_SIZE && (
                                                <div className="pr-note">
                                                    last {PR_TABLE_SIZE} of {c.sessions.length}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </section>
                </>
            )}
        </PageTemplateV2>
    );
}
