'use client';

import React, { useCallback, useState } from 'react';
import type { ReadinessAnswers } from '@/lib/addWorkoutConstants';
import type { DraftExercise, DraftSet } from '@/lib/addWorkoutFormat';

export type AddWorkoutPhase = 'pre' | 'live' | 'done';

export const todayUTC = () => new Date().toISOString().slice(0, 10);

// ---- dev seed --------------------------------------------------------------
// A ready-made in-progress session preloaded on app start for quick testing of
// the /add flow (list, detail, finish, save, summary) without hand-entering
// data. resetSession still clears back to blank; restore the blank initial
// states below to ship without the seed.
const seedSets = (reps: number[], weights: number[]): DraftSet[] =>
    reps.map((r, i) => ({ reps: r, weight: weights[i] ?? weights[0] ?? 0, isWorkSet: true, done: true }));

const SEED_DATE = '2026-07-12';
const SEED_STARTED_MINUTES_AGO = 119;
// question order: sleep, energy, motivation, stress, soreness
const SEED_READINESS: ReadinessAnswers = { sleep: 5, energy: 4, motivation: 5, stress: 5, soreness: 3 };
const SEED_EXERCISES: DraftExercise[] = [
    { exerciseId: 424, sets: seedSets([3, 3, 2, 5], [455, 465, 475, 415]) }, // Deadlift
    { exerciseId: 687821, sets: seedSets([3, 3, 1, 3], [130, 135, 145, 130]) }, // Overhead Press
    { exerciseId: 71, sets: seedSets([10, 10, 10], [135]) }, // Incline Bench Press
    { exerciseId: 6456851, sets: seedSets([12, 12, 12, 10, 10, 10], [30]) }, // Lateral Raise To Overhead
    { exerciseId: 689063, sets: seedSets([10, 10, 10], [170]) }, // T-Bar Row
    { exerciseId: 4583364, sets: seedSets([14, 14, 12], [130]) }, // Pec Deck Fly
];
// -----------------------------------------------------------------------------

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
    const [phase, setPhase] = useState<AddWorkoutPhase>('live');
    const [date, setDate] = useState(SEED_DATE);
    const [readiness, setReadiness] = useState<ReadinessAnswers>(SEED_READINESS);
    const [startedAt, setStartedAt] = useState<number | null>(() => Date.now() - SEED_STARTED_MINUTES_AGO * 60_000);
    const [endedAt, setEndedAt] = useState<number | null>(null);
    const [rpe, setRpe] = useState(5);
    const [exercises, setExercises] = useState<DraftExercise[]>(SEED_EXERCISES);

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
