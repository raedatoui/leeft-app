import { defaultStartedAt, logger, normalizeToMidnightUTC } from '@leeft/utils';
import { v4 as uuidv4 } from 'uuid';
import { type BaseExercise, type BaseWorkout, BaseWorkoutSchema, type RawWorkout } from './types';

type ParsedSet = { reps?: number; time?: string; weight: number };

export function parseAbr(abr: string, context = ''): ParsedSet[] {
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
        weights = weightsPart.split(',').map((token) => {
            const weight = Number.parseFloat(token.trim());
            if (Number.isNaN(weight)) {
                logger.warning(`Non-numeric weight "${token.trim()}" in abr "${abr}"${context ? ` (${context})` : ''} — treating as 0 (bodyweight)`);
                return 0;
            }
            return weight;
        });
    }

    if (repsSetsPart.includes(':')) {
        // Handle time format, e.g., "1 x 11:00"
        const [setsCount, time] = repsSetsPart.split('x').map((part) => part.trim());
        if (setsCount) {
            const defaultWeight = weights.length > 0 ? weights[0] : 0;
            for (let i = 0; i < Number.parseInt(setsCount, 10); i++) {
                const weight = (weights.length > 0 ? weights[i % weights.length] : defaultWeight) ?? 0;
                sets.push({ time, weight });
            }
        } else throw new Error(`Invalid sets count in abr: ${abr}`);
    } else if (repsSetsPart.includes('x')) {
        // Format like "nxm"
        const [setsCount, reps] = repsSetsPart.split('x').map(Number);
        if (setsCount) {
            for (let i = 0; i < setsCount; i++) {
                const weight = (weights.length > 0 ? weights[i % weights.length] : 0) ?? 0;
                sets.push({ reps, weight });
            }
        } else throw new Error(`Invalid sets count in abr: ${abr}`);
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

    // Real session start. `timestamp_started` is unreliable (sometimes a re-sync time,
    // landing hours or days after the session actually started — confirmed across the
    // downloaded TrainHeroic archive, where it fails this in ~37% of workouts), so prefer
    // the earliest per-set `date_completed` (UTC strings) on the title day when available;
    // else fall back to `timestamp_started` if it lands on the title day; else a noon-ET default.
    const titleDayKey = savedWorkoutTitle.toISOString().slice(0, 10);
    const onTitleDay = (d: Date): boolean => !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === titleDayKey;
    let startedAt: Date | undefined;
    const fromSets = saved_workout.workoutSets
        .map((ws) => ws.date_completed)
        .filter((s): s is string => !!s)
        .map((s) => new Date(`${s.replace(' ', 'T')}Z`))
        .filter(onTitleDay)
        .sort((a, b) => a.getTime() - b.getTime());
    if (fromSets.length > 0) startedAt = fromSets[0];
    if (!startedAt && saved_workout.timestamp_started) {
        const fromTs = new Date(saved_workout.timestamp_started * 1000);
        if (onTitleDay(fromTs)) startedAt = fromTs;
    }
    if (!startedAt) startedAt = defaultStartedAt(savedWorkoutTitle);

    let nextOrder = 0;
    const exercises = saved_workout.workoutSets
        .sort((a, b) => a.order - b.order)
        .flatMap((ws) => {
            // Process all exercises in the workout set (handles supersets, tri-sets, etc.)
            return (
                ws.workoutSetExercises
                    //.sort((a, b) => a.order - b.order)
                    .map((exercise, exerciseIndex) => {
                        const sets = parseAbr(exercise.abr, `${saved_workout.title} · ${exercise.exercise_title} (id ${exercise.exercise_id})`).map(
                            (set, index) => ({
                                ...set,
                                order: index,
                            })
                        );
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
        startedAt,
        title: rawWorkout.saved_workout.title,
        duration: durationMinutes,
        rpe: saved_workout.rpe,
        readiness: saved_workout.readiness,
        exercises,
        volume: exercises.reduce((total, ex) => total + ex.volume, 0),
    });
}
