'use client';

import { useEffect, useMemo, useState } from 'react';
import { type EffortTier, matchesTier } from '@/lib/cardio-effort';
import { useActiveAllWorkouts, useWorkoutData } from '@/lib/contexts';
import type { DayWorkout, ExerciseMap } from '@/types';

export interface WorkoutLogState {
    workouts: DayWorkout[];
    exerciseMap: ExerciseMap;
    miniMode: boolean;
    setMiniMode: (val: boolean) => void;
    currentIndex: number;
    setCurrentIndex: (val: number) => void;
    slidesToShow: number;
    setSlidesToShow: (val: number) => void;
    responsiveColumns: number;
    includeWarmup: boolean;
    setIncludeWarmup: (val: boolean) => void;
    effortTier: EffortTier;
    setEffortTier: (val: EffortTier) => void;
    selectedYear: string | undefined;
    activeYear: number | undefined;
    selectedMonth: string | undefined;
    availableYears: number[];
    allMonths: { value: string; label: string }[];
    slideCount: number;
    effectiveSlidesToShow: number;
    slideLeft: () => void;
    slideRight: () => void;
    jumpToYear: (year: string) => void;
    jumpToMonth: (month: string) => void;
}

export interface WorkoutLogStateOptions {
    /** Default includeWarmup. v1 uses true; v2 page passes false. */
    includeWarmup?: boolean;
    /** Default miniMode. v1 uses true (compact list per exercise). */
    miniMode?: boolean;
}

export function useWorkoutLogState(opts: WorkoutLogStateOptions = {}): WorkoutLogState {
    const allDayWorkouts = useActiveAllWorkouts();
    const { exerciseMap } = useWorkoutData();
    const [miniMode, setMiniMode] = useState(opts.miniMode ?? true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [slidesToShow, setSlidesToShow] = useState(4);
    const [responsiveColumns, setResponsiveColumns] = useState(4);
    const [includeWarmup, setIncludeWarmup] = useState(opts.includeWarmup ?? true);
    // 'medium' default keeps the daily view clean (mirrors the old strict-mode default).
    const [effortTier, setEffortTier] = useState<EffortTier>('medium');
    const [selectedYear, setSelectedYear] = useState<string | undefined>();
    const [selectedMonth, setSelectedMonth] = useState<string | undefined>();

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
            years.add(day.date.getFullYear());
        });
        return Array.from(years).sort((a, b) => b - a);
    }, [allWorkouts]);

    const allMonths = useMemo(
        () =>
            [
                { value: '0', label: 'January' },
                { value: '1', label: 'February' },
                { value: '2', label: 'March' },
                { value: '3', label: 'April' },
                { value: '4', label: 'May' },
                { value: '5', label: 'June' },
                { value: '6', label: 'July' },
                { value: '7', label: 'August' },
                { value: '8', label: 'September' },
                { value: '9', label: 'October' },
                { value: '10', label: 'November' },
                { value: '11', label: 'December' },
            ].reverse(),
        []
    );

    const activeYear = useMemo(() => {
        if (selectedYear) return Number(selectedYear);
        return availableYears.length > 0 ? availableYears[0] : undefined;
    }, [selectedYear, availableYears]);

    useEffect(() => {
        const updateColumns = () => {
            const width = window.innerWidth;
            let newColumns = 4;
            if (width < 640) {
                newColumns = 1;
            } else if (width < 1024) {
                newColumns = 2;
            } else if (width < 1280) {
                newColumns = 3;
            } else {
                newColumns = slidesToShow;
            }
            setResponsiveColumns((prev) => {
                if (prev !== newColumns) {
                    setCurrentIndex(0);
                    return newColumns;
                }
                return prev;
            });
        };
        updateColumns();
        window.addEventListener('resize', updateColumns);
        return () => window.removeEventListener('resize', updateColumns);
    }, [slidesToShow]);

    const effectiveSlidesToShow = responsiveColumns;
    const slideCount = useMemo(() => Math.ceil(allWorkouts.length / effectiveSlidesToShow), [allWorkouts.length, effectiveSlidesToShow]);

    const slideLeft = () => {
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
    };

    const slideRight = () => {
        setCurrentIndex((prev) => Math.min(prev + 1, slideCount - 1));
    };

    const jumpToYear = (year: string) => {
        if (!year) return;
        setSelectedYear(year);
        setSelectedMonth(undefined);

        const reversedWorkouts = [...allWorkouts].reverse();
        const workoutIndex = reversedWorkouts.findIndex((day) => day.date.getFullYear() === Number(year));

        if (workoutIndex !== -1) {
            const slideIndex = Math.floor(workoutIndex / effectiveSlidesToShow);
            setCurrentIndex(slideIndex);
        }
    };

    const jumpToMonth = (monthStr: string) => {
        if (!activeYear || !monthStr) return;
        setSelectedMonth(monthStr);

        const month = Number(monthStr);
        const reversedWorkouts = [...allWorkouts].reverse();
        const workoutIndex = reversedWorkouts.findIndex((day) => day.date.getFullYear() === activeYear && day.date.getMonth() === month);

        if (workoutIndex !== -1) {
            const slideIndex = Math.floor(workoutIndex / effectiveSlidesToShow);
            setCurrentIndex(slideIndex);
        }
    };

    return {
        workouts: allWorkouts,
        exerciseMap,
        miniMode,
        setMiniMode,
        currentIndex,
        setCurrentIndex,
        slidesToShow,
        setSlidesToShow,
        responsiveColumns,
        includeWarmup,
        setIncludeWarmup,
        effortTier,
        setEffortTier,
        selectedYear,
        activeYear,
        selectedMonth,
        availableYears,
        allMonths,
        slideCount,
        effectiveSlidesToShow,
        slideLeft,
        slideRight,
        jumpToYear,
        jumpToMonth,
    };
}
