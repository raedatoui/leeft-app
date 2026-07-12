import type { Metadata } from 'next';
import CardioPageV2 from '@/pageComponents/v2/cardioPageV2';

export const metadata: Metadata = { title: 'Cardio' };

export default function Page() {
    return <CardioPageV2 />;
}
