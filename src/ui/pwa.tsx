'use client';
import { useEffect, useState } from 'react';
import { Icon } from './icons';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let deferredPromptGlobal: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
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
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);
  return null;
}

export function usePwaInstall() {
  const [canPrompt, setCanPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [targetApp, setTargetApp] = useState<'player' | 'mc'>('player');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(isStandalone);
    setCanPrompt(Boolean(deferredPromptGlobal));

    const update = () => setCanPrompt(Boolean(deferredPromptGlobal));
    listeners.add(update);
    const onInstalled = () => {
      deferredPromptGlobal = null;
      setInstalled(true);
      setCanPrompt(false);
      setSheetOpen(false);
    };
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      listeners.delete(update);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const triggerInstall = async (app: 'player' | 'mc' = 'player') => {
    setTargetApp(app);
    const onMcRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/mc');
    if (deferredPromptGlobal && ((app === 'mc' && onMcRoute) || (app === 'player' && !onMcRoute))) {
      try {
        await deferredPromptGlobal.prompt();
        const choice = await deferredPromptGlobal.userChoice;
        if (choice.outcome === 'accepted') {
          deferredPromptGlobal = null;
          setCanPrompt(false);
        }
        return;
      } catch {
        // Fall back to sheet
      }
    }
    setSheetOpen(true);
  };

  return { canPrompt, installed, sheetOpen, setSheetOpen, targetApp, triggerInstall };
}

export function PwaInstallButton({
  app = 'player',
  label,
}: {
  app?: 'player' | 'mc';
  label?: string;
}) {
  const { installed, triggerInstall, sheetOpen, setSheetOpen, targetApp } = usePwaInstall();
  if (installed) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => triggerInstall(app)}
        className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold tracking-wide bg-gold/15 text-gold border border-gold/40 hover:bg-gold/25 active:scale-95 transition min-h-10"
      >
        <Icon n="download" size={15} />
        <span>{label ?? (app === 'mc' ? 'Install MC App' : 'Install App')}</span>
      </button>
      {sheetOpen && <PwaInstallSheet app={targetApp} onClose={() => setSheetOpen(false)} />}
    </>
  );
}

export function PwaDualCards() {
  const { installed, triggerInstall, sheetOpen, setSheetOpen, targetApp } = usePwaInstall();

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="arcade-card p-6 flex flex-col justify-between gap-5">
          <div className="flex items-start gap-4">
            <img
              src="/icons/icon-192.png"
              alt="Arkade Player App icon"
              width={60}
              height={60}
              className="w-15 h-15 rounded-2xl border border-gold/40 shadow-md shrink-0"
            />
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-gold/15 text-gold border border-gold/30">
                Player Controller PWA
              </div>
              <h3 className="font-semibold text-xl text-white">Arkade Player App</h3>
              <p className="text-sm text-cloud/80 leading-relaxed">
                Full-screen mobile buzzer & controller. Instant room code entry, offline shell caching, and zero browser bars during fast rounds.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
            <span className="text-xs text-cloud/65 font-semibold">iOS · Android · Desktop</span>
            <button
              type="button"
              onClick={() => triggerInstall('player')}
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-gold text-night shadow-[0_3px_0_#9A6B00] active:translate-y-0.5 transition min-h-11"
            >
              <Icon n="download" size={16} />
              <span>{installed ? 'Installed on Device' : 'Install Player App'}</span>
            </button>
          </div>
        </div>

        <div className="arcade-card p-6 flex flex-col justify-between gap-5">
          <div className="flex items-start gap-4">
            <img
              src="/icons/mc-icon-192.png"
              alt="Arkade Host MC App icon"
              width={60}
              height={60}
              className="w-15 h-15 rounded-2xl border border-coral/40 shadow-md shrink-0"
            />
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-coral/15 text-coral border border-coral/30">
                Host Booth PWA
              </div>
              <h3 className="font-semibold text-xl text-white">Arkade Host MC App</h3>
              <p className="text-sm text-cloud/80 leading-relaxed">
                Dedicated showrunner console scoped to <code className="text-gold font-mono">/mc</code>. Control timers, moderate players, trigger sound cues, and preview the stage.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
            <span className="text-xs text-cloud/65 font-semibold">Scoped to /mc Console</span>
            <button
              type="button"
              onClick={() => triggerInstall('mc')}
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-coral text-night shadow-[0_3px_0_#8F1D2C] active:translate-y-0.5 transition min-h-11"
            >
              <Icon n="download" size={16} />
              <span>Install Host MC App</span>
            </button>
          </div>
        </div>
      </div>
      {sheetOpen && <PwaInstallSheet app={targetApp} onClose={() => setSheetOpen(false)} />}
    </>
  );
}

export function PwaInstallSheet({
  app,
  onClose,
}: {
  app: 'player' | 'mc';
  onClose: () => void;
}) {
  const isMc = app === 'mc';
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isMc ? 'Install Arkade Host MC App' : 'Install Arkade Player App'}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="arcade-card w-full max-w-md p-6 space-y-5 a-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={isMc ? '/icons/mc-icon-192.png' : '/icons/icon-192.png'}
              alt=""
              width={48}
              height={48}
              className="w-12 h-12 rounded-2xl border border-white/20"
            />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-gold">
                Progressive Web App
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
            className="cursor-pointer p-2 rounded-xl bg-white/10 text-cloud/80 hover:bg-white/20"
          >
            <Icon n="cross" size={18} />
          </button>
        </div>

        {isMc && typeof window !== 'undefined' && !window.location.pathname.startsWith('/mc') && (
          <div className="arcade-panel p-3.5 text-xs text-cloud/90 flex items-center justify-between gap-3">
            <span>Open the Host Console first so your browser installs the dedicated MC manifest:</span>
            <a
              href="/mc"
              className="cursor-pointer shrink-0 px-3 py-2 rounded-lg bg-coral text-night font-semibold"
            >
              Go to /mc
            </a>
          </div>
        )}

        <div className="space-y-3 text-sm text-cloud/90">
          <div className="arcade-panel p-3.5 space-y-1">
            <div className="font-semibold text-gold flex items-center gap-2">
              <Icon n="phone" size={16} /> iPhone & iPad (Safari)
            </div>
            <p className="text-xs text-cloud/80 leading-relaxed">
              1. Tap the <strong>Share</strong> button in Safari&apos;s bottom bar.<br />
              2. Scroll down and tap <strong>Add to Home Screen</strong>.<br />
              3. Tap <strong>Add</strong> in the top-right corner to launch full-screen.
            </p>
          </div>

          <div className="arcade-panel p-3.5 space-y-1">
            <div className="font-semibold text-sky flex items-center gap-2">
              <Icon n="download" size={16} /> Android & Desktop (Chrome / Edge)
            </div>
            <p className="text-xs text-cloud/80 leading-relaxed">
              1. Tap the browser menu (<strong>⋮</strong>) or the address-bar install icon.<br />
              2. Select <strong>Install app</strong> or <strong>Add to Home screen</strong>.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer w-full py-3 rounded-xl font-semibold text-sm bg-gold text-night shadow-[0_3px_0_#9A6B00]"
        >
          Got It
        </button>
      </div>
    </div>
  );
}
