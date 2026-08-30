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

// Long enough to swallow a burst of typing, short enough that the unsaved window never spans
// the gap between two sets.
const WRITE_DEBOUNCE_MS = 400;

interface StoredSession {
    phase: AddWorkoutPhase;
    date: string;
    readiness: ReadinessAnswers;
    startedAt: number | null;
    endedAt: number | null;
    rpe: number;
    durationMin?: number | null;
    exercises: DraftExercise[];
    pageIndex?: number;
    exerciseModalIndex?: number | null;
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
            (s.pageIndex == null || typeof s.pageIndex === 'number') &&
            (s.exerciseModalIndex == null || typeof s.exerciseModalIndex === 'number') &&
            Array.isArray(s.exercises);
        return valid ? (s as StoredSession) : null;
    } catch {
        return null;
    }
}

// The durable half of the /add flow's state, mounted once at the root so an in-progress
// session survives navigating away from /add and back. It also carries the two coordinates
// that say *where you were* — which pager page, which exercise sheet — because iOS kills a
// backgrounded standalone PWA and the resumed app cold-boots: without these, reopening
// mid-set drops you back on the collapsed exercise list. Genuinely momentary state (picker,
// toast, confirm dialogs, input focus) stays local to useAddWorkoutState and resets per visit.
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
    /** Which page of the live pager is showing: 0 = exercise list, 1 = finish page. */
    pageIndex: number;
    setPageIndex: React.Dispatch<React.SetStateAction<number>>;
    /** Index into `exercises` of the open exercise sheet, or null when closed. */
    exerciseModalIndex: number | null;
    setExerciseModalIndex: React.Dispatch<React.SetStateAction<number | null>>;
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
    const [pageIndex, setPageIndex] = useState(0);
    const [exerciseModalIndex, setExerciseModalIndex] = useState<number | null>(null);

    const hydrated = useRef(false);
    const prevPhase = useRef(phase);

    // Write-through on every change, debounced: iOS kills a suspended standalone PWA without
    // reliably firing pagehide/visibilitychange, so saving on lifecycle events alone would lose
    // data — but writing on every change means a synchronous stringify + setItem of the whole
    // draft per character typed into a rep field. The debounce collapses a burst of typing into
    // one write; three things close the window it opens: phase transitions (start / finish /
    // discard) write straight through, the lifecycle events are still listened for as a
    // best-effort flush, and nothing is lost anyway unless the app dies inside the delay.
    // A blank pre-session is stored as key absence. Declared before the hydration effect so the
    // mount pass (still-blank state) is skipped via the ref instead of briefly deleting a
    // stored session.
    useEffect(() => {
        if (!hydrated.current) return;
        const write = () => {
            try {
                if (phase === 'pre' && startedAt === null && exercises.length === 0) {
                    localStorage.removeItem(STORAGE_KEY);
                } else {
                    const session: StoredSession = {
                        phase,
                        date,
                        readiness,
                        startedAt,
                        endedAt,
                        rpe,
                        durationMin,
                        exercises,
                        pageIndex,
                        exerciseModalIndex,
                    };
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
                }
            } catch {
                // storage unavailable/full — the session just won't survive a reload
            }
        };

        let timer: ReturnType<typeof setTimeout> | null = null;
        if (phase !== prevPhase.current) {
            prevPhase.current = phase;
            write();
        } else {
            timer = setTimeout(write, WRITE_DEBOUNCE_MS);
        }

        window.addEventListener('pagehide', write);
        document.addEventListener('visibilitychange', write);
        return () => {
            if (timer) clearTimeout(timer);
            window.removeEventListener('pagehide', write);
            document.removeEventListener('visibilitychange', write);
        };
    }, [phase, date, readiness, startedAt, endedAt, rpe, durationMin, exercises, pageIndex, exerciseModalIndex]);

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
            // Clamp both coordinates against the restored exercise list rather than trusting
            // the blob: a hand-edited or half-written entry would otherwise land the pager on a
            // page that doesn't exist, or open a sheet onto a missing exercise.
            const maxPage = stored.exercises.length === 0 ? 0 : 1;
            setPageIndex(Math.max(0, Math.min(stored.pageIndex ?? 0, maxPage)));
            const modalIndex = stored.exerciseModalIndex;
            setExerciseModalIndex(modalIndex != null && modalIndex >= 0 && modalIndex < stored.exercises.length ? modalIndex : null);
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
        setPageIndex(0);
        setExerciseModalIndex(null);
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
                pageIndex,
                setPageIndex,
                exerciseModalIndex,
                setExerciseModalIndex,
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
