'use client';

import { Calendar } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import PageTemplate from '@/components/pageTemplate';
import WorkoutSlider from '@/components/slider';
import SliderControls from '@/components/sliderControls';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkouts } from '@/lib/contexts';

export default function HomePage() {
    const { workouts, exerciseMap, isLoading, error } = useWorkouts();
    const [miniMode, setMiniMode] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [slidesToShow, setSlidesToShow] = useState(4);
    const [responsiveColumns, setResponsiveColumns] = useState(4);
    const [includeWarmup, setIncludeWarmup] = useState(true);
    const [selectedYear, setSelectedYear] = useState<string | undefined>();
    const [selectedMonth, setSelectedMonth] = useState<string | undefined>();

    // Extract available years from workouts
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        workouts.forEach((workout) => {
            years.add(workout.date.getFullYear());
        });
        return Array.from(years).sort((a, b) => b - a); // Most recent first
    }, [workouts]);

    // Constant for months (reversed for recent-first order)
    const ALL_MONTHS = useMemo(
        () =>
            [
                { value: '0', label: 'January' },
                { value: '1', label: 'February' },
                { value: '2', label: 'March' },
                { value: '3', label: 'April' },
                { value: '4', label: 'May' },
                { value: '5', label: 'June' },
                { value: '6', label: 'July' },
                { value: '7', label: 'August' },
                { value: '8', label: 'September' },
                { value: '9', label: 'October' },
                { value: '10', label: 'November' },
                { value: '11', label: 'December' },
            ].reverse(),
        []
    );

    // Determine the active year for selecting months
    const activeYear = useMemo(() => {
        if (selectedYear) return Number(selectedYear);
        return availableYears.length > 0 ? availableYears[0] : undefined;
    }, [selectedYear, availableYears]);

    // Detect responsive breakpoints
    useEffect(() => {
        const updateColumns = () => {
            const width = window.innerWidth;
            let newColumns = 4;
            if (width < 640) {
                newColumns = 1; // Mobile
            } else if (width < 1024) {
                newColumns = 2; // Tablet
            } else if (width < 1280) {
                newColumns = 3; // Small desktop
            } else {
                newColumns = slidesToShow; // Large desktop - use user selection
            }
            setResponsiveColumns((prev) => {
                if (prev !== newColumns) {
                    setCurrentIndex(0); // Reset index when columns change
                    return newColumns;
                }
                return prev;
            });
        };
        updateColumns();
        window.addEventListener('resize', updateColumns);
        return () => window.removeEventListener('resize', updateColumns);
    }, [slidesToShow]);

    const effectiveSlidesToShow = responsiveColumns;
    const slideCount = useMemo(() => Math.ceil(workouts.length / effectiveSlidesToShow), [workouts.length, effectiveSlidesToShow]);

    const slideLeft = () => {
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
    };

    const slideRight = () => {
        setCurrentIndex((prev) => Math.min(prev + 1, slideCount - 1));
    };

    const jumpToYear = (year: string) => {
        if (!year) return;
        setSelectedYear(year);
        setSelectedMonth(undefined); // Reset month when year changes

        // Reverse workouts like the slider does
        const reversedWorkouts = [...workouts].reverse();

        // Find first workout of the selected year
        const workoutIndex = reversedWorkouts.findIndex((workout) => workout.date.getFullYear() === Number(year));

        if (workoutIndex !== -1) {
            // Calculate which slide contains this workout
            const slideIndex = Math.floor(workoutIndex / effectiveSlidesToShow);
            setCurrentIndex(slideIndex);
        }
    };

    const jumpToMonth = (monthStr: string) => {
        if (!activeYear || !monthStr) return;
        setSelectedMonth(monthStr);

        const month = Number(monthStr);
        const reversedWorkouts = [...workouts].reverse();

        // Find first workout of the selected year AND month
        const workoutIndex = reversedWorkouts.findIndex((workout) => workout.date.getFullYear() === activeYear && workout.date.getMonth() === month);

        if (workoutIndex !== -1) {
            const slideIndex = Math.floor(workoutIndex / effectiveSlidesToShow);
            setCurrentIndex(slideIndex);
        }
    };

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;

    return (
        <PageTemplate
            title="Workouts Log"
            stickyHeader={
                <div className="flex justify-center w-full">
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
                    >
                        {/* Year & Month Selector */}
                        {availableYears.length > 0 && (
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-tighter">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <Select value={activeYear?.toString()} onValueChange={jumpToYear}>
                                        <SelectTrigger className="w-[80px] h-9 text-xs border-none bg-muted/60 font-bold">
                                            <SelectValue placeholder="Year" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableYears.map((year) => (
                                                <SelectItem key={year} value={year.toString()}>
                                                    {year}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-tighter">
                                    <Select value={selectedMonth} onValueChange={jumpToMonth} disabled={!activeYear}>
                                        <SelectTrigger className="w-[100px] h-9 text-xs border-none bg-muted/60 font-bold">
                                            <SelectValue placeholder="Month" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ALL_MONTHS.map((month) => (
                                                <SelectItem key={month.value} value={month.value}>
                                                    {month.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </SliderControls>
                </div>
            }
        >
            <div className="flex flex-col gap-4">
                <WorkoutSlider
                    workouts={workouts}
                    exerciseMap={exerciseMap}
                    miniMode={miniMode}
                    currentIndex={currentIndex}
                    setCurrentIndex={setCurrentIndex}
                    slidesToShow={effectiveSlidesToShow}
                    includeWarmup={includeWarmup}
                />
            </div>
        </PageTemplate>
    );
}
