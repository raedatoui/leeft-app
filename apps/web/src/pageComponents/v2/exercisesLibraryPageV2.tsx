'use client';

import { useMemo } from 'react';
import ExerciseCellV2 from '@/components/exercises/v2/exerciseCellV2';
import PageTemplateV2 from '@/components/layout/v2/pageTemplateV2';
import DropdownV2, { type DropdownV2Option } from '@/components/ui/v2/dropdownV2';
import { useExercisesLibraryState } from '@/lib/hooks/useExercisesLibraryState';

export default function ExercisesLibraryPageV2() {
    const {
        muscleFilter,
        setMuscleFilter,
        categoryFilter,
        setCategoryFilter,
        equipmentFilter,
        setEquipmentFilter,
        searchQuery,
        setSearchQuery,
        filteredExercises,
        headlineStats,
        muscleGroups,
        categories,
        equipmentList,
        exerciseMap,
    } = useExercisesLibraryState();

    const muscleGroupById = useMemo(() => new Map(muscleGroups.map((mg) => [mg.id, mg])), [muscleGroups]);
    const totalExercises = exerciseMap.size;

    const muscleOptions = useMemo<DropdownV2Option[]>(
        () => [{ value: 'all', label: 'All' }, ...muscleGroups.map((m) => ({ value: m.id, label: m.name, color: m.color }))],
        [muscleGroups]
    );
    const categoryOptions = useMemo<DropdownV2Option[]>(
        () => [{ value: 'all', label: 'All' }, ...categories.map((c) => ({ value: c, label: c }))],
        [categories]
    );
    const equipmentOptions = useMemo<DropdownV2Option[]>(
        () => [{ value: 'all', label: 'All' }, ...equipmentList.map((e) => ({ value: e, label: e }))],
        [equipmentList]
    );

    return (
        <PageTemplateV2 footer={`Showing ${filteredExercises.length} of ${totalExercises} exercises`}>
            <section className="hero-row">
                <div className="hero-block">
                    <div className="hero-title medium" style={{ color: 'var(--hyper)' }}>
                        Exercises
                    </div>
                    <div className="hero-meta">
                        <span className="label">
                            Library · {filteredExercises.length} / {totalExercises}
                        </span>
                        <span className="stats">
                            <span>
                                <b>{headlineStats.count}</b>exercises
                            </span>
                            <span>
                                <b>{headlineStats.muscleCount}</b>muscle groups
                            </span>
                            <span>
                                <b>{headlineStats.categoryCount}</b>categories
                            </span>
                            <span>
                                <b>{headlineStats.equipmentCount}</b>equipment types
                            </span>
                        </span>
                    </div>
                </div>
            </section>

            <div className="toolbar u-mb-8">
                <div className="toolbar-grp">
                    <input
                        className="search-input"
                        placeholder="Search exercises…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <span className="toolbar-divider" />

                <div className="toolbar-grp">
                    <span className="label-mono" style={{ padding: '0 8px' }}>
                        Muscle
                    </span>
                    <DropdownV2 value={muscleFilter} options={muscleOptions} onChange={setMuscleFilter} size="md" ariaLabel="Muscle" />
                </div>

                <div className="toolbar-grp">
                    <span className="label-mono" style={{ padding: '0 8px' }}>
                        Category
                    </span>
                    <DropdownV2 value={categoryFilter} options={categoryOptions} onChange={setCategoryFilter} size="md" ariaLabel="Category" />
                </div>

                <div className="toolbar-grp">
                    <span className="label-mono" style={{ padding: '0 8px' }}>
                        Equipment
                    </span>
                    <DropdownV2 value={equipmentFilter} options={equipmentOptions} onChange={setEquipmentFilter} size="md" ariaLabel="Equipment" />
                </div>
            </div>

            {filteredExercises.length === 0 ? (
                <div className="empty-state">No exercises match the current filters.</div>
            ) : (
                <>
                    <div className="panel-label">
                        <span>Exercises · {filteredExercises.length} matching</span>
                        <span className="hint">click a row to drill in</span>
                    </div>
                    <section className="exercise-grid">
                        {filteredExercises.map((ex, i) => (
                            <ExerciseCellV2
                                key={ex.id}
                                exercise={ex}
                                indexLabel={String(i + 1).padStart(3, '0')}
                                muscleGroup={muscleGroupById.get(ex.primaryMuscleGroup)}
                            />
                        ))}
                    </section>
                </>
            )}
        </PageTemplateV2>
    );
}
