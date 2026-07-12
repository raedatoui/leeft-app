'use client';

import Highcharts, { type Options } from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useTheme } from 'next-themes';
import { useMemo } from 'react';
import { fonts, V2_PALETTES } from '@/components/charts/chartPaletteV2';
import type { AggregateBy, ChartDataPoint } from '@/lib/statsUtils';

interface Props {
    data: ChartDataPoint[];
    aggregateBy: AggregateBy;
    onPointClick?: (point: ChartDataPoint, index: number) => void;
    selectedIndex?: number | null;
}

const DESELECTED_OPACITY = 0.3;

export default function WorkoutBreakdownChartV2({ data, aggregateBy, onPointClick, selectedIndex }: Props) {
    const { resolvedTheme } = useTheme();
    const pal = V2_PALETTES[resolvedTheme === 'light' ? 'light' : 'dark'];

    const { categories, tooltips, liftingSeries, cardioSeries } = useMemo(() => {
        const hasSelection = selectedIndex !== null && selectedIndex !== undefined;
        return {
            categories: data.map((d) => d.label),
            tooltips: data.map((d) => d.tooltip),
            liftingSeries: data.map((d, i) => ({
                y: d.liftingCount,
                color: hasSelection && i !== selectedIndex ? `rgba(${pal.maintRgb}, ${DESELECTED_OPACITY})` : pal.maint,
            })),
            cardioSeries: data.map((d, i) => ({
                y: d.cardioCount,
                color: hasSelection && i !== selectedIndex ? `rgba(${pal.cardioRgb}, ${DESELECTED_OPACITY})` : pal.cardio,
            })),
        };
    }, [data, selectedIndex, pal]);

    const hasData = liftingSeries.some((v) => v.y > 0) || cardioSeries.some((v) => v.y > 0);

    if (!hasData) {
        return <div className="empty-state">No workouts in this period</div>;
    }

    const titleSuffix = aggregateBy === 'month' ? 'by month' : aggregateBy === 'week' ? 'by week' : 'by day';

    const options: Options = {
        chart: {
            type: 'column',
            backgroundColor: 'transparent',
            style: { fontFamily: fonts.body },
            height: 280,
            spacing: [16, 0, 8, 0],
            zooming: { type: 'x' },
        },
        title: { text: undefined },
        xAxis: {
            categories,
            labels: {
                style: {
                    color: pal.muted,
                    fontFamily: fonts.mono,
                    fontSize: data.length > 30 ? '9px' : '11px',
                },
                rotation: data.length > 20 ? -45 : 0,
            },
            lineColor: pal.border,
            tickColor: pal.border,
        },
        yAxis: {
            min: 0,
            title: { text: undefined },
            gridLineColor: pal.border,
            labels: {
                style: {
                    color: pal.muted,
                    fontFamily: fonts.mono,
                },
            },
            stackLabels: {
                enabled: data.length <= 20,
                style: {
                    fontWeight: 'bold',
                    color: pal.fg,
                    textOutline: 'none',
                },
            },
        },
        legend: {
            itemStyle: {
                color: pal.muted,
                fontFamily: fonts.body,
            },
            itemHoverStyle: { color: pal.fg },
        },
        tooltip: {
            formatter: function () {
                // biome-ignore lint/suspicious/noExplicitAny: Highcharts tooltip context typing
                const ctx = this as any;
                const i = ctx.point.index;
                const total = (ctx.point.stackTotal as number) || 0;
                return `<b>${tooltips[i]}</b><br/>${ctx.series.name}: ${ctx.y}<br/>Total: ${total}`;
            },
            backgroundColor: pal.bg,
            borderColor: pal.border,
            style: { color: pal.fg },
        },
        plotOptions: {
            column: {
                stacking: 'normal',
                dataLabels: { enabled: false },
                borderWidth: 0,
                pointPadding: data.length > 30 ? 0 : 0.1,
                groupPadding: data.length > 30 ? 0.05 : 0.1,
                events: {
                    click: (event) => {
                        if (onPointClick) {
                            const i = event.point.index;
                            const point = data[i];
                            if (point) onPointClick(point, i);
                        }
                    },
                },
                cursor: 'pointer',
            },
        },
        series: [
            { name: 'Lifting', type: 'column', data: liftingSeries, color: pal.maint },
            { name: 'Cardio', type: 'column', data: cardioSeries, color: pal.cardio },
        ],
        credits: { enabled: false },
    };

    return (
        <>
            <div className="panel-label" style={{ margin: '0 0 8px' }}>
                <span>Workout Breakdown</span>
                <span className="hint">{titleSuffix}</span>
            </div>
            <HighchartsReact highcharts={Highcharts} options={options} />
        </>
    );
}
