import Highcharts, { type Options, type Point, type PointClickEventObject } from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useState } from 'react';
import ExerciseSelector from '@/components/selector';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import WorkoutTable from '@/components/workoutTable';
import { maxCalculators, oneRepMaxCalculators } from '@/lib/calc';
import { type ExerciseMetadata, type MappedWorkout, MappedWorkoutSchema, type RepRange, type Workout } from '@/types';

interface Props {
    workouts: Workout[];
    exercise: ExerciseMetadata;
    exerciseMap: Map<string, ExerciseMetadata>;
    cycleId?: string;
    hideSelector?: boolean;
    hideTitle?: boolean;
}

import { chartColors as colors, chartFonts as fonts } from '@/lib/chart-theme';

const defaultOptions: Options = {
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
        style: {
            color: colors.foreground,
            fontFamily: fonts.sans,
        },
    },
    subtitle: {
        text: '',
        style: {
            fontFamily: fonts.sans,
            color: colors.mutedForeground,
        },
    },
    xAxis: {
        crosshair: true,
        labels: {
            style: {
                color: colors.mutedForeground,
                fontFamily: fonts.mono,
            },
        },
        gridLineWidth: 0,
        lineWidth: 0,
    },
    yAxis: {
        title: {
            useHTML: false,
            text: 'Weight in lbs',
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
        minorTickInterval: 5,
        gridLineWidth: 0,
        minorGridLineWidth: 0,
    },
    tooltip: {
        backgroundColor: colors.background,
        borderColor: colors.border,
        headerFormat: `<span style="font-size:10px; font-family: ${fonts.mono}">{point.key}</span><table>`,
        pointFormat: `<tr><td style="padding:0"><b style="font-family: ${fonts.mono}">{point.y:.1f}</b></td></tr>`,
        footerFormat: '</table>',
        shared: true,
        useHTML: true,
        style: {
            color: colors.foreground,
            fontFamily: fonts.sans,
        },
    },
    plotOptions: {
        column: {
            pointPadding: 0.2,
            borderWidth: 0,
        },
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
                radius: 2,
            },
            lineWidth: 1,
            states: {
                hover: {
                    lineWidth: 1,
                },
            },
            threshold: null,
        },
        series: {
            color: colors.primary,
            marker: {
                fillColor: colors.primary,
                lineWidth: 1,
                lineColor: colors.primary,
            },
        },
    },
    legend: {
        enabled: false,
        itemStyle: {
            color: colors.foreground,
            fontFamily: fonts.sans,
        },
    },
    series: [],
};

const workoutDate = (w: Workout): string =>
    w.date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit',
        timeZone: 'EST',
    });

export default function ExerciseView({ workouts, exercise, exerciseMap, cycleId, hideSelector = false }: Props) {
    const [selectedMethod, setSelectedMethod] = useState(maxCalculators[0]);
    const [selectedWorkout, setSelectedWorkout] = useState<MappedWorkout | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [repRange, setRepRange] = useState<RepRange>({ min: 1, max: 50 });

    const mappedWorkouts = workouts
        .filter((workout) => {
            const exerciseData = workout.exercises.find((ex) => ex.exerciseId === exercise.id);
            if (!exerciseData) return false;
            return exerciseData.sets.some((set) => set.reps && set.reps >= (repRange?.min ?? 1) && set.reps <= (repRange?.max ?? 5));
        })
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((w) =>
            MappedWorkoutSchema.parse({
                ...w,
                selected: w.exercises.find((e) => e.exerciseId === exercise.id),
                weight: 0,
            })
        )
        .map((w) => ({
            ...w,
            weight: selectedMethod.calculator(w, repRange),
        }))
        .filter((w) => w.weight > 0);

    const weights = mappedWorkouts.map((w) => w.weight);
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);

    const handleRepRangeChange = (values: number[]) => {
        setRepRange({
            min: values[0],
            max: values[1],
        });
    };

    const handlePointMouseOver = (workout: MappedWorkout) => {
        setSelectedWorkout(workout);
        setIsExpanded(false);
    };

    const handlePointClick = (date: string) => {
        const filtered = mappedWorkouts.filter((w) => workoutDate(w) === date);
        if (filtered.length > 0) {
            setSelectedWorkout(filtered[0]);
            setIsExpanded(true);
        }
    };

    const getChartOptions = ({
        mappedWorkouts,
        exerciseName,
        onPointMouseOver,
        onPointClick,
    }: {
        mappedWorkouts: MappedWorkout[];
        exerciseName: string;
        onPointMouseOver: (workout: MappedWorkout) => void;
        onPointClick: (date: string) => void;
    }): Options => ({
        ...defaultOptions,
        title: {
            ...defaultOptions.title,
            text: '',
        },
        xAxis: {
            ...defaultOptions.xAxis,
            categories: mappedWorkouts.map((w) => workoutDate(w)),
        },
        series: [
            {
                color: colors.primary,
                type: 'area',
                name: exerciseName,
                data: mappedWorkouts.map((w) => ({
                    y: w.weight,
                    selected: selectedWorkout ? workoutDate(w) === workoutDate(selectedWorkout) : undefined,
                    marker: {
                        enabled: true,
                        radius: selectedWorkout && workoutDate(w) === workoutDate(selectedWorkout) ? 3 : 2,
                    },
                })),
            },
        ],
        plotOptions: {
            ...defaultOptions.plotOptions,
            series: {
                ...defaultOptions.plotOptions?.series,
                point: {
                    events: {
                        mouseOver(this: Point) {
                            onPointMouseOver(mappedWorkouts[this.index]);
                        },
                        click(e: PointClickEventObject) {
                            if (e.point.series && e.point.x !== undefined) {
                                const date = e.point.series.xAxis?.categories?.[e.point.x];
                                if (date) {
                                    onPointClick(date);
                                }
                            }
                        },
                    },
                },
            },
        },
    });

    const chartOptions = getChartOptions({
        mappedWorkouts,
        exerciseName: exercise.name,
        onPointMouseOver: handlePointMouseOver,
        onPointClick: handlePointClick,
    });

    return (
        <div className="flex flex-col gap-4">
            {/* Filters Section */}
            <Card>
                <CardContent className="py-3 px-3 sm:px-4">
                    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                                Rep Range: {repRange.min}-{repRange.max}
                            </span>
                            <Slider
                                min={1}
                                max={50}
                                step={1}
                                value={[repRange.min, repRange.max]}
                                onValueChange={handleRepRangeChange}
                                className="w-[200px]"
                            />
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            {maxCalculators.map((method) => (
                                <Button
                                    key={method.name}
                                    onClick={() => setSelectedMethod(method)}
                                    variant={selectedMethod.name === method.name ? 'default' : 'outline'}
                                    size="sm"
                                >
                                    {method.name}
                                </Button>
                            ))}

                            {/* 1RM Dropdown */}
                            <Select
                                value={oneRepMaxCalculators.includes(selectedMethod) ? selectedMethod.name : ''}
                                onValueChange={(value) => {
                                    const method = oneRepMaxCalculators.find((m) => m.name === value);
                                    if (method) setSelectedMethod(method);
                                }}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="1RM Max" />
                                </SelectTrigger>
                                <SelectContent>
                                    {oneRepMaxCalculators.map((method) => (
                                        <SelectItem key={method.name} value={method.name}>
                                            {method.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {!hideSelector && (
                            <div className="w-full lg:w-auto flex justify-center lg:justify-end">
                                <ExerciseSelector exerciseMap={exerciseMap} />
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Stats & Description Card - Full Width */}
            <Card>
                <CardContent className="py-3 px-4">
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="flex flex-col gap-1">
                                <h3 className="text-sm font-semibold">
                                    {selectedMethod.name}: {selectedMethod.formula}
                                </h3>
                                <p className="text-xs text-muted-foreground">{selectedMethod.description}</p>
                            </div>

                            <div className="flex gap-4 sm:gap-6">
                                <div className="flex flex-col items-center">
                                    <span className="text-lg sm:text-xl font-bold text-primary">{mappedWorkouts.length}</span>
                                    <span className="text-xs text-muted-foreground text-center">Workouts</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-lg sm:text-xl font-bold text-primary">{maxWeight.toLocaleString()}</span>
                                    <span className="text-xs text-muted-foreground text-center">Max (lbs)</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-lg sm:text-xl font-bold text-primary">{minWeight.toLocaleString()}</span>
                                    <span className="text-xs text-muted-foreground text-center">Min (lbs)</span>
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed">{exercise.description}</p>
                    </div>
                </CardContent>
            </Card>

            {/* Chart and Workout Table Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Chart Section - 2 columns */}
                <Card className="lg:col-span-2">
                    <CardContent className="p-2">
                        <HighchartsReact highcharts={Highcharts} options={chartOptions} />
                    </CardContent>
                </Card>

                {/* Workout Detail Card - 1 column */}
                {selectedWorkout && (
                    <WorkoutTable
                        workout={selectedWorkout}
                        exerciseMap={exerciseMap}
                        selectedExercise={exercise}
                        showFullWorkout={isExpanded}
                        onToggleFullWorkout={() => setIsExpanded(true)}
                        miniMode={false}
                        maxHeight="500px"
                        cycleId={cycleId}
                    />
                )}
            </div>
        </div>
    );
}
