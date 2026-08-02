'use client';

import type { AddWorkoutState } from '@/lib/hooks/useAddWorkoutState';

// Confirmation dialog for the app-bar ✕. Same plain-overlay pattern as confirmRemoveV2
// (no Radix — its portals would escape the [data-theme="v2"] scope).
export default function ConfirmCancelV2({ state }: { state: AddWorkoutState }) {
    if (!state.confirmCancelOpen) return null;

    const exerciseCount = state.exercises.length;
    const setCount = state.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

    return (
        <div className="confirm-overlay">
            <button type="button" className="confirm-backdrop" onClick={state.dismissCancelSession} aria-label="Keep going" tabIndex={-1} />
            <div className="confirm-card" role="alertdialog" aria-modal="true" aria-label="Discard workout">
                <div className="confirm-title">Discard workout?</div>
                <div className="confirm-text">
                    <b>
                        {exerciseCount} {exerciseCount === 1 ? 'exercise' : 'exercises'}
                    </b>{' '}
                    and{' '}
                    <b>
                        {setCount} {setCount === 1 ? 'set' : 'sets'}
                    </b>{' '}
                    will be thrown away. This can&apos;t be undone.
                </div>
                <div className="confirm-actions">
                    <button type="button" className="confirm-btn cancel" onClick={state.dismissCancelSession}>
                        Keep going
                    </button>
                    <button type="button" className="confirm-btn danger" onClick={state.confirmCancelSession}>
                        Discard
                    </button>
                </div>
            </div>
        </div>
    );
}
