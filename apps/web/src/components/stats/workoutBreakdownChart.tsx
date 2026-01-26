'use client';

import Highcharts, { type Options } from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { chartColors, chartFonts } from '@/lib/chart-theme';
import type { AggregateBy, ChartDataPoint } from '@/lib/statsUtils';

interface WorkoutBreakdownChartProps {
    data: ChartDataPoint[];
    aggregateBy: AggregateBy;
    dateRange: { start: Date; end: Date };
    onPointClick?: (point: ChartDataPoint, index: number) => void;
    selectedIndex?: number | null;
}

const LIFTING_COLOR = '#F59E0B'; // Amber
const CARDIO_COLOR = '#3B82F6'; // Blue
const DESELECTED_OPACITY = 0.3;

export default function WorkoutBreakdownChart({ data, aggregateBy, onPointClick, selectedIndex }: WorkoutBreakdownChartProps) {
    const { categories, tooltips, liftingSeries, cardioSeries } = useMemo(() => {
        const hasSelection = selectedIndex !== null && selectedIndex !== undefined;
        return {
            categories: data.map((d) => d.label),
            tooltips: data.map((d) => d.tooltip),
            liftingSeries: data.map((d, i) => ({
                y: d.liftingCount,
                color: hasSelection && i !== selectedIndex ? `rgba(245, 158, 11, ${DESELECTED_OPACITY})` : LIFTING_COLOR,
            })),
            cardioSeries: data.map((d, i) => ({
                y: d.cardioCount,
                color: hasSelection && i !== selectedIndex ? `rgba(59, 130, 246, ${DESELECTED_OPACITY})` : CARDIO_COLOR,
            })),
        };
    }, [data, selectedIndex]);

    const hasData = liftingSeries.some((v) => v.y > 0) || cardioSeries.some((v) => v.y > 0);

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
            zooming: {
                type: 'x',
                resetButton: {
                    position: {
                        align: 'right',
                        verticalAlign: 'bottom',
                        y: -30,
                    },
                    theme: {
                        fill: chartColors.primary,
                        style: {
                            color: chartColors.background,
                            border: `1px solid ${chartColors.primary}`,
                            fontFamily: chartFonts.sans,
                        },
                        states: {
                            hover: {
                                fill: chartColors.primaryDark,
                                style: {
                                    border: `1px solid ${chartColors.primaryDark}`,
                                    fontFamily: chartFonts.sans,
                                },
                            },
                        },
                    },
                },
            },
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
                // biome-ignore lint/suspicious/noExplicitAny: Highcharts tooltip context typing
                const ctx = this as any;
                const pointIndex = ctx.point.index;
                const tooltipText = tooltips[pointIndex];
                const total = (ctx.point.stackTotal as number) || 0;
                const isSelected = selectedIndex === pointIndex;
                const clickHint = isSelected ? '(Click to deselect)' : '(Click to select)';
                return `<b>${tooltipText}</b><br/>${ctx.series.name}: ${ctx.y}<br/>Total: ${total}<br/><span style="font-size: 10px; color: #666">${clickHint}</span>`;
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
                events: {
                    click: (event) => {
                        if (onPointClick) {
                            const pointIndex = event.point.index;
                            const point = data[pointIndex];
                            if (point) {
                                onPointClick(point, pointIndex);
                            }
                        }
                    },
                },
                cursor: 'pointer',
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
