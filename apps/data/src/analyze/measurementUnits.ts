/**
 * Exercise Measurement-Unit Auditor
 *
 * Now that every logged exercise carries its own `units`, this is a check on that data rather
 * than the guesswork it started as. Three passes, all reporting the *session* that is wrong
 * rather than the exercise it belongs to — Tricep Pushdown has one bad session out of 76, and
 * naming the exercise buried it under 484 healthy sets.
 *
 *   1. Name vs units — keyword rules over the exercise name predict a measurement. A sled or a
 *      plank still logged as reps x lb means a session the decoder didn't reach.
 *   2. Transposed columns — a fractional rep count is the columns typed the wrong way round.
 *   3. Assistance basis — on an assisted machine the load must rise with the warmup ramp. A
 *      session where it falls is recording the assistance stack instead of the load moved.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isLoaded } from '@leeft/types';
import { logger } from '@leeft/utils';
import { readLog } from '../compile/readFiles';
import type { ColumnUnits } from '../compile/types';

interface IdentityRule {
    pattern: RegExp;
    expects: string;
}

// Ordered: first match wins. Word-bounded to avoid machine names like "HS Iso Lateral Row".
const IDENTITY_RULES: IdentityRule[] = [
    { pattern: /\bbox jump\b/i, expects: 'a height in the load column' },
    { pattern: /\bbroad jump\b/i, expects: 'a distance in the load column' },
    { pattern: /\bjump\b|\bhop\b|\bbound\b/i, expects: 'a height or distance, not load' },
    { pattern: /\bsled\b/i, expects: 'a distance or duration in the lead column' },
    { pattern: /\bcarry\b|\bfarmer/i, expects: 'a distance or duration in the lead column' },
    { pattern: /\brun\b|\bsprint\b|\bjog\b/i, expects: 'a distance or duration, not reps' },
    { pattern: /\bplank\b|\bhold\b|\bhang\b|\bwall sit\b|\bl-sit\b/i, expects: 'a duration in the lead column' },
];

interface Finding {
    day: string;
    exercise: string;
    detail: string;
}

const fmtSets = (sets: { reps?: number; weight: number }[]) => sets.map((s) => `${s.reps ?? '?'}@${s.weight}`).join(' ');

export function main() {
    const workouts = readLog('../../data/out/lifting-log.json');

    const catalogPath = join(__dirname, '../', '../', 'data', 'out', 'exercise-metadata.json');
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as { exercises: { id: number; name: string }[] };
    const nameById = new Map(catalog.exercises.map((e) => [e.id, e.name]));

    const mislabelled: Finding[] = [];
    const transposed: Finding[] = [];
    const assistance: Finding[] = [];
    const basisCounts = new Map<string, number>();

    for (const w of workouts) {
        const day = w.date.toISOString().slice(0, 10);
        for (const ex of w.exercises) {
            const name = nameById.get(ex.exerciseId) ?? `#${ex.exerciseId}`;
            const units = ex.units as ColumnUnits;
            const basis = `${units.reps} x ${units.weight}`;
            basisCounts.set(basis, (basisCounts.get(basis) ?? 0) + 1);

            // 1. The name says this isn't reps x lb, but the units say it is.
            const rule = IDENTITY_RULES.find((r) => r.pattern.test(name));
            if (rule && isLoaded(units)) {
                mislabelled.push({ day, exercise: name, detail: `logged as reps x lb; the name implies ${rule.expects}` });
            }

            // 2. A rep count is a count. A fraction means the two columns were swapped at entry.
            const fractional = ex.sets.filter((s) => s.reps !== undefined && !Number.isInteger(s.reps));
            if (units.reps === 'reps' && fractional.length > 0) {
                transposed.push({ day, exercise: name, detail: fmtSets(ex.sets) });
            }

            // 3. On an assisted machine the number must rise as the ramp gets harder. Falling
            //    across three or more sets means the assistance stack was logged, not the load.
            const loads = ex.sets.map((s) => s.weight);
            const reps = ex.sets.map((s) => s.reps ?? 0);
            const first = loads[0];
            const last = loads[loads.length - 1];
            const firstReps = reps[0];
            const lastReps = reps[reps.length - 1];
            if (
                /\bassisted\b/i.test(name) &&
                loads.length >= 3 &&
                first !== undefined &&
                last !== undefined &&
                firstReps !== undefined &&
                lastReps !== undefined &&
                last < first &&
                lastReps < firstReps
            ) {
                assistance.push({ day, exercise: name, detail: `${fmtSets(ex.sets)} — load falls as the ramp gets harder` });
            }
        }
    }

    const report = (title: string, findings: Finding[]) => {
        console.log(`\n=== ${title} — ${findings.length} ===`);
        for (const f of findings.sort((a, b) => a.day.localeCompare(b.day))) {
            console.log(`  ${f.day}  ${f.exercise.padEnd(24)} ${f.detail}`);
        }
    };

    console.log(`\nAudited ${workouts.length} workouts.\n`);
    console.log('=== measurement bases in use ===');
    for (const [basis, count] of [...basisCounts].sort((a, b) => b[1] - a[1])) {
        console.log(`  ${basis.padEnd(18)} ${count}`);
    }

    report('Name implies a measurement the units contradict', mislabelled);
    report('Transposed columns (a fractional rep count)', transposed);
    report('Assistance stack logged instead of the load moved', assistance);

    const csvEscape = (v: string | number) => {
        const str = String(v);
        return /[",\n]/.test(str) ? `"${str.replaceAll('"', '""')}"` : str;
    };
    const rows: (string | number)[][] = [['bucket', 'date', 'exercise', 'detail']];
    for (const [bucket, findings] of [
        ['mislabelled', mislabelled],
        ['transposed', transposed],
        ['assistance', assistance],
    ] as [string, Finding[]][]) {
        for (const f of findings) rows.push([bucket, f.day, f.exercise, f.detail]);
    }
    const csvPath = join(__dirname, '../', '../', 'data', 'out', 'exercise-units.csv');
    writeFileSync(csvPath, rows.map((r) => r.map(csvEscape).join(',')).join('\n'));
    console.log(`\nCSV: ${csvPath} (${rows.length - 1} rows)`);

    logger.info(`\n${mislabelled.length} mislabelled, ${transposed.length} transposed, ${assistance.length} on an assistance basis`);
}
