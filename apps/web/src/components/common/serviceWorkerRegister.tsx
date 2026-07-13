'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
    useEffect(() => {
        if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
            // ?v= keys the SW cache per build (upload rewrites NEXT_PUBLIC_TIMESTAMP);
            // a changed URL registers a new SW, whose activation clears the old cache
            navigator.serviceWorker.register(`/sw.js?v=${process.env.NEXT_PUBLIC_TIMESTAMP ?? '0'}`);
        }
    }, []);

    // iOS home-screen apps resume without navigating, so a suspended app can run a
    // stale build indefinitely. On foreground, refetch the current page's HTML
    // (cache: 'no-cache' bypasses both the SW and stale HTTP cache) and reload if
    // the chunks it references no longer match the ones this build loaded.
    useEffect(() => {
        if (process.env.NODE_ENV !== 'production') return;
        let lastCheck = Date.now();
        const checkForNewBuild = async () => {
            if (document.visibilityState !== 'visible' || Date.now() - lastCheck < 60_000) return;
            lastCheck = Date.now();
            try {
                const res = await fetch(location.pathname, { cache: 'no-cache' });
                if (!res.ok) return;
                const html = await res.text();
                const scripts = Array.from(document.scripts)
                    .map((s) => s.getAttribute('src'))
                    .filter((src): src is string => !!src && src.includes('/_next/static/'));
                if (scripts.length > 0 && scripts.some((src) => !html.includes(src))) {
                    location.reload();
                }
            } catch {
                // offline; the next foreground will retry
            }
        };
        document.addEventListener('visibilitychange', checkForNewBuild);
        window.addEventListener('pageshow', checkForNewBuild);
        return () => {
            document.removeEventListener('visibilitychange', checkForNewBuild);
            window.removeEventListener('pageshow', checkForNewBuild);
        };
    }, []);

    return null;
}
