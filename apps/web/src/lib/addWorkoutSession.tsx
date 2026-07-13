'use client';

import React, { useCallback, useState } from 'react';
import type { ReadinessAnswers } from '@/lib/addWorkoutConstants';
import type { DraftExercise } from '@/lib/addWorkoutFormat';

export type AddWorkoutPhase = 'pre' | 'live' | 'done';

export const todayUTC = () => new Date().toISOString().slice(0, 10);

// The durable half of the /add flow's state, mounted once at the root so an in-progress
// session survives navigating away from /add and back. UI-transient state (pager position,
// open sheets, toast) stays local to useAddWorkoutState and resets per visit.
interface AddWorkoutSessionContextType {
    phase: AddWorkoutPhase;
    setPhase: React.Dispatch<React.SetStateAction<AddWorkoutPhase>>;
    date: string;
    setDate: React.Dispatch<React.SetStateAction<string>>;
    readiness: ReadinessAnswers;
    setReadiness: React.Dispatch<React.SetStateAction<ReadinessAnswers>>;
    startedAt: number | null;
    setStartedAt: React.Dispatch<React.SetStateAction<number | null>>;
    endedAt: number | null;
    setEndedAt: React.Dispatch<React.SetStateAction<number | null>>;
    rpe: number;
    setRpe: React.Dispatch<React.SetStateAction<number>>;
    exercises: DraftExercise[];
    setExercises: React.Dispatch<React.SetStateAction<DraftExercise[]>>;
    /** Back to a blank pre-session; called after saving so the nav timer clears. */
    resetSession: () => void;
}

const AddWorkoutSessionContext = React.createContext<AddWorkoutSessionContextType | null>(null);

export function AddWorkoutSessionProvider({ children }: { children: React.ReactNode }) {
    const [phase, setPhase] = useState<AddWorkoutPhase>('pre');
    const [date, setDate] = useState(todayUTC);
    const [readiness, setReadiness] = useState<ReadinessAnswers>({});
    const [startedAt, setStartedAt] = useState<number | null>(null);
    const [endedAt, setEndedAt] = useState<number | null>(null);
    const [rpe, setRpe] = useState(5);
    const [exercises, setExercises] = useState<DraftExercise[]>([]);

    const resetSession = useCallback(() => {
        setPhase('pre');
        setDate(todayUTC());
        setReadiness({});
        setStartedAt(null);
        setEndedAt(null);
        setRpe(5);
        setExercises([]);
    }, []);

    return (
        <AddWorkoutSessionContext.Provider
            value={{
                phase,
                setPhase,
                date,
                setDate,
                readiness,
                setReadiness,
                startedAt,
                setStartedAt,
                endedAt,
                setEndedAt,
                rpe,
                setRpe,
                exercises,
                setExercises,
                resetSession,
            }}
        >
            {children}
        </AddWorkoutSessionContext.Provider>
    );
}

export function useAddWorkoutSession(): AddWorkoutSessionContextType {
    const context = React.useContext(AddWorkoutSessionContext);
    if (!context) {
        throw new Error('useAddWorkoutSession must be used within an AddWorkoutSessionProvider');
    }
    return context;
}
