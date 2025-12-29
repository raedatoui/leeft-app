import { type FC, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import WorkoutTable from '@/components/workoutTable';
import type { ExerciseMetadata, Workout } from '@/types';

interface WorkoutSliderProps {
    workouts: Workout[];
    exerciseMap: Map<string, ExerciseMetadata>;
    miniMode: boolean;
    currentIndex: number;
    setCurrentIndex: (index: number) => void;
    slidesToShow: number;
    cycleId?: string;
    reverse?: boolean;
}

const VirtualizedWorkoutSlider: FC<WorkoutSliderProps> = ({
    workouts,
    exerciseMap,
    miniMode,
    currentIndex,
    setCurrentIndex: _setCurrentIndex,
    slidesToShow,
    cycleId,
    reverse = true,
}) => {
    // Reverse the workouts order if requested
    const processedWorkouts = reverse ? [...workouts].reverse() : workouts;

    // Group workouts into slides (each slide contains slidesToShow workouts)
    const slideCount = Math.ceil(processedWorkouts.length / slidesToShow);
    const slides = Array.from({ length: slideCount }, (_, i) => processedWorkouts.slice(i * slidesToShow, (i + 1) * slidesToShow));

    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<List>(null);
    const outerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState<number>(0);

    // Measure the container width
    useLayoutEffect(() => {
        if (containerRef.current) {
            setContainerWidth(containerRef.current.offsetWidth);
        }

        const handleResize = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.offsetWidth);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
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

    const sliderHeight = typeof window !== 'undefined' && window.innerWidth < 768 ? window.innerHeight * 0.75 : 700;

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
                            scrollSnapType: 'x proximity',
                            touchAction: 'pan-y pan-x',
                            WebkitOverflowScrolling: 'touch',
                        }}
                    >
                        {({ index, style }) => {
                            return (
                                <div style={style} className="px-2 snap-start">
                                    <div className={`grid ${gridCols} gap-4`}>
                                        {slides[index].map((workout) => (
                                            <WorkoutTable
                                                key={workout.title}
                                                workout={workout}
                                                exerciseMap={exerciseMap}
                                                miniMode={miniMode}
                                                cycleId={cycleId}
                                            />
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

export default VirtualizedWorkoutSlider;
