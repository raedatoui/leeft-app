import type { Metadata, Viewport } from 'next';
import { Anton, DM_Sans, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import './globals.css';
import './v2.css';
import ServiceWorkerRegister from '@/components/common/serviceWorkerRegister';
import Providers from '@/lib/providers';

const anton = Anton({
    subsets: ['latin'],
    weight: '400',
    variable: '--font-display',
    display: 'swap',
});

const dmSans = DM_Sans({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-body',
    display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    weight: ['400', '500', '600'],
    variable: '--font-mono',
    display: 'swap',
});

export const metadata: Metadata = {
    title: {
        default: 'Leeft',
        template: '%s · Leeft',
    },
    description: 'Lifting log',
    manifest: '/manifest.webmanifest',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'Leeft',
    },
};

// viewport-fit=cover makes env(safe-area-inset-*) non-zero on notched phones,
// which the mobile dock and bottom sheets in v2.css rely on
export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor: [
        { media: '(prefers-color-scheme: dark)', color: '#0b0a08' },
        { media: '(prefers-color-scheme: light)', color: '#ecebe2' },
    ],
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className="antialiased">
                <ThemeProvider attribute="data-mode" defaultTheme="system" enableSystem storageKey="leeft-theme">
                    <ServiceWorkerRegister />
                    {/* v2 wrapper sits outside Providers so the loader and load-error states render themed */}
                    <div data-theme="v2" className={`${anton.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
                        <Providers>{children}</Providers>
                    </div>
                </ThemeProvider>
            </body>
        </html>
    );
}
