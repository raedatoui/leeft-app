import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
                <h1 className="text-6xl font-bold" style={{ color: 'var(--maint)' }}>
                    404
                </h1>
                <p className="mt-2 text-lg" style={{ color: 'var(--muted)' }}>
                    Page not found
                </p>
                <Link
                    href="/"
                    className="mt-6 inline-block rounded-md px-4 py-2 text-sm font-medium"
                    style={{ background: 'var(--maint)', color: 'var(--bg)' }}
                >
                    Go home
                </Link>
            </div>
        </div>
    );
}
