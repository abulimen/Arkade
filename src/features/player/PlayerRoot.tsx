'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GAME_META, type GameId, type View } from '@/shared/types';
import { t } from '@/i18n';
import { useChannel, type Ack } from '@/client/channel';
import { useReducedMotion, useWakeLock } from '@/client/hooks';
import { enableSound, haptic, playUi } from '@/client/sound';
import { Avatar, animalName } from '@/ui/avatars';
import { Icon } from '@/ui/icons';
import {
  Button,
  ConnectionPill,
  LiveRegion,
  PhaseBanner,
  Podium,
  TimerRing,
  Toast,
  Wordmark,
} from '@/ui/kit';
import { MascotView } from '@/ui/mascots';
import { SensoryPill } from '@/ui/shell';
import type { PlayerProps } from '@/features/games/types';
import { storeKey } from '../lobby/Join';
import SpotWolfPlayer from '@/features/games/spot-the-wolf/Player';
import FakeVersePlayer from '@/features/games/fake-verse/Player';
import GideonsPlayer from '@/features/games/gideons-300/Player';
import WcfPlayer from '@/features/games/what-came-first/Player';
import WhoAmIPlayer from '@/features/games/who-am-i/Player';

export const phaseTitle = (v: View) => {
  const specific = `ph.${v.gameId}.${v.phase}`;
  const trSpec = t(specific);
  if (trSpec !== specific) return trSpec;
  const generic = `ph.${v.phase}`;
  const trGen = t(generic);
  return trGen !== generic ? trGen : v.phase;
};

export { Podium };

const PlayerUI: Record<GameId, React.ComponentType<PlayerProps>> = {
  'spot-the-wolf': SpotWolfPlayer,
  'fake-verse': FakeVersePlayer,
  'gideons-300': GideonsPlayer,
  'what-came-first': WcfPlayer,
  'who-am-i': WhoAmIPlayer,
};

export default function PlayerRoot({ code }: { code: string }) {
  const router = useRouter();
  const [creds, setCreds] = useState<{ token: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useWakeLock(!!creds);

  const notify = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    const raw = localStorage.getItem(storeKey(code));
    if (!raw) {
      router.replace(`/j/${code}`);
      return;
    }
    try {
      const s = JSON.parse(raw) as { token?: string; nickname: string; kind?: string; teamSize?: number };
      fetch(`/api/rooms/${code}/join`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nickname: s.nickname,
          token: s.token,
          kind: s.kind,
          teamSize: s.teamSize,
        }),
      })
        .then(async (r) => {
          const j = await r.json();
          if (r.ok && j.token) {
            localStorage.setItem(storeKey(code), JSON.stringify({ ...s, token: j.token }));
            setCreds({ token: j.token });
          } else {
            localStorage.removeItem(storeKey(code));
            router.replace(`/j/${code}`);
          }
        })
        .catch(() => {
          if (s.token) setCreds({ token: s.token });
        });
    } catch {
      localStorage.removeItem(storeKey(code));
      router.replace(`/j/${code}`);
    }
  }, [code, router]);

  const ch = useChannel(creds ? { code, role: 'player', token: creds.token } : null);
  const view = ch.view;
  const phaseKey = view ? `${view.status}:${view.phase}:${view.round ?? ''}` : '';
  const announce =
    view && view.status !== 'lobby'
      ? `${phaseTitle(view)}${view.round ? `. ${t('phone.round', { n: view.round, total: view.rounds ?? '?' })}` : ''}`
      : '';

  useEffect(() => {
    if (view && view.status !== 'lobby') {
      playUi('ui-sheet');
      haptic('turn');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseKey]);

  const send = useCallback(
    async (type: string, payload?: unknown): Promise<Ack> => {
      void enableSound();
      if (!ch.sendPlayer) return { ok: false };
      const ack = await ch.sendPlayer(type, payload);
      if (!ack.ok) {
        playUi('ui-error');
        haptic('error');
        notify(ack.error === 'AGAIN' ? t('err.AGAIN') : ack.error ? `${t('err.generic')} (${ack.error})` : t('err.generic'));
      } else if (type === 'REROLL') {
        playUi('ui-snap');
        haptic('snap');
      } else if (type !== 'PING') {
        playUi('ui-lock');
        haptic('lock');
      }
      return ack;
    },
    [ch, notify],
  );

  if (ch.conn === 'closed' || ch.conn === 'kicked') {
    const kicked = ch.conn === 'kicked';
    return (
      <div className="min-h-dvh flex items-center justify-center p-5">
        <div className="arcade-panel max-w-sm w-full p-7 text-center space-y-5 a-pop">
          <Wordmark size={30} />
          <div className="mx-auto w-fit rounded-3xl border border-white/10 bg-night-3 p-4">
            <MascotView name="arky" expression={kicked ? 'oops' : 'sleepy'} size={108} animate decorative />
          </div>
          <h1 className="font-semibold text-white fs-h2">
            {kicked ? 'Removed from Room' : t('room.closed')}
          </h1>
          <p className="text-sm text-slate">
            {kicked
              ? 'The host removed your seat from this session.'
              : 'Thanks for playing Arkade! Ask the host for a fresh code or join another table.'}
          </p>
          <Link
            href="/join"
            onClick={() => localStorage.removeItem(storeKey(code))}
            className="cursor-pointer press inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold min-h-14 font-semibold text-night shadow-[0_10px_28px_-6px_rgba(255,208,38,0.45)]"
          >
            <span>{t('join.go')}</span>
            <Icon n="arrowRight" size={18} />
          </Link>
        </div>
      </div>
    );
  }

  if (!view || !view.me) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-5">
        <div className="arcade-panel max-w-sm w-full p-8 text-center space-y-4">
          <Wordmark size={30} />
          <div className="mx-auto w-fit rounded-3xl border border-white/10 bg-night-3 p-4">
            <MascotView name="olive" expression="happy" size={96} animate decorative />
          </div>
          <p className="text-sm font-semibold text-cloud animate-pulse">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const me = view.me;
  const meta = GAME_META[view.gameId];
  const ActivePlayer = PlayerUI[view.gameId];
  const showLeaderboard = view.gameId !== 'spot-the-wolf';

  return (
    <div className="min-h-dvh flex flex-col max-w-xl mx-auto px-3.5 pt-3 pb-24">
      <LiveRegion text={announce} />
      <Toast text={toast} />

      {/* Top Battleground HUD */}
      <header className="glass-hud rounded-3xl px-3.5 py-2.5 flex items-center justify-between gap-2.5 sticky top-2 z-30">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <Avatar avatar={me.avatar} color={me.color} size={42} />
            {showLeaderboard && me.rank != null && view.status !== 'results' && (
              <span className="absolute -bottom-1 -right-1 rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-extrabold text-night shadow">
                #{me.rank}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold text-white text-sm leading-tight">{me.nickname}</div>
            <div className="flex items-center gap-2 text-xs text-slate tabular-nums">
              {showLeaderboard && (
                <>
                  <span className="font-bold text-leaf">{me.score} pts</span>
                  <span className="text-white/25">•</span>
                </>
              )}
              <span className="font-mono font-semibold text-gold tracking-wider">{code}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {view.status === 'playing' && <TimerRing endsAt={view.endsAt} pausedMs={view.pausedMs} size={44} />}
          <ConnectionPill conn={ch.conn} />
          <SensoryPill compact />
        </div>
      </header>


      {/* Active Phase + Segmented Energy Round Track */}
      {view.status !== 'lobby' && view.status !== 'results' && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
          <PhaseBanner className="!px-4 !py-1.5 !text-sm">
            <span className="truncate max-w-[22ch]">{phaseTitle(view)}</span>
          </PhaseBanner>
          {view.round != null && view.rounds != null && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1" aria-hidden="true">
                {Array.from({ length: Math.min(view.rounds, 10) }, (_, idx) => (
                  <span
                    key={idx}
                    className={`h-2 w-4 rounded-full transition-all ${
                      idx + 1 < (view.round ?? 1)
                        ? 'bg-leaf'
                        : idx + 1 === view.round
                          ? 'bg-gold shadow-[0_0_8px_#FFD026]'
                          : 'bg-white/15'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-bold text-slate tabular-nums">
                {t('phone.round', { n: view.round, total: view.rounds })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 mt-4 flex flex-col">
        {view.status === 'paused' ? (
          <div className="arcade-panel p-7 my-auto text-center space-y-4 a-pop">
            <div className="mx-auto w-fit rounded-3xl border border-gold/30 bg-gold/10 p-4">
              <MascotView name="arky" expression="idle" size={108} animate decorative />
            </div>
            <h2 className="font-semibold text-white fs-h2">Paused by Host</h2>
            <p className="text-sm text-slate">Hold tight — your score and round timer are locked in.</p>
          </div>
        ) : view.status === 'lobby' ? (
          <div className="space-y-4 my-auto">
            <div className="arcade-panel relative overflow-hidden p-6 text-center space-y-4">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-64 rounded-full bg-leaf/20 blur-3xl"
              />
              <div className="relative z-10 inline-flex items-center gap-2 rounded-full border border-white/12 bg-night-3 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-gold">
                <span>{meta.name}</span>
                <span>•</span>
                <span>Room {code}</span>
              </div>

              <div className="relative z-10 mx-auto w-fit rounded-full p-2 border border-white/15 bg-night-3 shadow-[0_0_40px_-8px_rgba(56,236,130,0.4)]">
                <Avatar avatar={me.avatar} color={me.color} size={108} />
              </div>

              <div className="relative z-10 space-y-1">
                <h1 className="font-bold text-white fs-h1 leading-tight">{me.nickname}</h1>
                <p className="text-xs font-bold uppercase tracking-widest text-leaf">
                  {animalName(me.avatar)} Crew
                  {me.kind === 'team' ? ' · Team Device' : ''}
                </p>
              </div>

              {!me.rerolled && (
                <div className="relative z-10 pt-1">
                  <Button variant="ghost" small onClick={() => send('REROLL')}>
                    <Icon n="dice" size={16} />
                    <span>Swap Avatar</span>
                  </Button>
                </div>
              )}
            </div>

            <div className="arcade-card p-4 flex items-center gap-3.5">
              <div className="rounded-2xl border border-white/10 bg-night-3 p-2 shrink-0">
                <MascotView name={meta.mascot} expression="happy" size={52} animate decorative />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">You&apos;re locked in!</div>
                <p className="text-xs text-slate mt-0.5">
                  Watch the projector stage — the host will launch the match shortly.
                </p>
              </div>
            </div>
          </div>
        ) : view.status === 'results' && showLeaderboard ? (
          <PlayerEnd view={view} />
        ) : (
          <div className="flex-1 flex flex-col">
            <ActivePlayer view={view} send={send} notify={notify} />
          </div>
        )}
      </main>

      {/* Bottom Sticky Battleground Rank Strip (inspiration: leaderboard.jpg You #Rank pill) */}
      {showLeaderboard && view.status !== 'lobby' && view.status !== 'results' && me.rank != null && (
        <div className="fixed inset-x-0 bottom-3 z-20 px-4 pointer-events-none">
          <div className="mx-auto max-w-xl pointer-events-auto glass-hud rounded-full px-4 py-2.5 flex items-center justify-between gap-3 border border-leaf/35 shadow-[0_12px_32px_rgba(0,0,0,0.8)]">
            <div className="flex items-center gap-2.5">
              <span className="rounded-full bg-leaf px-2.5 py-0.5 text-xs font-extrabold text-night">YOU</span>
              <span className="text-sm font-bold text-white tabular-nums">
                #{me.rank} <span className="text-slate font-normal">/ {me.of}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-bold text-gold tabular-nums">
              <Icon n="trophy" size={15} />
              <span>{me.score} pts</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function PlayerEnd({ view }: { view: View }) {
  const reduced = useReducedMotion();
  const me = view.me;
  const meta = GAME_META[view.gameId];
  const myRank = me?.rank ?? 99;
  const topThree = myRank <= 3;
  const revealMs =
    myRank === 3 ? 8200
    : myRank === 2 ? 16200
    : myRank === 1 ? 29500
    : 36000;
  const [revealed, setRevealed] = useState(reduced);

  useEffect(() => {
    if (reduced) return;
    const id = window.setTimeout(() => {
      setRevealed(true);
      playUi('ui-lock');
      haptic(topThree ? 'success' : 'lock');
    }, revealMs);
    return () => window.clearTimeout(id);
  }, [reduced, revealMs, topThree]);

  return (
    <div className="arcade-panel p-6 sm:p-8 text-center space-y-6 my-auto a-pop relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-72 rounded-full bg-gold/20 blur-3xl"
      />
      <div className="relative z-10 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/15 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-gold">
        <Icon n="trophy" size={14} /> {revealed ? 'Match Complete' : 'Eyes on the Big Screen'}
      </div>

      <div className="relative z-10 mx-auto w-fit rounded-3xl border border-white/12 bg-night-3 p-4">
        <MascotView name={meta.mascot} expression={revealed && topThree ? 'cheer' : 'happy'} size={118} animate decorative />
      </div>

      {me && (
        <div className="relative z-10 grid grid-cols-2 gap-3 max-w-xs mx-auto">
          <div className={`rounded-2xl border p-3.5 transition-all ${revealed ? 'border-white/10 bg-night-3/80' : 'rv-throb border-gold/60 bg-gold/12'}`}>
            <div className="text-[11px] font-bold uppercase tracking-widest text-slate">Final Rank</div>
            <div className="font-bold text-gold text-3xl tabular-nums mt-1">
              {revealed ? `#${me.rank ?? '—'}` : '?'}
              <span className="text-sm text-slate font-medium">/{me.of}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-night-3/80 p-3.5">
            <div className="text-[11px] font-bold uppercase tracking-widest text-slate">Score</div>
            <div className="font-bold text-leaf text-3xl tabular-nums mt-1">{me.score}</div>
          </div>
        </div>
      )}

      <p className="relative z-10 text-sm text-slate">
        {revealed
          ? 'Thanks for playing! Check the big screen for the full standings.'
          : 'Watch the big screen as the Top 3 winners are revealed one by one…'}
      </p>

      <div className="relative z-10 flex gap-3">
        <Link
          href="/join"
          onClick={() => localStorage.removeItem(storeKey(view.room))}
          className="cursor-pointer press flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-gold min-h-14 font-semibold text-night"
        >
          <span>Join Another</span>
        </Link>
        <Link
          href="/"
          className="cursor-pointer press inline-flex items-center justify-center rounded-full border border-white/15 bg-night-3 px-5 min-h-14 font-semibold text-cloud hover:text-white"
        >
          <Icon n="home" size={18} />
        </Link>
      </div>
    </div>
  );
}
