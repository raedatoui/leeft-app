'use client';

import type { FC } from 'react';
import { useMemo } from 'react';
import type { CardioDistributionSlice } from '@/lib/hooks/useCardioPageState';
import type { CardioType } from '@/types';

interface DonutChartProps {
    distribution: CardioDistributionSlice[];
    activeType: CardioType | null;
    onTypeSelect: (t: CardioType | null) => void;
    totalLabel?: string;
}

const DonutChart: FC<DonutChartProps> = ({ distribution, activeType, onTypeSelect, totalLabel = 'Total' }) => {
    const total = useMemo(() => distribution.reduce((sum, d) => sum + d.count, 0), [distribution]);

    const gradient = useMemo(() => {
        if (total === 0) return 'var(--surface-2)';
        const stops: string[] = [];
        let acc = 0;
        for (const slice of distribution) {
            const start = (acc / total) * 100;
            acc += slice.count;
            const end = (acc / total) * 100;
            stops.push(`${slice.color} ${start}% ${end}%`);
        }
        return `conic-gradient(${stops.join(', ')})`;
    }, [distribution, total]);

    if (total === 0) {
        return (
            <div className="donut-wrap">
                <div style={{ position: 'relative' }}>
                    <div className="donut" style={{ background: 'var(--surface-2)' }} />
                    <div className="donut-center">
                        <div>
                            <div className="num">0</div>
                            <div className="lbl">{totalLabel}</div>
                        </div>
                    </div>
                </div>
                <div className="donut-legend">
                    <span className="label-mono" style={{ color: 'var(--muted-2)' }}>
                        No data
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="donut-wrap">
            <div style={{ position: 'relative' }}>
                <div className="donut" style={{ background: gradient }} />
                <div className="donut-center">
                    <div>
                        <div className="num">{total}</div>
                        <div className="lbl">{totalLabel}</div>
                    </div>
                </div>
            </div>
            <div className="donut-legend">
                {distribution.map((slice) => {
                    const isActive = activeType === slice.type;
                    const muted = activeType !== null && !isActive;
                    return (
                        <button
                            key={slice.type}
                            type="button"
                            className={`row${muted ? ' muted' : ''}`}
                            onClick={() => onTypeSelect(isActive ? null : slice.type)}
                            aria-pressed={isActive}
                        >
                            <span className="swatch" style={{ background: slice.color }} />
                            <span className="name">{slice.type}</span>
                            <span className="pct">{slice.pct}%</span>
                            <span className="count">{slice.count}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default DonutChart;
