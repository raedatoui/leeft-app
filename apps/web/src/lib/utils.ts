import type { Workout } from '@/types';

// Re-export shared utilities
export { dateFromTitle } from '@leeft/utils';

/** Filter dated items (lifting or cardio workouts) to [startDate, endDate], normalized to full UTC days. */
export function filterByDateRange<T extends { date: Date }>(items: T[], startDate: Date, endDate: Date): T[] {
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    return items.filter((item) => item.date >= start && item.date <= end);
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
            if (ex.sets.length === 0) return; // schema allows empty sets; reduce below would throw

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
                    const currentMaxWeight = Number.parseFloat(stats.maxWeight.split(' x ')[1] ?? '0');
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
