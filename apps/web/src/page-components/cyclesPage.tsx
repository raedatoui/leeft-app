'use client';

import { ChevronLeft, ChevronRight, FileText, MapPin } from 'lucide-react';
import Link from 'next/link';
import { type FC, useMemo, useState } from 'react';
import { TopExercisesList } from '@/components/analysis/topExercisesList';
import { ControlCard } from '@/components/common/controlCard';
import CycleDetailView from '@/components/cycles/detail-view';
import CycleHeader from '@/components/cycles/header';
import PageTemplate from '@/components/layout/pageTemplate';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { WorkoutStatsGrid } from '@/components/workouts/workoutStatsGrid';
import { useWorkouts } from '@/lib/contexts';
import { cn, computeStats, formatDate } from '@/lib/utils';
import type { ExerciseMap, MappedCycle, Workout } from '@/types';

interface CycleProps {
    uuid: string;
    name: string;
    location?: string;
    dates: [Date, Date];
    note?: string;
    workouts: Workout[];
    exerciseMap: ExerciseMap;
    className?: string;
    transform?: object;
    accentColor?: string;
    badgeBorder?: string;
    gradientColor?: string;
    showDetails?: boolean;
    onClick?: (e: React.MouseEvent) => void;
    onSelect?: () => void;
}

const CycleCard: FC<CycleProps> = ({
    uuid,
    name,
    location,
    dates,
    note,
    workouts,
    exerciseMap,
    className = '',
    transform = {},
    badgeBorder = '',
    gradientColor = '',
    showDetails = false,
    onClick,
    onSelect,
}) => {
    const getDuration = () => {
        const [start, end] = dates;
        const diff = Math.abs(end.getTime() - start.getTime());
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    const { workoutCount, avgExercises, topExercises } = computeStats(workouts);
    const totalVolume = workouts.reduce((sum, w) => sum + (w.volume || 0), 0);
    const avgVolume = totalVolume / workoutCount;

    const handleTitleClick = (e: React.MouseEvent) => {
        if (onSelect) {
            e.preventDefault();
            e.stopPropagation();
            onSelect();
        }
    };

    return (
        <Card
            onClick={(e) => {
                if (onClick) onClick(e);
                else if (onSelect) onSelect();
            }}
            className={cn(
                'bg-black relative overflow-hidden group transition-all duration-300 cursor-pointer',
                'hover:shadow-none hover:scale-[1.02]',
                className
            )}
            style={transform}
        >
            {/* Subtle gradient overlay */}
            <div className={cn('absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-300', gradientColor)} />

            <CardHeader className="pb-3 relative">
                <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-white text-lg sm:text-xl font-bold flex items-center gap-2 group-hover:text-primary transition-colors">
                            <Link
                                href={`/cycles/${uuid}`}
                                onClick={handleTitleClick}
                                className="hover:underline decoration-primary underline-offset-4 flex items-center gap-2"
                            >
                                {name}
                            </Link>
                        </CardTitle>
                        <Badge variant="outline" className={cn('shrink-0 text-xs', badgeBorder)}>
                            {getDuration()} days
                        </Badge>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium">
                            {formatDate(dates[0])} – {formatDate(dates[1])}
                        </span>
                        {location && (
                            <>
                                <span className="hidden sm:inline">•</span>
                                <div className="flex items-center gap-1">
                                    <MapPin size={12} />
                                    <span>{location}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-2 pt-0 relative">
                {/* Workout stats */}
                {workouts.length > 0 && (
                    <div className="space-y-2">
                        <WorkoutStatsGrid workoutCount={workoutCount} avgExercises={avgExercises} avgVolume={avgVolume} />
                        {showDetails && <TopExercisesList exercises={topExercises} exerciseMap={exerciseMap} />}
                    </div>
                )}

                {/* Note */}
                {note && showDetails && (
                    <div className="flex items-start gap-2 border-t border-zinc-800 pt-2 text-xs bg-zinc-900/30 -mx-6 px-6 pb-1">
                        <FileText size={14} className="shrink-0 mt-0.5 text-muted-foreground" />
                        <p className="line-clamp-3 text-muted-foreground leading-relaxed">{note}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default function TrainingTimeline() {
    const [visibleYear, setVisibleYear] = useState(2025);
    const [isReversed, setIsReversed] = useState(false);
    const [activeType, setActiveType] = useState<string | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [selectedCycleUuid, setSelectedCycleUuid] = useState<string | null>(null);

    const { cycles: rawCycles, exerciseMap, isLoading, error } = useWorkouts();

    // Group cycles by year (cycles spanning multiple years appear in each year)
    const cyclesByYear = useMemo(() => {
        if (!rawCycles) return {};
        return rawCycles.reduce(
            (acc, cycle: MappedCycle) => {
                const startYear = cycle.dates[0].getFullYear();
                const endYear = cycle.dates[1].getFullYear();

                // Add cycle to all years it spans
                for (let year = startYear; year <= endYear; year++) {
                    if (!acc[year]) acc[year] = [];
                    acc[year].push(cycle);
                }
                return acc;
            },
            {} as Record<number, MappedCycle[]>
        );
    }, [rawCycles]);

    const years = useMemo(() => {
        return Object.keys(cyclesByYear)
            .map(Number)
            .sort((a, b) => b - a);
    }, [cyclesByYear]);

    // Get cycles for the visible year
    const visibleCycles = useMemo(() => cyclesByYear[visibleYear] || [], [cyclesByYear, visibleYear]);

    const filteredCycles = useMemo(() => visibleCycles.filter((c) => activeType === null || c.type === activeType), [visibleCycles, activeType]);

    // Note: We don't filter filteredCycles by selectedCycleUuid here anymore because we want
    // to switch to CycleDetailView when selected, not just filter the list.

    const displayCycles = isReversed ? [...filteredCycles].reverse() : filteredCycles;

    // Calculate year stats
    const yearStats = useMemo(() => {
        return visibleCycles.reduce(
            (acc, cycle) => {
                // Count unique workouts (avoiding duplicates from cycles)
                for (const w of cycle.workouts) {
                    acc.workoutUuids.add(w.uuid);
                }

                // Count cycles per type
                acc.typeCounts[cycle.type] = (acc.typeCounts[cycle.type] || 0) + 1;

                // Count days off from break cycles
                if (cycle.type === 'break') {
                    const startOfYear = new Date(visibleYear, 0, 1).getTime();
                    const endOfYear = new Date(visibleYear, 11, 31, 23, 59, 59).getTime();

                    const cycleStart = Math.max(cycle.dates[0].getTime(), startOfYear);
                    const cycleEnd = Math.min(cycle.dates[1].getTime(), endOfYear);

                    const daysOff = Math.max(0, Math.ceil((cycleEnd - cycleStart) / (1000 * 60 * 60 * 24)));
                    acc.breakDays += daysOff;
                }

                return acc;
            },
            { workoutUuids: new Set<string>(), breakDays: 0, typeCounts: {} as Record<string, number> }
        );
    }, [visibleCycles, visibleYear]);

    const totalWorkouts = yearStats.workoutUuids.size;
    const totalBreakDays = yearStats.breakDays;

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;

    // Generate months for the visible year
    const baseMonths = Array.from({ length: 12 }, (_, i) => {
        const date = new Date(visibleYear, i, 1);
        return {
            date,
            label: date.toLocaleString('en-US', { month: 'short' }),
        };
    });

    const months = isReversed ? [...baseMonths].reverse() : baseMonths;

    // Helper function to determine cycle color
    const getCycleStyles = (type: string) => {
        switch (type) {
            case 'hypertrophy':
                return {
                    border: 'border-red-500/50',
                    color: 'text-red-500',
                    timeline: 'bg-red-500',
                    accent: 'bg-red-500',
                    badgeBorder: 'border-red-500',
                    gradient: 'bg-gradient-to-br from-red-500/10 to-transparent',
                    shadow: 'hover:shadow-none',
                };
            case 'break':
                return {
                    border: 'border-blue-500/50',
                    color: 'text-blue-500',
                    timeline: 'bg-blue-500',
                    accent: 'bg-blue-500',
                    badgeBorder: 'border-blue-500',
                    gradient: 'bg-gradient-to-br from-blue-500/10 to-transparent',
                    shadow: 'hover:shadow-none',
                };
            case 'maintenance':
                return {
                    border: 'border-yellow-500/50',
                    color: 'text-yellow-500',
                    timeline: 'bg-yellow-500',
                    accent: 'bg-yellow-500',
                    badgeBorder: 'border-yellow-500',
                    gradient: 'bg-gradient-to-br from-yellow-500/10 to-transparent',
                    shadow: 'hover:shadow-none',
                };
            case 'strength':
                return {
                    border: 'border-green-500/50',
                    color: 'text-green-500',
                    timeline: 'bg-green-500',
                    accent: 'bg-green-500',
                    badgeBorder: 'border-green-500',
                    gradient: 'bg-gradient-to-br from-green-500/10 to-transparent',
                    shadow: 'hover:shadow-none',
                };
            default:
                return {
                    border: 'border-yellow-500/50',
                    color: 'text-yellow-500',
                    timeline: 'bg-yellow-500',
                    accent: 'bg-yellow-500',
                    badgeBorder: 'border-yellow-500',
                    gradient: 'bg-gradient-to-br from-yellow-500/10 to-transparent',
                    shadow: 'hover:shadow-none',
                };
        }
    };

    // Calculate cycle position on timeline
    const getCyclePosition = (cycle: MappedCycle) => {
        const startOfYear = new Date(visibleYear, 0, 1).getTime();
        const endOfYear = new Date(visibleYear, 11, 31).getTime();
        const total = endOfYear - startOfYear;

        const t0 = Math.max(cycle.dates[0].getTime(), startOfYear);
        const t1 = Math.min(cycle.dates[1].getTime(), endOfYear);

        if (!isReversed) {
            const p0 = ((t0 - startOfYear) / total) * 100;
            const p1 = ((t1 - startOfYear) / total) * 100;
            return { left: `${p0}%`, width: `${p1 - p0}%` };
        }
        const d0 = endOfYear - t0;
        const d1 = endOfYear - t1;
        const p0 = (d0 / total) * 100;
        const p1 = (d1 / total) * 100;
        return { left: `${p1}%`, width: `${p0 - p1}%` };
    };

    const legendItems = [
        { type: 'strength', label: 'Strength', bg: 'bg-green-500' },
        { type: 'hypertrophy', label: 'Hypertrophy', bg: 'bg-red-500' },
        { type: 'break', label: 'Break', bg: 'bg-blue-500' },
        { type: 'maintenance', label: 'Maintenance', bg: 'bg-yellow-500' },
    ];

    // Handler for clicking on timeline bars
    const handleBarClick = (cycleUuid: string) => {
        if (selectedCycleUuid === cycleUuid) {
            // If clicking the already selected cycle, deselect it
            setSelectedCycleUuid(null);
        } else {
            // Select the cycle and show details
            setSelectedCycleUuid(cycleUuid);
            setActiveType(null);
        }
    };

    const selectedCycle = selectedCycleUuid ? rawCycles.find((c) => c.uuid === selectedCycleUuid) : null;

    return (
        <PageTemplate
            title="Training Cycles"
            stickyHeader={
                <div className="flex flex-col gap-4">
                    {/* Controls & Summary Row - Hide when a cycle is selected */}
                    <ControlCard className="w-full">
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <h2 className="text-3xl font-black tracking-tight text-primary">{visibleYear}</h2>
                                <div className="h-6 w-px bg-border mx-2" />
                                <div className="flex items-center gap-3">
                                    <Button
                                        onClick={() => {
                                            setVisibleYear((prev) => Math.max(...years.filter((y) => y < prev)));
                                            setSelectedCycleUuid(null);
                                        }}
                                        disabled={visibleYear === Math.min(...years)}
                                        size="icon"
                                        variant="outline"
                                        className="h-8 w-8 rounded-full"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setVisibleYear((prev) => Math.min(...years.filter((y) => y > prev)));
                                            setSelectedCycleUuid(null);
                                        }}
                                        disabled={visibleYear === Math.max(...years)}
                                        size="icon"
                                        variant="outline"
                                        className="h-8 w-8 rounded-full"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Combined stats & filters */}
                            <div className="flex items-center gap-2 text-xs flex-wrap">
                                <Button
                                    onClick={() => {
                                        setActiveType(null);
                                        setSelectedCycleUuid(null);
                                    }}
                                    variant={activeType === null ? 'default' : 'outline'}
                                    size="sm"
                                    className="h-8 gap-2"
                                >
                                    <span>All</span>
                                    <span className="font-bold">{visibleCycles.length}</span>
                                </Button>
                                {legendItems.map((item) => {
                                    const isActive = activeType === item.type;
                                    const count = yearStats.typeCounts[item.type] || 0;
                                    return (
                                        <Button
                                            key={item.type}
                                            onClick={() => {
                                                setActiveType(isActive ? null : item.type);
                                                setSelectedCycleUuid(null);
                                            }}
                                            variant={isActive ? 'default' : 'outline'}
                                            size="sm"
                                            className="h-8 gap-2"
                                        >
                                            <div className={cn('w-2 h-2 rounded-full', item.bg)} />
                                            <span className="hidden sm:inline">{item.label}</span>
                                            <span className="font-bold">{count}</span>
                                        </Button>
                                    );
                                })}
                                <div className="h-4 w-px bg-border mx-1" />
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-md">
                                    <span className="text-muted-foreground">Workouts</span>
                                    <span className="font-bold text-primary">{totalWorkouts}</span>
                                </div>
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-md">
                                    <span className="text-muted-foreground">Rest days</span>
                                    <span className="font-bold text-blue-500">{totalBreakDays}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Direction toggle */}
                                <Button onClick={() => setIsReversed((r) => !r)} variant="outline" size="sm" className="h-8 text-xs">
                                    {isReversed ? 'R→L' : 'L→R'}
                                </Button>

                                {/* Details toggle - only relevant for list view */}
                                {!selectedCycleUuid && (
                                    <div className="flex items-center gap-2 text-xs bg-background border rounded-md px-3 py-1.5 h-8">
                                        <Label htmlFor="show-details" className="cursor-pointer font-medium">
                                            Details
                                        </Label>
                                        <Switch
                                            id="show-details"
                                            checked={showDetails}
                                            onCheckedChange={setShowDetails}
                                            className="scale-75 origin-right"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </ControlCard>

                    {/* Month markers */}
                    <ControlCard className="w-full">
                        <div className="hidden sm:block">
                            <div className="flex justify-between mb-1">
                                {months.map((m, idx) => (
                                    <div
                                        key={m.label}
                                        className={cn('text-xs text-muted-foreground text-center w-8', idx % 2 !== 0 && 'hidden md:block')}
                                    >
                                        {m.label}
                                    </div>
                                ))}
                            </div>

                            {/* Timeline base + ticks */}
                            <div className="relative h-1 bg-primary mb-2">
                                <div className="absolute inset-0 flex justify-between">
                                    {months.map((m, idx) => (
                                        <div key={m.label} className={cn('w-px h-3 bg-muted-foreground', idx % 2 !== 0 && 'hidden md:block')} />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Cycles grid */}
                        <div className="space-y-4 p-2 mb-4">
                            <div className="relative flex-1 h-full">
                                {visibleCycles.map((cycle) => {
                                    const styles = getCycleStyles(cycle.type);
                                    const { left, width } = getCyclePosition(cycle);
                                    const isSelected = selectedCycleUuid === cycle.uuid;
                                    const isTypeMismatch = activeType !== null && cycle.type !== activeType;
                                    const isDimmed = (selectedCycleUuid !== null && !isSelected) || isTypeMismatch;

                                    return (
                                        // biome-ignore lint/a11y/useKeyWithClickEvents: selection logic
                                        // biome-ignore lint/a11y/noStaticElementInteractions: selection logic
                                        <div
                                            key={cycle.uuid}
                                            onClick={() => {
                                                handleBarClick(cycle.uuid);
                                            }}
                                            className={cn(
                                                'absolute h-3 top-0 rounded-full -translate-y-1/2 cursor-pointer transition-all duration-300',
                                                styles.timeline,
                                                'hover:h-4 hover:shadow-lg',
                                                isDimmed && 'opacity-20',
                                                isSelected && 'ring-2 ring-white h-4'
                                            )}
                                            style={{ left, width }}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </ControlCard>

                    {/* Hoisted Cycle Header */}
                    {selectedCycle && <CycleHeader cycle={selectedCycle} onClose={() => setSelectedCycleUuid(null)} />}
                </div>
            }
        >
            <div className="min-h-[400px] sm:min-h-[600px] mt-4">
                {selectedCycle && selectedCycleUuid ? (
                    <CycleDetailView cycle={selectedCycle} exerciseMap={exerciseMap} />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {displayCycles.map((cycle) => {
                            const styles = getCycleStyles(cycle.type);

                            return (
                                <CycleCard
                                    key={cycle.uuid}
                                    uuid={cycle.uuid}
                                    name={cycle.name}
                                    location={cycle.location}
                                    dates={[cycle.dates[0], cycle.dates[1]]}
                                    note={cycle.note}
                                    workouts={cycle.workouts}
                                    exerciseMap={exerciseMap}
                                    className={cn('w-full border-1', styles.border, styles.shadow)}
                                    accentColor={styles.accent}
                                    badgeBorder={styles.badgeBorder}
                                    gradientColor={styles.gradient}
                                    showDetails={showDetails}
                                    onSelect={() => handleBarClick(cycle.uuid)}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </PageTemplate>
    );
}
