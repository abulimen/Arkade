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
import { PwaInstallButton } from '@/ui/pwa';
import { McUI } from '../games/registry';
import ScreenRoot from '../screen/ScreenRoot';
import type { RoomUrls } from '../screen/ScreenRoot';
import { phaseTitle } from '../player/PlayerRoot';

function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`arcade-card p-4 sm:p-5 ${className}`}>
      {title && <h2 className="fs-h2 mb-3 text-white">{title}</h2>}
      {children}
    </section>
  );
}

type MobileTab = 'stage' | 'players' | 'tools' | 'preview';

export default function McConsole({ code }: { code: string }) {
  const [key, setKey] = useState<string | null | undefined>(undefined);
  const [urls, setUrls] = useState<RoomUrls | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [lots, setLots] = useState(3);
  const [stage, setStage] = useState<string[]>([]);
  const [vol, setVol] = useState(70);
  const [tab, setTab] = useState<MobileTab>('stage');
  const [confirmModal, setConfirmModal] = useState<{ title: string; onConfirm: () => void } | null>(null);
  const wide = useMedia('(min-width: 1024px)');
  const volTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const h = window.location.hash.match(/k=([a-f0-9]+)/)?.[1];
    if (h) localStorage.setItem(`arkade:host:${code}`, h);
    setKey(h ?? localStorage.getItem(`arkade:host:${code}`));
    fetch(`/api/rooms/${code}`).then((r) => r.json()).then((j) => setUrls(resolveUrls(j, code))).catch(() => undefined);
  }, [code]);

  const mc = useChannel(key ? { code, role: 'mc', key } : null);
  const scr = useChannel(key && (wide || tab === 'preview') ? { code, role: 'screen' } : null);
  const view = mc.view;

  const run = useCallback(async (type: string, payload?: unknown) => {
    const r = await (mc.sendMc?.(type, payload) ?? Promise.resolve({ ok: false, error: 'OFFLINE' }));
    if (!r.ok) { setMsg(t(`mc.err.${r.error}`) === `mc.err.${r.error}` ? t('err.generic') : t(`mc.err.${r.error}`)); setTimeout(() => setMsg(null), 3500); }
    return r;
  }, [mc]);

  if (key === null) {
    return (
      <main className="grid min-h-dvh place-items-center p-6 text-center">
        <div className="arcade-card p-6 max-w-md flex flex-col items-center gap-3">
          <h1 className="fs-h1 text-white">{t('mc.noKey')}</h1>
          <p className="fs-body text-cloud/85">{t('mc.noKeyBody')}</p>
          <Link href="/mc" className="cursor-pointer rounded-2xl border-[3px] border-night bg-gold px-6 py-3 font-semibold text-night">
            {t('mc.home')}
          </Link>
        </div>
      </main>
    );
  }
  if (mc.conn === 'closed' || view?.status === 'closed') {
    return (
      <main className="grid min-h-dvh place-items-center p-6 text-center">
        <div className="arcade-card p-6 max-w-md flex flex-col items-center gap-3">
          <h1 className="fs-h1 text-white">{t('room.closed')}</h1>
          <Link href="/mc" className="cursor-pointer rounded-2xl border-[3px] border-night bg-gold px-6 py-3 font-semibold text-night">
            {t('mc.newRoom')}
          </Link>
        </div>
      </main>
    );
  }
  if (!view || !view.mc) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <p className="fs-body" role="status">{t('common.loading')}</p>
      </main>
    );
  }

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
    <div className="min-h-dvh pb-24 lg:pb-8">
      <header className="sticky top-0 z-30 glass-hud flex flex-wrap items-center gap-3 border-b border-white/15 px-4 py-3">
        <Link href="/mc" className="cursor-pointer">
          <Wordmark size={28} />
        </Link>
        <span className="rounded-full border border-coral/40 bg-coral/15 px-2.5 py-0.5 fs-small font-semibold text-coral">
          {t('mc.badge')}
        </span>
        <span className="rounded-full bg-night-3 border border-white/15 px-3 py-1 fs-small font-semibold text-gold">
          {t('mc.roomLine', { code, n: view.count.total })}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <PwaInstallButton app="mc" />
          <ConnectionPill conn={mc.conn} />
        </div>
      </header>

      {msg && (
        <p role="alert" className="mx-4 mt-3 rounded-2xl border-2 border-night bg-coral px-4 py-2.5 fs-body font-semibold text-night">
          {msg}
        </p>
      )}

      <div className="mx-auto max-w-7xl grid gap-4 p-4 lg:grid-cols-2">
        {/* Left Column: Transport Deck + Active Mobile Tab / Desktop Stack */}
        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="fs-small font-semibold uppercase tracking-wider text-gold">{GAME_META[view.gameId].name}</p>
                <h1 className="fs-h1 text-white mt-0.5">
                  {lobby ? t('mc.lobbyNow') : `${t('mc.now')}: ${view.round ? t('mc.roundLine', { n: view.round }) + ' · ' : ''}${phaseTitle(view)}`}
                </h1>
                <p className="mt-1.5 fs-body text-cloud/90">
                  <span className="font-semibold text-gold">{t('mc.hint')}:</span> {t(info.hint)}
                </p>
              </div>
              {!lobby && <TimerRing endsAt={view.endsAt} pausedMs={view.pausedMs} size={88} />}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3" role="group" aria-label={t('mc.controls')}>
              {lobby && label('start', <><Icon n="play" />{t('mc.start')}</>, () => void run('START', wolf && stage.length ? { stage } : undefined), { v: 'primary', off: wolf ? stage.length > 0 && (stage.length < need || stage.length > 10) : view.count.connected < need })}
              {(playing || paused) && (paused ? label('resume', <><Icon n="play" />{t('mc.resume')}</>, () => void run('RESUME'), { v: 'primary' }) : label('pause', <><Icon n="pause" />{t('mc.pause')}</>, () => void run('PAUSE')))}
              {(playing || paused) && label('skip', <><Icon n="skip" />{t('mc.skip')}</>, () => void run('SKIP'))}
              {(playing || paused) && label('time', <><Icon n="plus" />{t('mc.addTime')}</>, () => void run('ADD_TIME', { seconds: 15 }))}
              {info.controls.includes('next') && label('next', <><Icon n="skip" />{t('mc.next')}</>, () => void run('NEXT'))}
              {info.controls.includes('reask') && label('reask', <><Icon n="plus" />{t('mc.reask')}</>, () => void run('REASK'))}
              {!results && label('end', <><Icon n="stop" />{t('mc.end')}</>, () => setConfirmModal({ title: t('mc.endConfirm'), onConfirm: () => void run('END') }), { v: 'danger' })}
              {(results || lobby) && label('close', <><Icon n="cross" />{t('mc.close')}</>, () => void run('CLOSE'), { v: 'danger' })}
            </div>
            {lobby && view.count.connected < need && !wolf && (
              <p className="mt-3 rounded-xl bg-warning/15 border border-warning/40 px-3 py-2 fs-small font-semibold text-warning" role="status">
                {t('mc.needPlayers', { n: need })}
              </p>
            )}
          </Card>

          {(wide || tab === 'stage') && !lobby && <Panel view={view} mc={run} />}

          {(wide || tab === 'tools') && (
            <>
              <Card title={t('mc.lots')}>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 fs-body">
                    <span>{t('mc.lotsN')}</span>
                    <div className="inline-flex items-center rounded-xl border-2 border-white/15 bg-night-3 p-1">
                      <button
                        type="button"
                        onClick={() => setLots((n) => Math.max(1, n - 1))}
                        aria-label="Decrease lots count"
                        className="cursor-pointer grid h-9 w-9 place-items-center rounded-lg hover:bg-white/10"
                      >
                        <Icon n="minus" size={16} />
                      </button>
                      <span className="w-9 text-center font-semibold text-gold tabular-nums">{lots}</span>
                      <button
                        type="button"
                        onClick={() => setLots((n) => Math.min(50, n + 1))}
                        aria-label="Increase lots count"
                        className="cursor-pointer grid h-9 w-9 place-items-center rounded-lg hover:bg-white/10"
                      >
                        <Icon n="plus" size={16} />
                      </button>
                    </div>
                  </div>
                  {label('lots', <><Icon n="dice" />{t('mc.castLots')}</>, () => void run('CAST_LOTS', { n: lots }))}
                  {view.spotlight && label('clear', <><Icon n="cross" />{t('mc.clearLots')}</>, () => void run('CLEAR_LOTS'), { v: 'ghost' })}
                </div>
                {view.spotlight && <p className="mt-2 fs-small font-semibold text-leaf" role="status">{t('mc.chosen', { names: view.spotlight.players.map((p) => p.nickname).join(', ') })}</p>}
                {wolf && lobby && <p className="mt-2 fs-small text-cloud/80">{t('mc.wolfStageHint')}</p>}
              </Card>

              <Card title={t('mc.sound')}>
                <div className="flex flex-wrap items-center gap-3">
                  {label('snd', <><Icon n={view.sound.on ? 'volume' : 'volumeoff'} />{view.sound.on ? t('mc.soundOn') : t('mc.soundOff')}</>, () => void run('SOUND', { on: !view.sound.on }))}
                  <div className="flex items-center gap-1.5" role="group" aria-label={t('mc.volume')}>
                    <span className="fs-small text-cloud/80 mr-1">{t('mc.volume')}</span>
                    {[25, 50, 75, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setVol(preset);
                          clearTimeout(volTimer.current);
                          volTimer.current = setTimeout(() => void run('SOUND', { volume: preset / 100 }), 100);
                        }}
                        className={`cursor-pointer rounded-xl px-3 py-2 text-xs font-semibold border transition ${
                          Math.abs(vol - preset) <= 12
                            ? 'bg-gold text-night border-night'
                            : 'bg-night-3 text-cloud border-white/15'
                        }`}
                      >
                        {preset}%
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-4">
          {(wide || tab === 'preview') && (
            <Card title={t('mc.preview')}>
              <ScreenRoot view={scr.view} conn={scr.conn} urls={urls} preview />
            </Card>
          )}

          {(wide || tab === 'stage' || tab === 'tools') && (
            <Card title={t('mc.share')}>
              <div className="flex flex-wrap items-center justify-between gap-3 fs-body">
                <div>
                  <span className="text-cloud/80">{t('mc.joinUrl')}: </span>
                  <span className="font-semibold text-gold">{urls?.short ?? '…'}</span>
                </div>
                <a
                  className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-sky/40 bg-sky/15 px-3.5 py-2 text-sm font-semibold text-sky hover:bg-sky/25"
                  href={`/screen/${code}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Icon n="tv" size={16} />
                  <span>{t('mc.openScreen')}</span>
                </a>
              </div>
            </Card>
          )}

          {(wide || tab === 'players' || (tab === 'stage' && lobby)) && (
            <Card title={`${t('mc.players')} (${view.count.connected}/${view.count.total})`}>
              <p className="mb-3 fs-small text-cloud/80" role="status">
                {t('mc.diag', { c: info.diag.connected, a: info.diag.away, ms: info.diag.medianRtt ?? '–' })}
              </p>
              <ul className="max-h-96 divide-y divide-white/10 overflow-y-auto" aria-label={t('mc.players')}>
                {players.map(([id, nick, av, on, role, kind]) => (
                  <li key={id} className="flex items-center gap-2.5 py-2" style={{ contentVisibility: 'auto', containIntrinsicSize: '56px' }}>
                    {wolf && lobby && (
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={stage.includes(id)}
                        aria-label={t('mc.onStage', { name: nick })}
                        onClick={() => setStage((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))}
                        className={`cursor-pointer grid h-8 w-8 place-items-center rounded-lg border-2 font-bold ${
                          stage.includes(id) ? 'border-gold bg-gold text-night' : 'border-white/25 bg-night-3 text-transparent'
                        }`}
                      >
                        ✓
                      </button>
                    )}
                    <Avatar avatar={av} color={0} size={36} label={animalName(av)} />
                    <span className="min-w-0 flex-1 truncate fs-body font-semibold text-white">
                      {nick}{kind === 'team' ? ' ⬢' : ''}{role === 'spectator' ? ` (${t('mc.spectator')})` : ''}
                    </span>
                    <span className="flex items-center gap-1 fs-small">
                      <Icon n={on ? 'wifi' : 'wifioff'} size={16} style={{ color: on ? '#2ED573' : '#FFA502' }} />
                      <span className="hidden sm:inline">{on ? t('conn.connected') : t('mc.away')}</span>
                    </span>
                    <button
                      type="button"
                      aria-label={t('mc.kick', { name: nick })}
                      onClick={() => void run('KICK', { playerId: id })}
                      className="cursor-pointer grid h-11 w-11 place-items-center rounded-xl bg-night-3 border border-white/15 hover:bg-white/15"
                    >
                      <Icon n="kick" size={18} />
                    </button>
                    <button
                      type="button"
                      aria-label={t('mc.ban', { name: nick })}
                      onClick={() => setConfirmModal({ title: t('mc.banConfirm', { name: nick }), onConfirm: () => void run('BAN', { playerId: id }) })}
                      className="cursor-pointer grid h-11 w-11 place-items-center rounded-xl bg-coral text-night font-semibold"
                    >
                      <Icon n="stop" size={18} />
                    </button>
                  </li>
                ))}
                {players.length === 0 && <li className="py-4 fs-body text-cloud/75 text-center">{t('mc.noPlayers')}</li>}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {/* Mobile Tab Bar for MC Console */}
      {!wide && (
        <nav
          aria-label="MC Console Sections"
          className="fixed bottom-0 inset-x-0 z-40 glass-hud border-t border-white/15 lg:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="grid grid-cols-4 h-16 max-w-md mx-auto px-2">
            {(
              [
                { id: 'stage', label: 'Stage', icon: 'sparkle' },
                { id: 'players', label: `Players (${view.count.total})`, icon: 'users' },
                { id: 'tools', label: 'Lots & Sound', icon: 'dice' },
                { id: 'preview', label: 'Preview', icon: 'tv' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`cursor-pointer flex flex-col items-center justify-center gap-1 rounded-xl my-1 transition ${
                  tab === item.id ? 'bg-gold/15 text-gold' : 'text-cloud/70'
                }`}
              >
                <Icon n={item.icon} size={19} />
                <span className="text-[11px] font-semibold leading-none">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Custom Tactile Confirmation Sheet (Replaces window.confirm) */}
      {confirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setConfirmModal(null)}
        >
          <div className="arcade-card w-full max-w-sm p-6 space-y-5 a-pop text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="fs-h2 text-white">{confirmModal.title}</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="ghost" small onClick={() => setConfirmModal(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                small
                onClick={() => {
                  const fn = confirmModal.onConfirm;
                  setConfirmModal(null);
                  fn();
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
