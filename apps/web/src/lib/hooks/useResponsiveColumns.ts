'use client';

import { useEffect, useState } from 'react';

/** Cards-per-page for the 4-wide card sliders (log daily view, cardio sessions).
 *  Tracks window width so a page always fills one grid row: 4 → 3 (<1280) → 2 (<1024) → 1 (<640). */
export function useResponsiveColumns(): number {
    const [columns, setColumns] = useState(4);

    useEffect(() => {
        const updateColumns = () => {
            const width = window.innerWidth;
            let newColumns = 4;
            if (width < 640) {
                newColumns = 1;
            } else if (width < 1024) {
                newColumns = 2;
            } else if (width < 1280) {
                newColumns = 3;
            }
            setColumns(newColumns);
        };
        updateColumns();
        window.addEventListener('resize', updateColumns);
        return () => window.removeEventListener('resize', updateColumns);
    }, []);

    return columns;
}
