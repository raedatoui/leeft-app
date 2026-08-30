import { execFileSync } from 'node:child_process';

export const PROJECT_ID = 'leeft-app';
/** The write store. Only the web `/add` flow and the iOS app put documents here. */
export const COLLECTION = 'lifting-workouts';
/**
 * The read store: a complete projection of `data/out/lifting-log.json`, one document per day,
 * written only by `firestore:backfill`. Nothing authors documents here, so a refresh overwrites
 * freely — and keeping it separate is what stops the compiled log from merging its own output back
 * in as a duplicate of every day.
 */
export const HISTORY_COLLECTION = 'lifting-history';
/** Resource path documents are addressed by in write payloads — a path, not a URL. */
export const DOCUMENTS_PATH = `projects/${PROJECT_ID}/databases/(default)/documents`;

// The database is fully private (owner-only rules), but a Google access token goes through IAM,
// which bypasses security rules — the project owner reads everything, the public reads nothing.
export function accessToken(): string {
    if (process.env.TOKEN) return process.env.TOKEN;
    return execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
}

// The mirror of `decodeValue` in download.ts.
export function encodeValue(value: unknown): Record<string, unknown> {
    if (value === null) return { nullValue: null };
    // Every temporal field on the docs is an ISO string — the decoder handles no Timestamps.
    if (value instanceof Date) return { stringValue: value.toISOString() };
    if (typeof value === 'string') return { stringValue: value };
    if (typeof value === 'boolean') return { booleanValue: value };
    // Whole numbers go back as integerValue (a JSON string), matching what the web SDK writes.
    if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
    if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
    if (typeof value === 'object') return { mapValue: { fields: encodeFields(value as Record<string, unknown>) } };
    throw new Error(`Cannot encode ${typeof value} as a Firestore value`);
}

export function encodeFields(fields: Record<string, unknown>): Record<string, unknown> {
    // Absent optional fields (a set without `reps`, say) are omitted, never written as null.
    return Object.fromEntries(
        Object.entries(fields)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => [key, encodeValue(value)])
    );
}
