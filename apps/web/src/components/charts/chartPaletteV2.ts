// Highcharts renders to inline SVG/style attributes rather than the page's CSS cascade,
// so these can't just reference the v2 CSS custom properties — pick the palette per resolvedTheme.
export const V2_PALETTES = {
    dark: {
        bg: '#0b0a08',
        fg: '#ecebe2',
        muted: '#807a6c',
        muted2: '#5a5448',
        border: '#2a2722',
        maint: '#ffa000',
        maintRgb: '255, 160, 0',
        strength: '#19e68c',
        cardio: '#00d4ff',
        cardioRgb: '0, 212, 255',
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
        cardio: '#047389',
        cardioRgb: '4, 115, 137',
    },
} as const;

export const fonts = {
    body: '"DM Sans", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
};

// Hex twins of the compare pages' positional series tokens
// (--maint / --strength / --cardio / --hyper, incl. their light-mode overrides).
export const COMPARE_SERIES_COLORS = {
    dark: ['#ffa000', '#19e68c', '#00d4ff', '#ff3b30'],
    light: ['#945e00', '#067947', '#047389', '#d01a11'],
} as const;
