'use client';

import type { MobilityMovement } from '@/lib/mobility';
import { confColors, regionColor } from '@/lib/mobility-theme';

interface MovementCardV2Props {
    movement: MobilityMovement;
}

export default function MovementCardV2({ movement }: MovementCardV2Props) {
    const color = regionColor(movement.region);

    return (
        <div className="mob-card">
            <div className="top">
                <span className="mob-dot" style={{ background: color }} />
                <h3>{movement.name}</h3>
                <span className="conf-badge" style={{ color: confColors[movement.conf] }}>
                    {movement.conf}
                </span>
            </div>
            <div className="tags">
                <span className="chip outline" style={{ color, borderColor: color }}>
                    {movement.region}
                </span>
                <span className="chip">{movement.type}</span>
                {movement.position && <span className="chip">{movement.position}</span>}
            </div>
            <div className="mob-body">
                {movement.dosage && (
                    <div className="mob-row dosage">
                        <span className="k">Dosage</span>
                        <span className="v">{movement.dosage}</span>
                    </div>
                )}
                <div className="mob-row">
                    <span className="k">Target</span>
                    <span className="v">{movement.target}</span>
                </div>
                {movement.equipment && movement.equipment !== 'None' && (
                    <div className="mob-row">
                        <span className="k">Equipment</span>
                        <span className="v">{movement.equipment}</span>
                    </div>
                )}
            </div>
            <div className="mob-foot">
                {movement.video ? (
                    <a className="mob-video" href={movement.video} target="_blank" rel="noopener noreferrer">
                        Video ↗
                    </a>
                ) : (
                    <span className="mob-video none">no video</span>
                )}
            </div>
        </div>
    );
}
