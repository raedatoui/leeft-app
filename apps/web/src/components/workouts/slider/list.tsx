import { type FC, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import DayCard from '@/components/workouts/dayCard';
import type { DayWorkout, ExerciseMetadata, Workout } from '@/types';

interface WorkoutSliderProps {
    workouts: DayWorkout[];
    exerciseMap: Map<string, ExerciseMetadata>;
    miniMode: boolean;
    currentIndex: number;
    setCurrentIndex: (index: number) => void;
    slidesToShow: number;
    cycleId?: string;
    reverse?: boolean;
    onExerciseClick?: (id: string) => void;
    muscleGroupFilter?: string | null;
    includeWarmup?: boolean;
}

// Interface for lifting-only slider (used by cycles)
interface LiftingSliderProps {
    workouts: Workout[];
    exerciseMap: Map<string, ExerciseMetadata>;
    miniMode: boolean;
    currentIndex: number;
    setCurrentIndex: (index: number) => void;
    slidesToShow: number;
    cycleId?: string;
    reverse?: boolean;
    onExerciseClick?: (id: string) => void;
    muscleGroupFilter?: string | null;
    includeWarmup?: boolean;
}

export const WorkoutSliderList: FC<WorkoutSliderProps> = ({
    workouts,
    exerciseMap,
    miniMode,
    currentIndex,
    setCurrentIndex: _setCurrentIndex,
    slidesToShow,
    cycleId,
    reverse = true,
    onExerciseClick,
    muscleGroupFilter,
    includeWarmup = true,
}) => {
    // Reverse the workouts order if requested
    const reversedWorkouts = reverse ? [...workouts].reverse() : workouts;

    // Filter day workouts by muscle group if filter is active
    // Only show days that have at least one matching lifting exercise
    const processedWorkouts = muscleGroupFilter
        ? reversedWorkouts.filter((day) =>
              day.liftingWorkouts.some((w) =>
                  w.exercises.some((e) => {
                      const metadata = exerciseMap.get(e.exerciseId.toString());
                      return metadata?.primaryMuscleGroup === muscleGroupFilter;
                  })
              )
          )
        : reversedWorkouts;

    // Group workouts into slides (each slide contains slidesToShow workouts)
    const slideCount = Math.ceil(processedWorkouts.length / slidesToShow);
    const slides = Array.from({ length: slideCount }, (_, i) => processedWorkouts.slice(i * slidesToShow, (i + 1) * slidesToShow));

    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<List>(null);
    const outerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const [sliderHeight, setSliderHeight] = useState<number>(700);

    // Measure the container width and height
    useLayoutEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.offsetWidth);
            }
            // Use viewport height minus header/controls (approx 200px)
            setSliderHeight(window.innerHeight - 200);
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Smooth scroll when currentIndex changes
    useEffect(() => {
        if (outerRef.current) {
            outerRef.current.scrollTo({
                left: currentIndex * containerWidth,
                behavior: 'smooth',
            });
        }
    }, [currentIndex, containerWidth]);

    const gridCols =
        slidesToShow === 1
            ? 'grid-cols-1'
            : {
                  2: 'grid-cols-2',
                  3: 'grid-cols-3',
                  4: 'grid-cols-4',
                  5: 'grid-cols-5',
                  6: 'grid-cols-6',
                  7: 'grid-cols-7',
                  8: 'grid-cols-8',
              }[slidesToShow] || 'grid-cols-4';

    return (
        <div className="relative h-full" ref={containerRef}>
            <div className="overflow-hidden">
                {containerWidth > 0 && (
                    <List
                        ref={listRef}
                        outerRef={outerRef}
                        layout="horizontal"
                        height={sliderHeight}
                        width={containerWidth}
                        itemCount={slideCount}
                        itemSize={containerWidth}
                        className="scrollbar-hide snap-x snap-proximity"
                        style={{
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                            touchAction: 'pan-y pan-x',
                            WebkitOverflowScrolling: 'touch',
                        }}
                    >
                        {({ index, style }) => {
                            const slide = slides[index];
                            if (!slide) return null;
                            return (
                                <div style={style} className="px-2 snap-start py-2">
                                    <div className={`grid ${gridCols} gap-4 h-full`}>
                                        {slide.map((dayWorkout) => (
                                            <div key={`day-${dayWorkout.date.toISOString()}`} className="overflow-hidden min-h-0">
                                                <DayCard
                                                    dayWorkout={dayWorkout}
                                                    exerciseMap={exerciseMap}
                                                    miniMode={miniMode}
                                                    cycleId={cycleId}
                                                    onExerciseClick={onExerciseClick}
                                                    muscleGroupFilter={muscleGroupFilter}
                                                    includeWarmup={includeWarmup}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        }}
                    </List>
                )}
            </div>
        </div>
    );
};

// Lifting-only slider for cycle views (backwards compatible)
export const LiftingWorkoutSliderList: FC<LiftingSliderProps> = (props) => {
    // Wrap lifting workouts in DayWorkout format (one workout per day card)
    const wrappedWorkouts: DayWorkout[] = props.workouts.map((w) => ({
        date: w.date,
        liftingWorkouts: [w],
        cardioWorkouts: [],
    }));
    return <WorkoutSliderList {...props} workouts={wrappedWorkouts} />;
};
