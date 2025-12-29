export function parseDate(dateStr: string, format: string): Date {
    const parts = dateStr.split(format.includes('-') ? '-' : '/');
    if (format === 'yyyy-MM-dd') {
        return new Date(Number.parseInt(parts[0], 10), Number.parseInt(parts[1], 10) - 1, Number.parseInt(parts[2], 10));
    }
    if (format === 'M/d/yyyy') {
        return new Date(Number.parseInt(parts[2], 10), Number.parseInt(parts[0], 10) - 1, Number.parseInt(parts[1], 10));
    }
    throw new Error('Unknown date format');
}

export function normalizeToMidnightUTC(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function isWithinInterval(date: Date, startDate: Date, endDate: Date): boolean {
    // Normalize all dates to midnight UTC for comparison
    const normalizedDate = normalizeToMidnightUTC(date);
    const normalizedStart = normalizeToMidnightUTC(startDate);
    const normalizedEnd = normalizeToMidnightUTC(endDate);

    return normalizedDate >= normalizedStart && normalizedDate <= normalizedEnd;
}
