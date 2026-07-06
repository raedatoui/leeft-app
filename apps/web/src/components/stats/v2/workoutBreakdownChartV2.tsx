'use client';

import Highcharts, { type Options } from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useMemo } from 'react';
import { chartColors, chartFonts } from '@/lib/chart-theme';
import type { AggregateBy, ChartDataPoint } from '@/lib/statsUtils';

interface Props {
    data: ChartDataPoint[];
    aggregateBy: AggregateBy;
    dateRange: { start: Date; end: Date };
    onPointClick?: (point: ChartDataPoint, index: number) => void;
    selectedIndex?: number | null;
}

const LIFTING_COLOR = '#ffa000';
const CARDIO_COLOR = '#00d4ff';
const DESELECTED_OPACITY = 0.3;

export default function WorkoutBreakdownChartV2({ data, aggregateBy, onPointClick, selectedIndex }: Props) {
    const { categories, tooltips, liftingSeries, cardioSeries } = useMemo(() => {
        const hasSelection = selectedIndex !== null && selectedIndex !== undefined;
        return {
            categories: data.map((d) => d.label),
            tooltips: data.map((d) => d.tooltip),
            liftingSeries: data.map((d, i) => ({
                y: d.liftingCount,
                color: hasSelection && i !== selectedIndex ? `rgba(255, 160, 0, ${DESELECTED_OPACITY})` : LIFTING_COLOR,
            })),
            cardioSeries: data.map((d, i) => ({
                y: d.cardioCount,
                color: hasSelection && i !== selectedIndex ? `rgba(0, 212, 255, ${DESELECTED_OPACITY})` : CARDIO_COLOR,
            })),
        };
    }, [data, selectedIndex]);

    const hasData = liftingSeries.some((v) => v.y > 0) || cardioSeries.some((v) => v.y > 0);

    if (!hasData) {
        return <div className="empty-state">No workouts in this period</div>;
    }

    const titleSuffix = aggregateBy === 'month' ? 'by month' : aggregateBy === 'week' ? 'by week' : 'by day';

    const options: Options = {
        chart: {
            type: 'column',
            backgroundColor: 'transparent',
            style: { fontFamily: chartFonts.sans },
            height: 280,
            spacing: [16, 0, 8, 0],
            zooming: { type: 'x' },
        },
        title: { text: undefined },
        xAxis: {
            categories,
            labels: {
                style: {
                    color: chartColors.mutedForeground,
                    fontFamily: chartFonts.mono,
                    fontSize: data.length > 30 ? '9px' : '11px',
                },
                rotation: data.length > 20 ? -45 : 0,
            },
            lineColor: chartColors.border,
            tickColor: chartColors.border,
        },
        yAxis: {
            min: 0,
            title: { text: undefined },
            gridLineColor: chartColors.border,
            labels: {
                style: {
                    color: chartColors.mutedForeground,
                    fontFamily: chartFonts.mono,
                },
            },
            stackLabels: {
                enabled: data.length <= 20,
                style: {
                    fontWeight: 'bold',
                    color: chartColors.foreground,
                    textOutline: 'none',
                },
            },
        },
        legend: {
            itemStyle: {
                color: chartColors.mutedForeground,
                fontFamily: chartFonts.sans,
            },
            itemHoverStyle: { color: chartColors.foreground },
        },
        tooltip: {
            formatter: function () {
                // biome-ignore lint/suspicious/noExplicitAny: Highcharts tooltip context typing
                const ctx = this as any;
                const i = ctx.point.index;
                const total = (ctx.point.stackTotal as number) || 0;
                return `<b>${tooltips[i]}</b><br/>${ctx.series.name}: ${ctx.y}<br/>Total: ${total}`;
            },
            backgroundColor: chartColors.background,
            borderColor: chartColors.border,
            style: { color: chartColors.foreground },
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
            { name: 'Lifting', type: 'column', data: liftingSeries, color: LIFTING_COLOR },
            { name: 'Cardio', type: 'column', data: cardioSeries, color: CARDIO_COLOR },
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
