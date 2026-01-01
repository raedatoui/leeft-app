'use client';

import Highcharts, { type Options, type Point } from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Dumbbell } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import WorkoutTable from '@/components/workoutTable';
import type { ExerciseMap, Workout } from '@/types';

interface MuscleGroupVolumeChartProps {
    workouts: Workout[];
    muscleGroup: string;
    exerciseMap: ExerciseMap;
}

// Theme colors - matching exercise.tsx
const colors = {
    primary: 'rgb(255, 176, 38)',
    primaryDark: 'rgb(204, 141, 30)',
    background: 'hsl(240, 10%, 3.9%)',
    foreground: 'rgb(249, 249, 249)',
    mutedForeground: 'rgb(161, 161, 170)',
    border: 'rgb(39, 39, 42)',
} as const;

const fonts = {
    sans: 'var(--font-geist-sans)',
    mono: 'var(--font-geist-mono)',
} as const;

const workoutDate = (w: Workout): string =>
    w.date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit',
        timeZone: 'EST',
    });

export default function MuscleGroupVolumeChart({ workouts, muscleGroup, exerciseMap }: MuscleGroupVolumeChartProps) {
    const [includeWarmup, setIncludeWarmup] = useState(true);
    const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);

    const volumeData = useMemo(() => {
        const dataPoints: { date: Date; dateStr: string; volume: number; sets: number; workout: Workout }[] = [];

        for (const workout of workouts) {
            let workoutVolume = 0;
            let workoutSets = 0;

            for (const exercise of workout.exercises) {
                const metadata = exerciseMap.get(exercise.exerciseId.toString());
                if (metadata?.primaryMuscleGroup !== muscleGroup) continue;

                for (const set of exercise.sets) {
                    const isQualifyingSet = includeWarmup || set.isWorkSet;
                    if (isQualifyingSet && set.reps && set.weight) {
                        workoutVolume += set.reps * set.weight;
                        workoutSets++;
                    }
                }
            }

            if (workoutVolume > 0) {
                dataPoints.push({
                    date: workout.date,
                    dateStr: workoutDate(workout),
                    volume: workoutVolume,
                    sets: workoutSets,
                    workout,
                });
            }
        }

        return dataPoints.sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [workouts, muscleGroup, exerciseMap, includeWarmup]);

    const totalVolume = volumeData.reduce((sum, d) => sum + d.volume, 0);
    const avgVolume = volumeData.length > 0 ? Math.round(totalVolume / volumeData.length) : 0;
    const maxVolume = volumeData.length > 0 ? Math.max(...volumeData.map((d) => d.volume)) : 0;

    const chartOptions: Options = {
        chart: {
            zooming: {
                type: 'x',
                resetButton: {
                    position: {
                        align: 'right',
                        verticalAlign: 'bottom',
                        y: -30,
                    },
                    theme: {
                        fill: colors.primary,
                        style: {
                            color: colors.background,
                            border: `1px solid ${colors.primary}`,
                            fontFamily: fonts.sans,
                        },
                        states: {
                            hover: {
                                fill: colors.primaryDark,
                                style: {
                                    border: `1px solid ${colors.primaryDark}`,
                                    fontFamily: fonts.sans,
                                },
                            },
                        },
                    },
                },
            },
            backgroundColor: colors.background,
            type: 'area',
            style: {
                fontFamily: fonts.sans,
            },
        },
        title: {
            text: '',
        },
        xAxis: {
            crosshair: true,
            categories: volumeData.map((d) => d.dateStr),
            labels: {
                style: {
                    color: colors.mutedForeground,
                    fontFamily: fonts.mono,
                },
            },
            gridLineWidth: 0,
            lineWidth: 0,
        },
        yAxis: [
            {
                title: {
                    text: 'Volume (lbs)',
                    style: {
                        color: colors.mutedForeground,
                        fontFamily: fonts.sans,
                    },
                },
                labels: {
                    style: {
                        color: colors.mutedForeground,
                        fontFamily: fonts.mono,
                    },
                },
                gridLineWidth: 0,
                minorGridLineWidth: 0,
            },
            {
                title: {
                    text: 'Sets',
                    style: {
                        color: colors.mutedForeground,
                        fontFamily: fonts.sans,
                    },
                },
                labels: {
                    style: {
                        color: colors.mutedForeground,
                        fontFamily: fonts.mono,
                    },
                },
                opposite: true,
                gridLineWidth: 0,
                minorGridLineWidth: 0,
            },
        ],
        tooltip: {
            backgroundColor: colors.background,
            borderColor: colors.border,
            headerFormat: `<span style="font-size:10px; font-family: ${fonts.mono}">{point.key}</span><table>`,
            pointFormat: `<tr><td style="padding:0; color: ${colors.mutedForeground}">{series.name}: </td><td style="padding:0"><b style="font-family: ${fonts.mono}">{point.y:,.0f}</b></td></tr>`,
            footerFormat: '</table>',
            shared: true,
            useHTML: true,
            style: {
                color: colors.foreground,
                fontFamily: fonts.sans,
            },
        },
        plotOptions: {
            area: {
                fillColor: {
                    linearGradient: {
                        x1: 0,
                        y1: 0,
                        x2: 0,
                        y2: 1,
                    },
                    stops: [
                        [0, 'rgb(255, 176, 38, 0.3)'],
                        [1, 'rgb(204, 141, 30, 0.05)'],
                    ],
                },
                marker: {
                    radius: 3,
                    fillColor: colors.primary,
                },
                lineWidth: 2,
                states: {
                    hover: {
                        lineWidth: 2,
                    },
                },
                threshold: null,
            },
            series: {
                color: colors.primary,
                point: {
                    events: {
                        mouseOver(this: Point) {
                            const dataPoint = volumeData[this.index];
                            if (dataPoint) {
                                setSelectedWorkout(dataPoint.workout);
                                setIsExpanded(false);
                            }
                        },
                        click(this: Point) {
                            const dataPoint = volumeData[this.index];
                            if (dataPoint) {
                                setSelectedWorkout(dataPoint.workout);
                                setIsExpanded(true);
                            }
                        },
                    },
                },
            },
        },
        legend: {
            enabled: true,
            itemStyle: {
                color: colors.mutedForeground,
                fontFamily: fonts.sans,
            },
            itemHoverStyle: {
                color: colors.foreground,
            },
        },
        series: [
            {
                type: 'area',
                name: 'Volume',
                data: volumeData.map((d) => d.volume),
                yAxis: 0,
            },
            {
                type: 'column',
                name: 'Sets',
                data: volumeData.map((d) => d.sets),
                yAxis: 1,
                color: 'rgba(255, 176, 38, 0.4)',
                borderColor: colors.primary,
                borderWidth: 1,
            },
        ],
    };

    if (volumeData.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Header with stats and toggle */}
            <Card>
                <CardContent className="py-3 px-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-lg font-bold capitalize">{muscleGroup} Volume</h3>
                            <p className="text-xs text-muted-foreground">{includeWarmup ? 'All sets' : 'Work sets only'} • Volume = Reps × Weight</p>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-tighter">
                                <Label htmlFor="include-warmup" className="cursor-pointer">
                                    <Dumbbell className="h-4 w-4 text-muted-foreground" />
                                </Label>
                                <Switch id="include-warmup" checked={includeWarmup} onCheckedChange={setIncludeWarmup} className="scale-90" />
                            </div>

                            <div className="flex gap-4">
                                <div className="flex flex-col items-center">
                                    <span className="text-lg font-bold text-primary">{volumeData.length}</span>
                                    <span className="text-xs text-muted-foreground">Workouts</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-lg font-bold text-primary">{avgVolume.toLocaleString()}</span>
                                    <span className="text-xs text-muted-foreground">Avg Vol</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-lg font-bold text-primary">{maxVolume.toLocaleString()}</span>
                                    <span className="text-xs text-muted-foreground">Max Vol</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Chart and Workout Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2">
                    <CardContent className="p-2">
                        <HighchartsReact highcharts={Highcharts} options={chartOptions} />
                    </CardContent>
                </Card>

                {selectedWorkout && (
                    <WorkoutTable
                        workout={selectedWorkout}
                        exerciseMap={exerciseMap}
                        muscleGroupFilter={muscleGroup}
                        showFullWorkout={isExpanded}
                        onToggleFullWorkout={() => setIsExpanded(true)}
                        miniMode={false}
                        maxHeight="500px"
                        includeWarmup={includeWarmup}
                    />
                )}
            </div>
        </div>
    );
}
