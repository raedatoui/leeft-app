'use client';

import { useCallback, useMemo, useState } from 'react';
import { type EffortTier, matchesTier } from '@/lib/cardio-effort';
import { cardioColors } from '@/lib/cardio-theme';
import { useActiveCardio } from '@/lib/contexts';
import { filterCardioWorkoutsByDateRange } from '@/lib/statsUtils';
import type { CardioWorkout } from '@/types';

export type CardioPeriod = 'ytd' | '30d' | '90d' | 'all';
export type CardioLoggedByFilter = 'all' | 'tracker' | 'manual' | 'auto_detected';

export interface CardioStats {
    workouts: number;
    totalDurationMin: number;
    totalDurationHours: number;
    avgDurationMin: number;
    totalCalories: number;
    avgHeartRate: number;
    totalZoneMinutes: number;
}

export interface CardioDistributionSlice {
    type: string;
    count: number;
    pct: number;
    color: string;
}

export interface CardioMonthlyTrendBucket {
    month: number;
    byType: Partial<Record<string, number>>;
    byTypeDurationMin: Partial<Record<string, number>>;
    total: number;
    durationMin: number;
    zoneMin: number;
}

export interface CardioPageState {
    // Raw
    cardioWorkouts: CardioWorkout[];

    // UI state
    selectedYear: number;
    setSelectedYear: (y: number) => void;
    activeType: string | null;
    setActiveType: (t: string | null) => void;
    period: CardioPeriod;
    setPeriod: (p: CardioPeriod) => void;
    effortTier: EffortTier;
    setEffortTier: (t: EffortTier) => void;
    minDuration: number;
    setMinDuration: (m: number) => void;
    loggedBy: CardioLoggedByFilter;
    setLoggedBy: (l: CardioLoggedByFilter) => void;

    // Derived data
    workoutsByYear: Record<number, CardioWorkout[]>;
    years: number[];
    yearWorkouts: CardioWorkout[];
    periodWorkouts: CardioWorkout[];
    scopedWorkouts: CardioWorkout[];
    filteredWorkouts: CardioWorkout[];
    sortedWorkouts: CardioWorkout[];
    typeCounts: Partial<Record<string, number>>;
    availableTypes: string[];

    // Precomputed shapes
    stats: CardioStats;
    distribution: CardioDistributionSlice[];
    monthlyTrend: CardioMonthlyTrendBucket[];

    // Methods
    goToPrevYear: () => void;
    goToNextYear: () => void;
}

export interface CardioPageStateOptions {
    defaultYear?: number;
    defaultPeriod?: CardioPeriod;
}

const EMPTY_STATS: CardioStats = {
    workouts: 0,
    totalDurationMin: 0,
    totalDurationHours: 0,
    avgDurationMin: 0,
    totalCalories: 0,
    avgHeartRate: 0,
    totalZoneMinutes: 0,
};

function computeStats(workouts: CardioWorkout[]): CardioStats {
    if (workouts.length === 0) return EMPTY_STATS;

    const totalDurationMin = workouts.reduce((sum, w) => sum + w.durationMin, 0);
    const withCalories = workouts.filter((w) => w.calories !== undefined);
    const withHR = workouts.filter((w) => w.averageHeartRate !== undefined);

    return {
        workouts: workouts.length,
        totalDurationMin,
        totalDurationHours: Math.round((totalDurationMin / 60) * 10) / 10,
        avgDurationMin: Math.round(totalDurationMin / workouts.length),
        totalCalories: withCalories.reduce((sum, w) => sum + (w.calories ?? 0), 0),
        avgHeartRate: withHR.length > 0 ? Math.round(withHR.reduce((sum, w) => sum + (w.averageHeartRate ?? 0), 0) / withHR.length) : 0,
        totalZoneMinutes: workouts.reduce((sum, w) => sum + (w.zoneMinutes ?? 0), 0),
    };
}

function computeDistribution(workouts: CardioWorkout[]): CardioDistributionSlice[] {
    if (workouts.length === 0) return [];
    const counts: Partial<Record<string, number>> = {};
    for (const w of workouts) {
        counts[w.type] = (counts[w.type] ?? 0) + 1;
    }
    const total = workouts.length;
    return (Object.entries(counts) as [string, number][])
        .map(([type, count]) => ({
            type,
            count,
            pct: Math.round((count / total) * 100),
            color: cardioColors[type] ?? '#888888',
        }))
        .sort((a, b) => b.count - a.count);
}

function computeMonthlyTrend(workouts: CardioWorkout[], year: number): CardioMonthlyTrendBucket[] {
    const buckets: CardioMonthlyTrendBucket[] = Array.from({ length: 12 }, (_, i) => ({
        month: i,
        byType: {},
        byTypeDurationMin: {},
        total: 0,
        durationMin: 0,
        zoneMin: 0,
    }));

    for (const w of workouts) {
        if (w.date.getFullYear() !== year) continue;
        const bucket = buckets[w.date.getMonth()];
        if (!bucket) continue;
        bucket.byType[w.type] = (bucket.byType[w.type] ?? 0) + 1;
        bucket.byTypeDurationMin[w.type] = (bucket.byTypeDurationMin[w.type] ?? 0) + w.durationMin;
        bucket.total += 1;
        bucket.durationMin += w.durationMin;
        bucket.zoneMin += w.zoneMinutes ?? 0;
    }
    return buckets;
}

function rollingWindowStart(days: number): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - days + 1);
    return d;
}

export function useCardioPageState(opts: CardioPageStateOptions = {}): CardioPageState {
    const cardioWorkouts = useActiveCardio();

    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState<number>(opts.defaultYear ?? currentYear);
    const [activeType, setActiveType] = useState<string | null>(null);
    const [period, setPeriod] = useState<CardioPeriod>(opts.defaultPeriod ?? 'ytd');
    const [effortTier, setEffortTier] = useState<EffortTier>('medium');
    const [minDuration, setMinDuration] = useState(0);
    const [loggedBy, setLoggedBy] = useState<CardioLoggedByFilter>('all');

    const workoutsByYear = useMemo(() => {
        return cardioWorkouts.reduce(
            (acc, w) => {
                const y = w.date.getFullYear();
                if (!acc[y]) acc[y] = [];
                acc[y].push(w);
                return acc;
            },
            {} as Record<number, CardioWorkout[]>
        );
    }, [cardioWorkouts]);

    const years = useMemo(
        () =>
            Object.keys(workoutsByYear)
                .map(Number)
                .sort((a, b) => b - a),
        [workoutsByYear]
    );

    const yearWorkouts = useMemo(() => workoutsByYear[selectedYear] ?? [], [workoutsByYear, selectedYear]);

    const periodWorkouts = useMemo(() => {
        switch (period) {
            case 'ytd':
                return yearWorkouts;
            case '30d':
                return filterCardioWorkoutsByDateRange(cardioWorkouts, rollingWindowStart(30), new Date());
            case '90d':
                return filterCardioWorkoutsByDateRange(cardioWorkouts, rollingWindowStart(90), new Date());
            case 'all':
                return cardioWorkouts;
        }
    }, [period, yearWorkouts, cardioWorkouts]);

    // Effort/duration/logged-by narrow everything downstream (like the old strict mode did).
    const scopedWorkouts = useMemo(
        () =>
            periodWorkouts.filter(
                (w) => matchesTier(w, effortTier) && w.durationMin >= minDuration && (loggedBy === 'all' || w.loggedBy === loggedBy)
            ),
        [periodWorkouts, effortTier, minDuration, loggedBy]
    );

    const typeCounts = useMemo(() => {
        return scopedWorkouts.reduce(
            (acc, w) => {
                acc[w.type] = (acc[w.type] ?? 0) + 1;
                return acc;
            },
            {} as Partial<Record<string, number>>
        );
    }, [scopedWorkouts]);

    const availableTypes = useMemo(() => Object.keys(typeCounts), [typeCounts]);

    const filteredWorkouts = useMemo(() => {
        if (!activeType) return scopedWorkouts;
        return scopedWorkouts.filter((w) => w.type === activeType);
    }, [scopedWorkouts, activeType]);

    const sortedWorkouts = useMemo(() => [...filteredWorkouts].sort((a, b) => b.date.getTime() - a.date.getTime()), [filteredWorkouts]);

    // stats follow the active type filter (matches v1 CardioStats fed from filteredWorkouts).
    const stats = useMemo(() => computeStats(filteredWorkouts), [filteredWorkouts]);
    // distribution and trend show composition across all types — type filter only highlights, doesn't restrict.
    const distribution = useMemo(() => computeDistribution(scopedWorkouts), [scopedWorkouts]);
    const monthlyTrend = useMemo(() => computeMonthlyTrend(scopedWorkouts, selectedYear), [scopedWorkouts, selectedYear]);

    const goToPrevYear = useCallback(() => {
        const idx = years.indexOf(selectedYear);
        const prev = years[idx + 1];
        if (prev !== undefined) setSelectedYear(prev);
    }, [years, selectedYear]);

    const goToNextYear = useCallback(() => {
        const idx = years.indexOf(selectedYear);
        const next = years[idx - 1];
        if (next !== undefined) setSelectedYear(next);
    }, [years, selectedYear]);

    return {
        cardioWorkouts,
        selectedYear,
        setSelectedYear,
        activeType,
        setActiveType,
        period,
        setPeriod,
        effortTier,
        setEffortTier,
        minDuration,
        setMinDuration,
        loggedBy,
        setLoggedBy,
        workoutsByYear,
        years,
        yearWorkouts,
        periodWorkouts,
        scopedWorkouts,
        filteredWorkouts,
        sortedWorkouts,
        typeCounts,
        availableTypes,
        stats,
        distribution,
        monthlyTrend,
        goToPrevYear,
        goToNextYear,
    };
}
