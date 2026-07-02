import { Activity, Bike, Dribbble, Flame, Footprints, Heart, type LucideProps, PersonStanding, Timer, Waves, Zap } from 'lucide-react';
import type { FC } from 'react';
import type { CardioType } from '@/types';

// Keyed by string — every exposed activity type can be looked up; unknown types fall back
// at the lookup site. `satisfies` keeps the known CardioType set exhaustively covered.
export const cardioIcons: Partial<Record<string, FC<LucideProps>>> = {
    Run: Footprints,
    'Treadmill run': Footprints,
    Swim: Waves,
    Bike: Bike,
    'Outdoor Bike': Bike,
    Elliptical: PersonStanding,
    'Rowing machine': PersonStanding,
    HIIT: Flame,
    'Aerobic Workout': Heart,
    Walk: Footprints,
    'Circuit Training': Activity,
    'Interval Workout': Timer,
    Bootcamp: Zap,
    Aerobics: Heart,
    Basketball: Dribbble,
    Sport: Activity,
} satisfies Record<CardioType, FC<LucideProps>>;

export const cardioColors: Partial<Record<string, string>> = {
    Run: '#FF5252',
    'Treadmill run': '#FF5252',
    Swim: '#2196F3',
    Bike: '#4CAF50',
    'Outdoor Bike': '#4CAF50',
    Elliptical: '#9C27B0',
    'Rowing machine': '#FF9800',
    HIIT: '#E91E63',
    'Aerobic Workout': '#00BCD4',
    Walk: '#8BC34A',
    'Circuit Training': '#673AB7',
    'Interval Workout': '#FF5722',
    Bootcamp: '#795548',
    Aerobics: '#E91E63',
    Basketball: '#FF7043',
    Sport: '#26A69A',
} satisfies Record<CardioType, string>;
