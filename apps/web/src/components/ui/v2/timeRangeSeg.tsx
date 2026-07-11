'use client';

import { formatTableDate } from '@/lib/dateFormatters';
import type { TimeRangePreset, TimeRangeValue } from '@/lib/timeRange';

const PRESET_LABELS: Record<TimeRangePreset, string> = {
    '7d': '7D',
    '30d': '30D',
    '90d': '90D',
    ytd: 'YTD',
    all: 'Max',
};

interface TimeRangeSegProps {
    value: TimeRangeValue;
    onChange: (value: TimeRangeValue) => void;
    /** Presets to offer, in order. */
    presets?: TimeRangePreset[];
}

export default function TimeRangeSeg({ value, onChange, presets = ['7d', '30d', 'ytd', 'all'] }: TimeRangeSegProps) {
    return (
        <div className="seg" role="radiogroup" aria-label="Time range">
            {presets.map((p) => (
                <button key={p} type="button" className={`seg-btn${value.preset === p ? ' active' : ''}`} onClick={() => onChange({ preset: p })}>
                    {PRESET_LABELS[p]}
                </button>
            ))}
            {value.preset === 'custom' && (
                <button type="button" className="seg-btn active" onClick={() => onChange({ preset: 'all' })} title="Clear custom range">
                    {formatTableDate(value.start)} → {formatTableDate(value.end)} <span aria-hidden="true">✕</span>
                </button>
            )}
        </div>
    );
}
