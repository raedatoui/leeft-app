'use client';

import Link from 'next/link';
import PageTemplateV2 from '@/components/layout/v2/pageTemplateV2';
import { useCyclesPageState } from '@/lib/hooks/useCyclesPageState';
import { computeStats } from '@/lib/utils';
import type { ExerciseMap, MappedCycle } from '@/types';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

const FILTER_TYPES: { type: MappedCycle['type']; label: string }[] = [
    { type: 'strength', label: 'Strength' },
    { type: 'hypertrophy', label: 'Hyper' },
    { type: 'break', label: 'Break' },
    { type: 'maintenance', label: 'Maint' },
];

const formatDayMonth = (date: Date) => date.toLocaleString('en-US', { month: 'short', day: '2-digit', timeZone: 'UTC' });

const formatVolumeShort = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return Math.round(n).toString();
};

const cycleDuration = (cycle: MappedCycle) => {
    const diff = Math.abs(cycle.dates[1].getTime() - cycle.dates[0].getTime());
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

interface CycleCardV2Props {
    cycle: MappedCycle;
    index: number;
    exerciseMap: ExerciseMap;
}

function CycleCardV2({ cycle, index, exerciseMap }: CycleCardV2Props) {
    const dataType = TYPE_TO_DATA[cycle.type];
    const { workoutCount, avgExercises, topExercises } = computeStats(cycle.workouts);
    const totalVolume = cycle.workouts.reduce((sum, w) => sum + (w.volume || 0), 0);
    const avgVolume = workoutCount > 0 ? totalVolume / workoutCount : 0;
    const days = cycleDuration(cycle);
    const isBreak = cycle.type === 'break';

    return (
        <Link href={`/cycles/${cycle.uuid}`} className="cycle-card" data-type={dataType}>
            <div className="stripe" />
            <div className="body">
                <div className="type-tag" data-type={dataType}>
                    {TYPE_LABEL[cycle.type]} · Cycle {String(index + 1).padStart(2, '0')}
                </div>
                <h3>{cycle.name}</h3>
                <div className="meta">
                    <span>
                        {formatDayMonth(cycle.dates[0])} → {formatDayMonth(cycle.dates[1])}
                    </span>
                    <span className="sep">·</span>
                    <span>{cycle.location || '—'}</span>
                </div>
                <div className="stat-line">
                    <div className="stat sm">
                        <span className="v">{workoutCount}</span>
                        <span className="l">Workouts</span>
                    </div>
                    {isBreak ? (
                        <div className="stat sm">
                            <span className="v">{days}</span>
                            <span className="l">Rest Days</span>
                        </div>
                    ) : (
                        <>
                            <div className="stat sm">
                                <span className="v">{avgExercises ? avgExercises.toFixed(1) : '0'}</span>
                                <span className="l">Avg Ex</span>
                            </div>
                            <div className="stat sm">
                                <span className="v">{formatVolumeShort(avgVolume)}</span>
                                <span className="l">Avg Vol</span>
                            </div>
                        </>
                    )}
                </div>
                {topExercises.length > 0 && (
                    <div className="top-ex">
                        {topExercises.slice(0, 4).map((ex) => {
                            const meta = exerciseMap.get(ex.id.toString());
                            return (
                                <span key={ex.id} className="chip">
                                    {meta?.name ?? `#${ex.id}`}
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>
            <div className="duration">
                <div className="n">{days}</div>
                <div className="u">Days</div>
            </div>
        </Link>
    );
}

export default function CyclesPageV2() {
    const {
        years,
        visibleYear,
        goPrevYear,
        goNextYear,
        hasPrevYear,
        hasNextYear,
        activeType,
        setActiveType,
        visibleCycles,
        filteredCycles,
        yearStats,
        getCyclePosition,
        exerciseMap,
    } = useCyclesPageState();

    return (
        <PageTemplateV2 footer={`${visibleYear} · ${yearStats.totalCycles} cycles · click any to drill in`}>
            <section className="hero-row">
                <div className="hero-block">
                    <div className="hero-title medium" style={{ color: 'var(--strength)' }}>
                        Cycles
                    </div>
                    <div className="hero-meta">
                        <span className="label">Training Cycles · {visibleYear}</span>
                        <span className="stats">
                            <span>
                                <b>{yearStats.totalWorkouts}</b>workouts
                            </span>
                            <span className="break">
                                <b>{yearStats.totalBreakDays}</b>rest days
                            </span>
                            <span>
                                <b>{yearStats.totalCycles}</b>cycles
                            </span>
                        </span>
                    </div>
                </div>

            </section>

            <div className="toolbar u-mb-8">
                <div className="toolbar-grp">
                    <div className="year-nav">
                        <button type="button" className="icon-btn sm" onClick={goPrevYear} disabled={!hasPrevYear} aria-label="Previous year">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <title>Previous year</title>
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </button>
                        <span className="label-mono" style={{ padding: '0 4px' }}>
                            {visibleYear}
                        </span>
                        <button type="button" className="icon-btn sm" onClick={goNextYear} disabled={!hasNextYear} aria-label="Next year">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <title>Next year</title>
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </button>
                    </div>
                </div>

                <span className="toolbar-divider" />

                <div className="toolbar-grp">
                    <span className="label-mono" style={{ padding: '0 8px' }}>
                        Type
                    </span>
                    <div className="filter-pills">
                        <button type="button" className={`filter-pill${activeType === null ? ' active' : ''}`} onClick={() => setActiveType(null)}>
                            All <span className="count">{visibleCycles.length}</span>
                        </button>
                        {FILTER_TYPES.map(({ type, label }) => {
                            const dataType = TYPE_TO_DATA[type];
                            const count = yearStats.typeCounts[type] ?? 0;
                            const isActive = activeType === type;
                            return (
                                <button
                                    key={type}
                                    type="button"
                                    className={`filter-pill${isActive ? ' active' : ''}`}
                                    data-type={dataType}
                                    onClick={() => setActiveType(isActive ? null : type)}
                                >
                                    <span className="swatch" style={{ background: `var(--${dataType})` }} />
                                    {label} <span className="count">{count}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="panel-label">
                <span>Timeline · {visibleYear}</span>
                <span className="hint">click a bar to open the cycle</span>
            </div>
            <section className="timeline-hero">
                <div className="tl-track-wrap">
                    <div className="tl-months">
                        {MONTH_LABELS.map((m) => (
                            <div key={m} className="tl-month">
                                {m}
                            </div>
                        ))}
                    </div>
                    <div className="tl-rule">
                        {Array.from({ length: 12 }, (_, i) => (
                            <div key={MONTH_LABELS[i]} className="tick" style={{ left: `${(i / 12) * 100}%` }} />
                        ))}
                    </div>
                    <div className="tl-bars">
                        {visibleCycles.map((cycle) => {
                            const pos = getCyclePosition(cycle);
                            const dataType = TYPE_TO_DATA[cycle.type];
                            const dimmed = activeType !== null && cycle.type !== activeType;
                            return (
                                <Link
                                    key={cycle.uuid}
                                    href={`/cycles/${cycle.uuid}`}
                                    className="tl-bar"
                                    data-type={dataType}
                                    style={{ left: pos.left, width: pos.width, opacity: dimmed ? 0.2 : undefined }}
                                    aria-label={cycle.name}
                                />
                            );
                        })}
                    </div>
                </div>
            </section>

            {filteredCycles.length === 0 ? (
                <div className="empty-state">{years.length === 0 ? 'No cycles yet.' : 'No cycles match this filter.'}</div>
            ) : (
                <>
                    <div className="panel-label">
                        <span>
                            Cycles · {filteredCycles.length} of {visibleCycles.length}
                        </span>
                        <span className="hint">click a card to drill in</span>
                    </div>
                    <section className="cycles-grid">
                        {filteredCycles.map((cycle, idx) => (
                            <CycleCardV2 key={cycle.uuid} cycle={cycle} index={idx} exerciseMap={exerciseMap} />
                        ))}
                    </section>
                </>
            )}
        </PageTemplateV2>
    );
}
