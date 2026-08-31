'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReadinessAnswers } from '@/lib/addWorkoutConstants';
import { type DraftExercise, type DraftSet, exerciseSummary, exerciseVolume, sessionRecords, unitsOf } from '@/lib/addWorkoutFormat';
import { type AddWorkoutPhase, useAddWorkoutSession } from '@/lib/addWorkoutSession';
import { useWorkoutData } from '@/lib/contexts';
import { saveErrorMessage, saveLiftingWorkout } from '@/lib/firebase';
import { type ColumnUnits, DEFAULT_COLUMN_UNITS, type SetUnit } from '@/lib/setUnits';
import type { ExerciseMap, ExerciseMetadata, Workout } from '@/types';

export type { DraftExercise, DraftSet, AddWorkoutPhase };

export interface ExerciseSummary {
    exerciseId: number;
    volume: number;
    workVolume: number;
    summaryText: string;
}

export interface SessionSummaryRecord {
    reps: number;
    weight: number;
    name: string;
}

/** Snapshot of the just-saved session for the post-save summary screen — captured in
 *  saveSession before resetSession clears the draft it's derived from. */
export interface SessionSummary {
    date: string;
    volume: number;
    exerciseCount: number;
    setCount: number;
    repCount: number;
    /** Exercises whose sets are all checked off (of exerciseCount). */
    completedExercises: number;
    /** Average of the answered readiness questions (1-5), or null if none answered. */
    readinessAvg: number | null;
    minutes: number;
    rpe: number;
    records: SessionSummaryRecord[];
}

export interface AddWorkoutState {
    phase: AddWorkoutPhase;
    date: string;
    setDate: (val: string) => void;
    readiness: ReadinessAnswers;
    setReadinessAnswer: (key: keyof ReadinessAnswers, value: number) => void;
    startedAt: number | null;
    endedAt: number | null;
    rpe: number;
    setRpe: (val: number) => void;
    /** Manual duration override in minutes from the done page; null = derive from the timer. */
    durationMin: number | null;
    setDurationMin: (val: number | null) => void;

    exercises: DraftExercise[];
    exerciseSummaries: ExerciseSummary[];
    totals: { volume: number; workVolume: number };
    exerciseMap: ExerciseMap;
    workouts: Workout[];

    pageIndex: number;
    pageCount: number;
    goToPage: (index: number) => void;
    pagerPrev: () => void;
    pagerNext: () => void;

    /** Index into `exercises` of the exercise shown in the detail sheet, or null when closed.
     *  Exercise detail is a bottom sheet over the live view, not a page in its pager. */
    exerciseModalIndex: number | null;
    openExerciseModal: (index: number) => void;
    closeExerciseModal: () => void;
    /** Walk the detail sheet to the previous/next exercise; off either end it closes the sheet
     *  (backwards onto the exercise list, forwards onto the finish page). */
    exerciseModalPrev: () => void;
    exerciseModalNext: () => void;

    pickerOpen: boolean;
    pickerQuery: string;
    setPickerQuery: (val: string) => void;
    pickerExercises: ExerciseMetadata[];
    exerciseSetCounts: Map<number, number>;
    openPicker: () => void;
    closePicker: () => void;

    toastMessage: string | null;

    /** Post-save summary snapshot, or null when the summary screen is closed. */
    summary: SessionSummary | null;
    dismissSummary: () => void;

    startWorkout: () => void;
    addExercise: (exerciseId: number) => void;
    moveExercise: (fromIndex: number, toIndex: number) => void;
    /** Index into `exercises` of the exercise pending delete confirmation, or null when no dialog is up. */
    confirmRemoveIndex: number | null;
    requestRemoveExercise: (index: number) => void;
    cancelRemoveExercise: () => void;
    confirmRemoveExercise: () => void;
    addSet: (exerciseIndex: number) => void;
    removeSet: (exerciseIndex: number) => void;
    updateSetField: (exerciseIndex: number, setIndex: number, field: 'reps' | 'weight', value: number) => void;
    fillDownSetField: (exerciseIndex: number, setIndex: number, field: 'reps' | 'weight') => void;
    /** The units the two set columns are keeping for an exercise. Stored on the draft, so it
     *  survives a reload and reaches the Firestore payload. */
    exerciseUnits: (exerciseId: number) => ColumnUnits;
    setExerciseUnit: (exerciseId: number, column: keyof ColumnUnits, unit: SetUnit) => void;
    toggleSetDone: (exerciseIndex: number, setIndex: number) => void;
    toggleAllSetsDone: (exerciseIndex: number) => void;
    finishWorkout: () => void;
    backToWorkout: () => void;
    /** True while the discard-session dialog is up (opened by the app-bar ✕). */
    confirmCancelOpen: boolean;
    requestCancelSession: () => void;
    dismissCancelSession: () => void;
    confirmCancelSession: () => void;
    saveSession: () => Promise<void>;
    /** True while the Firestore write is in flight — disables the Save button. */
    saving: boolean;
}

export function useAddWorkoutState(): AddWorkoutState {
    const { exerciseMap, workouts } = useWorkoutData();

    // Session data — plus the pager/sheet coordinates — lives in AddWorkoutSessionContext
    // (mounted at the root, written through to localStorage) so both the draft and the spot
    // you were on survive navigating away from /add and the cold boot iOS forces on a
    // backgrounded PWA. Only the momentary state below is local to this mount.
    const {
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
    } = useAddWorkoutSession();
    const [confirmRemoveIndex, setConfirmRemoveIndex] = useState<number | null>(null);
    const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerQuery, setPickerQuery] = useState('');
    const [summary, setSummary] = useState<SessionSummary | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(
        () => () => {
            if (toastTimer.current) clearTimeout(toastTimer.current);
        },
        []
    );

    const setReadinessAnswer = (key: keyof ReadinessAnswers, value: number) => setReadiness((prev) => ({ ...prev, [key]: value }));

    const exerciseSummaries = useMemo<ExerciseSummary[]>(
        () =>
            exercises.map((ex) => ({
                exerciseId: ex.exerciseId,
                volume: exerciseVolume(ex, false),
                workVolume: exerciseVolume(ex, true),
                summaryText: exerciseSummary(ex),
            })),
        [exercises]
    );

    const totals = useMemo(
        () =>
            exerciseSummaries.reduce((acc, s) => ({ volume: acc.volume + s.volume, workVolume: acc.workVolume + s.workVolume }), {
                volume: 0,
                workVolume: 0,
            }),
        [exerciseSummaries]
    );

    // The live pager only ever shows two pages: the exercise list, then a finish page —
    // collapsed into one page while there's nothing to list yet. Exercise detail is a bottom
    // sheet over whichever of these is current, not a page of its own (see exerciseModalIndex).
    const pageCount = exercises.length === 0 ? 1 : 2;
    const clampPage = (i: number) => Math.max(0, Math.min(i, pageCount - 1));
    const goToPage = (i: number) => setPageIndex(clampPage(i));
    // Swiping/paging past the first page returns to the check-in screen rather than clamping.
    const pagerPrev = () => {
        if (pageIndex === 0) {
            setPhase('pre');
            return;
        }
        goToPage(pageIndex - 1);
    };
    const pagerNext = () => goToPage(pageIndex + 1);

    const openExerciseModal = (index: number) => setExerciseModalIndex(index);
    const closeExerciseModal = () => setExerciseModalIndex(null);

    // Swiping inside the detail sheet steps through the exercises in list order; swiping past
    // either end leaves the sheet the way the equivalent tap would — back off the first is a
    // close onto the list, forward off the last drops onto the finish page.
    const exerciseModalPrev = () => {
        if (exerciseModalIndex === null) return;
        setExerciseModalIndex(exerciseModalIndex === 0 ? null : exerciseModalIndex - 1);
    };
    const exerciseModalNext = () => {
        if (exerciseModalIndex === null) return;
        if (exerciseModalIndex >= exercises.length - 1) {
            setExerciseModalIndex(null);
            goToPage(pageCount - 1);
            return;
        }
        setExerciseModalIndex(exerciseModalIndex + 1);
    };

    const openPicker = () => {
        setPickerQuery('');
        setPickerOpen(true);
    };
    const closePicker = () => setPickerOpen(false);

    // Also doubles as "resume": once a session is already started, pressing/swiping back to
    // this screen and returning just re-enters 'live' (landing on the exercise list) without
    // resetting the clock.
    const startWorkout = () => {
        setPhase('live');
        if (startedAt === null) setStartedAt(Date.now());
    };

    const addExercise = (exerciseId: number) => {
        const metadata = exerciseMap.get(String(exerciseId));
        setExercises((prev) => [
            ...prev,
            // `measurement` is the catalog's record of how this movement was last measured, so a
            // sled push opens on feet rather than needing the pickers set every time.
            { exerciseId, sets: [], name: metadata?.name, units: metadata?.measurement ?? DEFAULT_COLUMN_UNITS },
        ]);
        setPickerOpen(false);
        setPageIndex(0); // the exercise list is what shows behind the sheet (and after closing it)
        setExerciseModalIndex(exercises.length); // straight into the new exercise's editor sheet
    };

    const moveExercise = (fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex) return;
        setExercises((prev) => {
            const next = [...prev];
            const [moved] = next.splice(fromIndex, 1);
            if (!moved) return prev;
            next.splice(toIndex, 0, moved);
            return next;
        });
    };

    const requestRemoveExercise = (index: number) => setConfirmRemoveIndex(index);
    const cancelRemoveExercise = () => setConfirmRemoveIndex(null);
    const confirmRemoveExercise = () => {
        if (confirmRemoveIndex !== null) setExercises((prev) => prev.filter((_, i) => i !== confirmRemoveIndex));
        setConfirmRemoveIndex(null);
    };

    const updateExerciseAt = (index: number, updater: (ex: DraftExercise) => DraftExercise) => {
        setExercises((prev) => prev.map((ex, i) => (i === index ? updater(ex) : ex)));
    };

    const updateSetAt = (exerciseIndex: number, setIndex: number, updater: (set: DraftSet) => DraftSet) => {
        updateExerciseAt(exerciseIndex, (ex) => ({ ...ex, sets: ex.sets.map((s, i) => (i === setIndex ? updater(s) : s)) }));
    };

    // New sets carry the previous set's numbers forward (first set starts blank).
    const addSet = (exerciseIndex: number) =>
        updateExerciseAt(exerciseIndex, (ex) => {
            const last = ex.sets[ex.sets.length - 1];
            return {
                ...ex,
                sets: [...ex.sets, { weight: last?.weight ?? 0, reps: last?.reps ?? 0, isWorkSet: true, done: false }],
            };
        });

    const removeSet = (exerciseIndex: number) => updateExerciseAt(exerciseIndex, (ex) => ({ ...ex, sets: ex.sets.slice(0, -1) }));

    const updateSetField = (exerciseIndex: number, setIndex: number, field: 'reps' | 'weight', value: number) =>
        updateSetAt(exerciseIndex, setIndex, (s) => ({ ...s, [field]: value }));

    const fillDownSetField = (exerciseIndex: number, setIndex: number, field: 'reps' | 'weight') =>
        updateExerciseAt(exerciseIndex, (ex) => {
            const source = ex.sets[setIndex];
            return source ? { ...ex, sets: ex.sets.map((s, i) => (i > setIndex ? { ...s, [field]: source[field] } : s)) } : ex;
        });

    // Read by exerciseId rather than by index because the exercise-detail sheet remounts on every
    // page of its swipe pager and only knows which exercise it is showing.
    const exerciseUnits = (exerciseId: number): ColumnUnits => {
        const ex = exercises.find((e) => e.exerciseId === exerciseId);
        return ex ? unitsOf(ex) : DEFAULT_COLUMN_UNITS;
    };

    const setExerciseUnit = (exerciseId: number, column: keyof ColumnUnits, unit: SetUnit) =>
        setExercises((prev) => prev.map((ex) => (ex.exerciseId === exerciseId ? { ...ex, units: { ...unitsOf(ex), [column]: unit } } : ex)));

    const toggleSetDone = (exerciseIndex: number, setIndex: number) => updateSetAt(exerciseIndex, setIndex, (s) => ({ ...s, done: !s.done }));

    const toggleAllSetsDone = (exerciseIndex: number) =>
        updateExerciseAt(exerciseIndex, (ex) => {
            const allDone = ex.sets.length > 0 && ex.sets.every((s) => s.done);
            return { ...ex, sets: ex.sets.map((s) => ({ ...s, done: !allDone })) };
        });

    const finishWorkout = () => {
        setEndedAt(Date.now());
        setPhase('done');
    };

    const backToWorkout = () => {
        setEndedAt(null);
        setPhase('live');
    };

    const showToast = (msg: string) => {
        setToastMessage(msg);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToastMessage(null), 2200);
    };

    const requestCancelSession = () => setConfirmCancelOpen(true);
    const dismissCancelSession = () => setConfirmCancelOpen(false);

    // Throws the draft away: resetSession lands the context on a blank 'pre' — pager and sheet
    // coordinates included — which the provider stores as key absence, so nothing survives a
    // reload either. The picker is still local to this hook and has to be closed here: the
    // app-bar ✕ sits above .phone-body, so it stays tappable while the picker is open over
    // the live view.
    const confirmCancelSession = () => {
        setConfirmCancelOpen(false);
        setPickerOpen(false);
        resetSession();
        showToast('Workout discarded');
    };

    const saveSession = async () => {
        if (startedAt === null || saving) return;
        const finishedAt = endedAt ?? Date.now();
        // ISO strings, not Dates — the client SDK would store Dates as Firestore Timestamps,
        // which the pipeline's REST decoder deliberately doesn't handle. uuid is owned by
        // saveLiftingWorkout (read-before-write keeps it stable across re-saves of a day).
        const payload = {
            date: `${date}T00:00:00.000Z`, // UTC midnight, matching the app's date convention
            title: date,
            startedAt: new Date(startedAt).toISOString(),
            duration: Math.max(1, durationMin ?? Math.round((finishedAt - startedAt) / 60000)), // minutes
            rpe,
            readiness, // not part of WorkoutSchema — kept as an explicit extra field
            exercises: exercises.map((ex, i) => ({
                exerciseId: ex.exerciseId,
                order: i + 1,
                units: unitsOf(ex),
                sets: ex.sets.map((s, j) => ({ order: j + 1, weight: s.weight, reps: s.reps, isWorkSet: s.isWorkSet })),
                volume: exerciseVolume(ex, false),
                workVolume: exerciseVolume(ex, true),
            })),
            volume: totals.volume,
            workVolume: totals.workVolume,
        };

        setSaving(true);
        try {
            await saveLiftingWorkout(date, payload);
        } catch (err) {
            // Draft survives untouched for a retry — only a successful write resets it.
            console.error('Saving workout to Firestore failed:', err);
            showToast(saveErrorMessage(err));
            setSaving(false);
            return;
        }
        setSaving(false);
        showToast('Workout saved');

        const doneSets = exercises.flatMap((ex) => ex.sets.filter((s) => s.done));
        const answered = Object.values(readiness).filter((v): v is number => typeof v === 'number');
        setSummary({
            date,
            volume: totals.volume,
            exerciseCount: exercises.length,
            setCount: doneSets.length,
            repCount: doneSets.reduce((sum, s) => sum + s.reps, 0),
            completedExercises: exercises.filter((ex) => ex.sets.length > 0 && ex.sets.every((s) => s.done)).length,
            readinessAvg: answered.length > 0 ? answered.reduce((a, b) => a + b, 0) / answered.length : null,
            minutes: payload.duration,
            rpe,
            records: sessionRecords(exercises, workouts).map((r) => ({
                reps: r.reps,
                weight: r.weight,
                name: exerciseMap.get(String(r.exerciseId))?.name ?? `Exercise ${r.exerciseId}`,
            })),
        });
        resetSession(); // the session is over: clear the global draft so the nav timer stops
    };

    const dismissSummary = () => setSummary(null);

    // "You've done this N times" — real equivalent of a usage-frequency count, from actual work sets.
    const exerciseSetCounts = useMemo(() => {
        const map = new Map<number, number>();
        for (const w of workouts) {
            for (const ex of w.exercises) {
                const count = ex.sets.filter((s) => s.isWorkSet).length;
                if (count === 0) continue;
                map.set(ex.exerciseId, (map.get(ex.exerciseId) ?? 0) + count);
            }
        }
        return map;
    }, [workouts]);

    // Sorted separately from the filter below: `exercises` changes identity on every keystroke in
    // a rep/weight field, and the sort — localeCompare across the whole exercise map — is the
    // expensive half. Neither of its inputs moves while you're typing, so it stays memoized.
    const sortedExercises = useMemo(
        () =>
            Array.from(exerciseMap.values()).sort((a, b) => {
                const diff = (exerciseSetCounts.get(b.id) ?? 0) - (exerciseSetCounts.get(a.id) ?? 0);
                return diff !== 0 ? diff : a.name.localeCompare(b.name);
            }),
        [exerciseMap, exerciseSetCounts]
    );

    const pickerExercises = useMemo(() => {
        const q = pickerQuery.trim().toLowerCase();
        const added = new Set(exercises.map((ex) => ex.exerciseId));
        return sortedExercises.filter((ex) => !added.has(ex.id) && (!q || ex.name.toLowerCase().includes(q)));
    }, [sortedExercises, pickerQuery, exercises]);

    return {
        phase,
        date,
        setDate,
        readiness,
        setReadinessAnswer,
        startedAt,
        endedAt,
        rpe,
        setRpe,
        durationMin,
        setDurationMin,

        exercises,
        exerciseSummaries,
        totals,
        exerciseMap,
        workouts,

        pageIndex,
        pageCount,
        goToPage,
        pagerPrev,
        pagerNext,

        exerciseModalIndex,
        openExerciseModal,
        closeExerciseModal,
        exerciseModalPrev,
        exerciseModalNext,

        pickerOpen,
        pickerQuery,
        setPickerQuery,
        pickerExercises,
        exerciseSetCounts,
        openPicker,
        closePicker,

        toastMessage,

        summary,
        dismissSummary,

        startWorkout,
        addExercise,
        moveExercise,
        confirmRemoveIndex,
        requestRemoveExercise,
        cancelRemoveExercise,
        confirmRemoveExercise,
        addSet,
        removeSet,
        updateSetField,
        fillDownSetField,
        exerciseUnits,
        setExerciseUnit,
        toggleSetDone,
        toggleAllSetsDone,
        finishWorkout,
        backToWorkout,
        confirmCancelOpen,
        requestCancelSession,
        dismissCancelSession,
        confirmCancelSession,
        saveSession,
        saving,
    };
}
