'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { AddWorkoutState } from '@/lib/hooks/useAddWorkoutState';

interface ExercisePickerV2Props {
    state: AddWorkoutState;
    muscleGroupColor: (id: string | undefined) => string | undefined;
}

export default function ExercisePickerV2({ state, muscleGroupColor }: ExercisePickerV2Props) {
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!state.pickerOpen) return;
        // matches the slide-in transition duration so focus lands after the sheet is visible
        const id = setTimeout(() => searchRef.current?.focus(), 260);
        return () => clearTimeout(id);
    }, [state.pickerOpen]);

    return (
        <div className="picker">
            <div className="picker-head">
                <div className="picker-top">
                    <span className="picker-title">Pick an exercise</span>
                    <button type="button" className="ctl-circle ex-close" onClick={state.closePicker} aria-label="Close picker">
                        <ChevronDown size={18} />
                    </button>
                </div>
                <input
                    ref={searchRef}
                    className="sheet-search"
                    placeholder="Search exercises…"
                    value={state.pickerQuery}
                    onChange={(e) => state.setPickerQuery(e.target.value)}
                />
            </div>
            <div className="sheet-list">
                {state.pickerExercises.length === 0 ? (
                    // /add renders before the exercise dataset arrives (see providers.tsx), so an
                    // empty list can mean "still loading" rather than "nothing matched".
                    <div className="empty-note">{state.exerciseMap.size === 0 ? 'loading exercises…' : 'no match'}</div>
                ) : (
                    state.pickerExercises.map((ex) => {
                        const dotColor = muscleGroupColor(ex.primaryMuscleGroup) ?? 'var(--muted)';
                        const sub = `${ex.primaryMuscleGroup} · ${ex.equipment[0] ?? ex.category}`;
                        const count = state.exerciseSetCounts.get(ex.id) ?? 0;
                        return (
                            <button type="button" className="pick-row" key={ex.id} onClick={() => state.addExercise(ex.id)}>
                                <span className="ex-dot" style={{ width: 10, height: 10, background: dotColor }} />
                                <span>
                                    <div className="pick-name">{ex.name}</div>
                                    <div className="pick-sub">{sub}</div>
                                </span>
                                <span className="pick-count">×{count}</span>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
