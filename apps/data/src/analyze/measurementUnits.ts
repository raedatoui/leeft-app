/**
 * Exercise Measurement-Unit Analyzer
 *
 * Flags exercises whose logged set numbers are likely NOT reps × weight-in-lbs:
 * jumps store a height/distance in the weight column, sleds and carries store a
 * distance in the reps column or a duration in the time field, planks are pure
 * duration, and bodyweight movements have no load at all (volume is always 0).
 *
 * Two passes:
 *   1. Identity — keyword rules over the exercise name predict the real measurement.
 *   2. Data — per-exercise set signals (time strings, missing/fractional reps,
 *      all-zero weights, a single constant high rep count) corroborate or surface
 *      exercises the name rules missed.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '@leeft/utils';
import { readExerciseMap, readLog } from '../compile/readFiles';

interface IdentityRule {
    pattern: RegExp;
    measurement: string;
}

// Ordered: first match wins. Word-bounded to avoid machine names like "HS Iso Lateral Row".
const IDENTITY_RULES: IdentityRule[] = [
    { pattern: /\bbox jump\b/i, measurement: 'reps × box height — weight column holds inches' },
    { pattern: /\bbroad jump\b/i, measurement: 'reps × jump distance — weight column holds feet' },
    { pattern: /\bjump\b|\bhop\b|\bbound\b/i, measurement: 'jump — height/distance, not load' },
    { pattern: /\bsled\b/i, measurement: 'sled load × distance or duration — reps column holds distance, or time field holds minutes' },
    { pattern: /\bcarry\b|\bfarmer/i, measurement: 'carried load × distance/duration — reps column holds yards or seconds' },
    { pattern: /\brun\b|\bsprint\b|\bjog\b/i, measurement: 'distance/duration cardio — reps column holds miles or minutes' },
    { pattern: /\bplank\b|\bhold\b|\bhang\b|\bwall sit\b|\bl-sit\b/i, measurement: 'duration — time field holds min:sec, no reps' },
    { pattern: /\bassisted\b/i, measurement: 'reps × assistance — weight column is machine assistance, so volume overstates work' },
];

interface SetLike {
    reps?: number;
    time?: string;
    weight: number;
}

interface ExerciseEvidence {
    setCount: number;
    timedSets: number;
    replessSets: number;
    fractionalReps: number[];
    zeroWeightSets: number;
    repValues: number[];
    weightValues: number[];
    timeSamples: string[];
}

function collectEvidence(sets: SetLike[]): ExerciseEvidence {
    const repValues = new Set<number>();
    const weightValues = new Set<number>();
    const fractionalReps = new Set<number>();
    const timeSamples: string[] = [];
    let timedSets = 0;
    let replessSets = 0;
    let zeroWeightSets = 0;

    for (const s of sets) {
        if (s.time) {
            timedSets++;
            if (timeSamples.length < 5) timeSamples.push(s.time);
        }
        if (s.reps === undefined) {
            replessSets++;
        } else {
            repValues.add(s.reps);
            if (!Number.isInteger(s.reps)) fractionalReps.add(s.reps);
        }
        if (s.weight === 0) zeroWeightSets++;
        weightValues.add(s.weight);
    }

    return {
        setCount: sets.length,
        timedSets,
        replessSets,
        fractionalReps: [...fractionalReps].sort((a, b) => a - b),
        zeroWeightSets,
        repValues: [...repValues].sort((a, b) => a - b),
        weightValues: [...weightValues].sort((a, b) => a - b),
        timeSamples,
    };
}

function dataSignals(ev: ExerciseEvidence): string[] {
    const signals: string[] = [];
    if (ev.timedSets > 0) signals.push(`${ev.timedSets}/${ev.setCount} sets carry a time string (${ev.timeSamples.join(', ')})`);
    if (ev.replessSets > 0) signals.push(`${ev.replessSets}/${ev.setCount} sets have no reps`);
    if (ev.fractionalReps.length > 0) signals.push(`fractional reps: ${ev.fractionalReps.join(', ')}`);
    if (ev.repValues.length === 1 && ev.repValues[0] !== undefined && ev.repValues[0] >= 25) {
        signals.push(`every set logs exactly ${ev.repValues[0]} "reps" — reads like a distance`);
    }
    return signals;
}

function fmtValues(values: number[], max = 10): string {
    const shown = values.slice(0, max).join(', ');
    return values.length > max ? `${shown}, … (${values.length} distinct)` : shown;
}

export function main() {
    const workouts = readLog('../../data/out/lifting-log.json');
    const exerciseMap = readExerciseMap();

    // Full catalog for names — the classified file lags behind and misses some logged ids.
    const catalogPath = join(__dirname, '../', '../', 'data', 'out', 'exercise-metadata.json');
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as { exercises: { id: number; name: string }[] };
    const nameById = new Map(catalog.exercises.map((e) => [e.id, e.name]));

    const setsByExercise = new Map<number, SetLike[]>();
    for (const w of workouts) {
        for (const ex of w.exercises) {
            const bucket = setsByExercise.get(ex.exerciseId) ?? [];
            bucket.push(...ex.sets);
            setsByExercise.set(ex.exerciseId, bucket);
        }
    }

    interface Finding {
        name: string;
        category: string;
        measurement?: string;
        signals: string[];
        evidence: ExerciseEvidence;
    }

    const confirmed: Finding[] = [];
    const likelyByName: Finding[] = [];
    const dataFlagged: Finding[] = [];
    const bodyweight: Finding[] = [];

    for (const [exerciseId, sets] of setsByExercise) {
        const name = nameById.get(exerciseId) ?? `#${exerciseId}`;
        const category = exerciseMap.get(exerciseId.toString())?.category ?? '?';
        const evidence = collectEvidence(sets);
        const signals = dataSignals(evidence);
        const rule = IDENTITY_RULES.find((r) => r.pattern.test(name));
        const finding: Finding = { name, category, measurement: rule?.measurement, signals, evidence };

        if (rule) {
            (signals.length > 0 ? confirmed : likelyByName).push(finding);
        } else if (signals.length > 0) {
            dataFlagged.push(finding);
        } else if (evidence.zeroWeightSets === evidence.setCount) {
            bodyweight.push(finding);
        }
    }

    const byName = (a: Finding, b: Finding) => a.name.localeCompare(b.name);
    confirmed.sort(byName);
    likelyByName.sort(byName);
    dataFlagged.sort(byName);
    bodyweight.sort(byName);

    const printFinding = (f: Finding) => {
        console.log(`\n  ${f.name} [${f.category}] — ${f.evidence.setCount} sets`);
        if (f.measurement) console.log(`    measurement: ${f.measurement}`);
        console.log(`    weights: ${fmtValues(f.evidence.weightValues)}`);
        if (f.evidence.repValues.length > 0) console.log(`    reps: ${fmtValues(f.evidence.repValues)}`);
        for (const s of f.signals) console.log(`    ⚠ ${s}`);
    };

    console.log(`\nAnalyzed ${setsByExercise.size} exercises across ${workouts.length} workouts.`);

    console.log('\n=== Non reps×weight — name match confirmed by set data ===');
    confirmed.forEach(printFinding);

    console.log('\n=== Non reps×weight — flagged by name only (sets look conventional) ===');
    likelyByName.forEach(printFinding);

    console.log('\n=== Data anomalies without a name match (likely reps/weight entry swaps) ===');
    dataFlagged.forEach(printFinding);

    console.log('\n=== Bodyweight, reps-only (every set weight 0 — volume is always 0) ===');
    bodyweight.forEach(printFinding);

    logger.info(
        `\n${confirmed.length} confirmed, ${likelyByName.length} name-only, ${dataFlagged.length} data-flagged, ${bodyweight.length} bodyweight-only`
    );
}
