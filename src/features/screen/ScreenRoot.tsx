'use client';

import { useEffect, useState } from 'react';
import { GAME_META, type GameId, type PlayerPublic, type View } from '@/shared/types';
import { t } from '@/i18n';
import type { Conn } from '@/client/channel';
import { Icon } from '@/ui/icons';
import {
  ConnectionPill,
  PhaseBanner,
  PlayerChip,
  RoomCodeCard,
  Stage,
  TimerRing,
  Top5,
  Waves,
  Wordmark,
  useStageMobile,
} from '@/ui/kit';
import { MascotView } from '@/ui/mascots';
import { QRPanel } from '@/ui/qr';
import { phaseTitle } from '../player/PlayerRoot';
import { useCues } from './cues';
import { ResultsShow } from './ResultsShow';
import CountdownStage from '@/features/games/CountdownStage';
import type { ScreenProps } from '@/features/games/types';
import SpotWolfScreen from '@/features/games/spot-the-wolf/Screen';
import FakeVerseScreen from '@/features/games/fake-verse/Screen';
import GideonsScreen from '@/features/games/gideons-300/Screen';
import WcfScreen from '@/features/games/what-came-first/Screen';
import WhoAmIScreen from '@/features/games/who-am-i/Screen';

export interface RoomUrls {
  join: string;
  short: string;
}

const ScreenUI: Record<GameId, React.ComponentType<ScreenProps>> = {
  'spot-the-wolf': SpotWolfScreen,
  'fake-verse': FakeVerseScreen,
  'gideons-300': GideonsScreen,
  'what-came-first': WcfScreen,
  'who-am-i': WhoAmIScreen,
};

export default function ScreenRoot({
  view,
  conn,
  urls,
  preview = false,
}: {
  view: View | null;
  conn: Conn;
  urls?: RoomUrls | null;
  preview?: boolean;
}) {
  useCues(view, (view?.sound?.on ?? true) && !preview);

  return (
    <Stage fit={preview ? 'parent' : 'window'}>
      <ScreenInner view={view} conn={conn} urls={urls} preview={preview} />
    </Stage>
  );
}

function ScreenInner({
  view,
  conn,
  urls,
  preview,
}: {
  view: View | null;
  conn: Conn;
  urls?: RoomUrls | null;
  preview: boolean;
}) {
  const mobile = useStageMobile();

  if (conn === 'closed') {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-8 p-8 text-center">
        <Wordmark size={mobile ? 38 : 64} />
        <MascotView name="arky" expression="sleepy" size={mobile ? 120 : 210} animate decorative />
        <div className="font-bold text-white" style={{ fontSize: mobile ? 24 : 52 }}>
          {t('room.closed')}
        </div>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-6 p-8 text-center">
        <Wordmark size={mobile ? 38 : 68} />
        <MascotView name="olive" expression="happy" size={mobile ? 110 : 180} animate decorative />
        <div className="font-semibold text-slate animate-pulse" style={{ fontSize: mobile ? 18 : 34 }}>
          {t('common.loading')}
        </div>
      </div>
    );
  }

  const meta = GAME_META[view.gameId];

  if (view.status === 'lobby') {
    const players = ((view.data as { players?: PlayerPublic[] }).players ?? []);
    const joinUrl =
      urls?.join ?? (typeof window !== 'undefined' ? `${window.location.origin}/j/${view.room}` : `/j/${view.room}`);
    const short = urls?.short ?? `/j/${view.room}`;

    if (mobile) {
      return (
        <div className="min-h-full w-full p-5 space-y-5 flex flex-col">
          <div className="flex items-center justify-between">
            <Wordmark size={26} />
            <ConnectionPill conn={conn} />
          </div>
          <div className="arcade-panel p-5 space-y-4 text-center">
            <div className="text-xs font-bold uppercase tracking-widest text-gold">{meta.name}</div>
            <h1 className="font-bold text-white text-xl">{meta.tagline}</h1>
            <RoomCodeCard code={view.room} />
            <div className="flex justify-center">
              <QRPanel url={joinUrl} size={170} />
            </div>
            <div className="font-mono text-sm font-bold text-sky">{short}</div>
          </div>
          <div className="arcade-card p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate">
              <span>{t('mc.players')}</span>
              <span className="text-leaf">{view.count.total} joined</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {players.slice(0, 24).map((p) => (
                <PlayerChip key={p.id} p={p} size={30} />
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full w-full p-14 flex flex-col justify-between relative overflow-hidden">
        <Waves className="opacity-55" />
        {/* Top Broadcast Bar */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Wordmark size={54} />
            <span className="rounded-full border border-gold/45 bg-gold/15 px-6 py-2 text-[24px] font-bold uppercase tracking-widest text-gold">
              {meta.name}
            </span>
          </div>
          <ConnectionPill conn={conn} />
        </div>

        {/* Center Stage Split */}
        <div className="relative z-10 grid grid-cols-[1.15fr_0.85fr] gap-12 items-center my-auto">
          <div className="space-y-8">
            <div className="space-y-3">
              <div className="text-[22px] font-bold uppercase tracking-[0.2em] text-leaf">Join the Showtime Deck</div>
              <h1 className="font-bold text-white text-[58px] leading-[1.08] tracking-tight max-w-3xl">
                {meta.tagline}
              </h1>
            </div>

            <div className="flex items-center gap-10">
              <QRPanel url={joinUrl} size={270} />
              <div className="space-y-5">
                <RoomCodeCard code={view.room} big />
                <div className="rounded-2xl border border-white/15 bg-night-2/90 px-6 py-3 font-mono text-[26px] font-bold text-sky">
                  {short}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-4 text-[22px] font-bold uppercase tracking-widest text-slate">
                <span>Live Crew</span>
                <span className="rounded-full bg-leaf/20 border border-leaf/40 px-4 py-1 text-leaf">
                  {view.count.connected} Ready
                </span>
              </div>
              <div className="flex flex-wrap gap-3 max-w-4xl">
                {players.slice(0, 18).map((p) => (
                  <PlayerChip key={p.id} p={p} big />
                ))}
              </div>
            </div>
          </div>

          {/* Right Mascot Spotlight Breakout */}
          <div className="relative flex flex-col items-center justify-center">
            <div
              aria-hidden="true"
              className="absolute h-[460px] w-[460px] rounded-full bg-gradient-to-br from-leaf/25 via-sky/15 to-gold/25 blur-3xl"
            />
            <div className="relative arcade-panel p-10 flex flex-col items-center gap-5 border-white/15 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.95)]">
              <MascotView name={meta.mascot} expression="cheer" size={300} animate decorative />
              <div className="text-center">
                <div className="text-[22px] font-bold uppercase tracking-widest text-gold">Waiting for Host</div>
                <div className="text-[26px] font-semibold text-cloud mt-1">
                  {t('mc.minPlayers', { n: meta.minPlayers })} · {t('mc.minutes', { a: meta.est[0], b: meta.est[1] })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[22px] font-semibold text-slate">
          <span>{t('common.noAccount')}</span>
          <span>Arkade Broadcast Engine · 1080p</span>
        </div>
      </div>
    );
  }

  const isCountdown = view.phase === 'countdown';

  if ((view.status === 'results' || view.phase === 'end') && view.gameId !== 'spot-the-wolf') {
    const podiumKey = `${view.room}-${(view.podium ?? []).map((p) => p.id).join(',')}`;
    return <ResultsShow key={podiumKey} view={view} gameName={meta.name} mobile={mobile} preview={preview} />;
  }

  const ActiveScreen = isCountdown ? null : ScreenUI[view.gameId];

  const showTop5 = Boolean(view.top5?.length);
  // Re-run the staged reveal only when the standings actually change, not on every phase tick.
  const top5Key = `${view.round ?? 0}:${(view.top5 ?? []).map((e) => `${e.id}=${e.score}`).join('|')}`;

  if (mobile) {
    return (
      <div className="min-h-full w-full p-4 space-y-4 flex flex-col">
        <div className="flex items-center justify-between gap-2">
          <Wordmark size={24} />
          <PhaseBanner className="text-left !px-4 !py-1.5">{phaseTitle(view)}</PhaseBanner>
          <TimerRing endsAt={view.endsAt} pausedMs={view.pausedMs} size={52} />
        </div>

        <div className="flex-1 flex flex-col justify-center">
          {isCountdown || !ActiveScreen ? (
            <CountdownStage view={view} surface="screen" mobile={mobile} preview={preview} />
          ) : (
            <ActiveScreen view={view} preview={preview} />
          )}
        </div>

        {showTop5 && (
          <div className="arcade-panel p-4 space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-widest text-gold">Gold League Top 5</div>
            <Top5 key={top5Key} entries={view.top5!} suspense={!preview} endsAt={view.endsAt} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full w-full p-12 flex flex-col justify-between relative overflow-hidden">
      {/* Top Broadcast HUD */}
      <div className="relative z-10 flex items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <Wordmark size={44} />
          <div className="rounded-2xl border border-white/15 bg-night-2/90 px-5 py-2 font-mono font-bold tracking-[0.22em] text-gold text-[26px]">
            {view.room}
          </div>
          {view.round != null && view.rounds != null && (
            <div className="rounded-full border border-white/12 bg-night-3 px-5 py-2 text-[22px] font-semibold text-cloud tabular-nums">
              {t('screen.round', { n: view.round, total: view.rounds })}
            </div>
          )}
        </div>

        <PhaseBanner className="shrink-0 !px-7 !py-3 !text-[42px] whitespace-nowrap">{phaseTitle(view)}</PhaseBanner>

        <div className="flex items-center gap-4">
          <ConnectionPill conn={conn} />
          <TimerRing endsAt={view.endsAt} pausedMs={view.pausedMs} size={96} />
        </div>
      </div>

      {/* Center Broadcast Canvas + Optional Right League Leaderboard Dock */}
      <div
        className={`relative z-10 flex-1 my-6 grid gap-10 items-center ${
          showTop5 ? 'grid-cols-[1.38fr_0.62fr]' : 'grid-cols-1'
        }`}
      >
        <div className="h-full flex flex-col justify-center min-w-0">
          {isCountdown || !ActiveScreen ? (
            <CountdownStage view={view} surface="screen" mobile={mobile} preview={preview} />
          ) : (
            <ActiveScreen view={view} preview={preview} />
          )}
        </div>

        {showTop5 && (
          <aside className="arcade-panel p-6 space-y-4 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.85)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[22px] font-bold uppercase tracking-widest text-gold">
                <Icon n="trophy" size={24} /> <span>Gold League</span>
              </div>
              <span className="text-[18px] font-semibold text-slate">Top 5</span>
            </div>
            <Top5 key={top5Key} entries={view.top5!} big suspense={!preview} endsAt={view.endsAt} />
          </aside>
        )}
      </div>

      {view.status === 'paused' && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/70 backdrop-blur-md">
          <div className="arcade-panel px-14 py-10 text-center space-y-4 a-pop">
            <MascotView name="arky" expression="idle" size={140} decorative />
            <div className="font-bold text-gold text-[48px]">Show Paused</div>
            <p className="text-cloud text-[26px]">Resuming momentarily…</p>
          </div>
        </div>
      )}

    </div>
  );
}
