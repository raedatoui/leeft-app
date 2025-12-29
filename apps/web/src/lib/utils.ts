import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Exercise, Workout } from '@/types';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function filterWorkoutsByDateRange(workouts: Workout[], startDate: Date, endDate: Date): Workout[] {
    // Normalize dates to midnight UTC for consistent comparison
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return workouts.filter((workout) => {
        const workoutDate = new Date(workout.date);
        return workoutDate >= start && workoutDate <= end;
    });
}

export function getLastNDaysRange(days: number): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    // Normalize to midnight
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return { start, end };
}

export function normalizeToMidnightUTC(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: '2-digit',
        timeZone: 'UTC',
    });
};

export function dateFromTitle(w: string) {
    const [year, month, day] = w.split('-').map(Number);
    return new Date(year, month - 1, day);
}

export const computeStats = (workouts: Workout[] = []) => {
    const workoutCount = workouts.length;
    let totalExercises = 0;

    // Map each exerciseId to an object with occurrence count and formatted best set string.
    const exerciseStats = new Map<number, { occurrences: number; maxWeight: string }>();

    workouts.forEach((workout) => {
        const uniqueExercises = new Set<number>(); // Track unique exercise occurrences in this workout
        totalExercises += workout.exercises.length;

        workout.exercises.forEach((ex) => {
            const exerciseId = ex.exerciseId;

            if (!uniqueExercises.has(exerciseId)) {
                uniqueExercises.add(exerciseId);

                // Find the set with the maximum weight in this exercise.
                const bestSet = ex.sets.reduce((prev, cur) => (cur.weight > prev.weight ? cur : prev));
                const formatted = `${bestSet.reps ?? '?'} x ${bestSet.weight}`;

                const stats = exerciseStats.get(exerciseId);

                if (!stats) {
                    exerciseStats.set(exerciseId, {
                        occurrences: 1,
                        maxWeight: formatted,
                    });
                } else {
                    stats.occurrences += 1;
                    const currentMaxWeight = Number.parseFloat(stats.maxWeight.split(' x ')[1]);
                    if (bestSet.weight > currentMaxWeight) {
                        stats.maxWeight = formatted;
                    }
                }
            }
        });
    });

    const avgExercises = workoutCount > 0 ? totalExercises / workoutCount : 0;

    // Sort by total occurrences and pick the top 5 exercises.
    const topExercises = Array.from(exerciseStats.entries())
        .sort((a, b) => b[1].occurrences - a[1].occurrences)
        .slice(0, 5)
        .map(([exerciseId, stats]) => ({
            id: exerciseId,
            count: stats.occurrences,
            maxWeight: stats.maxWeight,
        }));

    return { workoutCount, avgExercises, topExercises };
};

export function formatExerciseSets(exercise: Exercise): string {
    const reps = exercise.sets.map((set) => set.reps ?? 0).join(',');
    const weights = exercise.sets.map((set) => Math.round(set.weight)).join(',');
    return `${reps} @ ${weights}`;
}
