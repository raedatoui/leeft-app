// `isLoaded` is imported as well as re-exported: a re-export alone doesn't bring it into scope,
// and `basisLabel` below needs it.
import { type ColumnUnits, isLoaded, type SetUnit } from '@leeft/types';
import type { DropdownV2Option } from '@/components/ui/v2/dropdownV2';

export { DEFAULT_COLUMN_UNITS } from '@leeft/types';
export { isLoaded };
export type { ColumnUnits, SetUnit };

interface SetUnitDef {
    /** Shown on the column header and on the dropdown trigger, so it has to stay short —
     *  the header cell is one grid column wide. */
    label: string;
    /** The detail that doesn't fit on the header, shown under the label in the open list. */
    sublabel: string;
}

const UNITS: Record<SetUnit, SetUnitDef> = {
    reps: { label: 'Reps', sublabel: 'count' },
    time: { label: 'Time', sublabel: 'mm:ss' },
    lb: { label: 'Lb', sublabel: 'load moved' },
    'bw+': { label: 'BW+', sublabel: 'added to bodyweight' },
    none: { label: 'None', sublabel: 'no second value' },
    feet: { label: 'Feet', sublabel: 'distance' },
    inches: { label: 'Inches', sublabel: 'height' },
    meters: { label: 'Meters', sublabel: 'distance' },
};

/** The first column can't be 'none' — a set with no leading value isn't a set. */
export const REPS_UNIT_OPTIONS: SetUnit[] = ['reps', 'time', 'feet', 'meters'];

/** The second column keeps 'lb' first, since almost everything is pounds. 'bw+' is for the load
 *  hung off you rather than the whole system — the two don't share a records ladder, so the
 *  choice matters. 'none' is for movements that carry nothing at all. */
export const WEIGHT_UNIT_OPTIONS: SetUnit[] = ['lb', 'bw+', 'none', 'inches', 'feet', 'meters', 'time', 'reps'];

export const unitLabel = (unit: SetUnit): string => UNITS[unit].label;

export const unitDropdownOptions = (units: SetUnit[]): DropdownV2Option[] =>
    units.map((value) => ({ value, label: UNITS[value].label, sublabel: UNITS[value].sublabel }));

/** Whole seconds as mm:ss. Durations ride in the first column as a plain number of seconds, so
 *  this is the only place that shape becomes a clock reading. */
export const formatSeconds = (seconds: number): string => {
    const whole = Math.max(0, Math.round(seconds));
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

/** The inverse, lenient about what gets typed: "90" is ninety seconds, "1:30" is the same. */
export const parseSeconds = (text: string): number => {
    const parts = text.split(':');
    if (parts.length < 2) return Number.parseFloat(text) || 0;
    const [minutes, seconds] = parts.map((p) => Number.parseFloat(p.trim()) || 0);
    return (minutes ?? 0) * 60 + (seconds ?? 0);
};

/** How one set's leading value reads, given what its column is counting. */
export const formatSetValue = (value: number | undefined, unit: SetUnit): string => {
    if (value === undefined) return '—';
    return unit === 'time' ? formatSeconds(value) : String(Math.round(value * 100) / 100);
};

/** How a measurement basis reads on the exercise page's basis switch. `none` becomes
 *  "Bodyweight" rather than "None" — as a chart of sets it is bodyweight work, not an absence. */
export const basisLabel = (units: ColumnUnits): string => {
    if (isLoaded(units)) return 'Lb';
    if (units.weight === 'bw+') return 'BW+';
    if (units.weight === 'none' && units.reps === 'reps') return 'Bodyweight';
    return unitLabel(units.reps);
};

/** A whole exercise on one line — "5,5,5 @ 135,225,225", "11:00 @ 135", "10,12,12". The leading
 *  column reads through its unit, and a movement carrying no load prints the lead alone rather
 *  than a column of zeroes. */
export const formatSetsLine = (sets: { reps?: number; weight: number }[], units: ColumnUnits): string => {
    if (sets.length === 0) return '—';
    const lead = sets.map((s) => formatSetValue(s.reps, units.reps)).join(',');
    if (units.weight === 'none') return lead;
    return `${lead} @ ${sets.map((s) => Math.round(s.weight)).join(',')}`;
};
