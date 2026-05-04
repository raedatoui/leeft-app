import { readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { logger } from '@leeft/utils';
import { config } from 'dotenv';
import { z } from 'zod';
import { parseSession, type Session, sessionTotalReps, sessionTotalSets, sessionVolume, toTrainHeroicJson } from './parser';

config();

const EXTRACT_PROMPT = `You will be shown one or more screenshots of a single Train Heroic workout session.

Extract every exercise into this exact text format and return ONLY that text — no markdown fences, no commentary:

<BLOCK>: <EXERCISE NAME>
<reps_csv> @ <weights_csv>lb

Rules:
- <BLOCK> is the letter (and optional digit) prefix shown next to the exercise (e.g. "A", "B", "F", "A1"). If no letter is shown, infer A, B, C, ... in vertical order.
- <EXERCISE NAME> is the exercise title exactly as printed (preserve casing and punctuation).
- <reps_csv> and <weights_csv> are comma-separated, in completed-set order, same length. Strip units except the trailing "lb".
- If a single set is shown as "N x R @ Wlb" (e.g. "1 x 44 @ 100lb"), output it in that exact form instead of CSVs.
- One blank line between exercises. No other text.
- Ignore any sets that were not completed (skip greyed-out / 0-rep entries).
- Convert kg to lb if the screenshot shows kg.`;

const VisionResponseSchema = z.object({
    content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
});

const MIME_TYPES: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
};

function mimeFor(path: string): string {
    const ext = extname(path).toLowerCase();
    const mime = MIME_TYPES[ext];
    if (!mime) {
        throw new Error(`Unsupported image extension: ${ext}`);
    }
    return mime;
}

async function extractTextFromImages(imagePaths: string[]): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY is not set');
    }

    const imageBlocks = imagePaths.map((path) => ({
        type: 'image',
        source: {
            type: 'base64',
            media_type: mimeFor(path),
            data: readFileSync(path).toString('base64'),
        },
    }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
            'x-api-key': apiKey,
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            messages: [
                {
                    role: 'user',
                    content: [...imageBlocks, { type: 'text', text: EXTRACT_PROMPT }],
                },
            ],
        }),
    });

    if (!response.ok) {
        throw new Error(`Vision API request failed: ${response.statusText}\n${await response.text()}`);
    }

    const data = VisionResponseSchema.parse(await response.json());
    const text = data.content.find((b) => b.type === 'text')?.text;
    if (!text) {
        throw new Error('No text content returned by vision API');
    }
    return text.trim();
}

export async function parseScreenshots(date: string, imagePaths: string[]): Promise<Session> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error(`Expected date in YYYY-MM-DD form, got ${JSON.stringify(date)}`);
    }
    if (imagePaths.length === 0) {
        throw new Error('At least one screenshot path is required');
    }

    logger.processing(`extracting workout text from ${imagePaths.length} screenshot(s)`);
    const extracted = await extractTextFromImages(imagePaths);
    logger.info(`Extracted text:\n${extracted}`);

    const session = parseSession(extracted, date);
    logger.processed(`parsed ${session.exercises.length} exercise(s)`);
    return session;
}

export function saveTrainHeroicWorkout(session: Session): string {
    if (!session.date) {
        throw new Error('Session date is required to save workout file');
    }
    const compactDate = session.date.replace(/-/g, '');
    const filename = join(__dirname, '..', '..', 'data', 'download', 'trainheroic', 'workouts', `workout-screenshot-${compactDate}.json`);
    const json = toTrainHeroicJson(session);
    writeFileSync(filename, JSON.stringify(json, null, 2));
    logger.saved(`workout to ${filename}`);
    return filename;
}

export async function runParseScreenshots(date: string, imagePaths: string[]): Promise<void> {
    const session = await parseScreenshots(date, imagePaths);
    saveTrainHeroicWorkout(session);
    logger.stats(`volume=${sessionVolume(session).toLocaleString()} lb  sets=${sessionTotalSets(session)}  reps=${sessionTotalReps(session)}`);
}
