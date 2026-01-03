import type { Exercise, SetDetail } from '@/types';
import type { EditedExercise, EditedSet } from './types';

export function generateEditCommand(workoutTitle: string, exerciseId: number, sets: EditedSet[]): string {
    const reps = sets.map((s) => s.reps ?? '').join(',');
    const weights = sets.map((s) => Math.round(s.weight)).join(',');
    const setsStr = `${reps}@${weights}`;
    return `bun src/edit/index.ts edit-workout --date="${workoutTitle}" --exercise=${exerciseId} --sets="${setsStr}"`;
}

export function generateSwapCommand(workoutTitle: string, fromId: number, toId: number): string {
    return `bun src/edit/index.ts swap-exercise --date="${workoutTitle}" --exercise=${fromId} --to=${toId}`;
}

export function generateAddExerciseCommand(workoutTitle: string, exerciseId: number, sets: EditedSet[]): string {
    const reps = sets.map((s) => s.reps ?? '').join(',');
    const weights = sets.map((s) => Math.round(s.weight)).join(',');
    const setsStr = `${reps}@${weights}`;
    return `bun src/edit/index.ts add-exercise --date="${workoutTitle}" --exercise=${exerciseId} --sets="${setsStr}"`;
}

export function generateCombinedCommand(workoutTitle: string, exercise: Exercise, editedExercise: EditedExercise): string {
    const commands: string[] = [];

    // Check if swap is needed
    if (editedExercise.newExerciseId && editedExercise.newExerciseId !== exercise.exerciseId) {
        commands.push(generateSwapCommand(workoutTitle, exercise.exerciseId, editedExercise.newExerciseId));
    }

    const targetId = editedExercise.newExerciseId ?? exercise.exerciseId;

    // Check if sets are edited
    let setsChanged = false;
    if (exercise.sets.length !== editedExercise.sets.length) {
        setsChanged = true;
    } else {
        for (let i = 0; i < exercise.sets.length; i++) {
            const s = exercise.sets[i];
            const e = editedExercise.sets[i];
            if (s.reps !== e.reps || s.weight !== e.weight) {
                setsChanged = true;
                break;
            }
        }
    }

    if (setsChanged) {
        // If we swapped, we must target the NEW ID
        const reps = editedExercise.sets.map((s) => s.reps ?? '').join(',');
        const weights = editedExercise.sets.map((s) => Math.round(s.weight)).join(',');
        const setsStr = `${reps}@${weights}`;
        commands.push(`bun src/edit/index.ts edit-workout --date="${workoutTitle}" --exercise=${targetId} --sets="${setsStr}"`);
    }

    if (commands.length === 0) {
        if (editedExercise.newExerciseId) {
            return generateSwapCommand(workoutTitle, exercise.exerciseId, editedExercise.newExerciseId);
        }
        return generateEditCommand(workoutTitle, exercise.exerciseId, editedExercise.sets);
    }

    return commands.join('\n');
}

export function initEditedExercise(exercise: Exercise): EditedExercise {
    return {
        exerciseId: exercise.exerciseId,
        sets: exercise.sets.map((s) => ({
            reps: s.reps,
            weight: s.weight,
        })),
    };
}

export const formatExerciseName = (name: string) => {
    const words = name.split(' ');
    if (words.length < 4) return name;
    if (words.length === 4) {
        return (
            <>
                {words.slice(0, 2).join(' ')}
                <br />
                {words.slice(2).join(' ')}
            </>
        );
    }
    return (
        <>
            {words.slice(0, 3).join(' ')}
            <br />
            {words.slice(3).join(' ')}
        </>
    );
};

export const _findMaxWeightSet = (sets: SetDetail[]) => {
    return Math.max(...sets.map((set) => set.weight || 0));
};
