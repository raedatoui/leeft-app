import { Suspense } from 'react';
import Loader from '@/components/common/loader';
import ExerciseComparePageV2 from '@/pageComponents/v2/exerciseComparePageV2';

export default function Page() {
    return (
        <Suspense fallback={<Loader />}>
            <ExerciseComparePageV2 />
        </Suspense>
    );
}
