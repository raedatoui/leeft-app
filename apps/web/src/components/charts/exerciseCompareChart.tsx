'use client';

import Highcharts, { type Options } from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useTheme } from 'next-themes';
import { COMPARE_SERIES_COLORS, fonts, V2_PALETTES } from '@/components/charts/chartPaletteV2';

export interface CompareSeriesInput {
    name: string;
    points: { date: Date; metric: number }[]; // ascending by date
}

interface ExerciseCompareChartProps {
    series: CompareSeriesInput[];
    methodName: string;
    /**
     * When set, drag-selecting on the x-axis reports the selected date range
     * instead of zooming the axis — the caller filters the data upstream, which is the zoom.
     */
    onRangeSelect?: (start: Date, end: Date) => void;
}

export default function ExerciseCompareChart({ series, methodName, onRangeSelect }: ExerciseCompareChartProps) {
    const { resolvedTheme } = useTheme();
    const themeKey = resolvedTheme === 'light' ? 'light' : 'dark';
    const v2 = V2_PALETTES[themeKey];
    const seriesColors = COMPARE_SERIES_COLORS[themeKey];

    const options: Options = {
        chart: {
            events: onRangeSelect
                ? {
                      selection(event) {
                          const sel = event.xAxis?.[0];
                          if (!sel) return true;
                          onRangeSelect(new Date(sel.min), new Date(sel.max));
                          return false;
                      },
                  }
                : undefined,
            zooming: {
                type: 'x',
                resetButton: {
                    position: { align: 'right', verticalAlign: 'top', x: -8, y: -4 },
                    theme: {
                        fill: v2.bg,
                        stroke: v2.border,
                        r: 0,
                        style: {
                            color: v2.muted,
                            fontFamily: fonts.mono,
                            fontSize: '11px',
                        },
                        states: {
                            hover: { fill: v2.maint, style: { color: v2.bg } },
                        },
                    },
                },
            },
            backgroundColor: v2.bg,
            type: 'column',
            spacing: [16, 0, 0, 0],
            style: { fontFamily: fonts.body },
            height: 340,
        },
        // Session dates are UTC-day-keyed; render axis ticks and tooltip dates in UTC
        // so they can't shift a day in non-UTC timezones (v12 default, kept explicit).
        time: { timezone: 'UTC' },
        title: { text: '' },
        credits: { enabled: false },
        legend: { enabled: false },
        xAxis: {
            type: 'datetime',
            crosshair: { color: v2.border, width: 1 },
            labels: {
                style: { color: v2.muted2, fontFamily: fonts.mono, fontSize: '10px' },
            },
            tickLength: 0,
            lineColor: v2.border,
        },
        yAxis: {
            title: { text: undefined },
            labels: {
                style: { color: v2.muted2, fontFamily: fonts.mono, fontSize: '10px' },
            },
            gridLineColor: v2.border,
            gridLineDashStyle: 'Dash',
        },
        tooltip: {
            backgroundColor: v2.bg,
            borderColor: v2.border,
            borderRadius: 0,
            shadow: false,
            useHTML: true,
            xDateFormat: "%b %d '%y",
            headerFormat: `<div style="font-family:${fonts.mono};font-size:10px;color:${v2.muted2};letter-spacing:.08em;text-transform:uppercase">{point.key}</div>`,
            pointFormat:
                `<div style="font-family:${fonts.mono};font-size:13px;color:${v2.fg};margin-top:4px"><b style="color:{point.color};font-weight:500">{point.y:,.0f}</b> ${methodName}</div>` +
                `<div style="font-family:${fonts.mono};font-size:10px;color:${v2.muted};margin-top:2px;letter-spacing:.08em;text-transform:uppercase">{series.name}</div>`,
            style: { color: v2.fg },
        },
        plotOptions: {
            column: {
                borderWidth: 0,
                borderRadius: 0,
                pointPadding: 0.05,
                groupPadding: 0.05,
            },
        },
        series: series.map((s, i) => ({
            type: 'column' as const,
            name: s.name,
            color: seriesColors[i % seriesColors.length],
            data: s.points.map((p) => [p.date.getTime(), p.metric]),
        })),
    };

    return <HighchartsReact highcharts={Highcharts} options={options} />;
}
