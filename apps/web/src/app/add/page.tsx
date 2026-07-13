import type { Metadata } from 'next';
import AddWorkoutPageV2 from '@/pageComponents/v2/addWorkoutPageV2';

export const metadata: Metadata = { title: 'Add Workout' };

export default function Page() {
    return <AddWorkoutPageV2 />;
}
