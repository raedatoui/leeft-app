import { z } from "zod";

/** TrainHeroic stores a column's per-set values as ten flat `param_N_data_M` keys rather than an
 *  array; ten is its own per-exercise set cap. Unused slots come through as `""`. The mapped type
 *  hands zod the literal key names, so the decoder can index them without a cast. */
type ParamSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
type ParamColumn<C extends 1 | 2> = {
	[K in `param_${C}_data_${ParamSlot}`]: z.ZodOptional<
		z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>
	>;
};

const paramColumn = <C extends 1 | 2>(col: C): ParamColumn<C> =>
	Object.fromEntries(
		Array.from({ length: 10 }, (_, i) => [
			`param_${col}_data_${i + 1}`,
			z.union([z.string(), z.number()]).optional(),
		]),
	) as ParamColumn<C>;

export const RawWorkoutSchema = z.object({
	saved_workout: z.object({
		title: z.string(),
		timestamp_started: z.number(),
		timestamp_completed: z.number(),
		rpe: z.number().nullable(),
		// Not from TrainHeroic's API — written into the archive by `trainheroic:hydrate` from the
		// account export, which is the only place the readiness survey exists.
		readiness: z.record(z.string(), z.number()).optional(),
		workoutSets: z.array(
			z.object({
				order: z.number(),
				date_completed: z.string().optional(),
				workoutSetExercises: z.array(
					z.object({
						exercise_id: z.number(),
						abr: z.string(),
						video_url: z.string().optional(),
						exercise_title: z.string(),
						// The unit codes, and the only statement of them TrainHeroic makes. `abr` is a
						// display string that renders them lossily — it omits the weights entirely for
						// `param_2_type: 2`, and drops the ` lb` suffix on jumps — so these are the
						// source of truth. Decoded in `paramUnit` (apps/data/src/compile/extractDay.ts).
						param_count: z.number().optional(),
						param_1_type: z.number().optional(),
						param_2_type: z.number().optional(),
						...paramColumn(1),
						...paramColumn(2),
					}),
				),
			}),
		),
	}),
	date: z.string(),
});

/** What a set column holds. `reps`/`time` lead; `lb`/`bw+`/`none` load; distances take either.
 *  Mirrored by hand in apps/web/src/lib/setUnits.ts and
 *  apps/native/Sources/Views/UnitPickerSheet.swift. */
export const SetUnitSchema = z.enum([
	"reps",
	"time",
	"lb",
	// Pounds actually moved on an assisted machine, i.e. below bodyweight — 165 is you at 215
	// with 50 lb of counterweight. Numerically the same kind of thing as `lb`, and it counts as
	// tonnage, but it is held apart so an assisted set never ranks against an unweighted one.
	"assisted",
	// Load added on top of bodyweight, rather than the total load moved. Kept apart from `lb`
	// because the two are different scales: a chin-up "@ 10" and a chin-up "@ 210" are the same
	// lift. Reconciling them would need a bodyweight for the date, which nothing records.
	"bw+",
	"none",
	"feet",
	"inches",
	"meters",
]);

export const ColumnUnitsSchema = z.object({
	reps: SetUnitSchema,
	weight: SetUnitSchema,
});

export const DEFAULT_COLUMN_UNITS: ColumnUnits = { reps: "reps", weight: "lb" };

/** Whether the load column is pounds actually moved, and so real tonnage. True for `lb` and for
 *  `assisted` — 165 lb hauled with a counterweight is still 165 lb hauled. False for seconds,
 *  feet, box height and `bw+`, which render but never sum.
 *
 *  This is not the same question as which record ladder a set belongs to: `lb` and `assisted` are
 *  both tonnage yet rank separately (see `ladderOf` in computePersonalRecords). */
export const isLoaded = (units: ColumnUnits): boolean =>
	units.reps === "reps" && (units.weight === "lb" || units.weight === "assisted");

/** Settle the load column against what was actually logged: a weight box left at zero for every
 *  set is a bodyweight movement, not a lift at 0 lb. Without this, chin-ups and dead bugs sit on
 *  the pounds ladder and take turns setting 0 lb records against each other. */
export const resolveUnits = (
	units: ColumnUnits,
	sets: { weight: number }[],
): ColumnUnits => {
	const load = units.weight === "lb" || units.weight === "bw+";
	return load && sets.length > 0 && sets.every((s) => s.weight === 0)
		? { ...units, weight: "none" }
		: units;
};

export const BaseExerciseMetadataSchema = z.object({
	id: z.number(),
	name: z.string(),
	slug: z.string(),
	videoUrl: z.string().nullable(),
	category: z.string(),
	equipment: z.array(z.string()),
	description: z.string().optional(),
	originalMuscleGroup: z.string().optional(),
	// Seeds the unit picker for a new logged exercise. A default only — what a past session
	// actually measured lives on that session's exercise, so editing this never rewrites history.
	measurement: ColumnUnitsSchema.optional(),
});

export const ExerciseMetadataSchema = BaseExerciseMetadataSchema.extend({
	primaryMuscleGroup: z.string(),
});

export const BaseSetSchema = z.object({
	// The first column's value. What it counts is `units.reps` on the owning exercise: reps by
	// default, otherwise whole seconds, feet or inches. (There was a separate `time: string`
	// field holding "11:00"; nothing read it and its parser dropped comma-separated times, so
	// durations now ride here as seconds.)
	reps: z.number().optional(),
	// The second column's value, read through `units.weight`.
	weight: z.number(),
	order: z.number(),
});

export const SetSchema = BaseSetSchema.extend({
	isWorkSet: z.boolean(),
	// True only on sets that were a PR-at-the-time (per exact rep count). Absent otherwise.
	isPR: z.boolean().optional(),
	// Display tier for a PR set: allTime = heaviest set ever (any rep count);
	// active = current record for this rep count; beaten = later surpassed. Present iff isPR.
	prTier: z.enum(["allTime", "active", "beaten"]).optional(),
});

export const BaseExerciseSchema = z.object({
	exerciseId: z.number(),
	order: z.number(),
	// What this session's two set columns were measuring. It sits here rather than on the catalog
	// because one exercise changes basis across sessions — Chin-Up is logged bare, `bw+` and `lb`
	// in different years.
	//
	// Defaulted rather than required: published CDN artifacts and Firestore documents written
	// before the unit pickers existed carry no `units`, and the app parses those with this very
	// schema. A bare `ColumnUnitsSchema` would reject every one of them. `.default()` keeps the
	// field non-optional downstream, so no consumer needs a fallback.
	units: ColumnUnitsSchema.default({ reps: "reps", weight: "lb" }),
	sets: z.array(BaseSetSchema),
	volume: z.number(),
});

export const ExerciseSchema = BaseExerciseSchema.extend({
	sets: z.array(SetSchema),
	workVolume: z.number(),
});

export const BaseWorkoutSchema = z.object({
	uuid: z.uuid(),
	date: z.date(),
	// Real session start instant (UTC). Falls back to a noon-ET default when the
	// source lacks a real time (see defaultStartedAt). `date` stays the day-key.
	startedAt: z.coerce.date().optional(),
	title: z.string(),
	duration: z.number(),
	rpe: z.number().nullable(),
	// The 1–5 pre-session survey, when the source has one. TrainHeroic days carry
	// sleep/mood/energy/stress/soreness, hydrated into the raw archive from the account export;
	// app-logged days carry the keys the /add flow asks for.
	readiness: z.record(z.string(), z.number()).optional(),
	exercises: z.array(BaseExerciseSchema),
	volume: z.number(),
});

export const WorkoutSchema = BaseWorkoutSchema.extend({
	exercises: z.array(ExerciseSchema),
	workVolume: z.number(),
});

export const MappedWorkoutSchema = WorkoutSchema.extend({
	selected: ExerciseSchema,
	weight: z.number(),
});

export type RepRange = {
	min: number;
	max: number;
};

const DatePreprocess = z.preprocess((val) => new Date(val as string), z.date());

export const CycleSchema = z.object({
	type: z.enum(["strength", "break", "hypertrophy", "maintenance"]),
	uuid: z.uuid(),
	name: z.string(),
	location: z.string().optional(),
	dates: z.tuple([DatePreprocess, DatePreprocess]),
	workouts: z.array(z.uuid()).optional(),
	note: z.string().optional(),
});

export const MappedCycleSchema = CycleSchema.extend({
	name: z.string(),
	location: z.string().optional(),
	dates: z.tuple([DatePreprocess, DatePreprocess]),
	note: z.string().optional(),
	workouts: z.array(WorkoutSchema),
});

// Cardio workout types
export const EffortSchema = z.object({
	minutes: z.number(),
	name: z.enum(["sedentary", "lightly", "fairly", "very"]),
});

export const CardioTypeEnum = z.enum([
	"Run",
	"Swim",
	"Treadmill run",
	"HIIT",
	"Aerobic Workout",
	"Outdoor Bike",
	"Rowing machine",
	"Elliptical",
	"Bike",
	"Walk",
	"Circuit Training",
	"Interval Workout",
	"Bootcamp",
	"Aerobics",
	"Basketball",
	"Sport",
]);

export const CardioWorkoutSchema = z.object({
	uuid: z.string().uuid(),
	date: z.date(),
	// Real activity start instant (preserves Fitbit's offset). `date` stays the day-key.
	startedAt: z.coerce.date().optional(),
	// Every logged activity type is exposed; CardioTypeEnum is only the known/styled set.
	type: z.string(),
	durationMs: z.number(),
	durationMin: z.number(),
	loggedBy: z.enum(["tracker", "manual", "auto_detected"]),
	zoneMinutes: z.number().optional(),
	// Per-HR-zone minutes breakdown (from Fitbit activeZoneMinutes).
	hrZones: z
		.object({
			outOfRange: z.number(),
			fatBurn: z.number(),
			cardio: z.number(),
			peak: z.number(),
		})
		.optional(),
	effort: z.array(EffortSchema).optional(),
	calories: z.number().optional(),
	averageHeartRate: z.number().optional(),
	steps: z.number().optional(),
	distance: z.number().optional(),
	pace: z.number().optional(),
});

// Combined day workout (lifting + cardio for same day)
export const DayWorkoutSchema = z.object({
	date: z.date(),
	liftingWorkouts: z.array(WorkoutSchema),
	cardioWorkouts: z.array(CardioWorkoutSchema),
});

// Slider items are now day-based
export const SliderWorkoutItemSchema = DayWorkoutSchema;

export const GroupedCardioSchema = z.object({
	date: z.string(),
	workouts: z.array(CardioWorkoutSchema),
});

export const MobilityConfEnum = z.enum(["High", "Med", "Low"]);

export const MobilityMovementSchema = z.object({
	name: z.string(),
	aliases: z.string(),
	region: z.string(),
	type: z.string(),
	position: z.string(),
	equipment: z.string(),
	target: z.string(),
	dosage: z.string(),
	video: z.string(),
	source: z.string(),
	conf: MobilityConfEnum,
	notes: z.string(),
	id: z.string(),
	equip_tags: z.array(z.string()),
	status: z.enum(["active", "removed"]),
	removedAt: z.string().optional(),
});

export type SetUnit = z.infer<typeof SetUnitSchema>;
export type ColumnUnits = z.infer<typeof ColumnUnitsSchema>;
export type RawWorkout = z.infer<typeof RawWorkoutSchema>;
export type ExerciseMetadata = z.infer<typeof ExerciseMetadataSchema>;
export type BaseSet = z.infer<typeof BaseSetSchema>;
export type BaseExercise = z.infer<typeof BaseExerciseSchema>;
export type BaseWorkout = z.infer<typeof BaseWorkoutSchema>;
export type Exercise = z.infer<typeof ExerciseSchema>;
export type SetDetail = z.infer<typeof SetSchema>;
export type Workout = z.infer<typeof WorkoutSchema>;
export type ExerciseMap = Map<string, ExerciseMetadata>;
export type MappedWorkout = z.infer<typeof MappedWorkoutSchema>;
export type Cycle = z.infer<typeof CycleSchema>;
export type MappedCycle = z.infer<typeof MappedCycleSchema>;
export type Effort = z.infer<typeof EffortSchema>;
export type CardioType = z.infer<typeof CardioTypeEnum>;
export type CardioWorkout = z.infer<typeof CardioWorkoutSchema>;
export type GroupedCardio = z.infer<typeof GroupedCardioSchema>;
export type DayWorkout = z.infer<typeof DayWorkoutSchema>;
export type SliderWorkoutItem = z.infer<typeof SliderWorkoutItemSchema>;
export type MobilityConf = z.infer<typeof MobilityConfEnum>;
export type MobilityMovement = z.infer<typeof MobilityMovementSchema>;
