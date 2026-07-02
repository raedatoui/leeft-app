// Shared chart theme colors and fonts
export const chartColors = {
    primary: 'rgb(255, 176, 38)',
    primaryDark: 'rgb(204, 141, 30)',
} as const;

// Highcharts renders to inline SVG/style attributes rather than the page's CSS cascade,
// so these can't just reference the v2 CSS custom properties — pick the palette per resolvedTheme.
const CHART_PALETTES = {
    dark: {
        lifting: '#ffa000',
        liftingRgb: '255, 160, 0',
        cardio: '#00d4ff',
        cardioRgb: '0, 212, 255',
        background: 'hsl(240, 10%, 3.9%)',
        foreground: 'rgb(249, 249, 249)',
        mutedForeground: 'rgb(161, 161, 170)',
        border: 'rgb(39, 39, 42)',
    },
    light: {
        lifting: '#945e00',
        liftingRgb: '148, 94, 0',
        cardio: '#047389',
        cardioRgb: '4, 115, 137',
        background: 'rgb(247, 246, 241)',
        foreground: 'rgb(11, 10, 8)',
        mutedForeground: 'rgb(107, 100, 84)',
        border: 'rgb(207, 201, 183)',
    },
} as const;

export type ChartMode = keyof typeof CHART_PALETTES;

export function getChartPalette(mode: ChartMode) {
    return CHART_PALETTES[mode];
}

export const chartFonts = {
    sans: 'var(--font-geist-sans)',
    mono: 'var(--font-geist-mono)',
} as const;
