import { logger } from '../utils/logger';
import { runClassifyExercise } from './claudeClassifier';
import { type ClassifiedExercise, loadClassifiedExercises, loadExerciseMetadata, saveClassifiedExercises } from './utils';

async function classifySingleExercise(exerciseId: number): Promise<void> {
    // Load exercise metadata
    const rawExercises = loadExerciseMetadata();

    // Find the exercise by ID
    const exercise = rawExercises.find((ex) => ex.id === exerciseId);
    if (!exercise) {
        logger.error(`Exercise with ID ${exerciseId} not found in exercise-metadata.json`);
        process.exit(1);
    }

    logger.info(`Found exercise: ${exercise.name} (ID: ${exercise.id})`);

    // Check if already classified
    const classifiedExercises = loadClassifiedExercises();
    const alreadyClassified = classifiedExercises.find((ex) => ex.id === exerciseId);
    if (alreadyClassified) {
        logger.info(`Exercise ${exercise.name} is already classified. Skipping.`);
        return;
    }

    try {
        // Classify the exercise
        const classification = await runClassifyExercise(exercise.name);
        // Create classified exercise object
        const classifiedExercise: ClassifiedExercise = {
            id: exercise.id,
            slug: exercise.slug,
            name: exercise.name,
            videoUrl: exercise.videoUrl,
            category: classification.category,
            primaryMuscleGroup: classification.primaryMuscleGroup,
            equipment: classification.equipment,
            description: classification.reasoning,
        };

        // Add to classified exercises
        classifiedExercises.push(classifiedExercise);

        // Save updated classified exercises
        saveClassifiedExercises(classifiedExercises);
        logger.success(`Successfully classified and saved: ${exercise.name}`);
        logger.info(`Classification: ${JSON.stringify(classification)}`);
    } catch (error) {
        logger.error(`Error classifying ${exercise.name}: ${error}`);
        process.exit(1);
    }
}

export async function main() {
    const exerciseIdArg = process.argv[2];

    if (!exerciseIdArg) {
        logger.error('Usage: classify:single <exercise-id>');
        logger.error('Example: classify:single 2974');
        process.exit(1);
    }

    const exerciseId = parseInt(exerciseIdArg, 10);
    if (Number.isNaN(exerciseId)) {
        logger.error('Exercise ID must be a valid integer');
        process.exit(1);
    }

    await classifySingleExercise(exerciseId);
}
