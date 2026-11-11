'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GAME_META, AVATAR_NAMES } from '@/shared/types';
import type { View } from '@/shared/types';
import { t } from '@/i18n';
import { useChannel } from '@/client/channel';
import { useWakeLock, vibrate } from '@/client/hooks';
import { Avatar } from '@/ui/avatars';
import { Button, ConnectionPill, LiveRegion, PlayerChip, TimerRing, Toast, Podium } from '@/ui/kit';
import { MascotView } from '@/ui/mascots';
import { PlayerUI } from '../games/registry';
import { storeKey } from '../lobby/Join';

export const phaseTitle = (v: View) => {
  const k = `ph.${v.gameId}.${v.phase}`;
  const g = t(k);
  return g !== k ? g : t(`ph.${v.phase}`);
};

function Shell({ view, conn, code, children }: { view: View | null; conn: Parameters<typeof ConnectionPill>[0]['conn']; code: string; children: ReactNode }) {
  const me = view?.me;
  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col bg-night">
      <header className="pt-safe flex items-center gap-2 px-4 pb-2">
        <ConnectionPill conn={conn} />
        <span className="fs-small text-cloud">{t('lobby.room', { code })}</span>
        <span className="ml-auto">{view && view.status !== 'lobby' && <TimerRing endsAt={view.endsAt} pausedMs={view.pausedMs} size={56} />}</span>
      </header>
      {view?.round != null && <div className="px-4 fs-small text-cloud">{t('phone.round', { n: view.round, total: view.rounds ?? '?' })} · {phaseTitle(view)}</div>}
      <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-2">{children}</main>
      {me && (
        <footer className="pb-safe flex items-center justify-between gap-2 border-t border-night-3 px-4 pt-2 fs-small">
          <PlayerChip p={me} score={me.score} size={32} />
          {view?.status !== 'lobby' && me.rank != null && <span className="text-cloud">{t('score.rank', { n: me.rank, of: me.of })}</span>}
        </footer>
      )}
    </div>
  );
}

function Lobby({ view, send }: { view: View; send: (t: string) => Promise<unknown> }) {
  const me = view.me!;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      {me.spotlighted ? (
        <div className="a-pop flex flex-col items-center gap-2 rounded-3xl border-[3px] border-night bg-gold p-6 text-night chunky" role="alert">
          <MascotView name="arky" expression="cheer" size={120} />
          <p className="fs-h1">{t('lobby.front')}</p>
        </div>
      ) : (
        <>
          <Avatar avatar={me.avatar} color={me.color} size={120} label={AVATAR_NAMES[me.avatar]} />
          <h1 className="fs-h1">{t('lobby.the', { name: me.nickname, animal: AVATAR_NAMES[me.avatar] })}</h1>
          <MascotView name="arky" expression="sleepy" size={120} />
          <p className="fs-body text-cloud">{t('lobby.waiting')}</p>
          <p className="fs-small text-cloud">{t('lobby.aboard', { n: view.count.total })} · {GAME_META[view.gameId].name}</p>
          <Button variant="secondary" disabled={me.rerolled} onClick={() => void send('REROLL')}>{me.rerolled ? t('lobby.rerolled') : t('lobby.reroll')}</Button>
          {view.config.mode === 'team' && <p className="fs-small text-cloud">{t('lobby.teamHint')}</p>}
        </>
      )}
    </div>
  );
}

export default function PlayerRoot({ code }: { code: string }) {
  const router = useRouter();
  const [creds, setCreds] = useState<{ token: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const raw = localStorage.getItem(storeKey(code));
    if (!raw) { router.replace(`/j/${code}`); return; }
    const s = JSON.parse(raw) as { token: string; nickname: string; kind: string; teamSize?: number };
    // Rejoin: the stored token returns the same player, same score. If the server forgot us we re-enter with the same name.
    fetch(`/api/rooms/${code}/join`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nickname: s.nickname, token: s.token, kind: s.kind, teamSize: s.teamSize }) })
      .then(async (r) => {
        const j = await r.json();
        if (r.ok) { localStorage.setItem(storeKey(code), JSON.stringify({ ...s, token: j.token })); setCreds({ token: j.token }); }
        else if (j.error === 'ROOM_NOT_FOUND' || j.error === 'ROOM_CLOSED') setCreds({ token: '' });
        else { localStorage.removeItem(storeKey(code)); router.replace(`/j/${code}`); }
      })
      .catch(() => setCreds({ token: s.token }));
  }, [code, router]);

  const ch = useChannel(creds?.token ? { code, role: 'player', token: creds.token } : null);
  const view = ch.view;
  useWakeLock(!!view && view.status !== 'closed' && view.status !== 'results');

  const notify = useCallback((m: string) => {
    setToast(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);
  const send = useCallback(async (type: string, payload?: unknown) => {
    const r = await (ch.sendPlayer?.(type, payload) ?? Promise.resolve({ ok: false, error: 'OFFLINE' }));
    if (!r.ok && r.error && r.error !== 'LOCKED') { const k = `err.${r.error}`; notify(t(k) === k ? t('err.generic') : t(k)); }
    else if (r.ok && type !== 'REROLL' && type !== 'PING') vibrate(30);
    return r;
  }, [ch, notify]);

  const phaseKey = view ? `${view.status}:${view.phase}:${view.round}` : '';
  const [announce, setAnnounce] = useState('');
  useEffect(() => { if (view && view.status !== 'lobby') setAnnounce(`${phaseTitle(view)}${view.round ? `. ${t('phone.round', { n: view.round, total: view.rounds ?? '?' })}` : ''}`); }, [phaseKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (creds && !creds.token) return <Message art="sleepy" title={t('room.closed')} body={t('room.closedBody')} />;
  if (ch.conn === 'closed') return <Message art="sleepy" title={t('room.closed')} body={t('room.closedBody')} />;
  if (ch.conn === 'kicked') return <Message art="oops" title={ch.reason === 'BANNED' ? t('join.err.BANNED') : t('room.kicked')} body={t('room.kickedBody')} />;
  if (!view || !view.me) {
    return (
      <Shell view={null} conn={ch.conn} code={code}>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center"><MascotView name="olive" expression="fly" size={96} /><p className="fs-body">{t('common.loading')}</p></div>
      </Shell>
    );
  }
  const Game = PlayerUI[view.gameId];
  return (
    <Shell view={view} conn={ch.conn} code={code}>
      <LiveRegion text={announce} />
      {view.status === 'lobby' ? <Lobby view={view} send={send} /> : <Game view={view} send={send} notify={notify} />}
      {view.status === 'paused' && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-night/90 p-6 text-center" role="alert">
          <div className="flex flex-col items-center gap-2"><MascotView name="arky" expression="sleepy" size={140} /><p className="fs-h1">{t('state.paused')}</p><p className="fs-body">{t('state.pausedBody')}</p></div>
        </div>
      )}
      {view.status === 'results' && <PlayerEnd view={view} />}
      <Toast text={toast} />
    </Shell>
  );
}

export function PlayerEnd({ view }: { view: View }) {
  const me = view.me!;
  return (
    <div className="a-slide flex flex-col items-center gap-3 rounded-3xl bg-night-2 p-5 text-center">
      <MascotView name="arky" expression="cheer" size={110} />
      <h2 className="fs-h1">{t('end.thanks')}</h2>
      {me.rank != null && <p className="fs-h2">{t('end.rank', { n: me.rank, of: me.of })}</p>}
      <p className="fs-body">{t('end.score', { n: me.score })}</p>
      <p className="fs-small text-cloud">{t('end.great')}</p>
      <Link href="/" className="fs-body underline">{t('end.again')}</Link>
    </div>
  );
}

function Message({ art, title, body }: { art: 'sleepy' | 'oops'; title: string; body: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <MascotView name="arky" expression={art} size={140} />
      <h1 className="fs-h1">{title}</h1>
      <p className="fs-body">{body}</p>
      <Link href="/" className="inline-flex min-h-14 items-center rounded-2xl border-[3px] border-night bg-gold px-6 font-semibold text-night fs-body chunky">{t('end.again')}</Link>
    </main>
  );
}

export { Podium };
