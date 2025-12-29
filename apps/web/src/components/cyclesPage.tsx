'use client';

import { ChevronLeft, ChevronRight, ExternalLink, Eye, FileText, MapPin } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { useState } from 'react';
import PageTemplate from '@/components/pageTemplate';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
}

const CycleCard: React.FC<CycleProps> = ({
    uuid,
    name,
    location,
    dates,
    note,
    workouts,
    exerciseMap,
    className = '',
    transform = {},
    accentColor = '',
    badgeBorder = '',
    gradientColor = '',
    showDetails = false,
    onClick,
}) => {
    const getDuration = () => {
        const [start, end] = dates;
        const diff = Math.abs(end.getTime() - start.getTime());
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    const { workoutCount, avgExercises, topExercises } = computeStats(workouts);
    const totalVolume = workouts.reduce((sum, w) => sum + (w.volume || 0), 0);
    const avgVolume = totalVolume / workoutCount;

    return (
        <Card
            onClick={onClick}
            className={cn('bg-black relative overflow-hidden group transition-all duration-300', 'hover:shadow-2xl hover:scale-[1.02]', className)}
            style={transform}
        >
            {/* Colored accent bar on the left */}
            <div className={cn('absolute left-0 top-0 bottom-0 w-1.5', accentColor)} />

            {/* Subtle gradient overlay */}
            <div className={cn('absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-300', gradientColor)} />

            <CardHeader className="pb-3 relative">
                <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-white text-lg sm:text-xl font-bold flex items-center gap-2 group-hover:text-primary transition-colors">
                            <Link href={`/cycles/${uuid}`} className="hover:underline decoration-primary underline-offset-4 flex items-center gap-2">
                                {name}
                                <ExternalLink size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
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
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-zinc-900/50 rounded-lg p-2 border border-zinc-800">
                                <div className="text-2xl font-bold">{workoutCount}</div>
                                <div className="text-xs text-muted-foreground">Workouts</div>
                            </div>
                            <div className="bg-zinc-900/50 rounded-lg p-2 border border-zinc-800">
                                <div className="text-2xl font-bold">{avgExercises.toFixed(1)}</div>
                                <div className="text-xs text-muted-foreground">Avg exercises</div>
                            </div>
                            <div className="bg-zinc-900/50 rounded-lg p-2 border border-zinc-800">
                                <div className="text-2xl font-bold">{avgVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                <div className="text-xs text-muted-foreground">Avg Volume</div>
                            </div>
                        </div>

                        {showDetails && (
                            <div>
                                <div className="text-sm font-semibold mb-1.5 flex items-center gap-2">
                                    <span>Top exercises</span>
                                    <div className="flex-1 h-px bg-zinc-800" />
                                </div>
                                <ul className="space-y-1.5">
                                    {topExercises.map((ex) => (
                                        <li key={ex.id} className="flex items-start gap-2 text-sm">
                                            <span className="text-muted-foreground mt-0.5">→</span>
                                            <div className="flex-1">
                                                <Link href={`/exercise/${ex.id}`} className="font-semibold hover:text-primary transition-colors">
                                                    {exerciseMap.get(ex.id.toString())?.name}
                                                </Link>
                                                <div className="text-xs text-muted-foreground">
                                                    {ex.count} times • max {ex.maxWeight}
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
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
    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;

    // Group cycles by year (cycles spanning multiple years appear in each year)
    const cyclesByYear = rawCycles.reduce(
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

    const years = Object.keys(cyclesByYear)
        .map(Number)
        .sort((a, b) => b - a);

    // Get cycles for the visible year
    const visibleCycles = cyclesByYear[visibleYear] || [];
    let filteredCycles = visibleCycles.filter((c) => activeType === null || c.type === activeType);

    // If a specific cycle is selected, only show that one
    if (selectedCycleUuid) {
        filteredCycles = filteredCycles.filter((c) => c.uuid === selectedCycleUuid);
    }

    const displayCycles = isReversed ? [...filteredCycles].reverse() : filteredCycles;

    // Calculate year stats
    const yearStats = visibleCycles.reduce(
        (acc, cycle) => {
            // Count unique workouts (avoiding duplicates from cycles)
            const workoutUuids = new Set(cycle.workouts.map((w) => w.uuid));
            workoutUuids.forEach((uuid) => {
                acc.workoutUuids.add(uuid);
            });

            // Count days off from break cycles
            if (cycle.type === 'break') {
                const startOfYear = new Date(visibleYear, 0, 1).getTime();
                const endOfYear = new Date(visibleYear, 11, 31, 23, 59, 59).getTime();

                const cycleStart = Math.max(cycle.dates[0].getTime(), startOfYear);
                const cycleEnd = Math.min(cycle.dates[1].getTime(), endOfYear);

                const daysOff = Math.ceil((cycleEnd - cycleStart) / (1000 * 60 * 60 * 24));
                acc.breakDays += daysOff;
            }

            return acc;
        },
        { workoutUuids: new Set<string>(), breakDays: 0 }
    );

    const totalWorkouts = yearStats.workoutUuids.size;
    const totalBreakDays = yearStats.breakDays;

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
                    shadow: 'hover:shadow-red-500/20',
                };
            case 'break':
                return {
                    border: 'border-blue-500/50',
                    color: 'text-blue-500',
                    timeline: 'bg-blue-500',
                    accent: 'bg-blue-500',
                    badgeBorder: 'border-blue-500',
                    gradient: 'bg-gradient-to-br from-blue-500/10 to-transparent',
                    shadow: 'hover:shadow-blue-500/20',
                };
            case 'maintenance':
                return {
                    border: 'border-yellow-500/50',
                    color: 'text-yellow-500',
                    timeline: 'bg-yellow-500',
                    accent: 'bg-yellow-500',
                    badgeBorder: 'border-yellow-500',
                    gradient: 'bg-gradient-to-br from-yellow-500/10 to-transparent',
                    shadow: 'hover:shadow-yellow-500/20',
                };
            case 'strength':
                return {
                    border: 'border-green-500/50',
                    color: 'text-green-500',
                    timeline: 'bg-green-500',
                    accent: 'bg-green-500',
                    badgeBorder: 'border-green-500',
                    gradient: 'bg-gradient-to-br from-green-500/10 to-transparent',
                    shadow: 'hover:shadow-green-500/20',
                };
            default:
                return {
                    border: 'border-yellow-500/50',
                    color: 'text-yellow-500',
                    timeline: 'bg-yellow-500',
                    accent: 'bg-yellow-500',
                    badgeBorder: 'border-yellow-500',
                    gradient: 'bg-gradient-to-br from-yellow-500/10 to-transparent',
                    shadow: 'hover:shadow-yellow-500/20',
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
            setShowDetails(true);
        }
    };

    return (
        <PageTemplate>
            <div className="flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="flex flex-col gap-2 w-full md:w-auto">
                        <h2 className="text-2xl sm:text-4xl font-bold text-primary text-center md:text-left">Training Cycles</h2>
                        <div className="flex flex-row gap-3 sm:gap-6 text-sm justify-center md:justify-start">
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Total Workouts:</span>
                                <span className="font-bold text-primary">{totalWorkouts}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Break Days:</span>
                                <span className="font-bold text-blue-500">{totalBreakDays}</span>
                            </div>
                        </div>
                    </div>
                    <Card className="w-full lg:w-auto">
                        <CardContent className="py-2 px-3 sm:px-4">
                            <div className="flex flex-col gap-3">
                                {/* Year selector row */}
                                <div className="flex items-center gap-3">
                                    <Button
                                        onClick={() => {
                                            setVisibleYear((prev) => Math.max(...years.filter((y) => y < prev)));
                                            setSelectedCycleUuid(null);
                                        }}
                                        disabled={visibleYear === Math.min(...years)}
                                        size="icon"
                                        variant="default"
                                        className="rounded-full"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </Button>

                                    <span className="text-sm font-bold min-w-[60px] text-center">{visibleYear}</span>

                                    <Button
                                        onClick={() => {
                                            setVisibleYear((prev) => Math.min(...years.filter((y) => y > prev)));
                                            setSelectedCycleUuid(null);
                                        }}
                                        disabled={visibleYear === Math.max(...years)}
                                        size="icon"
                                        variant="default"
                                        className="rounded-full"
                                    >
                                        <ChevronRight className="h-5 w-5" />
                                    </Button>

                                    {/* Direction toggle */}
                                    <Button onClick={() => setIsReversed((r) => !r)} variant="outline" size="sm" className="h-7">
                                        {isReversed ? 'R→L' : 'L→R'}
                                    </Button>

                                    {/* Details toggle */}
                                    <div className="flex items-center gap-2 text-xs">
                                        <Label htmlFor="show-details" className="cursor-pointer">
                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                        </Label>
                                        <Switch id="show-details" checked={showDetails} onCheckedChange={setShowDetails} />
                                    </div>
                                </div>

                                {/* Legend filters row */}
                                <div className="flex items-center gap-2 text-xs flex-wrap">
                                    <Button
                                        onClick={() => {
                                            setActiveType(null);
                                            setSelectedCycleUuid(null);
                                        }}
                                        variant={activeType === null ? 'default' : 'outline'}
                                        size="sm"
                                        className="h-7"
                                    >
                                        All
                                    </Button>
                                    {legendItems.map((item) => {
                                        const isActive = activeType === item.type;
                                        return (
                                            <Button
                                                key={item.type}
                                                onClick={() => {
                                                    setActiveType(isActive ? null : item.type);
                                                    setSelectedCycleUuid(null);
                                                }}
                                                variant={isActive ? 'default' : 'outline'}
                                                size="sm"
                                                className={cn('gap-2 h-7')}
                                            >
                                                <div className={cn('w-2 h-2 rounded-full', item.bg)} />
                                                <span className="hidden sm:inline">{item.label}</span>
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Month markers */}
                <div className="hidden sm:block">
                    <div className="flex justify-between mb-1">
                        {months.map((m, idx) => (
                            <div key={m.label} className={cn('text-xs text-muted-foreground text-center w-8', idx % 2 !== 0 && 'hidden md:block')}>
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
                            const isDimmed = selectedCycleUuid !== null && !isSelected;

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

                <div className="max-h-[60vh] min-h-[400px] sm:min-h-[600px] overflow-y-auto p-2">
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
                                    className={cn('w-full border', styles.border, styles.shadow)}
                                    accentColor={styles.accent}
                                    badgeBorder={styles.badgeBorder}
                                    gradientColor={styles.gradient}
                                    showDetails={showDetails}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        </PageTemplate>
    );
}
