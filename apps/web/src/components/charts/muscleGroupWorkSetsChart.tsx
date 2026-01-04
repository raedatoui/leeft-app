'use client';

import Highcharts, { type Options } from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { chartColors, chartFonts } from '@/lib/chart-theme';
import { useWorkouts } from '@/lib/contexts';
import type { ExerciseMap, Workout } from '@/types';

interface MuscleGroupWorkSetsChartProps {
    workouts: Workout[];
    exerciseMap: ExerciseMap;
    className?: string;
}

export default function MuscleGroupWorkSetsChart({ workouts, exerciseMap, className }: MuscleGroupWorkSetsChartProps) {
    const { muscleGroups: canonicalGroups } = useWorkouts();
    const { categories, series } = useMemo(() => {
        // 1. Collect all muscle group IDs and dates
        const muscleGroupIds = new Set<string>();
        const dateMap = new Map<string, number>(); // dateStr -> index
        const sortedWorkouts = [...workouts].sort((a, b) => a.date.getTime() - b.date.getTime());

        const dates = sortedWorkouts.map((w) => w.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

        sortedWorkouts.forEach((w, i) => {
            dateMap.set(w.uuid, i); // Use workout UUID or just index since we mapped dates 1:1
        });

        // 2. Aggregate data
        // Structure: { [muscleGroupId]: [count_day1, count_day2, ...] }
        const data: Record<string, number[]> = {};

        sortedWorkouts.forEach((workout, dateIndex) => {
            workout.exercises.forEach((exercise) => {
                const metadata = exerciseMap.get(exercise.exerciseId.toString());
                const groupId = metadata?.primaryMuscleGroup || 'other';
                muscleGroupIds.add(groupId);

                if (!data[groupId]) {
                    data[groupId] = new Array(sortedWorkouts.length).fill(0);
                }

                let workSets = 0;
                exercise.sets.forEach((set) => {
                    if (set.isWorkSet) {
                        workSets++;
                    }
                });

                data[groupId][dateIndex] += workSets;
            });
        });

        // 3. Format for Highcharts
        const chartSeries = Array.from(muscleGroupIds).map((groupId) => {
            const mg = canonicalGroups.find((m) => m.id === groupId);
            return {
                name: mg?.name || groupId,
                data: data[groupId],
                color: mg?.color || '#888888',
                type: 'column' as const,
            };
        });

        return {
            categories: dates,
            series: chartSeries,
        };
    }, [workouts, exerciseMap, canonicalGroups]);

    if (series.length === 0) return null;

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
                text: 'Work Sets',
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
            series: {
                events: {
                    legendItemClick: function (e) {
                        e.preventDefault();
                        const series = this as any;
                        const chart = series.chart;

                        const isSolo = series.visible && chart.series.every((s: any) => s === series || !s.visible);

                        if (isSolo) {
                            chart.series.forEach((s: any) => {
                                s.setVisible(true, false);
                            });
                        } else {
                            chart.series.forEach((s: any) => {
                                s.setVisible(s === series, false);
                            });
                        }
                        chart.redraw();
                    },
                },
            },
        },
        series: series as any,
    };

    return (
        <Card className={className}>
            <CardContent className="p-4 pt-6">
                <HighchartsReact highcharts={Highcharts} options={options} />
            </CardContent>
        </Card>
    );
}
