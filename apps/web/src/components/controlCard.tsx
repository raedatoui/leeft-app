import type React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ControlCardProps extends React.ComponentProps<typeof Card> {
    children: React.ReactNode;
}

export function ControlCard({ className, children, ...props }: ControlCardProps) {
    return (
        <Card className={cn('w-full lg:w-auto shadow-md rounded-xl  border border-yellow-500/40', className)} {...props}>
            <CardContent className="p-4">{children}</CardContent>
        </Card>
    );
}
