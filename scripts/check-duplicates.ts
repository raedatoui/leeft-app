import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const WORKOUTS_DIR = 'apps/data/data/download/trainheroic/workouts';

async function getFiles(dir: string): Promise<string[]> {
    const subdirs = await readdir(dir);
    const files = await Promise.all(subdirs.map(async (subdir) => {
        const res = join(dir, subdir);
        return (await stat(res)).isDirectory() ? getFiles(res) : res;
    }));
    return files.flat();
}

async function checkDuplicates() {
    console.log(`Checking for duplicates in ${WORKOUTS_DIR}...`);

    let files: string[] = [];
    try {
        files = await getFiles(WORKOUTS_DIR);
    } catch (error) {
        console.error(`Error reading directory ${WORKOUTS_DIR}:`, error);
        return;
    }

    const workoutIdMap = new Map<number, string[]>();
    const savedWorkoutIdMap = new Map<number, string[]>();
    const dateMap = new Map<string, string[]>();

    let processedCount = 0;

    for (const filePath of files) {
        if (!filePath.endsWith('.json')) continue;

        try {
            const content = await readFile(filePath, 'utf-8');
            const json = JSON.parse(content);
            const savedWorkout = json.saved_workout;

            if (!savedWorkout) {
                console.warn(`No saved_workout found in ${filePath}`);
                continue;
            }

            const { id, workout_id, title } = savedWorkout;

            // Track workout_id
            if (workout_id) {
                const existing = workoutIdMap.get(workout_id) || [];
                existing.push(filePath);
                workoutIdMap.set(workout_id, existing);
            }

            // Track id
            if (id) {
                const existing = savedWorkoutIdMap.get(id) || [];
                existing.push(filePath);
                savedWorkoutIdMap.set(id, existing);
            }

            // Track title (date)
            if (title) {
                const existing = dateMap.get(title) || [];
                existing.push(filePath);
                dateMap.set(title, existing);
            }

            processedCount++;
        } catch (e) {
            console.error(`Error parsing ${filePath}:`, e);
        }
    }

    console.log(`Processed ${processedCount} files.\n`);

    let foundAny = false;

    console.log('--- Duplicate Workout IDs ---');
    for (const [id, paths] of workoutIdMap) {
        if (paths.length > 1) {
            foundAny = true;
            console.log(`Workout ID: ${id}`);
            paths.forEach(p => console.log(`  - ${p}`));
        }
    }

    console.log('\n--- Duplicate Saved Workout IDs ---');
    for (const [id, paths] of savedWorkoutIdMap) {
        if (paths.length > 1) {
            foundAny = true;
            console.log(`Saved ID: ${id}`);
            paths.forEach(p => console.log(`  - ${p}`));
        }
    }

    console.log('\n--- Duplicate Dates (Titles) ---');
    for (const [date, paths] of dateMap) {
        if (paths.length > 1) {
            foundAny = true;
            console.log(`Date: ${date}`);
            paths.forEach(p => console.log(`  - ${p}`));
        }
    }

    if (!foundAny) {
        console.log('No duplicates found!');
    }
}

checkDuplicates().catch(console.error);