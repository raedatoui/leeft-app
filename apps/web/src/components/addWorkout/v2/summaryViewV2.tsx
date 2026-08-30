'use client';

import { Check, CircleCheck, Clock, Copy, Droplets, Gauge, Trophy, Weight, X } from 'lucide-react';
import { AnimatePresence, motion, type Transition, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { RPE_COLORS, SCALE_COLORS } from '@/lib/addWorkoutConstants';
import type { AddWorkoutState, SessionSummary } from '@/lib/hooks/useAddWorkoutState';
import { formatNumber } from '@/lib/statsUtils';

interface SummaryViewV2Props {
    state: AddWorkoutState;
}

const riseTransition: Transition = { type: 'spring', stiffness: 420, damping: 40 };
const fadeTransition: Transition = { duration: 0.15 };

function summaryText(s: SessionSummary): string {
    const lines = [
        `🏋️ LEEFT — ${s.date}`,
        `${formatNumber(s.volume)} lb · ${s.exerciseCount} exercises · ${s.setCount} sets · ${s.repCount} reps`,
        `${s.minutes} min · intensity ${s.rpe}/10${s.readinessAvg !== null ? ` · readiness ${s.readinessAvg.toFixed(1)}/5` : ''}`,
        ...s.records.map((r) => `🏆 ${r.reps}RM ${r.name} — ${r.weight} lb`),
    ];
    return lines.join('\n');
}

// Full-phone overlay shown after saving: the shareable-card style recap of the session
// snapshot captured by saveSession (the draft itself is already reset underneath it).
export default function SummaryViewV2({ state }: SummaryViewV2Props) {
    const reducedMotion = useReducedMotion();
    const [copied, setCopied] = useState(false);
    const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(
        () => () => {
            if (copyTimer.current) clearTimeout(copyTimer.current);
        },
        []
    );

    const s = state.summary;

    const copySummary = () => {
        if (!s) return;
        navigator.clipboard?.writeText(summaryText(s));
        setCopied(true);
        if (copyTimer.current) clearTimeout(copyTimer.current);
        copyTimer.current = setTimeout(() => setCopied(false), 1600);
    };

    return (
        <AnimatePresence>
            {s && (
                <motion.div
                    className="summary"
                    initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 28 }}
                    animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 28 }}
                    transition={reducedMotion ? fadeTransition : riseTransition}
                >
                    <div className="sum-top">
                        <button
                            type="button"
                            className={`sum-copy${copied ? ' copied' : ''}`}
                            onClick={copySummary}
                            aria-label="Copy session summary"
                        >
                            {copied ? <Check /> : <Copy />}
                        </button>
                        <div className="sum-date">{s.date}</div>
                        <button type="button" className="sum-close" onClick={state.dismissSummary} aria-label="Close summary">
                            <X size={22} />
                        </button>
                    </div>
                    <div className="sum-scroll">
                        <div className="sum-hero">
                            <span className="sum-hero-icon">
                                <Weight strokeWidth={2.2} />
                            </span>
                            <span className="sum-hero-num">
                                {formatNumber(s.volume)}
                                <span className="lb">LB</span>
                            </span>
                        </div>
                        <div className="sum-stats">
                            <div>
                                <div className="sum-label">Exercises</div>
                                <div className="sum-val">{s.exerciseCount}</div>
                            </div>
                            <div>
                                <div className="sum-label">Sets</div>
                                <div className="sum-val">{s.setCount}</div>
                            </div>
                            <div>
                                <div className="sum-label">Reps</div>
                                <div className="sum-val">{s.repCount}</div>
                            </div>
                        </div>
                        <div className="sum-badges">
                            <div className="sum-badge">
                                <CircleCheck style={{ color: 'var(--strength)' }} />
                                <div className="sum-label">Completed</div>
                                <div className="sum-val">
                                    {s.completedExercises}
                                    <span className="den">/{s.exerciseCount}</span>
                                </div>
                            </div>
                            <div className="sum-badge">
                                <Droplets
                                    style={{ color: s.readinessAvg !== null ? SCALE_COLORS[Math.round(s.readinessAvg) - 1] : 'var(--muted)' }}
                                />
                                <div className="sum-label">Readiness</div>
                                <div className="sum-val">
                                    {s.readinessAvg !== null ? (
                                        <>
                                            {s.readinessAvg.toFixed(1)}
                                            <span className="den">/5</span>
                                        </>
                                    ) : (
                                        '–'
                                    )}
                                </div>
                            </div>
                            <div className="sum-badge">
                                <Clock style={{ color: 'var(--fg)' }} />
                                <div className="sum-label">Minutes</div>
                                <div className="sum-val">{s.minutes}</div>
                            </div>
                            <div className="sum-badge">
                                <Gauge style={{ color: RPE_COLORS[s.rpe - 1] }} />
                                <div className="sum-label">Intensity</div>
                                <div className="sum-val">
                                    {s.rpe}
                                    <span className="den">/10</span>
                                </div>
                            </div>
                        </div>
                        {s.records.length > 0 && (
                            <div className="sum-prs">
                                <div className="sum-prs-title">
                                    {s.records.length} personal record{s.records.length === 1 ? '' : 's'}
                                </div>
                                <div className="sum-prs-grid">
                                    {s.records.map((r) => (
                                        <div className="sum-pr" key={`${r.name}:${r.reps}`}>
                                            <Trophy />
                                            <span>
                                                <div className="sum-pr-w">
                                                    {formatNumber(r.weight)}
                                                    <span className="lb">LB</span>
                                                </div>
                                                <div className="sum-pr-name">
                                                    {r.reps}RM {r.name}
                                                </div>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="sum-cta">
                        <button type="button" className="btn-big" onClick={state.dismissSummary}>
                            Done
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
