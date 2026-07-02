import { useMemo } from 'react';
import type { MuscleGroup } from '@/lib/contexts';

export function useMuscleGroupColor(muscleGroups: MuscleGroup[]): (id: string | undefined) => string | undefined {
    return useMemo(() => {
        const lookup = new Map(muscleGroups.map((mg) => [mg.id, mg.color]));
        return (id: string | undefined) => (id ? lookup.get(id) : undefined);
    }, [muscleGroups]);
}
