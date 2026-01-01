'use client';

import { BicepsFlexed, Dumbbell, Layers } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ControlCard } from '@/components/controlCard';
import PageTemplate from '@/components/pageTemplate';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkouts } from '@/lib/contexts';

export default function ExercisesPage() {
    const { exerciseMap, isLoading } = useWorkouts();
    const [muscleFilter, setMuscleFilter] = useState<string>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [equipmentFilter, setEquipmentFilter] = useState<string>('all');

    // Extract unique values for filters (for the dropdown options - always all available)
    const { muscleGroups, categories, equipmentList } = useMemo(() => {
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
    }, [exerciseMap]);

    // Filter exercises
    const filteredExercises = useMemo(() => {
        return Array.from(exerciseMap.values())
            .filter((ex) => {
                const matchesMuscle = muscleFilter === 'all' || ex.primaryMuscleGroup === muscleFilter;
                const matchesCategory = categoryFilter === 'all' || ex.category === categoryFilter;
                const matchesEquipment = equipmentFilter === 'all' || ex.equipment?.includes(equipmentFilter);
                return matchesMuscle && matchesCategory && matchesEquipment;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [exerciseMap, muscleFilter, categoryFilter, equipmentFilter]);

    // Calculate stats based on filtered exercises
    const stats = useMemo(() => {
        const muscles = new Set<string>();
        const cats = new Set<string>();
        const equips = new Set<string>();

        for (const ex of filteredExercises) {
            if (ex.primaryMuscleGroup) muscles.add(ex.primaryMuscleGroup);
            if (ex.category) cats.add(ex.category);
            if (ex.equipment) {
                for (const eq of ex.equipment) {
                    equips.add(eq);
                }
            }
        }

        return {
            count: filteredExercises.length,
            muscleCount: muscles.size,
            categoryCount: cats.size,
            equipmentCount: equips.size,
        };
    }, [filteredExercises]);

    if (isLoading) {
        return (
            <PageTemplate
                title="Exercises"
                stickyHeader={
                    <div className="flex flex-col gap-6">
                        <div className="mt-6">Loading...</div>
                    </div>
                }
            >
                <div />
            </PageTemplate>
        );
    }

    return (
        <PageTemplate
            title="Exercises"
            stickyHeader={
                <div className="flex flex-col gap-4">
                    {/* Stats Card */}
                    <ControlCard className="w-full">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center divide-x-0 md:divide-x divide-border">
                            <div className="flex flex-col gap-1">
                                <span className="text-2xl font-bold text-primary">{stats.count}</span>
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Exercises</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-2xl font-bold text-primary">{stats.muscleCount}</span>
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Groups</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-2xl font-bold text-primary">{stats.categoryCount}</span>
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Categories</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-2xl font-bold text-primary">{stats.equipmentCount}</span>
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Equipment</span>
                            </div>
                        </div>
                    </ControlCard>

                    {/* Filters */}
                    <ControlCard className="w-full">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex flex-row items-center gap-2">
                                <div className="flex items-center gap-2 text-lg font-medium text-primary whitespace-nowrap">
                                    <BicepsFlexed className="w-8 h-8" />
                                    Muscle Group
                                </div>
                                <Select value={muscleFilter} onValueChange={setMuscleFilter}>
                                    <SelectTrigger className="h-8 text-xs flex-1">
                                        <SelectValue placeholder="All Muscle Groups" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Muscle Groups</SelectItem>
                                        {muscleGroups.map((m) => (
                                            <SelectItem key={m} value={m}>
                                                {m}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-row items-center gap-2">
                                <div className="flex items-center gap-2 text-lg font-medium text-primary whitespace-nowrap">
                                    <Layers className="w-8 h-8" />
                                    Category
                                </div>
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="h-8 text-xs flex-1">
                                        <SelectValue placeholder="All Categories" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {categories.map((c) => (
                                            <SelectItem key={c} value={c}>
                                                {c}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-row items-center gap-2">
                                <div className="flex items-center gap-2 text-lg font-medium text-primary whitespace-nowrap">
                                    <Dumbbell className="w-8 h-8" />
                                    Equipment
                                </div>
                                <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
                                    <SelectTrigger className="h-8 text-xs flex-1">
                                        <SelectValue placeholder="All Equipment" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Equipment</SelectItem>
                                        {equipmentList.map((e) => (
                                            <SelectItem key={e} value={e}>
                                                {e}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </ControlCard>
                </div>
            }
        >
            {/* Exercise List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {filteredExercises.map((ex) => (
                    <Link key={ex.id} href={`/exercises/${ex.id}`} className="no-underline">
                        <Card className="transition-all duration-300 h-full hover:scale-[1.02] hover:shadow-none">
                            <CardHeader>
                                <div className="flex justify-between items-start gap-4">
                                    <CardTitle className="text-lg font-medium">{ex.name}</CardTitle>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <Badge variant="outline" className="text-xs">
                                        {ex.primaryMuscleGroup}
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs">
                                        {ex.category}
                                    </Badge>
                                </div>
                                {ex.equipment && ex.equipment.length > 0 && (
                                    <CardDescription className="mt-2 text-xs">{ex.equipment.join(', ')}</CardDescription>
                                )}
                            </CardHeader>
                        </Card>
                    </Link>
                ))}
                {filteredExercises.length === 0 && (
                    <div className="col-span-full text-center text-muted-foreground py-10">No exercises found matching the selected filters.</div>
                )}
            </div>
        </PageTemplate>
    );
}
