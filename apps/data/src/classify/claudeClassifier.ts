import { config } from 'dotenv';
import { z } from 'zod';

config();

const ClassificationResultSchema = z.object({
    category: z.string(),
    primaryMuscleGroup: z.string(),
    equipment: z.array(z.string()),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
});

type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

const CLASSIFICATION_PROMPT_TEMPLATE = `Analyze this exercise and return ONLY valid JSON with exactly these fields. Do not use markdown code blocks or any other formatting - return raw JSON only:

{
    "category": either "compound", "accessory", "olympic" or "other",
    "primaryMuscleGroup": either "compound", "chest", "back", "shoulders", "quads", "hamstrings", "triceps", "biceps", "calf", "abs", "glute", "traps", "forearms" or anything else,
    "equipment": array containing any of ["Machine", "Barbell", "Smith machine", "Dumbbell", "Cable", "Freemotion", "Bodyweight only", "Bodyweight loadable", "Machine assistance"] or anything else, LF or HS are machine brands
    "confidence": number between 0-1,
    "reasoning": brief description of the exercise
}

Exercise to classify: "{{EXERCISE_NAME}}"

Response format: Return only the JSON object, no markdown, no code blocks, no explanations.`;

const ClaudeResponseSchema = z.object({
    content: z.array(
        z.object({
            text: z.string(),
        })
    ),
    model: z.string(),
    role: z.string(),
});

export async function runClassifyExercise(exerciseName: string): Promise<ClassificationResult> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
            'x-api-key': process.env.ANTHROPIC_API_KEY!,
        },
        body: JSON.stringify({
            model: 'claude-opus-4-1-20250805',
            messages: [
                {
                    role: 'user',
                    content: CLASSIFICATION_PROMPT_TEMPLATE.replace('{{EXERCISE_NAME}}', exerciseName),
                },
            ],
            max_tokens: 1024,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.statusText}\n${errorText}`);
    }

    const rawResponse = await response.json();
    const data = ClaudeResponseSchema.parse(rawResponse);
    if (!data.content[0] || data.content.length === 0) {
        throw new Error(`No content in Claude's response for exercise "${exerciseName}"`);
    }
    try {
        const parsedResult = JSON.parse(data.content[0].text);
        return ClassificationResultSchema.parse(parsedResult);
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error(`Invalid JSON in Claude's response: ${data.content[0].text}`);
        }
        throw error;
    }
}
