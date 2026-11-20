'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { GAME_META, type GameId, type PlayerPublic, type View } from '@/shared/types';
import { t } from '@/i18n';
import { useChannel, type Ack } from '@/client/channel';
import { resolveUrls } from '@/client/urls';
import { useMedia } from '@/client/hooks';
import { enableSound, haptic, playUi } from '@/client/sound';
import { AppShell } from '@/ui/shell';
import { Avatar } from '@/ui/avatars';
import { Button, ConnectionPill, PhaseBanner, PlayerChip, TimerRing, Toast, ViewportModal, Wordmark } from '@/ui/kit';
import { Icon } from '@/ui/icons';
import { QRPanel } from '@/ui/qr';
import ScreenRoot, { type RoomUrls } from '@/features/screen/ScreenRoot';
import CountdownStage from '@/features/games/CountdownStage';
import type { McProps } from '@/features/games/types';
import SpotWolfMc from '@/features/games/spot-the-wolf/Mc';
import FakeVerseMc from '@/features/games/fake-verse/Mc';
import GideonsMc from '@/features/games/gideons-300/Mc';
import WcfMc from '@/features/games/what-came-first/Mc';
import WhoAmIMc from '@/features/games/who-am-i/Mc';

const McUI: Record<GameId, React.ComponentType<McProps>> = {
  'spot-the-wolf': SpotWolfMc,
  'fake-verse': FakeVerseMc,
  'gideons-300': GideonsMc,
  'what-came-first': WcfMc,
  'who-am-i': WhoAmIMc,
};

const subscribeHostKey = (cb: () => void) => {
  window.addEventListener('arkade-host-key', cb);
  return () => window.removeEventListener('arkade-host-key', cb);
};

export default function McConsole({ code }: { code: string }) {
  const [keyInput, setKeyInput] = useState('');
  const [urls, setUrls] = useState<RoomUrls | null>(null);
  const [tab, setTab] = useState<'controls' | 'preview' | 'players'>('controls');
  const [stage, setStage] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<null | { kind: 'END' | 'CLOSE' | 'BAN'; id?: string; label: string }>(null);
  const wide = useMedia('(min-width: 1024px)');

  const key = useSyncExternalStore(
    subscribeHostKey,
    () => {
      const hash = window.location.hash;
      const fromHash = hash.startsWith('#k=') ? hash.slice(3).trim() : '';
      return fromHash || localStorage.getItem(`arkade:host:${code}`) || '';
    },
    () => '',
  );

  const notify = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    const hash = window.location.hash;
    const fromHash = hash.startsWith('#k=') ? hash.slice(3).trim() : '';
    if (fromHash) {
      localStorage.setItem(`arkade:host:${code}`, fromHash);
      window.history.replaceState(null, '', window.location.pathname);
      window.dispatchEvent(new Event('arkade-host-key'));
    }
    fetch(`/api/rooms/${code}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j) setUrls(resolveUrls(j, code));
      })
      .catch(() => undefined);
  }, [code]);

  const ch = useChannel(key ? { code, role: 'mc', key } : null);
  const scr = useChannel(key && (wide || tab === 'preview') ? { code, role: 'screen' } : null);
  const view = ch.view;

  const run = useCallback(
    async (type: string, payload?: unknown): Promise<Ack> => {
      void enableSound();
      if (!ch.sendMc) return { ok: false };
      const ack = await ch.sendMc(type, payload);
      if (!ack.ok) {
        playUi('ui-error');
        haptic('error');
        notify(ack.error ? `${t('err.generic')} (${ack.error})` : t('err.generic'));
      } else {
        playUi('ui-snap');
        haptic('snap');
      }
      return ack;
    },
    [ch, notify],
  );

  if (!key) {
    return (
      <AppShell active="mc" maxWidth="max-w-md">
        <div className="arcade-panel p-6 mt-6 space-y-4">
          <Wordmark size={30} />
          <h1 className="font-semibold text-white fs-h2">Host Authorization Required</h1>
          <p className="text-sm text-slate">
            Paste the room host key or launch a fresh Showtime room from the Host Deck.
          </p>
          <input
            type="text"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Host Key"
            className="arcade-input font-mono"
          />
          <div className="flex gap-2">
            <Button
              variant="primary"
              className="flex-1"
              disabled={!keyInput.trim()}
              onClick={() => {
                const k = keyInput.trim();
                localStorage.setItem(`arkade:host:${code}`, k);
                window.dispatchEvent(new Event('arkade-host-key'));
              }}
            >
              Connect Deck
            </Button>
            <Link
              href="/mc"
              className="cursor-pointer inline-flex items-center justify-center rounded-full border border-white/15 bg-night-3 px-5 min-h-14 text-sm font-semibold text-cloud hover:text-white"
            >
              Back
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  if (ch.conn === 'closed') {
    return (
      <AppShell active="mc" maxWidth="max-w-lg">
        <div className="arcade-panel p-8 mt-8 text-center space-y-4">
          <Wordmark size={34} />
          <h1 className="font-semibold text-white fs-h2">{t('room.closed')}</h1>
          <Link
            href="/mc"
            className="cursor-pointer inline-flex items-center justify-center rounded-full bg-gold px-6 min-h-14 font-semibold text-night"
          >
            {t('mc.create')}
          </Link>
        </div>
      </AppShell>
    );
  }

  if (!view || !view.mc) {
    return (
      <AppShell active="mc" maxWidth="max-w-lg">
        <div className="arcade-panel p-8 mt-8 text-center space-y-4">
          <Wordmark size={32} />
          <p className="text-slate font-medium animate-pulse">{t('common.loading')}</p>
        </div>
      </AppShell>
    );
  }

  const info = view.mc;
  const meta = GAME_META[view.gameId];
  const need = meta.minPlayers;
  const wolf = view.gameId === 'spot-the-wolf';
  const stageOk = !wolf || stage.length === 0 || (stage.length >= need && stage.length <= 10);
  const canStart = wolf ? (stage.length > 0 ? stageOk : view.count.connected >= need) : view.count.connected >= need;
  const isCountdown = view.phase === 'countdown';
  const ActiveMc = isCountdown ? null : McUI[view.gameId];
  const joinUrl = urls?.join ?? `/j/${code}`;
  const shortUrl = urls?.short ?? `/j/${code}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      playUi('ui-snap');
      haptic('snap');
      notify(`Copied ${shortUrl}`);
    } catch {
      notify(shortUrl);
    }
  };

  const toggleStage = (id: string) => {
    playUi('ui-focus');
    haptic('tick');
    setStage((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 10 ? [...prev, id] : prev));
  };

  const lobbyPlayers = ((view.data as { players?: PlayerPublic[] }).players ?? []);

  return (
    <AppShell active="mc" maxWidth="max-w-7xl">
      <Toast text={toast} />

      <div className="space-y-4">
        {/* Top Console Telemetry Strip */}
        <header className="glass-hud rounded-3xl p-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 rounded-2xl border border-gold/40 bg-gold/15 px-3.5 py-1.5 text-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gold">Room</div>
              <div className="font-bold text-white tracking-[0.22em] text-lg leading-none">{code}</div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-semibold text-white text-base sm:text-lg leading-tight">{meta.name}</h1>
                <ConnectionPill conn={ch.conn} />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate mt-0.5 tabular-nums">
                <span>
                  <strong className="text-leaf">{info.diag.connected}</strong> online · {info.diag.away} away · {view.count.total} total
                </span>
                {info.diag.medianRtt != null && <span>RTT {info.diag.medianRtt} ms</span>}
                {view.round != null && view.rounds != null && (
                  <span className="text-gold font-semibold">
                    {t('screen.round', { n: view.round, total: view.rounds })}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button variant="ghost" small className="w-full sm:w-auto" onClick={copyLink}>
              <Icon n="share" size={16} />
              <span>Copy Link</span>
            </Button>
            <a
              href={`/screen/${code}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                playUi('ui-snap');
                haptic('snap');
              }}
              className="relative hidden lg:inline-flex cursor-pointer press console-sheen items-center gap-2 rounded-full border border-sky/35 bg-sky/15 px-4 min-h-12 text-sm font-semibold text-sky hover:bg-sky/25 transition-colors whitespace-nowrap"
            >
              <Icon n="tv" size={16} />
              <span>Projector</span>
            </a>
          </div>
        </header>

        {/* Mobile View Switcher */}
        <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-white/10 bg-night-2 p-1.5 lg:hidden">
          {(['controls', 'preview', 'players'] as const).map((tb) => (
            <button
              key={tb}
              type="button"
              onClick={() => {
                playUi('ui-focus');
                haptic('tick');
                setTab(tb);
              }}
              className={`cursor-pointer rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
                tab === tb ? 'bg-gold text-night shadow' : 'text-slate hover:text-white'
              }`}
            >
              {tb === 'controls' ? 'Director' : tb === 'preview' ? 'Stage' : `Players (${view.count.total})`}
            </button>
          ))}
        </div>

        {/* Main Split Broadcast Deck */}
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.95fr] items-start">
          {/* Director Column */}
          <div className={`min-w-0 space-y-4 ${tab !== 'controls' ? 'hidden lg:block' : ''}`}>
            {/* Active Phase & Host Teleprompter */}
            <section className="arcade-panel p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <PhaseBanner className="px-4 py-2 text-base sm:text-lg max-w-full">
                  {view.status === 'lobby'
                    ? 'Lobby Staging'
                    : view.status === 'paused'
                      ? 'Show Paused'
                      : isCountdown
                        ? 'Launch Countdown'
                        : view.phase}
                </PhaseBanner>
                <TimerRing endsAt={view.endsAt} pausedMs={view.pausedMs} size={64} />
              </div>

              {/* Host Teleprompter */}
              <div className="rounded-2xl border border-leaf/30 bg-night-3/90 p-3.5 sm:p-4 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-leaf">
                  <Icon n="info" size={13} /> Host Teleprompter
                </div>
                <p className="text-sm sm:text-base text-cloud leading-relaxed">{t(info.hint)}</p>
              </div>

              {/* Lobby Join QR & Stage Picker */}
              {view.status === 'lobby' && (
                <div className="space-y-4 pt-1">
                  <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-white/10 bg-night-3/70 p-4 text-center sm:text-left">
                    <QRPanel url={joinUrl} size={110} />
                    <div className="min-w-0 flex-1 space-y-2 w-full">
                      <div className="text-xs font-bold uppercase tracking-widest text-slate">Quick Join URL</div>
                      <div className="font-mono text-sm font-bold text-gold break-all">{shortUrl}</div>
                      <p className="text-xs text-slate">
                        Minimum {need} connected player{need === 1 ? '' : 's'} to launch.
                      </p>
                    </div>
                  </div>

                  {wolf && lobbyPlayers.length > 0 && (
                    <div className="rounded-2xl border border-white/10 bg-night-3/70 p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-widest text-gold">
                          Wolf Stage Cast ({stage.length ? `${stage.length} selected` : 'Auto / All'})
                        </span>
                        {stage.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setStage([])}
                            className="cursor-pointer text-xs font-semibold text-sky hover:underline"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {lobbyPlayers.map((p) => {
                          const picked = stage.includes(p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => toggleStage(p.id)}
                              className={`cursor-pointer transition-all rounded-full ${
                                picked ? 'ring-2 ring-gold scale-105' : 'opacity-80 hover:opacity-100'
                              }`}
                            >
                              <PlayerChip p={p} size={30} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <Button
                    variant="primary"
                    className="w-full"
                    disabled={!canStart}
                    onClick={() => run('START', wolf && stage.length ? { stage } : undefined)}
                  >
                    <Icon n="play" size={18} />
                    <span>{canStart ? 'Launch Match' : `Need ${need} Players (${view.count.connected}/${need})`}</span>
                  </Button>
                </div>
              )}

              {/* Active Game-Specific MC Panel */}
              {view.status !== 'lobby' && view.status !== 'results' && (
                <div className="pt-1">
                  {isCountdown || !ActiveMc ? (
                    <CountdownStage view={view} surface="mc" preview />
                  ) : (
                    <ActiveMc view={view} mc={run} />
                  )}
                </div>
              )}

              {/* Transport Deck */}
              {view.status !== 'lobby' && (
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 pt-2 border-t border-white/10">
                  {view.status === 'paused' ? (
                    <Button variant="primary" small className="px-3 sm:px-5" onClick={() => run('RESUME')}>
                      <Icon n="play" size={16} /> <span>{t('mc.resume')}</span>
                    </Button>
                  ) : view.status === 'playing' ? (
                    <Button variant="secondary" small className="px-3 sm:px-5" onClick={() => run('PAUSE')}>
                      <Icon n="pause" size={16} /> <span>Pause</span>
                    </Button>
                  ) : null}

                  {view.status === 'playing' && (
                    <Button variant="ghost" small className="px-3 sm:px-5" onClick={() => run('ADD_TIME', { seconds: 15 })}>
                      <Icon n="plus" size={16} /> <span>+15s</span>
                    </Button>
                  )}

                  {(view.status === 'playing' || (isCountdown && view.status === 'paused')) && (
                    <Button variant="ghost" small className="px-3 sm:px-5" onClick={() => run('SKIP')}>
                      <Icon n="skip" size={16} /> <span>Skip</span>
                    </Button>
                  )}

                  {info.controls.includes('next') && (
                    <Button variant="primary" small className="px-3 sm:px-5" onClick={() => run('NEXT')}>
                      <Icon n="arrowRight" size={16} /> <span>Next</span>
                    </Button>
                  )}

                  {info.controls.includes('reask') && (
                    <Button variant="secondary" small className="px-3 sm:px-5" onClick={() => run('REASK')}>
                      <Icon n="dice" size={16} /> <span>Re-ask</span>
                    </Button>
                  )}

                  {view.status !== 'results' && !isCountdown && (
                    <Button
                      variant="danger"
                      small
                      className="px-3 sm:px-5"
                      onClick={() => setConfirmAction({ kind: 'END', label: 'End current game and reveal podium?' })}
                    >
                      <Icon n="stop" size={16} /> <span>End Game</span>
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    small
                    className="px-3 sm:px-5"
                    onClick={() => setConfirmAction({ kind: 'CLOSE', label: 'Close this room for all players and projectors?' })}
                  >
                    <Icon n="cross" size={16} /> <span>Close Room</span>
                  </Button>
                </div>
              )}
            </section>

            {/* Projector Sound Console */}
            <section className="arcade-card p-4 sm:p-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-sky">
                    <Icon n={view.sound.on ? 'volume' : 'volumeoff'} size={15} /> Projector Audio
                  </span>
                  <button
                    type="button"
                    onClick={() => run('SOUND', { on: !view.sound.on })}
                    className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold border transition-colors ${
                      view.sound.on ? 'border-leaf/40 bg-leaf/15 text-leaf' : 'border-white/15 bg-night-3 text-slate'
                    }`}
                  >
                    {view.sound.on ? 'ON' : 'MUTED'}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    aria-label="Projector audio volume"
                    min={0}
                    max={100}
                    value={Math.round(view.sound.volume * 100)}
                    onChange={(e) => void run('SOUND', { volume: Number(e.target.value) / 100 })}
                    className="w-full accent-sky cursor-pointer"
                  />
                  <span className="w-10 text-right text-xs font-bold tabular-nums text-cloud">
                    {Math.round(view.sound.volume * 100)}%
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Live 16:9 Stage Preview + Player Roster */}
          <div className="min-w-0 space-y-4">
            <div className={`space-y-2 ${tab !== 'preview' ? 'hidden lg:block' : ''}`}>
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="text-xs font-bold uppercase tracking-widest text-slate">Live Projector Mirror</span>
                <a href={`/screen/${code}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-sky hover:underline shrink-0">
                  <span>Open Fullscreen</span>
                </a>
              </div>
              <div className="aspect-video w-full overflow-hidden rounded-3xl border border-white/15 bg-night shadow-[0_24px_60px_-15px_rgba(0,0,0,0.9)]">
                <ScreenRoot view={scr?.view ?? null} conn={scr?.conn ?? 'connecting'} urls={urls ?? undefined} preview />
              </div>
            </div>

            {view.gameId !== 'spot-the-wolf' && info.top10 && info.top10.length > 0 && (
              <section className={`arcade-card p-5 space-y-3 ${tab !== 'players' && tab !== 'controls' ? 'hidden lg:block' : ''}`}>
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-gold flex items-center gap-1.5">
                    <Icon n="trophy" size={14} /> Top 10 Standings
                  </h2>
                  <span className="text-xs text-slate font-semibold">{info.top10.length} ranked</span>
                </div>
                <ol className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {info.top10.map((entry, idx) => (
                    <li
                      key={entry.id}
                      className={`flex items-center justify-between gap-2.5 rounded-xl border px-3 py-2 text-sm ${
                        idx === 0
                          ? 'border-gold/45 bg-gold/10'
                          : idx < 3
                            ? 'border-leaf/30 bg-leaf/8'
                            : 'border-white/8 bg-night-3/70'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-6 text-xs font-bold tabular-nums ${
                            idx === 0 ? 'text-gold' : idx === 1 ? 'text-sky' : idx === 2 ? 'text-plank' : 'text-cloud/65'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <Avatar avatar={entry.avatar} color={entry.color} size={28} />
                        <span className="truncate font-semibold text-white">{entry.nickname}</span>
                      </div>
                      <span className="shrink-0 font-bold text-gold tabular-nums text-xs">{entry.score} pts</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <section className={`arcade-card p-4 sm:p-5 space-y-3 ${tab !== 'players' ? 'hidden lg:block' : ''}`}>
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate">
                  Passengers ({info.players.length})
                </h2>
                <span className="text-xs text-leaf font-semibold">{info.diag.connected} active</span>
              </div>
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {info.players.length === 0 && (
                  <p className="text-sm text-slate py-4 text-center">Waiting for passengers to join room {code}…</p>
                )}
                {info.players.map(([id, nick, av, on, role, kind]) => (
                  <div
                    key={id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-night-3/70 px-3 py-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${on ? 'bg-leaf shadow-[0_0_8px_#38EC82]' : 'bg-slate/40'}`}
                        aria-hidden="true"
                      />
                      <Avatar avatar={av} color={av % 6} size={32} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-white">{nick}</div>
                        <div className="text-[11px] text-slate flex items-center gap-1.5">
                          {kind === 'team' && <span className="text-sky font-semibold">Team</span>}
                          {role && <span className="text-gold font-semibold uppercase">{role}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => run('KICK', { playerId: id })}
                        title="Kick player"
                        className="cursor-pointer rounded-xl border border-white/10 bg-night-2 px-2.5 py-1.5 text-xs font-semibold text-slate hover:text-white hover:border-white/25"
                      >
                        Kick
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmAction({ kind: 'BAN', id, label: `Ban ${nick} from rejoining room ${code}?` })}
                        title="Ban player"
                        className="cursor-pointer rounded-xl border border-coral/30 bg-coral/10 px-2.5 py-1.5 text-xs font-semibold text-coral hover:bg-coral/20"
                      >
                        Ban
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Custom In-App Confirmation Sheet (zero native confirm()) */}
      <ViewportModal
        open={Boolean(confirmAction)}
        onClose={() => {
          playUi('ui-back');
          setConfirmAction(null);
        }}
        ariaLabel="Confirm action"
        maxWidth="max-w-sm"
      >
        {confirmAction && (
          <div className="arcade-panel w-full p-6 space-y-4">
            <h2 className="font-semibold text-white fs-h3">Confirm Broadcast Action</h2>
            <p className="text-sm text-cloud">{confirmAction.label}</p>
            <div className="flex gap-2.5 pt-2">
              <Button
                variant="ghost"
                small
                className="flex-1"
                onClick={() => {
                  playUi('ui-back');
                  setConfirmAction(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                small
                className="flex-1"
                onClick={async () => {
                  const act = confirmAction;
                  setConfirmAction(null);
                  if (act.kind === 'BAN' && act.id) await run('BAN', { playerId: act.id });
                  else await run(act.kind);
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        )}
      </ViewportModal>
    </AppShell>
  );
}
