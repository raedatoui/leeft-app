// Days are grouped by UTC date in `groupWorkoutsByDay` (lib/contexts.ts), so format
// using UTC components — otherwise local timezone offset shifts the display by a day.

export const DOWS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DOWS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const formatLongDate = (date: Date): string => {
    return `${DOWS_LONG[date.getUTCDay()]}, ${MONTHS_LONG[date.getUTCMonth()]} ${date.getUTCDate()}`;
};

export const formatShortDate = (date: Date): string => {
    return `${DOWS_SHORT[date.getUTCDay()]} · ${MONTHS_SHORT[date.getUTCMonth()]} ${String(date.getUTCDate()).padStart(2, '0')}`;
};

/** "Jan 01" */
export const formatDayMonth = (date: Date): string => {
    return `${MONTHS_SHORT[date.getUTCMonth()]} ${String(date.getUTCDate()).padStart(2, '0')}`;
};

/** "Jan 01 '24" */
export const formatTableDate = (date: Date): string => {
    return `${MONTHS_SHORT[date.getUTCMonth()]} ${String(date.getUTCDate()).padStart(2, '0')} '${String(date.getUTCFullYear()).slice(-2)}`;
};
