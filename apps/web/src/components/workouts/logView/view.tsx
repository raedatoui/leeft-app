import { Calendar } from 'lucide-react';
import { CardioModeToggle } from '@/components/common/cardioModeToggle';
import PageTemplate from '@/components/layout/pageTemplate';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SliderControls, WorkoutSlider } from '@/components/workouts/slider';
import type { WorkoutLogViewProps } from './types';

interface ViewProps extends WorkoutLogViewProps {
    miniMode: boolean;
    setMiniMode: (val: boolean) => void;
    currentIndex: number;
    setCurrentIndex: (val: number) => void;
    slidesToShow: number;
    setSlidesToShow: (val: number) => void;
    responsiveColumns: number;
    includeWarmup: boolean;
    setIncludeWarmup: (val: boolean) => void;
    useStrictCardio: boolean;
    setUseStrictCardio: (val: boolean) => void;
    selectedYear: string | undefined;
    activeYear: number | undefined;
    selectedMonth: string | undefined;
    availableYears: number[];
    allMonths: { value: string; label: string }[];
    slideCount: number;
    effectiveSlidesToShow: number;
    slideLeft: () => void;
    slideRight: () => void;
    jumpToYear: (year: string) => void;
    jumpToMonth: (month: string) => void;
}

export default function WorkoutLogViewJSX({
    workouts,
    exerciseMap,
    isLoading,
    error,
    miniMode,
    setMiniMode,
    currentIndex,
    setCurrentIndex,
    slidesToShow,
    setSlidesToShow,
    responsiveColumns,
    includeWarmup,
    setIncludeWarmup,
    useStrictCardio: _useStrictCardio,
    setUseStrictCardio: _setUseStrictCardio,
    activeYear,
    selectedMonth,
    availableYears,
    allMonths,
    slideCount,
    effectiveSlidesToShow,
    slideLeft,
    slideRight,
    jumpToYear,
    jumpToMonth,
}: ViewProps) {
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
                                            {allMonths.map((month) => (
                                                <SelectItem key={month.value} value={month.value}>
                                                    {month.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Cardio mode toggle */}
                                <CardioModeToggle showCounts={false} />
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
