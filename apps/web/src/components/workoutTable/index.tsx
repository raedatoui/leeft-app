import { ChevronDown, Pencil, X } from 'lucide-react';
import { type FC, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AddExerciseButton, ExerciseEditRow, NewExerciseRow } from './edit';
import type { EditedExercise, NewExercise, WorkoutTableProps } from './types';
import { initEditedExercise } from './utils';
import { ExerciseViewRow } from './view';

const WorkoutTable: FC<WorkoutTableProps> = ({
    workout,
    exerciseMap,
    selectedExercise,
    showFullWorkout = !selectedExercise,
    onToggleFullWorkout,
    miniMode,
    maxHeight = '700px',
    cycleId,
    onExerciseClick,
    muscleGroupFilter,
    includeWarmup = true,
}) => {
    const [isMobile, setIsMobile] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedExercises, setEditedExercises] = useState<Map<number, EditedExercise>>(new Map());
    const [newExercises, setNewExercises] = useState<NewExercise[]>([]);
    const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

    // Enter edit mode
    const enterEditMode = () => {
        const initial = new Map<number, EditedExercise>();
        for (const exercise of workout.exercises) {
            initial.set(exercise.exerciseId, initEditedExercise(exercise));
        }
        setEditedExercises(initial);
        setIsEditing(true);
    };

    // Exit edit mode
    const exitEditMode = () => {
        setIsEditing(false);
        setEditedExercises(new Map());
        setNewExercises([]);
        setCopiedCommand(null);
    };

    // Add a new exercise
    const addNewExercise = () => {
        const tempId = `new-${Date.now()}`;
        setNewExercises((prev) => [...prev, { tempId, exerciseId: null, sets: [] }]);
    };

    // Update exercise selection for a new exercise
    const updateNewExerciseId = (tempId: string, exerciseId: number) => {
        setNewExercises((prev) => prev.map((ex) => (ex.tempId === tempId ? { ...ex, exerciseId } : ex)));
    };

    // Add a set to a new exercise
    const addSetToNewExercise = (tempId: string) => {
        setNewExercises((prev) => prev.map((ex) => (ex.tempId === tempId ? { ...ex, sets: [...ex.sets, { reps: undefined, weight: 0 }] } : ex)));
    };

    // Update a set in a new exercise
    const updateNewExerciseSet = (tempId: string, setIndex: number, field: 'reps' | 'weight', value: string) => {
        setNewExercises((prev) =>
            prev.map((ex) => {
                if (ex.tempId !== tempId) return ex;
                const newSets = [...ex.sets];
                if (field === 'reps') {
                    newSets[setIndex] = { ...newSets[setIndex], reps: value === '' ? undefined : Number.parseInt(value, 10) };
                } else {
                    newSets[setIndex] = { ...newSets[setIndex], weight: Number.parseFloat(value) || 0 };
                }
                return { ...ex, sets: newSets };
            })
        );
    };

    // Remove a new exercise
    const removeNewExercise = (tempId: string) => {
        setNewExercises((prev) => prev.filter((ex) => ex.tempId !== tempId));
    };

    // Update a set value
    const updateSet = (exerciseId: number, setIndex: number, field: 'reps' | 'weight', value: string) => {
        setEditedExercises((prev) => {
            const newMap = new Map(prev);
            const edited = newMap.get(exerciseId);
            if (edited) {
                const newSets = [...edited.sets];
                if (field === 'reps') {
                    newSets[setIndex] = { ...newSets[setIndex], reps: value === '' ? undefined : Number.parseInt(value, 10) };
                } else {
                    newSets[setIndex] = { ...newSets[setIndex], weight: Number.parseFloat(value) || 0 };
                }
                newMap.set(exerciseId, { ...edited, sets: newSets });
            }
            return newMap;
        });
    };

    // Update exercise ID (swap)
    const updateExerciseId = (originalId: number, newId: number) => {
        setEditedExercises((prev) => {
            const newMap = new Map(prev);
            const edited = newMap.get(originalId);
            if (edited) {
                newMap.set(originalId, { ...edited, newExerciseId: newId === originalId ? undefined : newId });
            }
            return newMap;
        });
    };

    // Copy command to clipboard
    const copyCommand = async (command: string) => {
        await navigator.clipboard.writeText(command);
        setCopiedCommand(command);
        setTimeout(() => setCopiedCommand(null), 2000);
    };

    // Detect mobile screen size
    useEffect(() => {
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
    const baseExercises = showFullWorkout ? workout.exercises : focusedExercise ? [focusedExercise] : workout.exercises;

    // Apply muscle group filter if present
    const exercisesToShow = muscleGroupFilter
        ? baseExercises.filter((e) => {
              const metadata = exerciseMap.get(e.exerciseId.toString());
              return metadata?.primaryMuscleGroup === muscleGroupFilter;
          })
        : baseExercises;

    // If filtering resulted in no exercises, don't render the card
    if (exercisesToShow.length === 0) {
        return null;
    }

    // On mobile, don't apply maxHeight
    const cardStyle = isMobile ? {} : { maxHeight };

    const dateDisplay = new Date(workout.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    });

    const statsContent = (
        <div className="flex gap-2 text-sm text-muted-foreground flex-wrap justify-center">
            <span>
                <span>Blocks: {workout.exercises.length}&nbsp;|&nbsp;</span>
                <span>Vol: {Math.round(includeWarmup ? workout.volume : workout.workVolume).toLocaleString()}&nbsp;|&nbsp;</span>
            </span>
            <span>
                <span>Dur: {workout.duration}m&nbsp;</span>
                {workout.rpe && <span>|&nbsp;RPE: {workout.rpe}</span>}
            </span>
        </div>
    );

    const viewHeader = (
        <>
            <div className="flex items-center justify-between">
                <div className="w-8" />
                <h2 className="text-lg font-semibold text-center">{dateDisplay}</h2>
                {!miniMode && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={enterEditMode}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                )}
                {miniMode && <div className="w-8" />}
            </div>
            {statsContent}
        </>
    );

    const editHeader = (
        <>
            <div className="flex items-center justify-between">
                <div className="w-8" />
                <h2 className="text-lg font-semibold text-center">Edit Mode - {dateDisplay}</h2>
                {!miniMode && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={exitEditMode}>
                        <X className="h-4 w-4" />
                    </Button>
                )}
                {miniMode && <div className="w-8" />}
            </div>
            {statsContent}
        </>
    );

    const ViewCard = (
        <Card className="font-mono w-full h-full flex flex-col">
            <CardHeader className="p-3 space-y-2">{viewHeader}</CardHeader>
            <CardContent className="overflow-y-auto flex-1 p-0">
                <div className="divide-y">
                    {!selectedExercise && !showFullWorkout && (
                        <Button onClick={onToggleFullWorkout} variant="ghost" className="w-full flex items-center justify-center gap-2">
                            <span>View Full Workout</span>
                            <ChevronDown className="h-5 w-5" />
                        </Button>
                    )}
                    {exercisesToShow.map((exercise) => {
                        const metadata = exerciseMap.get(exercise.exerciseId.toString());
                        const isFocused = selectedExercise?.id === exercise.exerciseId;
                        return (
                            <ExerciseViewRow
                                key={exercise.exerciseId}
                                exercise={exercise}
                                metadata={metadata}
                                isFocused={isFocused}
                                miniMode={miniMode}
                                includeWarmup={includeWarmup}
                                cycleId={cycleId}
                                onExerciseClick={onExerciseClick}
                            />
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );

    const EditCard = (
        <Card className="font-mono w-full h-full flex flex-col">
            <CardHeader className="p-3 space-y-2">{editHeader}</CardHeader>
            <CardContent className="overflow-y-auto flex-1 p-0">
                <div className="divide-y">
                    {exercisesToShow.map((exercise) => {
                        const editedExercise = editedExercises.get(exercise.exerciseId);
                        const isFocused = selectedExercise?.id === exercise.exerciseId;
                        if (!editedExercise) return null;
                        return (
                            <ExerciseEditRow
                                key={exercise.exerciseId}
                                exercise={exercise}
                                editedExercise={editedExercise}
                                exerciseMap={exerciseMap}
                                workoutTitle={workout.title}
                                isFocused={isFocused}
                                includeWarmup={includeWarmup}
                                copiedCommand={copiedCommand}
                                onUpdateSet={updateSet}
                                onUpdateExerciseId={updateExerciseId}
                                onCopyCommand={copyCommand}
                            />
                        );
                    })}
                    {newExercises.map((newExercise) => (
                        <NewExerciseRow
                            key={newExercise.tempId}
                            newExercise={newExercise}
                            exerciseMap={exerciseMap}
                            workoutTitle={workout.title}
                            copiedCommand={copiedCommand}
                            onUpdateExerciseId={updateNewExerciseId}
                            onAddSet={addSetToNewExercise}
                            onUpdateSet={updateNewExerciseSet}
                            onRemove={removeNewExercise}
                            onCopyCommand={copyCommand}
                        />
                    ))}
                </div>
                <AddExerciseButton onAdd={addNewExercise} />
            </CardContent>
        </Card>
    );

    return (
        <div className="relative w-full h-full [perspective:1000px]" style={cardStyle}>
            <div
                className={cn(
                    'relative w-full h-full transition-all duration-500 [transform-style:preserve-3d] grid grid-cols-1 grid-rows-1',
                    isEditing ? '[transform:rotateY(180deg)]' : ''
                )}
            >
                <div className="col-start-1 row-start-1 w-full h-full [backface-visibility:hidden]">{ViewCard}</div>
                <div className="col-start-1 row-start-1 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)]">{EditCard}</div>
            </div>
        </div>
    );
};

export default WorkoutTable;
