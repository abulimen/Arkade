'use client';
import { useEffect, useState } from 'react';
import { GAME_META } from '@/shared/types';
import type { PlayerPublic, View } from '@/shared/types';
import { t } from '@/i18n';
import type { Conn } from '@/client/channel';
import { serverNow } from '@/client/clock';
import { enableSound, soundReady } from '@/client/sound';
import { Avatar } from '@/ui/avatars';
import { Button, Confetti, PhaseBanner, Podium, RoomCodeCard, Stage, TimerRing, Top5, Waves, Wordmark, useStageMobile } from '@/ui/kit';
import { MascotView } from '@/ui/mascots';
import { QRPanel } from '@/ui/qr';
import { ScreenUI } from '../games/registry';
import { useCues } from './cues';
import { phaseTitle } from '../player/PlayerRoot';

export interface RoomUrls { join: string; short: string }

function Spotlight({ s, mobile }: { s: NonNullable<View['spotlight']>; mobile: boolean }) {
  const [spinning, setSpinning] = useState(serverNow() - s.at < 4500);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!spinning) return;
    const a = setInterval(() => setI((x) => x + 1), 90);
    const b = setTimeout(() => setSpinning(false), Math.max(0, 4500 - (serverNow() - s.at)));
    return () => { clearInterval(a); clearTimeout(b); };
  }, [spinning, s.at]);
  const cur = s.players[i % Math.max(1, s.players.length)];
  return (
    <div className={`${mobile ? 'fixed' : 'absolute'} inset-0 z-40 grid place-items-center bg-night/95 p-6`} role="alert" aria-label={t('lots.title')}>
      <div className="flex flex-col items-center gap-6 text-center">
        <h2 className="fs-h1 text-gold">{spinning ? t('lots.spinning') : t('lobby.front')}</h2>
        {spinning && cur ? (
          <div className={`flex flex-wrap items-center justify-center rounded-[28px] border-[5px] border-night bg-plank shadow-2xl ${mobile ? 'gap-4 px-6 py-5' : 'gap-8 px-12 py-8'}`}>
            <Avatar avatar={cur.avatar} color={cur.color} size={mobile ? 96 : 180} />
            <span className="fs-h1 text-night">{cur.nickname}</span>
          </div>
        ) : (
          <ul className="flex max-w-[1600px] flex-wrap justify-center gap-6">
            {s.players.map((p: PlayerPublic, k) => (
              <li key={p.id} className="a-pop flex flex-col items-center gap-2" style={{ animationDelay: `${k * 400}ms` }}>
                <Avatar avatar={p.avatar} color={p.color} size={mobile ? 88 : 160} />
                <span className="fs-h2 text-white">{p.nickname}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function LobbyScreen({ view, urls, soundBtn }: { view: View; urls: RoomUrls | null; soundBtn: React.ReactNode }) {
  const mobile = useStageMobile();
  const players = (view.data.players ?? []) as PlayerPublic[];
  const gameMeta = GAME_META[view.gameId];

  if (mobile) {
    return (
      <div className="flex flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Wordmark size={32} />
          {soundBtn}
        </header>
        <div className="inline-flex items-center self-start gap-2.5 rounded-full border border-gold/40 bg-night-2/90 px-4 py-1.5">
          <MascotView name={gameMeta.mascot} expression="happy" size={32} />
          <span className="fs-body font-semibold text-gold">{gameMeta.name}</span>
        </div>
        <div className="arcade-card p-5 flex flex-col items-center gap-4 text-center">
          <p className="fs-body text-cloud">{t('lobby.joinAt', { url: urls?.short ?? '…' })}</p>
          <RoomCodeCard code={view.room} />
          {urls && <QRPanel url={urls.join} size={200} />}
        </div>
        <div className="arcade-panel p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="fs-h2 text-white">{t('lobby.boarding')}</h2>
            <span className="fs-small font-semibold text-gold" aria-live="polite">{t('lobby.aboard', { n: view.count.total })}</span>
          </div>
          <ul className="flex flex-wrap gap-3">
            {players.map((p) => (
              <li key={p.id} className="flex flex-col items-center">
                <Avatar avatar={p.avatar} color={p.color} size={48} />
                <span className="max-w-[72px] truncate text-xs font-semibold text-white mt-1">{p.nickname}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col justify-between p-14 gap-6">
      <header className="flex items-center justify-between gap-6 shrink-0">
        <Wordmark size={60} />
        <div className="flex items-center gap-4 ml-auto">
          {soundBtn}
          <div className="inline-flex items-center gap-3 rounded-full border-2 border-gold/40 bg-night-2/90 px-6 py-2">
            <MascotView name={gameMeta.mascot} expression="happy" size={56} />
            <span className="fs-h2 uppercase tracking-widest text-gold">{gameMeta.name}</span>
          </div>
        </div>
      </header>

      <section className="flex items-center justify-between gap-12 shrink-0">
        <div className="flex flex-col items-start gap-5 min-w-0">
          <p className="fs-h2 text-cloud">{t('lobby.joinAt', { url: urls?.short ?? '…' })}</p>
          <RoomCodeCard code={view.room} big />
        </div>
        {urls && <QRPanel url={urls.join} size={340} />}
        <MascotView name="arky" expression="happy" size={300} />
      </section>

      <section className="relative z-10 flex min-h-0 flex-1 flex-col justify-end pb-16">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="fs-h1 text-white">{t('lobby.boarding')}</h2>
          <span className="fs-h2 text-gold" aria-live="polite">{t('lobby.aboard', { n: view.count.total })}</span>
        </div>
        <ul className="flex min-h-[160px] flex-wrap content-start gap-x-4 gap-y-3 rounded-[28px] border-[5px] border-night bg-night-2/90 p-5 shadow-xl overflow-hidden">
          {players.map((p, i) => (
            <li key={p.id} className="a-pop flex flex-col items-center" style={{ animationDelay: `${Math.floor((i % 20) / 2) * 100}ms` }}>
              <Avatar avatar={p.avatar} color={p.color} size={84} />
              <span className="max-w-[120px] truncate fs-small font-semibold text-white mt-1">{p.nickname}</span>
            </li>
          ))}
        </ul>
      </section>
      <Waves className="absolute inset-x-0 bottom-0 h-28 pointer-events-none" />
    </div>
  );
}

function ScreenContent({
  view,
  conn,
  urls,
  preview,
  sound,
  onEnableSound,
}: {
  view: View | null;
  conn: Conn;
  urls: RoomUrls | null;
  preview?: boolean;
  sound: boolean;
  onEnableSound: () => void;
}) {
  const mobile = useStageMobile();
  const Game = view ? ScreenUI[view.gameId] : null;

  const soundBtn =
    !preview && !sound && view ? (
      <Button
        variant="secondary"
        small={mobile}
        onClick={onEnableSound}
        className={mobile ? '' : '!min-h-[68px] !px-6 !text-[28px]'}
      >
        {t('sound.enable')}
      </Button>
    ) : null;

  if (conn === 'closed' || view?.status === 'closed') {
    return (
      <div className="grid h-full min-h-[70vh] place-items-center text-center p-8">
        <div className="flex flex-col items-center gap-6">
          <MascotView name="arky" expression="sleepy" size={mobile ? 180 : 320} />
          <h1 className="fs-h1">{t('room.closed')}</h1>
          <p className="fs-h2 text-gold">{t('end.great')}</p>
        </div>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="grid h-full min-h-[70vh] place-items-center p-8">
        <div className="flex flex-col items-center gap-6">
          <MascotView name="olive" expression="fly" size={mobile ? 150 : 240} />
          <p className="fs-h2">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (view.status === 'lobby') {
    return (
      <>
        <LobbyScreen view={view} urls={urls} soundBtn={soundBtn} />
        {view.spotlight && <Spotlight key={view.spotlight.at} s={view.spotlight} mobile={mobile} />}
      </>
    );
  }

  if (view.phase === 'end') {
    return (
      <div className={`relative flex ${mobile ? 'flex-col gap-6 py-8' : 'h-full flex-col justify-center gap-10 p-16'} items-center text-center`}>
        {!mobile && <Confetti active />}
        {soundBtn}
        <h1 className="fs-h1 text-white">{t('end.thanks')}</h1>
        {view.podium && <Podium entries={view.podium} big={!mobile} />}
        <p className="fs-h2 text-gold">{t('end.great')}</p>
        {!mobile && <Waves className="absolute inset-x-0 bottom-0 h-28" />}
        {view.spotlight && <Spotlight key={view.spotlight.at} s={view.spotlight} mobile={mobile} />}
      </div>
    );
  }

  if (mobile) {
    return (
      <div className="flex flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <PhaseBanner className="text-left !px-4 !py-1.5">{phaseTitle(view)}</PhaseBanner>
          <div className="flex items-center gap-2 ml-auto">
            {soundBtn}
            <TimerRing endsAt={view.endsAt} pausedMs={view.pausedMs} size={56} />
          </div>
        </header>
        <div className="flex flex-wrap items-center gap-2">
          {view.round != null && (
            <span className="fs-small font-semibold uppercase tracking-wider text-gold">
              {t('screen.round', { n: view.round, total: view.rounds ?? '?' })}
            </span>
          )}
          {view.status === 'paused' && (
            <span className="fs-small rounded-full bg-warning px-3 py-0.5 text-night font-semibold">
              {t('state.paused')}
            </span>
          )}
        </div>
        {Game && (
          <div className="arcade-card p-4">
            <Game view={view} />
          </div>
        )}
        {view.top5 && view.top5.length > 0 && (
          <aside className="arcade-panel p-4">
            <h2 className="fs-h2 mb-3 text-gold">{t('score.top5')}</h2>
            <Top5 entries={view.top5} />
          </aside>
        )}
        {view.spotlight && <Spotlight key={view.spotlight.at} s={view.spotlight} mobile />}
        {view.status === 'paused' && <div className="sr-only" role="status">{t('state.paused')}</div>}
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col p-14 gap-5">
      <header className="flex items-center gap-6 shrink-0">
        <PhaseBanner className="shrink-0 !px-7 !py-3 !text-[42px] whitespace-nowrap">{phaseTitle(view)}</PhaseBanner>
        {view.round != null && (
          <span className="fs-h2 shrink-0 uppercase tracking-widest text-gold whitespace-nowrap">
            {t('screen.round', { n: view.round, total: view.rounds ?? '?' })}
          </span>
        )}
        <div className="ml-auto flex items-center gap-5 shrink-0">
          {soundBtn}
          {view.status === 'paused' && (
            <span className="fs-h2 rounded-full bg-warning px-6 py-2 text-night font-semibold whitespace-nowrap">
              {t('state.paused')}
            </span>
          )}
          <TimerRing endsAt={view.endsAt} pausedMs={view.pausedMs} size={136} />
        </div>
      </header>
      <div className="flex min-h-0 flex-1 gap-8 overflow-hidden">
        <div className="min-w-0 flex-1 overflow-hidden">{Game && <Game view={view} />}</div>
        {view.top5 && view.top5.length > 0 && (
          <aside className="w-[490px] flex-none rounded-[28px] border-2 border-white/15 bg-night-2/90 p-7 shadow-xl overflow-hidden">
            <h2 className="fs-h2 mb-4 text-gold">{t('score.top5')}</h2>
            <Top5 entries={view.top5} big />
          </aside>
        )}
      </div>
      {view.spotlight && <Spotlight key={view.spotlight.at} s={view.spotlight} mobile={false} />}
      {view.status === 'paused' && <div className="sr-only" role="status">{t('state.paused')}</div>}
    </div>
  );
}

export default function ScreenRoot({ view, conn, urls, preview }: { view: View | null; conn: Conn; urls: RoomUrls | null; preview?: boolean }) {
  const [sound, setSound] = useState(false);
  useEffect(() => setSound(soundReady()), []);
  useCues(view, sound && !preview);

  return (
    <Stage fit={preview ? 'parent' : 'window'}>
      <ScreenContent
        view={view}
        conn={conn}
        urls={urls}
        preview={preview}
        sound={sound}
        onEnableSound={() => setSound(enableSound())}
      />
    </Stage>
  );
}
