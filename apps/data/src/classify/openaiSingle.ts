import { logger } from '@leeft/utils';
import { config } from 'dotenv';
import OpenAI from 'openai';

config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Calls the ChatGPT API to classify an exercise.
 * @param exerciseName The name of the exercise to classify.
 * @returns The ChatGPT response as a string.
 */
async function classifyExercise(exerciseName: string): Promise<string | null> {
    // 2. Construct the prompt
    const prompt = `Analyze this exercise and provide a JSON classification with exactly these fields:
  {
      "category": either "compound", "accessory", "olympic" or "other",
      "primaryMuscleGroup": either "compound", "chest", "back", "shoulders", "quads", "hamstrings" ,"triceps", "biceps", "calf", "abs", "glute", "traps", "forearms" or anything else,
      "equipment": array containing any of ["Machine","Barbell","Smith machine","Dumbbell","Cable","Freemotion","Bodyweight only","Bodyweight loadable","Machine assistance"] or anything else, LF or HS are machine brands 
      "confidence": number between 0-1,
      "reasoning": brief description of the exercise
  }

  Exercise to classify: "${exerciseName}"`;

    // 3. Create a Chat Completion request
    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            {
                role: 'user',
                content: prompt,
            },
        ],
        temperature: 0.2, // Adjust temperature as needed
    });

    // 4. Extract the response content
    return response.choices[0].message.content;
}

export async function main() {
    const exerciseName = process.argv[2];

    if (!exerciseName) {
        logger.error('Usage: classify:openai <exercise-name>');
        process.exit(1);
    }

    const result = await classifyExercise(exerciseName);
    logger.info(`Classification result: ${result}`);
}
