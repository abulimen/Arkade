'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROOM_LETTERS } from '@/shared/types';
import { t } from '@/i18n';
import { Button, Wordmark } from '@/ui/kit';
import { MascotView } from '@/ui/mascots';

interface Info { code: string; gameName: string; mode: 'individual' | 'team'; status: string }
export const storeKey = (code: string) => `arkade:player:${code}`;

export function JoinForm({ initialCode = '' }: { initialCode?: string }) {
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
    fetch(`/api/rooms/${code}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => live && setInfo(j ?? 'none')).catch(() => live && setInfo('none'));
    return () => { live = false; };
  }, [code]);

  useEffect(() => {
    if (info && info !== 'none' && localStorage.getItem(storeKey(code))) router.replace(`/play/${code}`); // same device: rejoin as the same player
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
      if (!r.ok) { setErr(t(`join.err.${j.error}`) === `join.err.${j.error}` ? t('join.err.generic') : t(`join.err.${j.error}`)); setBusy(false); return; }
      localStorage.setItem(storeKey(code), JSON.stringify({ token: j.token, playerId: j.playerId, nickname: nick, kind: body.kind, teamSize: body.teamSize }));
      router.push(`/play/${code}`);
    } catch {
      setErr(t('join.err.generic'));
      setBusy(false);
    }
  };

  const valid = code.length === 4 && info && info !== 'none' && nick.trim().length >= 2;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-5 pb-safe pt-safe">
      <header className="flex flex-col items-center gap-1 pt-4 text-center">
        <MascotView name="arky" expression="happy" size={120} />
        <h1><Wordmark size={40} /></h1>
        <p className="fs-body text-cloud/90">{t('join.tagline')}</p>
      </header>
      <form onSubmit={submit} className="flex flex-col gap-4 rounded-3xl bg-night-2 p-5" aria-describedby={err ? 'join-err' : undefined}>
        <label className="flex flex-col gap-1 fs-body" htmlFor="code">
          {t('join.code')}
          <input
            id="code" value={code} inputMode="text" autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false} maxLength={4} placeholder="B K D F"
            onChange={(e) => setCode(e.target.value.toUpperCase().split('').filter((c) => ROOM_LETTERS.includes(c)).join(''))}
            className="min-h-14 rounded-xl border-[3px] border-night bg-night-3 px-4 text-center text-3xl font-semibold uppercase tracking-[0.4em] text-white placeholder:text-cloud/60"
          />
        </label>
        {code.length === 4 && info === 'none' && <p className="fs-small text-gold" role="alert">{t('join.err.ROOM_NOT_FOUND')}</p>}
        {info && info !== 'none' && <p className="fs-small text-leaf">{t('join.found', { game: info.gameName })}</p>}
        <label className="flex flex-col gap-1 fs-body" htmlFor="nick">
          {team ? t('join.team') : t('join.name')}
          <input id="nick" value={nick} onChange={(e) => setNick(e.target.value)} maxLength={16} autoComplete="nickname" placeholder="Ada"
            className="min-h-14 rounded-xl border-[3px] border-night bg-night-3 px-4 text-white placeholder:text-cloud/60" />
        </label>
        {team && (
          <label className="flex flex-col gap-1 fs-body" htmlFor="size">
            {t('join.teamSize')}
            <input id="size" value={size} onChange={(e) => setSize(e.target.value.replace(/\D/g, '').slice(0, 2))} inputMode="numeric" placeholder="4"
              className="min-h-14 rounded-xl border-[3px] border-night bg-night-3 px-4 text-white placeholder:text-cloud/60" />
          </label>
        )}
        {err && <p id="join-err" role="alert" className="rounded-xl bg-coral px-3 py-2 fs-body text-night">{err}</p>}
        <Button type="submit" disabled={!valid} loading={busy}>{t('join.go')}</Button>
        <p className="text-center fs-small text-cloud/80">{t('common.noAccount')}</p>
      </form>
      <details className="rounded-2xl bg-night-2 p-4 fs-small">
        <summary className="cursor-pointer font-semibold fs-body">{t('join.buddy.title')}</summary>
        <p className="mt-2 text-cloud">{t('join.buddy.body')}</p>
      </details>
    </main>
  );
}
