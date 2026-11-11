'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { GAME_META } from '@/shared/types';
import { t } from '@/i18n';
import { useChannel } from '@/client/channel';
import { useMedia } from '@/client/hooks';
import { resolveUrls } from '@/client/urls';
import { Avatar, animalName } from '@/ui/avatars';
import { Button, ConnectionPill, TimerRing, Wordmark } from '@/ui/kit';
import { Icon } from '@/ui/icons';
import { McUI } from '../games/registry';
import ScreenRoot from '../screen/ScreenRoot';
import type { RoomUrls } from '../screen/ScreenRoot';
import { phaseTitle } from '../player/PlayerRoot';

function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl bg-night-2 p-4 ${className}`}>{title && <h2 className="fs-h2 mb-3">{title}</h2>}{children}</section>;
}

export default function McConsole({ code }: { code: string }) {
  const [key, setKey] = useState<string | null | undefined>(undefined);
  const [urls, setUrls] = useState<RoomUrls | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [lots, setLots] = useState(3);
  const [stage, setStage] = useState<string[]>([]);
  const [vol, setVol] = useState(70);
  const wide = useMedia('(min-width: 1024px)');
  const volTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const h = window.location.hash.match(/k=([a-f0-9]+)/)?.[1];
    if (h) localStorage.setItem(`arkade:host:${code}`, h);
    setKey(h ?? localStorage.getItem(`arkade:host:${code}`));
    fetch(`/api/rooms/${code}`).then((r) => r.json()).then((j) => setUrls(resolveUrls(j, code))).catch(() => undefined);
  }, [code]);

  const mc = useChannel(key ? { code, role: 'mc', key } : null);
  const scr = useChannel(key && wide ? { code, role: 'screen' } : null);
  const view = mc.view;

  const run = useCallback(async (type: string, payload?: unknown) => {
    const r = await (mc.sendMc?.(type, payload) ?? Promise.resolve({ ok: false, error: 'OFFLINE' }));
    if (!r.ok) { setMsg(t(`mc.err.${r.error}`) === `mc.err.${r.error}` ? t('err.generic') : t(`mc.err.${r.error}`)); setTimeout(() => setMsg(null), 3500); }
    return r;
  }, [mc]);

  if (key === null) return <main className="grid min-h-dvh place-items-center p-6 text-center"><div className="flex flex-col items-center gap-3"><h1 className="fs-h1">{t('mc.noKey')}</h1><p className="fs-body">{t('mc.noKeyBody')}</p><Link href="/mc" className="rounded-2xl border-[3px] border-night bg-gold px-6 py-3 font-semibold text-night">{t('mc.home')}</Link></div></main>;
  if (mc.conn === 'closed' || view?.status === 'closed') return <main className="grid min-h-dvh place-items-center p-6 text-center"><div className="flex flex-col items-center gap-3"><h1 className="fs-h1">{t('room.closed')}</h1><Link href="/mc" className="rounded-2xl border-[3px] border-night bg-gold px-6 py-3 font-semibold text-night">{t('mc.newRoom')}</Link></div></main>;
  if (!view || !view.mc) return <main className="grid min-h-dvh place-items-center"><p className="fs-body" role="status">{t('common.loading')}</p></main>;

  const info = view.mc;
  const Panel = McUI[view.gameId];
  const lobby = view.status === 'lobby';
  const playing = view.status === 'playing';
  const paused = view.status === 'paused';
  const results = view.status === 'results';
  const wolf = view.gameId === 'spot-the-wolf';
  const players = info.players;
  const need = GAME_META[view.gameId].minPlayers;
  const label = (id: string, children: ReactNode, onClick: () => void, o: { v?: 'primary' | 'secondary' | 'danger' | 'ghost'; off?: boolean } = {}) => (
    <Button key={id} variant={o.v ?? 'secondary'} small disabled={o.off} onClick={onClick}>{children}</Button>
  );

  return (
    <div className="min-h-dvh bg-night">
      <header className="flex flex-wrap items-center gap-3 border-b border-night-3 px-4 py-3">
        <Wordmark size={28} /><span className="rounded-full bg-night-3 px-2 fs-small">{t('mc.badge')}</span>
        <span className="fs-body">{t('mc.roomLine', { code, n: view.count.total })}</span>
        <span className="ml-auto"><ConnectionPill conn={mc.conn} /></span>
      </header>
      {msg && <p role="alert" className="mx-4 mt-3 rounded-xl bg-coral px-3 py-2 fs-body text-night">{msg}</p>}
      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="fs-small text-gold">{GAME_META[view.gameId].name}</p>
                <h1 className="fs-h1">{lobby ? t('mc.lobbyNow') : `${t('mc.now')}: ${view.round ? t('mc.roundLine', { n: view.round }) + ' · ' : ''}${phaseTitle(view)}`}</h1>
                <p className="mt-1 fs-body text-cloud"><span className="font-semibold text-gold">{t('mc.hint')}:</span> {t(info.hint)}</p>
              </div>
              {!lobby && <TimerRing endsAt={view.endsAt} pausedMs={view.pausedMs} size={96} />}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label={t('mc.controls')}>
              {lobby && label('start', <><Icon n="play" />{t('mc.start')}</>, () => void run('START', wolf && stage.length ? { stage } : undefined), { v: 'primary', off: wolf ? stage.length > 0 && (stage.length < need || stage.length > 10) : view.count.connected < need })}
              {(playing || paused) && (paused ? label('resume', <><Icon n="play" />{t('mc.resume')}</>, () => void run('RESUME'), { v: 'primary' }) : label('pause', <><Icon n="pause" />{t('mc.pause')}</>, () => void run('PAUSE')))}
              {(playing || paused) && label('skip', <><Icon n="skip" />{t('mc.skip')}</>, () => void run('SKIP'))}
              {(playing || paused) && label('time', <><Icon n="plus" />{t('mc.addTime')}</>, () => void run('ADD_TIME', { seconds: 15 }))}
              {info.controls.includes('next') && label('next', <><Icon n="skip" />{t('mc.next')}</>, () => void run('NEXT'))}
              {info.controls.includes('reask') && label('reask', <><Icon n="plus" />{t('mc.reask')}</>, () => void run('REASK'))}
              {!results && label('end', <><Icon n="stop" />{t('mc.end')}</>, () => { if (window.confirm(t('mc.endConfirm'))) void run('END'); }, { v: 'danger' })}
              {(results || lobby) && label('close', <><Icon n="cross" />{t('mc.close')}</>, () => void run('CLOSE'), { v: 'danger' })}
            </div>
            {lobby && view.count.connected < need && !wolf && <p className="mt-2 fs-small text-warning" role="status">{t('mc.needPlayers', { n: need })}</p>}
          </Card>

          {!lobby && <Panel view={view} mc={run} />}

          <Card title={t('mc.lots')}>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 fs-body">{t('mc.lotsN')}<input type="number" min={1} max={50} value={lots} onChange={(e) => setLots(Number(e.target.value))} className="min-h-12 w-20 rounded-xl border-[3px] border-night bg-night-3 px-2 text-center text-white" /></label>
              {label('lots', <><Icon n="dice" />{t('mc.castLots')}</>, () => void run('CAST_LOTS', { n: lots }))}
              {view.spotlight && label('clear', <><Icon n="cross" />{t('mc.clearLots')}</>, () => void run('CLEAR_LOTS'), { v: 'ghost' })}
            </div>
            {view.spotlight && <p className="mt-2 fs-small text-leaf" role="status">{t('mc.chosen', { names: view.spotlight.players.map((p) => p.nickname).join(', ') })}</p>}
            {wolf && lobby && <p className="mt-2 fs-small text-cloud">{t('mc.wolfStageHint')}</p>}
          </Card>

          <Card title={t('mc.sound')}>
            <div className="flex flex-wrap items-center gap-3">
              {label('snd', <><Icon n={view.sound.on ? 'volume' : 'volumeoff'} />{view.sound.on ? t('mc.soundOn') : t('mc.soundOff')}</>, () => void run('SOUND', { on: !view.sound.on }))}
              <label className="flex items-center gap-2 fs-body">{t('mc.volume')}
                <input type="range" min={0} max={100} value={vol} aria-label={t('mc.volume')} className="min-h-12"
                  onChange={(e) => { const v = Number(e.target.value); setVol(v); clearTimeout(volTimer.current); volTimer.current = setTimeout(() => void run('SOUND', { volume: v / 100 }), 250); }} />
              </label>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          {wide && <Card title={t('mc.preview')}><ScreenRoot view={scr.view} conn={scr.conn} urls={urls} preview /></Card>}
          <Card title={t('mc.share')}>
            <ul className="flex flex-col gap-2 fs-body">
              <li>{t('mc.joinUrl')}: <span className="font-semibold text-gold">{urls?.short ?? '…'}</span></li>
              <li><a className="underline" href={`/screen/${code}`} target="_blank" rel="noreferrer">{t('mc.openScreen')}</a></li>
            </ul>
          </Card>
          <Card title={`${t('mc.players')} (${view.count.connected}/${view.count.total})`}>
            <p className="mb-2 fs-small text-cloud" role="status">{t('mc.diag', { c: info.diag.connected, a: info.diag.away, ms: info.diag.medianRtt ?? '–' })}</p>
            <ul className="max-h-96 divide-y divide-night-3 overflow-y-auto" aria-label={t('mc.players')}>
              {players.map(([id, nick, av, on, role, kind]) => (
                <li key={id} className="flex items-center gap-2 py-1.5" style={{ contentVisibility: 'auto', containIntrinsicSize: '56px' }}>
                  {wolf && lobby && <input type="checkbox" className="h-6 w-6" aria-label={t('mc.onStage', { name: nick })} checked={stage.includes(id)} onChange={(e) => setStage((s) => (e.target.checked ? [...s, id] : s.filter((x) => x !== id)))} />}
                  <Avatar avatar={av} color={0} size={36} label={animalName(av)} />
                  <span className="min-w-0 flex-1 truncate fs-body">{nick}{kind === 'team' ? ' ⬢' : ''}{role === 'spectator' ? ` (${t('mc.spectator')})` : ''}</span>
                  <span className="flex items-center gap-1 fs-small"><Icon n={on ? 'wifi' : 'wifioff'} size={16} style={{ color: on ? '#2ED573' : '#FFA502' }} />{on ? t('conn.connected') : t('mc.away')}</span>
                  <button type="button" aria-label={t('mc.kick', { name: nick })} onClick={() => void run('KICK', { playerId: id })} className="grid h-12 w-12 place-items-center rounded-xl bg-night-3"><Icon n="kick" /></button>
                  <button type="button" aria-label={t('mc.ban', { name: nick })} onClick={() => { if (window.confirm(t('mc.banConfirm', { name: nick }))) void run('BAN', { playerId: id }); }} className="grid h-12 w-12 place-items-center rounded-xl bg-coral text-night"><Icon n="stop" /></button>
                </li>
              ))}
              {players.length === 0 && <li className="py-3 fs-body text-cloud">{t('mc.noPlayers')}</li>}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
