'use client';

import Highcharts, { type Options } from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { chartColors, chartFonts } from '@/lib/chart-theme';
import type { CardioType, CardioWorkout } from '@/types';

// Cardio colors
const cardioTypeColors: Record<CardioType, string> = {
    Run: '#FF5252',
    'Treadmill run': '#FF5252',
    Swim: '#2196F3',
    Bike: '#4CAF50',
    'Outdoor Bike': '#4CAF50',
    Elliptical: '#9C27B0',
    'Rowing machine': '#FF9800',
    HIIT: '#E91E63',
    'Aerobic Workout': '#00BCD4',
};

interface CardioTrendsChartProps {
    workouts: CardioWorkout[];
    year: number;
}

export default function CardioTrendsChart({ workouts, year }: CardioTrendsChartProps) {
    const { categories, series } = useMemo(() => {
        // Generate month labels
        const months = Array.from({ length: 12 }, (_, i) => {
            const date = new Date(year, i, 1);
            return date.toLocaleString('en-US', { month: 'short' });
        });

        // Count workouts by month and type
        const typesSet = new Set<CardioType>();
        const monthlyData: Record<string, Record<CardioType, number>> = {};

        // Initialize all months
        for (let i = 0; i < 12; i++) {
            monthlyData[i] = {} as Record<CardioType, number>;
        }

        for (const workout of workouts) {
            const month = workout.date.getMonth();
            const type = workout.type;
            typesSet.add(type);
            monthlyData[month][type] = (monthlyData[month][type] || 0) + 1;
        }

        // Convert to Highcharts series format
        const chartSeries = Array.from(typesSet).map((type) => ({
            name: type,
            type: 'column' as const,
            data: Array.from({ length: 12 }, (_, i) => monthlyData[i][type] || 0),
            color: cardioTypeColors[type] || '#888888',
        }));

        return {
            categories: months,
            series: chartSeries,
        };
    }, [workouts, year]);

    if (workouts.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Monthly Trends</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">No data available</CardContent>
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
                },
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
                enabled: true,
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
            headerFormat: '<b>{point.x}</b><br/>',
            pointFormat: '{series.name}: {point.y}<br/>Total: {point.stackTotal}',
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
            },
        },
        series: series as any,
        credits: {
            enabled: false,
        },
    };

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg">Monthly Trends</CardTitle>
            </CardHeader>
            <CardContent>
                <HighchartsReact highcharts={Highcharts} options={options} />
            </CardContent>
        </Card>
    );
}
