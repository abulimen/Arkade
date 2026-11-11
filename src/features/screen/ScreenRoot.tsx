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
    <div className="a-fade absolute inset-0 z-40 grid place-items-center bg-night/95" role="alert" aria-label={t('lots.title')}>
      <div className="flex flex-col items-center gap-8">
        <h2 className="fs-h1 text-gold">{spinning ? t('lots.spinning') : t('lobby.front')}</h2>
        {spinning && cur ? (
          <div className="flex items-center gap-8 rounded-[28px] border-[6px] border-night bg-plank px-16 py-8"><Avatar avatar={cur.avatar} color={cur.color} size={200} /><span className="fs-h1 text-night">{cur.nickname}</span></div>
        ) : (
          <ul className="flex max-w-[1600px] flex-wrap justify-center gap-8">
            {s.players.map((p: PlayerPublic, k) => (
              <li key={p.id} className="a-pop flex flex-col items-center gap-2" style={{ animationDelay: `${k * 400}ms` }}><Avatar avatar={p.avatar} color={p.color} size={180} /><span className="fs-h2 text-white">{p.nickname}</span></li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function LobbyScreen({ view, urls }: { view: View; urls: RoomUrls | null }) {
  const players = (view.data.players ?? []) as PlayerPublic[];
  return (
    <div className="relative h-full w-full p-16">
      <header className="flex items-center justify-between"><Wordmark size={72} /><span className="fs-h2 uppercase tracking-widest text-gold">{GAME_META[view.gameId].name}</span></header>
      <section className="mt-6 flex items-center justify-between gap-12">
        <div className="flex flex-col gap-6">
          <p className="fs-h2">{t('lobby.joinAt', { url: urls?.short ?? '…' })}</p>
          <RoomCodeCard code={view.room} big />
        </div>
        {urls && <QRPanel url={urls.join} size={380} />}
        <MascotView name="arky" expression="happy" size={360} />
      </section>
      <section className="absolute inset-x-16 bottom-52">
        <div className="mb-4 flex items-baseline gap-6"><h2 className="fs-h1">{t('lobby.boarding')}</h2><span className="fs-h2 text-gold" aria-live="polite">{t('lobby.aboard', { n: view.count.total })}</span></div>
        <ul className="flex min-h-[168px] flex-wrap content-start gap-x-4 gap-y-2 rounded-[28px] border-[6px] border-night bg-plank-dark/80 p-5">
          {players.map((p, i) => (
            <li key={p.id} className="a-pop flex flex-col items-center" style={{ animationDelay: `${(i % 12) * 0 + Math.floor((i % 20) / 2) * 120}ms` }}>
              <Avatar avatar={p.avatar} color={p.color} size={96} />
              <span className="max-w-[120px] truncate fs-small text-white">{p.nickname}</span>
            </li>
          ))}
        </ul>
      </section>
      <Waves className="absolute inset-x-0 bottom-0 h-40" />
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
    body = (<div className="grid h-full place-items-center text-center"><div className="flex flex-col items-center gap-6"><MascotView name="arky" expression="sleepy" size={420} /><h1 className="fs-h1">{t('room.closed')}</h1><p className="fs-h2">{t('end.great')}</p></div></div>);
  } else if (!view) {
    body = (<div className="grid h-full place-items-center"><div className="flex flex-col items-center gap-6"><MascotView name="olive" expression="fly" size={300} /><p className="fs-h2">{t('common.loading')}</p></div></div>);
  } else if (view.status === 'lobby') {
    body = <LobbyScreen view={view} urls={urls} />;
  } else if (view.phase === 'end') {
    body = (
      <div className="relative flex h-full flex-col items-center justify-center gap-10 p-16">
        <Confetti active />
        <h1 className="fs-h1">{t('end.thanks')}</h1>
        {view.podium && <Podium entries={view.podium} big />}
        <p className="fs-h2 text-gold">{t('end.great')}</p>
        <Waves className="absolute inset-x-0 bottom-0 h-32" />
      </div>
    );
  } else if (Game) {
    body = (
      <div className="relative flex h-full w-full flex-col p-16">
        <header className="flex items-center gap-8">
          <PhaseBanner className="min-w-[560px] !px-8 !py-4 !text-[56px]">{phaseTitle(view)}</PhaseBanner>
          {view.round != null && <span className="fs-h2 uppercase tracking-widest text-gold">{t('screen.round', { n: view.round, total: view.rounds ?? '?' })}</span>}
          <span className="ml-auto flex items-center gap-8">
            {view.status === 'paused' && <span className="fs-h2 rounded-full bg-warning px-8 py-2 text-night">{t('state.paused')}</span>}
            <TimerRing endsAt={view.endsAt} pausedMs={view.pausedMs} size={170} />
          </span>
        </header>
        <div className="mt-6 flex min-h-0 flex-1 gap-12">
          <div className="min-w-0 flex-1"><Game view={view} /></div>
          {view.top5 && view.top5.length > 0 && (<aside className="w-[640px] flex-none rounded-[28px] bg-night-2 p-8"><h2 className="fs-h2 mb-4 text-gold">{t('score.top5')}</h2><Top5 entries={view.top5} big /></aside>)}
        </div>
      </div>
    );
  }
  return (
    <Stage fit={preview ? 'parent' : 'window'}>
      {body}
      {view?.spotlight && view.status !== 'closed' && <Spotlight key={view.spotlight.at} s={view.spotlight} />}
      {!preview && !sound && view && (
        <div className="absolute right-8 top-6 z-50 stage"><Button variant="secondary" onClick={() => setSound(enableSound())} className="!min-h-[72px] !text-[32px]">{t('sound.enable')}</Button></div>
      )}
      {view?.status === 'paused' && <div className="sr-only" role="status">{t('state.paused')}</div>}
    </Stage>
  );
}
