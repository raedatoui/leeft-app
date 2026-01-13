'use client';

import Highcharts, { type Options } from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { chartColors, chartFonts } from '@/lib/chart-theme';
import type { AggregateBy, ChartDataPoint } from '@/lib/overview-utils';

interface WorkoutBreakdownChartProps {
    data: ChartDataPoint[];
    aggregateBy: AggregateBy;
    dateRange: { start: Date; end: Date };
}

const LIFTING_COLOR = '#F59E0B'; // Amber
const CARDIO_COLOR = '#3B82F6'; // Blue

export default function WorkoutBreakdownChart({ data, aggregateBy }: WorkoutBreakdownChartProps) {
    const { categories, tooltips, liftingSeries, cardioSeries } = useMemo(() => {
        return {
            categories: data.map((d) => d.label),
            tooltips: data.map((d) => d.tooltip),
            liftingSeries: data.map((d) => d.liftingCount),
            cardioSeries: data.map((d) => d.cardioCount),
        };
    }, [data]);

    const hasData = liftingSeries.some((v) => v > 0) || cardioSeries.some((v) => v > 0);

    if (!hasData) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Workout Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">No workouts in this period</CardContent>
            </Card>
        );
    }

    const options: Options = {
        chart: {
            type: 'column',
            backgroundColor: 'transparent',
            style: {
                fontFamily: chartFonts.sans,
            },
            height: 300,
        },
        title: {
            text: undefined,
        },
        xAxis: {
            categories: categories,
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
            title: {
                text: 'Workouts',
                style: {
                    color: chartColors.mutedForeground,
                },
            },
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
            itemHoverStyle: {
                color: chartColors.foreground,
            },
        },
        tooltip: {
            formatter: function () {
                const pointIndex = this.point.index;
                const tooltipText = tooltips[pointIndex];
                const total = (this.point.stackTotal as number) || 0;
                return `<b>${tooltipText}</b><br/>${this.series.name}: ${this.y}<br/>Total: ${total}`;
            },
            backgroundColor: chartColors.background,
            borderColor: chartColors.border,
            style: {
                color: chartColors.foreground,
            },
        },
        plotOptions: {
            column: {
                stacking: 'normal',
                dataLabels: {
                    enabled: false,
                },
                borderWidth: 0,
                pointPadding: data.length > 30 ? 0 : 0.1,
                groupPadding: data.length > 30 ? 0.05 : 0.1,
            },
        },
        series: [
            {
                name: 'Lifting',
                type: 'column',
                data: liftingSeries,
                color: LIFTING_COLOR,
            },
            {
                name: 'Cardio',
                type: 'column',
                data: cardioSeries,
                color: CARDIO_COLOR,
            },
        ],
        credits: {
            enabled: false,
        },
    };

    const titleSuffix = aggregateBy === 'month' ? '(by month)' : aggregateBy === 'week' ? '(by week)' : '(by day)';

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg">Workout Breakdown {titleSuffix}</CardTitle>
            </CardHeader>
            <CardContent>
                <HighchartsReact highcharts={Highcharts} options={options} />
            </CardContent>
        </Card>
    );
}
