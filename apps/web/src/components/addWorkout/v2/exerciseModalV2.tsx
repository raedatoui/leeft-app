'use client';

import { AnimatePresence, motion, type PanInfo, type Transition, useDragControls, useReducedMotion } from 'motion/react';
import ExerciseDetailV2 from '@/components/addWorkout/v2/exerciseDetailV2';
import SwipePager from '@/components/ui/v2/swipePager';
import type { AddWorkoutState } from '@/lib/hooks/useAddWorkoutState';

interface ExerciseModalV2Props {
    state: AddWorkoutState;
    muscleGroupColor: (id: string | undefined) => string | undefined;
}

/** Downward drag distance that dismisses the sheet on release. */
const DISMISS_DISTANCE = 90;
/** Downward flick velocity (px/s) that dismisses even under the distance threshold. */
const DISMISS_VELOCITY = 500;

const springTransition: Transition = { type: 'spring', stiffness: 420, damping: 40 };
const fadeTransition: Transition = { duration: 0.15 };

// Bottom sheet over the live view: springs up when an exercise is opened from the list, and
// slides back down on close or on a downward swipe of the grab handle. AnimatePresence keeps
// the content mounted through the exit so the sheet doesn't empty out mid-slide; only the
// scroll body scrolls, so the handle stays pinned under long set lists.
export default function ExerciseModalV2({ state, muscleGroupColor }: ExerciseModalV2Props) {
    const reducedMotion = useReducedMotion();
    const dragControls = useDragControls();

    const handleDragEnd = (_: unknown, info: PanInfo) => {
        if (info.offset.y > DISMISS_DISTANCE || (info.offset.y > 0 && info.velocity.y > DISMISS_VELOCITY)) {
            state.closeExerciseModal();
        }
    };

    return (
        <AnimatePresence>
            {state.exerciseModalIndex !== null && (
                <motion.div
                    className="exercise-modal"
                    initial={reducedMotion ? { opacity: 0 } : { y: '102%' }}
                    animate={reducedMotion ? { opacity: 1 } : { y: 0 }}
                    exit={reducedMotion ? { opacity: 0 } : { y: '102%' }}
                    transition={reducedMotion ? fadeTransition : springTransition}
                    drag={reducedMotion ? false : 'y'}
                    // only the grab handle starts a drag, so the scroll body keeps native touch scrolling
                    dragListener={false}
                    dragControls={dragControls}
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={{ top: 0.04, bottom: 0.65 }}
                    onDragEnd={handleDragEnd}
                >
                    <div className="sheet-grabber" onPointerDown={(e) => dragControls.start(e)} aria-hidden="true" />
                    {/* horizontal swipes page through the exercises; off either end the pager's
                        handlers close the sheet (see exerciseModalPrev/Next), and the sheet's own
                        exit animation carries that out */}
                    <SwipePager
                        pageKey={state.exerciseModalIndex}
                        onPrev={state.exerciseModalPrev}
                        onNext={state.exerciseModalNext}
                        className="exercise-modal-scroll"
                    >
                        <ExerciseDetailV2 state={state} muscleGroupColor={muscleGroupColor} exerciseIndex={state.exerciseModalIndex} />
                    </SwipePager>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
