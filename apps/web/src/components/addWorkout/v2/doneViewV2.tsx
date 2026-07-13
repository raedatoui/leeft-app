'use client';

import { RPE_COLORS, RPE_WORDS } from '@/lib/addWorkoutConstants';
import { fmtClock } from '@/lib/addWorkoutFormat';
import type { AddWorkoutState } from '@/lib/hooks/useAddWorkoutState';
import { formatNumber } from '@/lib/statsUtils';

interface DoneViewV2Props {
    state: AddWorkoutState;
}

export default function DoneViewV2({ state }: DoneViewV2Props) {
    const elapsed = state.startedAt !== null && state.endedAt !== null ? state.endedAt - state.startedAt : 0;

    return (
        <div className="view">
            <div className="scroll done">
                <div className="done-time-label">Session time</div>
                <div className="done-time">{fmtClock(elapsed)}</div>
                <div className="done-sub">
                    {state.exercises.length} exercises · VOL <b>{formatNumber(state.totals.volume)}</b> · WORK{' '}
                    <b>{formatNumber(state.totals.workVolume)}</b> lbs
                </div>

                <div className="rpe-block">
                    <div className="rpe-q">How hard was that session?</div>
                    <div className="rpe-readout">
                        <span className="rpe-num" style={{ color: RPE_COLORS[state.rpe - 1] }}>
                            {state.rpe}
                        </span>
                        <span className="rpe-word">{RPE_WORDS[state.rpe]}</span>
                    </div>
                    <input
                        type="range"
                        className="rpe-slider"
                        min={1}
                        max={10}
                        step={1}
                        value={state.rpe}
                        onChange={(e) => state.setRpe(Number(e.target.value))}
                    />
                    <div className="rpe-ends">
                        <span>1 · easy</span>
                        <span>10 · max effort</span>
                    </div>
                </div>

                <div className="done-actions">
                    <button type="button" className="btn-big green" onClick={state.saveSession}>
                        Save Session
                    </button>
                </div>
            </div>
            <div className="pager-nav">
                <button type="button" className="chev" onClick={state.backToWorkout} aria-label="Back to workout">
                    ‹
                </button>
                <div className="dots">
                    <button type="button" className="dot on" aria-label="save session" />
                </div>
                <button type="button" className="chev" disabled aria-label="Nothing after save">
                    ›
                </button>
            </div>
        </div>
    );
}
