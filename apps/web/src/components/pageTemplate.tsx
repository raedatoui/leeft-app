import type React from 'react';

export default function PageTemplate({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">{children}</div>;
}
