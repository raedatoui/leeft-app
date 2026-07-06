'use client';

import Link from 'next/link';
import { type FC, useState } from 'react';
import { EffortChart } from '@/components/cardio/v2/effortChart';
import { formatLongDate, formatShortDate } from '@/lib/dateFormatters';
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

const formatSetsSummary = (sets: { reps?: number; weight: number }[]): string => {
    if (sets.length === 0) return '—';
    const reps = sets.map((s) => s.reps ?? '?').join(',');
    const weights = sets.map((s) => Math.round(s.weight)).join(',');
    return `${reps} @ ${weights}`;
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

export const ExerciseBlock: FC<ExerciseBlockProps> = ({ exercise, metadata, includeWarmup, compact, cycleId, onExerciseClick, muscleGroupColor }) => {
    const sets = includeWarmup ? exercise.sets : exercise.sets.filter((s) => s.isWorkSet);
    const volume = includeWarmup ? exercise.volume : exercise.workVolume;
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
                <span className="ex-vol">
                    <b>{volume.toLocaleString()}</b>lbs
                </span>
            </div>
            {compact ? (
                <div className="ex-summary">{formatSetsSummary(sets)}</div>
            ) : (
                sets.length > 0 && (
                    <table className="sets-table">
                        <thead>
                            <tr>
                                <th>set</th>
                                <th>reps</th>
                                <th>lbs</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sets.map((set, i) => {
                                const isPRSet = set.prTier !== undefined;
                                return (
                                    <tr key={set.order} className={`${set.isWorkSet ? 'work' : ''}${isPRSet ? ` pr pr-${set.prTier}` : ''}`}>
                                        <td>{i + 1}</td>
                                        <td>{set.reps ?? '—'}</td>
                                        <td>
                                            {Math.round(set.weight)}
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
    exerciseMap,
    includeWarmup,
    compact,
    cycleId,
    onExerciseClick,
    muscleGroupColor,
    muscleGroupFilter,
    selectedExercise,
}) => {
    let exercises = workout.exercises;
    if (muscleGroupFilter) {
        exercises = exercises.filter((ex) => exerciseMap.get(ex.exerciseId.toString())?.primaryMuscleGroup === muscleGroupFilter);
    }
    if (selectedExercise) {
        exercises = exercises.filter((ex) => ex.exerciseId.toString() === selectedExercise);
    }
    if (exercises.length === 0) return null;

    const totalVolume = includeWarmup ? workout.volume : workout.workVolume;
    const totalSets = exercises.reduce((sum, ex) => sum + (includeWarmup ? ex.sets.length : ex.sets.filter((s) => s.isWorkSet).length), 0);

    return (
        <>
            <div className="lift-headline">
                <span className="lift-type">LIFTING</span>
                {workout.title && <span className="lift-subtitle">{workout.title}</span>}
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
            </div>
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

function formatDistanceKm(km: number): string {
    return `${km.toFixed(km >= 10 ? 1 : 2)} km`;
}

function formatPaceSecPerKm(sec: number): string {
    const min = Math.floor(sec / 60);
    const rem = Math.round(sec - min * 60);
    return `${min}:${String(rem).padStart(2, '0')} /km`;
}

const CardioWorkoutBody: FC<{ workout: CardioWorkout; compact: boolean }> = ({ workout, compact }) => {
    return (
        <>
            <div className="cardio-headline">
                <span className="cardio-type">{workout.type}</span>
                <span className="cardio-duration">
                    <b>{Math.round(workout.durationMin).toString().padStart(2, '0')}</b>min
                </span>
            </div>

            {!compact && (
                <div className="cardio-stats-grid">
                    {workout.distance != null && workout.distance > 0 && (
                        <div className="ks">
                            <span className="v" style={{ color: 'var(--cardio)' }}>
                                {formatDistanceKm(workout.distance)}
                            </span>
                            <span className="l">Distance</span>
                        </div>
                    )}
                    {workout.pace != null && workout.pace > 0 && (
                        <div className="ks">
                            <span className="v">{formatPaceSecPerKm(workout.pace)}</span>
                            <span className="l">Pace</span>
                        </div>
                    )}
                    {workout.zoneMinutes != null && (
                        <div className="ks">
                            <span className="v" style={{ color: 'var(--zone)' }}>
                                {workout.zoneMinutes}
                            </span>
                            <span className="l">Zone Min</span>
                        </div>
                    )}
                    {workout.averageHeartRate != null && (
                        <div className="ks">
                            <span className="v">{workout.averageHeartRate}</span>
                            <span className="l">Avg HR</span>
                        </div>
                    )}
                    {workout.calories != null && (
                        <div className="ks">
                            <span className="v">{workout.calories.toLocaleString()}</span>
                            <span className="l">Calories</span>
                        </div>
                    )}
                    {workout.steps != null && (
                        <div className="ks">
                            <span className="v">{workout.steps.toLocaleString()}</span>
                            <span className="l">Steps</span>
                        </div>
                    )}
                </div>
            )}

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

            {day.cardioWorkouts.map((workout) => (
                <CardioWorkoutBody key={workout.uuid} workout={workout} compact={compact} />
            ))}

            {day.liftingWorkouts.map((workout) => (
                <LiftingWorkoutBody
                    key={workout.uuid}
                    workout={workout}
                    exerciseMap={exerciseMap}
                    includeWarmup={includeWarmup}
                    compact={compact}
                    cycleId={cycleId}
                    onExerciseClick={onExerciseClick}
                    muscleGroupColor={muscleGroupColor}
                    muscleGroupFilter={muscleGroupFilter}
                    selectedExercise={selectedExercise}
                />
            ))}
        </article>
    );
};

export default WorkoutCard;
