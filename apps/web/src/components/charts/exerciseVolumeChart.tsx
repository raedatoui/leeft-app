import Highcharts, { type Options, type Point, type PointClickEventObject } from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { chartColors as colors, chartFonts as fonts } from '@/lib/chart-theme';
import type { MappedWorkout, Workout } from '@/types';

interface ExerciseVolumeChartProps {
    mappedWorkouts: MappedWorkout[];
    exerciseName: string;
    onPointMouseOver: (workout: MappedWorkout) => void;
    onPointClick: (date: string) => void;
    selectedWorkout: MappedWorkout | null;
}

const workoutDate = (w: Workout | MappedWorkout): string =>
    w.date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit',
        timeZone: 'EST',
    });

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
                lineWidth: 1,
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

export default function ExerciseVolumeChart({
    mappedWorkouts,
    exerciseName,
    onPointMouseOver,
    onPointClick,
    selectedWorkout,
}: ExerciseVolumeChartProps) {
    const chartOptions: Options = {
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
    };

    return <HighchartsReact highcharts={Highcharts} options={chartOptions} />;
}
