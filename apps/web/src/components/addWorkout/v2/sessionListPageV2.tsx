'use client';

import type { AddWorkoutState } from '@/lib/hooks/useAddWorkoutState';

interface SessionListPageV2Props {
    state: AddWorkoutState;
    muscleGroupColor: (id: string | undefined) => string | undefined;
}

// Rendered as the child of a SwipePager whose own motion.div already carries the ".page next-page" class.
export default function SessionListPageV2({ state, muscleGroupColor }: SessionListPageV2Props) {
    if (state.exercises.length === 0) {
        return (
            <>
                <div className="big-q">
                    Let&rsquo;s <b>go</b>
                </div>
                <button type="button" className="btn-big" onClick={state.openPicker}>
                    + Add Exercise
                </button>
            </>
        );
    }

    return (
        <>
            <div className="page-scroll">
                <div className="page-tag">
                    Session · {state.exercises.length} exercise{state.exercises.length === 1 ? '' : 's'}
                </div>
                <div className="ex-list">
                    {state.exercises.map((ex, i) => {
                        const metadata = state.exerciseMap.get(String(ex.exerciseId));
                        const dotColor = muscleGroupColor(metadata?.primaryMuscleGroup) ?? 'var(--muted)';
                        return (
                            <div
                                className="ex-list-row"
                                // biome-ignore lint/suspicious/noArrayIndexKey: rows only ever removed, never reordered
                                key={i}
                                role="button"
                                tabIndex={0}
                                onClick={() => state.openExerciseModal(i)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') state.openExerciseModal(i);
                                }}
                            >
                                <span className="ex-badge" style={{ background: dotColor }}>
                                    {String.fromCharCode(65 + i)}
                                </span>
                                <span>
                                    <span className="ex-list-name">{metadata?.name ?? `Exercise ${ex.exerciseId}`}</span>
                                    <div className="ex-list-sub">{state.exerciseSummaries[i]?.summaryText}</div>
                                </span>
                                <button
                                    type="button"
                                    className="ex-del"
                                    aria-label="Remove exercise"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        state.requestRemoveExercise(i);
                                    }}
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                        <title>Remove</title>
                                        <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
                                    </svg>
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="scroll-cta">
                <button type="button" className="btn-big" onClick={state.openPicker}>
                    + Add Exercise
                </button>
            </div>
        </>
    );
}
