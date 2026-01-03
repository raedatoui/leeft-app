import { logger } from '@leeft/utils';
import { type SetDetail, type Workout, WorkoutSchema } from '../compile/types';
import { type CsvRow, type ParsedRow, ParsedRowSchema } from './types';

const isWorkout = (workout: ParsedRow) => {
    const firstChar = workout.sq.toString().substring(0, 1);
    return firstChar === '' || !Number.isNaN(Number.parseInt(firstChar, 10));
};

const ExerciseIdMap: Record<string, number> = {
    sq: 1, // Back Squat
    bp: 1162, // Bench Press
    dl: 424, // Deadlift
    op: 687821, // Overhead Press
    sqp: 143, // Back Squat Paused
    dlp: 1634537, // Deadlift Paused
    chins: 191, // Chin-ups
};

const parseMainLift = (cellValue: string, columnName: string): SetDetail[] => {
    if (cellValue.includes('@')) {
        const workout = [];
        const [repsAbr, weight] = cellValue.split('@');
        let reps: number;
        let sets: number;

        if (repsAbr.includes('x')) {
            const s = repsAbr.split('x');
            sets = Number.parseInt(s[0], 10);
            reps = Number.parseInt(s[1], 10);
            for (let i = 1; i <= sets; i++)
                workout.push({
                    reps,
                    weight: Number.parseFloat(weight),
                    order: i,
                });
        } else if (repsAbr.includes(',')) {
            const s = repsAbr.split(',');
            const weights = weight.includes(',') ? weight.split(',') : s.map(() => weight);
            for (let i = 0; i < s.length; i++)
                workout.push({
                    reps: Number.parseInt(s[i], 10),
                    weight: Number.parseFloat(weights[i]),
                    order: i,
                });
        } else
            workout.push({
                reps: Number.parseInt(repsAbr, 10),
                weight: Number.parseFloat(weight),
                order: 0,
            });
        return workout;
    }
    const weight = Number.parseFloat(cellValue);
    if (Number.isNaN(weight)) {
        logger.warning(`${cellValue}, ${columnName}`);
    }

    if (columnName === 'dl' || columnName === 'dlp') return [{ reps: 5, weight, order: 0 }];
    return [
        { reps: 5, weight, order: 0 },
        { reps: 5, weight, order: 1 },
        { reps: 5, weight, order: 2 },
    ];
};

const parseAccessory = (cellValue: string, _columnName: string): SetDetail[] => {
    const [exercise, repsStr] = cellValue.split(' ');
    const reps = repsStr.split(',').map(Number);
    let weight = 0;

    if (exercise.includes('+')) {
        const [_, weightStr] = exercise.split('+');
        weight = Number.parseFloat(weightStr);
    }
    return reps.map((rep, index) => ({
        reps: rep,
        weight,
        order: index,
    }));
};

const parseCell = (cellValue: string, columnName: string): SetDetail[] => {
    if (['sq', 'bp', 'dl', 'op', 'sqp', 'dlp'].includes(columnName)) return parseMainLift(cellValue, columnName);
    // else if (cellValue.startsWith('chins'))
    return parseAccessory(cellValue, columnName);
};
/*
TODO update the name handling
TODO: parsing accessory, might need sheet cleanup, this cleanup can work for 2020 and murder of crows
 */
const parseWorkout = (row: ParsedRow): Workout => {
    const dateParts = row.date.split('/');
    const isoDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
    const date = new Date(row.date);

    const exercises = Object.entries(row)
        .map((c, index) => {
            if (c[0] !== 'date' && c[1] !== '' && c[1] !== 'missed' && !['accessory2', 'accessory3', 'accessory4', 'accessory5'].includes(c[0])) {
                let name = c[0];
                let cell = c[1];
                if (c[1].includes('pause')) {
                    name = `${name}p`;
                    // eslint-disable-next-line prefer-destructuring
                    cell = cell.split(' pause')[0];
                }
                if (name === 'accessory1') name = 'chins';
                const exerciseId = ExerciseIdMap[name] || 0;
                const sets = parseCell(cell, name);
                return {
                    exerciseId,
                    order: index,
                    name,
                    sets,
                    volume: sets.reduce((total, set) => total + (set.reps || 0) * set.weight, 0),
                };
            }
            return null;
        })
        .filter((e) => e !== null);
    try {
        return WorkoutSchema.parse({
            date,
            title: isoDate,
            duration: 90,
            rpe: 8.5,
            exercises,
            volume: exercises.reduce((total, ex) => total + (ex?.volume ?? 0), 0),
        });
    } catch (error) {
        logger.error('Error parsing workout:');
        logger.error(row);
        throw error;
    }
};

export const loadSheet = (csvData: CsvRow[]): Workout[] =>
    csvData
        .map((r) => ParsedRowSchema.parse(r))
        .filter((r) => isWorkout(r))
        .map((r) => parseWorkout(r));
