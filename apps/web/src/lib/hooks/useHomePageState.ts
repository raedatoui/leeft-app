'use client';

import { useEffect, useMemo, useState } from 'react';
import { computeTopExercises, type TopExerciseRow } from '@/components/analysis/v2/monthCellV2';
import { type EffortTier, matchesTier } from '@/lib/cardio-effort';
import { type MuscleGroup, useActiveAllWorkouts, useWorkoutData } from '@/lib/contexts';
import {
    type CardioDistributionSlice,
    type CardioLoggedByFilter,
    type CardioMonthlyTrendBucket,
    type CardioStats,
    computeDistribution,
    computeMonthlyTrend,
    computeStats,
} from '@/lib/hooks/useCardioPageState';
import { useMuscleGroupColor } from '@/lib/hooks/useMuscleGroupColor';
import { useResponsiveColumns } from '@/lib/hooks/useResponsiveColumns';
import type { CardioWorkout, DayWorkout, ExerciseMap, Workout } from '@/types';

export type Modality = 'both' | 'cardio' | 'lifting';

export interface LiftStats {
    workouts: number;
    /** lbs, warmup-aware. */
    totalVolume: number;
    totalSets: number;
    prCount: number;
    avgDurationMin: number;
    /** 0 when no workout has an RPE. */
    avgRpe: number;
}

export interface LiftMonthlyBucket {
    month: number;
    /** Keyed by muscle-group NAME (display string), values in lbs. */
    byGroupVolume: Partial<Record<string, number>>;
    totalVolume: number;
    workouts: number;
}

export interface PrMonthlyBucket {
    month: number;
    byTier: { allTime: number; active: number; beaten: number };
    total: number;
}

export interface HomePageState {
    // UI state — setters that change the visible day set also snap the slider back to the newest page
    modality: Modality;
    setModality: (m: Modality) => void;
    selectedYear: number;
    setSelectedYear: (y: number) => void;
    includeWarmup: boolean;
    setIncludeWarmup: (v: boolean) => void;
    effortTier: EffortTier;
    setEffortTier: (t: EffortTier) => void;
    minDuration: number;
    setMinDuration: (m: number) => void;
    loggedBy: CardioLoggedByFilter;
    setLoggedBy: (l: CardioLoggedByFilter) => void;
    activeType: string | null;
    setActiveType: (t: string | null) => void;
    /** Muscle-group NAME (as shown in the mix chart). */
    activeMuscleGroup: string | null;
    setActiveMuscleGroup: (name: string | null) => void;
    /** Resolved group id — feeds WorkoutCard's muscleGroupFilter. Null for the 'Other' bucket. */
    activeMuscleGroupId: string | null;

    // Data
    exerciseMap: ExerciseMap;
    muscleGroups: MuscleGroup[];
    muscleGroupColor: (id: string | undefined) => string | undefined;
    years: number[];
    /** Filtered days of the selected year, ascending — feeds the calendar. */
    yearDays: DayWorkout[];
    /** Same days newest-first — feeds the slider. */
    daysDesc: DayWorkout[];

    // Slider (year-scoped, cardio-page pattern)
    columns: number;
    currentPage: number;
    totalPages: number;
    pageDays: DayWorkout[];
    visibleMonth: number;
    goPrevPage: () => void;
    goNextPage: () => void;
    jumpToMonth: (monthStr: string) => void;

    // Aggregates (year-scoped)
    cardioStats: CardioStats;
    cardioDistribution: CardioDistributionSlice[];
    cardioMonthlyTrend: CardioMonthlyTrendBucket[];
    liftStats: LiftStats;
    muscleDistribution: CardioDistributionSlice[];
    liftMonthlyVolume: LiftMonthlyBucket[];
    prMonthly: PrMonthlyBucket[];
    topExercises: TopExerciseRow[];
}

const TIER_RANK = { allTime: 3, active: 2, beaten: 1 } as const;

export function useHomePageState(): HomePageState {
    const allDays = useActiveAllWorkouts();
    const { exerciseMap, muscleGroups } = useWorkoutData();
    const muscleGroupColor = useMuscleGroupColor(muscleGroups);

    const [modality, setModalityRaw] = useState<Modality>('both');
    const [rawYear, setRawYear] = useState<number>(new Date().getFullYear());
    const [includeWarmup, setIncludeWarmup] = useState(false);
    const [effortTier, setEffortTierRaw] = useState<EffortTier>('medium');
    const [minDuration, setMinDurationRaw] = useState(0);
    const [loggedBy, setLoggedByRaw] = useState<CardioLoggedByFilter>('all');
    const [activeType, setActiveTypeRaw] = useState<string | null>(null);
    const [activeMuscleGroup, setActiveMuscleGroupRaw] = useState<string | null>(null);
    const [pageIndex, setPageIndex] = useState(0);

    // Any change to the visible day set restarts at the newest page.
    const setModality = (m: Modality) => {
        setModalityRaw(m);
        setPageIndex(0);
    };
    const setSelectedYear = (y: number) => {
        setRawYear(y);
        setPageIndex(0);
    };
    const setEffortTier = (t: EffortTier) => {
        setEffortTierRaw(t);
        setPageIndex(0);
    };
    const setMinDuration = (m: number) => {
        setMinDurationRaw(m);
        setPageIndex(0);
    };
    const setLoggedBy = (l: CardioLoggedByFilter) => {
        setLoggedByRaw(l);
        setPageIndex(0);
    };
    const setActiveType = (t: string | null) => {
        setActiveTypeRaw(t);
        setPageIndex(0);
    };
    const setActiveMuscleGroup = (name: string | null) => {
        setActiveMuscleGroupRaw(name);
        setPageIndex(0);
    };

    // Modality strips the hidden side's workouts; days left with nothing drop out.
    const modalityDays = useMemo(() => {
        if (modality === 'both') return allDays;
        return allDays
            .map((day) => ({
                ...day,
                liftingWorkouts: modality === 'cardio' ? [] : day.liftingWorkouts,
                cardioWorkouts: modality === 'lifting' ? [] : day.cardioWorkouts,
            }))
            .filter((day) => day.liftingWorkouts.length > 0 || day.cardioWorkouts.length > 0);
    }, [allDays, modality]);

    // Years come from the modality scope (before the cardio sub-filters), so the year list stays stable while tweaking filters.
    const years = useMemo(() => {
        const ys = new Set<number>();
        for (const day of modalityDays) ys.add(day.date.getUTCFullYear());
        return [...ys].sort((a, b) => b - a);
    }, [modalityDays]);

    // Derived clamp (not an effect): survives async data load and modality switches that remove the raw year.
    const selectedYear = years.includes(rawYear) ? rawYear : (years[0] ?? rawYear);

    const activeMuscleGroupId = useMemo(
        () => (activeMuscleGroup ? (muscleGroups.find((g) => g.name === activeMuscleGroup)?.id ?? null) : null),
        [activeMuscleGroup, muscleGroups]
    );

    // Card-facing days: cardio trimmed by its filters; lifting passed through untouched — exercise-level
    // hiding is WorkoutCard's muscleGroupFilter's job. A day survives if either side still has content.
    const filteredDays = useMemo(() => {
        const result: DayWorkout[] = [];
        for (const day of modalityDays) {
            const visibleCardio = day.cardioWorkouts.filter(
                (w) =>
                    matchesTier(w, effortTier) &&
                    w.durationMin >= minDuration &&
                    (loggedBy === 'all' || w.loggedBy === loggedBy) &&
                    (!activeType || w.type === activeType)
            );
            const liftingHasMatch = activeMuscleGroupId
                ? day.liftingWorkouts.some((w) =>
                      w.exercises.some((ex) => exerciseMap.get(ex.exerciseId.toString())?.primaryMuscleGroup === activeMuscleGroupId)
                  )
                : day.liftingWorkouts.length > 0;
            if (visibleCardio.length === 0 && !liftingHasMatch) continue;
            result.push({ ...day, cardioWorkouts: visibleCardio });
        }
        return result;
    }, [modalityDays, effortTier, minDuration, loggedBy, activeType, activeMuscleGroupId, exerciseMap]);

    const yearDays = useMemo(() => filteredDays.filter((d) => d.date.getUTCFullYear() === selectedYear), [filteredDays, selectedYear]);
    const daysDesc = useMemo(() => [...yearDays].reverse(), [yearDays]);

    // Slider: one grid row per page, page size tracks the responsive column count.
    const columns = useResponsiveColumns();
    // Breakpoint crossings change the page size — snap back to the newest page.
    useEffect(() => {
        setPageIndex(0);
    }, [columns]);
    const totalPages = Math.max(1, Math.ceil(daysDesc.length / columns));
    const currentPage = Math.min(pageIndex, totalPages - 1);
    const pageDays = daysDesc.slice(currentPage * columns, currentPage * columns + columns);

    const goPrevPage = () => setPageIndex((p) => Math.max(0, p - 1));
    const goNextPage = () => setPageIndex((p) => Math.min(totalPages - 1, p + 1));

    const visibleMonth = pageDays[0]?.date.getUTCMonth() ?? new Date().getUTCMonth();
    const jumpToMonth = (monthStr: string) => {
        const month = Number(monthStr);
        const idx = daysDesc.findIndex((d) => d.date.getUTCMonth() === month);
        if (idx !== -1) setPageIndex(Math.floor(idx / columns));
    };

    // Cardio aggregates keep the cardio page's semantics: activeType narrows stats but only mutes charts.
    const scopedCardio = useMemo(() => {
        const list: CardioWorkout[] = [];
        for (const day of modalityDays) {
            if (day.date.getUTCFullYear() !== selectedYear) continue;
            for (const w of day.cardioWorkouts) {
                if (matchesTier(w, effortTier) && w.durationMin >= minDuration && (loggedBy === 'all' || w.loggedBy === loggedBy)) list.push(w);
            }
        }
        return list;
    }, [modalityDays, selectedYear, effortTier, minDuration, loggedBy]);

    const activeCardio = useMemo(() => (activeType ? scopedCardio.filter((w) => w.type === activeType) : scopedCardio), [scopedCardio, activeType]);

    const cardioStats = useMemo(() => computeStats(activeCardio), [activeCardio]);
    const cardioDistribution = useMemo(() => computeDistribution(scopedCardio), [scopedCardio]);
    const cardioMonthlyTrend = useMemo(() => computeMonthlyTrend(scopedCardio, selectedYear), [scopedCardio, selectedYear]);

    const yearLifting = useMemo(() => {
        const list: Workout[] = [];
        for (const day of modalityDays) {
            if (day.date.getUTCFullYear() !== selectedYear) continue;
            list.push(...day.liftingWorkouts);
        }
        return list;
    }, [modalityDays, selectedYear]);

    // Mix by set count (not volume): matches TypeMix's count semantics and avoids double-serving volume,
    // which gets its own monthly chart.
    const muscleDistribution = useMemo<CardioDistributionSlice[]>(() => {
        const groupById = new Map(muscleGroups.map((g) => [g.id, g]));
        const counts = new Map<string, { count: number; color: string }>();
        let total = 0;
        for (const w of yearLifting) {
            for (const ex of w.exercises) {
                const sets = includeWarmup ? ex.sets.length : ex.sets.filter((s) => s.isWorkSet).length;
                if (sets === 0) continue;
                const group = groupById.get(exerciseMap.get(ex.exerciseId.toString())?.primaryMuscleGroup ?? '');
                const name = group?.name ?? 'Other';
                const cur = counts.get(name) ?? { count: 0, color: group?.color ?? '#888888' };
                cur.count += sets;
                counts.set(name, cur);
                total += sets;
            }
        }
        return [...counts.entries()]
            .map(([type, { count, color }]) => ({ type, count, pct: total > 0 ? Math.round((count / total) * 100) : 0, color }))
            .sort((a, b) => b.count - a.count);
    }, [yearLifting, exerciseMap, muscleGroups, includeWarmup]);

    const liftMonthlyVolume = useMemo<LiftMonthlyBucket[]>(() => {
        const groupById = new Map(muscleGroups.map((g) => [g.id, g]));
        const buckets: LiftMonthlyBucket[] = Array.from({ length: 12 }, (_, month) => ({ month, byGroupVolume: {}, totalVolume: 0, workouts: 0 }));
        for (const w of yearLifting) {
            const bucket = buckets[w.date.getUTCMonth()];
            if (!bucket) continue;
            bucket.workouts += 1;
            for (const ex of w.exercises) {
                const volume = includeWarmup ? ex.volume : ex.workVolume;
                if (volume <= 0) continue;
                const name = groupById.get(exerciseMap.get(ex.exerciseId.toString())?.primaryMuscleGroup ?? '')?.name ?? 'Other';
                bucket.byGroupVolume[name] = (bucket.byGroupVolume[name] ?? 0) + volume;
                bucket.totalVolume += volume;
            }
        }
        return buckets;
    }, [yearLifting, exerciseMap, muscleGroups, includeWarmup]);

    const prMonthly = useMemo<PrMonthlyBucket[]>(() => {
        const buckets: PrMonthlyBucket[] = Array.from({ length: 12 }, (_, month) => ({
            month,
            byTier: { allTime: 0, active: 0, beaten: 0 },
            total: 0,
        }));
        for (const w of yearLifting) {
            const bucket = buckets[w.date.getUTCMonth()];
            if (!bucket) continue;
            for (const ex of w.exercises) {
                // One PR event per rep count, strongest tier wins — same dedup as WorkoutCard's name chips.
                const prByReps = new Map<number, keyof typeof TIER_RANK>();
                for (const s of ex.sets) {
                    if (!s.prTier || s.reps === undefined) continue;
                    const cur = prByReps.get(s.reps);
                    if (!cur || TIER_RANK[s.prTier] > TIER_RANK[cur]) prByReps.set(s.reps, s.prTier);
                }
                for (const tier of prByReps.values()) {
                    bucket.byTier[tier] += 1;
                    bucket.total += 1;
                }
            }
        }
        return buckets;
    }, [yearLifting]);

    const liftStats = useMemo<LiftStats>(() => {
        let totalVolume = 0;
        let totalSets = 0;
        let totalDuration = 0;
        let rpeSum = 0;
        let rpeCount = 0;
        for (const w of yearLifting) {
            totalVolume += includeWarmup ? w.volume : w.workVolume;
            totalDuration += w.duration;
            if (w.rpe !== null) {
                rpeSum += w.rpe;
                rpeCount += 1;
            }
            for (const ex of w.exercises) {
                totalSets += includeWarmup ? ex.sets.length : ex.sets.filter((s) => s.isWorkSet).length;
            }
        }
        return {
            workouts: yearLifting.length,
            totalVolume,
            totalSets,
            prCount: prMonthly.reduce((sum, b) => sum + b.total, 0),
            avgDurationMin: yearLifting.length > 0 ? Math.round(totalDuration / yearLifting.length) : 0,
            avgRpe: rpeCount > 0 ? Math.round((rpeSum / rpeCount) * 10) / 10 : 0,
        };
    }, [yearLifting, includeWarmup, prMonthly]);

    const topExercises = useMemo(() => computeTopExercises(yearLifting, exerciseMap, 10), [yearLifting, exerciseMap]);

    return {
        modality,
        setModality,
        selectedYear,
        setSelectedYear,
        includeWarmup,
        setIncludeWarmup,
        effortTier,
        setEffortTier,
        minDuration,
        setMinDuration,
        loggedBy,
        setLoggedBy,
        activeType,
        setActiveType,
        activeMuscleGroup,
        setActiveMuscleGroup,
        activeMuscleGroupId,
        exerciseMap,
        muscleGroups,
        muscleGroupColor,
        years,
        yearDays,
        daysDesc,
        columns,
        currentPage,
        totalPages,
        pageDays,
        visibleMonth,
        goPrevPage,
        goNextPage,
        jumpToMonth,
        cardioStats,
        cardioDistribution,
        cardioMonthlyTrend,
        liftStats,
        muscleDistribution,
        liftMonthlyVolume,
        prMonthly,
        topExercises,
    };
}
