import type { ExerciseMap } from '@/types';

export function getUniqueValues(exerciseMap: ExerciseMap) {
    const muscles = new Set<string>();
    const cats = new Set<string>();
    const equips = new Set<string>();

    for (const ex of exerciseMap.values()) {
        if (ex.primaryMuscleGroup) muscles.add(ex.primaryMuscleGroup);
        if (ex.category) cats.add(ex.category);
        if (ex.equipment) {
            for (const eq of ex.equipment) {
                equips.add(eq);
            }
        }
    }

    return {
        muscleGroups: Array.from(muscles).sort(),
        categories: Array.from(cats).sort(),
        equipmentList: Array.from(equips).sort(),
    };
}
