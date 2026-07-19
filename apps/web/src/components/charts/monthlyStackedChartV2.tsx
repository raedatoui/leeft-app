'use client';

import Highcharts, { type Options } from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useTheme } from 'next-themes';
import { fonts, V2_PALETTES } from '@/components/charts/chartPaletteV2';

export interface MonthlySeries {
    name: string;
    color: string;
    /** 12 values, Jan–Dec. */
    data: number[];
}

interface MonthlyStackedChartProps {
    /** Stacking order bottom-up: first series sits at the bottom of each column. */
    series: MonthlySeries[];
    /** Tooltip value format (exact, with unit). */
    formatValue: (n: number) => string;
    /** Stack-total + y-axis format (short); defaults to formatValue. */
    formatStackLabel?: (n: number) => string;
    /** Series name currently filtered elsewhere (mix chart) — other series dim. */
    activeName?: string | null;
    /** Column click → jump the page to that month (0–11). */
    onMonthClick?: (month: number) => void;
    showLegend?: boolean;
    emptyLabel: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DESELECTED_OPACITY = 0.25;

export default function MonthlyStackedChartV2({
    series,
    formatValue,
    formatStackLabel,
    activeName,
    onMonthClick,
    showLegend = false,
    emptyLabel,
}: MonthlyStackedChartProps) {
    const { resolvedTheme } = useTheme();
    const pal = V2_PALETTES[resolvedTheme === 'light' ? 'light' : 'dark'];

    const hasData = series.some((s) => s.data.some((v) => v > 0));
    if (!hasData) {
        return <div className="chart-empty">{emptyLabel}</div>;
    }

    const fmtStack = formatStackLabel ?? formatValue;

    const options: Options = {
        chart: {
            type: 'column',
            backgroundColor: 'transparent',
            style: { fontFamily: fonts.body },
            height: 260,
            spacing: [16, 0, 8, 0],
        },
        title: { text: undefined },
        xAxis: {
            categories: MONTHS,
            labels: { style: { color: pal.muted, fontFamily: fonts.mono, fontSize: '10px' } },
            lineColor: pal.border,
            tickColor: pal.border,
        },
        yAxis: {
            min: 0,
            title: { text: undefined },
            gridLineColor: pal.border,
            // first series at the bottom (Highcharts defaults to reversed stacks)
            reversedStacks: false,
            labels: {
                style: { color: pal.muted, fontFamily: fonts.mono },
                formatter: function () {
                    return fmtStack(Number(this.value));
                },
            },
            stackLabels: {
                enabled: true,
                style: { color: pal.muted2, fontFamily: fonts.mono, fontSize: '9px', fontWeight: 'normal', textOutline: 'none' },
                formatter: function () {
                    return this.total && this.total > 0 ? fmtStack(this.total) : '';
                },
            },
        },
        legend: showLegend
            ? { itemStyle: { color: pal.muted, fontFamily: fonts.body }, itemHoverStyle: { color: pal.fg } }
            : { enabled: false },
        tooltip: {
            formatter: function () {
                // biome-ignore lint/suspicious/noExplicitAny: Highcharts tooltip context typing
                const ctx = this as any;
                const total = (ctx.point.stackTotal as number) || 0;
                return `<b>${MONTHS[ctx.point.index]} · ${ctx.series.name}</b><br/>${formatValue(ctx.y)}<br/>Total: ${formatValue(total)}`;
            },
            backgroundColor: pal.bg,
            borderColor: pal.border,
            style: { color: pal.fg },
        },
        plotOptions: {
            column: {
                stacking: 'normal',
                borderWidth: 0,
                dataLabels: { enabled: false },
                cursor: onMonthClick ? 'pointer' : undefined,
                events: onMonthClick
                    ? {
                          click: (event) => onMonthClick(event.point.index),
                      }
                    : undefined,
            },
        },
        series: series.map((s) => ({
            name: s.name,
            type: 'column' as const,
            color: s.color,
            opacity: activeName != null && activeName !== s.name ? DESELECTED_OPACITY : 1,
            data: s.data,
        })),
        credits: { enabled: false },
    };

    return <HighchartsReact highcharts={Highcharts} options={options} />;
}
