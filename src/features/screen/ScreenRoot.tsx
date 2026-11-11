'use client';
import { useEffect, useState } from 'react';
import { GAME_META } from '@/shared/types';
import type { PlayerPublic, View } from '@/shared/types';
import { t } from '@/i18n';
import type { Conn } from '@/client/channel';
import { serverNow } from '@/client/clock';
import { enableSound, soundReady } from '@/client/sound';
import { Avatar } from '@/ui/avatars';
import { Button, Confetti, PhaseBanner, Podium, RoomCodeCard, Stage, TimerRing, Top5, Waves, Wordmark } from '@/ui/kit';
import { MascotView } from '@/ui/mascots';
import { QRPanel } from '@/ui/qr';
import { ScreenUI } from '../games/registry';
import { useCues } from './cues';
import { phaseTitle } from '../player/PlayerRoot';

export interface RoomUrls { join: string; short: string }

function Spotlight({ s }: { s: NonNullable<View['spotlight']> }) {
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
    <div className="a-fade absolute inset-0 z-40 grid place-items-center bg-night/95 p-6" role="alert" aria-label={t('lots.title')}>
      <div className="flex flex-col items-center gap-8 text-center">
        <h2 className="fs-h1 text-gold">{spinning ? t('lots.spinning') : t('lobby.front')}</h2>
        {spinning && cur ? (
          <div className="flex flex-wrap items-center justify-center gap-8 rounded-[28px] border-[6px] border-night bg-plank px-12 py-8 shadow-2xl">
            <Avatar avatar={cur.avatar} color={cur.color} size={180} />
            <span className="fs-h1 text-night">{cur.nickname}</span>
          </div>
        ) : (
          <ul className="flex max-w-[1600px] flex-wrap justify-center gap-8">
            {s.players.map((p: PlayerPublic, k) => (
              <li key={p.id} className="a-pop flex flex-col items-center gap-2" style={{ animationDelay: `${k * 400}ms` }}>
                <Avatar avatar={p.avatar} color={p.color} size={160} />
                <span className="fs-h2 text-white">{p.nickname}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function LobbyScreen({ view, urls }: { view: View; urls: RoomUrls | null }) {
  const players = (view.data.players ?? []) as PlayerPublic[];
  const gameMeta = GAME_META[view.gameId];
  return (
    <div className="relative flex h-full w-full flex-col justify-between p-6 lg:p-16 gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Wordmark size={56} />
        <div className="inline-flex items-center gap-3 rounded-full border-2 border-gold/40 bg-night-2/90 px-6 py-2">
          <MascotView name={gameMeta.mascot} expression="happy" size={52} />
          <span className="fs-h2 uppercase tracking-widest text-gold">{gameMeta.name}</span>
        </div>
      </header>

      <section className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
        <div className="flex flex-col items-center lg:items-start gap-5 text-center lg:text-left">
          <p className="fs-h2 text-cloud">{t('lobby.joinAt', { url: urls?.short ?? '…' })}</p>
          <RoomCodeCard code={view.room} big />
        </div>
        {urls && <QRPanel url={urls.join} size={340} />}
        <div className="hidden lg:block">
          <MascotView name="arky" expression="happy" size={320} />
        </div>
      </section>

      <section className="relative z-10 pb-8 lg:pb-24">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="fs-h1 text-white">{t('lobby.boarding')}</h2>
          <span className="fs-h2 text-gold" aria-live="polite">{t('lobby.aboard', { n: view.count.total })}</span>
        </div>
        <ul className="flex min-h-[148px] flex-wrap content-start gap-x-4 gap-y-3 rounded-[28px] border-[5px] border-night bg-night-2/90 p-5 shadow-xl">
          {players.map((p, i) => (
            <li key={p.id} className="a-pop flex flex-col items-center" style={{ animationDelay: `${Math.floor((i % 20) / 2) * 100}ms` }}>
              <Avatar avatar={p.avatar} color={p.color} size={84} />
              <span className="max-w-[120px] truncate fs-small font-semibold text-white mt-1">{p.nickname}</span>
            </li>
          ))}
        </ul>
      </section>
      <Waves className="absolute inset-x-0 bottom-0 h-32 pointer-events-none" />
    </div>
  );
}

export default function ScreenRoot({ view, conn, urls, preview }: { view: View | null; conn: Conn; urls: RoomUrls | null; preview?: boolean }) {
  const [sound, setSound] = useState(false);
  useEffect(() => setSound(soundReady()), []);
  useCues(view, sound && !preview);
  const Game = view ? ScreenUI[view.gameId] : null;

  let body;
  if (conn === 'closed' || view?.status === 'closed') {
    body = (
      <div className="grid h-full min-h-[70vh] place-items-center text-center p-8">
        <div className="flex flex-col items-center gap-6">
          <MascotView name="arky" expression="sleepy" size={320} />
          <h1 className="fs-h1">{t('room.closed')}</h1>
          <p className="fs-h2 text-gold">{t('end.great')}</p>
        </div>
      </div>
    );
  } else if (!view) {
    body = (
      <div className="grid h-full min-h-[70vh] place-items-center p-8">
        <div className="flex flex-col items-center gap-6">
          <MascotView name="olive" expression="fly" size={240} />
          <p className="fs-h2">{t('common.loading')}</p>
        </div>
      </div>
    );
  } else if (view.status === 'lobby') {
    body = <LobbyScreen view={view} urls={urls} />;
  } else if (view.phase === 'end') {
    body = (
      <div className="relative flex h-full min-h-[80vh] flex-col items-center justify-center gap-10 p-8 lg:p-16">
        <Confetti active />
        <h1 className="fs-h1 text-white">{t('end.thanks')}</h1>
        {view.podium && <Podium entries={view.podium} big />}
        <p className="fs-h2 text-gold">{t('end.great')}</p>
        <Waves className="absolute inset-x-0 bottom-0 h-32" />
      </div>
    );
  } else if (Game) {
    body = (
      <div className="relative flex h-full w-full flex-col p-6 lg:p-16 gap-6">
        <header className="flex flex-wrap items-center gap-4 lg:gap-8">
          <PhaseBanner className="lg:min-w-[520px] !px-6 !py-3 lg:!px-8 lg:!py-4 lg:!text-[52px]">{phaseTitle(view)}</PhaseBanner>
          {view.round != null && (
            <span className="fs-h2 uppercase tracking-widest text-gold">
              {t('screen.round', { n: view.round, total: view.rounds ?? '?' })}
            </span>
          )}
          <span className="ml-auto flex items-center gap-6">
            {view.status === 'paused' && (
              <span className="fs-h2 rounded-full bg-warning px-6 py-2 text-night font-semibold">
                {t('state.paused')}
              </span>
            )}
            <TimerRing endsAt={view.endsAt} pausedMs={view.pausedMs} size={140} />
          </span>
        </header>
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row gap-8 lg:gap-12">
          <div className="min-w-0 flex-1"><Game view={view} /></div>
          {view.top5 && view.top5.length > 0 && (
            <aside className="w-full lg:w-[600px] flex-none rounded-[28px] border-2 border-white/15 bg-night-2/90 p-6 lg:p-8 shadow-xl">
              <h2 className="fs-h2 mb-4 text-gold">{t('score.top5')}</h2>
              <Top5 entries={view.top5} big />
            </aside>
          )}
        </div>
      </div>
    );
  }
  return (
    <Stage fit={preview ? 'parent' : 'window'}>
      {body}
      {view?.spotlight && view.status !== 'closed' && <Spotlight key={view.spotlight.at} s={view.spotlight} />}
      {!preview && !sound && view && (
        <div className="fixed right-4 top-4 lg:absolute lg:right-8 lg:top-6 z-50">
          <Button variant="secondary" onClick={() => setSound(enableSound())} className="!min-h-12 lg:!min-h-[68px] lg:!text-[28px]">
            {t('sound.enable')}
          </Button>
        </div>
      )}
      {view?.status === 'paused' && <div className="sr-only" role="status">{t('state.paused')}</div>}
    </Stage>
  );
}
