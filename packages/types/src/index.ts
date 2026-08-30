import { z } from "zod";

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
					}),
				),
			}),
		),
	}),
	date: z.string(),
});

export const BaseExerciseMetadataSchema = z.object({
	id: z.number(),
	name: z.string(),
	slug: z.string(),
	videoUrl: z.string().nullable(),
	category: z.string(),
	equipment: z.array(z.string()),
	description: z.string().optional(),
	originalMuscleGroup: z.string().optional(),
});

export const ExerciseMetadataSchema = BaseExerciseMetadataSchema.extend({
	primaryMuscleGroup: z.string(),
});

export const BaseSetSchema = z.object({
	reps: z.number().optional(),
	time: z.string().optional(),
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
