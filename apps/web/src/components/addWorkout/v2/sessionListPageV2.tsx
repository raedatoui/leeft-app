'use client';

import { closestCenter, DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { AddWorkoutState } from '@/lib/hooks/useAddWorkoutState';

interface SessionListPageV2Props {
    state: AddWorkoutState;
    muscleGroupColor: (id: string | undefined) => string | undefined;
}

interface SortableExerciseRowProps {
    exerciseId: number;
    index: number;
    name: string;
    summaryText: string | undefined;
    dotColor: string;
    onOpen: () => void;
    onRemove: () => void;
}

function SortableExerciseRow({ exerciseId, index, name, summaryText, dotColor, onOpen, onRemove }: SortableExerciseRowProps) {
    const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: exerciseId });

    return (
        <div
            className={`ex-list-row${isDragging ? ' dragging' : ''}`}
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onOpen();
            }}
        >
            <button
                type="button"
                className="ex-drag"
                aria-label="Drag to reorder"
                onClick={(e) => e.stopPropagation()}
                onPointerDownCapture={(e) => {
                    // The list sits inside the SwipePager's motion.div (drag="x"), whose native
                    // pointerdown listener would pan the page during a reorder gesture. Stopping
                    // the event here (capture phase, so before it descends past the React root)
                    // keeps it from the pager — but that also kills React's bubble-phase dispatch,
                    // so dnd-kit's activator is invoked directly instead of spread as {...listeners}.
                    e.stopPropagation();
                    listeners?.onPointerDown?.(e);
                }}
            >
                <GripVertical />
            </button>
            <span className="ex-badge" style={{ background: dotColor }}>
                {String.fromCharCode(65 + index)}
            </span>
            <span>
                <span className="ex-list-name">{name}</span>
                <div className="ex-list-sub">{summaryText}</div>
            </span>
            <button
                type="button"
                className="ex-del"
                aria-label="Remove exercise"
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <title>Remove</title>
                    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
                </svg>
            </button>
        </div>
    );
}

// Rendered as the child of a SwipePager whose own motion.div already carries the ".page next-page" class.
export default function SessionListPageV2({ state, muscleGroupColor }: SessionListPageV2Props) {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

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

    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return;
        const from = state.exercises.findIndex((ex) => ex.exerciseId === active.id);
        const to = state.exercises.findIndex((ex) => ex.exerciseId === over.id);
        if (from >= 0 && to >= 0) state.moveExercise(from, to);
    };

    return (
        <>
            <div className="page-scroll">
                <div className="page-tag">
                    Session · {state.exercises.length} exercise{state.exercises.length === 1 ? '' : 's'}
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
                    {/* exerciseId is unique within a session (the picker filters out already-added exercises) */}
                    <SortableContext items={state.exercises.map((ex) => ex.exerciseId)} strategy={verticalListSortingStrategy}>
                        <div className="ex-list">
                            {state.exercises.map((ex, i) => {
                                const metadata = state.exerciseMap.get(String(ex.exerciseId));
                                return (
                                    <SortableExerciseRow
                                        key={ex.exerciseId}
                                        exerciseId={ex.exerciseId}
                                        index={i}
                                        name={metadata?.name ?? `Exercise ${ex.exerciseId}`}
                                        summaryText={state.exerciseSummaries[i]?.summaryText}
                                        dotColor={muscleGroupColor(metadata?.primaryMuscleGroup) ?? 'var(--muted)'}
                                        onOpen={() => state.openExerciseModal(i)}
                                        onRemove={() => state.requestRemoveExercise(i)}
                                    />
                                );
                            })}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>
            <div className="scroll-cta">
                <button type="button" className="btn-big" onClick={state.openPicker}>
                    + Add Exercise
                </button>
            </div>
        </>
    );
}
