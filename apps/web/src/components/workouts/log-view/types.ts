import type { DayWorkout, ExerciseMap } from '@/types';

export interface WorkoutLogViewProps {
    workouts: DayWorkout[];
    exerciseMap: ExerciseMap;
    isLoading: boolean;
    error: Error | null;
}
