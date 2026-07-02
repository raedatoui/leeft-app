'use client';

import { EFFORT_TIERS, type EffortTier } from '@/lib/cardio-effort';

interface EffortTierToggleProps {
    value: EffortTier;
    onChange: (value: EffortTier) => void;
    label?: string;
}

export default function EffortTierToggle({ value, onChange, label = 'Cardio' }: EffortTierToggleProps) {
    return (
        <div className="toolbar-grp">
            <span className="label-mono" style={{ padding: '0 8px' }}>
                {label}
            </span>
            <div className="seg" role="radiogroup" aria-label="Cardio effort">
                {EFFORT_TIERS.map((tier) => (
                    <button
                        key={tier.value}
                        type="button"
                        className={`seg-btn${value === tier.value ? ' active' : ''}`}
                        onClick={() => onChange(tier.value)}
                    >
                        {tier.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
