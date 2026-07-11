'use client';

import { RefreshCw } from 'lucide-react';
import { useWorkoutData } from '@/lib/contexts';

export default function RefreshButtonV2() {
    const { refresh, refreshing } = useWorkoutData();

    return (
        <button
            type="button"
            className="icon-btn sm"
            onClick={() => refresh()}
            disabled={refreshing}
            aria-label="Refresh data"
            title="Refresh data"
        >
            <RefreshCw size={15} className={refreshing ? 'spin' : undefined} />
        </button>
    );
}
