'use client';

import { Activity, Calculator, Dumbbell, Heart, Scale, TrendingUp } from 'lucide-react';
import { ControlCard } from '@/components/common/controlCard';
import type { OverviewStats as OverviewStatsType } from '@/lib/overview-utils';
import { formatNumber } from '@/lib/overview-utils';

interface OverviewStatsProps {
    stats: OverviewStatsType;
}

export default function OverviewStats({ stats }: OverviewStatsProps) {
    const items = [
        {
            label: 'Total',
            value: stats.totalWorkouts,
            icon: Activity,
            color: '#F59E0B',
        },
        {
            label: 'Lifting',
            value: stats.liftingCount,
            icon: Dumbbell,
            color: '#F59E0B',
        },
        {
            label: 'Cardio',
            value: stats.cardioCount,
            icon: Heart,
            color: '#3B82F6',
        },
        ...(stats.averageWorkouts
            ? [
                  {
                      label: stats.averageWorkouts.label,
                      value: stats.averageWorkouts.value,
                      icon: Calculator,
                      color: '#EC4899',
                  },
              ]
            : []),
        {
            label: 'Volume',
            value: `${formatNumber(stats.totalVolume)} lbs`,
            icon: Scale,
            color: '#10B981',
        },
        {
            label: 'Avg RPE',
            value: stats.avgRpe !== null ? stats.avgRpe.toFixed(1) : '-',
            icon: TrendingUp,
            color: '#8B5CF6',
        },
    ];

    return (
        <ControlCard className="w-full">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                {items.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div key={item.label} className="flex items-center gap-2">
                            <Icon className="h-4 w-4" style={{ color: item.color }} />
                            <span className="text-sm text-muted-foreground">{item.label}:</span>
                            <span className="text-sm font-bold">{item.value}</span>
                        </div>
                    );
                })}
            </div>
        </ControlCard>
    );
}
