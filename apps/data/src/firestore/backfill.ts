import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '@leeft/utils';
import { z } from 'zod';
import { type Workout, WorkoutSchema } from '../compile/types';
import { accessToken, DOCUMENTS_PATH, encodeFields, HISTORY_COLLECTION, PROJECT_ID } from './shared';

const BATCH_WRITE_URL = `https://firestore.googleapis.com/v1/${DOCUMENTS_PATH}:batchWrite`;
// batchWrite caps at 500 writes per request.
const BATCH_SIZE = 250;
// Codes a doc that already exists comes back with when it fails the `exists: false` precondition.
const EXISTS_CODES = new Set([6, 9]); // ALREADY_EXISTS, FAILED_PRECONDITION

function readCompiledLog(): Workout[] {
    const filePath = join(__dirname, '../', '../', 'data', 'out', 'lifting-log.json');
    const content = JSON.parse(readFileSync(filePath, 'utf8'));
    return (
        z
            .object({ workouts: z.array(z.any()) })
            .parse(content)
            // `date` is a strict z.date(); `startedAt` is z.coerce.date() and takes the ISO string.
            .workouts.map((workout) => WorkoutSchema.parse({ ...workout, date: new Date(workout.date) }))
    );
}

/**
 * Writes the compiled lifting log into `lifting-history`, one doc per day keyed `YYYY-MM-DD`.
 *
 * This is the iOS History tab's read store, and a pure projection: every document is derived from
 * `lifting-log.json`, nothing else writes here, and the live `lifting-workouts` collection the apps
 * write to is left untouched. Days already present are skipped so a first run is resumable;
 * `--overwrite` republishes them, which is the right mode once the log has been recompiled and PR
 * tiers have shifted.
 */
export async function backfillLiftingWorkouts(): Promise<void> {
    const overwrite = process.argv.includes('--overwrite');
    const byDay = new Map<string, Workout>();
    for (const workout of readCompiledLog()) {
        // Same UTC day key the rest of the app groups by.
        const day = workout.date.toISOString().slice(0, 10);
        const existing = byDay.get(day);
        if (existing) {
            // One doc per day — two workouts sharing a key can't both be written.
            logger.warning(`Duplicate day ${day} in the compiled log — keeping ${existing.uuid}, skipping ${workout.uuid}`);
            continue;
        }
        byDay.set(day, workout);
    }

    const entries = [...byDay.entries()];
    logger.uploading(`${entries.length} workouts to ${HISTORY_COLLECTION} — ${overwrite ? 'overwriting' : 'skipping'} days that already exist`);
    if (overwrite) {
        logger.warning('--overwrite republishes every day from the compiled log; anything edited directly in Firestore is lost');
    }

    const token = accessToken();
    let written = 0;
    let skipped = 0;
    const failures: string[] = [];

    for (let index = 0; index < entries.length; index += BATCH_SIZE) {
        const chunk = entries.slice(index, index + BATCH_SIZE);
        const writes = chunk.map(([day, workout]) => ({
            update: { name: `${DOCUMENTS_PATH}/${HISTORY_COLLECTION}/${day}`, fields: encodeFields(workout) },
            ...(overwrite ? {} : { currentDocument: { exists: false } }),
        }));

        const response = await fetch(BATCH_WRITE_URL, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ writes }),
        });

        if (response.status === 401 || response.status === 403) {
            throw new Error(
                `Firestore returned ${response.status}. Run \`gcloud auth login\` and check that the account has a role on ${PROJECT_ID}, or set TOKEN=<access-token>.`
            );
        }
        if (!response.ok) {
            throw new Error(`Firestore returned ${response.status}: ${(await response.text()).slice(0, 400)}`);
        }

        // batchWrite is non-atomic: it answers 200 and reports each write's outcome positionally
        // in `status`, an empty object meaning success.
        const statuses: { code?: number; message?: string }[] = (await response.json()).status ?? [];
        chunk.forEach(([day], position) => {
            const status = statuses[position];
            if (status?.code === undefined) written++;
            else if (!overwrite && EXISTS_CODES.has(status.code)) skipped++;
            else failures.push(`${day}: ${status.message ?? `code ${status.code}`}`);
        });
        logger.info(`${Math.min(index + BATCH_SIZE, entries.length)}/${entries.length}`);
    }

    for (const failure of failures) logger.error(failure);
    logger.saved(`${overwrite ? 'overwrote' : 'created'} ${written} · skipped ${skipped} · failed ${failures.length}`);
    if (failures.length) throw new Error(`${failures.length} workouts failed to write`);
}
