import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '@leeft/utils';

const PROJECT_ID = 'leeft-app';
const COLLECTION = 'lifting-workouts';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}`;

// The database is fully private (owner-only rules), but a Google access token goes through IAM,
// which bypasses security rules — the project owner reads everything, the public reads nothing.
function accessToken(): string {
    if (process.env.TOKEN) return process.env.TOKEN;
    return execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
}

function decodeValue(value: Record<string, any>): unknown {
    if ('stringValue' in value) return value.stringValue;
    // REST serializes integers as JSON strings — the Zod schemas want numbers.
    if ('integerValue' in value) return Number(value.integerValue);
    if ('doubleValue' in value) return value.doubleValue;
    if ('booleanValue' in value) return value.booleanValue;
    if ('nullValue' in value) return null;
    // The app writes ISO strings, never Timestamps; passed through defensively.
    if ('timestampValue' in value) return value.timestampValue;
    if ('mapValue' in value) return decodeFields(value.mapValue.fields ?? {});
    if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decodeValue);
    logger.warning(`Unknown Firestore value type: ${JSON.stringify(value)}`);
    return null;
}

function decodeFields(fields: Record<string, any>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}

export async function downloadLiftingWorkouts(): Promise<void> {
    const token = accessToken();
    const workouts: Record<string, unknown>[] = [];
    let pageToken: string | undefined;

    logger.downloading(`app-logged workouts from ${COLLECTION}`);

    do {
        const url = `${BASE_URL}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`;
        logger.fetching(`data from ${url}`);
        const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

        if (response.status === 401 || response.status === 403) {
            throw new Error(
                `Firestore returned ${response.status}. Run \`gcloud auth login\` and check that the account has a role on ${PROJECT_ID}, or set TOKEN=<access-token>.`
            );
        }
        if (!response.ok) {
            throw new Error(`Firestore returned ${response.status}: ${(await response.text()).slice(0, 400)}`);
        }

        const page = await response.json();
        // An empty collection comes back as `{}` — no `documents` key.
        for (const document of page.documents ?? []) {
            workouts.push(decodeFields(document.fields ?? {}));
        }
        pageToken = page.nextPageToken;
    } while (pageToken);

    workouts.sort((a, b) => String(a.date).localeCompare(String(b.date)));

    const directory = join(__dirname, '../', '../', 'data', 'download', 'firestore');
    mkdirSync(directory, { recursive: true });
    const filename = join(directory, 'lifting-workouts.json');
    writeFileSync(filename, JSON.stringify({ workouts }, null, 2));
    logger.saved(`${workouts.length} workouts to ${filename}`);
}
