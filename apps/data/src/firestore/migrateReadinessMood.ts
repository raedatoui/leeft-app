import { logger } from '@leeft/utils';
import { accessToken, COLLECTION, DOCUMENTS_PATH, encodeFields, PROJECT_ID } from './shared';

const BASE_URL = `https://firestore.googleapis.com/v1/${DOCUMENTS_PATH}/${COLLECTION}`;
const BATCH_WRITE_URL = `https://firestore.googleapis.com/v1/${DOCUMENTS_PATH}:batchWrite`;

/**
 * Renames the readiness survey's `motivation` answer to `mood`, one-off.
 *
 * The web and iOS surveys used to ask "how motivated are you?"; they now ask TrainHeroic's own
 * question, so the six years of history hydrated out of the account export and everything logged
 * from here on share one vocabulary. Only the app-logged docs ever carried `motivation`.
 *
 * Idempotent: a doc whose readiness has no `motivation` key is left alone. Only the `readiness`
 * field is written, so nothing else on the doc can be disturbed.
 */
export async function migrateReadinessMood(): Promise<void> {
    const token = accessToken();
    const writes: Record<string, unknown>[] = [];
    const renamed: string[] = [];
    let scanned = 0;
    let pageToken: string | undefined;

    do {
        const url = `${BASE_URL}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`;
        const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (response.status === 401 || response.status === 403) {
            throw new Error(`Firestore returned ${response.status}. Run \`gcloud auth login\` and check the account has a role on ${PROJECT_ID}.`);
        }
        if (!response.ok) throw new Error(`Firestore returned ${response.status}: ${(await response.text()).slice(0, 400)}`);

        const page = await response.json();
        for (const document of page.documents ?? []) {
            scanned++;
            const fields = document.fields?.readiness?.mapValue?.fields ?? {};
            if (!('motivation' in fields)) continue;

            // Readiness answers are 1–5 integers, which REST hands back as strings.
            const answers: Record<string, number> = {};
            for (const [key, value] of Object.entries<any>(fields)) {
                answers[key === 'motivation' ? 'mood' : key] = Number(value.integerValue ?? value.doubleValue);
            }
            const day = document.name.split('/').pop();
            renamed.push(day);
            writes.push({
                update: { name: `${DOCUMENTS_PATH}/${COLLECTION}/${day}`, fields: encodeFields({ readiness: answers }) },
                updateMask: { fieldPaths: ['readiness'] },
                currentDocument: { exists: true },
            });
        }
        pageToken = page.nextPageToken;
    } while (pageToken);

    if (!writes.length) {
        logger.saved(`scanned ${scanned} · nothing to rename, every doc already uses mood`);
        return;
    }

    logger.uploading(`renaming motivation → mood on ${writes.length} of ${scanned} docs: ${renamed.join(', ')}`);
    const response = await fetch(BATCH_WRITE_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ writes }),
    });
    if (!response.ok) throw new Error(`Firestore returned ${response.status}: ${(await response.text()).slice(0, 400)}`);

    // batchWrite answers 200 and reports each write positionally; an empty status means success.
    const statuses: { code?: number; message?: string }[] = (await response.json()).status ?? [];
    const failures = renamed.filter((_, index) => statuses[index]?.code !== undefined);
    for (const day of failures) logger.error(`${day}: ${statuses[renamed.indexOf(day)]?.message}`);
    logger.saved(`scanned ${scanned} · renamed ${renamed.length - failures.length} · failed ${failures.length}`);
    if (failures.length) throw new Error(`${failures.length} docs failed to migrate`);
}
