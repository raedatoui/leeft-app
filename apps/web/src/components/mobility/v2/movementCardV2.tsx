'use client';

import DetailCardV2, { type DetailCardRow } from '@/components/ui/v2/detailCardV2';
import type { MobilityMovement } from '@/lib/mobility';
import { regionColor } from '@/lib/mobility-theme';

interface MovementCardV2Props {
    movement: MobilityMovement;
}

export default function MovementCardV2({ movement }: MovementCardV2Props) {
    const color = regionColor(movement.region);

    const rows: DetailCardRow[] = [];
    if (movement.dosage) rows.push({ key: 'dosage', label: 'Dosage', value: movement.dosage, emphasize: true });
    rows.push({ key: 'target', label: 'Target', value: movement.target });
    if (movement.equipment && movement.equipment !== 'None') rows.push({ key: 'equipment', label: 'Equipment', value: movement.equipment });

    return (
        <DetailCardV2
            title={movement.name}
            tags={
                <>
                    <span className="chip outline" style={{ color, borderColor: color }}>
                        {movement.region}
                    </span>
                    <span className="chip">{movement.type}</span>
                    {movement.position && <span className="chip">{movement.position}</span>}
                </>
            }
            rows={rows}
            footer={
                movement.video ? (
                    <a className="detail-link" href={movement.video} target="_blank" rel="noopener noreferrer">
                        Video ↗
                    </a>
                ) : (
                    <span className="detail-link none">no video</span>
                )
            }
        />
    );
}
