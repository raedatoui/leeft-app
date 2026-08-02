'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import LiveClockV2 from '@/components/addWorkout/v2/liveClockV2';
import type { AddWorkoutPhase } from '@/lib/hooks/useAddWorkoutState';

interface AppBarV2Props {
    phase: AddWorkoutPhase;
    startedAt: number | null;
    date: string;
    onDateChange: (val: string) => void;
    onCancelSession: () => void;
}

export default function AppBarV2({ phase, startedAt, date, onDateChange, onCancelSession }: AppBarV2Props) {
    return (
        <header className="app-bar">
            {/* the way back into the rest of the app — /add has no HeaderV2 nav or dock */}
            <Link href="/" className="app-brand" aria-label="Back to Leeft">
                🏋️ <b>LEEFT</b>
            </Link>
            {phase === 'live' && startedAt !== null && <LiveClockV2 startedAt={startedAt} />}
            {/* grouped so the bar keeps its three space-between slots whether or not ✕ is shown */}
            <div className="app-bar-right">
                <input type="date" className="app-bar-date" value={date} onChange={(e) => onDateChange(e.target.value)} aria-label="Session date" />
                {/* nothing to discard before a session starts */}
                {phase !== 'pre' && (
                    <button type="button" className="app-bar-cancel" onClick={onCancelSession} aria-label="Discard workout">
                        <X size={15} />
                    </button>
                )}
            </div>
        </header>
    );
}
