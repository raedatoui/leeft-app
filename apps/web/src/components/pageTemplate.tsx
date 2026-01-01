import type React from 'react';
import Header from '@/components/header';

export default function PageTemplate({
    children,
    titleChildren,
    stickyHeader,
    title,
}: Readonly<{
    titleChildren?: React.ReactNode;
    children: React.ReactNode;
    stickyHeader?: React.ReactNode;
    title: string;
}>) {
    return (
        <div className="flex flex-col min-h-screen">
            <div
                className="sticky top-0 z-50 bg-background"
                style={{
                    backgroundImage: `linear-gradient(to right, rgba(128, 128, 128, 0.1) 1px, transparent 1px),
                                      linear-gradient(to bottom, rgba(128, 128, 128, 0.1) 1px, transparent 1px)`,
                    backgroundSize: '4rem 4rem',
                }}
            >
                <Header title={title}>{titleChildren}</Header>
                {stickyHeader && (
                    <div className="border-border shadow-sm">
                        <div className="container mx-auto px-2 sm:px-4 py-3">{stickyHeader}</div>
                    </div>
                )}
            </div>
            <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4 flex-1">{children}</div>
        </div>
    );
}
