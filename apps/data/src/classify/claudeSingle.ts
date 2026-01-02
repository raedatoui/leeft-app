import { logger } from '@leeft/utils';
import { runClassifyExercise } from './claudeClassifier';

export async function classifyAndPrintExercise(exerciseName: string) {
    try {
        const result = await runClassifyExercise(exerciseName);
        logger.info(`Classification result: ${JSON.stringify(result)}`);
        return result;
    } catch (error) {
        logger.error(`Error classifying exercise: ${error}`);
        throw error;
    }
}

export async function main() {
    const exerciseName = process.argv[2];
    if (!exerciseName) {
        logger.error('Usage: classify:claude-single <exercise-name>');
        process.exit(1);
    }
    await classifyAndPrintExercise(exerciseName);
}
