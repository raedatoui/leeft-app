'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface HeaderProps {
    title: string;
    children?: ReactNode;
}

export default function Header({ title, children }: HeaderProps) {
    const pathname = usePathname();

    const getLinkClassName = (href: string) => {
        const isActive = href === '/' ? pathname === '/' : pathname?.startsWith(href);
        return cn('transition-colors hover:text-foreground', isActive ? 'text-primary font-medium' : 'text-muted-foreground');
    };

    return (
        <div className="border-border">
            <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-1 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0 relative min-h-[50px]">
                <div className="flex-1 flex w-full sm:w-auto justify-center sm:justify-start">
                    <Link href="/" className="text-primary hover:text-primary/90 no-underline">
                        <span className="text-xl sm:text-2xl font-bold flex items-center gap-1">
                            <span>🏋️</span>
                            <span>LEEFT</span>
                            <span className="inline-block scale-x-[-1]">🏋️</span>
                        </span>
                    </Link>
                </div>

                {title && (
                    <div className="sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 flex justify-center">
                        <h1 className="text-xl sm:text-4xl font-black tracking-tighter uppercase text-primary leading-none text-center">{title}</h1>
                        {children}
                    </div>
                )}

                <div className="flex-1 flex w-full sm:w-auto justify-center sm:justify-end">
                    <nav className="flex items-center gap-3 sm:gap-4 text-sm">
                        <Link href="/" className={getLinkClassName('/')}>
                            Workouts
                        </Link>
                        <Link href="/exercises" className={getLinkClassName('/exercises')}>
                            Exercises
                        </Link>
                        <Link href="/cycles" className={getLinkClassName('/cycles')}>
                            Cycles
                        </Link>
                        <Link href="/cardio" className={getLinkClassName('/cardio')}>
                            Cardio
                        </Link>
                        <Link href="/stats" className={getLinkClassName('/stats')}>
                            Stats
                        </Link>
                        <Link href="/analysis" className={getLinkClassName('/analysis')}>
                            Monthly
                        </Link>
                    </nav>
                </div>
            </div>
        </div>
    );
}
