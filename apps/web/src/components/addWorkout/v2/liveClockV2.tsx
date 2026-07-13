'use client';

import { useEffect, useState } from 'react';
import { fmtClock } from '@/lib/addWorkoutFormat';

interface LiveClockV2Props {
    startedAt: number;
}

// Isolated so the once-a-second tick only re-renders this leaf, not the whole live view.
export default function LiveClockV2({ startedAt }: LiveClockV2Props) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="clock">
            <span className="rec" />
            <span>{fmtClock(now - startedAt)}</span>
        </div>
    );
}
