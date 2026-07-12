'use client';

import type { FC } from 'react';
import { useState } from 'react';
import type { CardioDistributionSlice } from '@/lib/hooks/useCardioPageState';

interface TypeMixProps {
    /** Slices sorted by count desc (as computed by useCardioPageState). */
    distribution: CardioDistributionSlice[];
    activeType: string | null;
    onTypeSelect: (t: string | null) => void;
}

// Rows shown before the "+ n more" expander.
const VISIBLE_ROWS = 8;

// Short display names (the full names are too long for row chrome).
const TYPE_SHORT: Partial<Record<string, string>> = {
    'Treadmill run': 'Treadmill',
    'Outdoor Bike': 'Outdoor bike',
    'Rowing machine': 'Rowing',
    'Aerobic Workout': 'Aerobic',
    'Fitbit Coach: Audio Coaching': 'Audio coaching',
};

const TypeMix: FC<TypeMixProps> = ({ distribution, activeType, onTypeSelect }) => {
    const [expanded, setExpanded] = useState(false);

    if (distribution.length === 0) {
        return <div className="chart-empty">No sessions in this period</div>;
    }

    const toggle = (type: string) => onTypeSelect(activeType === type ? null : type);
    const isMuted = (type: string) => activeType !== null && activeType !== type;

    let rows = expanded ? distribution : distribution.slice(0, VISIBLE_ROWS);
    // Keep the filtered type visible even when it ranks below the fold.
    if (!expanded && activeType && !rows.some((s) => s.type === activeType)) {
        const active = distribution.find((s) => s.type === activeType);
        if (active) rows = [...rows, active];
    }
    // Count against rows actually shown — the active type may be appended below the fold.
    const hiddenCount = distribution.length - rows.length;

    return (
        <>
            <div className="mix-bar">
                {distribution.map((slice) => (
                    <button
                        key={slice.type}
                        type="button"
                        className={`mix-seg${isMuted(slice.type) ? ' muted' : ''}`}
                        style={{ background: slice.color, flexGrow: slice.count }}
                        onClick={() => toggle(slice.type)}
                        title={`${slice.type} · ${slice.count} sessions · ${slice.pct}%`}
                        aria-label={`Filter by ${slice.type} (${slice.count} sessions)`}
                        aria-pressed={activeType === slice.type}
                    />
                ))}
            </div>
            <div className="mix-rows">
                {rows.map((slice) => (
                    <button
                        key={slice.type}
                        type="button"
                        className={`mix-row${isMuted(slice.type) ? ' muted' : ''}`}
                        onClick={() => toggle(slice.type)}
                        aria-pressed={activeType === slice.type}
                    >
                        <span className="swatch" style={{ background: slice.color }} />
                        <span className="name">{TYPE_SHORT[slice.type] ?? slice.type}</span>
                        <span className="pct">{slice.pct}%</span>
                        <span className="count">{slice.count}</span>
                    </button>
                ))}
                {(expanded || hiddenCount > 0) && (
                    <button type="button" className="mix-more" onClick={() => setExpanded((e) => !e)}>
                        {expanded ? 'Show fewer types' : `+ ${hiddenCount} more types`}
                    </button>
                )}
            </div>
        </>
    );
};

export default TypeMix;
