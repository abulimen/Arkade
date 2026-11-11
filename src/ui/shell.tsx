'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon, type IconName } from './icons';
import { Wordmark } from './kit';
import { PwaInstallButton } from './pwa';

export type NavTab = 'home' | 'join' | 'games' | 'mc' | 'screen';

const MOBILE_TABS: { id: NavTab; label: string; href: string; icon: IconName }[] = [
  { id: 'home', label: 'Home', href: '/', icon: 'home' },
  { id: 'join', label: 'Join Room', href: '/join', icon: 'phone' },
  { id: 'games', label: '5 Games', href: '/#games', icon: 'gamepad' },
  { id: 'mc', label: 'Host MC', href: '/mc', icon: 'sparkle' },
];

export function AppShell({
  active = 'home',
  children,
  maxWidth = 'max-w-6xl',
  rightSlot,
  hideBottomNav = false,
}: {
  active?: NavTab;
  children: ReactNode;
  maxWidth?: string;
  rightSlot?: ReactNode;
  hideBottomNav?: boolean;
}) {
  return (
    <div className={`min-h-dvh flex flex-col text-cloud ${hideBottomNav ? '' : 'pb-nav-safe md:pb-12'}`}>
      <header className="sticky top-0 z-30 glass-hud">
        <div className={`mx-auto flex items-center justify-between gap-3 px-4 py-3 ${maxWidth}`}>
          <Link href="/" className="cursor-pointer inline-flex items-center gap-2 focus:outline-none">
            <Wordmark size={30} />
          </Link>

          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-1.5">
            <Link
              href="/"
              className={`cursor-pointer px-3.5 py-2 rounded-xl text-sm font-semibold transition ${
                active === 'home' ? 'bg-gold text-night' : 'text-cloud/85 hover:bg-white/10'
              }`}
            >
              Home
            </Link>
            <Link
              href="/join"
              className={`cursor-pointer px-3.5 py-2 rounded-xl text-sm font-semibold transition ${
                active === 'join' ? 'bg-gold text-night' : 'text-cloud/85 hover:bg-white/10'
              }`}
            >
              Join Room
            </Link>
            <Link
              href="/#games"
              className={`cursor-pointer px-3.5 py-2 rounded-xl text-sm font-semibold transition ${
                active === 'games' ? 'bg-gold text-night' : 'text-cloud/85 hover:bg-white/10'
              }`}
            >
              5 Games
            </Link>
            <Link
              href="/mc"
              className={`cursor-pointer px-3.5 py-2 rounded-xl text-sm font-semibold transition ${
                active === 'mc' ? 'bg-coral text-night' : 'text-cloud/85 hover:bg-white/10'
              }`}
            >
              Host MC
            </Link>
            <Link
              href="/screen"
              className={`cursor-pointer px-3.5 py-2 rounded-xl text-sm font-semibold transition ${
                active === 'screen' ? 'bg-sky text-night' : 'text-cloud/85 hover:bg-white/10'
              }`}
            >
              Projector
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            {rightSlot}
            <PwaInstallButton app={active === 'mc' ? 'mc' : 'player'} />
          </div>
        </div>
      </header>

      <main className={`mx-auto w-full flex-1 px-4 py-6 ${maxWidth}`}>{children}</main>

      {!hideBottomNav && (
        <nav
          aria-label="Mobile navigation"
          className="fixed bottom-0 inset-x-0 z-40 md:hidden glass-hud border-t border-white/15"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="grid grid-cols-4 h-16 max-w-md mx-auto px-2">
            {MOBILE_TABS.map((tab) => {
              const isActive = active === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`cursor-pointer flex flex-col items-center justify-center gap-1 rounded-xl my-1 transition ${
                    isActive ? 'text-gold bg-gold/15' : 'text-cloud/70 hover:text-cloud'
                  }`}
                >
                  <Icon n={tab.icon} size={20} />
                  <span className="text-[11px] font-semibold leading-none">{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
