'use client';

import type { FC } from 'react';
import { useMemo } from 'react';
import type { CardioMonthlyTrendBucket } from '@/lib/hooks/useCardioPageState';

interface TrendChartProps {
    monthlyTrend: CardioMonthlyTrendBucket[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Drawing constants — match the design mock's viewBox.
const VIEW_W = 600;
const VIEW_H = 180;
const PAD_X = 20;
const PAD_TOP = 16;
const PAD_BOTTOM = 12;
const PLOT_W = VIEW_W - PAD_X * 2;
const PLOT_H = VIEW_H - PAD_TOP - PAD_BOTTOM;

function buildPoints(values: number[], max: number): { x: number; y: number }[] {
    if (values.length === 0) return [];
    const step = values.length > 1 ? PLOT_W / (values.length - 1) : 0;
    const scale = max > 0 ? PLOT_H / max : 0;
    return values.map((v, i) => ({
        x: PAD_X + step * i,
        y: PAD_TOP + (PLOT_H - v * scale),
    }));
}

const TrendChart: FC<TrendChartProps> = ({ monthlyTrend }) => {
    const { durationPoints, zonePoints, hasData } = useMemo(() => {
        const durations = monthlyTrend.map((b) => Math.round(b.durationMin));
        const zones = monthlyTrend.map((b) => Math.round(b.zoneMin));
        const max = Math.max(1, ...durations, ...zones);
        return {
            durationPoints: buildPoints(durations, max),
            zonePoints: buildPoints(zones, max),
            hasData: durations.some((v) => v > 0) || zones.some((v) => v > 0),
        };
    }, [monthlyTrend]);

    if (!hasData) {
        return (
            <>
                <div className="trend-empty">No data for this period</div>
                <div className="trend-x">
                    {MONTHS.map((m) => (
                        <div key={m}>{m}</div>
                    ))}
                </div>
            </>
        );
    }

    const durationPath = durationPoints.map((p) => `${p.x},${p.y}`).join(' ');
    const zonePath = zonePoints.map((p) => `${p.x},${p.y}`).join(' ');

    return (
        <>
            <div className="trend-chart">
                <svg
                    className="trend-svg"
                    viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                    preserveAspectRatio="none"
                    aria-label="Monthly duration and zone minutes trend"
                >
                    <title>Monthly trend</title>
                    <polyline fill="none" stroke="var(--cardio)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={durationPath} />
                    <polyline
                        fill="none"
                        stroke="var(--zone)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="2 4"
                        points={zonePath}
                    />
                    <g fill="var(--cardio)">
                        {durationPoints.map((p, i) => (
                            // biome-ignore lint/suspicious/noArrayIndexKey: month index is the natural key
                            <circle key={i} cx={p.x} cy={p.y} r="3" />
                        ))}
                    </g>
                </svg>
            </div>
            <div className="trend-x">
                {MONTHS.map((m) => (
                    <div key={m}>{m}</div>
                ))}
            </div>
            <div className="trend-legend">
                <span className="label-mono">
                    <span className="swatch" style={{ background: 'var(--cardio)' }} />
                    Duration (min)
                </span>
                <span className="label-mono">
                    <span className="swatch" style={{ background: 'var(--zone)' }} />
                    Zone min
                </span>
            </div>
        </>
    );
};

export default TrendChart;
