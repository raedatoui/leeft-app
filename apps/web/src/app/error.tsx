'use client';

import Link from 'next/link';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
                <p className="text-4xl">&#x26A0;</p>
                <h1 className="mt-2 text-xl font-semibold text-foreground">Something went wrong</h1>
                <p className="mt-1 text-muted-foreground">An unexpected error occurred.</p>
                <div className="mt-6 flex items-center justify-center gap-3">
                    <button
                        type="button"
                        onClick={() => reset()}
                        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                    >
                        Try again
                    </button>
                    <Link href="/" className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground">
                        Go home
                    </Link>
                </div>
            </div>
        </div>
    );
}
