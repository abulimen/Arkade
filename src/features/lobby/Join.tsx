'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROOM_LETTERS } from '@/shared/types';
import { t } from '@/i18n';
import { enableSound, haptic, playUi } from '@/client/sound';
import { AppShell } from '@/ui/shell';
import { Button } from '@/ui/kit';
import { Icon } from '@/ui/icons';
import { MascotView } from '@/ui/mascots';
import { ConsoleFieldCanvas } from '@/ui/ConsoleFieldCanvas';

interface RoomInfo {
  code: string;
  gameName: string;
  mode: 'individual' | 'team';
  status: string;
}

export const storeKey = (code: string) => `arkade:player:${code}`;

export function JoinForm({ initialCode = '', embedded = false }: { initialCode?: string; embedded?: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [codeFocused, setCodeFocused] = useState(false);
  const [nick, setNick] = useState('');
  const [team, setTeam] = useState(false);
  const [size, setSize] = useState('3');
  const [info, setInfo] = useState<RoomInfo | null | 'none'>(null);
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (code.length !== 4) return;
    let alive = true;
    const ctrl = new AbortController();
    Promise.resolve().then(() => {
      if (!alive) return;
      setChecking(true);
      setErr(null);
      return fetch(`/api/rooms/${code}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((j: RoomInfo | null) => {
          if (!alive) return;
          setChecking(false);
          if (j) {
            setInfo(j);
            setTeam(j.mode === 'team');
            playUi('ui-snap');
            haptic('snap');
          } else {
            setInfo('none');
            playUi('ui-error');
            haptic('error');
          }
        })
        .catch(() => {
          if (!alive) return;
          setChecking(false);
          setInfo(null);
        });
    });
    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [code]);

  useEffect(() => {
    if (info && info !== 'none' && localStorage.getItem(storeKey(code))) {
      router.replace(`/play/${code}`);
    }
  }, [info, code, router]);

  const onCodeChange = (raw: string) => {
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
    if (clean.length !== 4) {
      setInfo(null);
      setChecking(false);
    }
    setCode(clean);
    setErr(null);
  };

  const errText = (key: string) => {
    const translated = t(`join.err.${key}`);
    return translated === `join.err.${key}` ? t('err.generic') : translated;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    void enableSound();
    if (code.length !== 4) {
      playUi('ui-error');
      haptic('error');
      setErr(errText('ROOM_NOT_FOUND'));
      return;
    }
    const cleanNick = nick.trim();
    if (cleanNick.length < 2) {
      playUi('ui-error');
      haptic('error');
      setErr(errText('BAD_NICKNAME'));
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const body = {
        nickname: cleanNick,
        kind: team ? 'team' : 'individual',
        teamSize: team && size ? Number(size) : undefined,
      };
      const r = await fetch(`/api/rooms/${code}/join`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) {
        playUi('ui-error');
        haptic('error');
        setErr(errText(j.error || 'ROOM_NOT_FOUND'));
        setBusy(false);
        return;
      }
      localStorage.setItem(
        storeKey(code),
        JSON.stringify({
          token: j.token,
          playerId: j.playerId,
          nickname: cleanNick,
          kind: body.kind,
          teamSize: body.teamSize,
        }),
      );
      playUi('ui-lock');
      haptic('success');
      router.push(`/play/${code}`);
    } catch {
      playUi('ui-error');
      haptic('error');
      setErr(t('err.generic'));
      setBusy(false);
    }
  };

  const ready = info !== null && info !== 'none';
  const mascotExpr = err || info === 'none' ? 'oops' : ready ? 'cheer' : 'happy';

  const card = (
    <div className="space-y-4">
      {!embedded && (
        <ConsoleFieldCanvas
          seed={606}
          accent={ready ? '#38EC82' : '#FFD026'}
          secondary="#29C5FF"
          density={0.55}
          className="fixed inset-x-0 top-12 h-96 -z-10 opacity-55"
        />
      )}

      {!embedded && (
        <div className="flex items-center justify-between gap-4 pt-1 a-slide">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-leaf/35 bg-leaf/12 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-leaf">
              <span className="h-1.5 w-1.5 rounded-full bg-leaf animate-pulse" />
              Controller Link
            </div>
            <h1 className="font-bold text-white fs-h1 leading-tight">{t('join.go')}</h1>
            <p className="text-slate text-sm font-medium max-w-xs">{t('join.tagline')}</p>
          </div>
          <div className="shrink-0 rounded-2xl border border-white/10 bg-night-2/80 p-2 shadow-lg">
            <MascotView name="arky" expression={mascotExpr} size={74} animate decorative />
          </div>
        </div>
      )}

      <div className="double-bezel a-pop">
        <form
          onSubmit={submit}
          className="double-bezel-inner relative overflow-hidden p-5 sm:p-6 space-y-5"
        >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full opacity-25 blur-3xl transition-colors duration-500"
          style={{ background: ready ? '#38EC82' : '#FFD026' }}
        />

        {embedded && (
          <div className="flex items-center gap-3 pr-8">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/12 bg-night-3">
              <MascotView name="arky" expression={mascotExpr} size={36} decorative />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-leaf">
                <span className="h-1.5 w-1.5 rounded-full bg-leaf animate-pulse" /> Controller Link
              </div>
              <h2 className="font-semibold text-white text-lg leading-tight">{t('join.go')}</h2>
            </div>
          </div>
        )}

        {/* Unified 4-Chamber Room Code Matrix */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="join-room-code" className="text-xs font-bold uppercase tracking-widest text-slate">
              {t('join.code')}
            </label>
            <div className="flex items-center gap-2">
              {checking && (
                <span className="text-xs font-semibold text-sky animate-pulse">Scanning…</span>
              )}
              {code.length > 0 && (
                <button
                  type="button"
                  onClick={() => onCodeChange('')}
                  className="cursor-pointer text-[11px] font-semibold text-cloud/60 hover:text-white transition"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="relative">
            <input
              id="join-room-code"
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={4}
              value={code}
              onFocus={() => setCodeFocused(true)}
              onBlur={() => setCodeFocused(false)}
              onChange={(e) => onCodeChange(e.target.value)}
              placeholder="ABCD"
              className="peer absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
            />
            <div
              className={`grid grid-cols-4 gap-2.5 rounded-2xl transition-shadow ${
                codeFocused ? 'ring-2 ring-sky/45 ring-offset-2 ring-offset-night' : ''
              }`}
              aria-hidden="true"
            >
              {[0, 1, 2, 3].map((idx) => {
                const ch = code[idx] || '';
                const isCursorSlot = codeFocused && idx === Math.min(code.length, 3) && !ch;
                return (
                  <div
                    key={`${idx}-${ch}`}
                    className={`h-16 rounded-2xl border grid place-items-center font-bold text-2xl tracking-wider transition-all ${
                      ch ? 'chamber-pop' : ''
                    } ${
                      ready
                        ? 'border-leaf/65 bg-leaf/14 text-leaf shadow-[0_0_20px_-4px_rgba(56,236,130,0.45)]'
                        : info === 'none'
                          ? 'border-coral/65 bg-coral/12 text-coral'
                          : isCursorSlot
                            ? 'border-sky bg-night-3 text-sky shadow-[0_0_18px_-4px_rgba(41,197,255,0.45)]'
                            : ch
                              ? 'border-gold/65 bg-gold/12 text-white shadow-[0_0_16px_-6px_rgba(255,208,38,0.4)]'
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

          {ready && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-leaf/40 bg-leaf/12 px-4 py-2.5 a-pop">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-leaf shadow-[0_0_8px_#38EC82]" />
                <span className="truncate text-sm font-semibold text-white">
                  {t('join.found', {
                    game: info.gameName,
                    mode: t(info.mode === 'team' ? 'mc.team' : 'mc.individual'),
                  })}
                </span>
              </div>
              <Icon n="check" size={16} className="text-leaf shrink-0" />
            </div>
          )}

          {info === 'none' && (
            <div className="mt-3 rounded-2xl border border-coral/40 bg-coral/12 px-4 py-2.5 text-sm font-semibold text-coral a-shake">
              {errText('ROOM_NOT_FOUND')}
            </div>
          )}
        </div>

        {/* Team mode toggle */}
        {ready && info.mode === 'team' && (
          <div className="rounded-2xl border border-white/10 bg-night-3/70 p-3.5 space-y-3">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="flex items-center gap-2 text-sm font-semibold text-cloud">
                <Icon n="users" size={17} className="text-sky" />
                {t('join.team')}
              </span>
              <input
                type="checkbox"
                checked={team}
                onChange={(e) => {
                  playUi('ui-focus');
                  haptic('tick');
                  setTeam(e.target.checked);
                }}
                className="h-5 w-5 accent-gold cursor-pointer"
              />
            </label>
            {team && (
              <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/8">
                <label htmlFor="join-team-size" className="text-xs font-semibold text-slate">
                  {t('join.teamSize')}
                </label>
                <input
                  id="join-team-size"
                  type="number"
                  min={2}
                  max={12}
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="arcade-input w-20 min-h-10 text-center font-bold"
                />
              </div>
            )}
          </div>
        )}

        {/* Callsign / Nickname */}
        <div>
          <label htmlFor="join-nick" className="block mb-2 text-xs font-bold uppercase tracking-widest text-slate">
            {t('join.name')}
          </label>
          <input
            id="join-nick"
            type="text"
            autoComplete="nickname"
            maxLength={18}
            value={nick}
            onChange={(e) => {
              setNick(e.target.value);
              setErr(null);
            }}
            placeholder="e.g. Caleb"
            className="arcade-input font-semibold"
          />
        </div>

        {err && (
          <div role="alert" className="rounded-2xl border border-coral/45 bg-coral/12 px-4 py-2.5 text-sm font-semibold text-coral a-shake">
            {err}
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          loading={busy}
          disabled={code.length !== 4 || nick.trim().length < 2}
          className="w-full"
        >
          <span>{t('join.go')}</span>
          <Icon n="arrowRight" size={18} />
        </Button>

          <div className="flex items-center justify-center gap-2 pt-1 text-xs font-medium text-slate">
            <Icon n="shield" size={14} className="text-leaf" />
            <span>{t('common.noAccount')}</span>
          </div>
        </form>
      </div>

      {!embedded && (
        <div className="arcade-card p-4 flex items-center gap-3.5">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-night-3">
            <MascotView name="olive" expression="idle" size={36} decorative />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-gold">{t('join.buddy.title')}</p>
            <p className="text-xs text-slate leading-relaxed mt-0.5">{t('join.buddy.body')}</p>
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) return card;
  return (
    <AppShell active="join" maxWidth="max-w-lg">
      {card}
    </AppShell>
  );
}
