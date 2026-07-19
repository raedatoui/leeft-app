'use client';

import Link from 'next/link';
import type { FC } from 'react';
import type { TopExerciseRow } from '@/components/analysis/v2/monthCellV2';

interface TopExercisesPanelProps {
    rows: TopExerciseRow[];
    muscleGroupColor: (id: string | undefined) => string | undefined;
    /** Rows whose muscle group doesn't match dim while a mix filter is active. */
    activeMuscleGroupId: string | null;
}

export const TopExercisesPanel: FC<TopExercisesPanelProps> = ({ rows, muscleGroupColor, activeMuscleGroupId }) => {
    if (rows.length === 0) {
        return <div className="chart-empty">No lifting in this period</div>;
    }

    return (
        <div className="top-ex-list" style={{ borderTop: 0, paddingTop: 0 }}>
            {rows.map((ex) => (
                <div
                    key={ex.id}
                    className="top-ex-row"
                    style={activeMuscleGroupId && ex.muscleGroup !== activeMuscleGroupId ? { opacity: 0.35 } : undefined}
                >
                    <span className="mg-pip" style={{ background: muscleGroupColor(ex.muscleGroup) ?? 'var(--muted-2)' }} />
                    <Link href={`/exercises/${ex.id}`} className="nm" style={{ textDecoration: 'none', color: 'inherit' }}>
                        {ex.name}
                    </Link>
                    <span className="freq">
                        {ex.sets} sets · {ex.workouts}×
                    </span>
                </div>
            ))}
        </div>
    );
};
