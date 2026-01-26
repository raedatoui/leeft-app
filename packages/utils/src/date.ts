/**
 * Parse a date string with a specified format
 */
export function parseDate(dateStr: string, format: string): Date {
	const parts = dateStr.split(format.includes("-") ? "-" : "/") as [
		string,
		string,
		string,
	];
	if (format === "yyyy-MM-dd") {
		return new Date(
			Number.parseInt(parts[0], 10),
			Number.parseInt(parts[1], 10) - 1,
			Number.parseInt(parts[2], 10),
		);
	}
	if (format === "M/d/yyyy") {
		return new Date(
			Number.parseInt(parts[2], 10),
			Number.parseInt(parts[0], 10) - 1,
			Number.parseInt(parts[1], 10),
		);
	}
	throw new Error("Unknown date format");
}

/**
 * Normalize a date to midnight UTC
 */
export function normalizeToMidnightUTC(date: Date): Date {
	return new Date(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
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
 * Format a date as a localized string (M/D/YY)
 */
export function formatDate(date: Date): string {
	return new Date(date).toLocaleDateString("en-US", {
		month: "numeric",
		day: "numeric",
		year: "2-digit",
		timeZone: "UTC",
	});
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
	return new Date(year, month - 1, day);
}

/**
 * Get the date range for the last N days
 */
export function getLastNDaysRange(days: number): { start: Date; end: Date } {
	const end = new Date();
	const start = new Date();
	start.setDate(start.getDate() - days);

	start.setHours(0, 0, 0, 0);
	end.setHours(23, 59, 59, 999);

	return { start, end };
}

/**
 * Parse a year-month string (YYYY-MM) into a Date
 */
export function parseYearMonth(yearMonth: string): Date {
	const [year, month] = yearMonth.split("-") as [string, string];
	return new Date(Number.parseInt(year, 10), Number.parseInt(month, 10) - 1);
}

/**
 * Format a year-month string (YYYY-MM) as a localized month/year
 */
export function formatYearMonth(yearMonth: string): string {
	return parseYearMonth(yearMonth).toLocaleDateString("en-US", {
		month: "long",
		year: "numeric",
	});
}
