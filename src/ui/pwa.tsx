'use client';
import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { haptic, playUi } from '@/client/sound';
import { Icon } from './icons';
import { ViewportModal } from './kit';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let deferredPromptGlobal: BeforeInstallPromptEvent | null = null;
let installedOverride = false;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

function subscribePwa(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getCanPromptSnapshot() {
  return Boolean(deferredPromptGlobal);
}

function getInstalledSnapshot() {
  if (typeof window === 'undefined') return false;
  return (
    installedOverride ||
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptGlobal = e as BeforeInstallPromptEvent;
      notifyListeners();
    };
    const onInstalled = () => {
      deferredPromptGlobal = null;
      installedOverride = true;
      notifyListeners();
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  return null;
}

export function usePwaInstall() {
  const canPrompt = useSyncExternalStore(subscribePwa, getCanPromptSnapshot, () => false);
  const installed = useSyncExternalStore(subscribePwa, getInstalledSnapshot, () => false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [targetApp, setTargetApp] = useState<'player' | 'mc'>('player');

  const triggerInstall = async (app: 'player' | 'mc' = 'player') => {
    playUi('ui-sheet');
    haptic('press');
    setTargetApp(app);
    const onMcRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/mc');
    if (deferredPromptGlobal && ((app === 'mc' && onMcRoute) || (app === 'player' && !onMcRoute))) {
      try {
        await deferredPromptGlobal.prompt();
        const choice = await deferredPromptGlobal.userChoice;
        if (choice.outcome === 'accepted') {
          deferredPromptGlobal = null;
          notifyListeners();
        }
        return;
      } catch {
        // Fall back to sheet
      }
    }
    setSheetOpen(true);
  };

  return { canPrompt, installed, sheetOpen, setSheetOpen: setSheetOpen, targetApp, triggerInstall };
}

export function PwaInstallButton({
  app = 'player',
  label,
  iconOnly = false,
}: {
  app?: 'player' | 'mc';
  label?: string;
  iconOnly?: boolean;
}) {
  const { installed, triggerInstall, sheetOpen, setSheetOpen, targetApp } = usePwaInstall();
  if (installed) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => triggerInstall(app)}
        aria-label={label ?? (app === 'mc' ? 'Install MC App' : 'Install App')}
        className={`cursor-pointer press inline-flex items-center justify-center gap-2 rounded-full text-xs font-semibold border transition ${
          iconOnly
            ? 'h-10 w-10 bg-night-2/90 border-white/12 text-gold hover:border-white/25'
            : 'px-3.5 py-2 min-h-9 bg-white/8 text-cloud border-white/15 hover:bg-white/15 hover:text-white'
        }`}
      >
        <Icon n="download" size={14} className="text-gold" />
        {!iconOnly && <span>{label ?? (app === 'mc' ? 'Install MC' : 'Install')}</span>}
      </button>
      {sheetOpen && <PwaInstallSheet app={targetApp} onClose={() => { playUi('ui-back'); setSheetOpen(false); }} />}
    </>
  );
}

export function PwaDualCards({ stacked = false }: { stacked?: boolean }) {
  const { installed, triggerInstall, sheetOpen, setSheetOpen, targetApp } = usePwaInstall();

  return (
    <>
      <div className={stacked ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
        <div className={`arcade-card ${stacked ? 'p-4' : 'p-5'} flex flex-col justify-between gap-3.5 transition hover:border-white/20`}>
          <div className="flex items-start gap-3.5">
            <img
              src="/imgs/Neon%20Arkade%20Emblem%20Icon.png"
              alt="Arkade Player App icon"
              width={56}
              height={56}
              className={`${stacked ? 'w-12 h-12 rounded-xl' : 'w-14 h-14 rounded-2xl'} border border-white/15 shadow-lg shrink-0 object-cover`}
            />
            <div className="space-y-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-leaf/15 text-leaf border border-leaf/30">
                Player Controller PWA
              </div>
              <h3 className="font-semibold text-base text-white">Arkade Player App</h3>
              <p className="text-xs text-cloud/75 leading-relaxed">
                Install on your phone for full-screen games, fast room codes, and fun sound &amp; vibration.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/8">
            <span className="text-xs text-cloud/60 font-semibold">iOS · Android · Desktop</span>
            <button
              type="button"
              onClick={() => triggerInstall('player')}
              className="relative cursor-pointer press console-sheen inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs console-pill-white min-h-10 whitespace-nowrap shrink-0"
            >
              <Icon n="download" size={14} />
              <span>{installed ? 'Installed' : 'Install Player'}</span>
            </button>
          </div>
        </div>

        <div className={`arcade-card ${stacked ? 'p-4' : 'p-5'} flex flex-col justify-between gap-3.5 transition hover:border-white/20`}>
          <div className="flex items-start gap-3.5">
            <img
              src="/imgs/Neon%20Arkade%20Emblem%20Icon.png"
              alt="Arkade Host MC App icon"
              width={56}
              height={56}
              className={`${stacked ? 'w-12 h-12 rounded-xl' : 'w-14 h-14 rounded-2xl'} border border-white/15 shadow-lg shrink-0 object-cover`}
            />
            <div className="space-y-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-coral/15 text-coral border border-coral/30">
                Host Director PWA
              </div>
              <h3 className="font-semibold text-base text-white">Arkade Host MC App</h3>
              <p className="text-xs text-cloud/75 leading-relaxed">
                Dedicated host booth at <code className="text-gold font-mono">/mc</code> to start rounds, timers, and pick players.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/8">
            <span className="text-xs text-cloud/60 font-semibold">Scoped to /mc Console</span>
            <button
              type="button"
              onClick={() => triggerInstall('mc')}
              className="relative cursor-pointer press console-sheen inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs console-pill-gold min-h-10 whitespace-nowrap shrink-0"
            >
              <Icon n="download" size={14} />
              <span>Install MC App</span>
            </button>
          </div>
        </div>
      </div>
      {sheetOpen && <PwaInstallSheet app={targetApp} onClose={() => { playUi('ui-back'); setSheetOpen(false); }} />}
    </>
  );
}

export function PwaInstallSheet({
  open = true,
  app,
  onClose,
}: {
  open?: boolean;
  app: 'player' | 'mc';
  onClose: () => void;
}) {
  const isMc = app === 'mc';
  return (
    <ViewportModal
      open={open}
      onClose={onClose}
      ariaLabel={isMc ? 'Install Arkade Host MC App' : 'Install Arkade Player App'}
    >
      <div className="arcade-card w-full p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={isMc ? '/icons/mc-icon-192.png' : '/icons/icon-192.png'}
              alt=""
              width={48}
              height={48}
              className="w-12 h-12 rounded-2xl border border-white/15"
            />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-leaf">
                Install App
              </div>
              <h3 className="font-semibold text-xl text-white">
                {isMc ? 'Install Arkade Host MC' : 'Install Arkade Player'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close install guide"
            className="cursor-pointer p-2 rounded-full bg-white/10 text-cloud/80 hover:bg-white/20"
          >
            <Icon n="cross" size={18} />
          </button>
        </div>

        {isMc && typeof window !== 'undefined' && !window.location.pathname.startsWith('/mc') && (
          <div className="arcade-panel p-3.5 text-xs text-cloud/90 flex items-center justify-between gap-3">
            <span>Open the Host page first to install the Host app:</span>
            <Link
              href="/mc"
              onClick={onClose}
              className="cursor-pointer shrink-0 px-3.5 py-2 rounded-full console-pill-gold text-xs font-semibold"
            >
              Go to /mc
            </Link>
          </div>
        )}

        <div className="space-y-3 text-sm text-cloud/90">
          <div className="arcade-panel p-4 space-y-1">
            <div className="font-semibold text-gold flex items-center gap-2">
              <Icon n="phone" size={16} /> iPhone &amp; iPad (Safari)
            </div>
            <p className="text-xs text-cloud/75 leading-relaxed">
              1. Tap the <strong>Share</strong> icon in Safari&apos;s bar.<br />
              2. Select <strong>Add to Home Screen</strong>.<br />
              3. Tap <strong>Add</strong> for full-screen game mode.
            </p>
          </div>

          <div className="arcade-panel p-4 space-y-1">
            <div className="font-semibold text-sky flex items-center gap-2">
              <Icon n="download" size={16} /> Android &amp; Computer (Chrome / Edge)
            </div>
            <p className="text-xs text-cloud/75 leading-relaxed">
              1. Open the browser menu (<strong>⋮</strong>) or address-bar install button.<br />
              2. Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer press w-full py-3 rounded-full font-semibold text-sm console-pill-white"
        >
          Got It
        </button>
      </div>
    </ViewportModal>
  );
}
