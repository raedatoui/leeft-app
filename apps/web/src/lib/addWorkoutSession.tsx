'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ReadinessAnswers } from '@/lib/addWorkoutConstants';
import type { DraftExercise } from '@/lib/addWorkoutFormat';

export type AddWorkoutPhase = 'pre' | 'live' | 'done';

export const todayUTC = () => new Date().toISOString().slice(0, 10);

// Only bump the version suffix for a shape change that genuinely can't be read forward —
// a bump orphans every in-progress session on every device, so additive fields must widen
// the check below instead. durationMin was added this way: absent in v1 blobs, read as null.
const STORAGE_KEY = 'leeft-add-workout-session-v1';

interface StoredSession {
    phase: AddWorkoutPhase;
    date: string;
    readiness: ReadinessAnswers;
    startedAt: number | null;
    endedAt: number | null;
    rpe: number;
    durationMin?: number | null;
    exercises: DraftExercise[];
}

function loadStoredSession(): StoredSession | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const s = JSON.parse(raw);
        const valid =
            (s.phase === 'pre' || s.phase === 'live' || s.phase === 'done') &&
            typeof s.date === 'string' &&
            typeof s.readiness === 'object' &&
            s.readiness !== null &&
            (s.startedAt === null || typeof s.startedAt === 'number') &&
            (s.endedAt === null || typeof s.endedAt === 'number') &&
            typeof s.rpe === 'number' &&
            (s.durationMin == null || typeof s.durationMin === 'number') &&
            Array.isArray(s.exercises);
        return valid ? (s as StoredSession) : null;
    } catch {
        return null;
    }
}


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
    /** Manual duration override in minutes from the done page; null = derive from the timer. */
    durationMin: number | null;
    setDurationMin: React.Dispatch<React.SetStateAction<number | null>>;
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
    const [durationMin, setDurationMin] = useState<number | null>(null);
    const [exercises, setExercises] = useState<DraftExercise[]>([]);

    const hydrated = useRef(false);

    // Write-through on every change: iOS kills a suspended standalone PWA without reliably
    // firing pagehide/visibilitychange, so saving on lifecycle events would lose data.
    // A blank pre-session is stored as key absence. Declared before the hydration effect
    // so the mount pass (still-blank state) is skipped via the ref instead of briefly
    // deleting a stored session.
    useEffect(() => {
        if (!hydrated.current) return;
        try {
            if (phase === 'pre' && startedAt === null && exercises.length === 0) {
                localStorage.removeItem(STORAGE_KEY);
            } else {
                const session: StoredSession = { phase, date, readiness, startedAt, endedAt, rpe, durationMin, exercises };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
            }
        } catch {
            // storage unavailable/full — the session just won't survive a reload
        }
    }, [phase, date, readiness, startedAt, endedAt, rpe, durationMin, exercises]);

    // Hydrate after mount, not in the useState initializers: the static export prerenders
    // the blank state, and reading storage during the first render would mismatch the
    // prerendered HTML.
    useEffect(() => {
        const stored = loadStoredSession();
        if (stored) {
            setPhase(stored.phase);
            setDate(stored.date);
            setReadiness(stored.readiness);
            setStartedAt(stored.startedAt);
            setEndedAt(stored.endedAt);
            setRpe(stored.rpe);
            setDurationMin(stored.durationMin ?? null);
            setExercises(stored.exercises);
        }
        hydrated.current = true;
    }, []);

    const resetSession = useCallback(() => {
        setPhase('pre');
        setDate(todayUTC());
        setReadiness({});
        setStartedAt(null);
        setEndedAt(null);
        setRpe(5);
        setDurationMin(null);
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
                durationMin,
                setDurationMin,
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
