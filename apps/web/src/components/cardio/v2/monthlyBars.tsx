'use client';

import type { FC } from 'react';
import { useMemo } from 'react';
import { cardioColors } from '@/lib/cardio-theme';
import type { CardioMonthlyTrendBucket } from '@/lib/hooks/useCardioPageState';

interface MonthlyBarsProps {
    monthlyTrend: CardioMonthlyTrendBucket[];
    /** Types in overall rank order — keeps stacking order consistent across months. */
    typeOrder: string[];
    activeType: string | null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatHours(min: number): string {
    const h = min / 60;
    if (h >= 10) return `${Math.round(h)}h`;
    return `${Math.round(h * 10) / 10}h`;
}

const MonthlyBars: FC<MonthlyBarsProps> = ({ monthlyTrend, typeOrder, activeType }) => {
    const maxDurationMin = useMemo(() => Math.max(...monthlyTrend.map((b) => b.durationMin)), [monthlyTrend]);

    if (maxDurationMin <= 0) {
        return (
            <>
                <div className="chart-empty">No sessions in this period</div>
                <div className="month-x">
                    {MONTHS.map((m) => (
                        <div key={m}>{m}</div>
                    ))}
                </div>
            </>
        );
    }

    return (
        <>
            <div className="month-bars">
                {monthlyTrend.map((bucket) => (
                    <div key={bucket.month} className="month-col">
                        {bucket.durationMin > 0 && <div className="month-val">{formatHours(bucket.durationMin)}</div>}
                        {/* 90% ceiling leaves room for the value label above the tallest bar */}
                        <div className="month-stack" style={{ height: `${(bucket.durationMin / maxDurationMin) * 90}%` }}>
                            {typeOrder
                                .filter((type) => (bucket.byTypeDurationMin[type] ?? 0) > 0)
                                .map((type) => {
                                    const min = bucket.byTypeDurationMin[type] ?? 0;
                                    const count = bucket.byType[type] ?? 0;
                                    const muted = activeType !== null && activeType !== type;
                                    return (
                                        <div
                                            key={type}
                                            className={`month-seg${muted ? ' muted' : ''}`}
                                            style={{ background: cardioColors[type] ?? '#888888', flexGrow: min }}
                                            title={`${MONTHS[bucket.month]} · ${type} · ${formatHours(min)} · ${count} session${count === 1 ? '' : 's'}`}
                                        />
                                    );
                                })}
                        </div>
                    </div>
                ))}
            </div>
            <div className="month-x">
                {MONTHS.map((m) => (
                    <div key={m}>{m}</div>
                ))}
            </div>
        </>
    );
};

export default MonthlyBars;
