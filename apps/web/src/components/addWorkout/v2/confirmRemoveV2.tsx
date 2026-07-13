'use client';

import type { AddWorkoutState } from '@/lib/hooks/useAddWorkoutState';

interface ConfirmRemoveV2Props {
    state: AddWorkoutState;
}

// Confirmation dialog for the exercise-list trash can. Plain overlay inside .phone-body
// (no Radix — its portals would escape the [data-theme="v2"] scope). The backdrop is a
// real button so tap-outside-to-cancel stays lint- and keyboard-clean.
export default function ConfirmRemoveV2({ state }: ConfirmRemoveV2Props) {
    if (state.confirmRemoveIndex === null) return null;

    const draft = state.exercises[state.confirmRemoveIndex];
    const name = state.exerciseMap.get(String(draft?.exerciseId))?.name ?? 'this exercise';

    return (
        <div className="confirm-overlay">
            <button type="button" className="confirm-backdrop" onClick={state.cancelRemoveExercise} aria-label="Cancel" tabIndex={-1} />
            <div className="confirm-card" role="alertdialog" aria-modal="true" aria-label="Remove exercise">
                <div className="confirm-title">Remove exercise?</div>
                <div className="confirm-text">
                    <b>{name}</b> and its sets will be removed from this session.
                </div>
                <div className="confirm-actions">
                    <button type="button" className="confirm-btn cancel" onClick={state.cancelRemoveExercise}>
                        Cancel
                    </button>
                    <button type="button" className="confirm-btn danger" onClick={state.confirmRemoveExercise}>
                        Remove
                    </button>
                </div>
            </div>
        </div>
    );
}
