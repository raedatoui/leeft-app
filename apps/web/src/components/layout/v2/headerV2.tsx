'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggleV2 from './themeToggleV2';

const NAV = [
    { href: '/', label: 'Log', color: 'var(--maint)' },
    { href: '/stats', label: 'Stats', color: 'var(--maint)' },
    { href: '/monthly', label: 'Monthly', color: 'var(--maint)' },
    { href: '/cycles', label: 'Cycles', color: 'var(--strength)' },
    { href: '/exercises', label: 'Exercises', color: 'var(--hyper)' },
    { href: '/cardio', label: 'Cardio', color: 'var(--cardio)' },
    { href: '/mobility', label: 'Mobility', color: 'var(--break)' },
];

export default function HeaderV2() {
    const pathname = usePathname();

    return (
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
                        const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(`${item.href}/`));
                        return (
                            <Link key={item.href} href={item.href} className={isActive ? 'active' : ''} style={{ color: item.color }}>
                                {item.label}
                            </Link>
                        );
                    })}
                </div>
                <ThemeToggleV2 />
            </div>
        </nav>
    );
}
