import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Arkade MC · Host & Showrunner Console',
  description: 'Host console for Arkade Bible party games. Launch rooms, control timers, moderate players, and trigger game-show sound cues.',
  manifest: '/mc-manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Arkade MC',
  },
  icons: {
    icon: [
      { url: '/icons/mc-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/mc-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/mc-icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
};

export default function McLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
