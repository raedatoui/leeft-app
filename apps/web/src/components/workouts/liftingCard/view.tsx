import Link from 'next/link';
import type { FC } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn, formatExerciseSets } from '@/lib/utils';
import type { Exercise, ExerciseMetadata } from '@/types';
import { formatExerciseName } from './utils';

interface ExerciseViewRowProps {
    exercise: Exercise;
    metadata: ExerciseMetadata | undefined;
    isFocused: boolean;
    miniMode: boolean;
    includeWarmup: boolean;
    cycleId?: string;
    onExerciseClick?: (id: string) => void;
}

export const ExerciseViewRow: FC<ExerciseViewRowProps> = ({ exercise, metadata, isFocused, miniMode, includeWarmup, cycleId, onExerciseClick }) => {
    return (
        <div className={cn('p-3', isFocused && 'bg-primary/10')}>
            {/* Exercise Name */}
            <div className={cn('flex items-start justify-between gap-2', miniMode ? 'flex-col' : 'flex-row mb-2 pb-2 border-b')}>
                {onExerciseClick ? (
                    <button
                        type="button"
                        className={cn(
                            'text-left min-w-[120px] text-md font-semibold hover:underline hover:text-primary/60 leading-tight transition-colors',
                            isFocused ? 'text-primary' : 'text-primary/80'
                        )}
                        onClick={() => onExerciseClick(exercise.exerciseId.toString())}
                    >
                        {formatExerciseName(metadata?.name ?? `Exercise ${exercise.exerciseId}`)}
                    </button>
                ) : (
                    <Link
                        href={`/exercises/${exercise.exerciseId}${cycleId ? `?cycleId=${cycleId}` : ''}`}
                        className={cn(
                            'text-left min-w-[120px] text-md font-semibold hover:underline hover:text-primary/60 leading-tight transition-colors',
                            isFocused ? 'text-primary' : 'text-primary/80'
                        )}
                    >
                        {formatExerciseName(metadata?.name ?? `Exercise ${exercise.exerciseId}`)}
                    </Link>
                )}
                {miniMode && <div className="text-sm text-muted-foreground">{formatExerciseSets(exercise, includeWarmup)}</div>}
                {!miniMode && metadata?.primaryMuscleGroup && (
                    <Badge variant={isFocused ? 'default' : 'secondary'} className="shrink-0">
                        {metadata.primaryMuscleGroup}
                    </Badge>
                )}
                {!miniMode && (
                    <div className="text-sm text-muted-foreground">{(includeWarmup ? exercise.volume : exercise.workVolume).toLocaleString()}</div>
                )}
            </div>

            {/* Sets Table */}
            {!miniMode && (
                <div className="mx-2">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-muted-foreground">
                                <th className="w-1/3 text-center">set</th>
                                <th className="w-1/3 text-center">reps</th>
                                <th className="w-1/3 text-center">weight</th>
                            </tr>
                            <tr>
                                <th className="w-1/3 text-center">---</th>
                                <th className="w-1/3 text-center">----</th>
                                <th className="w-1/3 text-center">------</th>
                            </tr>
                        </thead>
                        <tbody>
                            {exercise.sets
                                .filter((set) => includeWarmup || set.isWorkSet)
                                .map((set, index) => (
                                    <tr
                                        key={set.order}
                                        className={cn(
                                            'border-b py-0.5',
                                            set.isWorkSet ? cn('font-bold', isFocused ? 'text-primary' : 'text-primary/80') : 'text-foreground/80'
                                        )}
                                    >
                                        <td className="w-1/3 py-0.5 text-center">{`#${index + 1}`}</td>
                                        <td className="w-1/3 py-0.5 text-center">{set.reps}</td>
                                        <td className="w-1/3 py-0.5 text-center">{Math.round(set.weight)}</td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
