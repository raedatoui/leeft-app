import { z } from 'zod';

// Zod schema for a single item
export const WorkoutItemSchema = z.object({
    id: z.number(),
    program_id: z.number(),
    personal_cal: z.number(),
    program_title: z.string(),
    workout_id: z.number(),
    workout_title: z.string(),
    year: z.number(),
    month: z.number(),
    day: z.number(),
    date: z.string(),
    datePretty: z.string(),
    team_id: z.number(),
    team_title: z.string(),
    team_logo: z.string(),
    team_slug: z.string(),
    team_org_id: z.number().nullable(),
    group_team_subscription_id: z.number().nullable(),
    feed_publish_workouts: z.boolean(),
    restrict_access: z.boolean(),
    session: z.number(),
    date_rescheduled: z.number().or(z.string()).nullable(),
    feed_item_id: z.number(),
});

export const WorkoutItemsSchema = z.array(WorkoutItemSchema);

export type WorkoutItem = z.infer<typeof WorkoutItemSchema>;
