import type { Metadata } from 'next';
import HomePageV2 from '@/pageComponents/v2/homePageV2';

export const metadata: Metadata = { title: 'Home' };

export default function Page() {
    return <HomePageV2 />;
}
