/**
 * Normalize a date to midnight UTC
 */
export function normalizeToMidnightUTC(date: Date): Date {
	return new Date(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
	);
}

/**
 * Default session start instant for workouts lacking a real time-of-day.
 * Returns the given calendar day at 17:00 UTC (~noon Eastern, year-round),
 * which stays on the same calendar day in both UTC and ET so it never shifts
 * the UTC day-key used for grouping.
 */
export function defaultStartedAt(date: Date): Date {
	return new Date(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 17),
	);
}

/**
 * Check if a date is within a date range (inclusive)
 */
export function isWithinInterval(
	date: Date,
	startDate: Date,
	endDate: Date,
): boolean {
	const normalizedDate = normalizeToMidnightUTC(date);
	const normalizedStart = normalizeToMidnightUTC(startDate);
	const normalizedEnd = normalizeToMidnightUTC(endDate);

	return normalizedDate >= normalizedStart && normalizedDate <= normalizedEnd;
}

/**
 * Parse a date from a workout title format (YYYY-MM-DD)
 */
export function dateFromTitle(title: string): Date {
	const [year, month, day] = title.split("-").map(Number) as [
		number,
		number,
		number,
	];
	return new Date(Date.UTC(year, month - 1, day));
}
