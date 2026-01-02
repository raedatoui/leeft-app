import type { ExerciseMetadata, Workout } from '@/types';

export interface WorkoutTableProps {
    workout: Workout;
    exerciseMap: Map<string, ExerciseMetadata>;
    selectedExercise?: ExerciseMetadata;
    showFullWorkout?: boolean;
    onToggleFullWorkout?: () => void;
    miniMode: boolean;
    maxHeight?: string;
    cycleId?: string;
    onExerciseClick?: (id: string) => void;
    muscleGroupFilter?: string | null;
    includeWarmup?: boolean;
}

export interface EditedSet {
    reps: number | undefined;
    weight: number;
}

export interface EditedExercise {
    exerciseId: number;
    newExerciseId?: number;
    sets: EditedSet[];
}
