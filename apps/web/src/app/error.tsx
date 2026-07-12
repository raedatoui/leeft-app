'use client';

import Link from 'next/link';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
                <p className="text-4xl">&#x26A0;</p>
                <h1 className="mt-2 text-xl font-semibold" style={{ color: 'var(--fg)' }}>
                    Something went wrong
                </h1>
                <p className="mt-1" style={{ color: 'var(--muted)' }}>
                    An unexpected error occurred.
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                    <button
                        type="button"
                        onClick={() => reset()}
                        className="rounded-md px-4 py-2 text-sm font-medium"
                        style={{ background: 'var(--maint)', color: 'var(--bg)' }}
                    >
                        Try again
                    </button>
                    <Link
                        href="/"
                        className="rounded-md px-4 py-2 text-sm font-medium"
                        style={{ border: '1px solid var(--border)', color: 'var(--fg)' }}
                    >
                        Go home
                    </Link>
                </div>
            </div>
        </div>
    );
}
