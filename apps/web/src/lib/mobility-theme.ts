import type { MobilityConf } from '@/lib/mobility';

// Region hues from the PT Movement Hub prototype, with five remapped onto v2
// palette tokens so the page reads as part of the app rather than the mock.
export const regionColors: Record<string, string> = {
    Hips: '#0ea5e9',
    Glutes: '#8b5cf6',
    Adductors: '#a855f7',
    Hamstrings: 'var(--hyper)',
    'Quads/Knee': 'var(--maint)',
    'Ankle/Foot': '#14b8a6',
    Calf: 'var(--cardio)',
    'T-Spine/Midback': '#6366f1',
    Shoulder: 'var(--break)',
    'Core/Trunk': '#84cc16',
    Spine: 'var(--strength)',
    Neural: '#ec4899',
    'Full Body': '#64748b',
    Wrist: '#94a3b8',
};

export function regionColor(region: string): string {
    return regionColors[region] ?? 'var(--muted)';
}

export const confColors: Record<MobilityConf, string> = {
    High: 'var(--strength)',
    Med: 'var(--maint)',
    Low: 'var(--muted)',
};
