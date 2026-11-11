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
import { Icon } from '@/ui/icons';
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
    <div className="mx-auto flex h-dvh max-w-md flex-col">
      <header className="pt-safe glass-hud border-b border-white/10 px-4 py-2.5 flex items-center gap-2.5 shrink-0">
        <Link
          href="/"
          aria-label="Home"
          className="cursor-pointer grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-night-3/80 text-cloud hover:text-gold transition"
        >
          <Icon n="home" size={17} />
        </Link>
        <ConnectionPill conn={conn} />
        <span className="rounded-full border border-gold/40 bg-gold/15 px-3 py-1 fs-small font-semibold text-gold tracking-wider">
          {t('lobby.room', { code })}
        </span>
        <span className="ml-auto">
          {view && view.status !== 'lobby' && <TimerRing endsAt={view.endsAt} pausedMs={view.pausedMs} size={52} />}
        </span>
      </header>

      {view?.round != null && (
        <div className="bg-night-2/80 border-b border-white/10 px-4 py-1.5 flex items-center justify-between fs-small font-semibold text-cloud">
          <span className="text-gold">{t('phone.round', { n: view.round, total: view.rounds ?? '?' })}</span>
          <span className="truncate max-w-[22ch]">{phaseTitle(view)}</span>
        </div>
      )}

      <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">{children}</main>

      {me && (
        <footer className="pb-safe glass-hud border-t border-white/15 px-4 pt-2.5 flex items-center justify-between gap-2 fs-small shrink-0">
          <PlayerChip p={me} score={me.score} size={34} />
          {view?.status !== 'lobby' && me.rank != null && (
            <span className="rounded-full bg-night-3 border border-white/15 px-3 py-1 font-semibold text-gold">
              {t('score.rank', { n: me.rank, of: me.of })}
            </span>
          )}
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
        <div className="a-pop flex flex-col items-center gap-3 rounded-3xl border-[3px] border-night bg-gold p-6 text-night chunky w-full" role="alert">
          <MascotView name="arky" expression="cheer" size={120} />
          <p className="fs-h1">{t('lobby.front')}</p>
        </div>
      ) : (
        <div className="arcade-card p-6 w-full flex flex-col items-center gap-4">
          <Avatar avatar={me.avatar} color={me.color} size={112} label={AVATAR_NAMES[me.avatar]} />
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 border border-gold/35 px-3 py-0.5 text-xs font-semibold text-gold mb-1">
              {GAME_META[view.gameId].name}
            </div>
            <h1 className="fs-h1 text-white">{t('lobby.the', { name: me.nickname, animal: AVATAR_NAMES[me.avatar] })}</h1>
          </div>

          <div className="arcade-panel p-4 w-full flex items-center gap-3 text-left">
            <MascotView name={GAME_META[view.gameId].mascot} expression="happy" size={64} />
            <div className="min-w-0 flex-1">
              <p className="fs-body font-semibold text-white">{t('lobby.waiting')}</p>
              <p className="fs-small text-gold mt-0.5">{t('lobby.aboard', { n: view.count.total })}</p>
            </div>
          </div>

          <Button variant="secondary" small disabled={me.rerolled} onClick={() => void send('REROLL')} className="w-full">
            <Icon n="dice" size={18} />
            {me.rerolled ? t('lobby.rerolled') : t('lobby.reroll')}
          </Button>
          {view.config.mode === 'team' && <p className="fs-small text-cloud/80">{t('lobby.teamHint')}</p>}
        </div>
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
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <MascotView name="olive" expression="fly" size={96} />
          <p className="fs-body">{t('common.loading')}</p>
        </div>
      </Shell>
    );
  }
  const Game = PlayerUI[view.gameId];
  return (
    <Shell view={view} conn={ch.conn} code={code}>
      <LiveRegion text={announce} />
      {view.status === 'lobby' ? <Lobby view={view} send={send} /> : <Game view={view} send={send} notify={notify} />}
      {view.status === 'paused' && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-night/90 backdrop-blur-sm p-6 text-center" role="alert">
          <div className="arcade-card p-6 flex flex-col items-center gap-2 max-w-xs w-full">
            <MascotView name="arky" expression="sleepy" size={130} />
            <p className="fs-h1 text-gold">{t('state.paused')}</p>
            <p className="fs-body text-cloud/85">{t('state.pausedBody')}</p>
          </div>
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
    <div className="a-slide arcade-card flex flex-col items-center gap-3 p-6 text-center">
      <MascotView name="arky" expression="cheer" size={110} />
      <h2 className="fs-h1 text-white">{t('end.thanks')}</h2>
      {me.rank != null && <p className="fs-h2 text-gold">{t('end.rank', { n: me.rank, of: me.of })}</p>}
      <p className="fs-body font-semibold text-leaf">{t('end.score', { n: me.score })}</p>
      <p className="fs-small text-cloud/80">{t('end.great')}</p>
      <Link href="/" className="cursor-pointer press chunky mt-2 inline-flex min-h-12 items-center justify-center rounded-2xl border-[3px] border-night bg-gold px-6 font-semibold text-night fs-body">
        {t('end.again')}
      </Link>
    </div>
  );
}

function Message({ art, title, body }: { art: 'sleepy' | 'oops'; title: string; body: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="arcade-card p-6 w-full flex flex-col items-center gap-3">
        <MascotView name="arky" expression={art} size={130} />
        <h1 className="fs-h1 text-white">{title}</h1>
        <p className="fs-body text-cloud/85">{body}</p>
        <Link href="/" className="cursor-pointer press chunky mt-2 inline-flex min-h-14 w-full items-center justify-center rounded-2xl border-[3px] border-night bg-gold px-6 font-semibold text-night fs-body">
          {t('end.again')}
        </Link>
      </div>
    </main>
  );
}

export { Podium };
