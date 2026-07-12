import type { Metadata } from 'next';
import StatsPageV2 from '@/pageComponents/v2/statsPageV2';

export const metadata: Metadata = { title: 'Stats' };

export default function Page() {
    return <StatsPageV2 />;
}
