'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import ExerciseCellV2 from '@/components/exercises/v2/exerciseCellV2';
import PageTemplateV2 from '@/components/layout/v2/pageTemplateV2';
import DropdownV2, { type DropdownV2Option } from '@/components/ui/v2/dropdownV2';
import TimeRangeSeg from '@/components/ui/v2/timeRangeSeg';
import { useWorkoutData } from '@/lib/contexts';
import type { ExerciseUsageStats } from '@/lib/hooks/useExercisesLibraryState';
import { formatVolume } from '@/lib/statsUtils';
import { inTimeRange, resolveTimeRange, type TimeRangeValue } from '@/lib/timeRange';

export default function MuscleGroupPageV2() {
    const params = useParams();
    const router = useRouter();
    const { workouts, exerciseMap, muscleGroups } = useWorkoutData();

    const slug = params?.slug?.toString() ?? '';
    const muscleGroup = muscleGroups.find((mg) => mg.id === slug);

    const [timeRange, setTimeRange] = useState<TimeRangeValue>({ preset: 'all' });
    const resolvedRange = useMemo(() => resolveTimeRange(timeRange), [timeRange]);

    const earliestWorkoutDate = useMemo(() => {
        let min: Date | null = null;
        for (const w of workouts) {
            if (!min || w.date < min) min = w.date;
        }
        return min;
    }, [workouts]);

    // The date inputs always show the active range's bounds; editing either switches to a custom range.
    const rangeStart = resolvedRange.start ?? earliestWorkoutDate ?? new Date();
    const rangeEnd = resolvedRange.end ?? new Date();
    const toInputValue = (d: Date) => d.toISOString().slice(0, 10);

    const handleStartChange = (value: string) => {
        const d = new Date(value); // YYYY-MM-DD parses as UTC midnight, matching the app's UTC day grouping
        if (Number.isNaN(d.getTime())) return;
        setTimeRange({ preset: 'custom', start: d, end: d > rangeEnd ? d : rangeEnd });
    };
    const handleEndChange = (value: string) => {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return;
        setTimeRange({ preset: 'custom', start: d < rangeStart ? d : rangeStart, end: d });
    };

    // Year stepper: shows the year the visible window ends in; stepping snaps to that full calendar year.
    const currentYear = new Date().getUTCFullYear();
    const earliestYear = earliestWorkoutDate?.getUTCFullYear() ?? currentYear;
    const displayedYear = rangeEnd.getUTCFullYear();
    const goToYear = (y: number) => setTimeRange({ preset: 'custom', start: new Date(Date.UTC(y, 0, 1)), end: new Date(Date.UTC(y, 11, 31)) });

    const exercisesInGroup = useMemo(
        () => Array.from(exerciseMap.values()).filter((ex) => ex.primaryMuscleGroup === slug),
        [exerciseMap, slug]
    );

    const { statsByExerciseId, totals } = useMemo(() => {
        const ids = new Set(exercisesInGroup.map((ex) => ex.id));
        const stats = new Map<number, ExerciseUsageStats>();
        let sessions = 0;
        for (const w of workouts) {
            if (!inTimeRange(w.date, resolvedRange)) continue;
            let inSession = false;
            for (const ex of w.exercises) {
                if (!ids.has(ex.exerciseId) || ex.sets.length === 0) continue;
                inSession = true;
                const entry = stats.get(ex.exerciseId) ?? { sessionCount: 0, setCount: 0, maxWeight: 0, volume: 0 };
                entry.sessionCount += 1;
                entry.volume += ex.workVolume;
                for (const s of ex.sets) {
                    if (s.isWorkSet) entry.setCount += 1;
                    if (s.weight > entry.maxWeight) entry.maxWeight = s.weight;
                }
                stats.set(ex.exerciseId, entry);
            }
            if (inSession) sessions += 1;
        }
        let setCount = 0;
        let volume = 0;
        for (const s of stats.values()) {
            setCount += s.setCount;
            volume += s.volume;
        }
        return { statsByExerciseId: stats, totals: { sessions, setCount, volume, trained: stats.size } };
    }, [workouts, exercisesInGroup, resolvedRange]);

    // Trained exercises first (by work sets, then volume), untrained alphabetically at the end.
    const sortedExercises = useMemo(
        () =>
            [...exercisesInGroup].sort((a, b) => {
                const sa = statsByExerciseId.get(a.id);
                const sb = statsByExerciseId.get(b.id);
                if (!!sa !== !!sb) return sa ? -1 : 1;
                if (sa && sb) {
                    if (sb.setCount !== sa.setCount) return sb.setCount - sa.setCount;
                    if (sb.volume !== sa.volume) return sb.volume - sa.volume;
                }
                return a.name.localeCompare(b.name);
            }),
        [exercisesInGroup, statsByExerciseId]
    );

    const trainedExercises = useMemo(() => sortedExercises.filter((ex) => statsByExerciseId.has(ex.id)), [sortedExercises, statsByExerciseId]);
    const maxSets = statsByExerciseId.get(trainedExercises[0]?.id ?? -1)?.setCount ?? 1;

    const muscleOptions = useMemo<DropdownV2Option[]>(
        () => muscleGroups.map((mg) => ({ value: mg.id, label: mg.name, color: mg.color })),
        [muscleGroups]
    );

    if (!muscleGroup) {
        return (
            <PageTemplateV2>
                <div className="empty-state">Muscle group not found</div>
            </PageTemplateV2>
        );
    }

    return (
        <PageTemplateV2 footer={`Muscle · ${muscleGroup.name} · ${exercisesInGroup.length} exercises`}>
            <div className="breadcrumb">
                <Link href="/exercises">Exercises</Link>
                <span className="sep">/</span>
                <span className="current" style={{ textTransform: 'capitalize' }}>
                    {muscleGroup.name}
                </span>
            </div>

            <section className="detail-hero">
                <div className="left">
                    <h1 style={{ color: muscleGroup.color, textTransform: 'capitalize' }}>{muscleGroup.name}</h1>
                    <div className="meta">
                        <span className="chip outline" style={{ color: muscleGroup.color, borderColor: muscleGroup.color }}>
                            muscle group
                        </span>
                        <span className="chip">{exercisesInGroup.length} exercises</span>
                    </div>
                </div>
                <div className="right stat-grid-4">
                    <div className="stat right">
                        <span className="v" style={{ color: muscleGroup.color }}>
                            {totals.trained}
                        </span>
                        <span className="l">Exercises Trained</span>
                    </div>
                    <div className="stat right">
                        <span className="v">{totals.sessions}</span>
                        <span className="l">Sessions</span>
                    </div>
                    <div className="stat right">
                        <span className="v">{totals.setCount}</span>
                        <span className="l">Work Sets</span>
                    </div>
                    <div className="stat right">
                        <span className="v">{formatVolume(totals.volume)}</span>
                        <span className="l">Volume</span>
                    </div>
                </div>
            </section>

            <div className="toolbar u-mb-8">
                <div className="toolbar-grp">
                    <span className="label-mono">Muscle</span>
                    <DropdownV2
                        value={slug}
                        options={muscleOptions}
                        onChange={(v) => router.push(`/muscle/${v}`)}
                        size="md"
                        ariaLabel="Muscle group"
                    />
                </div>

                <span className="toolbar-divider" />

                <div className="toolbar-grp">
                    <span className="label-mono">Range</span>
                    <TimeRangeSeg value={timeRange} onChange={setTimeRange} />
                </div>

                <span className="toolbar-divider" />

                <div className="toolbar-grp">
                    <div className="year-nav">
                        <button
                            type="button"
                            className="icon-btn sm"
                            onClick={() => goToYear(displayedYear - 1)}
                            disabled={displayedYear <= earliestYear}
                            aria-label="Previous year"
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <title>Previous year</title>
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </button>
                        <span className="label-mono" style={{ padding: '0 4px' }}>
                            {displayedYear}
                        </span>
                        <button
                            type="button"
                            className="icon-btn sm"
                            onClick={() => goToYear(displayedYear + 1)}
                            disabled={displayedYear >= currentYear}
                            aria-label="Next year"
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <title>Next year</title>
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </button>
                    </div>
                </div>

                <span className="toolbar-divider" />

                <div className="toolbar-grp">
                    <span className="label-mono">From</span>
                    <input
                        className="date-input"
                        type="date"
                        value={toInputValue(rangeStart)}
                        onChange={(e) => handleStartChange(e.target.value)}
                        aria-label="Start date"
                    />
                    <span className="label-mono">To</span>
                    <input
                        className="date-input"
                        type="date"
                        value={toInputValue(rangeEnd)}
                        onChange={(e) => handleEndChange(e.target.value)}
                        aria-label="End date"
                    />
                </div>
            </div>

            <div className="panel-label" style={{ margin: '0 0 16px' }}>
                <span>Work Sets by Exercise</span>
                <span className="hint">click to open exercise</span>
            </div>

            {trainedExercises.length === 0 ? (
                <div className="empty-state u-mb-8">No sessions in this range.</div>
            ) : (
                <div className="mg-chart muscle-dist u-mb-8">
                    {trainedExercises.map((ex) => {
                        const s = statsByExerciseId.get(ex.id);
                        if (!s) return null;
                        return (
                            <Link key={ex.id} href={`/exercises/${ex.id}`} className="mg-row">
                                <span className="name">{ex.name}</span>
                                <span className="bar-track">
                                    <span
                                        className="bar-fill"
                                        style={{ width: `${(s.setCount / maxSets) * 100}%`, background: muscleGroup.color }}
                                    />
                                </span>
                                <span className="v">
                                    <b>{s.setCount}</b>s
                                </span>
                            </Link>
                        );
                    })}
                </div>
            )}

            <div className="panel-label">
                <span>
                    Exercises · {totals.trained} of {exercisesInGroup.length} in range
                </span>
            </div>
            <section className="exercise-grid">
                {sortedExercises.map((ex) => (
                    <ExerciseCellV2 key={ex.id} exercise={ex} muscleGroup={muscleGroup} stats={statsByExerciseId.get(ex.id)} />
                ))}
            </section>
        </PageTemplateV2>
    );
}
