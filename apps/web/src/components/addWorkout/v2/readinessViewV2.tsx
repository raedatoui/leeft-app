'use client';

import SwipePager from '@/components/ui/v2/swipePager';
import { READINESS_QUESTIONS, SCALE_COLORS } from '@/lib/addWorkoutConstants';
import type { AddWorkoutState } from '@/lib/hooks/useAddWorkoutState';

interface ReadinessViewV2Props {
    state: AddWorkoutState;
}

export default function ReadinessViewV2({ state }: ReadinessViewV2Props) {
    const alreadyStarted = state.startedAt !== null;
    const surveyComplete = READINESS_QUESTIONS.every((q) => state.readiness[q.key] !== undefined);
    const canStart = alreadyStarted || surveyComplete;

    return (
        <div className="view">
            <div className="pre-scroll-wrap">
                <SwipePager pageKey={0} onNext={state.startWorkout} disabled={{ prev: true, next: !canStart }} className="scroll pre">
                    <div className="page-scroll">
                        <div className="readiness-sub">Readiness survey</div>
                        <div>
                            {READINESS_QUESTIONS.map((q) => (
                                <div className="q" key={q.key}>
                                    <div className="q-label">{q.label}</div>
                                    <div className="q-scale">
                                        {[1, 2, 3, 4, 5].map((v) => {
                                            const on = state.readiness[q.key] === v;
                                            return (
                                                <button
                                                    type="button"
                                                    key={v}
                                                    className={on ? 'on' : ''}
                                                    style={on ? { background: SCALE_COLORS[v - 1] } : undefined}
                                                    onClick={() => state.setReadinessAnswer(q.key, v)}
                                                >
                                                    {v}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="q-ends">
                                        <span>{q.lo}</span>
                                        <span>{q.hi}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="scroll-cta">
                        <button type="button" className="btn-big" onClick={state.startWorkout} disabled={!canStart}>
                            {alreadyStarted ? 'Resume Workout' : 'Start Workout'}
                        </button>
                    </div>
                </SwipePager>
            </div>
            <div className="pager-nav">
                <button type="button" className="chev" disabled aria-label="Nothing before check-in">
                    ‹
                </button>
                <div className="dots">
                    <button type="button" className="dot on" aria-label="check-in" />
                </div>
                <button type="button" className="chev" onClick={state.startWorkout} disabled={!canStart} aria-label="Continue to workout">
                    ›
                </button>
            </div>
        </div>
    );
}
