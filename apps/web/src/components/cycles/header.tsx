'use client';

import { Calendar, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, formatDate } from '@/lib/utils';
import type { MappedCycle } from '@/types';

interface CycleHeaderProps {
    cycle: MappedCycle;
    onClose?: () => void;
}

export function getCycleColor(type: string) {
    switch (type) {
        case 'hypertrophy':
            return 'text-red-500 border-red-500';
        case 'break':
            return 'text-blue-500 border-blue-500';
        case 'maintenance':
            return 'text-yellow-500 border-yellow-500';
        case 'strength':
            return 'text-green-500 border-green-500';
        default:
            return 'text-yellow-500 border-yellow-500';
    }
}

export default function CycleHeader({ cycle, onClose }: CycleHeaderProps) {
    const cycleColorClass = getCycleColor(cycle.type);

    return (
        <div className="flex flex-row justify-between items-center">
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-start gap-4">
                    {/* Name + Type + Meta - all horizontal */}
                    <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2">
                        <h2 className={cn('text-xl sm:text-2xl font-bold tracking-tight uppercase leading-none', cycleColorClass.split(' ')[0])}>
                            {cycle.name}
                        </h2>
                        <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                            <Calendar size={14} className="text-primary/60" />
                            <span>
                                {formatDate(cycle.dates[0])} — {formatDate(cycle.dates[1])}
                            </span>
                        </div>
                        {cycle.location && (
                            <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                                <MapPin size={14} className="text-primary/60" />
                                <span>{cycle.location}</span>
                            </div>
                        )}
                        <div className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-xs font-bold">
                            {cycle.workouts?.length || 0} Workouts
                        </div>
                        <div className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-xs font-bold">
                            {Math.ceil((new Date(cycle.dates[1]).getTime() - new Date(cycle.dates[0]).getTime()) / (1000 * 60 * 60 * 24)) + 1} Days
                        </div>
                    </div>
                </div>

                {cycle.note && (
                    <div className="text-muted-foreground max-w-4xl text-sm leading-relaxed border-l-2 border-primary/20 pl-4 py-1 italic">
                        {cycle.note}
                    </div>
                )}
            </div>
            {onClose && (
                <Button onClick={onClose} variant="default" size="icon" className="rounded-full h-10 w-10 shadow-md">
                    <X className="h-6 w-6" />
                    <span className="sr-only">Close</span>
                </Button>
            )}
        </div>
    );
}
