import { z } from 'zod';

export type CsvRow = Record<string, unknown>;

export type RowError = {
    code: string;
    row: number;
    message: string;
    originalRow: string;
};

export const ParsedRowSchema = z.object({
    date: z.string(),
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

export type ParsedRow = z.infer<typeof ParsedRowSchema>;
