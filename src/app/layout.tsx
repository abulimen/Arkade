import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Arkade · Bible party games',
  description: 'Real-time Bible party games for church game nights. One projector, every phone, one MC.',
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = { themeColor: '#14123B', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fonts/fredoka-latin-600-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
