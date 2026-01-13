'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PeriodStepperProps {
    label: string;
    onPrevious: () => void;
    onNext: () => void;
    hasPrevious: boolean;
    hasNext: boolean;
}

export default function PeriodStepper({ label, onPrevious, onNext, hasPrevious, hasNext }: PeriodStepperProps) {
    return (
        <div className="flex items-center gap-3">
            <Button onClick={onPrevious} disabled={!hasPrevious} size="icon" variant="outline" className="h-8 w-8 rounded-full">
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[160px] text-center">{label}</span>
            <Button onClick={onNext} disabled={!hasNext} size="icon" variant="outline" className="h-8 w-8 rounded-full">
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    );
}
