import {
    readFileSync
} from 'fs';
import {
    join
} from 'path';

// Simple Levenshtein distance for string similarity
function getEditDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    // increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // increment each column in the first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) == a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1 // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

interface Exercise {
    id: number;
    slug: string;
    name: string;
    category: string;
    primaryMuscleGroup: string;
    equipment: string[];
}

const filePath = join(process.cwd(), 'data/exercise-classified.json');

try {
    console.log(`Reading from: ${filePath}`);
    const rawData = readFileSync(filePath, 'utf-8');
    const exercises: Exercise[] = JSON.parse(rawData);

    console.log(`Loaded ${exercises.length} exercises.`);
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

            // 1. Check Name Similarity
            const name1 = ex1.name.toLowerCase();
            const name2 = ex2.name.toLowerCase();
            
            // Exact match (shouldn't happen with valid data, but good to check)
            if (name1 === name2) {
                 potentialDuplicates.push({
                    reason: 'Exact Name Match',
                    pair: [ex1.name, ex2.name],
                    details: `IDs: ${ex1.id} vs ${ex2.id}`
                });
                continue;
            }

            // Substring match (e.g., "Dumbbell Press" and "Incline Dumbbell Press")
            // Only flag if the shorter name is at least 60% of the longer name to avoid "Press" matching everything
            if (name1.includes(name2) || name2.includes(name1)) {
                 const longer = name1.length > name2.length ? name1 : name2;
                 const shorter = name1.length > name2.length ? name2 : name1;
                 
                 if (shorter.length > 5 && shorter.length / longer.length > 0.5) {
                    potentialDuplicates.push({
                        reason: 'Substring Match',
                        pair: [ex1.name, ex2.name],
                        details: `"${shorter}" is in "${longer}"`
                    });
                 }
            }

            // Fuzzy match (Levenshtein)
            const dist = getEditDistance(name1, name2);
            // Allow 1 edit for short strings, 2 for medium, 3 for long
            const maxDist = name1.length > 10 ? 3 : (name1.length > 5 ? 2 : 1);
            
            if (dist <= maxDist && dist > 0) { // dist 0 is handled by exact match
                 potentialDuplicates.push({
                    reason: `Fuzzy Match (Dist: ${dist})`,
                    pair: [ex1.name, ex2.name],
                    details: 'Names are very similar spelling-wise'
                });
            }
            
            // 2. Attribute Match (Different name, but same attributes)
            // Only checking if they have valid attributes (not "other" or empty)
            if (
                ex1.category === ex2.category &&
                ex1.primaryMuscleGroup === ex2.primaryMuscleGroup &&
                ex1.equipment.sort().join(',') === ex2.equipment.sort().join(',') &&
                ex1.category !== 'other' && 
                ex1.primaryMuscleGroup !== 'other'
            ) {
                // To reduce noise, only report if names also share some words
                const words1 = new Set(name1.split(' '));
                const words2 = new Set(name2.split(' '));
                const commonWords = [...words1].filter(x => words2.has(x));
                
                if (commonWords.length >= 1) {
                     potentialDuplicates.push({
                        reason: 'Identical Attributes + Shared Words',
                        pair: [ex1.name, ex2.name],
                        details: `Cat: ${ex1.category}, Muscle: ${ex1.primaryMuscleGroup}, Equip: ${ex1.equipment.join(',')}`
                    });
                }
            }
        }
    }

    if (potentialDuplicates.length === 0) {
        console.log("No obvious duplicates found.");
    } else {
        console.log(`Found ${potentialDuplicates.length} potential similarities:\n`);
        
        // Group by reason for cleaner output
        const grouped = potentialDuplicates.reduce((acc, curr) => {
            acc[curr.reason] = acc[curr.reason] || [];
            acc[curr.reason].push(curr);
            return acc;
        }, {} as Record<string, typeof potentialDuplicates>);

        for (const [reason, items] of Object.entries(grouped)) {
            console.log(`[ ${reason} ]`);
            items.forEach(item => {
                console.log(`  • ${item.pair[0]}  <-->  ${item.pair[1]}`);
                console.log(`    (${item.details})`);
            });
            console.log('');
        }
    }

} catch (error) {
    console.error("An error occurred:", error);
}
