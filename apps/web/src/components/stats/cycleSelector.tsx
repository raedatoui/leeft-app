'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MappedCycle } from '@/types';

interface CycleSelectorProps {
    cycles: MappedCycle[];
    selectedUuid: string | null;
    onSelect: (uuid: string) => void;
}

function formatCycleDateRange(cycle: MappedCycle): string {
    const start = cycle.dates[0];
    const end = cycle.dates[1];
    const startStr = start.toLocaleString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} - ${endStr}`;
}

export default function CycleSelector({ cycles, selectedUuid, onSelect }: CycleSelectorProps) {
    if (cycles.length === 0) {
        return <span className="text-sm text-muted-foreground">No cycles available</span>;
    }

    // Sort cycles by start date descending (most recent first)
    const sortedCycles = [...cycles].sort((a, b) => b.dates[0].getTime() - a.dates[0].getTime());

    return (
        <Select value={selectedUuid ?? undefined} onValueChange={onSelect}>
            <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select a cycle" />
            </SelectTrigger>
            <SelectContent>
                {sortedCycles.map((cycle) => (
                    <SelectItem key={cycle.uuid} value={cycle.uuid}>
                        <div className="flex flex-col">
                            <span className="font-medium">{cycle.name}</span>
                            <span className="text-xs text-muted-foreground">{formatCycleDateRange(cycle)}</span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
