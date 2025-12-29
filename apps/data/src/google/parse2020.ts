import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { type SetDetail, type Workout, WorkoutSchema } from '../compile/types';
import { runCLI } from '../utils/cli';
import { logger } from '../utils/logger';
import { parseCsv } from './csv';
import { type ParsedRow2020, ParsedRow2020Schema, type UnitType } from './types2020';

const KG_TO_LBS = 2.20462;
const CUTOFF_DATE = new Date('2020-07-20');
const CUSTOM_ID_START = 99000000;

// Exercise ID mappings
const MainLiftIds: Record<string, number> = {
    sq: 1, // Back Squat
    bp: 1162, // Bench Press
    op: 687821, // Overhead Press
    dl: 424, // Deadlift
};

const VariationIds: Record<string, number> = {
    'sq-pause': 143, // Pause Back Squat
    'bp-pause': 1634536, // Paused Bench Press
    'bp-paused': 1634536, // Paused Bench Press
    'dl-pause': 1634537, // Paused Deadlift
    'dl-paused': 1634537, // Paused Deadlift
    'bp-close-grip': 901, // Close Grip Bench Press
    'bp-larsen': 4183775, // Larsen Press (close grip feet up)
    'bp-spoto': 1634536, // Spoto Press (treat as paused bench)
};

const AccessoryIds: Record<string, number> = {
    'barbell row': 76843,
    'bent over rows': 76843,
    'bent over row': 76843,
    'db shoulder raises': 1972,
    'db shoulder raise': 1972,
    'shoulder raises': 1972,
    'shoulder raise': 1972,
    'split squat': 421,
    'bulgarian split squat': 40,
    'db bulgarian split squat': 40,
    'hip thrust': 3718,
    rdl: 688320,
    'db rdl': 4441861,
    'inverted rows': 187,
    'inverted row': 187,
    chins: 191,
    'chin-up': 191,
    'lying tricep ext': 76842,
    lunges: 4164,
    'db lunges': 4164,
    'reverse lunges': 687503,
    'db reverse lunges': 4164,
    'lunges with bar': 687503,
    'reverse lunges with bar': 687503,
    'step ups': 686252,
    'step up': 686252,
    'eccentric step ups': 686252,
    'seated shoulder press': 51423,
    'seated overhead press': 51423,
};

// In-memory cache of metadata to avoid repeated file reads
interface ExerciseMetadata {
    id: number;
    name: string;
    slug: string;
    videoUrl: string;
    category: string;
    primaryMuscleGroup: string;
    equipment: string[];
}

interface MetadataFile {
    exercises: ExerciseMetadata[];
}

let metadataCache: MetadataFile | null = null;

// Helper: Determine if date is in KG phase
const determineUnits = (dateStr: string): UnitType => {
    const date = new Date(dateStr);
    return date >= CUTOFF_DATE ? 'kg' : 'lbs';
};

// Helper: Convert weight to LBS if needed
const convertToLbs = (weight: number, units: UnitType, isDbExercise: boolean): number => {
    // If it's a DB exercise during KG phase, it's already in LBS
    if (units === 'kg' && isDbExercise) {
        return weight;
    }
    // If it's KG, convert to LBS
    if (units === 'kg') {
        return weight * KG_TO_LBS;
    }
    // Already in LBS
    return weight;
};

// Helper: Check if row is a valid workout
const isValidWorkoutRow = (row: ParsedRow2020, csvRow: Record<string, unknown>): boolean => {
    // Check if first column (unnamed) has text (cycle names, etc.)
    const firstCol = csvRow[''] as string;
    if (firstCol && firstCol.trim() !== '') {
        return false;
    }

    // Check for date format M/D/YYYY
    if (!row.date || !row.date.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        return false;
    }

    // Check for LOCKDOWN or descriptive text in main lift columns
    const hasLockdownText =
        row.sq?.includes('LOCKDOWN') || row.bp?.includes('LOCKDOWN') || row.bp?.includes('light workout') || row.bp?.includes('technique');

    return !hasLockdownText;
};

// Helper: Detect variation from cell text
const detectVariation = (cellValue: string, liftType: string): string | null => {
    const lowerCell = cellValue.toLowerCase();

    if (liftType === 'bp') {
        if (lowerCell.includes('close grip') && (lowerCell.includes('feet up') || lowerCell.includes('larsen'))) {
            return 'bp-larsen';
        }
        if (lowerCell.includes('close grip')) {
            return 'bp-close-grip';
        }
        if (lowerCell.includes('spoto')) {
            return 'bp-spoto';
        }
        if (lowerCell.includes('pause') || lowerCell.includes('paused')) {
            return 'bp-pause';
        }
    }

    if (liftType === 'sq') {
        if (lowerCell.includes('pause')) {
            return 'sq-pause';
        }
    }

    if (liftType === 'dl') {
        if (lowerCell.includes('pause') || lowerCell.includes('paused')) {
            return 'dl-pause';
        }
    }

    return null;
};

// Helper: Clean cell value of variation text
const cleanCellValue = (cellValue: string): string => {
    return cellValue.replace(/\s+(tempo|pause|paused|close grip|feet up|spoto|touch n go|touch , go|eccentric.*|3sec eccentric)/gi, '').trim();
};

// Helper: Parse main lift cell (SQ, BP, OP, DL)
const parseMainLiftCell = (
    cellValue: string,
    liftType: string,
    units: UnitType
): { exerciseId: number; originalName: string; sets: SetDetail[] } | null => {
    if (!cellValue || cellValue.trim() === '' || cellValue.includes('missed')) {
        return null;
    }

    // Detect variation
    const variation = detectVariation(cellValue, liftType);
    const exerciseId = variation ? VariationIds[variation] : MainLiftIds[liftType];
    const originalName = variation ? variation : liftType.toUpperCase();

    // Debug: Log main lift exercise lookup
    console.log(`[MAIN LIFT] Found: ${originalName} | ID: ${exerciseId} | Cell: "${cellValue.substring(0, 30)}..."`);

    // Clean the cell value
    const cleanedValue = cleanCellValue(cellValue);

    // Parse the sets
    const sets: SetDetail[] = [];

    if (cleanedValue.includes('@')) {
        // Format: "5,5,5@200,180,180" or "4x8@100"
        const [repsStr, weightsStr] = cleanedValue.split('@');

        if (repsStr.includes('x')) {
            // Format: 4x8@100
            const [setsCount, reps] = repsStr.split('x').map((s) => Number.parseInt(s.trim(), 10));
            const weight = convertToLbs(Number.parseFloat(weightsStr.trim()), units, false);

            for (let i = 0; i < setsCount; i++) {
                sets.push({ reps, weight, order: i });
            }
        } else {
            // Format: 5,5,5@200,180,180
            const repsArr = repsStr.split(',').map((s) => Number.parseInt(s.trim(), 10));
            const weightsArr = weightsStr.includes(',')
                ? weightsStr.split(',').map((s) => Number.parseFloat(s.trim()))
                : repsArr.map(() => Number.parseFloat(weightsStr.trim()));

            for (let i = 0; i < repsArr.length; i++) {
                const weight = convertToLbs(weightsArr[i] || weightsArr[0], units, false);
                sets.push({ reps: repsArr[i], weight, order: i });
            }
        }
    } else {
        // Simple format: "155.00"
        const weight = convertToLbs(Number.parseFloat(cleanedValue), units, false);

        // Default reps based on lift type
        if (liftType === 'dl') {
            // Deadlift: 1 set of 5 reps
            sets.push({ reps: 5, weight, order: 0 });
        } else {
            // SQ, BP, OP: 3 sets of 5 reps
            for (let i = 0; i < 3; i++) {
                sets.push({ reps: 5, weight, order: i });
            }
        }
    }

    return { exerciseId, originalName, sets };
};

// Helper: Load exercise metadata
const loadMetadata = (): MetadataFile => {
    if (metadataCache) {
        return metadataCache;
    }

    const metadataPath = join(__dirname, '../../data/out/exercise-metadata.json');
    const content = readFileSync(metadataPath, 'utf-8');
    metadataCache = JSON.parse(content);
    return metadataCache!;
};

// Helper: Save exercise metadata
const saveMetadata = (metadata: MetadataFile): void => {
    const metadataPath = join(__dirname, '../../data/out/exercise-metadata.json');
    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    metadataCache = metadata;
};

// Helper: Convert name to slug (kebab-case)
const nameToSlug = (name: string): string => {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '_')
        .replace(/-+/g, '_');
};

// Helper: Capitalize first letter of each word
const toTitleCase = (str: string): string => {
    return str
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

// Helper: Create custom exercise metadata entries for unique exercises
const createCustomExercises = (exerciseNames: Set<string>): void => {
    const metadata = loadMetadata();

    // Get next available custom ID
    const customExercises = metadata.exercises.filter((ex) => ex.id >= CUSTOM_ID_START);
    let nextId = customExercises.length === 0 ? CUSTOM_ID_START + 1 : Math.max(...customExercises.map((ex) => ex.id)) + 1;

    logger.info(`Creating ${exerciseNames.size} custom exercise metadata entries...`);

    let createdCount = 0;
    let existingCount = 0;

    for (const exerciseName of exerciseNames) {
        const slug = nameToSlug(exerciseName);
        const titleCase = toTitleCase(exerciseName);

        // Check if exercise already exists in metadata
        const existing = metadata.exercises.find((ex) => ex.slug === slug || ex.name === titleCase);

        if (existing) {
            logger.info(`  "${exerciseName}" already exists with ID: ${existing.id}`);
            existingCount++;
            continue;
        }

        // Create new exercise entry
        const newExercise: ExerciseMetadata = {
            id: nextId,
            name: titleCase,
            slug: slug,
            videoUrl: '',
            category: 'custom',
            primaryMuscleGroup: '',
            equipment: [],
        };

        metadata.exercises.push(newExercise);
        logger.info(`  "${exerciseName}" → ID: ${nextId}`);
        createdCount++;
        nextId++;
    }

    // Sort by ID
    metadata.exercises.sort((a, b) => a.id - b.id);

    // Save to file
    saveMetadata(metadata);

    logger.success(`Created ${createdCount} new exercises, ${existingCount} already existed`);
};

// Helper: Extract exercise name from accessory cell
const extractExerciseName = (cellValue: string): { name: string; isDb: boolean } => {
    let name = cellValue;

    // Remove various set/rep patterns at the beginning:
    // - "4x8@20 exercise" -> "exercise"
    // - "5,5,5@200,180,180 exercise" -> "exercise"
    // - "5,5,5 exercise" -> "exercise"
    // - "3x10 exercise" -> "exercise"

    // Remove "NxM@weight " pattern
    name = name.replace(/^\d+x\d+@\d+(\.\d+)?\s+/i, '');

    // Remove "N,N,N@weight,weight " pattern
    name = name.replace(/^[\d,]+@[\d,.]+\s+/i, '');

    // Remove "N,N,N " pattern (reps only)
    name = name.replace(/^[\d,]+\s+(?=[a-zA-Z])/i, '');

    // Remove "NxM " pattern
    name = name.replace(/^\d+x\d+\s+/i, '');

    // Remove trailing parentheses like "(empty bar)"
    name = name.replace(/\s*\([^)]*\)\s*$/gi, '').trim();

    const isDb = name.toLowerCase().includes('db') || name.toLowerCase().includes('dumbbell');

    return { name, isDb };
};

// Helper: Map exercise name to ID
const mapExerciseNameToId = (exerciseName: string, metadata?: MetadataFile): number => {
    const lowerName = exerciseName.toLowerCase().trim();

    // Try exact match in AccessoryIds
    if (AccessoryIds[lowerName] !== undefined) {
        console.log(`[ACCESSORY] Found (exact): "${exerciseName}" | ID: ${AccessoryIds[lowerName]}`);
        return AccessoryIds[lowerName];
    }

    // Try partial matches in AccessoryIds
    for (const [key, id] of Object.entries(AccessoryIds)) {
        if (lowerName.includes(key) || key.includes(lowerName)) {
            console.log(`[ACCESSORY] Found (partial match with "${key}"): "${exerciseName}" | ID: ${id}`);
            return id;
        }
    }

    // Not in AccessoryIds - check metadata if provided
    if (metadata) {
        const slug = nameToSlug(exerciseName);
        const titleCase = toTitleCase(exerciseName);

        const existing = metadata.exercises.find((ex) => ex.slug === slug || ex.name.toLowerCase() === lowerName || ex.name === titleCase);

        if (existing) {
            console.log(`[ACCESSORY] Found in metadata: "${exerciseName}" | ID: ${existing.id}`);
            return existing.id;
        }

        // Debug: show what we're looking for
        console.log(`[ACCESSORY] NOT FOUND IN METADATA: "${exerciseName}" | slug: "${slug}" | titleCase: "${titleCase}"`);
    }

    // Not found anywhere
    console.log(`[ACCESSORY] NOT FOUND: "${exerciseName}"`);
    return 0;
};

// Helper: Parse accessory cell
const parseAccessoryCell = (
    cellValue: string,
    units: UnitType,
    metadata?: MetadataFile
): { exerciseId: number; originalName: string; sets: SetDetail[] } | null => {
    if (!cellValue || cellValue.trim() === '') {
        return null;
    }

    // Extract exercise name
    const { name: exerciseName, isDb } = extractExerciseName(cellValue);

    // Map to exercise ID
    const exerciseId = mapExerciseNameToId(exerciseName, metadata);

    // Parse sets
    const sets: SetDetail[] = [];

    // Check for various formats
    if (cellValue.match(/^\d+x\d+@\d+/)) {
        // Format: "4x8@20 split squat"
        const match = cellValue.match(/^(\d+)x(\d+)@(\d+(?:\.\d+)?)/);
        if (match) {
            const setsCount = Number.parseInt(match[1], 10);
            const reps = Number.parseInt(match[2], 10);
            const rawWeight = Number.parseFloat(match[3]);
            const weight = convertToLbs(rawWeight, units, isDb);

            for (let i = 0; i < setsCount; i++) {
                sets.push({ reps, weight, order: i });
            }
        }
    } else if (cellValue.match(/^\d+x\d+\s/)) {
        // Format: "3x10 bird dogs" (bodyweight, no weight specified)
        const match = cellValue.match(/^(\d+)x(\d+)/);
        if (match) {
            const setsCount = Number.parseInt(match[1], 10);
            const reps = Number.parseInt(match[2], 10);

            for (let i = 0; i < setsCount; i++) {
                sets.push({ reps, weight: 0, order: i });
            }
        }
    } else if (cellValue.match(/^\d+,/)) {
        // Format: "5,5,5 chins" or "8,8,8,8@20,20,20,30"
        const parts = cellValue.split(/\s+/);
        const repsAndWeights = parts[0];

        if (repsAndWeights.includes('@')) {
            const [repsStr, weightsStr] = repsAndWeights.split('@');
            const repsArr = repsStr.split(',').map((s) => Number.parseInt(s.trim(), 10));
            const weightsArr = weightsStr.split(',').map((s) => Number.parseFloat(s.trim()));

            for (let i = 0; i < repsArr.length; i++) {
                const rawWeight = weightsArr[i] || weightsArr[0] || 0;
                const weight = convertToLbs(rawWeight, units, isDb);
                sets.push({ reps: repsArr[i], weight, order: i });
            }
        } else {
            // No weights specified (bodyweight)
            const repsArr = repsAndWeights.split(',').map((s) => Number.parseInt(s.trim(), 10));
            for (let i = 0; i < repsArr.length; i++) {
                sets.push({ reps: repsArr[i], weight: 0, order: i });
            }
        }
    }

    if (sets.length === 0) {
        return null;
    }

    return { exerciseId, originalName: exerciseName, sets };
};

// Main: Parse workout row
const parseWorkoutRow = (row: ParsedRow2020, metadata?: MetadataFile): Workout => {
    // Parse date
    const [month, day, year] = row.date.split('/').map((s) => Number.parseInt(s, 10));
    const date = new Date(year, month - 1, day);
    const isoDate = date.toISOString().split('T')[0];

    // Determine units
    const units = determineUnits(row.date);

    // Parse exercises
    const exercises: {
        exerciseId: number;
        originalName: string;
        order: number;
        sets: SetDetail[];
        volume: number;
    }[] = [];

    let order = 0;

    // Parse main lifts
    for (const [key, value] of Object.entries(row)) {
        if (['sq', 'bp', 'op', 'dl'].includes(key) && value) {
            const parsed = parseMainLiftCell(value, key, units);
            if (parsed) {
                const volume = parsed.sets.reduce((sum, set) => sum + (set.reps ?? 1) * set.weight, 0);
                exercises.push({
                    ...parsed,
                    order: order++,
                    volume,
                });
            }
        }
    }

    // Parse accessories
    for (const [key, value] of Object.entries(row)) {
        if (key.startsWith('accessor') || key.startsWith('accesory')) {
            if (value) {
                const parsed = parseAccessoryCell(value, units, metadata);
                if (parsed) {
                    const volume = parsed.sets.reduce((sum, set) => sum + (set.reps ?? 1) * set.weight, 0);
                    exercises.push({
                        ...parsed,
                        order: order++,
                        volume,
                    });
                }
            }
        }
    }

    // Calculate total volume
    const totalVolume = exercises.reduce((sum, ex) => sum + ex.volume, 0);

    // Build workout
    const workout = {
        uuid: uuidv4(),
        date,
        title: isoDate,
        duration: 90,
        rpe: 8,
        exercises: exercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            order: ex.order,
            sets: ex.sets,
            volume: ex.volume,
        })),
        volume: totalVolume,
    };

    return WorkoutSchema.parse(workout);
};

// Main: Load and parse 2020 CSV
const parse2020 = () => {
    const csvPath = join(__dirname, '../../data/download/google/journal-2020.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');
    const csvData = parseCsv(csvContent);

    logger.processing(`Parsing ${csvData.length} rows from journal-2020.csv`);

    // PASS 1: Collect unique unmapped exercise names
    logger.info('\n=== PASS 1: Collecting unmapped exercises ===');
    const unmappedExercises = new Set<string>();

    for (const csvRow of csvData) {
        try {
            const row = ParsedRow2020Schema.parse(csvRow);

            if (isValidWorkoutRow(row, csvRow)) {
                // Check accessories for unmapped exercises
                for (const [key, value] of Object.entries(row)) {
                    if (key.startsWith('accessor') && value) {
                        const { name: exerciseName } = extractExerciseName(value);
                        const id = mapExerciseNameToId(exerciseName);

                        if (id === 0) {
                            unmappedExercises.add(exerciseName);
                        }
                    }
                }
            }
        } catch (_error) {
            // Skip invalid rows silently in first pass
        }
    }

    logger.info(`Found ${unmappedExercises.size} unique unmapped exercises`);

    // Create custom exercise metadata entries
    if (unmappedExercises.size > 0) {
        createCustomExercises(unmappedExercises);
        logger.success('Custom exercise metadata created');
    }

    // Reload metadata to get all IDs
    metadataCache = null; // Clear cache
    const metadata = loadMetadata();

    // PASS 2: Parse workouts with all IDs available
    logger.info('\n=== PASS 2: Parsing workouts ===');
    const workouts: Workout[] = [];

    for (const csvRow of csvData) {
        try {
            const row = ParsedRow2020Schema.parse(csvRow);

            if (isValidWorkoutRow(row, csvRow)) {
                const workout = parseWorkoutRow(row, metadata);
                workouts.push(workout);
            }
        } catch (error) {
            logger.warning(`Skipping row: ${JSON.stringify(csvRow)}`);
            logger.warning(`Error: ${error}`);
        }
    }

    logger.processed(`Parsed ${workouts.length} workouts`);

    // Write output
    const outputPath = join(__dirname, '../../data/download/google/lifting-log-2020.json');
    writeFileSync(outputPath, JSON.stringify({ workouts }, null, 2));

    logger.success(`Output written to: ${outputPath}`);
};

const commands = {
    parse: parse2020,
};

runCLI({
    commands,
    usage: 'bun src/google/parse2020.ts <command>',
    examples: ['bun src/google/parse2020.ts parse  # Parse journal-2020.csv'],
}).catch((err) => {
    logger.error('Error:');
    logger.error(err);
    process.exit(1);
});
