import type { Metadata, Viewport } from 'next';
import { Anton, DM_Sans, JetBrains_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import { ThemeProvider } from 'next-themes';
import './globals.css';
import './v2.css';
import ServiceWorkerRegister from '@/components/common/serviceWorkerRegister';
import Providers from '@/lib/providers';

const geistSans = localFont({
    src: './fonts/GeistVF.woff',
    variable: '--font-geist-sans',
    weight: '100 900',
});
const geistMono = localFont({
    src: './fonts/GeistMonoVF.woff',
    variable: '--font-geist-mono',
    weight: '100 900',
});

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
    title: 'Leeft',
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
    themeColor: '#0b0a08',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark" suppressHydrationWarning>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <ThemeProvider attribute="data-mode" defaultTheme="system" enableSystem storageKey="leeft-theme">
                    <ServiceWorkerRegister />
                    <Providers>
                        <div data-theme="v2" className={`${anton.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
                            {children}
                        </div>
                    </Providers>
                </ThemeProvider>
            </body>
        </html>
    );
}
