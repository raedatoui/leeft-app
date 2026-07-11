// Shared time-range filter model: preset windows plus a custom range (e.g. set by
// drag-selecting on a chart). Bounds are UTC-normalized to match the app's UTC day grouping.

export type TimeRangePreset = '7d' | '30d' | '90d' | 'ytd' | 'all';

export type TimeRangeValue = { preset: TimeRangePreset } | { preset: 'custom'; start: Date; end: Date };

export interface ResolvedTimeRange {
    start: Date | null;
    end: Date | null;
}

const startOfUTCDay = (d: Date): Date => {
    const out = new Date(d);
    out.setUTCHours(0, 0, 0, 0);
    return out;
};

const endOfUTCDay = (d: Date): Date => {
    const out = new Date(d);
    out.setUTCHours(23, 59, 59, 999);
    return out;
};

/** UTC midnight `days - 1` days ago, so the window includes today. */
const rollingWindowStart = (days: number): Date => {
    const d = startOfUTCDay(new Date());
    d.setUTCDate(d.getUTCDate() - days + 1);
    return d;
};

/** Null bounds mean unbounded on that side. */
export function resolveTimeRange(value: TimeRangeValue): ResolvedTimeRange {
    switch (value.preset) {
        case '7d':
            return { start: rollingWindowStart(7), end: null };
        case '30d':
            return { start: rollingWindowStart(30), end: null };
        case '90d':
            return { start: rollingWindowStart(90), end: null };
        case 'ytd':
            return { start: new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1)), end: null };
        case 'all':
            return { start: null, end: null };
        case 'custom':
            return { start: startOfUTCDay(value.start), end: endOfUTCDay(value.end) };
    }
}

export function inTimeRange(date: Date, range: ResolvedTimeRange): boolean {
    if (range.start && date < range.start) return false;
    if (range.end && date > range.end) return false;
    return true;
}
