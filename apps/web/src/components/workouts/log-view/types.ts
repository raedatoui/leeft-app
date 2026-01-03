import type { ExerciseMap, Workout } from '@/types';

export interface WorkoutLogViewProps {
    workouts: Workout[];
    exerciseMap: ExerciseMap;
    isLoading: boolean;
    error: Error | null;
}
