import type { MappedCycle } from '@/types';

type CycleType = MappedCycle['type'];

/** Maps a cycle type to the `data-type` value used by the v2 stylesheet. */
export const CYCLE_TYPE_DATA: Record<CycleType, 'strength' | 'hyper' | 'break' | 'maint'> = {
    strength: 'strength',
    hypertrophy: 'hyper',
    break: 'break',
    maintenance: 'maint',
};

/** Full labels — used for prominent tags and headers. */
export const CYCLE_TYPE_LABEL: Record<CycleType, string> = {
    strength: 'Strength',
    hypertrophy: 'Hypertrophy',
    break: 'Break',
    maintenance: 'Maintenance',
};

/** Short labels — used for compact chrome (filter pills, dropdown chips). */
export const CYCLE_TYPE_LABEL_SHORT: Record<CycleType, string> = {
    strength: 'Strength',
    hypertrophy: 'Hyper',
    break: 'Break',
    maintenance: 'Maint',
};

export const CYCLE_TYPE_COLOR: Record<CycleType, string> = {
    strength: 'var(--strength)',
    hypertrophy: 'var(--hyper)',
    break: 'var(--break)',
    maintenance: 'var(--maint)',
};

/** Cycle length in days, inclusive of both endpoints (Jan 1 → Jan 7 = 7 days). */
export const cycleDays = (cycle: MappedCycle): number => {
    const diff = Math.abs(cycle.dates[1].getTime() - cycle.dates[0].getTime());
    return Math.max(1, Math.ceil(diff / 86_400_000) + 1);
};
