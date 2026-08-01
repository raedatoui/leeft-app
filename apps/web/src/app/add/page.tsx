import type { Metadata } from 'next';
import AddAuthGate from '@/components/addWorkout/v2/addAuthGate';
import AddWorkoutPageV2 from '@/pageComponents/v2/addWorkoutPageV2';

export const metadata: Metadata = { title: 'Add Workout' };

export default function Page() {
    return (
        <AddAuthGate>
            <AddWorkoutPageV2 />
        </AddAuthGate>
    );
}
