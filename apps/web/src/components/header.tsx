import Link from 'next/link';

export default function Header() {
    return (
        <div className="border-b border-border">
            <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-1 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
                <Link href="/" className="text-primary hover:text-primary/90 no-underline">
                    <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-1">
                        <span>🏋️</span>
                        <span>LEEFT</span>
                        <span className="inline-block scale-x-[-1]">🏋️</span>
                    </h1>
                </Link>
                <nav className="flex items-center gap-3 sm:gap-4 text-sm">
                    <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                        Workouts
                    </Link>
                    <Link href="/cycles" className="text-muted-foreground hover:text-foreground transition-colors">
                        Cycles
                    </Link>
                    <Link href="/exercises" className="text-muted-foreground hover:text-foreground transition-colors">
                        Exercises
                    </Link>
                    <Link href="/analysis" className="text-muted-foreground hover:text-foreground transition-colors">
                        Monthly
                    </Link>
                </nav>
            </div>
        </div>
    );
}
