'use client';

import { useEffect, useMemo, useState } from 'react';
import { useWorkouts } from '@/lib/contexts';
import WorkoutLogViewJSX from './view';

export default function WorkoutLogView() {
    const { activeAllWorkouts: allWorkouts, exerciseMap, isLoading, error, useStrictCardio, setUseStrictCardio } = useWorkouts();
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
        allWorkouts.forEach((day) => {
            years.add(day.date.getFullYear());
        });
        return Array.from(years).sort((a, b) => b - a); // Most recent first
    }, [allWorkouts]);

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
    const slideCount = useMemo(() => Math.ceil(allWorkouts.length / effectiveSlidesToShow), [allWorkouts.length, effectiveSlidesToShow]);

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
        const reversedWorkouts = [...allWorkouts].reverse();

        // Find first day of the selected year
        const workoutIndex = reversedWorkouts.findIndex((day) => day.date.getFullYear() === Number(year));

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
        const reversedWorkouts = [...allWorkouts].reverse();

        // Find first day of the selected year AND month
        const workoutIndex = reversedWorkouts.findIndex((day) => day.date.getFullYear() === activeYear && day.date.getMonth() === month);

        if (workoutIndex !== -1) {
            const slideIndex = Math.floor(workoutIndex / effectiveSlidesToShow);
            setCurrentIndex(slideIndex);
        }
    };

    return (
        <WorkoutLogViewJSX
            workouts={allWorkouts}
            exerciseMap={exerciseMap}
            isLoading={isLoading}
            error={error}
            miniMode={miniMode}
            setMiniMode={setMiniMode}
            currentIndex={currentIndex}
            setCurrentIndex={setCurrentIndex}
            slidesToShow={slidesToShow}
            setSlidesToShow={setSlidesToShow}
            responsiveColumns={responsiveColumns}
            includeWarmup={includeWarmup}
            setIncludeWarmup={setIncludeWarmup}
            selectedYear={selectedYear}
            activeYear={activeYear}
            selectedMonth={selectedMonth}
            availableYears={availableYears}
            allMonths={ALL_MONTHS}
            slideCount={slideCount}
            effectiveSlidesToShow={effectiveSlidesToShow}
            slideLeft={slideLeft}
            slideRight={slideRight}
            jumpToYear={jumpToYear}
            jumpToMonth={jumpToMonth}
            useStrictCardio={useStrictCardio}
            setUseStrictCardio={setUseStrictCardio}
        />
    );
}
