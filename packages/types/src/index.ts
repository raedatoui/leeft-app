import { z } from "zod";

export const RawWorkoutSchema = z.object({
	saved_workout: z.object({
		title: z.string(),
		timestamp_started: z.number(),
		timestamp_completed: z.number(),
		rpe: z.number().nullable(),
		workoutSets: z.array(
			z.object({
				order: z.number(),
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

export const ExerciseMetadataSchema = z.object({
	id: z.number(),
	name: z.string(),
	slug: z.string(),
	videoUrl: z.string().nullable(),
	category: z.string(),
	primaryMuscleGroup: z.string(),
	equipment: z.array(z.string()),
	description: z.string().optional(),
});

export const BaseSetSchema = z.object({
	reps: z.number().optional(),
	time: z.string().optional(),
	weight: z.number(),
	order: z.number(),
});

export const SetSchema = BaseSetSchema.extend({
	isWorkSet: z.boolean(),
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
	title: z.string(),
	duration: z.number(),
	rpe: z.number().nullable(),
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

export const CycleSchema = z.object({
	type: z.enum(["strength", "break", "hypertrophy", "maintenance"]),
	uuid: z.uuid(),
	name: z.string(),
	location: z.string().optional(),
	dates: z
		.array(z.preprocess((val) => new Date(val as string), z.date()))
		.length(2),
	workouts: z.array(z.uuid()).optional(),
	note: z.string().optional(),
});

export const MappedCycleSchema = CycleSchema.extend({
	name: z.string(),
	location: z.string().optional(),
	dates: z
		.array(z.preprocess((val) => new Date(val as string), z.date()))
		.length(2),
	note: z.string().optional(),
	workouts: z.array(WorkoutSchema),
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
