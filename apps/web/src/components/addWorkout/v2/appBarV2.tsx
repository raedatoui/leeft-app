'use client';

import Link from 'next/link';
import LiveClockV2 from '@/components/addWorkout/v2/liveClockV2';
import type { AddWorkoutPhase } from '@/lib/hooks/useAddWorkoutState';

interface AppBarV2Props {
    phase: AddWorkoutPhase;
    startedAt: number | null;
    date: string;
    onDateChange: (val: string) => void;
}

export default function AppBarV2({ phase, startedAt, date, onDateChange }: AppBarV2Props) {
    return (
        <header className="app-bar">
            {/* the way back into the rest of the app — /add has no HeaderV2 nav or dock */}
            <Link href="/" className="app-brand" aria-label="Back to Leeft">
                🏋️ <b>LEEFT</b>
            </Link>
            {phase === 'live' && startedAt !== null && <LiveClockV2 startedAt={startedAt} />}
            <input type="date" className="app-bar-date" value={date} onChange={(e) => onDateChange(e.target.value)} aria-label="Session date" />
        </header>
    );
}
