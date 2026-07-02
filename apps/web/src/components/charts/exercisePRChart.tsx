'use client';

import Highcharts, { type Options, type Point, type SVGPathArray } from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useTheme } from 'next-themes';

// Highcharts renders to inline SVG/style attributes rather than the page's CSS cascade,
// so these can't just reference the v2 CSS custom properties — pick the palette per resolvedTheme.
const V2_PALETTES = {
    dark: {
        bg: '#0b0a08',
        fg: '#ecebe2',
        muted: '#807a6c',
        muted2: '#5a5448',
        border: '#2a2722',
        maint: '#ffa000',
        maintRgb: '255, 160, 0',
        strength: '#19e68c',
    },
    light: {
        bg: '#ecebe2',
        fg: '#0b0a08',
        muted: '#6b6454',
        muted2: '#9a927d',
        border: '#cfc9b7',
        maint: '#945e00',
        maintRgb: '148, 94, 0',
        strength: '#067947',
    },
} as const;

// Custom 5-point star with tight inner radius for sharp, dramatic points.
// Registered once at module load; Highcharts looks it up by symbol name.
const PR_STAR = 'prstar';
type SymbolFn = (x: number, y: number, w: number, h: number) => SVGPathArray;
const symbols = Highcharts.SVGRenderer.prototype.symbols as Record<string, SymbolFn>;
if (!symbols[PR_STAR]) {
    symbols[PR_STAR] = (x, y, w, h) => {
        const cx = x + w / 2;
        const cy = y + h / 2;
        const outer = Math.min(w, h) / 2;
        const inner = outer * 0.4;
        const path: SVGPathArray = [];
        for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? outer : inner;
            const angle = (Math.PI / 5) * i - Math.PI / 2;
            const px = cx + r * Math.cos(angle);
            const py = cy + r * Math.sin(angle);
            path.push(i === 0 ? ['M', px, py] : ['L', px, py]);
        }
        path.push(['Z']);
        return path;
    };
}

const fonts = {
    body: '"DM Sans", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatTickLabel = (d: Date): string =>
    `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, '0')} '${String(d.getUTCFullYear()).slice(-2)}`;

export type PrTier = 'allTime' | 'active' | 'beaten';

export interface ChartSession {
    date: Date;
    metric: number;
    prTier?: PrTier;
}

interface ExercisePRChartProps {
    sessions: ChartSession[];
    methodName: string;
    onHover: (index: number) => void;
}

export default function ExercisePRChart({ sessions, methodName, onHover }: ExercisePRChartProps) {
    const { resolvedTheme } = useTheme();
    const v2 = V2_PALETTES[resolvedTheme === 'light' ? 'light' : 'dark'];
    const TIER_COLOR: Record<PrTier, string> = {
        allTime: v2.maint, // gold — heaviest set ever, any rep count
        active: v2.strength, // green — current record for this rep count
        beaten: v2.muted, // gray — was a record, since surpassed
    };

    const options: Options = {
        chart: {
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
            type: 'area',
            spacing: [16, 0, 0, 0],
            style: { fontFamily: fonts.body },
            height: 280,
        },
        title: { text: '' },
        credits: { enabled: false },
        legend: { enabled: false },
        xAxis: {
            type: 'category',
            categories: sessions.map((s) => formatTickLabel(s.date)),
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
            headerFormat: `<div style="font-family:${fonts.mono};font-size:10px;color:${v2.muted2};letter-spacing:.08em;text-transform:uppercase">{point.key}</div>`,
            pointFormat: `<div style="font-family:${fonts.mono};font-size:13px;color:${v2.fg};margin-top:4px"><b style="color:${v2.maint};font-weight:500">{point.y:,.0f}</b> ${methodName}</div>`,
            style: { color: v2.fg },
        },
        plotOptions: {
            area: {
                fillColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        [0, `rgba(${v2.maintRgb}, 0.28)`],
                        [1, `rgba(${v2.maintRgb}, 0.02)`],
                    ],
                },
                lineColor: v2.maint,
                lineWidth: 1.5,
                marker: { radius: 3, fillColor: v2.maint, lineWidth: 0, symbol: 'circle' },
                states: { hover: { lineWidth: 1.5, halo: { size: 8, opacity: 0.2 } } },
                threshold: null,
            },
            series: {
                point: {
                    events: {
                        mouseOver(this: Point) {
                            onHover(this.index);
                        },
                    },
                },
            },
        },
        series: [
            {
                type: 'area',
                name: methodName,
                data: sessions.map((s) => ({
                    y: s.metric,
                    marker: s.prTier
                        ? {
                              enabled: true,
                              symbol: PR_STAR,
                              radius: 11,
                              fillColor: TIER_COLOR[s.prTier],
                              lineColor: v2.bg,
                              lineWidth: 1.5,
                              states: { hover: { radius: 13, lineWidthPlus: 0 } },
                          }
                        : undefined,
                })),
            },
        ],
    };

    return <HighchartsReact highcharts={Highcharts} options={options} />;
}
