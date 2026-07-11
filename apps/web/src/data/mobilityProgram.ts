import type { MobilityProgram } from '@/lib/mobility';

export const mobilityProgram: MobilityProgram = {
    title: 'Weekly Rotating Mobility Block',
    intro: [
        'Four 20-30 minute sessions built entirely from your database. Rotate A → B → C → D across the week, 3-4 sessions/week. Each targets one of your recurring areas, so over a week every region gets touched without any single day running long.',
        'Run a session on its own, or slot it in as your 20-30 min pre-lift mobility. On lifting days, prepend the optional Dynamic Warm-Up; on standalone days you can skip it. Repeat the block each week of the training block; nudge dosages up as ranges open.',
    ],
    warmup: {
        title: 'Optional Dynamic Warm-Up',
        time: '~6-8 min',
        note: 'Prepend to any session on lifting/turf days. 1 lap = ~20 ft.',
        items: [
            'Forward Walking Lunges',
            'Reverse Walking Lunges',
            'Lateral Walking Lunges',
            'Walking Hamstring Sweeps',
            'Frankenstein Kicks',
            'Forward Pogo Hops',
            'Lateral Bounds',
        ],
    },
    sessions: [
        {
            letter: 'A',
            title: 'Hips - Rotation & Flex/Ext',
            focus: 'IR/ER, banded flexion & extension, single-leg control',
            time: '~25 min',
            items: [
                'Supine Banded Hip Flexion Mobilization',
                'Half Kneeling Banded Hip Extension Mobilization',
                'Hip 90/90 External Rotation Stretch',
                'Hip 90/90 Internal Rotation Stretch',
                'Standing Hip CARs',
                'Bretzel Stretch',
                'Forward Foot Elevated Lunge Hold',
                'Wall March',
                'Goblet Bottom Quarter Squats',
            ],
        },
        {
            letter: 'B',
            title: 'T-Spine, Shoulder & Mid-Back',
            focus: 'Thoracic rotation/extension + shoulder external rotation',
            time: '~22 min',
            items: [
                'Long Foam Roller Pec 90/90 Stretch with Trunk Rotation',
                '90/90 Thoracic Opener',
                'Half Kneeling Wall Thoracic Arc',
                'Single Arm Seated 90/90 ER + Trunk Rotation',
                'Single Arm Seated 90/90 ER Eccentric + Hold',
                'Tabletop Shoulder 90/90 ER Eccentric to Hold',
                'Floor Overhead Pull Over with Knees in Tabletop',
                'Scapular CARs',
            ],
        },
        {
            letter: 'C',
            title: 'Ankles, Feet & Calves',
            focus: 'Dorsiflexion, big-toe, calf & tibialis loading, foot tripod',
            time: '~24 min',
            items: [
                'Ankle CARs',
                'Banded Ankle Mobility (3-way)',
                'Calf Stretch',
                'Couch Stretch',
                'Floor Reach (split stance, heel elevated)',
                'Standing Big Toe Eccentric',
                'Single-Leg Calf Raise Holds',
                'Tibialis Raises',
                'Single-Leg Hip Hinge (supported)',
            ],
        },
        {
            letter: 'D',
            title: 'Posterior Chain - Hamstrings & Glutes',
            focus: 'Hamstring eccentric/isometric (R tendinitis aware) + glute med',
            time: '~26 min',
            items: [
                'Hamstring Bridge (feet elevated, long hold)',
                'Clamshells (banded)',
                'Side-Lying Hip Abduction',
                'Standing Hip Abduction',
                'Single Leg RDL - Knee Bent',
                'Slow Eccentric Hamstring Curls',
                'Sciatic Nerve Floss',
                'Banded Hip Thruster',
            ],
        },
    ],
};

export const thoracicProgram: MobilityProgram = {
    title: 'Daily Desk Reset - Thoracic',
    intro: [
        'Four moves, ten slow reps each, once a day - a no-equipment counter to a day of sitting, anchored on thoracic extension (vanja.moves). Run it right after work; it stacks fine on top of the weekly block.',
    ],
    sessions: [
        {
            letter: 'T',
            title: 'Thoracic & Un-Sitting Reset',
            focus: 'Thoracic extension + hip rotation, glute drive, deep squat',
            time: '~8 min',
            items: ['Thoracic Extension (over bolster)', '90/90 Hip Rotation Switches', 'Single Leg Bridge', 'Deep Squat'],
        },
    ],
};
