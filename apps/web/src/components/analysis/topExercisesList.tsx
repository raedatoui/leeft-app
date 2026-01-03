'use client';

import Link from 'next/link';
import type { ExerciseMap } from '@/types';

interface TopExercise {
    id: number;
    count: number;
    maxWeight: string;
}

interface TopExercisesListProps {
    exercises: TopExercise[];
    exerciseMap: ExerciseMap;
    limit?: number;
}

export const TopExercisesList = ({ exercises, exerciseMap, limit = 5 }: TopExercisesListProps) => {
    return (
        <div className="flex-1">
            <div className="text-xs font-semibold mb-2 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                <span>Top exercises</span>
                <div className="flex-1 h-px bg-zinc-800" />
            </div>

            <ul className="space-y-2">
                {exercises.slice(0, limit).map((ex) => (
                    <li key={ex.id.toString()} className="flex items-start gap-2 text-sm">
                        <span className="text-muted-foreground mt-0.5">→</span>

                        <div className="flex-1 min-w-0">
                            <Link href={`/exercises/${ex.id}`} className="font-semibold hover:text-primary transition-colors truncate block">
                                {exerciseMap.get(ex.id.toString())?.name || 'Unknown'}
                            </Link>

                            <div className="text-xs text-muted-foreground">
                                {ex.count} times • max {ex.maxWeight}
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};
