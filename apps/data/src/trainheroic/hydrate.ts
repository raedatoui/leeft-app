import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path, { join } from 'node:path';
import { logger } from '@leeft/utils';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}/;
const READINESS_KEYS = ['sleep', 'mood', 'energy', 'stress', 'soreness'];
/**
 * What an unanswered question on a partially completed survey is recorded as.
 *
 * 18 days answered some questions and stopped. Filling here rather than in the two card renderers
 * keeps the data complete everywhere it lands — archive, compiled log, `lifting-history` — so a
 * later backfill publishes whole surveys rather than pushing the gap downstream. The account export
 * is never written to, and this pass is deterministic, so the true raw answers are always one
 * re-run away if this default is ever wrong.
 */
const DEFAULT_ANSWER = 4;

/**
 * The survey's answer labels, in the 1–5 order TrainHeroic renders them.
 *
 * The export records the label, never the number, so this is the only way back to a score. The
 * ordering is taken from the app's own UI; the two lowest Stress and Soreness labels have never
 * been answered in six years of data, hence the gaps.
 */
const SCALE: Record<string, Record<string, number>> = {
    Sleep: { Awful: 1, Poor: 2, Ok: 3, Good: 4, Excellent: 5 },
    Mood: { 'Very Poor': 1, 'A little off': 2, Ok: 3, Good: 4, 'Great!': 5 },
    Energy: { 'Wiped out': 1, Tired: 2, Ok: 3, Good: 4, 'Amped up': 5 },
    Stress: { Ok: 3, 'Not much': 4, Relaxed: 5 },
    Soreness: { Moderate: 3, 'Just a bit': 4, 'None at all': 5 },
};

/**
 * `saved_workout.title` is the slot the workout was *scheduled* into, not the day it was trained,
 * and `parseTrainHeroicWorkout` derives the day key from it. On these four the export, the
 * `date_pretty` string and the per-set `date_completed` timestamps all agree that the session ran
 * a day either side of its title, so the title is corrected to the day it was actually performed.
 * Keyed by the wrong title, which makes re-running a no-op.
 *
 * These are the only four in the archive: every other file agrees with its own `date_pretty`, and
 * the handful whose set timestamps fall a day later are evening sessions crossing UTC midnight.
 */
const TITLE_CORRECTIONS: Record<string, string> = {
    '2023-11-15': '2023-11-16',
    '2024-01-16': '2024-01-17',
    '2024-10-02': '2024-10-01',
    '2025-02-11': '2025-02-10',
};

/**
 * Sessions the API cannot give us, reconstructed from the account export.
 *
 * `public/programworkout/range` only serves the personal calendar, so workouts logged against the
 * old coached team are unreachable — and that team's export rows are almost all empty templates
 * TrainHeroic kept scheduling after the program ended. This is the one day among them that carries
 * real loads and is neither a duplicate of a Google-sheet entry nor since deleted.
 *
 * Weights are the export's own numbers: despite the `kilogram` label those are already pounds
 * (154.32 = 70 kg expressed in lb), matching how every other day in the archive is stored. `rpe` is
 * null and the timestamps give the 90 minutes a session of this shape took, since the export
 * carries neither. The `99` id prefix marks it synthetic, as the custom exercise ids do.
 */
const RECOVERED_WORKOUTS = [
    {
        id: 99200918,
        day: '2020-09-18',
        datePretty: 'Friday 9.18.20',
        durationMinutes: 90,
        exercises: [
            { exercise_id: 143, exercise_title: 'Pause Squat', abr: '4, 4, 4, 4 @ 154.32, 176.37, 187.39, 187.39 lb' },
            { exercise_id: 1162, exercise_title: 'Comp Bench', abr: '4, 4, 4, 4, 4 @ 77.16, 88.18, 99.21, 103.62, 103.62 lb' },
            { exercise_id: 40, exercise_title: 'Bulgarian Split Squat', abr: '10, 10, 10, 10 @ 66.14, 66.14, 66.14, 66.14 lb' },
            { exercise_id: 688320, exercise_title: 'Romanian Deadlift', abr: '8, 8, 8, 8 @ 132.28, 132.28, 132.28, 132.28 lb' },
        ],
    },
];

const workoutsDirectory = join(__dirname, '../', '../', 'data', 'download', 'trainheroic', 'workouts');

type ArchiveEntry = { file: string; raw: { saved_workout: Record<string, any> } };

function readArchive(): ArchiveEntry[] {
    return readdirSync(workoutsDirectory)
        .filter((file) => path.extname(file) === '.json')
        .map((file) => ({ file, raw: JSON.parse(readFileSync(join(workoutsDirectory, file), 'utf8')) }))
        .filter((entry) => DATE_ONLY.test(entry.raw.saved_workout?.title ?? ''));
}

const dayOf = (entry: ArchiveEntry): string => (entry.raw.saved_workout.title as string).slice(0, 10);

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** TrainHeroic's own display format, e.g. `Tuesday 10.01.24` — unpadded month, padded day. */
function datePretty(day: string): string {
    const [year, month, date] = day.split('-').map(Number);
    const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, date)).getUTCDay()];
    return `${weekday} ${month}.${String(date).padStart(2, '0')}.${String(year).slice(2)}`;
}

/**
 * Builds the raw-archive shape `parseTrainHeroicWorkout` expects, so no compile path changes.
 * Skipped when a real download already covers the day — a genuine file always wins over a
 * reconstruction, and writing both would put two sessions on one date.
 */
function writeRecoveredWorkouts(owners: Map<string, string>): ArchiveEntry[] {
    const written: ArchiveEntry[] = [];
    for (const workout of RECOVERED_WORKOUTS) {
        const filename = `workout-${workout.id}.json`;
        const owner = owners.get(workout.day);
        if (owner && owner !== filename) {
            logger.warning(`${workout.day} is now covered by ${owner} — skipping the reconstruction, delete ${filename} if it exists`);
            continue;
        }
        // Noon ET on the logged day — the same instant `defaultStartedAt` falls back to.
        const [year, month, day] = workout.day.split('-').map(Number);
        const startedAt = Date.UTC(year, month - 1, day, 17) / 1000;
        const raw = {
            _source: 'reconstructed by trainheroic:hydrate from the account export — the coached team is not reachable over the API',
            date: workout.datePretty,
            saved_workout: {
                id: workout.id,
                title: workout.day,
                date_pretty: workout.datePretty,
                completed: 1,
                rpe: null,
                notes: '',
                timestamp_started: startedAt,
                timestamp_completed: startedAt + workout.durationMinutes * 60,
                set_count: workout.exercises.length,
                workoutSets: workout.exercises.map((exercise, index) => ({
                    order: index + 1,
                    exercise_count: 1,
                    workoutSetExercises: [exercise],
                })),
            },
        };
        const filePath = join(workoutsDirectory, filename);
        const next = JSON.stringify(raw, null, 2);
        if (existsSync(filePath) && readFileSync(filePath, 'utf8') === next) continue;
        writeFileSync(filePath, next);
        logger.info(`recovered ${workout.day} → ${filename}`);
        written.push({ file: filename, raw });
    }
    return written;
}

/**
 * Answers grouped by UTC day. A question answered twice in a day keeps the later answer, and a
 * survey left part-finished is completed with `DEFAULT_ANSWER` (reported, never silent).
 */
function readReadiness(): { byDay: Map<string, Record<string, number>>; filled: { day: string; keys: string[] }[] } {
    const filePath = join(__dirname, '../', '../', 'data', 'download', 'trainheroic', 'export', 'readiness_survey_data.csv');
    const lines = readFileSync(filePath, 'utf8').trim().split('\n').slice(1);
    const byDay = new Map<string, Record<string, number>>();
    for (const line of lines) {
        const [timestamp, title, label] = line.split(',');
        const score = SCALE[title]?.[label];
        if (score === undefined) {
            logger.warning(`Unmapped readiness answer: ${title} = ${label}`);
            continue;
        }
        const day = timestamp.slice(0, 10);
        byDay.set(day, { ...byDay.get(day), [title.toLowerCase()]: score });
    }

    const filled: { day: string; keys: string[] }[] = [];
    for (const [day, answers] of byDay) {
        const missing = READINESS_KEYS.filter((key) => answers[key] === undefined);
        if (!missing.length) continue;
        byDay.set(day, { ...answers, ...Object.fromEntries(missing.map((key) => [key, DEFAULT_ANSWER])) });
        filled.push({ day, keys: missing });
    }
    return { byDay, filled };
}

/**
 * Writes the account export's readiness survey into the downloaded TrainHeroic archive, corrects
 * the workouts whose title disagrees with the day they were trained, and reconstructs the sessions
 * the API will not serve.
 *
 * The survey exists only in the export — no endpoint we download carries it — so the archive is the
 * natural place to put it: `parseTrainHeroicWorkout` then carries it into the compiled log with no
 * separate join. Re-running is a no-op; note that re-downloading a day drops its hydrated
 * readiness, so run this after any download.
 */
export function hydrateTrainHeroic(): void {
    const { byDay: readiness, filled } = readReadiness();
    const correctedDays = new Set(Object.values(TITLE_CORRECTIONS));
    const archive = readArchive();
    const owners = new Map(archive.map((entry) => [dayOf(entry), entry.file]));
    archive.push(...writeRecoveredWorkouts(owners));

    let corrected = 0;
    let hydrated = 0;
    let unchanged = 0;
    const matchedDays = new Set<string>();

    for (const entry of archive) {
        const savedWorkout = entry.raw.saved_workout;
        let dirty = false;

        const correction = TITLE_CORRECTIONS[dayOf(entry)];
        if (correction) {
            // A correction that lands on an occupied day would silently create two sessions there.
            const occupant = owners.get(correction);
            if (occupant && occupant !== entry.file) {
                logger.error(`${entry.file}: cannot retitle to ${correction} — ${occupant} already holds that day`);
                continue;
            }
            logger.info(`${entry.file}: title ${savedWorkout.title} → ${correction}`);
            owners.delete(dayOf(entry));
            savedWorkout.title = correction;
            owners.set(correction, entry.file);
            corrected++;
            dirty = true;
        }

        // Keep the display strings with a corrected title, or the drift audit reports the file
        // against itself forever. Only ever touches days we retitled — TrainHeroic's own strings on
        // every other file are left exactly as downloaded. `date` mirrors `date_pretty`, and is
        // compileLifting's per-file dedupe key.
        if (correctedDays.has(dayOf(entry)) && savedWorkout.date_pretty !== datePretty(dayOf(entry))) {
            savedWorkout.date_pretty = datePretty(dayOf(entry));
            entry.raw.date = savedWorkout.date_pretty;
            dirty = true;
        }

        const answers = readiness.get(dayOf(entry));
        if (answers) {
            matchedDays.add(dayOf(entry));
            if (JSON.stringify(savedWorkout.readiness) !== JSON.stringify(answers)) {
                savedWorkout.readiness = answers;
                hydrated++;
                dirty = true;
            } else unchanged++;
        }

        if (dirty) writeFileSync(join(workoutsDirectory, entry.file), JSON.stringify(entry.raw, null, 2));
    }

    report(archive, readiness, matchedDays, filled, { recovered: RECOVERED_WORKOUTS.length, corrected, hydrated, unchanged });
}

type Counts = { recovered: number; corrected: number; hydrated: number; unchanged: number };

/**
 * What the run did, then what is left wrong with the data. Nothing here fails the command — the
 * archive is a record of six years of imperfect logging, and the point is to see the imperfections
 * rather than to reject them.
 */
function report(
    archive: ArchiveEntry[],
    readiness: Map<string, Record<string, number>>,
    matchedDays: Set<string>,
    filled: { day: string; keys: string[] }[],
    counts: Counts
): void {
    const days = archive.map(dayOf).sort();
    const duplicates = [...Map.groupBy(archive, dayOf)].filter(([, entries]) => entries.length > 1);
    // A title disagreeing with TrainHeroic's own rendering of the day is the signal the known
    // corrections were found by; kept live to catch the same drift in anything downloaded later.
    const drifted = archive.filter((entry) => {
        const match = /(\d{1,2})\.(\d{1,2})\.(\d{2})$/.exec(entry.raw.saved_workout.date_pretty ?? '');
        if (!match) return false;
        const [, month, day, year] = match;
        return `20${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` !== dayOf(entry);
    });
    const orphans = [...readiness.keys()].filter((day) => !matchedDays.has(day)).sort();

    logger.summary('ARCHIVE');
    logger.count(`workouts               ${archive.length}   ${days[0]} → ${days[days.length - 1]}`);
    logger.count(`reconstructed          ${counts.recovered}   ${RECOVERED_WORKOUTS.map((w) => w.day).join(', ')}`);
    logger.count(
        `titles corrected       ${counts.corrected}   (${Object.entries(TITLE_CORRECTIONS)
            .map(([from, to]) => `${from}→${to.slice(8)}`)
            .join(', ')})`
    );
    logger.count(`readiness written      ${counts.hydrated}`);
    logger.count(`readiness unchanged    ${counts.unchanged}`);
    logger.count(`readiness coverage     ${matchedDays.size}/${archive.length} workouts · ${readiness.size} survey days in the export`);

    logger.summary('CHECKS');
    logger.count(`duplicate day keys     ${duplicates.length}`);
    logger.count(`title vs date_pretty   ${drifted.length}`);
    logger.count(`surveys completed      ${filled.length}   part-finished, missing answers set to ${DEFAULT_ANSWER}`);
    logger.count(`readiness with no day  ${orphans.length}`);

    for (const [day, entries] of duplicates) logger.error(`two archive files claim ${day}: ${entries.map((entry) => entry.file).join(', ')}`);
    for (const entry of drifted)
        logger.warning(`${entry.file}: title ${dayOf(entry)} disagrees with date_pretty ${entry.raw.saved_workout.date_pretty}`);

    if (filled.length) {
        logger.summary(`COMPLETED SURVEYS — unanswered questions recorded as ${DEFAULT_ANSWER}`);
        for (const { day, keys } of filled)
            logger.info(`${day}  answered ${READINESS_KEYS.length - keys.length}/${READINESS_KEYS.length}  filled ${keys.sort().join(', ')}`);
    }
    if (orphans.length) {
        logger.summary('READINESS WITH NO WORKOUT');
        for (const day of orphans) {
            const why = day < days[0] ? `before the archive begins (${days[0]})` : 'no workout logged that day';
            logger.info(`${day}  ${Object.keys(readiness.get(day) ?? {}).length} answers  — ${why}`);
        }
    }
}
