/**
 * Exercise Duplicate Finder
 * Multiple detection modes: fuzzy, full, semantic
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '@leeft/utils';
import { jaccardSimilarity, levenshtein, normalizeName, stripToAlphanumeric } from './similarity';

interface Exercise {
    id: number;
    slug: string;
    name: string;
    category: string;
    primaryMuscleGroup: string;
    equipment: string[];
    description?: string;
}

const FILE_PATH = join(process.cwd(), 'data/exercise-classified.json');

function loadExercises(): Exercise[] {
    const rawData = readFileSync(FILE_PATH, 'utf-8');
    return JSON.parse(rawData);
}

/**
 * Basic fuzzy matching using Levenshtein distance
 */
export function fuzzy() {
    const exercises = loadExercises();
    logger.info(`Total exercises: ${exercises.length}`);

    // Exact duplicates
    const nameCounts: Record<string, number> = {};
    const slugCounts: Record<string, number> = {};

    exercises.forEach((e) => {
        nameCounts[e.name] = (nameCounts[e.name] || 0) + 1;
        slugCounts[e.slug] = (slugCounts[e.slug] || 0) + 1;
    });

    const duplicateNames = Object.entries(nameCounts).filter(([_, count]) => count > 1);
    const duplicateSlugs = Object.entries(slugCounts).filter(([_, count]) => count > 1);

    if (duplicateNames.length > 0) {
        console.log('\n--- Exact Duplicate Names ---');
        for (const [name, count] of duplicateNames) {
            console.log(`"${name}": ${count} times`);
        }
    } else {
        console.log('\nNo exact duplicate names found.');
    }

    if (duplicateSlugs.length > 0) {
        console.log('\n--- Exact Duplicate Slugs ---');
        for (const [slug, count] of duplicateSlugs) {
            console.log(`"${slug}": ${count} times`);
        }
    } else {
        console.log('\nNo exact duplicate slugs found.');
    }

    // Similar names (fuzzy matching)
    console.log('\n--- Similar Names (Potential Duplicates) ---');
    const processed = new Set<string>();

    for (let i = 0; i < exercises.length; i++) {
        for (let j = i + 1; j < exercises.length; j++) {
            const name1 = exercises[i].name;
            const name2 = exercises[j].name;
            const idKey = [name1, name2].sort().join('|');

            if (processed.has(idKey)) continue;

            const lower1 = stripToAlphanumeric(name1);
            const lower2 = stripToAlphanumeric(name2);

            // Substring match
            if (lower1.includes(lower2) || lower2.includes(lower1)) {
                if (Math.min(lower1.length, lower2.length) > 5) {
                    console.log(`Substring match: "${name1}" <-> "${name2}"`);
                    processed.add(idKey);
                    continue;
                }
            }

            // Levenshtein distance
            const dist = levenshtein(lower1, lower2);
            if (dist < 3 && lower1.length > 5 && lower2.length > 5) {
                console.log(`Fuzzy match (dist ${dist}): "${name1}" <-> "${name2}"`);
                processed.add(idKey);
            }
        }
    }
}

/**
 * Comprehensive analysis: exact, substring, fuzzy, attribute similarity
 */
export function full() {
    const exercises = loadExercises();
    logger.info(`Loaded ${exercises.length} exercises.`);
    console.log('--------------------------------------------------');

    const potentialDuplicates: {
        reason: string;
        pair: [string, string];
        details: string;
    }[] = [];

    for (let i = 0; i < exercises.length; i++) {
        for (let j = i + 1; j < exercises.length; j++) {
            const ex1 = exercises[i];
            const ex2 = exercises[j];

            const name1 = ex1.name.toLowerCase();
            const name2 = ex2.name.toLowerCase();

            // Exact match
            if (name1 === name2) {
                potentialDuplicates.push({
                    reason: 'Exact Name Match',
                    pair: [ex1.name, ex2.name],
                    details: `IDs: ${ex1.id} vs ${ex2.id}`,
                });
                continue;
            }

            // Substring match
            if (name1.includes(name2) || name2.includes(name1)) {
                const longer = name1.length > name2.length ? name1 : name2;
                const shorter = name1.length > name2.length ? name2 : name1;

                if (shorter.length > 5 && shorter.length / longer.length > 0.5) {
                    potentialDuplicates.push({
                        reason: 'Substring Match',
                        pair: [ex1.name, ex2.name],
                        details: `"${shorter}" is in "${longer}"`,
                    });
                }
            }

            // Fuzzy match
            const dist = levenshtein(name1, name2);
            const maxDist = name1.length > 10 ? 3 : name1.length > 5 ? 2 : 1;

            if (dist <= maxDist && dist > 0) {
                potentialDuplicates.push({
                    reason: `Fuzzy Match (Dist: ${dist})`,
                    pair: [ex1.name, ex2.name],
                    details: 'Names are very similar spelling-wise',
                });
            }

            // Attribute match
            if (
                ex1.category === ex2.category &&
                ex1.primaryMuscleGroup === ex2.primaryMuscleGroup &&
                ex1.equipment.sort().join(',') === ex2.equipment.sort().join(',') &&
                ex1.category !== 'other' &&
                ex1.primaryMuscleGroup !== 'other'
            ) {
                const words1 = new Set(name1.split(' '));
                const words2 = new Set(name2.split(' '));
                const commonWords = [...words1].filter((x) => words2.has(x));

                if (commonWords.length >= 1) {
                    potentialDuplicates.push({
                        reason: 'Identical Attributes + Shared Words',
                        pair: [ex1.name, ex2.name],
                        details: `Cat: ${ex1.category}, Muscle: ${ex1.primaryMuscleGroup}, Equip: ${ex1.equipment.join(',')}`,
                    });
                }
            }
        }
    }

    if (potentialDuplicates.length === 0) {
        logger.success('No obvious duplicates found.');
    } else {
        console.log(`Found ${potentialDuplicates.length} potential similarities:\n`);

        const grouped = potentialDuplicates.reduce(
            (acc, curr) => {
                acc[curr.reason] = acc[curr.reason] || [];
                acc[curr.reason].push(curr);
                return acc;
            },
            {} as Record<string, typeof potentialDuplicates>
        );

        for (const [reason, items] of Object.entries(grouped)) {
            console.log(`[ ${reason} ]`);
            items.forEach((item) => {
                console.log(`  • ${item.pair[0]}  <-->  ${item.pair[1]}`);
                console.log(`    (${item.details})`);
            });
            console.log('');
        }
    }
}

/**
 * Semantic detection with normalization, abbreviation expansion, word reordering
 */
export function semantic() {
    const exercises = loadExercises();

    // Group by muscle + category to narrow search space
    const groups: Record<string, Exercise[]> = {};

    exercises.forEach((ex) => {
        const key = `${ex.primaryMuscleGroup}|${ex.category}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(ex);
    });

    logger.info(`Analyzing ${exercises.length} exercises across ${Object.keys(groups).length} muscle/category groups...`);
    console.log('---------------------------------------------------------');

    let foundIssues = false;

    for (const [groupKey, groupExercises] of Object.entries(groups)) {
        if (groupExercises.length < 2) continue;

        const [muscle, category] = groupKey.split('|');

        for (let i = 0; i < groupExercises.length; i++) {
            for (let j = i + 1; j < groupExercises.length; j++) {
                const ex1 = groupExercises[i];
                const ex2 = groupExercises[j];

                const norm1 = normalizeName(ex1.name);
                const norm2 = normalizeName(ex2.name);

                // Normalized name match
                if (norm1 === norm2) {
                    console.log(`[DUPLICATE] Exact Normalized Name in (${muscle} / ${category})`);
                    console.log(`  1. "${ex1.name}" (ID: ${ex1.id})`);
                    console.log(`  2. "${ex2.name}" (ID: ${ex2.id})`);
                    console.log(`  -> Equipment: [${ex1.equipment}] vs [${ex2.equipment}]`);
                    foundIssues = true;
                    continue;
                }

                // Word reordering (Jaccard)
                const similarity = jaccardSimilarity(norm1, norm2);
                if (similarity > 0.8) {
                    console.log(`[SEMANTIC] Word Salad Match (${(similarity * 100).toFixed(0)}%) in (${muscle} / ${category})`);
                    console.log(`  1. "${ex1.name}"`);
                    console.log(`  2. "${ex2.name}"`);
                    foundIssues = true;
                    continue;
                }

                // Substring with equipment check
                if ((norm1.includes(norm2) || norm2.includes(norm1)) && ex1.equipment.join(',') === ex2.equipment.join(',')) {
                    const longer = norm1.length > norm2.length ? norm1 : norm2;
                    const shorter = norm1.length > norm2.length ? norm2 : norm1;

                    const extraWords = longer.replace(shorter, '').trim().split(' ');
                    const equipmentList = ex1.equipment.map((e) => e.toLowerCase());

                    const isJustEquipment = extraWords.every((w) => w === '' || equipmentList.some((eq) => eq.includes(w)));

                    if (isJustEquipment) {
                        console.log(`[REDUNDANT] Name includes equipment explicitly`);
                        console.log(`  1. "${ex1.name}"`);
                        console.log(`  2. "${ex2.name}"`);
                        foundIssues = true;
                    }
                }
            }
        }
    }

    if (!foundIssues) {
        logger.success('No likely semantic duplicates found.');
    }
}

export const main = fuzzy;
