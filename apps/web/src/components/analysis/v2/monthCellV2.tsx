import Link from 'next/link';
import { useMemo } from 'react';
import { cardioColors } from '@/lib/cardio-theme';
import type { MuscleGroup } from '@/lib/contexts';
import { MONTHS_LONG } from '@/lib/dateFormatters';
import { useMuscleGroupColor } from '@/lib/hooks/useMuscleGroupColor';
import type { CardioWorkout, ExerciseMap, Workout } from '@/types';

interface MonthCellV2Props {
    yearMonth: string;
    workouts: Workout[];
    cardioWorkouts: CardioWorkout[];
    exerciseMap: ExerciseMap;
    muscleGroups: MuscleGroup[];
    includeWarmup: boolean;
    isCurrent: boolean;
}

export interface TopExerciseRow {
    id: number;
    name: string;
    workouts: number;
    sets: number;
    muscleGroup?: string;
}

export function computeTopExercises(workouts: Workout[], exerciseMap: ExerciseMap, limit = 5): TopExerciseRow[] {
    const byId = new Map<number, { workouts: number; sets: number }>();
    for (const w of workouts) {
        const seen = new Set<number>();
        for (const ex of w.exercises) {
            const cur = byId.get(ex.exerciseId) ?? { workouts: 0, sets: 0 };
            if (!seen.has(ex.exerciseId)) {
                cur.workouts++;
                seen.add(ex.exerciseId);
            }
            cur.sets += ex.sets.length;
            byId.set(ex.exerciseId, cur);
        }
    }
    return Array.from(byId.entries())
        .map(([id, v]) => {
            const meta = exerciseMap.get(id.toString());
            return {
                id,
                name: meta?.name ?? `#${id}`,
                workouts: v.workouts,
                sets: v.sets,
                muscleGroup: meta?.primaryMuscleGroup,
            };
        })
        .sort((a, b) => b.sets - a.sets)
        .slice(0, limit);
}

function formatVolumeShort(n: number): { value: string; unit?: string } {
    if (n < 1000) return { value: Math.round(n).toLocaleString() };
    if (n < 1_000_000) return { value: (n / 1000).toFixed(1), unit: 'k' };
    return { value: (n / 1_000_000).toFixed(2), unit: 'M' };
}

export default function MonthCellV2({ yearMonth, workouts, cardioWorkouts, exerciseMap, muscleGroups, includeWarmup, isCurrent }: MonthCellV2Props) {
    const [yearStr, monthStr] = yearMonth.split('-');
    const monthIdx = Math.max(0, Math.min(11, Number(monthStr) - 1));
    const monthName = MONTHS_LONG[monthIdx];

    const muscleColor = useMuscleGroupColor(muscleGroups);

    const liftCount = workouts.length;
    const avgExercises = liftCount > 0 ? workouts.reduce((s, w) => s + w.exercises.length, 0) / liftCount : 0;
    const totalVolume = useMemo(() => workouts.reduce((s, w) => s + (includeWarmup ? w.volume : w.workVolume), 0), [workouts, includeWarmup]);
    const avgVolume = liftCount > 0 ? totalVolume / liftCount : 0;
    const avgVol = formatVolumeShort(avgVolume);

    const topExercises = useMemo(() => computeTopExercises(workouts, exerciseMap), [workouts, exerciseMap]);

    const cardioCount = cardioWorkouts.length;
    const totalCardioMin = useMemo(() => cardioWorkouts.reduce((s, c) => s + c.durationMin, 0), [cardioWorkouts]);
    const totalZoneMin = useMemo(() => cardioWorkouts.reduce((s, c) => s + (c.zoneMinutes ?? 0), 0), [cardioWorkouts]);
    const cardioHours = totalCardioMin / 60;

    const topCardioTypes = useMemo(() => {
        const counts: Partial<Record<string, number>> = {};
        for (const c of cardioWorkouts) counts[c.type] = (counts[c.type] ?? 0) + 1;
        return (Object.entries(counts) as [string, number][]).sort((a, b) => b[1] - a[1]).slice(0, 3);
    }, [cardioWorkouts]);

    return (
        <div className="month-cell">
            <div className="head">
                <div className="month-name">{monthName}</div>
                <div className="year">{isCurrent ? `${yearStr} · in progress` : yearStr}</div>
            </div>

            {liftCount > 0 && (
                <div>
                    <div className="month-section-label">
                        <span>Lifting</span>
                        <span>
                            {liftCount} session{liftCount === 1 ? '' : 's'}
                        </span>
                    </div>
                    <div className="lift-tri">
                        <div className="cell">
                            <div className="v">{liftCount}</div>
                            <div className="l">Workouts</div>
                        </div>
                        <div className="cell">
                            <div className="v">{avgExercises.toFixed(1)}</div>
                            <div className="l">Avg Ex</div>
                        </div>
                        <div className="cell">
                            <div className="v">
                                {avgVol.value}
                                {avgVol.unit && <span className="unit">{avgVol.unit}</span>}
                            </div>
                            <div className="l">Avg Vol</div>
                        </div>
                    </div>
                </div>
            )}

            {topExercises.length > 0 && (
                <div>
                    <div className="month-section-label">
                        <span>Top Exercises</span>
                        <span>by sets</span>
                    </div>
                    <div className="top-ex-list" style={{ borderTop: 0, paddingTop: 0 }}>
                        {topExercises.map((ex) => (
                            <div key={ex.id} className="top-ex-row">
                                <span className="mg-pip" style={{ background: muscleColor(ex.muscleGroup) ?? 'var(--muted-2)' }} />
                                <Link href={`/exercises/${ex.id}`} className="nm" style={{ textDecoration: 'none', color: 'inherit' }}>
                                    {ex.name}
                                </Link>
                                <span className="freq">
                                    {ex.sets} sets · {ex.workouts}×
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {cardioCount > 0 && (
                <div>
                    <div className="month-section-label">
                        <span>Cardio</span>
                        <span>
                            {cardioCount} session{cardioCount === 1 ? '' : 's'}
                        </span>
                    </div>
                    <div className="cardio-tri">
                        <div className="cell">
                            <div className="v cardio">{cardioCount}</div>
                            <div className="l">Sessions</div>
                        </div>
                        <div className="cell">
                            <div className="v cardio">
                                {cardioHours.toFixed(1)}
                                <span className="unit">h</span>
                            </div>
                            <div className="l">Duration</div>
                        </div>
                        <div className="cell">
                            <div className="v zone">{totalZoneMin}</div>
                            <div className="l">Zone Min</div>
                        </div>
                    </div>
                    {topCardioTypes.length > 0 && (
                        <div className="cardio-types">
                            {topCardioTypes.map(([type, count]) => (
                                <span key={type} className="ct-chip">
                                    <span className="dot" style={{ background: cardioColors[type] ?? 'var(--muted)' }} />
                                    {type} <b>{count}</b>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {liftCount === 0 && cardioCount === 0 && <div className="empty-state">No workouts this month.</div>}
        </div>
    );
}
