'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import AppBarV2 from '@/components/addWorkout/v2/appBarV2';
import ConfirmRemoveV2 from '@/components/addWorkout/v2/confirmRemoveV2';
import DoneViewV2 from '@/components/addWorkout/v2/doneViewV2';
import ExerciseModalV2 from '@/components/addWorkout/v2/exerciseModalV2';
import ExercisePickerV2 from '@/components/addWorkout/v2/exercisePickerV2';
import LiveViewV2 from '@/components/addWorkout/v2/liveViewV2';
import ReadinessViewV2 from '@/components/addWorkout/v2/readinessViewV2';
import SummaryViewV2 from '@/components/addWorkout/v2/summaryViewV2';
import ToastV2 from '@/components/addWorkout/v2/toastV2';
import { fadeTransition, fadeVariants, slideTransition, slideVariants } from '@/components/ui/v2/swipePager';
import { useWorkoutData } from '@/lib/contexts';
import { type AddWorkoutPhase, useAddWorkoutState } from '@/lib/hooks/useAddWorkoutState';
import { useMuscleGroupColor } from '@/lib/hooks/useMuscleGroupColor';

const PHASE_ORDER: Record<AddWorkoutPhase, number> = { pre: 0, live: 1, done: 2 };

// Self-contained mobile session-logging flow — intentionally bypasses PageTemplateV2/HeaderV2:
// it owns its own app-bar and bottom pager-nav rather than the site's chrome.
export default function AddWorkoutPageV2() {
    const state = useAddWorkoutState();
    const { muscleGroups } = useWorkoutData();
    const muscleGroupColor = useMuscleGroupColor(muscleGroups);
    const reducedMotion = useReducedMotion();

    // Phase changes slide like page turns, direction from the phase delta — same
    // "adjusting state during render" pattern as SwipePager, whose motion this reuses.
    const phaseIndex = PHASE_ORDER[state.phase];
    const [prevPhaseIndex, setPrevPhaseIndex] = useState(phaseIndex);
    const [direction, setDirection] = useState(1);
    if (phaseIndex !== prevPhaseIndex) {
        setDirection(phaseIndex > prevPhaseIndex ? 1 : -1);
        setPrevPhaseIndex(phaseIndex);
    }

    return (
        <div className="stage">
            <div className="stage-caption">live session flow · saves to firestore</div>
            <div className={`phone${state.pickerOpen ? ' picker-open' : ''}`} data-phase={state.phase}>
                <AppBarV2 phase={state.phase} startedAt={state.startedAt} date={state.date} onDateChange={state.setDate} />
                <div className="phone-body">
                    <AnimatePresence initial={false} custom={direction} mode="popLayout">
                        <motion.div
                            key={state.phase}
                            className="phase-slide"
                            custom={direction}
                            variants={reducedMotion ? fadeVariants : slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={reducedMotion ? fadeTransition : slideTransition}
                        >
                            {state.phase === 'pre' && <ReadinessViewV2 state={state} />}
                            {state.phase === 'live' && <LiveViewV2 state={state} muscleGroupColor={muscleGroupColor} />}
                            {state.phase === 'done' && <DoneViewV2 state={state} />}
                        </motion.div>
                    </AnimatePresence>
                    <ExercisePickerV2 state={state} muscleGroupColor={muscleGroupColor} />
                    <ExerciseModalV2 state={state} muscleGroupColor={muscleGroupColor} />
                    <ConfirmRemoveV2 state={state} />
                    <ToastV2 message={state.toastMessage} />
                </div>
                {/* direct child of .phone (not .phone-body) so it covers the app-bar too */}
                <SummaryViewV2 state={state} />
            </div>
        </div>
    );
}
