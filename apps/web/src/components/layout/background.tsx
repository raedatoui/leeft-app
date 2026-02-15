'use client';

import { useEffect, useState } from 'react';

export default function Background() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="fixed inset-0 -z-50 bg-background overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-grid-pattern" />
        </div>
    );
}
