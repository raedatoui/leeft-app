'use client';

import Highcharts, { type Options } from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cardioColors } from '@/lib/cardio-theme';
import { chartColors, chartFonts } from '@/lib/chart-theme';
import type { CardioType, CardioWorkout } from '@/types';

interface CardioDistributionChartProps {
    workouts: CardioWorkout[];
    activeType?: CardioType | null;
    onTypeSelect?: (type: CardioType | null) => void;
}

export default function CardioDistributionChart({ workouts, activeType, onTypeSelect }: CardioDistributionChartProps) {
    const chartData = useMemo(() => {
        // Count workouts by type
        const typeCounts: Record<string, number> = {};
        for (const workout of workouts) {
            typeCounts[workout.type] = (typeCounts[workout.type] || 0) + 1;
        }

        // Convert to Highcharts format with selection state
        return Object.entries(typeCounts)
            .map(([type, count]) => ({
                name: type,
                y: count,
                color: cardioColors[type as CardioType] || '#888888',
                sliced: activeType === type,
                selected: activeType === type,
            }))
            .sort((a, b) => b.y - a.y);
    }, [workouts, activeType]);

    const handlePointClick = useCallback(
        (event: Highcharts.PointClickEventObject) => {
            if (!onTypeSelect) return;
            const clickedType = event.point.name as CardioType;
            // Toggle: if already selected, deselect (set to null)
            if (activeType === clickedType) {
                onTypeSelect(null);
            } else {
                onTypeSelect(clickedType);
            }
        },
        [onTypeSelect, activeType]
    );

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
                point: {
                    events: {
                        click: handlePointClick,
                    },
                },
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
