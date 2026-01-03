// Shared chart theme colors and fonts
export const chartColors = {
    primary: 'rgb(255, 176, 38)',
    primaryDark: 'rgb(204, 141, 30)',
    background: 'hsl(240, 10%, 3.9%)', // matches card background
    foreground: 'rgb(249, 249, 249)',
    mutedForeground: 'rgb(161, 161, 170)',
    border: 'rgb(39, 39, 42)',
} as const;

export const chartFonts = {
    sans: 'var(--font-geist-sans)',
    mono: 'var(--font-geist-mono)',
} as const;
