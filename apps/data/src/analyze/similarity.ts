/**
 * String similarity utilities for duplicate detection
 */

/**
 * Common abbreviations used in exercise names
 */
export const COMMON_ABBREVIATIONS: Record<string, string> = {
    db: 'dumbbell',
    bb: 'barbell',
    kb: 'kettlebell',
    bw: 'bodyweight',
    alt: 'alternating',
    inc: 'incline',
    dec: 'decline',
    lat: 'lateral',
    med: 'medball',
};

/**
 * Levenshtein distance - measures minimum edits to transform one string to another
 */
export function levenshtein(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1, // insertion
                    matrix[i - 1][j] + 1 // deletion
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Jaccard similarity - measures overlap between word sets (0-1)
 * Good for detecting reordered words: "Bench Press Barbell" vs "Barbell Bench Press"
 */
export function jaccardSimilarity(s1: string, s2: string): number {
    const a = new Set(s1.split(' '));
    const b = new Set(s2.split(' '));
    const intersection = new Set([...a].filter((x) => b.has(x)));
    const union = new Set([...a, ...b]);
    return intersection.size / union.size;
}

/**
 * Normalize exercise name for comparison
 * - Lowercase
 * - Remove punctuation
 * - Expand common abbreviations
 */
export function normalizeName(name: string): string {
    const normalized = name
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const words = normalized.split(' ');
    const expanded = words.map((w) => COMMON_ABBREVIATIONS[w] || w);
    return expanded.join(' ');
}

/**
 * Strip all non-alphanumeric characters for loose comparison
 */
export function stripToAlphanumeric(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}
