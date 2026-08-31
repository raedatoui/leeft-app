'use client';

import { Bandage, Brain, Dumbbell, type LucideIcon, Moon, Smile, Timer, Zap } from 'lucide-react';
import Link from 'next/link';
import { type FC, useEffect, useRef, useState } from 'react';
import CardioStatsGrid from '@/components/cardio/v2/cardioStatsGrid';
import { EffortChart } from '@/components/cardio/v2/effortChart';
import { READINESS_QUESTIONS, type ReadinessAnswers, SCALE_COLORS } from '@/lib/addWorkoutConstants';
import { cardioColors, cardioIcons } from '@/lib/cardio-theme';
import { startTime } from '@/lib/contexts';
import { formatLongDate, formatShortDate, formatTimeOfDay } from '@/lib/dateFormatters';
import { type ColumnUnits, formatSetsLine, formatSetValue, isLoaded, unitLabel } from '@/lib/setUnits';
import type { CardioWorkout, DayWorkout, Exercise, ExerciseMap, ExerciseMetadata, Workout } from '@/types';

interface WorkoutCardProps {
    day: DayWorkout;
    exerciseMap: ExerciseMap;
    includeWarmup: boolean;
    /** Defaults to false (expanded). When true, exercises render as one-line summaries. */
    initialCompact?: boolean;
    /** Defaults to true. Set false when the parent (e.g., a panel header) already shows the date. */
    showDateHeader?: boolean;
    /** Date format in the card header. Defaults to 'long' ("Sunday, January 1"). 'short' ("Sun · Jan 01") fits in narrow grid cells. */
    dateFormat?: 'long' | 'short';
    cycleId?: string;
    onExerciseClick?: (id: string) => void;
    muscleGroupColor?: (muscleGroupId: string | undefined) => string | undefined;
    /** Hides exercises whose primaryMuscleGroup doesn't match. Empty result hides the whole lifting block. */
    muscleGroupFilter?: string | null;
    /** Renders only the matching exercise (used by exercise detail hover focus). */
    selectedExercise?: string | null;
}

type SetLike = { reps?: number; weight: number };

// Compact clipboard form, e.g. "5,5,5@225" (single weight when all sets share it, else positional list).
const formatSetsForClipboard = (sets: SetLike[], units: ColumnUnits): string => {
    if (sets.length === 0) return '—';
    const lead = sets.map((s) => formatSetValue(s.reps, units.reps)).join(',');
    if (units.weight === 'none') return lead;
    const weights = sets.map((s) => Math.round(s.weight));
    const uniqueWeights = [...new Set(weights)];
    return `${lead}@${uniqueWeights.length === 1 ? uniqueWeights[0] : weights.join(',')}`;
};

interface ExerciseBlockProps {
    exercise: Exercise;
    metadata: ExerciseMetadata | undefined;
    includeWarmup: boolean;
    compact: boolean;
    cycleId?: string;
    onExerciseClick?: (id: string) => void;
    muscleGroupColor?: (id: string | undefined) => string | undefined;
}

const TIER_RANK = { allTime: 3, active: 2, beaten: 1 } as const;

// Card-rendering detail, not part of the survey contract — the /add questionnaire shows no icons.
// Keyed by the question union rather than `string`, so it stays total under
// noUncheckedIndexedAccess and a new question can't be added without an icon.
const READINESS_ICONS: Record<keyof ReadinessAnswers, LucideIcon> = {
    sleep: Moon,
    energy: Zap,
    mood: Smile,
    stress: Brain,
    soreness: Bandage,
};

/**
 * The pre-session survey: the answered average, then one icon-over-square per question in
 * `READINESS_QUESTIONS` order, filled with the 1–5 scale colour.
 *
 * Present on a little over half the log — the years hydrated out of the TrainHeroic export plus
 * everything logged in-app since. A day without it renders nothing at all rather than an empty row.
 */
const ReadinessStrip: FC<{ readiness: Record<string, number> }> = ({ readiness }) => {
    const answered = READINESS_QUESTIONS.map((q) => readiness[q.key]).filter((v): v is number => v !== undefined);
    // 18 days in the log answered only some of the five; an unanswered question still takes its
    // column, and the average is over what was actually answered (as on the /add summary).
    if (answered.length === 0) return null;
    const average = answered.reduce((sum, value) => sum + value, 0) / answered.length;

    return (
        <div className="readiness-strip">
            <div className="readiness-avg">
                readiness <b style={{ color: SCALE_COLORS[Math.round(average) - 1] }}>{average.toFixed(1)}</b>/5
            </div>
            <div className="readiness-cells">
                {READINESS_QUESTIONS.map((q) => {
                    const value = readiness[q.key];
                    const Icon = READINESS_ICONS[q.key];
                    const color = value === undefined ? undefined : SCALE_COLORS[value - 1];
                    return (
                        <div className="readiness-cell" key={q.key} title={value === undefined ? `${q.label} — unanswered` : `${q.label} ${value}/5`}>
                            <Icon size={11} style={color ? { color } : undefined} />
                            <span
                                className={`readiness-square${value === undefined ? ' empty' : ''}`}
                                style={color ? { background: color } : undefined}
                            >
                                {value ?? '–'}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const ExerciseBlock: FC<ExerciseBlockProps> = ({ exercise, metadata, includeWarmup, compact, cycleId, onExerciseClick, muscleGroupColor }) => {
    const sets = includeWarmup ? exercise.sets : exercise.sets.filter((s) => s.isWorkSet);
    const volume = includeWarmup ? exercise.volume : exercise.workVolume;
    const units = exercise.units;
    const loaded = isLoaded(units);
    const mgColor = muscleGroupColor?.(metadata?.primaryMuscleGroup);
    const exerciseName = metadata?.name ?? `Exercise ${exercise.exerciseId}`;

    // One name chip per distinct rep-max hit, keeping the strongest tier for that rep count (set order).
    const prByReps = new Map<number, NonNullable<(typeof sets)[number]['prTier']>>();
    for (const s of sets) {
        if (!s.prTier || s.reps === undefined) continue;
        const cur = prByReps.get(s.reps);
        if (!cur || TIER_RANK[s.prTier] > TIER_RANK[cur]) prByReps.set(s.reps, s.prTier);
    }
    const prChips = [...prByReps.entries()];

    const nameInner = (
        <>
            {mgColor && <span className="mg-pip" style={{ background: mgColor }} />}
            {exerciseName}
            {prChips.map(([reps, tier]) => (
                <span key={reps} className="pr-badge" data-tier={tier} title={`${reps}RM personal record`}>
                    {reps}RM
                </span>
            ))}
        </>
    );

    const nameNode = onExerciseClick ? (
        <button type="button" className="ex-name" onClick={() => onExerciseClick(exercise.exerciseId.toString())}>
            {nameInner}
        </button>
    ) : (
        <Link href={`/exercises/${exercise.exerciseId}${cycleId ? `?cycleId=${cycleId}` : ''}`} className="ex-name">
            {nameInner}
        </Link>
    );

    return (
        <div className="ex-block">
            <div className="ex-head">
                {nameNode}
                {loaded && (
                    <span className="ex-vol">
                        <b>{volume.toLocaleString()}</b>lbs
                    </span>
                )}
            </div>
            {compact ? (
                <div className="ex-summary">{formatSetsLine(sets, units)}</div>
            ) : (
                sets.length > 0 && (
                    <table className="sets-table">
                        <thead>
                            <tr>
                                <th>set</th>
                                <th>{unitLabel(units.reps).toLowerCase()}</th>
                                <th>{units.weight === 'none' ? '' : unitLabel(units.weight).toLowerCase()}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sets.map((set, i) => {
                                const isPRSet = set.prTier !== undefined;
                                return (
                                    <tr key={set.order} className={`${set.isWorkSet ? 'work' : ''}${isPRSet ? ` pr pr-${set.prTier}` : ''}`}>
                                        <td>{i + 1}</td>
                                        <td>{formatSetValue(set.reps, units.reps)}</td>
                                        <td>
                                            {units.weight === 'none' ? '' : Math.round(set.weight)}
                                            {isPRSet && (
                                                <span className="pr-star" data-tier={set.prTier} title={`${set.reps ?? ''}RM PR`}>
                                                    ★ {set.reps}RM
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )
            )}
        </div>
    );
};

interface LiftingBodyProps {
    workout: Workout;
    date: Date;
    exerciseMap: ExerciseMap;
    includeWarmup: boolean;
    compact: boolean;
    cycleId?: string;
    onExerciseClick?: (id: string) => void;
    muscleGroupColor?: (id: string | undefined) => string | undefined;
    muscleGroupFilter?: string | null;
    selectedExercise?: string | null;
}

const LiftingWorkoutBody: FC<LiftingBodyProps> = ({
    workout,
    date,
    exerciseMap,
    includeWarmup,
    compact,
    cycleId,
    onExerciseClick,
    muscleGroupColor,
    muscleGroupFilter,
    selectedExercise,
}) => {
    const [copied, setCopied] = useState(false);
    const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(
        () => () => {
            if (copiedTimer.current) clearTimeout(copiedTimer.current);
        },
        []
    );

    let exercises = workout.exercises;
    if (muscleGroupFilter) {
        exercises = exercises.filter((ex) => exerciseMap.get(ex.exerciseId.toString())?.primaryMuscleGroup === muscleGroupFilter);
    }
    if (selectedExercise) {
        exercises = exercises.filter((ex) => ex.exerciseId.toString() === selectedExercise);
    }
    if (exercises.length === 0) return null;

    // When a filter hides exercises, the header volume must match the visible ones,
    // not the whole workout's — otherwise sets/ex counts and volume contradict.
    const isFiltered = exercises.length !== workout.exercises.length;
    const totalVolume = isFiltered
        ? exercises.reduce((sum, ex) => sum + (includeWarmup ? ex.volume : ex.workVolume), 0)
        : includeWarmup
          ? workout.volume
          : workout.workVolume;
    const totalSets = exercises.reduce((sum, ex) => sum + (includeWarmup ? ex.sets.length : ex.sets.filter((s) => s.isWorkSet).length), 0);

    const handleCopy = async () => {
        const lines = exercises.map((ex) => {
            const name = (exerciseMap.get(ex.exerciseId.toString())?.name ?? `Exercise ${ex.exerciseId}`).toLowerCase();
            const sets = includeWarmup ? ex.sets : ex.sets.filter((s) => s.isWorkSet);
            return `${name}: ${formatSetsForClipboard(sets, ex.units)}`;
        });
        const time = workout.startedAt ? ` · ${formatTimeOfDay(workout.startedAt)}` : '';
        const text = `${formatLongDate(date)}${time} · ${Math.round(workout.duration)} min\n${lines.join('\n')}`;
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            if (copiedTimer.current) clearTimeout(copiedTimer.current);
            copiedTimer.current = setTimeout(() => setCopied(false), 1500);
        } catch {
            // clipboard unavailable (e.g. insecure context) — silently no-op
        }
    };

    return (
        <>
            <div className="lift-headline">
                <span className="headline-icon" style={{ color: 'var(--maint)' }}>
                    <Dumbbell size={18} />
                </span>
                <span className="lift-type">LIFTING</span>
                {workout.startedAt && <span className="session-time">{formatTimeOfDay(workout.startedAt)}</span>}
                <span className="lift-duration">
                    <b>{Math.round(workout.duration).toString().padStart(2, '0')}</b>min
                </span>
            </div>
            <div className="session-vol">
                <span className="v maint">
                    <b>{totalVolume.toLocaleString()}</b>lbs
                </span>
                <span>
                    <b>{totalSets}</b>sets
                </span>
                <span>
                    <b>{exercises.length}</b>ex
                </span>
                <button
                    type="button"
                    className="lift-copy"
                    onClick={handleCopy}
                    aria-label="Copy exercises to clipboard"
                    title={copied ? 'Copied!' : 'Copy exercises'}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <title>{copied ? 'Copied' : 'Copy'}</title>
                        {copied ? (
                            <polyline points="20 6 9 17 4 12" />
                        ) : (
                            <>
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </>
                        )}
                    </svg>
                </button>
            </div>
            {workout.readiness && <ReadinessStrip readiness={workout.readiness} />}
            <div className="exercises">
                {exercises.map((exercise) => (
                    <ExerciseBlock
                        key={`${workout.uuid}-${exercise.exerciseId}`}
                        exercise={exercise}
                        metadata={exerciseMap.get(exercise.exerciseId.toString())}
                        includeWarmup={includeWarmup}
                        compact={compact}
                        cycleId={cycleId}
                        onExerciseClick={onExerciseClick}
                        muscleGroupColor={muscleGroupColor}
                    />
                ))}
            </div>
        </>
    );
};

const CardioWorkoutBody: FC<{ workout: CardioWorkout; compact: boolean }> = ({ workout, compact }) => {
    const Icon = cardioIcons[workout.type] ?? Timer;
    return (
        <>
            <div className="cardio-headline">
                <span className="headline-icon" style={{ color: cardioColors[workout.type] ?? 'var(--cardio)' }}>
                    <Icon size={18} />
                </span>
                <span className="cardio-type">{workout.type}</span>
                {workout.startedAt && <span className="session-time">{formatTimeOfDay(workout.startedAt)}</span>}
                <span className="cardio-duration">
                    <b>{Math.round(workout.durationMin).toString().padStart(2, '0')}</b>min
                </span>
            </div>

            {!compact && <CardioStatsGrid workout={workout} />}

            {workout.effort && workout.effort.length > 0 && <EffortChart effort={workout.effort} showLegend={!compact} />}
        </>
    );
};

export const WorkoutCard: FC<WorkoutCardProps> = ({
    day,
    exerciseMap,
    includeWarmup,
    initialCompact = false,
    showDateHeader = true,
    dateFormat = 'long',
    cycleId,
    onExerciseClick,
    muscleGroupColor,
    muscleGroupFilter,
    selectedExercise,
}) => {
    const [compact, setCompact] = useState(initialCompact);
    const hasLifting = day.liftingWorkouts.length > 0;
    const hasCardio = day.cardioWorkouts.length > 0;

    const entries: ({ kind: 'cardio'; workout: CardioWorkout } | { kind: 'lifting'; workout: Workout })[] = [
        ...day.cardioWorkouts.map((workout) => ({ kind: 'cardio' as const, workout })),
        ...day.liftingWorkouts.map((workout) => ({ kind: 'lifting' as const, workout })),
    ].sort((a, b) => startTime(a.workout) - startTime(b.workout));

    return (
        <article className={`session${compact ? ' compact' : ''}`}>
            {(showDateHeader || hasLifting || hasCardio) && (
                <div className="session-title-row">
                    {showDateHeader && (
                        <div className="session-title">{dateFormat === 'short' ? formatShortDate(day.date) : formatLongDate(day.date)}</div>
                    )}
                    {(hasLifting || hasCardio) && (
                        <button
                            type="button"
                            className="card-toggle"
                            onClick={() => setCompact((c) => !c)}
                            aria-label={compact ? 'Expand workout' : 'Collapse workout'}
                            title={compact ? 'Show details' : 'Compact view'}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <title>{compact ? 'Expand' : 'Collapse'}</title>
                                {compact ? <polyline points="6 9 12 15 18 9" /> : <polyline points="18 15 12 9 6 15" />}
                            </svg>
                        </button>
                    )}
                </div>
            )}

            {entries.map((entry) =>
                entry.kind === 'cardio' ? (
                    <CardioWorkoutBody key={entry.workout.uuid} workout={entry.workout} compact={compact} />
                ) : (
                    <LiftingWorkoutBody
                        key={entry.workout.uuid}
                        workout={entry.workout}
                        date={day.date}
                        exerciseMap={exerciseMap}
                        includeWarmup={includeWarmup}
                        compact={compact}
                        cycleId={cycleId}
                        onExerciseClick={onExerciseClick}
                        muscleGroupColor={muscleGroupColor}
                        muscleGroupFilter={muscleGroupFilter}
                        selectedExercise={selectedExercise}
                    />
                )
            )}
        </article>
    );
};

export default WorkoutCard;
