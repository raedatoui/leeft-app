import type { CardioWorkout } from '@/types';

export type EffortTier = 'all' | 'medium' | 'hard';

// Tunable thresholds on the intenseMinutes scale (Fitbit AZM: fatBurn ×1, cardio/peak ×2).
// Tuned against real data: medium ≈ the old permissive filter's scale; hard keeps
// sessions with sustained elevated HR (e.g. a full basketball game).
export const HARD_MIN = 20;
export const MEDIUM_MIN = 10;

export const EFFORT_TIERS: { value: EffortTier; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' },
];

// Fitbit can't read heart rate underwater, so swims log little or no AZM
// regardless of effort (a third of real swims have exactly zero).
const HR_BLIND_TYPES = new Set(['Swim']);

/**
 * Active-zone minutes for a cardio activity, on Fitbit's AZM scale
 * (fat-burn minutes count ×1, cardio/peak ×2). Real data shows long steady
 * sessions (basketball, sport) log almost all their time in fat burn, so a
 * pure cardio+peak qualifier would hide them. Falls back to the composite
 * zoneMinutes (same scale), then fairly+very active-level minutes.
 * For HR-blind types (swims) duration stands in for the missing HR signal:
 * whichever of the two is stronger counts.
 */
export function intenseMinutes(w: CardioWorkout): number {
    let minutes = 0;
    if (w.hrZones) {
        minutes = w.hrZones.fatBurn + 2 * (w.hrZones.cardio + w.hrZones.peak);
    } else if (w.zoneMinutes !== undefined) {
        minutes = w.zoneMinutes;
    } else if (w.effort) {
        minutes = w.effort.filter((e) => e.name === 'fairly' || e.name === 'very').reduce((sum, e) => sum + e.minutes, 0);
    }
    if (HR_BLIND_TYPES.has(w.type)) {
        return Math.max(minutes, w.durationMin);
    }
    return minutes;
}

export function matchesTier(w: CardioWorkout, tier: EffortTier): boolean {
    if (tier === 'all') return true;
    return intenseMinutes(w) >= (tier === 'hard' ? HARD_MIN : MEDIUM_MIN);
}
