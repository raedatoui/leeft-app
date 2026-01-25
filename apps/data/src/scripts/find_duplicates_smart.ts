import { readFileSync } from 'fs';
import { join } from 'path';

interface Exercise {
    id: number;
    slug: string;
    name: string;
    category: string;
    primaryMuscleGroup: string;
    equipment: string[];
    description: string;
}

const COMMON_ABBREVIATIONS: Record<string, string> = {
    db: 'dumbbell',
    bb: 'barbell',
    kb: 'kettlebell',
    bw: 'bodyweight',
    alt: 'alternating',
    inc: 'incline',
    dec: 'decline',
    lat: 'lateral',
    med: 'medball',
    machine: 'mach', // normalize machine to mach for loose matching, or vice versa
};

function normalizeName(name: string): string {
    const normalized = name
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ') // Replace punctuation with space
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .trim();

    // Expand abbreviations
    const words = normalized.split(' ');
    const expanded = words.map((w) => COMMON_ABBREVIATIONS[w] || w);
    return expanded.join(' ');
}

// Jaccard similarity for sets of words (good for "Bench Press Barbell" vs "Barbell Bench Press")
function jaccardSimilarity(s1: string, s2: string): number {
    const a = new Set(s1.split(' '));
    const b = new Set(s2.split(' '));
    const intersection = new Set([...a].filter((x) => b.has(x)));
    const union = new Set([...a, ...b]);
    return intersection.size / union.size;
}

const filePath = join(process.cwd(), 'data/exercise-classified.json');

try {
    const rawData = readFileSync(filePath, 'utf-8');
    const exercises: Exercise[] = JSON.parse(rawData);

    // Group exercises by Muscle + Category
    // This dramatically narrows the search space for semantic duplicates
    const groups: Record<string, Exercise[]> = {};

    exercises.forEach((ex) => {
        // Equipment needs to be sorted for consistent grouping
        // If multiple equipment, we might make a key like "quads-olympic-barbell"
        // But some exercises have multiple equipment listed, so we'll be slightly looser
        // and group by Muscle + Category primarily.

        const key = `${ex.primaryMuscleGroup}|${ex.category}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(ex);
    });

    console.log(`Analyzing ${exercises.length} exercises across ${Object.keys(groups).length} muscle/category groups...`);
    console.log('---------------------------------------------------------');

    let foundIssues = false;

    for (const [groupKey, groupExercises] of Object.entries(groups)) {
        if (groupExercises.length < 2) continue;

        const [muscle, category] = groupKey.split('|');

        // Compare every pair in this group
        for (let i = 0; i < groupExercises.length; i++) {
            for (let j = i + 1; j < groupExercises.length; j++) {
                const ex1 = groupExercises[i];
                const ex2 = groupExercises[j];

                const norm1 = normalizeName(ex1.name);
                const norm2 = normalizeName(ex2.name);

                // 1. Check Normalized Name Match
                if (norm1 === norm2) {
                    console.log(`[DUPLICATE] Exact Normalized Name in (${muscle} / ${category})`);
                    console.log(`  1. "${ex1.name}" (ID: ${ex1.id})`);
                    console.log(`  2. "${ex2.name}" (ID: ${ex2.id})`);
                    console.log(`  -> Equipment: [${ex1.equipment}] vs [${ex2.equipment}]`);
                    foundIssues = true;
                    continue;
                }

                // 2. Check Word Reordering (Jaccard)
                // "Barbell Squat" vs "Squat Barbell"
                const similarity = jaccardSimilarity(norm1, norm2);
                if (similarity > 0.8) {
                    // Very high overlap
                    console.log(`[SEMANTIC] Word Salad Match (${(similarity * 100).toFixed(0)}%) in (${muscle} / ${category})`);
                    console.log(`  1. "${ex1.name}"`);
                    console.log(`  2. "${ex2.name}"`);
                    foundIssues = true;
                    continue;
                }

                // 3. Substring with Equipment Check
                // If "Bench Press" and "Barbell Bench Press" exist, and both use Barbell
                if ((norm1.includes(norm2) || norm2.includes(norm1)) && ex1.equipment.join(',') === ex2.equipment.join(',')) {
                    // Check if length diff is small enough to be a variation, not a different exercise
                    // e.g. "Close Grip Bench Press" contains "Bench Press" but is different.
                    // But "Barbell Bench Press" contains "Bench Press" and IS the same (usually).

                    const longer = norm1.length > norm2.length ? norm1 : norm2;
                    const shorter = norm1.length > norm2.length ? norm2 : norm1;

                    // If the extra words are just equipment names, it's likely a dupe
                    // e.g. "Barbell Squat" vs "Squat" (Equipment: Barbell)
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
        console.log('No likely semantic duplicates found.');
    }
} catch (e) {
    console.error('Error:', e);
}
