'use client';

import DetailCardV2, { type DetailCardRow } from '@/components/ui/v2/detailCardV2';
import type { MuscleGroup } from '@/lib/contexts';
import type { ExerciseUsageStats } from '@/lib/hooks/useExercisesLibraryState';
import { formatVolume } from '@/lib/statsUtils';
import type { ExerciseMetadata } from '@/types';

interface ExerciseCellV2Props {
    exercise: ExerciseMetadata;
    muscleGroup: MuscleGroup | undefined;
    stats: ExerciseUsageStats | undefined;
}

export default function ExerciseCellV2({ exercise, muscleGroup, stats }: ExerciseCellV2Props) {
    const rows: DetailCardRow[] = stats
        ? [
              { key: 'sessions', label: 'Sessions', value: stats.sessionCount },
              { key: 'sets', label: 'Sets', value: stats.setCount },
              { key: 'pr', label: 'PR', value: Math.round(stats.maxWeight).toLocaleString(), emphasize: true },
              { key: 'volume', label: 'Volume', value: formatVolume(stats.volume) },
          ]
        : [];

    return (
        <DetailCardV2
            titleHref={`/exercises/${exercise.id}`}
            title={exercise.name}
            tags={
                <>
                    <span className="chip outline" style={muscleGroup ? { color: muscleGroup.color, borderColor: muscleGroup.color } : undefined}>
                        {muscleGroup?.name ?? exercise.primaryMuscleGroup}
                    </span>
                    {exercise.category && <span className="chip">{exercise.category}</span>}
                    {exercise.equipment?.map((eq) => (
                        <span key={eq} className="chip">
                            {eq}
                        </span>
                    ))}
                </>
            }
            rows={rows}
            footer={
                exercise.videoUrl ? (
                    <a className="detail-link" href={exercise.videoUrl} target="_blank" rel="noopener noreferrer">
                        Video ↗
                    </a>
                ) : (
                    <span className="detail-link none">no video</span>
                )
            }
        />
    );
}
