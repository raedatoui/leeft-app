'use client';

import { useMemo } from 'react';
import PageTemplateV2 from '@/components/layout/v2/pageTemplateV2';
import MobilityProgramView from '@/components/mobility/v2/mobilityProgramView';
import MovementCardV2 from '@/components/mobility/v2/movementCardV2';
import DropdownV2, { type DropdownV2Option } from '@/components/ui/v2/dropdownV2';
import { useMobilityPageState } from '@/lib/hooks/useMobilityPageState';
import { mobilityEquipTags, mobilityMovements, mobilityRegions, mobilityTypes } from '@/lib/mobility';
import { regionColor } from '@/lib/mobility-theme';

export default function MobilityPageV2() {
    const {
        view,
        setView,
        regionFilter,
        setRegionFilter,
        typeFilter,
        setTypeFilter,
        equipFilter,
        setEquipFilter,
        hasActiveFilters,
        clearFilters,
        searchQuery,
        setSearchQuery,
        filteredMovements,
        headlineStats,
    } = useMobilityPageState();

    const totalMovements = mobilityMovements.length;

    const regionOptions = useMemo<DropdownV2Option[]>(
        () => [{ value: 'all', label: 'All' }, ...mobilityRegions.map((r) => ({ value: r, label: r, color: regionColor(r) }))],
        []
    );
    const typeOptions = useMemo<DropdownV2Option[]>(
        () => [{ value: 'all', label: 'All' }, ...mobilityTypes.map((t) => ({ value: t, label: t }))],
        []
    );
    const equipOptions = useMemo<DropdownV2Option[]>(
        () => [{ value: 'all', label: 'All' }, ...mobilityEquipTags.map((e) => ({ value: e, label: e }))],
        []
    );

    return (
        <PageTemplateV2 footer={`Showing ${filteredMovements.length} of ${totalMovements} movements`}>
            <section className="hero-row">
                <div className="hero-block">
                    <div className="hero-title medium" style={{ color: 'var(--break)' }}>
                        Mobility
                    </div>
                    <div className="hero-meta">
                        <span className="label">
                            PT Library · {filteredMovements.length} / {totalMovements}
                        </span>
                        <span className="stats">
                            <span>
                                <b>{headlineStats.count}</b>movements
                            </span>
                            <span>
                                <b>{headlineStats.regionCount}</b>regions
                            </span>
                            <span>
                                <b>{headlineStats.withVideo}</b>with video
                            </span>
                            <span>
                                <b>{headlineStats.highConf}</b>high confidence
                            </span>
                        </span>
                    </div>
                </div>
            </section>

            <div className="toolbar u-mb-8">
                <div className="toolbar-grp">
                    <div className="seg" role="radiogroup" aria-label="View">
                        <button type="button" className={`seg-btn${view === 'database' ? ' active' : ''}`} onClick={() => setView('database')}>
                            Database
                        </button>
                        <button type="button" className={`seg-btn${view === 'program' ? ' active' : ''}`} onClick={() => setView('program')}>
                            Program
                        </button>
                    </div>
                </div>

                {view === 'database' && (
                    <>
                        <span className="toolbar-divider" />
                        <div className="toolbar-grp">
                            <input
                                className="search-input"
                                placeholder="Search movements…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <span className="toolbar-divider" />

                        <div className="toolbar-grp">
                            <span className="label-mono" style={{ padding: '0 8px' }}>
                                Region
                            </span>
                            <DropdownV2 value={regionFilter} options={regionOptions} onChange={setRegionFilter} size="md" ariaLabel="Region" />
                        </div>

                        <div className="toolbar-grp">
                            <span className="label-mono" style={{ padding: '0 8px' }}>
                                Type
                            </span>
                            <DropdownV2 value={typeFilter} options={typeOptions} onChange={setTypeFilter} size="md" ariaLabel="Type" />
                        </div>

                        <div className="toolbar-grp">
                            <span className="label-mono" style={{ padding: '0 8px' }}>
                                Equipment
                            </span>
                            <DropdownV2 value={equipFilter} options={equipOptions} onChange={setEquipFilter} size="md" ariaLabel="Equipment" />
                        </div>

                        {hasActiveFilters && (
                            <div className="toolbar-grp">
                                <button type="button" className="filter-pill" onClick={clearFilters}>
                                    ✕ Clear
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {view === 'program' ? (
                <MobilityProgramView />
            ) : filteredMovements.length === 0 ? (
                <div className="empty-state">No movements match the current filters.</div>
            ) : (
                <>
                    <div className="panel-label">
                        <span>Movements · {filteredMovements.length} matching</span>
                    </div>
                    <section className="exercise-grid">
                        {filteredMovements.map((movement) => (
                            <MovementCardV2 key={movement.id} movement={movement} />
                        ))}
                    </section>
                </>
            )}
        </PageTemplateV2>
    );
}
