'use client';

import type { FC } from 'react';

const ZONE_COLORS: Record<string, string> = {
    sedentary: 'var(--muted-2)',
    lightly: 'var(--break)',
    fairly: 'var(--maint)',
    very: 'var(--hyper)',
};

const ZONE_LABELS: Record<string, string> = {
    sedentary: 'Rest',
    lightly: 'Light',
    fairly: 'Moderate',
    very: 'Intense',
};

const ZONE_ORDER = ['sedentary', 'lightly', 'fairly', 'very'] as const;

export interface EffortSegment {
    name: string;
    minutes: number;
}

interface EffortChartProps {
    effort: EffortSegment[];
    /** When false, render the colored bar only (no legend below). Defaults to true. */
    showLegend?: boolean;
}

export const EffortChart: FC<EffortChartProps> = ({ effort, showLegend = true }) => {
    const ordered = [...effort].sort(
        (a, b) => ZONE_ORDER.indexOf(a.name as (typeof ZONE_ORDER)[number]) - ZONE_ORDER.indexOf(b.name as (typeof ZONE_ORDER)[number])
    );
    const visible = ordered.filter((z) => z.minutes > 0);
    if (visible.length === 0) return null;
    const totalMin = visible.reduce((sum, z) => sum + z.minutes, 0);

    return (
        <div className="effort-chart">
            <div className="effort-bar">
                {visible.map((z) => (
                    <div
                        key={z.name}
                        className="effort-seg"
                        style={{
                            flexGrow: z.minutes,
                            background: ZONE_COLORS[z.name] ?? 'var(--muted)',
                            // colored fills are bright in dark mode and deep in light mode,
                            // so --bg text is legible on them in both; the neutral
                            // sedentary fill is mid-tone and wants --fg instead
                            color: z.name === 'sedentary' ? 'var(--fg)' : 'var(--bg)',
                        }}
                        title={`${ZONE_LABELS[z.name] ?? z.name}: ${z.minutes}m`}
                    >
                        {z.minutes / totalMin > 0.1 && `${z.minutes}m`}
                    </div>
                ))}
            </div>
            {showLegend && (
                <div className="effort-legend">
                    {visible.map((z) => (
                        <span key={z.name} className="effort-legend-item">
                            <span className="dot" style={{ background: ZONE_COLORS[z.name] ?? 'var(--muted)' }} />
                            {ZONE_LABELS[z.name] ?? z.name}
                            <b>{z.minutes}m</b>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};
