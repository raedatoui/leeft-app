import { config } from 'dotenv';
import { logger } from '@leeft/utils';
import { runClassifyExercise } from './claudeClassifier';
import { type ClassifiedExercise, loadExerciseMetadata, saveClassifiedExercises } from './utils';

config();

export async function main() {
    try {
        const rawExercises = loadExerciseMetadata();

        const classifiedExercises: ClassifiedExercise[] = [];

        for (const rawExercise of rawExercises) {
            logger.classifying(`${rawExercise.name}`);
            try {
                const result = await runClassifyExercise(rawExercise.name);
                classifiedExercises.push({
                    id: rawExercise.id,
                    slug: rawExercise.slug,
                    name: rawExercise.name,
                    videoUrl: rawExercise.videoUrl,
                    category: result.category,
                    primaryMuscleGroup: result.primaryMuscleGroup,
                    equipment: result.equipment,
                    description: result.reasoning,
                });
                logger.classified(`${rawExercise.name}`);
                logger.info(JSON.stringify(result));
            } catch (error) {
                logger.error(`Error classifying ${rawExercise.name}: ${error}`);
            }

            // Add delay between requests
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        saveClassifiedExercises(classifiedExercises);
    } catch (error) {
        logger.error(`Error processing exercises: ${error}`);
    }
}
