'use client';

import { useMemo, useState } from 'react';
import { useWorkoutData } from '@/lib/contexts';
import type { MappedCycle } from '@/types';

export type CycleType = MappedCycle['type'];

export interface CyclesYearStats {
    totalWorkouts: number;
    totalBreakDays: number;
    totalCycles: number;
    typeCounts: Record<string, number>;
}

export interface CyclePosition {
    left: string;
    width: string;
}

const initialYear = (years: number[]): number => {
    const now = new Date().getFullYear();
    if (years.length === 0) return now;
    if (years.includes(now)) return now;
    return years[0]!;
};

export function useCyclesPageState() {
    const { cycles: rawCycles, exerciseMap } = useWorkoutData();

    const cyclesByYear = useMemo(() => {
        const acc: Record<number, MappedCycle[]> = {};
        for (const cycle of rawCycles ?? []) {
            const startYear = cycle.dates[0].getFullYear();
            const endYear = cycle.dates[1].getFullYear();
            for (let year = startYear; year <= endYear; year++) {
                if (!acc[year]) acc[year] = [];
                acc[year]!.push(cycle);
            }
        }
        return acc;
    }, [rawCycles]);

    const years = useMemo(
        () =>
            Object.keys(cyclesByYear)
                .map(Number)
                .sort((a, b) => b - a),
        [cyclesByYear]
    );

    const [visibleYear, setVisibleYearState] = useState(() => initialYear(years));
    const [activeType, setActiveType] = useState<CycleType | null>(null);

    // Clamp visibleYear in case rawCycles loaded after first render produced a different set of years.
    const safeYear = years.includes(visibleYear) ? visibleYear : (years[0] ?? visibleYear);

    const setVisibleYear = (year: number) => {
        setVisibleYearState(year);
    };

    const visibleCycles = useMemo(() => cyclesByYear[safeYear] ?? [], [cyclesByYear, safeYear]);

    const filteredCycles = useMemo(
        () => (activeType === null ? visibleCycles : visibleCycles.filter((c) => c.type === activeType)),
        [visibleCycles, activeType]
    );

    const yearStats: CyclesYearStats = useMemo(() => {
        const workoutUuids = new Set<string>();
        const typeCounts: Record<string, number> = {};
        let breakDays = 0;
        const startOfYear = new Date(safeYear, 0, 1).getTime();
        const endOfYear = new Date(safeYear, 11, 31, 23, 59, 59).getTime();

        for (const cycle of visibleCycles) {
            for (const w of cycle.workouts) workoutUuids.add(w.uuid);
            typeCounts[cycle.type] = (typeCounts[cycle.type] ?? 0) + 1;
            if (cycle.type === 'break') {
                const t0 = Math.max(cycle.dates[0].getTime(), startOfYear);
                const t1 = Math.min(cycle.dates[1].getTime(), endOfYear);
                breakDays += Math.max(0, Math.ceil((t1 - t0) / (1000 * 60 * 60 * 24)));
            }
        }

        return {
            totalWorkouts: workoutUuids.size,
            totalBreakDays: breakDays,
            totalCycles: visibleCycles.length,
            typeCounts,
        };
    }, [visibleCycles, safeYear]);

    const getCyclePosition = (cycle: MappedCycle): CyclePosition => {
        const startOfYear = new Date(safeYear, 0, 1).getTime();
        const endOfYear = new Date(safeYear, 11, 31, 23, 59, 59).getTime();
        const total = endOfYear - startOfYear;
        const t0 = Math.max(cycle.dates[0].getTime(), startOfYear);
        const t1 = Math.min(cycle.dates[1].getTime(), endOfYear);
        const left = ((t0 - startOfYear) / total) * 100;
        const width = ((t1 - t0) / total) * 100;
        return { left: `${left}%`, width: `${width}%` };
    };

    const goPrevYear = () => {
        const prev = years.filter((y) => y < safeYear);
        if (prev.length > 0) setVisibleYearState(Math.max(...prev));
    };
    const goNextYear = () => {
        const next = years.filter((y) => y > safeYear);
        if (next.length > 0) setVisibleYearState(Math.min(...next));
    };

    const hasPrevYear = years.some((y) => y < safeYear);
    const hasNextYear = years.some((y) => y > safeYear);

    return {
        rawCycles,
        exerciseMap,
        years,
        visibleYear: safeYear,
        setVisibleYear,
        goPrevYear,
        goNextYear,
        hasPrevYear,
        hasNextYear,
        activeType,
        setActiveType,
        visibleCycles,
        filteredCycles,
        yearStats,
        getCyclePosition,
    };
}
