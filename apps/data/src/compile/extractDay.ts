import { DEFAULT_COLUMN_UNITS, type SetUnit } from '@leeft/types';
import { defaultStartedAt, logger, normalizeToMidnightUTC, setsVolume } from '@leeft/utils';
import { v4 as uuidv4 } from 'uuid';
import { type BaseExercise, type BaseWorkout, BaseWorkoutSchema, type ColumnUnits, type RawWorkout } from './types';

type ParsedSet = { reps?: number; weight: number };
type RawExercise = RawWorkout['saved_workout']['workoutSets'][number]['workoutSetExercises'][number];

/** TrainHeroic's unit codes, decoded across the whole archive by cross-checking each code against
 *  the `abr` it rendered and the values it carried. `2` is `1` under another name — it differs
 *  only in that `abr` declines to print its weights at all, which is how nine Deficit Deadlift
 *  sets came to be logged at 0 lb. */
const PARAM_UNITS: Record<number, SetUnit> = {
    1: 'lb',
    2: 'lb',
    3: 'reps',
    4: 'time', // whole seconds; the parallel `param_N_data_M_time` {h,m,s} object says the same
    5: 'feet',
    7: 'inches',
    10: 'meters', // miles, in truth — but the one Run that used it is dropped by `trainheroic:hydrate`
    11: 'feet',
};

/**
 * Movements where your own bodyweight is most of the load, and the second column has meant two
 * different things over the years: early on the plate hung off you, from late 2024 the whole
 * system (bodyweight minus the assist stack, or plus a plate). TrainHeroic records no difference —
 * both are `param_2_type: 1` — but the scales don't overlap, so the magnitude separates them.
 *
 * Chin-Up ran `@ 5-25` through 2023 and `@ 115-240` from 2024; Pull-Up's two 2026 sessions are
 * `@ 15-25`. Nothing lands between, so the threshold needs no judgement at the boundary — and a
 * session that ever does gets reported rather than guessed at.
 *
 * Keeping the two apart is what stops `6 reps @ 10` and `6 reps @ 210` — the same lift, five years
 * apart — sharing a ladder 20x wide. Reconciling them properly would need a bodyweight for the
 * date, which nothing in the repo records.
 */
const ADDED_LOAD_BELOW: Record<string, number> = {
    'Chin-Up': 100,
    'Pull-Up': 100,
};

/**
 * Movements logged with bodyweight sitting in the load column, where it is a placeholder rather
 * than a measurement — a stair calf raise "@ 212 lb" is just Raed standing on a step. Left alone
 * it makes calves one of the largest lifts in the log on a bookkeeping artefact.
 *
 * The number that carries information is what was *held*, so the session's own baseline (its
 * lowest bodyweight-scale load) is subtracted and the remainder recorded as `bw+`: a session at
 * `212, 212, 237, 237` becomes `0, 0, 25, 25`, which is the 25 lb dumbbell picked up for the last
 * two sets. Sessions that only ever logged the dumbbell (`10, 15, 20`) are already the added load
 * and pass through untouched.
 *
 * This is the opposite of `ADDED_LOAD_BELOW`. There the big numbers are *effective load* — a
 * chin-up at 210 is genuinely you, hauled over a bar, and counts as tonnage. Here they are not.
 */
const BODYWEIGHT_IN_LOAD_COLUMN = new Set(['Stair Calves', 'Stair Calf Single Leg']);

/** Loads at or above this are bodyweight-scale rather than a plate someone is holding. */
const BODYWEIGHT_FLOOR = 150;

/** Literal slots, so the `param_N_data_M` key builds to an exact key rather than a `${number}`
 *  template TypeScript can't match against the schema. */
const PARAM_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/** Resolve a column's code, using its position to absorb TrainHeroic's own mislabels: it tagged
 *  four `@ 90, 135, 135 lb` columns as `reps` and one rep column as `lb`. A leading column never
 *  holds load, and a load column never holds reps, so position alone settles both. */
function paramUnit(code: number | undefined, column: 1 | 2): SetUnit | undefined {
    const unit = code === undefined ? undefined : PARAM_UNITS[code];
    if (!unit) return undefined;
    if (column === 1) return unit === 'lb' ? 'reps' : unit;
    return unit === 'reps' ? 'lb' : unit;
}

/** Read one exercise's sets straight from the param columns, which state their own units, rather
 *  than re-deriving them from the `abr` display string. Returns undefined when the entry carries
 *  no params at all (four workouts in the archive), leaving `parseAbr` to handle it. */
export function parseParams(exercise: RawExercise): { units: ColumnUnits; sets: ParsedSet[] } | undefined {
    const reps = paramUnit(exercise.param_1_type, 1);
    if (!reps) return undefined;
    const weight = paramUnit(exercise.param_2_type, 2);

    const column = (col: 1 | 2): number[] => {
        const values: number[] = [];
        for (const slot of PARAM_SLOTS) {
            const raw = exercise[`param_${col}_data_${slot}`];
            if (raw === undefined || raw === '') continue;
            const value = typeof raw === 'number' ? raw : Number.parseFloat(raw);
            if (!Number.isNaN(value)) values.push(value);
        }
        return values;
    };

    const firsts = column(1);
    const loads = column(2);
    if (firsts.length === 0) return undefined;

    // A single load repeated across every set is written once; carry it forward.
    const loadFor = (i: number) => (loads.length === 0 ? 0 : (loads[Math.min(i, loads.length - 1)] ?? 0));

    // Distinguish a plate hung off you from the whole system, which TrainHeroic records alike.
    let load = weight ?? 'none';
    const threshold = ADDED_LOAD_BELOW[exercise.exercise_title];
    if (load === 'lb' && threshold !== undefined && loads.length > 0) {
        const heaviest = Math.max(...loads);
        if (heaviest > 0 && heaviest < threshold) load = 'bw+';
    }

    // Strip a bodyweight placeholder back to what was actually held.
    let baseline = 0;
    if (load === 'lb' && BODYWEIGHT_IN_LOAD_COLUMN.has(exercise.exercise_title)) {
        const bodyweightScale = loads.filter((v) => v >= BODYWEIGHT_FLOOR);
        baseline = bodyweightScale.length > 0 ? Math.min(...bodyweightScale) : 0;
        load = 'bw+';
    }

    return {
        units: { reps, weight: load },
        sets: firsts.map((value, i) => ({ reps: value, weight: Math.max(0, loadFor(i) - baseline) })),
    };
}

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
        // Durations, as either "1 x 11:00" or a bare list "1:15, 1:05, 1:10". Both land as whole
        // seconds in the first column; the owning exercise's `units.reps` says they're a time.
        const toSeconds = (mmss: string): number => {
            const [minutes, seconds] = mmss.split(':').map((part) => Number.parseFloat(part.trim()));
            return (minutes ?? 0) * 60 + (seconds ?? 0);
        };
        const weightAt = (i: number) => (weights.length > 0 ? (weights[i % weights.length] ?? 0) : 0);
        if (repsSetsPart.includes('x')) {
            const [setsCount, time] = repsSetsPart.split('x').map((part) => part.trim());
            if (!setsCount || !time) throw new Error(`Invalid sets count in abr: ${abr}`);
            for (let i = 0; i < Number.parseInt(setsCount, 10); i++) {
                sets.push({ reps: toSeconds(time), weight: weightAt(i) });
            }
        } else {
            repsSetsPart.split(',').forEach((time, i) => {
                sets.push({ reps: toSeconds(time), weight: weightAt(i) });
            });
        }
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
                        // Prefer the params: they state their own units, and `abr` renders them
                        // lossily. Fall back to the string only where no params exist at all.
                        const parsed = parseParams(exercise) ?? {
                            units: DEFAULT_COLUMN_UNITS,
                            sets: parseAbr(exercise.abr, `${saved_workout.title} · ${exercise.exercise_title} (id ${exercise.exercise_id})`),
                        };
                        const sets = parsed.sets.map((set, index) => ({ ...set, order: index }));
                        // Use ws.order for the first exercise, then increment for subsequent exercises
                        const exerciseOrder = exerciseIndex === 0 ? ws.order : ++nextOrder;
                        if (exerciseIndex === 0) {
                            nextOrder = ws.order;
                        }
                        return {
                            exerciseId: exercise.exercise_id,
                            order: exerciseOrder,
                            units: parsed.units,
                            sets,
                            volume: setsVolume(sets, parsed.units),
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
                existingExercise.volume = setsVolume(existingExercise.sets, existingExercise.units);
                return acc;
            }

            // Add volume calculation for new exercises
            curr.volume = setsVolume(curr.sets, curr.units);
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
