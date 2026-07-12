import type { Metadata } from 'next';
import MobilityPageV2 from '@/pageComponents/v2/mobilityPageV2';

export const metadata: Metadata = { title: 'Mobility' };

export default function Page() {
    return <MobilityPageV2 />;
}
