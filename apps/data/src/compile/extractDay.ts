import { logger, normalizeToMidnightUTC } from '@leeft/utils';
import { v4 as uuidv4 } from 'uuid';
import { type BaseExercise, type BaseWorkout, BaseWorkoutSchema, type RawWorkout } from './types';

type ParsedSet = { reps?: number; time?: string; weight: number };

export function parseAbr(abr: string): ParsedSet[] {
    let repsSetsPart: string;
    let weightsPart: string | undefined;
    if (abr.includes('@')) {
        [repsSetsPart, weightsPart] = abr.split('@').map((part) => part.trim());
    } else {
        repsSetsPart = abr.trim();
        weightsPart = undefined; // No weights part specified
    }

    const sets: ParsedSet[] = [];
    let weights: number[] = [];

    if (weightsPart) {
        weights = weightsPart.split(',').map((w) => Number.parseFloat(w.trim()));
    }

    if (repsSetsPart.includes(':')) {
        // Handle time format, e.g., "1 x 11:00"
        const [setsCount, time] = repsSetsPart.split('x').map((part) => part.trim());
        const defaultWeight = weights.length > 0 ? weights[0] : 0;
        for (let i = 0; i < Number.parseInt(setsCount, 10); i++) {
            sets.push({ time, weight: weights[i % weights.length] || defaultWeight });
        }
    } else if (repsSetsPart.includes('x')) {
        // Format like "nxm"
        const [setsCount, reps] = repsSetsPart.split('x').map(Number);
        for (let i = 0; i < setsCount; i++) {
            const weight = weights.length > 0 ? weights[i % weights.length] : 0;
            sets.push({ reps, weight });
        }
    } else {
        // Explicit list of reps
        const repsList = repsSetsPart.split(',').map(Number);
        repsList.forEach((reps, index) => {
            const weight = weights.length > 0 ? weights[index % weights.length] : 0;
            sets.push({ reps, weight });
        });
    }

    return sets;
}

export function parseTrainHeroicWorkout(rawWorkout: RawWorkout): BaseWorkout {
    const { saved_workout, date } = rawWorkout;
    let durationMinutes = Math.round((saved_workout.timestamp_completed - saved_workout.timestamp_started) / 60);
    if (durationMinutes > 200) {
        logger.warning(`Very long duration: ${date}, ${durationMinutes} minutes`);
        durationMinutes = 100;
    }
    if (durationMinutes === 0) durationMinutes = 100;

    const savedWorkoutTitle = normalizeToMidnightUTC(new Date(saved_workout.title));
    // Ensure it's a valid date
    if (Number.isNaN(savedWorkoutTitle.getTime())) {
        throw new Error(`Invalid date format in workout title: ${saved_workout.title}`);
    }

    let nextOrder = 0;
    const exercises = saved_workout.workoutSets
        .sort((a, b) => a.order - b.order)
        .flatMap((ws) => {
            // Process all exercises in the workout set (handles supersets, tri-sets, etc.)
            return (
                ws.workoutSetExercises
                    //.sort((a, b) => a.order - b.order)
                    .map((exercise, exerciseIndex) => {
                        const sets = parseAbr(exercise.abr).map((set, index) => ({
                            ...set,
                            order: index,
                        }));
                        // Use ws.order for the first exercise, then increment for subsequent exercises
                        const exerciseOrder = exerciseIndex === 0 ? ws.order : ++nextOrder;
                        if (exerciseIndex === 0) {
                            nextOrder = ws.order;
                        }
                        return {
                            exerciseId: exercise.exercise_id,
                            order: exerciseOrder,
                            sets,
                            volume: sets.reduce((total, set) => total + (set.reps || 0) * set.weight, 0),
                        };
                    })
            );
        })
        // Combine exercises with same ID
        .reduce<BaseExercise[]>((acc, curr) => {
            const existingExercise = acc.find((ex) => ex.exerciseId === curr.exerciseId);

            if (existingExercise) {
                // Combine sets and reorder them
                existingExercise.sets = [...existingExercise.sets, ...curr.sets].map((set, index) => ({
                    ...set,
                    order: index,
                }));
                // Update volume
                existingExercise.volume = existingExercise.sets.reduce((total, set) => total + (set.reps || 0) * set.weight, 0);
                return acc;
            }

            // Add volume calculation for new exercises
            curr.volume = curr.sets.reduce((total, set) => total + (set.reps || 0) * set.weight, 0);
            acc.push(curr);
            return acc;
        }, []);

    return BaseWorkoutSchema.parse({
        uuid: uuidv4(),
        date: savedWorkoutTitle,
        title: rawWorkout.saved_workout.title,
        duration: durationMinutes,
        rpe: saved_workout.rpe,
        exercises,
        volume: exercises.reduce((total, ex) => total + ex.volume, 0),
    });
}
