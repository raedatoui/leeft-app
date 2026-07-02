'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function ThemeToggleV2() {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    if (!mounted) {
        return <span className="icon-btn sm" aria-hidden="true" />;
    }

    const isLight = resolvedTheme === 'light';

    return (
        <button
            type="button"
            className="icon-btn sm"
            onClick={() => setTheme(isLight ? 'dark' : 'light')}
            aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
            title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
        >
            {isLight ? <Moon size={15} /> : <Sun size={15} />}
        </button>
    );
}
