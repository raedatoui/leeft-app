'use client';

import { useEffect, useMemo, useState } from 'react';
import { type EffortTier, matchesTier } from '@/lib/cardio-effort';
import { useActiveAllWorkouts, useWorkoutData } from '@/lib/contexts';
import { useResponsiveColumns } from '@/lib/hooks/useResponsiveColumns';
import type { DayWorkout, ExerciseMap } from '@/types';

export interface WorkoutLogState {
    workouts: DayWorkout[];
    exerciseMap: ExerciseMap;
    currentIndex: number;
    includeWarmup: boolean;
    setIncludeWarmup: (val: boolean) => void;
    effortTier: EffortTier;
    setEffortTier: (val: EffortTier) => void;
    slideCount: number;
    effectiveSlidesToShow: number;
    slideLeft: () => void;
    slideRight: () => void;
    jumpToYear: (year: string) => void;
    jumpToMonth: (month: string) => void;
}

export interface WorkoutLogStateOptions {
    /** Default includeWarmup (the log page passes false). */
    includeWarmup?: boolean;
}

export function useWorkoutLogState(opts: WorkoutLogStateOptions = {}): WorkoutLogState {
    const allDayWorkouts = useActiveAllWorkouts();
    const { exerciseMap } = useWorkoutData();
    const [currentIndex, setCurrentIndex] = useState(0);
    const responsiveColumns = useResponsiveColumns();
    const [includeWarmup, setIncludeWarmup] = useState(opts.includeWarmup ?? true);
    // 'medium' default keeps the daily view clean (mirrors the old strict-mode default).
    const [effortTier, setEffortTier] = useState<EffortTier>('medium');
    const [selectedYear, setSelectedYear] = useState<string | undefined>();

    // Trim each day's cardio to the selected tier; days left with nothing drop out.
    const allWorkouts = useMemo(() => {
        if (effortTier === 'all') return allDayWorkouts;
        return allDayWorkouts
            .map((day) => ({ ...day, cardioWorkouts: day.cardioWorkouts.filter((w) => matchesTier(w, effortTier)) }))
            .filter((day) => day.liftingWorkouts.length > 0 || day.cardioWorkouts.length > 0);
    }, [allDayWorkouts, effortTier]);

    const availableYears = useMemo(() => {
        const years = new Set<number>();
        allWorkouts.forEach((day) => {
            years.add(day.date.getUTCFullYear());
        });
        return Array.from(years).sort((a, b) => b - a);
    }, [allWorkouts]);

    const activeYear = useMemo(() => {
        if (selectedYear) return Number(selectedYear);
        return availableYears.length > 0 ? availableYears[0] : undefined;
    }, [selectedYear, availableYears]);

    // Breakpoint crossings change the page size, so the index points at a different window of days — snap back to the newest page.
    useEffect(() => {
        setCurrentIndex(0);
    }, [responsiveColumns]);

    const effectiveSlidesToShow = responsiveColumns;
    const slideCount = useMemo(() => Math.ceil(allWorkouts.length / effectiveSlidesToShow), [allWorkouts.length, effectiveSlidesToShow]);

    const slideLeft = () => {
        // pre-clamp: currentIndex can point past the end after the dataset shrinks (effort tier)
        setCurrentIndex((prev) => Math.max(Math.min(prev, slideCount - 1) - 1, 0));
    };

    const slideRight = () => {
        setCurrentIndex((prev) => Math.min(prev + 1, slideCount - 1));
    };

    const jumpToYear = (year: string) => {
        if (!year) return;
        setSelectedYear(year);

        const reversedWorkouts = [...allWorkouts].reverse();
        const workoutIndex = reversedWorkouts.findIndex((day) => day.date.getUTCFullYear() === Number(year));

        if (workoutIndex !== -1) {
            const slideIndex = Math.floor(workoutIndex / effectiveSlidesToShow);
            setCurrentIndex(slideIndex);
        }
    };

    const jumpToMonth = (monthStr: string) => {
        if (!activeYear || !monthStr) return;

        const month = Number(monthStr);
        const reversedWorkouts = [...allWorkouts].reverse();
        const workoutIndex = reversedWorkouts.findIndex((day) => day.date.getUTCFullYear() === activeYear && day.date.getUTCMonth() === month);

        if (workoutIndex !== -1) {
            const slideIndex = Math.floor(workoutIndex / effectiveSlidesToShow);
            setCurrentIndex(slideIndex);
        }
    };

    return {
        workouts: allWorkouts,
        exerciseMap,
        currentIndex,
        includeWarmup,
        setIncludeWarmup,
        effortTier,
        setEffortTier,
        slideCount,
        effectiveSlidesToShow,
        slideLeft,
        slideRight,
        jumpToYear,
        jumpToMonth,
    };
}
