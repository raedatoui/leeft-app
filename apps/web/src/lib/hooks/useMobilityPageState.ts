'use client';

import { useMemo, useState } from 'react';
import { type MobilityMovement, mobilityMovements } from '@/lib/mobility';

export type MobilityView = 'database' | 'program';

export interface MobilityHeadlineStats {
    count: number;
    regionCount: number;
    withVideo: number;
    highConf: number;
}

export interface MobilityPageState {
    view: MobilityView;
    setView: (view: MobilityView) => void;
    regionFilter: string;
    setRegionFilter: (region: string) => void;
    typeFilter: string;
    setTypeFilter: (type: string) => void;
    equipFilter: string;
    setEquipFilter: (equip: string) => void;
    hasActiveFilters: boolean;
    clearFilters: () => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    filteredMovements: MobilityMovement[];
    headlineStats: MobilityHeadlineStats;
}

export function useMobilityPageState(): MobilityPageState {
    const [view, setView] = useState<MobilityView>('database');
    const [regionFilter, setRegionFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [equipFilter, setEquipFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredMovements = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        // Preserve the curated JSON order (grouped by region) instead of sorting.
        return mobilityMovements.filter((m) => {
            if (regionFilter !== 'all' && m.region !== regionFilter) return false;
            if (typeFilter !== 'all' && m.type !== typeFilter) return false;
            if (equipFilter !== 'all' && !m.equip_tags.includes(equipFilter)) return false;
            if (q !== '') {
                const haystack = `${m.name} ${m.aliases} ${m.target} ${m.notes} ${m.source} ${m.position}`.toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            return true;
        });
    }, [regionFilter, typeFilter, equipFilter, searchQuery]);

    const headlineStats = useMemo<MobilityHeadlineStats>(() => {
        const regions = new Set<string>();
        let withVideo = 0;
        let highConf = 0;
        for (const m of filteredMovements) {
            regions.add(m.region);
            if (m.video !== '') withVideo++;
            if (m.conf === 'High') highConf++;
        }
        return {
            count: filteredMovements.length,
            regionCount: regions.size,
            withVideo,
            highConf,
        };
    }, [filteredMovements]);

    const hasActiveFilters = regionFilter !== 'all' || typeFilter !== 'all' || equipFilter !== 'all' || searchQuery.trim() !== '';

    return {
        view,
        setView,
        regionFilter,
        setRegionFilter,
        typeFilter,
        setTypeFilter,
        equipFilter,
        setEquipFilter,
        hasActiveFilters,
        clearFilters: () => {
            setRegionFilter('all');
            setTypeFilter('all');
            setEquipFilter('all');
            setSearchQuery('');
        },
        searchQuery,
        setSearchQuery,
        filteredMovements,
        headlineStats,
    };
}
