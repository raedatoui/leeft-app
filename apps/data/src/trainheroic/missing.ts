import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path, { join } from 'node:path';
import { logger } from '@leeft/utils';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
// Runs separated by more than this many days are reported as separate download ranges.
const RANGE_GAP_DAYS = 7;

type ExportRow = { day: string; workoutTitle: string };

/** Minimal RFC4180 reader — `ExerciseData` carries commas inside quotes, so split() won't do. */
function parseCsv(csv: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let quoted = false;
    for (let i = 0; i < csv.length; i++) {
        const char = csv[i];
        if (quoted) {
            if (char === '"' && csv[i + 1] === '"') {
                field += '"';
                i++;
            } else if (char === '"') quoted = false;
            else field += char;
        } else if (char === '"') quoted = true;
        else if (char === ',') {
            row.push(field);
            field = '';
        } else if (char === '\n') {
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
        } else if (char !== '\r') field += char;
    }
    if (field || row.length) {
        row.push(field);
        rows.push(row);
    }
    return rows;
}

function readExportRows(): ExportRow[] {
    const filePath = join(__dirname, '../', '../', 'data', 'download', 'trainheroic', 'export', 'training_data.csv');
    if (!existsSync(filePath)) {
        throw new Error(`No account export at ${filePath} — unzip the TrainHeroic export into data/download/trainheroic/export/.`);
    }
    const rows = parseCsv(readFileSync(filePath, 'utf8'));
    const header = rows[0];
    const at = (name: string) => {
        const index = header.indexOf(name);
        if (index === -1) throw new Error(`Column ${name} missing from training_data.csv`);
        return index;
    };
    const [scheduled, rescheduled, title] = [at('ScheduledDate'), at('RescheduledDate'), at('WorkoutTitle')];
    return (
        rows
            .slice(1)
            .filter((row) => row.length === header.length)
            .map((row) => ({ day: row[rescheduled] || row[scheduled], workoutTitle: row[title].trim() }))
            // The export writes an unscheduled session as `0000-00-00`, which is shaped like a date but isn't one.
            .filter((row) => DATE_ONLY.test(row.day) && !Number.isNaN(Date.parse(row.day)))
    );
}

/** Day keys of the downloaded raw archive. `saved_workout.title` is the session's date. */
function readArchiveDays(): Set<string> {
    const directory = join(__dirname, '../', '../', 'data', 'download', 'trainheroic', 'workouts');
    const days = new Set<string>();
    for (const file of readdirSync(directory).filter((f) => path.extname(f) === '.json')) {
        const title = JSON.parse(readFileSync(join(directory, file), 'utf8'))?.saved_workout?.title ?? '';
        if (DATE_ONLY.test(title.slice(0, 10))) days.add(title.slice(0, 10));
    }
    return days;
}

/** Day keys of the compiled log — TrainHeroic plus the Google and Firestore sources. */
function readCompiledDays(): Set<string> {
    const filePath = join(__dirname, '../', '../', 'data', 'out', 'lifting-log.json');
    const content = JSON.parse(readFileSync(filePath, 'utf8'));
    return new Set<string>(content.workouts.map((workout: { date: string }) => workout.date.slice(0, 10)));
}

function span(days: string[]): string {
    return days.length ? `${days[0]} → ${days[days.length - 1]}` : '—';
}

/** Contiguous download ranges: consecutive days are joined, and so are gaps of a week or less. */
function toRanges(days: string[]): { start: string; end: string; days: number }[] {
    const ranges: { start: string; end: string; days: number }[] = [];
    for (const day of days) {
        const last = ranges[ranges.length - 1];
        const gap = last ? (Date.parse(day) - Date.parse(last.end)) / 86400000 : Number.POSITIVE_INFINITY;
        if (last && gap <= RANGE_GAP_DAYS) {
            last.end = day;
            last.days++;
        } else ranges.push({ start: day, end: day, days: 1 });
    }
    return ranges;
}

/**
 * Reports which TrainHeroic sessions the account export knows about but we never downloaded.
 *
 * The export schedules a handful of sessions a day off from the date the raw JSON titles them
 * with, so a day missing by `ScheduledDate` is only genuinely absent once its `WorkoutTitle` has
 * been checked against the log too. What survives that splits by title style: date-titled days are
 * personal-calendar sessions that `public/programworkout/range` should return, while
 * program-titled ones ("Week 6 Day 3") belong to the old coached program, which that endpoint does
 * not serve.
 */
export function reportMissingWorkouts(): void {
    const exportRows = readExportRows();
    const archiveDays = readArchiveDays();
    const compiledDays = readCompiledDays();

    const titlesByDay = new Map<string, Set<string>>();
    for (const { day, workoutTitle } of exportRows) {
        const titles = titlesByDay.get(day) ?? new Set<string>();
        titles.add(workoutTitle);
        titlesByDay.set(day, titles);
    }
    const exportDays = [...titlesByDay.keys()].sort();

    const keySkew: { exportDay: string; logDay: string }[] = [];
    const absentPersonal: string[] = [];
    const absentProgram: string[] = [];

    for (const day of exportDays) {
        if (compiledDays.has(day)) continue;
        const titles = [...(titlesByDay.get(day) ?? [])];
        const skewed = titles.find((title) => DATE_ONLY.test(title) && compiledDays.has(title));
        if (skewed) {
            keySkew.push({ exportDay: day, logDay: skewed });
            continue;
        }
        if (titles.some((title) => DATE_ONLY.test(title))) absentPersonal.push(day);
        else absentProgram.push(day);
    }

    // Skew counterparts are in the export, just filed under a neighbouring day — not archive-only.
    const skewedLogDays = new Set(keySkew.map(({ logDay }) => logDay));
    const archiveOnly = [...archiveDays].filter((day) => !titlesByDay.has(day) && !skewedLogDays.has(day)).sort();
    const sortedArchive = [...archiveDays].sort();
    const sortedCompiled = [...compiledDays].sort();

    logger.analyzing('TrainHeroic coverage');
    logger.count(`account export : ${exportDays.length} days · ${span(exportDays)}`);
    logger.count(`json archive   : ${sortedArchive.length} days · ${span(sortedArchive)}`);
    logger.count(`compiled log   : ${sortedCompiled.length} days · ${span(sortedCompiled)}`);

    logger.summary(`day-key skew (in the log under the WorkoutTitle date): ${keySkew.length}`);
    for (const { exportDay, logDay } of keySkew) logger.info(`export ${exportDay} == log ${logDay}`);

    logger.summary(`genuinely absent: ${absentPersonal.length + absentProgram.length}`);
    logger.count(`personal calendar (date-titled): ${absentPersonal.length} · ${span(absentPersonal)}`);
    logger.count(`coached program (program-titled): ${absentProgram.length} · ${span(absentProgram)}`);

    const ranges = toRanges([...absentPersonal, ...absentProgram].sort());
    logger.summary(`download ranges: ${ranges.length}`);
    for (const { start, end, days } of ranges) {
        logger.info(`${days} day(s) — bun trainheroic:download 'startDate=${start}&endDate=${end}' "$TRAINHEROIC_SESSION_TOKEN"`);
    }

    logger.summary(`in the archive but not the export: ${archiveOnly.length}`);
    if (archiveOnly.length) logger.info(archiveOnly.join(', '));

    const filename = join(__dirname, '../', '../', 'data', 'out', 'trainheroic-missing.json');
    writeFileSync(filename, JSON.stringify({ ranges, absentPersonal, absentProgram, keySkew, archiveOnly }, null, 2));
    logger.saved(filename);
}
