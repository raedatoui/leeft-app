import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn, formatExerciseSets } from '@/lib/utils';
import type { ExerciseMetadata, SetDetail, Workout } from '@/types';

interface WorkoutTableProps {
    workout: Workout;
    exerciseMap: Map<string, ExerciseMetadata>;
    selectedExercise?: ExerciseMetadata;
    showFullWorkout?: boolean;
    onToggleFullWorkout?: () => void;
    miniMode: boolean;
    maxHeight?: string;
    cycleId?: string;
}

const formatExerciseName = (name: string) => {
    const words = name.split(' ');

    // If less than 4 words, return as is
    if (words.length < 4) return name;

    // If exactly 4 words, split into 2 and 2
    if (words.length === 4) {
        const firstLine = words.slice(0, 2).join(' ');
        const secondLine = words.slice(2).join(' ');
        return (
            <>
                {firstLine}
                <br />
                {secondLine}
            </>
        );
    }

    // If 5 or more words, put first 3 on first line, rest on second
    const firstLine = words.slice(0, 3).join(' ');
    const secondLine = words.slice(3).join(' ');
    return (
        <>
            {firstLine}
            <br />
            {secondLine}
        </>
    );
};

const findMaxWeightSet = (sets: SetDetail[]) => {
    return Math.max(...sets.map((set) => set.weight || 0));
};

const WorkoutTable: React.FC<WorkoutTableProps> = ({
    workout,
    exerciseMap,
    selectedExercise,
    showFullWorkout = !selectedExercise,
    onToggleFullWorkout,
    miniMode,
    maxHeight = '700px',
    cycleId,
}) => {
    const [isMobile, setIsMobile] = React.useState(false);

    // Detect mobile screen size
    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // In focused mode, find the selected exercise
    const focusedExercise = selectedExercise ? workout.exercises.find((e) => e.exerciseId === selectedExercise.id) : null;

    // If we're in focused mode but can't find the exercise, show nothing
    if (selectedExercise && !focusedExercise) {
        return null;
    }

    // Determine which exercises to show
    const exercisesToShow = showFullWorkout ? workout.exercises : focusedExercise ? [focusedExercise] : workout.exercises;

    // On mobile, don't apply maxHeight - let it grow organically
    const cardStyle = isMobile ? {} : { maxHeight };

    return (
        <Card className="font-mono w-full h-full flex flex-col" style={cardStyle}>
            {/* Fixed Header */}
            <CardHeader className="p-3 space-y-2">
                <h2 className="text-lg font-semibold text-center">
                    {new Date(workout.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        timeZone: 'UTC',
                    })}
                </h2>

                <div className="flex gap-2 text-sm text-muted-foreground justify-center">
                    <span>Vol: {Math.round(workout.volume).toLocaleString()} |</span>
                    <span>Dur: {workout.duration}m |</span>
                    {workout.rpe && <span>RPE: {workout.rpe}</span>}
                </div>
            </CardHeader>

            {/* Scrollable Content */}
            <CardContent className="overflow-y-auto flex-1 p-0">
                <div className="divide-y">
                    {/* Expand Button (only show in focused mode) */}
                    {selectedExercise && !showFullWorkout && (
                        <Button onClick={onToggleFullWorkout} variant="ghost" className="w-full flex items-center justify-center gap-2">
                            <span>View Full Workout</span>
                            <ChevronDown className="h-5 w-5" />
                        </Button>
                    )}

                    {exercisesToShow.map((exercise) => {
                        const metadata = exerciseMap.get(exercise.exerciseId.toString());
                        const isFocused = selectedExercise?.id === exercise.exerciseId;

                        return (
                            <div key={exercise.order} className={cn('p-3', isFocused && 'bg-primary/10')}>
                                {/* Exercise Name */}
                                <div className={cn('flex items-start justify-between gap-2', miniMode ? 'flex-col' : 'flex-row mb-2 pb-2 border-b')}>
                                    <Link
                                        href={`/exercise/${exercise.exerciseId}${cycleId ? `?cycleId=${cycleId}` : ''}`}
                                        className={cn(
                                            'text-left min-w-[120px] text-md font-semibold hover:text-primary/60 leading-tight',
                                            isFocused ? 'text-primary' : 'text-primary/80'
                                        )}
                                    >
                                        {formatExerciseName(metadata?.name ?? `Exercise ${exercise.exerciseId}`)}
                                    </Link>
                                    {miniMode && <div className="text-sm text-muted-foreground">{formatExerciseSets(exercise)}</div>}
                                    {!miniMode && metadata?.primaryMuscleGroup && (
                                        <Badge variant={isFocused ? 'default' : 'secondary'} className="shrink-0">
                                            {metadata.primaryMuscleGroup}
                                        </Badge>
                                    )}
                                    {!miniMode && <div className="text-sm text-muted-foreground">{exercise.volume.toLocaleString()}</div>}
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
                                                {exercise.sets.map((set, index) => {
                                                    const maxWeight = findMaxWeightSet(exercise.sets);
                                                    return (
                                                        <tr
                                                            key={set.order}
                                                            className={cn(
                                                                'border-b py-0.5',
                                                                set.weight === maxWeight
                                                                    ? cn('font-bold', isFocused ? 'text-primary' : 'text-primary/80')
                                                                    : 'text-foreground/80'
                                                            )}
                                                        >
                                                            <td className="w-1/3 py-0.5 text-center">{`#${index + 1}`}</td>
                                                            <td className="w-1/3 py-0.5 text-center">{set.reps}</td>
                                                            <td className="w-1/3 py-0.5 text-center">{Math.round(set.weight)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};

export default WorkoutTable;
