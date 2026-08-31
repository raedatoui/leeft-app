'use client';

import { ChevronDown } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import DropdownV2 from '@/components/ui/v2/dropdownV2';
import { defaultMaxCalculator } from '@/lib/calc';
import { computeExerciseSessions, computeExerciseStats } from '@/lib/exerciseSessions';
import type { AddWorkoutState } from '@/lib/hooks/useAddWorkoutState';
import { formatSeconds, isLoaded, parseSeconds, REPS_UNIT_OPTIONS, type SetUnit, unitDropdownOptions, WEIGHT_UNIT_OPTIONS } from '@/lib/setUnits';
import { formatNumber } from '@/lib/statsUtils';
import { resolveTimeRange } from '@/lib/timeRange';

interface ExerciseDetailV2Props {
    state: AddWorkoutState;
    muscleGroupColor: (id: string | undefined) => string | undefined;
    exerciseIndex: number;
}

const ALL_TIME = resolveTimeRange({ preset: 'all' });
const REPS_UNIT_ITEMS = unitDropdownOptions(REPS_UNIT_OPTIONS);
const WEIGHT_UNIT_ITEMS = unitDropdownOptions(WEIGHT_UNIT_OPTIONS);

// Content of the exercise-detail bottom sheet (see exerciseModalV2.tsx for the sheet chrome).
// Only mounted while its sheet is open, so its session/stats lookups don't run otherwise.
export default function ExerciseDetailV2({ state, muscleGroupColor, exerciseIndex }: ExerciseDetailV2Props) {
    const draft = state.exercises[exerciseIndex];
    const exerciseId = draft?.exerciseId;
    const metadata = state.exerciseMap.get(String(exerciseId));
    const summary = state.exerciseSummaries[exerciseIndex];
    const name = metadata?.name ?? draft?.name ?? `Exercise ${exerciseId}`;
    const dotColor = muscleGroupColor(metadata?.primaryMuscleGroup) ?? 'var(--muted)';

    // Which reps/weight box has keyboard focus — drives the per-column "fill below" chip.
    const [focusedField, setFocusedField] = useState<{ setIndex: number; field: 'reps' | 'weight' } | null>(null);
    // Raw text of the focused weight box: the draft stores numbers, and rendering the parsed
    // number back would eat the trailing "." while typing a decimal like 132.5.
    const [weightText, setWeightText] = useState('');
    // A duration is typed as "1:30" but held as 90, so the field needs its own text buffer while
    // focused — the same trick the weight field uses to allow a half-typed "13." .
    const [repsText, setRepsText] = useState('');

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

    // `draft` is guarded further down, but the units are needed by the memoised PR pass above it.
    const units = state.exerciseUnits(exerciseId ?? -1);
    const loaded = isLoaded(units);
    const timed = units.reps === 'time';

    // Historical best weight per exact rep count (work sets only) — same per-rep-count
    // semantics as the pipeline's PR pass (computePersonalRecords in apps/data), including its
    // refusal to rank anything but pounds: sessions on another basis are a different ladder.
    const repMaxes = useMemo(() => {
        const map = new Map<number, number>();
        for (const w of state.workouts) {
            for (const ex of w.exercises) {
                if (ex.exerciseId !== exerciseId || !isLoaded(ex.units)) continue;
                for (const s of ex.sets) {
                    if (!s.isWorkSet || !s.reps) continue;
                    const prev = map.get(s.reps);
                    if (prev === undefined || s.weight > prev) map.set(s.reps, s.weight);
                }
            }
        }
        return map;
    }, [state.workouts, exerciseId]);

    // A set gets the trophy iff it strictly beats the standing record for its exact rep count —
    // history first, then earlier draft sets that already raised it (so duplicates don't all flag).
    // Rep counts with no history never flag: a first-ever attempt isn't a meaningful record.
    const runningMax = new Map(repMaxes);
    const setIsPR = (draft?.sets ?? []).map((s) => {
        if (!loaded || !s.reps || !s.weight) return false;
        const prev = runningMax.get(s.reps);
        const isPR = prev !== undefined && s.weight > prev;
        if (isPR) runningMax.set(s.reps, s.weight);
        return isPR;
    });

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
                {loaded ? `${formatNumber(summary.workVolume)} lbs work volume · ` : ''}
                {draft.sets.length} sets
            </div>
            <div className="last-card">
                <span>
                    <span className="lc-lbl">Last</span>
                    <b>{lastText}</b>
                </span>
                <span>
                    <span className="lc-lbl">Working max</span>
                    <b>{workingMaxText}</b>
                </span>
            </div>
            <div className="sets-head">
                <span className="sets-lbl">Sets</span>
                <div className="unit-dd">
                    <DropdownV2
                        value={units.reps}
                        options={REPS_UNIT_ITEMS}
                        onChange={(v) => state.setExerciseUnit(draft.exerciseId, 'reps', v as SetUnit)}
                        ariaLabel="Unit for the first set column"
                    />
                </div>
                <div className="unit-dd">
                    <DropdownV2
                        value={units.weight}
                        options={WEIGHT_UNIT_ITEMS}
                        onChange={(v) => state.setExerciseUnit(draft.exerciseId, 'weight', v as SetUnit)}
                        ariaLabel="Unit for the second set column"
                        align="right"
                    />
                </div>
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
                                inputMode={timed ? 'text' : 'numeric'}
                                value={
                                    focusedField?.setIndex === si && focusedField.field === 'reps'
                                        ? repsText
                                        : timed
                                          ? s.reps
                                              ? formatSeconds(s.reps)
                                              : ''
                                          : s.reps || ''
                                }
                                placeholder={timed ? '0:00' : '0'}
                                onFocus={(e) => {
                                    e.target.select();
                                    setRepsText(s.reps ? (timed ? formatSeconds(s.reps) : String(s.reps)) : '');
                                    setFocusedField({ setIndex: si, field: 'reps' });
                                }}
                                onBlur={() => setFocusedField(null)}
                                onChange={(e) => {
                                    setRepsText(e.target.value);
                                    state.updateSetField(
                                        exerciseIndex,
                                        si,
                                        'reps',
                                        timed ? parseSeconds(e.target.value) : Number.parseFloat(e.target.value) || 0
                                    );
                                }}
                            />
                            <div className="num-box-wrap">
                                {/* A movement carrying no load has nothing to type here, but the cell stays to hold the grid column. */}
                                {units.weight === 'none' ? (
                                    <span className="num-box num-box-empty">—</span>
                                ) : (
                                    <input
                                        className="num-box"
                                        inputMode="decimal"
                                        value={focusedField?.setIndex === si && focusedField.field === 'weight' ? weightText : s.weight || ''}
                                        placeholder="0"
                                        onFocus={(e) => {
                                            e.target.select();
                                            setWeightText(s.weight ? String(s.weight) : '');
                                            setFocusedField({ setIndex: si, field: 'weight' });
                                        }}
                                        onBlur={() => setFocusedField(null)}
                                        onChange={(e) => {
                                            setWeightText(e.target.value);
                                            state.updateSetField(exerciseIndex, si, 'weight', Number.parseFloat(e.target.value) || 0);
                                        }}
                                    />
                                )}
                                {setIsPR[si] && (
                                    <span className="set-pr" title={`${s.reps}RM personal record`}>
                                        <span>{s.reps}RM</span>
                                        <span>🏆</span>
                                    </span>
                                )}
                            </div>
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
