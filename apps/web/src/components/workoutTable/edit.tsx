import { Copy } from 'lucide-react';
import type { FC } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Exercise, ExerciseMetadata } from '@/types';
import type { EditedExercise } from './types';
import { generateCombinedCommand } from './utils';

interface ExerciseEditRowProps {
    exercise: Exercise;
    editedExercise: EditedExercise;
    exerciseMap: Map<string, ExerciseMetadata>;
    workoutTitle: string;
    isFocused: boolean;
    includeWarmup: boolean;
    copiedCommand: string | null;
    onUpdateSet: (exerciseId: number, setIndex: number, field: 'reps' | 'weight', value: string) => void;
    onUpdateExerciseId: (originalId: number, newId: number) => void;
    onCopyCommand: (command: string) => void;
}

export const ExerciseEditRow: FC<ExerciseEditRowProps> = ({
    exercise,
    editedExercise,
    exerciseMap,
    workoutTitle,
    isFocused,
    includeWarmup,
    copiedCommand,
    onUpdateSet,
    onUpdateExerciseId,
    onCopyCommand,
}) => {
    const displayExerciseId = editedExercise.newExerciseId ?? exercise.exerciseId;

    const command = generateCombinedCommand(workoutTitle, exercise, editedExercise);

    return (
        <div className={cn('p-3', isFocused && 'bg-primary/10')}>
            {/* Exercise Selector */}
            <div className="flex items-start justify-between gap-2 flex-row mb-2 pb-2 border-b">
                <Select
                    value={displayExerciseId.toString()}
                    onValueChange={(val) => onUpdateExerciseId(exercise.exerciseId, Number.parseInt(val, 10))}
                >
                    <SelectTrigger className="w-[200px] h-8 text-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                        {Array.from(exerciseMap.values())
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((ex) => (
                                <SelectItem key={ex.id} value={ex.id.toString()}>
                                    {ex.name}
                                </SelectItem>
                            ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Editable Sets Table */}
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
                            .map((set, index) => {
                                const originalIndex = exercise.sets.indexOf(set);
                                const editedSet = editedExercise.sets[originalIndex];
                                return (
                                    <tr
                                        key={set.order}
                                        className={cn(
                                            'border-b py-0.5',
                                            set.isWorkSet ? cn('font-bold', isFocused ? 'text-primary' : 'text-primary/80') : 'text-foreground/80'
                                        )}
                                    >
                                        <td className="w-1/3 py-0.5 text-center">{`#${index + 1}`}</td>
                                        <td className="w-1/3 py-0.5 text-center">
                                            <Input
                                                type="number"
                                                value={editedSet?.reps ?? ''}
                                                onChange={(e) => onUpdateSet(exercise.exerciseId, originalIndex, 'reps', e.target.value)}
                                                className="h-6 w-16 text-center mx-auto p-1"
                                            />
                                        </td>
                                        <td className="w-1/3 py-0.5 text-center">
                                            <Input
                                                type="number"
                                                value={editedSet?.weight ?? 0}
                                                onChange={(e) => onUpdateSet(exercise.exerciseId, originalIndex, 'weight', e.target.value)}
                                                className="h-6 w-16 text-center mx-auto p-1"
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                    </tbody>
                </table>

                {/* Command display */}
                <div className="mt-3 space-y-2">
                    {command.split('\n').map((cmdLine, idx) => (
                        <div key={cmdLine} className="p-2 bg-muted rounded text-xs">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-muted-foreground">Command {command.split('\n').length > 1 ? idx + 1 : ''}:</span>
                                <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => onCopyCommand(cmdLine)}>
                                    <Copy className="h-3 w-3 mr-1" />
                                    {copiedCommand === cmdLine ? 'Copied!' : 'Copy'}
                                </Button>
                            </div>
                            <code className="block break-all text-[10px] leading-tight">{cmdLine}</code>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
