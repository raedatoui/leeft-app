import { X } from 'lucide-react';
import MuscleGroupVolumeChart from '@/components/charts/muscleGroupVolumeChart';
import ExerciseView from '@/components/exercises/exercise-item';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SliderControls, WorkoutSlider } from '@/components/workouts/slider';
import { cn } from '@/lib/utils';
import type { ExerciseMetadata } from '@/types';
import type { CycleDetailViewProps } from './types';

interface ViewProps extends CycleDetailViewProps {
    miniMode: boolean;
    setMiniMode: (val: boolean) => void;
    currentIndex: number;
    setCurrentIndex: (val: number) => void;
    slidesToShow: number;
    setSlidesToShow: (val: number) => void;
    responsiveColumns: number;
    selectedExerciseId: string | null;
    setSelectedExerciseId: (val: string | null) => void;
    selectedMuscleGroup: string | null;
    setSelectedMuscleGroup: (val: string | null) => void;
    includeWarmup: boolean;
    setIncludeWarmup: (val: boolean) => void;
    muscleGroupStats: { group: string; sets: number; workouts: number }[];
    slideCount: number;
    effectiveSlidesToShow: number;
    slideLeft: () => void;
    slideRight: () => void;
    selectedExercise: ExerciseMetadata | null | undefined;
}

export default function CycleDetailViewJSX({
    cycle,
    exerciseMap,
    miniMode,
    setMiniMode,
    currentIndex,
    setCurrentIndex,
    slidesToShow,
    setSlidesToShow,
    responsiveColumns,
    selectedExerciseId,
    setSelectedExerciseId,
    selectedMuscleGroup,
    setSelectedMuscleGroup,
    includeWarmup,
    setIncludeWarmup,
    muscleGroupStats,
    slideCount,
    effectiveSlidesToShow,
    slideLeft,
    slideRight,
    selectedExercise,
}: ViewProps) {
    return (
        <div className="flex flex-col gap-6">
            {/* Muscle Group Stats */}
            {muscleGroupStats.length > 0 && (
                <div className="flex flex-wrap gap-3">
                    {muscleGroupStats.map(({ group, sets, workouts }) => (
                        <Badge
                            key={group}
                            variant={selectedMuscleGroup === group ? 'default' : 'secondary'}
                            className="text-sm py-2 px-5 capitalize font-bold tracking-tight cursor-pointer transition-colors"
                            onClick={() => setSelectedMuscleGroup(selectedMuscleGroup === group ? null : group)}
                        >
                            {group}{' '}
                            <span className={cn('ml-2', selectedMuscleGroup === group ? 'opacity-90' : 'text-primary opacity-70')}>
                                {workouts} wkts / {sets} sets
                            </span>
                        </Badge>
                    ))}
                </div>
            )}

            {/* Muscle Group Volume Chart */}
            {selectedMuscleGroup && cycle.workouts && (
                <MuscleGroupVolumeChart workouts={cycle.workouts} muscleGroup={selectedMuscleGroup} exerciseMap={exerciseMap} />
            )}

            {/* Inline Exercise View */}
            {selectedExerciseId && selectedExercise ? (
                <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-white">{selectedExercise.name}</h3>
                        <Button
                            onClick={() => setSelectedExerciseId(null)}
                            size="icon"
                            variant="default"
                            className="rounded-full h-10 w-10 shadow-md"
                        >
                            <X className="h-6 w-6" />
                        </Button>
                    </div>
                    <ExerciseView
                        workouts={cycle.workouts || []}
                        exercise={selectedExercise}
                        exerciseMap={exerciseMap}
                        cycleId={cycle.uuid}
                        hideSelector={true}
                    />
                </div>
            ) : (
                /* Slider Section */
                <div className="flex flex-col gap-4">
                    {/* Controls */}
                    {cycle.workouts && cycle.workouts.length > 0 && (
                        <div className="flex justify-center">
                            <SliderControls
                                currentIndex={currentIndex}
                                slideCount={slideCount}
                                miniMode={miniMode}
                                onMiniModeChange={(checked) => setMiniMode(!checked)}
                                slidesToShow={slidesToShow}
                                onSlidesToShowChange={(val) => {
                                    setSlidesToShow(val);
                                    setCurrentIndex(0);
                                }}
                                responsiveColumns={responsiveColumns}
                                onPrev={slideLeft}
                                onNext={slideRight}
                                includeWarmup={includeWarmup}
                                onIncludeWarmupChange={setIncludeWarmup}
                            />
                        </div>
                    )}

                    {/* Slider */}
                    {cycle.workouts && cycle.workouts.length > 0 ? (
                        <WorkoutSlider
                            workouts={cycle.workouts}
                            exerciseMap={exerciseMap}
                            miniMode={miniMode}
                            currentIndex={currentIndex}
                            setCurrentIndex={setCurrentIndex}
                            slidesToShow={effectiveSlidesToShow}
                            cycleId={cycle.uuid}
                            reverse={false}
                            onExerciseClick={(id) => setSelectedExerciseId(id)}
                            muscleGroupFilter={selectedMuscleGroup}
                            includeWarmup={includeWarmup}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-2xl bg-muted/5 text-muted-foreground font-medium">
                            No workouts recorded for this cycle.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
