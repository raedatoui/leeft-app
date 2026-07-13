'use client';

import { ChevronDown } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { defaultMaxCalculator } from '@/lib/calc';
import { computeExerciseSessions, computeExerciseStats } from '@/lib/exerciseSessions';
import type { AddWorkoutState } from '@/lib/hooks/useAddWorkoutState';
import { formatNumber } from '@/lib/statsUtils';
import { resolveTimeRange } from '@/lib/timeRange';

interface ExerciseDetailV2Props {
    state: AddWorkoutState;
    muscleGroupColor: (id: string | undefined) => string | undefined;
    exerciseIndex: number;
}

const ALL_TIME = resolveTimeRange({ preset: 'all' });

// Content of the exercise-detail bottom sheet (see exerciseModalV2.tsx for the sheet chrome).
// Only mounted while its sheet is open, so its session/stats lookups don't run otherwise.
export default function ExerciseDetailV2({ state, muscleGroupColor, exerciseIndex }: ExerciseDetailV2Props) {
    const draft = state.exercises[exerciseIndex];
    const exerciseId = draft?.exerciseId;
    const metadata = state.exerciseMap.get(String(exerciseId));
    const summary = state.exerciseSummaries[exerciseIndex];
    const name = metadata?.name ?? `Exercise ${exerciseId}`;
    const dotColor = muscleGroupColor(metadata?.primaryMuscleGroup) ?? 'var(--muted)';

    // Which reps/weight box has keyboard focus — drives the per-column "fill below" chip.
    const [focusedField, setFocusedField] = useState<{ setIndex: number; field: 'reps' | 'weight' } | null>(null);

    const sessions = useMemo(
        () =>
            exerciseId === undefined
                ? []
                : computeExerciseSessions(state.workouts, exerciseId, {
                      method: defaultMaxCalculator,
                      repRange: { min: 1, max: 50 },
                      range: ALL_TIME,
                      cycleWorkoutIds: null,
                  }),
        [state.workouts, exerciseId]
    );
    const lastSession = sessions[sessions.length - 1];
    const stats = useMemo(() => computeExerciseStats(sessions), [sessions]);

    if (!draft || !summary) return null;

    const lastText = lastSession
        ? `${lastSession.workSetCount} x ${lastSession.topSet?.reps ?? 0} @ ${Math.round(lastSession.topSet?.weight ?? 0)} lb`
        : '—';
    const workingMaxText = stats.pr ? formatNumber(Math.round(stats.pr)) : '—';
    const allDone = draft.sets.length > 0 && draft.sets.every((s) => s.done);

    return (
        <>
            <div className="page-tag">
                Exercise {exerciseIndex + 1} of {state.exercises.length}
            </div>
            <div className="ex-title-row">
                <span className="ex-dot" style={{ background: dotColor }} />
                <span className="ex-title">{name}</span>
                <button type="button" className="ctl-circle ex-close" onClick={state.closeExerciseModal} aria-label="Close exercise">
                    <ChevronDown size={18} />
                </button>
            </div>
            <div className="ex-vol-line">
                {formatNumber(summary.workVolume)} lbs work volume · {draft.sets.length} sets
            </div>
            <div className="last-card">
                <span>
                    <label>Last</label>
                    <b>{lastText}</b>
                </span>
                <span>
                    <label>Working max</label>
                    <b>{workingMaxText}</b>
                </span>
            </div>
            <div className="sets-head">
                <span className="sets-lbl">Sets</span>
                <span className="sets-chip">Reps</span>
                <span className="sets-chip">Lb</span>
                <button
                    type="button"
                    className={`chk all${allDone ? ' on' : ''}`}
                    onClick={() => state.toggleAllSetsDone(exerciseIndex)}
                    aria-label="Toggle all sets done"
                >
                    ✓✓
                </button>
            </div>
            {draft.sets.map((s, si) => {
                const fillField = focusedField?.setIndex === si ? focusedField.field : null;
                const showFillDown = fillField !== null && draft.sets.slice(si + 1).some((r) => r[fillField] !== s[fillField]);
                return (
                    // biome-ignore lint/suspicious/noArrayIndexKey: sets only ever append/pop at the end, order is stable identity
                    <Fragment key={si}>
                        <div className="set-row">
                            <span className="set-num">{si + 1}</span>
                            <input
                                className="num-box"
                                inputMode="numeric"
                                value={s.reps || ''}
                                placeholder="0"
                                onFocus={(e) => {
                                    e.target.select();
                                    setFocusedField({ setIndex: si, field: 'reps' });
                                }}
                                onBlur={() => setFocusedField(null)}
                                onChange={(e) => state.updateSetField(exerciseIndex, si, 'reps', parseFloat(e.target.value) || 0)}
                            />
                            <input
                                className="num-box"
                                inputMode="decimal"
                                value={s.weight || ''}
                                placeholder="0"
                                onFocus={(e) => {
                                    e.target.select();
                                    setFocusedField({ setIndex: si, field: 'weight' });
                                }}
                                onBlur={() => setFocusedField(null)}
                                onChange={(e) => state.updateSetField(exerciseIndex, si, 'weight', parseFloat(e.target.value) || 0)}
                            />
                            <button
                                type="button"
                                className={`chk${s.done ? ' on' : ''}`}
                                onClick={() => state.toggleSetDone(exerciseIndex, si)}
                                aria-label={s.done ? 'Mark set not done' : 'Mark set done'}
                            >
                                ✓
                            </button>
                        </div>
                        {showFillDown && (
                            <div className="fill-down-row">
                                <button
                                    type="button"
                                    className="fill-down-btn"
                                    style={{ gridColumn: fillField === 'reps' ? 2 : 3 }}
                                    // pointerdown (not click): it fires before the input's blur, which
                                    // would unmount this button and swallow the click on touch devices
                                    onPointerDown={(e) => {
                                        e.preventDefault();
                                        state.fillDownSetField(exerciseIndex, si, fillField);
                                    }}
                                >
                                    ⇩ fill {s[fillField] || 0} below
                                </button>
                            </div>
                        )}
                    </Fragment>
                );
            })}
            <div className="set-ctl">
                <button
                    type="button"
                    className="ctl-circle"
                    onClick={() => state.removeSet(exerciseIndex)}
                    disabled={draft.sets.length === 0}
                    aria-label="Remove set"
                >
                    −
                </button>
                <span className="ctl-lbl">Set</span>
                <button type="button" className="ctl-circle" onClick={() => state.addSet(exerciseIndex)} aria-label="Add set">
                    +
                </button>
            </div>
        </>
    );
}
