// Static display data for the /add flow — readiness questionnaire copy and RPE scale.

export interface ReadinessAnswers {
    soreness?: number;
    sleep?: number;
    stress?: number;
    energy?: number;
    motivation?: number;
}

export interface ReadinessQuestion {
    key: keyof ReadinessAnswers;
    label: string;
    lo: string;
    hi: string;
}

// TrainHeroic-style readiness survey — 5 questions, 1-5 scale.
export const READINESS_QUESTIONS: ReadinessQuestion[] = [
    { key: 'sleep', label: 'How did you sleep?', lo: 'terrible', hi: 'great' },
    { key: 'energy', label: 'How is your energy?', lo: 'drained', hi: 'charged' },
    { key: 'motivation', label: 'How motivated are you?', lo: 'meh', hi: 'fired up' },
    { key: 'stress', label: 'How stressed are you?', lo: 'maxed out', hi: 'relaxed' },
    { key: 'soreness', label: 'How sore are you?', lo: 'very sore', hi: 'fresh' },
];

export const SCALE_COLORS = ['#ff3b30', '#ff8c42', '#ffd60a', '#a8dd4a', '#19e68c'];

export const RPE_WORDS: Record<number, string> = {
    1: 'barely moving',
    2: 'very easy',
    3: 'easy',
    4: 'comfortable',
    5: 'somewhat hard',
    6: 'hard-ish',
    7: 'hard — 3 reps left',
    8: 'very hard — 2 reps left',
    9: '1 rep left',
    10: 'max effort',
};

// Slider value 1..10 mapped onto the green -> red gradient.
export const RPE_COLORS = ['#19e68c', '#4ce07b', '#8ada62', '#c4d94e', '#ffd60a', '#ffbf1f', '#ffa62e', '#ff8c42', '#ff5f38', '#ff3b30'];
