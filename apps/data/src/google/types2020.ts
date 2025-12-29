import { z } from 'zod';

export type CsvRow2020 = Record<string, unknown>;

export const ParsedRow2020Schema = z.object({
    date: z.string(),
    wk: z.string().optional(),
    sq: z.string(),
    bp: z.string(),
    op: z.string(),
    dl: z.string(),
    accessory1: z.string(),
    accessory2: z.string(),
    accessory3: z.string(),
    accessory4: z.string(),
    accessory5: z.string(),
});

export type ParsedRow2020 = z.infer<typeof ParsedRow2020Schema>;

export type UnitType = 'lbs' | 'kg';

export interface ParsedExercise {
    exerciseId: number;
    originalName: string;
    order: number;
    sets: {
        reps: number;
        weight: number;
        order: number;
    }[];
    volume: number;
}
