import type { Metadata } from 'next';
import { Anton, DM_Sans, JetBrains_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import { ThemeProvider } from 'next-themes';
import './globals.css';
import './v2.css';
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
