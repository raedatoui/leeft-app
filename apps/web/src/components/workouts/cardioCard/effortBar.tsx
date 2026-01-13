import type { FC } from 'react';
import type { Effort } from '@/types';

interface EffortBarProps {
    effort: Effort[];
}

// Zone colors matching fitness tracker zones
const zoneColors: Record<string, string> = {
    sedentary: '#9E9E9E', // Gray
    lightly: '#4CAF50', // Green
    fairly: '#FFEB3B', // Yellow
    very: '#FF5722', // Orange-red
};

const zoneLabels: Record<string, string> = {
    sedentary: 'Rest',
    lightly: 'Light',
    fairly: 'Moderate',
    very: 'Intense',
};

export const EffortBar: FC<EffortBarProps> = ({ effort }) => {
    // Filter out zones with 0 minutes
    const activeZones = effort.filter((e) => e.minutes > 0);

    if (activeZones.length === 0) return null;

    return (
        <div className="space-y-2">
            {/* Stacked Bar */}
            <div className="flex h-6 w-full">
                {(() => {
                    const visibleZones = effort.filter((z) => z.minutes > 0);
                    const totalEffortMinutes = visibleZones.reduce((sum, z) => sum + z.minutes, 0);

                    return visibleZones.map((zone, index) => {
                        const percentage = (zone.minutes / totalEffortMinutes) * 100;
                        const isFirst = index === 0;
                        const isLast = index === visibleZones.length - 1;

                        return (
                            <div
                                key={zone.name}
                                className={`flex items-center justify-center text-xs font-bold ${isFirst ? 'rounded-l-lg' : ''} ${isLast ? 'rounded-r-lg' : ''}`}
                                style={{
                                    width: `${percentage}%`,
                                    backgroundColor: zoneColors[zone.name],
                                    color: zone.name === 'fairly' ? '#000' : '#fff',
                                }}
                            >
                                {percentage > 10 && `${zone.minutes}m`}
                            </div>
                        );
                    });
                })()}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {activeZones.map((zone) => (
                    <div key={zone.name} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: zoneColors[zone.name] }} />
                        <span className="text-muted-foreground">
                            {zoneLabels[zone.name]}: {zone.minutes}m
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};
