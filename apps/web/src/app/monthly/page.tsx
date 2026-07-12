import type { Metadata } from 'next';
import MonthlyPageV2 from '@/pageComponents/v2/monthlyPageV2';

export const metadata: Metadata = { title: 'Monthly' };

export default function Page() {
    return <MonthlyPageV2 />;
}
