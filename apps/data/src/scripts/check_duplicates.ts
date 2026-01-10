import {
    readFileSync
} from 'fs';
import {
    join
} from 'path';

// Levenshtein distance implementation
function levenshtein(a: string, b: string): number {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) == a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

const filePath = join(process.cwd(), 'apps/data/data/exercise-classified.json');
try {
    const data = readFileSync(filePath, 'utf-8');
    const exercises = JSON.parse(data);

    const names = exercises.map((e: any) => e.name);
    const slugs = exercises.map((e: any) => e.slug);
    
    console.log(`Total exercises: ${exercises.length}`);

    // 1. Exact Duplicates
    const nameCounts: Record<string, number> = {};
    const slugCounts: Record<string, number> = {};
    
    exercises.forEach((e: any) => {
        nameCounts[e.name] = (nameCounts[e.name] || 0) + 1;
        slugCounts[e.slug] = (slugCounts[e.slug] || 0) + 1;
    });

    const duplicateNames = Object.entries(nameCounts).filter(([_, count]) => count > 1);
    const duplicateSlugs = Object.entries(slugCounts).filter(([_, count]) => count > 1);

    if (duplicateNames.length > 0) {
        console.log('\n--- Exact Duplicate Names ---');
        duplicateNames.forEach(([name, count]) => console.log(`"${name}": ${count} times`));
    } else {
        console.log('\nNo exact duplicate names found.');
    }

    if (duplicateSlugs.length > 0) {
        console.log('\n--- Exact Duplicate Slugs ---');
        duplicateSlugs.forEach(([slug, count]) => console.log(`"${slug}": ${count} times`));
    } else {
        console.log('\nNo exact duplicate slugs found.');
    }

    // 2. Similar Names (Fuzzy Matching)
    console.log('\n--- Similar Names (Potential Duplicates) ---');
    const processed = new Set<string>();
    
    for (let i = 0; i < exercises.length; i++) {
        for (let j = i + 1; j < exercises.length; j++) {
            const name1 = exercises[i].name;
            const name2 = exercises[j].name;
            const idKey = [name1, name2].sort().join('|');

            if (processed.has(idKey)) continue;

            const lower1 = name1.toLowerCase().replace(/[^a-z0-9]/g, '');
            const lower2 = name2.toLowerCase().replace(/[^a-z0-9]/g, '');

            // Check if one contains the other
            if (lower1.includes(lower2) || lower2.includes(lower1)) {
                 // Ignore if very short to avoid noise
                 if (Math.min(lower1.length, lower2.length) > 5) {
                    console.log(`Substring match: "${name1}" <-> "${name2}"`);
                    processed.add(idKey);
                    continue;
                 }
            }

            // Levenshtein distance
            const dist = levenshtein(lower1, lower2);
            // Threshold: arbitrary, say if distance is less than 3 for strings > 5 chars
            if (dist < 3 && lower1.length > 5 && lower2.length > 5) {
                console.log(`Fuzzy match (dist ${dist}): "${name1}" <-> "${name2}"`);
                processed.add(idKey);
            }
        }
    }

} catch (e) {
    console.error("Error reading or processing file:", e);
}
