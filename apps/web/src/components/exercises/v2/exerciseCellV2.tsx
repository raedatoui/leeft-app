'use client';

import Link from 'next/link';
import type { MuscleGroup } from '@/lib/contexts';
import type { ExerciseMetadata } from '@/types';

interface ExerciseCellV2Props {
    exercise: ExerciseMetadata;
    indexLabel: string;
    muscleGroup: MuscleGroup | undefined;
}

export default function ExerciseCellV2({ exercise, indexLabel, muscleGroup }: ExerciseCellV2Props) {
    return (
        <Link href={`/exercises/${exercise.id}`} className="exercise-cell">
            <div className="top">
                <h3>{exercise.name}</h3>
                <span className="index">{indexLabel}</span>
            </div>
            <div className="tags">
                <span className="chip outline" style={muscleGroup ? { color: muscleGroup.color, borderColor: muscleGroup.color } : undefined}>
                    {muscleGroup?.name ?? exercise.primaryMuscleGroup}
                </span>
                {exercise.category && <span className="chip">{exercise.category}</span>}
                {exercise.equipment?.map((eq) => (
                    <span key={eq} className="chip">
                        {eq}
                    </span>
                ))}
            </div>
        </Link>
    );
}
