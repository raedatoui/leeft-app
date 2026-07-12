import type { Metadata } from 'next';
import ExercisesLibraryPageV2 from '@/pageComponents/v2/exercisesLibraryPageV2';

export const metadata: Metadata = { title: 'Exercises' };

export default function Page() {
    return <ExercisesLibraryPageV2 />;
}
