import { Copy, Plus, Trash2 } from 'lucide-react';
import type { FC } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Exercise, ExerciseMetadata } from '@/types';
import type { EditedExercise, NewExercise } from './types';
import { generateAddExerciseCommand, generateCombinedCommand } from './utils';

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

interface NewExerciseRowProps {
    newExercise: NewExercise;
    exerciseMap: Map<string, ExerciseMetadata>;
    workoutTitle: string;
    copiedCommand: string | null;
    onUpdateExerciseId: (tempId: string, exerciseId: number) => void;
    onAddSet: (tempId: string) => void;
    onUpdateSet: (tempId: string, setIndex: number, field: 'reps' | 'weight', value: string) => void;
    onRemove: (tempId: string) => void;
    onCopyCommand: (command: string) => void;
}

export const NewExerciseRow: FC<NewExerciseRowProps> = ({
    newExercise,
    exerciseMap,
    workoutTitle,
    copiedCommand,
    onUpdateExerciseId,
    onAddSet,
    onUpdateSet,
    onRemove,
    onCopyCommand,
}) => {
    const command =
        newExercise.exerciseId && newExercise.sets.length > 0
            ? generateAddExerciseCommand(workoutTitle, newExercise.exerciseId, newExercise.sets)
            : null;

    return (
        <div className="p-3 bg-green-50 dark:bg-green-950/20">
            {/* Exercise Selector */}
            <div className="flex items-start justify-between gap-2 flex-row mb-2 pb-2 border-b">
                <Select
                    value={newExercise.exerciseId?.toString() ?? ''}
                    onValueChange={(val) => onUpdateExerciseId(newExercise.tempId, Number.parseInt(val, 10))}
                >
                    <SelectTrigger className="w-[200px] h-8 text-sm">
                        <SelectValue placeholder="Select exercise..." />
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
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onRemove(newExercise.tempId)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            {/* Sets Table (only show if exercise is selected) */}
            {newExercise.exerciseId && (
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
                            {newExercise.sets.map((set, index) => (
                                <tr key={`${newExercise.exerciseId}-${index}`} className="border-b py-0.5 font-bold text-primary">
                                    <td className="w-1/3 py-0.5 text-center">{`#${index + 1}`}</td>
                                    <td className="w-1/3 py-0.5 text-center">
                                        <Input
                                            type="number"
                                            value={set.reps ?? ''}
                                            onChange={(e) => onUpdateSet(newExercise.tempId, index, 'reps', e.target.value)}
                                            className="h-6 w-16 text-center mx-auto p-1"
                                        />
                                    </td>
                                    <td className="w-1/3 py-0.5 text-center">
                                        <Input
                                            type="number"
                                            value={set.weight ?? 0}
                                            onChange={(e) => onUpdateSet(newExercise.tempId, index, 'weight', e.target.value)}
                                            className="h-6 w-16 text-center mx-auto p-1"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Add Set Button */}
                    <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => onAddSet(newExercise.tempId)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Set
                    </Button>

                    {/* Command display */}
                    {command && (
                        <div className="mt-3 space-y-2">
                            <div className="p-2 bg-muted rounded text-xs">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-muted-foreground">Command:</span>
                                    <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => onCopyCommand(command)}>
                                        <Copy className="h-3 w-3 mr-1" />
                                        {copiedCommand === command ? 'Copied!' : 'Copy'}
                                    </Button>
                                </div>
                                <code className="block break-all text-[10px] leading-tight">{command}</code>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

interface AddExerciseButtonProps {
    onAdd: () => void;
}

export const AddExerciseButton: FC<AddExerciseButtonProps> = ({ onAdd }) => {
    return (
        <div className="p-3 border-t">
            <Button variant="outline" size="sm" className="w-full" onClick={onAdd}>
                <Plus className="h-4 w-4 mr-1" />
                Add Exercise
            </Button>
        </div>
    );
};
