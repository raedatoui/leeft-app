'use client';

import type { AddWorkoutState } from '@/lib/hooks/useAddWorkoutState';

interface FinishPageV2Props {
    state: AddWorkoutState;
}

// Rendered as the child of a SwipePager whose own motion.div already carries the ".page next-page" class.
// Reached by swiping past the exercise list — kept off that page so "Done Working Out" isn't
// competing for space with a potentially long list, and isn't stuck pinned to the bottom of it.
export default function FinishPageV2({ state }: FinishPageV2Props) {
    return (
        <>
            <button type="button" className="btn-big green" onClick={state.finishWorkout}>
                Done Working Out
            </button>
            <div className="actions-divider">
                <span>or</span>
            </div>
            <div className="add-more">
                <span className="add-more-q">Want to add more?</span>
                <button type="button" className="add-more-link" onClick={state.openPicker}>
                    Add Exercise
                </button>
            </div>
        </>
    );
}
