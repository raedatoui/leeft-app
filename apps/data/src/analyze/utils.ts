import { z } from 'zod';

export interface WorkoutSummary {
    date: Date;
    uuid: string;
    exerciseCount: number;
    filename: string;
    exercises: string[];
}

export interface MonthlyAnalysis {
    year: number;
    month: number;
    workoutCount: number;
    totalExercises: number;
    averageExercisesPerWorkout: number;
    exercises: {
        name: string;
        count: number;
    }[];
}

export const WorkoutFileSchema = z.object({
    workout: z.object({
        id: z.number(),
        title: z.string(),
        workoutSets: z.array(
            z.object({
                workoutSetExercises: z.array(
                    z.object({
                        title: z.string(),
                        abr: z.string(),
                    })
                ),
            })
        ),
    }),
});

export function analyze(workouts: WorkoutSummary[]) {
    // Group by year and month
    const workoutsByMonth = Object.groupBy(workouts, (w) => `${w.date.getUTCFullYear()}-${(w.date.getUTCMonth() + 1).toString().padStart(2, '0')}`);

    // Analyze each month
    const monthlyAnalysis: Record<string, MonthlyAnalysis> = {};
    const monthEntries = Object.entries(workoutsByMonth);
    for (const [month, monthWorkouts] of monthEntries) {
        if (!monthWorkouts) continue; // Skip empty months
        const firstWorkout = monthWorkouts[0];
        const year = firstWorkout.date.getUTCFullYear();
        const monthNum = firstWorkout.date.getUTCMonth() + 1;

        // Count exercises across all workouts in the month
        const exerciseCounter: Record<string, number> = {};
        let totalExercises = 0;

        for (const workout of monthWorkouts) {
            totalExercises += workout.exerciseCount;
            for (const exercise of workout.exercises) {
                exerciseCounter[exercise] = (exerciseCounter[exercise] || 0) + 1;
            }
        }

        // Convert to sorted array
        const exercises = Object.entries(exerciseCounter)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count); // Sort by count descending

        monthlyAnalysis[month] = {
            year,
            month: monthNum,
            workoutCount: monthWorkouts.length,
            totalExercises,
            averageExercisesPerWorkout: totalExercises / monthWorkouts.length,
            exercises,
        };
    }

    // Print the analysis
    console.log('\n=== Monthly Workout Analysis ===\n');

    // Sort months chronologically
    const sortedMonths = Object.keys(monthlyAnalysis).sort();

    for (const month of sortedMonths) {
        const analysis = monthlyAnalysis[month];

        console.log(`📅 ${new Date(analysis.year, analysis.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
        console.log(`   Workouts: ${analysis.workoutCount}`);
        console.log(`   Average exercises per workout: ${analysis.averageExercisesPerWorkout.toFixed(1)}`);
        console.log(`   Most frequent exercises:`);

        // Show top 5 exercises
        const topExercises = analysis.exercises.slice(0, 5);
        for (const exercise of topExercises) {
            console.log(`     • ${exercise.name}: ${exercise.count} times`);
        }
        console.log('');
    }
}
