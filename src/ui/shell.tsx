'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { ROOM_LETTERS } from '@/shared/types';
import { useSensory } from '@/client/hooks';
import { haptic, playUi } from '@/client/sound';
import { Icon, type IconName } from './icons';
import { Wordmark } from './kit';
import { PwaInstallButton } from './pwa';

export type NavTab = 'home' | 'join' | 'games' | 'mc' | 'screen';

const MOBILE_TABS: { id: NavTab; label: string; href: string; icon: IconName }[] = [
  { id: 'home', label: 'Games', href: '/', icon: 'gamepad' },
  { id: 'join', label: 'Join', href: '/join', icon: 'phone' },
  { id: 'mc', label: 'Host MC', href: '/mc', icon: 'sparkle' },
];

function EqualizerBars() {
  return (
    <span className="inline-flex items-end gap-[2px] h-3" aria-hidden="true">
      <span className="w-[2.5px] h-full rounded-full bg-leaf a-eq-1" />
      <span className="w-[2.5px] h-full rounded-full bg-leaf a-eq-2" />
      <span className="w-[2.5px] h-full rounded-full bg-leaf a-eq-3" />
    </span>
  );
}

export function SensoryPill({ compact = false }: { compact?: boolean }) {
  const { soundOn, hapticsOn, toggleSound, toggleHaptics } = useSensory();
  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleSound}
        aria-label={soundOn ? 'Mute console UI audio' : 'Enable console UI audio'}
        aria-pressed={soundOn}
        className={`cursor-pointer press grid h-10 w-10 place-items-center rounded-full border transition ${
          soundOn
            ? 'border-leaf/30 bg-night-2/95 text-leaf shadow-[0_0_14px_rgba(56,236,130,0.16)]'
            : 'border-white/12 bg-night-2/90 text-cloud/55 hover:border-white/25'
        }`}
      >
        {soundOn ? <EqualizerBars /> : <Icon n="volumeoff" size={16} className="text-cloud/50" />}
      </button>
    );
  }
  return (
    <div className="inline-flex items-center rounded-full border border-white/12 bg-night-2/90 p-0.5 shrink-0">
      <button
        type="button"
        onClick={toggleSound}
        aria-label={soundOn ? 'Mute console UI audio' : 'Enable console UI audio'}
        aria-pressed={soundOn}
        title={soundOn ? 'Console Audio On' : 'Console Audio Off'}
        className={`cursor-pointer inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap transition ${
          soundOn ? 'bg-white/10 text-leaf' : 'text-cloud/50 hover:text-cloud'
        }`}
      >
        {soundOn ? <EqualizerBars /> : <Icon n="volumeoff" size={14} />}
        <span className="hidden xl:inline">{soundOn ? 'SFX' : 'Muted'}</span>
      </button>
      <button
        type="button"
        onClick={toggleHaptics}
        aria-label={hapticsOn ? 'Disable haptic feedback' : 'Enable haptic feedback'}
        aria-pressed={hapticsOn}
        title={hapticsOn ? 'Haptics On' : 'Haptics Off'}
        className={`cursor-pointer inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap transition ${
          hapticsOn ? 'text-gold' : 'text-cloud/45 hover:text-cloud'
        }`}
      >
        <Icon n="bolt" size={13} className={hapticsOn ? 'm-flicker' : ''} />
        <span className="hidden xl:inline">Haptic</span>
      </button>
    </div>
  );
}

export function AppShell({
  active = 'home',
  children,
  maxWidth = 'max-w-6xl',
  rightSlot,
  hideBottomNav = false,
  fullBleed = false,
}: {
  active?: NavTab;
  children: ReactNode;
  maxWidth?: string;
  rightSlot?: ReactNode;
  hideBottomNav?: boolean;
  fullBleed?: boolean;
}) {
  const router = useRouter();
  const [quickCode, setQuickCode] = useState('');

  const handleQuickCode = (raw: string) => {
    const clean = raw
      .toUpperCase()
      .split('')
      .filter((c) => ROOM_LETTERS.includes(c))
      .join('')
      .slice(0, 4);
    setQuickCode(clean);
    if (clean.length > 0) {
      playUi('ui-focus');
      haptic('tick');
    }
    if (clean.length === 4) {
      playUi('ui-lock');
      haptic('lock');
      router.push(`/j/${clean}`);
    }
  };

  return (
    <div className={`min-h-dvh flex flex-col text-cloud ${hideBottomNav ? '' : 'pb-nav-safe lg:pb-0'}`}>
      {/* Mobile Console Top Bar */}
      <header className="sticky top-0 z-30 glass-hud border-b border-white/8 lg:hidden pt-safe">
        <div className="mx-auto flex items-center justify-between gap-3 px-4 py-2.5">
          <Link
            href="/"
            onClick={() => { playUi('ui-focus'); haptic('tick'); }}
            className="cursor-pointer inline-flex items-center focus:outline-none shrink-0"
          >
            <Wordmark size={34} />
          </Link>

          <div className="flex items-center gap-1.5 shrink-0">
            {rightSlot}
            <SensoryPill compact />
            <PwaInstallButton app={active === 'mc' ? 'mc' : 'player'} iconOnly />
          </div>
        </div>
      </header>

      {/* Floating Desktop Console HUD Island */}
      <header className="sticky top-3 z-30 hidden lg:block px-4 xl:px-6 pointer-events-none">
        <div className="pointer-events-auto mx-auto max-w-[1400px] rounded-full glass-hud border border-white/12 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.88),inset_0_1px_0_rgba(255,255,255,0.14)] flex items-center justify-between gap-4 xl:grid xl:grid-cols-[1fr_auto_1fr] px-4 py-2">
          {/* Left: Console shoulder tag + Navigation pills + Quick Room Code search */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="hidden 2xl:inline-flex items-center justify-center rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-cloud/55 shrink-0" aria-hidden="true">
              L1
            </span>
            <nav aria-label="Main navigation" className="flex items-center gap-1 shrink-0">
              <Link
                href="/"
                onClick={() => { playUi('ui-focus'); haptic('tick'); }}
                className={`cursor-pointer relative press console-sheen inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                  active === 'home' ? 'bg-white text-night shadow-[0_6px_18px_rgba(255,255,255,0.2)]' : 'text-cloud/75 hover:bg-white/8 hover:text-white'
                }`}
              >
                <Icon n="gamepad" size={14} />
                <span>Games</span>
              </Link>
              <Link
                href="/join"
                onClick={() => { playUi('ui-focus'); haptic('tick'); }}
                className={`cursor-pointer relative press console-sheen inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                  active === 'join' ? 'bg-white text-night shadow-[0_6px_18px_rgba(255,255,255,0.2)]' : 'text-cloud/75 hover:bg-white/8 hover:text-white'
                }`}
              >
                <span>Join</span>
              </Link>
              <Link
                href="/mc"
                onClick={() => { playUi('ui-focus'); haptic('tick'); }}
                className={`cursor-pointer relative press console-sheen inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                  active === 'mc' ? 'bg-gold text-night shadow-[0_6px_18px_rgba(255,208,38,0.3)]' : 'text-cloud/75 hover:bg-white/8 hover:text-white'
                }`}
              >
                <span>Host MC</span>
              </Link>
              <Link
                href="/screen"
                onClick={() => { playUi('ui-focus'); haptic('tick'); }}
                className={`cursor-pointer relative press console-sheen inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                  active === 'screen' ? 'bg-sky text-night shadow-[0_6px_18px_rgba(41,197,255,0.3)]' : 'text-cloud/75 hover:bg-white/8 hover:text-white'
                }`}
              >
                <span>TV Stage</span>
              </Link>
            </nav>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (quickCode.length === 4) {
                  playUi('ui-lock');
                  router.push(`/j/${quickCode}`);
                }
              }}
              className="hidden xl:flex items-center gap-2 rounded-full border border-white/10 bg-abyss/80 px-3 py-1.5 ml-1.5 focus-within:border-sky/60 transition"
            >
              <Icon n="search" size={13} className="text-cloud/50" />
              <input
                type="text"
                value={quickCode}
                onChange={(e) => handleQuickCode(e.target.value)}
                maxLength={4}
                placeholder="Room code…"
                aria-label="Quick room code"
                className="w-24 bg-transparent text-xs font-semibold uppercase tracking-widest text-white placeholder:text-cloud/40 placeholder:tracking-normal focus:outline-none"
              />
            </form>
          </div>

          {/* Center: Console Crest */}
          <Link href="/" onClick={() => playUi('ui-focus')} className="cursor-pointer inline-flex items-center justify-center focus:outline-none">
            <Wordmark size={42} />
          </Link>

          {/* Right: Sensory & Install Pills + R1 shoulder badge */}
          <div className="flex items-center justify-end gap-2 shrink-0">
            {rightSlot}
            <SensoryPill />
            <PwaInstallButton app={active === 'mc' ? 'mc' : 'player'} />
            <span className="hidden 2xl:inline-flex items-center justify-center rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-cloud/55 shrink-0" aria-hidden="true">
              R1
            </span>
          </div>
        </div>
      </header>

      <main className={fullBleed ? 'mx-auto w-full flex-1 flex flex-col' : `mx-auto w-full flex-1 px-4 py-6 lg:py-8 ${maxWidth}`}>
        {children}
      </main>

      {!hideBottomNav && (
        <nav
          aria-label="Mobile navigation"
          className="fixed bottom-0 inset-x-0 z-40 lg:hidden glass-hud border-t border-white/10"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="grid grid-cols-3 h-16 max-w-sm mx-auto px-3 gap-1">
            {MOBILE_TABS.map((tab) => {
              const isActive = active === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  onClick={() => { playUi('ui-focus'); haptic('tick'); }}
                  className={`cursor-pointer relative flex flex-col items-center justify-center gap-1 rounded-2xl my-1 transition-all duration-200 ${
                    isActive ? 'text-white bg-white/10 scale-[1.02]' : 'text-cloud/55 hover:text-cloud active:scale-95'
                  }`}
                >
                  {isActive && <span className="absolute top-1.5 h-1 w-6 rounded-full bg-leaf shadow-[0_0_10px_#38EC82] a-pop" aria-hidden="true" />}
                  <Icon n={tab.icon} size={19} className={isActive ? 'text-leaf transition-transform scale-110' : ''} />
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
