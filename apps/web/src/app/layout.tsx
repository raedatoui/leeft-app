import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import Background from '@/components/layout/background';
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
        <html lang="en" className="dark">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <Background />
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
