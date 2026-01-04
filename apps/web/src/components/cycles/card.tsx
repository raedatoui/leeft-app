'use client';

import { FileText, MapPin } from 'lucide-react';
import Link from 'next/link';
import type { FC } from 'react';
import { TopExercisesList } from '@/components/analysis/topExercisesList';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkoutStatsGrid } from '@/components/workouts/workoutStatsGrid';

import { cn, computeStats, formatDate } from '@/lib/utils';
import type { ExerciseMap, Workout } from '@/types';

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
    onClick?: (e: React.MouseEvent) => void;
    onSelect?: () => void;
}

export const CycleCard: FC<CycleProps> = ({
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
                        <TopExercisesList exercises={topExercises} exerciseMap={exerciseMap} />
                    </div>
                )}

                {/* Note */}
                {note && (
                    <div className="flex items-start gap-2 border-t border-zinc-800 pt-2 text-xs bg-zinc-900/30 -mx-6 px-6 pb-1">
                        <FileText size={14} className="shrink-0 mt-0.5 text-muted-foreground" />
                        <p className="line-clamp-3 text-muted-foreground leading-relaxed">{note}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
