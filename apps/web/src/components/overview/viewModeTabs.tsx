'use client';

import { Button } from '@/components/ui/button';
import type { ViewMode } from '@/lib/overview-utils';

interface ViewModeTabsProps {
    value: ViewMode;
    onChange: (mode: ViewMode) => void;
}

export default function ViewModeTabs({ value, onChange }: ViewModeTabsProps) {
    const modes: { mode: ViewMode; label: string }[] = [
        { mode: 'week', label: 'Week' },
        { mode: 'month', label: 'Month' },
        { mode: 'cycle', label: 'Cycle' },
    ];

    return (
        <div className="flex items-center gap-1">
            {modes.map(({ mode, label }) => (
                <Button key={mode} onClick={() => onChange(mode)} variant={value === mode ? 'default' : 'outline'} size="sm" className="h-8">
                    {label}
                </Button>
            ))}
        </div>
    );
}
