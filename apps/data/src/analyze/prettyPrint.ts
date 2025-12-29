import { readExerciseMap, readLog } from '../compile/readFiles';
import type { ExerciseMetadata, SetDetail, Workout } from '../compile/types';

function calculateExerciseVolume(sets: SetDetail[]): number {
    return sets.reduce((sum, set) => sum + (set.reps ?? 0) * set.weight, 0);
}
const CONTENT_WIDTH = 45;

function formatWorkout(workout: Workout, exerciseMap: Map<string, ExerciseMetadata>): string {
    const date = workout.date;
    const dayStr = `${date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    })}`;

    const horizontalLine = '━'.repeat(CONTENT_WIDTH);

    let output = '';
    output += `┏${horizontalLine}┓\n`;
    output += `┃ ${dayStr.padEnd(CONTENT_WIDTH - 1)}┃\n`;
    output += `┣${horizontalLine}┫\n`;

    // Format exercises with proper alignment and spacing
    workout.exercises.forEach((exercise, index) => {
        const exerciseName = exerciseMap.get(exercise.exerciseId.toString())?.name || `Exercise ${exercise.exerciseId}`;

        // Print exercise name
        output += `┃ ${exerciseName}${' '.repeat(CONTENT_WIDTH - exerciseName.length - 1)}┃\n`;

        // Print column headers
        output += `┃    ${'set'.padEnd(4)} ${'reps'.padEnd(4)} weight${' '.repeat(CONTENT_WIDTH - 20)}┃\n`;
        output += `┃    ${'-'.repeat(4)} ${'-'.repeat(4)} ${'-'.repeat(6)}${' '.repeat(CONTENT_WIDTH - 20)}┃\n`;

        // Print set details in a minimal format
        exercise.sets.forEach((set, setIndex) => {
            const setNum = `#${setIndex + 1}`.padStart(3);
            const reps = set.reps?.toString().padStart(2);
            const weight = `${set.weight}`.padStart(4);
            const setLine = `${setNum}   ${reps}    ${weight}`;
            output += `┃    ${setLine.padEnd(CONTENT_WIDTH - 4)}┃\n`;
        });

        // Calculate and print exercise volume
        const exerciseVolume = calculateExerciseVolume(exercise.sets);
        const volumeLine = `Total: ${exerciseVolume.toLocaleString()} lbs`;
        output += `┃    ${volumeLine.padEnd(CONTENT_WIDTH - 4)}┃\n`;

        // Add separator between exercises
        if (index < workout.exercises.length - 1) {
            output += `┃${' '.repeat(CONTENT_WIDTH - 1)} ┃\n`;
        }
    });

    // Add volume and stats with separator
    output += `┣${horizontalLine}┫\n`;

    const volumeStr = `Volume: ${workout.volume.toLocaleString()}`;
    const durationStr = `Duration: ${workout.duration} min`;
    const rpeStr = workout.rpe ? `RPE: ${workout.rpe}` : '';

    const statsLine = [volumeStr, durationStr, rpeStr].filter(Boolean).join(' | ');
    output += `┃ ${statsLine.padEnd(CONTENT_WIDTH - 1)}┃\n`;
    output += `┗${horizontalLine}┛\n\n`;

    return output;
}

function formatWorkoutReduced(workout: Workout, exerciseMap: Map<string, ExerciseMetadata>): string {
    const date = workout.date;
    const dayStr = `${date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    })}`;

    let output = `${dayStr}\n`;

    workout.exercises.forEach((exercise) => {
        const exerciseName = exerciseMap.get(exercise.exerciseId.toString())?.name || `Exercise ${exercise.exerciseId}`;

        // Collect reps and weights
        const reps = exercise.sets.map((set) => set.reps ?? 0).join(',');
        const weights = exercise.sets.map((set) => set.weight).join(',');

        output += `${exerciseName}: ${reps}@${weights}\n`;
    });

    output += '\n';

    return output;
}

function printSummaryHeader(
    totalWorkouts: number,
    totalVolume: number,
    avgVolume: number,
    avgDuration: number,
    startDateStr?: string,
    endDateStr?: string
): void {
    const horizontalLine = '═'.repeat(CONTENT_WIDTH);

    console.log(`╔${horizontalLine}╗`);
    console.log(`║ WORKOUT SUMMARY${' '.repeat(CONTENT_WIDTH - 16)}║`);
    console.log(`╠${horizontalLine}╣`);
    console.log(
        `║ Date Range: ${startDateStr || 'Start'} to ${endDateStr || 'End'}${' '.repeat(CONTENT_WIDTH - `Date Range: ${startDateStr || 'Start'} to ${endDateStr || 'End'}`.length - 1)}║`
    );
    console.log(`║ Total Workouts: ${totalWorkouts}${' '.repeat(CONTENT_WIDTH - `Total Workouts: ${totalWorkouts}`.length - 1)}║`);
    console.log(
        `║ Total Volume: ${totalVolume.toLocaleString()}${' '.repeat(CONTENT_WIDTH - `Total Volume: ${totalVolume.toLocaleString()}`.length - 1)}║`
    );
    console.log(
        `║ Average Volume per Workout: ${Math.round(avgVolume).toLocaleString()}${' '.repeat(CONTENT_WIDTH - `Average Volume per Workout: ${Math.round(avgVolume).toLocaleString()}`.length - 1)}║`
    );
    console.log(
        `║ Average Duration: ${Math.round(avgDuration)} minutes${' '.repeat(CONTENT_WIDTH - `Average Duration: ${Math.round(avgDuration)} minutes`.length - 1)}║`
    );
    console.log(`╚${horizontalLine}╝\n`);
}

function summarizeWorkoutData(startDateStr?: string, endDateStr?: string, format: 'table' | 'reduced' = 'table'): void {
    const workouts = readLog('../../data/out/lifting-log.json');
    const workoutMap = readExerciseMap();

    let filteredWorkouts = workouts;

    // Filter by date range if provided
    if (startDateStr || endDateStr) {
        const startDate = startDateStr ? new Date(startDateStr) : null;
        const endDate = endDateStr ? new Date(endDateStr) : null;

        filteredWorkouts = workouts.filter((workout) => {
            if (startDate && workout.date < startDate) return false;
            if (endDate && workout.date > endDate) return false;
            return true;
        });
    }

    // Sort workouts by date
    filteredWorkouts.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Print summary statistics
    const totalWorkouts = filteredWorkouts.length;
    const totalVolume = filteredWorkouts.reduce((sum, w) => sum + w.volume, 0);
    const avgVolume = totalVolume / totalWorkouts;
    const avgDuration = filteredWorkouts.reduce((sum, w) => sum + w.duration, 0) / totalWorkouts;

    // Only print header for table format
    if (format === 'table') {
        console.log('\n=== Workout Details ===\n');
        printSummaryHeader(totalWorkouts, totalVolume, avgVolume, avgDuration, startDateStr, endDateStr);
    }

    // Print individual workout details
    const formatter = format === 'reduced' ? formatWorkoutReduced : formatWorkout;
    filteredWorkouts.forEach((workout) => {
        console.log(formatter(workout, workoutMap));
    });
}

export async function main() {
    const args = process.argv.slice(2);

    // Parse arguments
    let startDate: string | undefined;
    let endDate: string | undefined;
    let format: 'table' | 'reduced' = 'table';

    for (const arg of args) {
        if (arg === '--reduced' || arg === '-r') {
            format = 'reduced';
        } else if (arg.startsWith('--format=')) {
            const formatValue = arg.split('=')[1];
            if (formatValue === 'reduced' || formatValue === 'table') {
                format = formatValue;
            }
        } else if (!startDate) {
            startDate = arg;
        } else if (!endDate) {
            endDate = arg;
        }
    }

    summarizeWorkoutData(startDate, endDate, format);
}
