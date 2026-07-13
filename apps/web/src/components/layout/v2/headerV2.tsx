'use client';

import { BicepsFlexed, CalendarDays, ChartColumn, Dumbbell, HeartPulse, PersonStanding, Plus, Repeat2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type CSSProperties, useEffect, useState } from 'react';
import { fmtClock } from '@/lib/addWorkoutFormat';
import { useAddWorkoutSession } from '@/lib/addWorkoutSession';
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

// Same isolated once-a-second tick as LiveClockV2, so the nav doesn't re-render on it.
// Frozen at the final time once the session has ended (done phase, not yet saved).
function SessionTimer({ startedAt, endedAt }: { startedAt: number; endedAt: number | null }) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (endedAt !== null) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [endedAt]);

    return <>{fmtClock((endedAt ?? now) - startedAt)}</>;
}

export default function HeaderV2() {
    const pathname = usePathname();
    const { startedAt, endedAt } = useAddWorkoutSession();
    const sessionActive = startedAt !== null;

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
                            if (item.href === '/add' && sessionActive) {
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`nav-live${isActivePath(pathname, item.href) ? ' active' : ''}`}
                                        style={{ color: 'var(--hyper)' }}
                                    >
                                        <span className="rec" aria-hidden="true" />
                                        <span className="nav-live-time">
                                            <SessionTimer startedAt={startedAt} endedAt={endedAt} />
                                        </span>
                                        Live
                                    </Link>
                                );
                            }
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
                    if (item.href === '/add' && sessionActive) {
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`dock-item dock-live${isActivePath(pathname, item.href) ? ' active' : ''}`}
                                style={{ '--dock-c': 'var(--hyper)' } as CSSProperties}
                            >
                                <span className="dock-live-time">
                                    <SessionTimer startedAt={startedAt} endedAt={endedAt} />
                                </span>
                                <span>Live</span>
                            </Link>
                        );
                    }
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
