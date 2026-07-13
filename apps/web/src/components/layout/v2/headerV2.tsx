'use client';

import { BicepsFlexed, CalendarDays, ChartColumn, Dumbbell, HeartPulse, PersonStanding, Plus, Repeat2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CSSProperties } from 'react';
import RefreshButtonV2 from './refreshButtonV2';
import ThemeToggleV2 from './themeToggleV2';

const NAV = [
    { href: '/', label: 'Log', color: 'var(--maint)', icon: Dumbbell },
    { href: '/add', label: 'Add', color: 'var(--zone)', icon: Plus },
    { href: '/stats', label: 'Stats', color: 'var(--maint)', icon: ChartColumn },
    { href: '/monthly', label: 'Monthly', color: 'var(--maint)', icon: CalendarDays },
    { href: '/cycles', label: 'Cycles', color: 'var(--strength)', icon: Repeat2 },
    { href: '/exercises', label: 'Exercises', color: 'var(--hyper)', icon: BicepsFlexed },
    { href: '/cardio', label: 'Cardio', color: 'var(--cardio)', icon: HeartPulse },
    { href: '/mobility', label: 'Mobility', color: 'var(--break)', icon: PersonStanding },
];

const isActivePath = (pathname: string | null, href: string) => pathname === href || (href !== '/' && (pathname?.startsWith(`${href}/`) ?? false));

export default function HeaderV2() {
    const pathname = usePathname();

    return (
        <>
            <nav className="nav">
                <Link href="/" className="brand">
                    <span className="lift" aria-hidden="true">
                        🏋️
                    </span>
                    <span className="word">LEEFT</span>
                </Link>

                <div className="u-flex u-items-center u-gap-6">
                    <div className="nav-links">
                        {NAV.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={isActivePath(pathname, item.href) ? 'active' : ''}
                                    style={{ color: item.color }}
                                >
                                    <Icon size={15} strokeWidth={1.75} aria-hidden="true" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                    <RefreshButtonV2 />
                    <ThemeToggleV2 />
                </div>
            </nav>

            {/* mobile-only bottom tab dock — hidden ≥769px in v2.css */}
            <nav className="dock" aria-label="Primary">
                {NAV.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`dock-item${isActivePath(pathname, item.href) ? ' active' : ''}`}
                            style={{ '--dock-c': item.color } as CSSProperties}
                        >
                            <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
        </>
    );
}
