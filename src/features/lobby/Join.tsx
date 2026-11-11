'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROOM_LETTERS } from '@/shared/types';
import { t } from '@/i18n';
import { Icon } from '@/ui/icons';
import { Button } from '@/ui/kit';
import { MascotView } from '@/ui/mascots';
import { AppShell } from '@/ui/shell';

interface Info { code: string; gameName: string; mode: 'individual' | 'team'; status: string }
export const storeKey = (code: string) => `arkade:player:${code}`;

export function JoinForm({ initialCode = '', embedded = false }: { initialCode?: string; embedded?: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [info, setInfo] = useState<Info | null | 'none'>(null);
  const [nick, setNick] = useState('');
  const [size, setSize] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (code.length !== 4) { setInfo(null); return; }
    let live = true;
    fetch(`/api/rooms/${code}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => live && setInfo(j ?? 'none'))
      .catch(() => live && setInfo('none'));
    return () => { live = false; };
  }, [code]);

  useEffect(() => {
    if (info && info !== 'none' && localStorage.getItem(storeKey(code))) {
      router.replace(`/play/${code}`);
    }
  }, [info, code, router]);

  const team = info && info !== 'none' && info.mode === 'team';
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const body = { nickname: nick, kind: team ? 'team' : 'individual', teamSize: team && size ? Number(size) : undefined };
      const r = await fetch(`/api/rooms/${code}/join`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) {
        setErr(t(`join.err.${j.error}`) === `join.err.${j.error}` ? t('join.err.generic') : t(`join.err.${j.error}`));
        setBusy(false);
        return;
      }
      localStorage.setItem(storeKey(code), JSON.stringify({ token: j.token, playerId: j.playerId, nickname: nick, kind: body.kind, teamSize: body.teamSize }));
      router.push(`/play/${code}`);
    } catch {
      setErr(t('join.err.generic'));
      setBusy(false);
    }
  };

  const valid = code.length === 4 && info && info !== 'none' && nick.trim().length >= 2;
  const slots = [0, 1, 2, 3].map((i) => code[i] ?? '');

  const cardContent = (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      {!embedded && (
        <header className="flex flex-col items-center gap-2 pt-2 text-center">
          <MascotView name="arky" expression={info && info !== 'none' ? 'cheer' : 'happy'} size={112} />
          <div className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold">
            <Icon n="phone" size={14} /> Player Controller
          </div>
          <h1 className="fs-h1 text-white">{t('join.tagline')}</h1>
        </header>
      )}

      <form onSubmit={submit} className="arcade-card flex flex-col gap-4 p-5 sm:p-6" aria-describedby={err ? 'join-err' : undefined}>
        <div className="flex flex-col gap-2">
          <label className="flex items-center justify-between fs-body font-semibold text-cloud" htmlFor="code">
            <span>{t('join.code')}</span>
            <span className="text-xs font-normal text-cloud/65">4 letters on the screen</span>
          </label>

          <div className="relative">
            <div className="grid grid-cols-4 gap-2.5 pointer-events-none" aria-hidden="true">
              {slots.map((ch, idx) => {
                const active = code.length === idx || (code.length === 4 && idx === 3);
                return (
                  <div
                    key={idx}
                    className={`grid h-16 place-items-center rounded-2xl border-[3px] text-3xl font-semibold uppercase transition ${
                      ch
                        ? 'border-gold bg-night-3 text-gold shadow-[0_4px_0_#0B0A1A]'
                        : active
                          ? 'border-sky/80 bg-night/90 text-white'
                          : 'border-night bg-night/75 text-cloud/35'
                    }`}
                  >
                    {ch || '·'}
                  </div>
                );
              })}
            </div>
            <input
              id="code"
              value={code}
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={4}
              placeholder="BKDF"
              onChange={(e) => setCode(e.target.value.toUpperCase().split('').filter((c) => ROOM_LETTERS.includes(c)).join(''))}
              className="absolute inset-0 h-full w-full opacity-0 cursor-pointer text-center text-3xl"
            />
          </div>
        </div>

        {code.length === 4 && info === 'none' && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-gold/40 bg-gold/15 px-3.5 py-2.5 fs-small font-semibold text-gold" role="alert">
            <MascotView name="olive" expression="worried" size={36} />
            <span>{t('join.err.ROOM_NOT_FOUND')}</span>
          </div>
        )}

        {info && info !== 'none' && (
          <div className="flex items-center justify-between gap-2.5 rounded-2xl border border-leaf/40 bg-leaf/15 px-3.5 py-2.5 fs-small font-semibold text-leaf">
            <span className="flex items-center gap-2">
              <Icon n="check" size={18} />
              {t('join.found', { game: info.gameName })}
            </span>
            <span className="rounded-full bg-leaf/20 px-2.5 py-0.5 text-xs uppercase tracking-wider text-cloud">
              {info.mode}
            </span>
          </div>
        )}

        <label className="flex flex-col gap-1.5 fs-body font-semibold text-cloud" htmlFor="nick">
          <span>{team ? t('join.team') : t('join.name')}</span>
          <input
            id="nick"
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            maxLength={16}
            autoComplete="nickname"
            placeholder={team ? 'Lions of Judah' : 'Ada'}
            className="arcade-input min-h-14 rounded-2xl px-4 text-lg font-semibold text-white placeholder:text-cloud/45"
          />
        </label>

        {team && (
          <label className="flex flex-col gap-1.5 fs-body font-semibold text-cloud" htmlFor="size">
            <span>{t('join.teamSize')}</span>
            <input
              id="size"
              value={size}
              onChange={(e) => setSize(e.target.value.replace(/\D/g, '').slice(0, 2))}
              inputMode="numeric"
              placeholder="4"
              className="arcade-input min-h-14 rounded-2xl px-4 text-lg font-semibold text-white placeholder:text-cloud/45"
            />
          </label>
        )}

        {err && (
          <p id="join-err" role="alert" className="rounded-2xl border-[2px] border-night bg-coral px-4 py-2.5 fs-body font-semibold text-night">
            {err}
          </p>
        )}

        <Button type="submit" disabled={!valid} loading={busy}>
          <Icon n="play" size={20} />
          {t('join.go')}
        </Button>

        <p className="text-center fs-small text-cloud/70">{t('common.noAccount')}</p>
      </form>

      <details className="arcade-panel p-4 fs-small">
        <summary className="cursor-pointer font-semibold fs-body flex items-center justify-between text-gold">
          <span>{t('join.buddy.title')}</span>
          <Icon n="users" size={18} />
        </summary>
        <p className="mt-2 text-cloud/85 leading-relaxed">{t('join.buddy.body')}</p>
      </details>
    </div>
  );

  if (embedded) return cardContent;
  return <AppShell active="join">{cardContent}</AppShell>;
}
