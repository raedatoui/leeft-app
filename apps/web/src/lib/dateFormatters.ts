// Days are grouped by UTC date in `groupWorkoutsByDay` (lib/contexts.ts), so format
// using UTC components — otherwise local timezone offset shifts the display by a day.

const DOWS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DOWS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const formatLongDate = (date: Date): string => {
    return `${DOWS_LONG[date.getUTCDay()]}, ${MONTHS_LONG[date.getUTCMonth()]} ${date.getUTCDate()}`;
};

export const formatShortDate = (date: Date): string => {
    return `${DOWS_SHORT[date.getUTCDay()]} · ${MONTHS_SHORT[date.getUTCMonth()]} ${String(date.getUTCDate()).padStart(2, '0')}`;
};
