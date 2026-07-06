'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import PageTemplateV2 from '@/components/layout/v2/pageTemplateV2';
import DropdownV2 from '@/components/ui/v2/dropdownV2';
import { WorkoutCard } from '@/components/workouts/v2/workoutCard';
import { useWorkoutData } from '@/lib/contexts';
import type { MappedCycle } from '@/types';

interface CycleDetailPageV2Props {
    id: string;
}

const TYPE_TO_DATA: Record<MappedCycle['type'], 'strength' | 'hyper' | 'break' | 'maint'> = {
    strength: 'strength',
    hypertrophy: 'hyper',
    break: 'break',
    maintenance: 'maint',
};

const TYPE_LABEL: Record<MappedCycle['type'], string> = {
    strength: 'Strength',
    hypertrophy: 'Hypertrophy',
    break: 'Break',
    maintenance: 'Maintenance',
};

const TYPE_COLOR: Record<MappedCycle['type'], string> = {
    strength: 'var(--strength)',
    hypertrophy: 'var(--hyper)',
    break: 'var(--break)',
    maintenance: 'var(--maint)',
};

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatDayMonth = (date: Date) => {
    const d = new Date(date);
    return `${MONTHS_SHORT[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, '0')}`;
};

const cycleDays = (cycle: MappedCycle) => {
    const diff = Math.abs(cycle.dates[1].getTime() - cycle.dates[0].getTime());
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
};

const formatVolumeShort = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
    return Math.round(n).toString();
};

export default function CycleDetailPageV2({ id }: CycleDetailPageV2Props) {
    const { cycles, exerciseMap, muscleGroups } = useWorkoutData();
    const cycle = useMemo(() => cycles.find((c) => c.uuid === id), [cycles, id]);

    const [miniMode, setMiniMode] = useState(false);
    const [includeWarmup, setIncludeWarmup] = useState(true);
    const [columns, setColumns] = useState(2);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);

    const muscleGroupColor = useMemo(() => {
        const lookup = new Map(muscleGroups.map((mg) => [mg.id, mg.color]));
        return (id: string | undefined) => (id ? lookup.get(id) : undefined);
    }, [muscleGroups]);

    const muscleGroupName = useMemo(() => {
        const lookup = new Map(muscleGroups.map((mg) => [mg.id, mg.name]));
        return (id: string) => lookup.get(id) ?? id;
    }, [muscleGroups]);

    const muscleGroupStats = useMemo(() => {
        if (!cycle?.workouts) return [];
        const stats: Record<string, { sets: number }> = {};
        for (const workout of cycle.workouts) {
            for (const exercise of workout.exercises) {
                const meta = exerciseMap.get(exercise.exerciseId.toString());
                const group = meta?.primaryMuscleGroup;
                if (!group) continue;
                const workSetCount = exercise.sets.filter((s) => s.isWorkSet).length;
                if (!stats[group]) stats[group] = { sets: 0 };
                stats[group].sets += workSetCount;
            }
        }
        return Object.entries(stats)
            .map(([group, s]) => ({ group, sets: s.sets }))
            .sort((a, b) => b.sets - a.sets);
    }, [cycle?.workouts, exerciseMap]);

    const totalWorkSets = muscleGroupStats.reduce((sum, mg) => sum + mg.sets, 0);
    const maxSets = muscleGroupStats[0]?.sets ?? 1;

    const totalVolume = useMemo(() => {
        if (!cycle?.workouts) return 0;
        return cycle.workouts.reduce((sum, w) => sum + (includeWarmup ? w.volume : w.workVolume), 0);
    }, [cycle?.workouts, includeWarmup]);

    const filteredWorkouts = useMemo(() => {
        if (!cycle?.workouts) return [];
        if (!selectedMuscleGroup) return cycle.workouts;
        return cycle.workouts.filter((w) =>
            w.exercises.some((ex) => exerciseMap.get(ex.exerciseId.toString())?.primaryMuscleGroup === selectedMuscleGroup)
        );
    }, [cycle?.workouts, exerciseMap, selectedMuscleGroup]);

    const slideCount = useMemo(() => Math.max(1, Math.ceil(filteredWorkouts.length / columns)), [filteredWorkouts.length, columns]);

    const safeIndex = Math.min(currentIndex, Math.max(0, slideCount - 1));

    const visibleWorkouts = useMemo(() => {
        const start = safeIndex * columns;
        return filteredWorkouts.slice(start, start + columns);
    }, [filteredWorkouts, safeIndex, columns]);

    if (!cycle) {
        return (
            <PageTemplateV2>
                <div className="empty-state">Cycle not found.</div>
            </PageTemplateV2>
        );
    }

    const dataType = TYPE_TO_DATA[cycle.type];
    const startYear = cycle.dates[0].getFullYear();

    const goPrev = () => setCurrentIndex(Math.max(0, safeIndex - 1));
    const goNext = () => setCurrentIndex(Math.min(slideCount - 1, safeIndex + 1));

    return (
        <PageTemplateV2 footer={`Cycle Detail · ${cycle.name}`}>
            <div className="breadcrumb">
                <Link href="/cycles">{startYear}</Link>
                <span className="sep">/</span>
                <span className="current">{cycle.name}</span>
            </div>

            <section className="detail-hero" data-type={dataType}>
                <div className="left">
                    <div className="type-mark" />
                    <div className="titles">
                        <span className="type-tag" data-type={dataType}>
                            {TYPE_LABEL[cycle.type]}
                        </span>
                        <h1 style={{ color: TYPE_COLOR[cycle.type] }}>{cycle.name}</h1>
                        <div className="meta">
                            <span>
                                {formatDayMonth(cycle.dates[0])} → {formatDayMonth(cycle.dates[1])}
                            </span>
                            <span className="sep">·</span>
                            <span>{cycle.location || '—'}</span>
                        </div>
                    </div>
                </div>
                <div className="right">
                    <div className="stat right">
                        <span className="v">{cycle.workouts.length}</span>
                        <span className="l">Workouts</span>
                    </div>
                    <div className="stat right">
                        <span className="v">{cycleDays(cycle)}</span>
                        <span className="l">Days</span>
                    </div>
                    <div className="stat right">
                        <span className="v">{formatVolumeShort(totalVolume)}</span>
                        <span className="l">Volume</span>
                    </div>
                </div>
            </section>

            <section className="detail-zones">
                <div className="zone">
                    <div className="panel-label" style={{ margin: '0 0 24px' }}>
                        <span>Muscle Group · Work Sets</span>
                        <span className="hint">click to filter</span>
                    </div>

                    {muscleGroupStats.length === 0 ? (
                        <div className="empty-state">No work sets recorded.</div>
                    ) : (
                        <div className="mg-chart">
                            {muscleGroupStats.map(({ group, sets }) => {
                                const color = muscleGroupColor(group) ?? 'var(--muted)';
                                const width = `${(sets / maxSets) * 100}%`;
                                const isSelected = selectedMuscleGroup === group;
                                const isDimmed = selectedMuscleGroup !== null && !isSelected;
                                return (
                                    <button
                                        key={group}
                                        type="button"
                                        className={`mg-row${isSelected ? ' selected' : ''}${isDimmed ? ' dim' : ''}`}
                                        onClick={() => {
                                            setSelectedMuscleGroup(isSelected ? null : group);
                                            setCurrentIndex(0);
                                        }}
                                        style={{ background: 'transparent', border: 0, textAlign: 'left' }}
                                    >
                                        <span className="name">
                                            <span className="dot" style={{ background: color }} />
                                            {muscleGroupName(group)}
                                        </span>
                                        <span className="bar-track">
                                            <span className="bar-fill" style={{ width, background: color }} />
                                        </span>
                                        <span className="v">
                                            <b>{sets}</b>s
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {muscleGroupStats.length > 0 && (
                        <div className="mg-foot">
                            <span>{muscleGroupStats.length} muscle groups</span>
                            <span>{totalWorkSets} total work sets</span>
                        </div>
                    )}

                    {cycle.note && (
                        <div className="note-block" style={{ marginTop: 28 }}>
                            {cycle.note}
                        </div>
                    )}
                </div>

                <div className="zone">
                    <div className="panel-label" style={{ margin: '0 0 18px' }}>
                        <span>Workouts · {filteredWorkouts.length} sessions</span>
                        <span className="hint">click an exercise for full history</span>
                    </div>

                    <div className="toolbar" style={{ marginBottom: 20 }}>
                        <div className="toolbar-grp">
                            <button type="button" className="icon-btn sm" onClick={goPrev} disabled={safeIndex === 0} aria-label="Previous">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <title>Previous</title>
                                    <polyline points="15 18 9 12 15 6" />
                                </svg>
                            </button>
                            <span className="toolbar-pos">
                                <b>{safeIndex + 1}</b>
                                <span className="sep">/</span>
                                {slideCount}
                            </span>
                            <button type="button" className="icon-btn sm" onClick={goNext} disabled={safeIndex >= slideCount - 1} aria-label="Next">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <title>Next</title>
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </button>
                        </div>

                        <span className="toolbar-divider" />

                        <div className="toolbar-grp">
                            <button type="button" className="toolbar-control" onClick={() => setMiniMode((m) => !m)} title="Detail mode">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <title>Detail</title>
                                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                                <span className="switch" data-on={!miniMode}>
                                    <span className="thumb" />
                                </span>
                                <span>Detail</span>
                            </button>
                            <button type="button" className="toolbar-control" onClick={() => setIncludeWarmup((w) => !w)} title="Include warmup">
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
                            <span className="toolbar-control" title="Columns per row">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <title>Columns</title>
                                    <rect x="3" y="3" width="7" height="18" rx="1" />
                                    <rect x="14" y="3" width="7" height="18" rx="1" />
                                </svg>
                                <DropdownV2
                                    value={String(columns)}
                                    options={[
                                        { value: '1', label: '1' },
                                        { value: '2', label: '2' },
                                        { value: '3', label: '3' },
                                        { value: '4', label: '4' },
                                    ]}
                                    onChange={(v) => {
                                        setColumns(Number(v));
                                        setCurrentIndex(0);
                                    }}
                                    ariaLabel="Columns"
                                />
                            </span>
                        </div>
                    </div>

                    {visibleWorkouts.length > 0 ? (
                        <div className={`workouts-grid cols-${columns}`}>
                            {visibleWorkouts.map((workout) => (
                                <WorkoutCard
                                    key={`${workout.uuid}-${miniMode}`}
                                    day={{ date: workout.date, liftingWorkouts: [workout], cardioWorkouts: [] }}
                                    exerciseMap={exerciseMap}
                                    includeWarmup={includeWarmup}
                                    initialCompact={miniMode}
                                    dateFormat="short"
                                    cycleId={cycle.uuid}
                                    muscleGroupColor={muscleGroupColor}
                                    muscleGroupFilter={selectedMuscleGroup}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">No workouts in this cycle.</div>
                    )}
                </div>
            </section>
        </PageTemplateV2>
    );
}
