import type { Metadata } from 'next';
import { fetchCycles } from '@/lib/fetchData';
import CycleDetailPageV2 from '@/pageComponents/v2/cycleDetailPageV2';

// Static section title: per-cycle names would re-fetch the artifact for every page at build.
export const metadata: Metadata = { title: 'Cycle' };

// No try/catch: a failed fetch must fail the build, not silently ship zero detail pages.
export async function generateStaticParams() {
    const cycles = await fetchCycles();
    return cycles.map((cycle) => ({ id: cycle.uuid }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <CycleDetailPageV2 id={id} />;
}
