import type { DropdownV2Option } from '@/components/ui/v2/dropdownV2';

/** What a set column holds. Kept in step with `SetUnit` in apps/native/Sources/Views/UnitPickerSheet.swift.
 *  Prototype vocabulary only — nothing writes these to the draft or to Firestore yet. */
export type SetUnit = 'reps' | 'lb' | 'time' | 'feet' | 'meters' | 'none';

interface SetUnitDef {
    /** Shown on the column header and on the dropdown trigger, so it has to stay short —
     *  the header cell is one grid column wide. */
    label: string;
    /** The detail that doesn't fit on the header, shown under the label in the open list. */
    sublabel: string;
}

const UNITS: Record<SetUnit, SetUnitDef> = {
    reps: { label: 'Reps', sublabel: 'count' },
    lb: { label: 'Lb', sublabel: 'pounds' },
    time: { label: 'Time', sublabel: 'mm:ss' },
    feet: { label: 'Feet', sublabel: 'distance' },
    meters: { label: 'Meters', sublabel: 'distance' },
    none: { label: 'None', sublabel: 'no second value' },
};

/** The first column can't be 'none' — a set with no leading value isn't a set. */
export const REPS_UNIT_OPTIONS: SetUnit[] = ['reps', 'time', 'feet', 'meters'];

/** The second column keeps 'lb' so switching away from pounds is reversible, and adds
 *  'none' for movements that carry no load at all. */
export const WEIGHT_UNIT_OPTIONS: SetUnit[] = ['lb', 'reps', 'time', 'feet', 'meters', 'none'];

export interface ColumnUnits {
    reps: SetUnit;
    weight: SetUnit;
}

export const DEFAULT_COLUMN_UNITS: ColumnUnits = { reps: 'reps', weight: 'lb' };

export const unitDropdownOptions = (units: SetUnit[]): DropdownV2Option[] =>
    units.map((value) => ({ value, label: UNITS[value].label, sublabel: UNITS[value].sublabel }));
