import { fetchCycles } from '@/lib/fetchData';
import CycleDetailsPage from '@/pageComponents/cycleDetailsPage';

export async function generateStaticParams() {
    try {
        const cycles = await fetchCycles();
        return cycles.map((cycle) => ({
            id: cycle.uuid,
        }));
    } catch (error) {
        console.error('Error fetching cycles for static params:', error);
        return [];
    }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <CycleDetailsPage id={id} />;
}
