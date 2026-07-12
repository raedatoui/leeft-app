import type { Metadata } from 'next';
import CyclesPageV2 from '@/pageComponents/v2/cyclesPageV2';

export const metadata: Metadata = { title: 'Cycles' };

export default function Page() {
    return <CyclesPageV2 />;
}
