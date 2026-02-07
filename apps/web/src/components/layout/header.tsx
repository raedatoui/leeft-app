'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ClipboardList, Dumbbell, Heart, BarChart3, Calendar, ListTree } from 'lucide-react';

interface HeaderProps {
    title: string;
    children?: ReactNode;
}

const navItems = [
    { href: '/', label: 'Workouts', icon: ClipboardList },
    { href: '/exercises', label: 'Exercises', icon: ListTree },
    { href: '/cycles', label: 'Cycles', icon: Dumbbell },
    { href: '/cardio', label: 'Cardio', icon: Heart },
    { href: '/stats', label: 'Stats', icon: BarChart3 },
    { href: '/analysis', label: 'Monthly', icon: Calendar },
];

function HamburgerIcon({ open }: { open: boolean }) {
    return (
        <div className="w-6 h-6 flex flex-col justify-center items-center">
            <span
                className={cn(
                    'block h-0.5 w-5 bg-current transition-all duration-300 ease-in-out',
                    open ? 'translate-y-[3px] rotate-45' : '-translate-y-1'
                )}
            />
            <span
                className={cn(
                    'block h-0.5 w-5 bg-current transition-all duration-300 ease-in-out',
                    open ? 'opacity-0 scale-0' : 'opacity-100'
                )}
            />
            <span
                className={cn(
                    'block h-0.5 w-5 bg-current transition-all duration-300 ease-in-out',
                    open ? '-translate-y-[3px] -rotate-45' : 'translate-y-1'
                )}
            />
        </div>
    );
}

export default function Header({ title, children }: HeaderProps) {
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);

    const getLinkClassName = (href: string, mobile = false) => {
        const isActive = href === '/' ? pathname === '/' : pathname?.startsWith(href);
        const base = mobile
            ? 'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors'
            : 'flex items-center gap-1.5 transition-colors hover:text-foreground';
        const activeClass = mobile
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-primary font-medium';
        const inactiveClass = mobile
            ? 'text-muted-foreground hover:bg-muted'
            : 'text-muted-foreground';
        return cn(base, isActive ? activeClass : inactiveClass);
    };

    return (
        <div className="border-border">
            <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-1 flex items-center justify-between relative min-h-[50px]">
                <div className="flex items-center">
                    <Link href="/" className="text-primary hover:text-primary/90 no-underline">
                        <span className="text-xl sm:text-2xl font-bold flex items-center gap-1">
                            <span>🏋️</span>
                            <span>LEEFT</span>
                            <span className="inline-block scale-x-[-1]">🏋️</span>
                        </span>
                    </Link>
                </div>

                {title && (
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden sm:flex justify-center">
                        <h1 className="text-xl sm:text-4xl font-black tracking-tighter uppercase text-primary leading-none text-center">{title}</h1>
                        {children}
                    </div>
                )}

                {/* Hamburger button + dropdown */}
                <div className="relative">
                    <button
                        type="button"
                        className="p-2 text-muted-foreground hover:text-foreground"
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label="Toggle menu"
                    >
                        <HamburgerIcon open={menuOpen} />
                    </button>

                    {/* Dropdown menu */}
                    <div
                        className={cn(
                            'absolute right-0 top-full mt-2 z-50 min-w-[180px] rounded-lg border border-primary/50 bg-background/80 backdrop-blur-md shadow-lg transition-all duration-300 ease-in-out origin-top-right',
                            menuOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
                        )}
                    >
                        <nav className="p-2 flex flex-col gap-1">
                            {navItems.map(({ href, label, icon: Icon }) => (
                                <Link
                                    key={href}
                                    href={href}
                                    className={getLinkClassName(href, true)}
                                    onClick={() => setMenuOpen(false)}
                                >
                                    <Icon className="w-5 h-5" />
                                    {label}
                                </Link>
                            ))}
                        </nav>
                    </div>
                </div>
            </div>
        </div>
    );
}
