import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@fontsource/fredoka/latin-400.css';
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import '@fontsource/source-serif-4/latin-400.css';
import '@fontsource/source-serif-4/latin-400-italic.css';
import { ServiceWorkerRegister } from '@/ui/pwa';
import './globals.css';

export const metadata: Metadata = {
  title: 'Arkade · Bible Party Games Console',
  description: 'Real-time multiplayer Bible party games for church youth nights, families, and small groups. One projector, every phone, one MC.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Arkade',
  },
  icons: {
    icon: [
      { url: '/imgs/Neon%20Arkade%20Emblem%20Icon.png', type: 'image/png' },
    ],
    shortcut: [{ url: '/imgs/Neon%20Arkade%20Emblem%20Icon.png', type: 'image/png' }],
    apple: [{ url: '/imgs/Neon%20Arkade%20Emblem%20Icon.png', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#07080C',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
