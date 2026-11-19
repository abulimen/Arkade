'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROOM_LETTERS } from '@/shared/types';
import { t } from '@/i18n';
import { enableSound, haptic, playUi } from '@/client/sound';
import { AppShell } from '@/ui/shell';
import { Button } from '@/ui/kit';
import { Icon } from '@/ui/icons';
import { MascotView } from '@/ui/mascots';
import { ConsoleFieldCanvas } from '@/ui/ConsoleFieldCanvas';

export default function ScreenLauncherPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const [err, setErr] = useState(false);

  const onCode = (raw: string) => {
    const clean = raw
      .toUpperCase()
      .split('')
      .filter((c) => ROOM_LETTERS.includes(c))
      .join('')
      .slice(0, 4);
    if (clean !== code) {
      playUi('ui-focus', ((clean.length || 1) - 2.5) * 0.2);
      haptic('tick');
    }
    setCode(clean);
    setErr(false);
  };

  const launch = (e: React.FormEvent) => {
    e.preventDefault();
    void enableSound();
    if (code.length !== 4) {
      playUi('ui-error');
      haptic('error');
      setErr(true);
      return;
    }
    playUi('ui-lock');
    haptic('success');
    router.push(`/screen/${code}`);
  };

  return (
    <AppShell active="screen" maxWidth="max-w-lg">
      <div className="space-y-5 pt-1 a-slide">
        <ConsoleFieldCanvas
          seed={707}
          accent="#29C5FF"
          secondary="#38EC82"
          density={0.55}
          className="fixed inset-x-0 top-12 h-96 -z-10 opacity-55"
        />
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky/35 bg-sky/12 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-sky">
              <Icon n="tv" size={14} /> Projector Mode
            </div>
            <h1 className="font-bold text-white fs-h1 leading-tight">{t('mc.openScreen')}</h1>
            <p className="text-sm text-slate">Sync the main hall TV, LED wall, or projector in 16:9 console scale.</p>
          </div>
          <div className="shrink-0 rounded-2xl border border-white/10 bg-night-2/85 p-2 shadow-lg">
            <MascotView name="olive" expression={err ? 'oops' : code.length === 4 ? 'cheer' : 'happy'} size={74} animate decorative />
          </div>
        </div>

        <div className="double-bezel a-pop">
          <form onSubmit={launch} className="double-bezel-inner relative overflow-hidden p-5 sm:p-6 space-y-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -right-20 h-44 w-44 rounded-full bg-sky/20 blur-3xl"
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="screen-code" className="text-xs font-bold uppercase tracking-widest text-slate">
                {t('join.code')}
              </label>
              {code.length > 0 && (
                <button
                  type="button"
                  onClick={() => onCode('')}
                  className="cursor-pointer text-[11px] font-semibold text-cloud/60 hover:text-white transition"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="relative">
              <input
                id="screen-code"
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={4}
                value={code}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onChange={(e) => onCode(e.target.value)}
                placeholder="ABCD"
                className="peer absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
              />
              <div
                className={`grid grid-cols-4 gap-2.5 rounded-2xl transition-shadow ${
                  focused ? 'ring-2 ring-sky/45 ring-offset-2 ring-offset-night' : ''
                }`}
                aria-hidden="true"
              >
                {[0, 1, 2, 3].map((idx) => {
                  const ch = code[idx] || '';
                  const isCursorSlot = focused && idx === Math.min(code.length, 3) && !ch;
                  return (
                    <div
                      key={`${idx}-${ch}`}
                      className={`h-16 rounded-2xl border grid place-items-center font-bold text-2xl tracking-wider transition-all ${
                        ch ? 'chamber-pop' : ''
                      } ${
                        code.length === 4
                          ? 'border-leaf/65 bg-leaf/14 text-leaf shadow-[0_0_20px_-4px_rgba(56,236,130,0.45)]'
                          : isCursorSlot
                            ? 'border-sky bg-night-3 text-sky shadow-[0_0_18px_-4px_rgba(41,197,255,0.45)]'
                            : ch
                              ? 'border-sky/55 bg-sky/12 text-white'
                              : 'border-white/12 bg-night-3/70 text-slate/45'
                      }`}
                    >
                      {ch ? (
                        ch
                      ) : isCursorSlot ? (
                        <span className="h-6 w-0.5 rounded-full bg-sky a-caret" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-white/20" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {err && (
            <p role="alert" className="rounded-2xl border border-coral/40 bg-coral/12 px-4 py-2.5 text-sm font-semibold text-coral a-shake">
              {t('join.err.ROOM_NOT_FOUND')}
            </p>
          )}

          <Button type="submit" variant="primary" disabled={code.length !== 4} className="w-full">
            <Icon n="tv" size={18} />
            <span>{t('mc.openScreen')}</span>
          </Button>
          </form>
        </div>

        <div className="arcade-card p-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-night-3/70 px-2 py-2.5 border border-white/8">
            <div className="text-xs font-bold text-leaf">1080p</div>
            <div className="text-[11px] text-slate mt-0.5">Console Stage</div>
          </div>
          <div className="rounded-xl bg-night-3/70 px-2 py-2.5 border border-white/8">
            <div className="text-xs font-bold text-gold">SFX + BGM</div>
            <div className="text-[11px] text-slate mt-0.5">Live Broadcast</div>
          </div>
          <div className="rounded-xl bg-night-3/70 px-2 py-2.5 border border-white/8">
            <div className="text-xs font-bold text-sky">QR Sync</div>
            <div className="text-[11px] text-slate mt-0.5">Instant Join</div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
