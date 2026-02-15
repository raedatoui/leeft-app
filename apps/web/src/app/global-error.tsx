'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#1c1c2e',
                    color: '#fafafa',
                    fontFamily: 'system-ui, sans-serif',
                }}
            >
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Something went wrong</h1>
                    <p style={{ color: '#9d9da8', marginBottom: '1.5rem' }}>An unexpected error occurred.</p>
                    <button
                        type="button"
                        onClick={() => reset()}
                        style={{
                            backgroundColor: 'hsl(35, 100%, 64%)',
                            color: '#18181b',
                            border: 'none',
                            borderRadius: '0.375rem',
                            padding: '0.5rem 1rem',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                        }}
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    );
}
