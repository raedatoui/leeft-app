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

    return null;
}
