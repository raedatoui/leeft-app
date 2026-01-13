'use client';

import Highcharts, { type Options } from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { chartColors, chartFonts } from '@/lib/chart-theme';
import type { CardioType, CardioWorkout } from '@/types';

// Cardio colors matching the card display
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

interface CardioDistributionChartProps {
    workouts: CardioWorkout[];
}

export default function CardioDistributionChart({ workouts }: CardioDistributionChartProps) {
    const chartData = useMemo(() => {
        // Count workouts by type
        const typeCounts: Record<string, number> = {};
        for (const workout of workouts) {
            typeCounts[workout.type] = (typeCounts[workout.type] || 0) + 1;
        }

        // Convert to Highcharts format
        return Object.entries(typeCounts)
            .map(([type, count]) => ({
                name: type,
                y: count,
                color: cardioTypeColors[type as CardioType] || '#888888',
            }))
            .sort((a, b) => b.y - a.y);
    }, [workouts]);

    if (workouts.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Workout Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">No data available</CardContent>
            </Card>
        );
    }

    const options: Options = {
        chart: {
            type: 'pie',
            backgroundColor: 'transparent',
            style: {
                fontFamily: chartFonts.sans,
            },
            height: 300,
        },
        title: {
            text: undefined,
        },
        tooltip: {
            pointFormat: '<b>{point.y}</b> workouts ({point.percentage:.1f}%)',
            backgroundColor: chartColors.background,
            borderColor: chartColors.border,
            style: {
                color: chartColors.foreground,
            },
        },
        plotOptions: {
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: true,
                    format: '<b>{point.name}</b>: {point.y}',
                    style: {
                        color: chartColors.foreground,
                        textOutline: 'none',
                        fontFamily: chartFonts.mono,
                    },
                },
                borderWidth: 0,
            },
        },
        series: [
            {
                type: 'pie',
                name: 'Workouts',
                data: chartData,
            },
        ],
        legend: {
            enabled: false,
        },
        credits: {
            enabled: false,
        },
    };

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg">Workout Distribution</CardTitle>
            </CardHeader>
            <CardContent>
                <HighchartsReact highcharts={Highcharts} options={options} />
            </CardContent>
        </Card>
    );
}
