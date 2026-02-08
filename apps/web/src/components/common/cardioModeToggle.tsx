'use client';

import { Heart, HeartOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCardioSettings, useWorkoutData } from '@/lib/contexts';

interface CardioModeToggleProps {
    showCounts?: boolean;
}

export function CardioModeToggle({ showCounts = true }: CardioModeToggleProps) {
    const { cardioWorkouts, cardioWorkoutsStrict } = useWorkoutData();
    const { useStrictCardio, setUseStrictCardio } = useCardioSettings();

    const permissiveCount = cardioWorkouts.length;
    const strictCount = cardioWorkoutsStrict.length;
    const diff = permissiveCount - strictCount;

    return (
        <div className="flex items-center gap-2">
            <Button
                onClick={() => setUseStrictCardio(!useStrictCardio)}
                variant={useStrictCardio ? 'default' : 'outline'}
                size="sm"
                className="h-8 gap-2"
                title={
                    useStrictCardio
                        ? 'Strict mode: Filters out questionable auto-detected workouts'
                        : 'Permissive mode: Includes all detected workouts'
                }
            >
                {useStrictCardio ? <Heart className="h-3 w-3" /> : <HeartOff className="h-3 w-3" />}
                <span>{useStrictCardio ? 'Strict' : 'All'}</span>
                {showCounts && (
                    <span className="font-bold text-xs opacity-70">
                        {useStrictCardio ? strictCount : permissiveCount}
                        {!useStrictCardio && diff > 0 && <span className="text-muted-foreground ml-1">(+{diff})</span>}
                    </span>
                )}
            </Button>
        </div>
    );
}
