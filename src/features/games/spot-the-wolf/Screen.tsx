'use client';

import { useEffect, useRef } from 'react';
import type { PlayerPublic } from '@/shared/types';
import { t } from '@/i18n';
import { configureSound, playWolfAudio } from '@/client/sound';
import { useStageMobile } from '@/ui/kit';
import { Avatar } from '@/ui/avatars';
import { MascotView } from '@/ui/mascots';
import type { ScreenProps } from '../types';
import { Pips, Verse } from '../shared';

interface Clue {
  pid: string;
  round?: number;
  text: string;
  spoken?: boolean;
  missed?: boolean;
}

interface WolfHistoryItem {
  round: number;
  word: string;
  ref: string;
  wolves: string[];
  accused: string[];
  outcome: 'flock' | 'wolves';
  outcomeReason: string;
}

interface WolfScreenData {
  stage: PlayerPublic[];
  clues: Clue[];
  category: string;
  turnOrder?: string[];
  turnIndex?: number;
  impostorCount?: number;
  voted?: number;
  votedIds?: string[];
  votes?: Record<string, string> | null;
  accused?: { id: string; wolf: boolean }[] | null;
  end?: {
    word: string;
    ref: string;
    verse: string;
    wolves: string[];
    guesses: { pid: string; text: string; ok: boolean }[];
    outcome?: 'flock' | 'wolves';
    outcomeReason?: string;
    history?: WolfHistoryItem[];
  } | null;
}

export default function SpotWolfScreen({ view, preview = false }: ScreenProps) {
  const mobile = useStageMobile();
  const d = view.data as WolfScreenData;
  const p = view.phase;
  const stage = d.stage ?? [];
  const byId = new Map(stage.map((s) => [s.id, s]));
  const currentId = d.turnOrder?.[d.turnIndex ?? 0];
  const wolfTotal = d.impostorCount ?? 1;
  const votedSet = new Set(d.votedIds ?? []);

  // Among Us MP3 triggers (projector only — never play inside MC preview thumbnails)
  const introPlayedRef = useRef<string | null>(null);
  const victoryPlayedRef = useRef<string | null>(null);
  const votePhaseRef = useRef<string | null>(null);
  const prevVotedRef = useRef(0);

  useEffect(() => {
    if (preview) return;
    configureSound(view.sound);
  }, [preview, view.sound]);

  useEffect(() => {
    if (preview || p !== 'reveal' || !view.sound?.on) return;
    const key = `${view.room}:${view.round ?? 1}`;
    if (introPlayedRef.current === key) return;
    introPlayedRef.current = key;
    configureSound(view.sound);
    playWolfAudio('wolf-intro');
  }, [preview, p, view.room, view.round, view.sound]);

  useEffect(() => {
    if (preview || !view.sound?.on) return;
    const count = d.votedIds?.length ?? d.voted ?? 0;
    const phaseKey = `${view.room}:${view.round ?? 1}:${p}`;
    if (p !== 'vote') {
      votePhaseRef.current = null;
      prevVotedRef.current = 0;
      return;
    }
    if (votePhaseRef.current !== phaseKey) {
      votePhaseRef.current = phaseKey;
      prevVotedRef.current = count;
      return;
    }
    if (count > prevVotedRef.current) {
      configureSound(view.sound);
      playWolfAudio('wolf-vote');
    }
    prevVotedRef.current = count;
  }, [preview, view.sound, view.room, view.round, p, d.votedIds, d.voted]);

  useEffect(() => {
    if (preview || (p !== 'roundEnd' && p !== 'end') || !d.end?.outcome || !view.sound?.on) return;
    const key = `${view.room}:${view.round ?? 1}`;
    if (victoryPlayedRef.current === key) return;
    victoryPlayedRef.current = key;
    configureSound(view.sound);
    playWolfAudio(d.end.outcome === 'flock' ? 'wolf-win-crew' : 'wolf-win-impo');
  }, [preview, p, d.end?.outcome, view.room, view.round, view.sound]);

  // Invert votes map for voter avatars shown under accused/stage cards after reveal
  const votesByTarget = new Map<string, string[]>();
  if (d.votes) {
    for (const [voterId, targetId] of Object.entries(d.votes)) {
      const list = votesByTarget.get(targetId) ?? [];
      list.push(voterId);
      votesByTarget.set(targetId, list);
    }
  }

  const endOutcome = d.end?.outcome ?? 'wolves';
  const isEndMatch = p === 'end';

  return (
    <div className="space-y-6">
      {/* Category & Turn Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full border border-gold/45 bg-gold/15 px-5 py-1.5 font-bold uppercase tracking-widest text-gold" style={{ fontSize: mobile ? 12 : 22 }}>
          {t('wolf.category', { cat: d.category })}
        </span>
        {(p === 'clues1' || p === 'clues2') && currentId && (
          <span className="rounded-full border border-leaf/45 bg-leaf/15 px-5 py-1.5 font-bold text-leaf" style={{ fontSize: mobile ? 13 : 24 }}>
            {t('wolf.turnOf', { name: byId.get(currentId)?.nickname ?? '…' })}
          </span>
        )}
      </div>

      {/* Among Us Style Role Reveal Intro Screen */}
      {p === 'reveal' && (
        <div
          className="relative overflow-hidden rounded-[2rem] border border-white/15 p-6 sm:p-12 text-center space-y-6 sm:space-y-8 shadow-[0_35px_90px_-15px_rgba(0,0,0,0.9)] a-pop"
          style={{
            background:
              'radial-gradient(ellipse at 50% 25%, rgba(255, 72, 72, 0.24) 0%, rgba(18, 22, 36, 0.96) 55%, rgba(8, 10, 18, 0.99) 100%)',
          }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-32 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

          <div className="relative z-10 space-y-2 sm:space-y-3">
            <div
              className="mx-auto w-fit rounded-full border border-sky/50 bg-sky/15 px-5 py-1 font-black uppercase tracking-[0.35em] text-sky shadow-[0_0_25px_rgba(56,189,248,0.3)]"
              style={{ fontSize: mobile ? 12 : 20 }}
            >
              SHHH! · THE FLOCK
            </div>
            <h2
              className="font-black tracking-tight text-white leading-tight"
              style={{ fontSize: mobile ? 26 : 62 }}
            >
              {wolfTotal === 1 ? 'There is ' : 'There are '}
              <span className="text-coral drop-shadow-[0_0_28px_rgba(255,95,95,0.65)]">
                {wolfTotal === 1 ? '1 Wolf' : `${wolfTotal} Wolves`}
              </span>{' '}
              among us
            </h2>
            <p className="text-cloud/90 max-w-3xl mx-auto" style={{ fontSize: mobile ? 14 : 25 }}>
              Look at your phone to see your secret role. Don&apos;t react out loud!
            </p>
          </div>

          {/* All Stage Crewmates Lineup */}
          <div className="relative z-10 flex flex-wrap items-end justify-center gap-4 sm:gap-7 pt-2">
            {stage.map((sp, idx) => (
              <div
                key={sp.id}
                className="flex flex-col items-center gap-2 rounded-3xl border border-white/12 bg-black/35 px-4 py-3 sm:px-5 sm:py-4 backdrop-blur-sm shadow-[0_14px_30px_rgba(0,0,0,0.45)]"
                style={{ animationDelay: `${idx * 70}ms` }}
              >
                <div className="relative">
                  <div className="absolute -inset-2 rounded-full bg-sky/15 blur-md" />
                  <Avatar avatar={sp.avatar} color={sp.color} size={mobile ? 48 : 82} />
                </div>
                <span className="font-bold text-white truncate max-w-[9rem]" style={{ fontSize: mobile ? 13 : 22 }}>
                  {sp.nickname}
                </span>
              </div>
            ))}
          </div>

          <div className="relative z-10 pt-1 flex items-center justify-center gap-2 text-slate font-semibold" style={{ fontSize: mobile ? 12 : 18 }}>
            <MascotView name="wilf" expression="cheer" size={mobile ? 28 : 42} decorative />
            <span>{t('wolf.checkPhonesBody')}</span>
          </div>
        </div>
      )}

      {/* Stage Crewmates Ring (with active turn / live vote status / accusation voters) */}
      {p !== 'reveal' && p !== 'roundEnd' && p !== 'end' && stage.length > 0 && (
        <div className="arcade-panel p-5 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate">
              {p === 'vote' ? 'Emergency Meeting · Live Vote Status' : t('wolf.ringLabel')}
            </span>
            {p === 'vote' && (
              <span className="text-xs sm:text-sm font-bold text-leaf tabular-nums">
                {d.voted ?? 0} of {stage.length} voted
              </span>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-5">
            {stage.map((sp) => {
              const activeTurn = (p === 'clues1' || p === 'clues2') && sp.id === currentId;
              const accusedEntry = p === 'accuse' ? d.accused?.find((a) => a.id === sp.id) : undefined;
              const isAccused = Boolean(accusedEntry);
              const hasVoted = p === 'vote' && votedSet.has(sp.id);
              const voters = p === 'accuse' ? (votesByTarget.get(sp.id) ?? []) : [];

              return (
                <div
                  key={sp.id}
                  className={`rounded-3xl border px-4 py-3 flex flex-col items-center gap-2 transition-all ${
                    activeTurn
                      ? 'border-leaf bg-leaf/20 ring-2 ring-leaf scale-105 shadow-[0_0_24px_rgba(56,236,130,0.45)]'
                      : isAccused
                        ? 'border-coral bg-coral/20 ring-2 ring-coral shadow-[0_0_26px_rgba(255,95,95,0.45)]'
                        : hasVoted
                          ? 'border-leaf/70 bg-leaf/12 shadow-[0_0_18px_rgba(56,236,130,0.22)]'
                          : 'border-white/12 bg-night-3/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar avatar={sp.avatar} color={sp.color} size={mobile ? 38 : 64} />
                    <div className="flex flex-col">
                      <span className="font-bold text-white leading-tight" style={{ fontSize: mobile ? 14 : 26 }}>
                        {sp.nickname}
                      </span>
                      {p === 'vote' && (
                        <span
                          className={`mt-1 inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 font-extrabold uppercase tracking-wider ${
                            hasVoted
                              ? 'bg-leaf text-night'
                              : 'border border-white/15 bg-white/5 text-slate'
                          }`}
                          style={{ fontSize: mobile ? 10 : 13 }}
                        >
                          {hasVoted ? '✓ I Voted' : 'Waiting…'}
                        </span>
                      )}
                      {isAccused && (
                        <span
                          className={`mt-1 inline-flex w-fit items-center rounded-full px-2.5 py-0.5 font-black uppercase tracking-wider ${
                            accusedEntry?.wolf ? 'bg-coral text-night' : 'bg-amber-400 text-night'
                          }`}
                          style={{ fontSize: mobile ? 10 : 13 }}
                        >
                          {accusedEntry?.wolf ? 'Wolf Caught!' : 'Wrongly Accused'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Who voted for this player (shown on accuse reveal) */}
                  {p === 'accuse' && voters.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 border-t border-white/10 w-full">
                      {voters.map((vid) => {
                        const vp = byId.get(vid);
                        return vp ? (
                          <span key={vid} className="inline-flex items-center gap-1 rounded-full bg-black/40 border border-white/15 px-2 py-0.5 text-[11px] sm:text-xs font-semibold text-cloud">
                            <Avatar avatar={vp.avatar} color={vp.color} size={mobile ? 16 : 20} />
                            {vp.nickname}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Clues Matrix */}
      {(p === 'clues1' || p === 'clues2' || p === 'debate') && (d.clues?.length ?? 0) > 0 && (
        <div className="arcade-card p-5 sm:p-7 space-y-3">
          <div className="text-xs font-bold uppercase tracking-widest text-gold">{t('wolf.clues')}</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {d.clues.map((c, idx) => (
              <div
                key={idx}
                className={`rounded-2xl border px-4 py-3 flex flex-col gap-0.5 ${
                  c.missed ? 'border-coral/45 bg-coral/12' : 'border-white/10 bg-night-3/90'
                }`}
              >
                <span className="text-xs font-bold text-slate truncate">{byId.get(c.pid)?.nickname ?? 'Player'}</span>
                <span
                  className={`font-bold truncate ${c.missed ? 'text-coral italic' : 'text-white'}`}
                  style={{ fontSize: mobile ? 16 : 26 }}
                >
                  {c.missed ? 'Failed to type a word' : c.spoken ? t('wolf.spoken') : c.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vote Progress Pips */}
      {p === 'vote' && <Pips n={d.voted ?? 0} total={stage.length} />}

      {/* Accusation / Guess */}
      {p === 'accuse' && (
        <div className="arcade-panel p-6 sm:p-10 text-center space-y-3 a-pop">
          <h2 className="font-bold text-white" style={{ fontSize: mobile ? 24 : 46 }}>
            {(d.accused?.length ?? 0) === 0
              ? t('wolf.noOne')
              : t('wolf.accusedIs', {
                  names: (d.accused ?? []).map((a) => byId.get(a.id)?.nickname ?? 'Player').join(', '),
                })}
          </h2>
        </div>
      )}

      {p === 'guess' && (
        <div className="arcade-panel border-coral/50 bg-coral/12 p-6 sm:p-10 text-center space-y-3 a-pop">
          <h2 className="font-bold text-coral" style={{ fontSize: mobile ? 24 : 48 }}>
            {t('wolf.guessing')}
          </h2>
          <p className="text-cloud" style={{ fontSize: mobile ? 15 : 28 }}>
            {t('wolf.guessingBody')}
          </p>
        </div>
      )}

      {/* Round End / Match Victory (Among Us Victory Style — No Leaderboard) */}
      {(p === 'roundEnd' || p === 'end') && d.end && (
        <div className="space-y-5 a-pop">
          {/* Team Victory Hero Banner */}
          <div
            className={`relative overflow-hidden rounded-[2rem] border p-6 sm:p-10 text-center space-y-4 ${
              endOutcome === 'flock' ? 'border-sky/50' : 'border-coral/55'
            }`}
            style={{
              background:
                endOutcome === 'flock'
                  ? 'radial-gradient(ellipse at 50% 20%, rgba(56, 189, 248, 0.28) 0%, rgba(14, 24, 42, 0.96) 65%, rgba(8, 12, 22, 0.99) 100%)'
                  : 'radial-gradient(ellipse at 50% 20%, rgba(255, 72, 72, 0.30) 0%, rgba(30, 14, 20, 0.96) 65%, rgba(12, 8, 14, 0.99) 100%)',
            }}
          >
            <div
              className={`font-black uppercase tracking-[0.22em] leading-none ${
                endOutcome === 'flock'
                  ? 'text-sky drop-shadow-[0_0_28px_rgba(56,189,248,0.65)]'
                  : 'text-coral drop-shadow-[0_0_28px_rgba(255,80,80,0.7)]'
              }`}
              style={{ fontSize: mobile ? 32 : 70 }}
            >
              {endOutcome === 'flock' ? 'FLOCK VICTORY' : 'WOLVES VICTORY'}
            </div>
            {d.end.outcomeReason && (
              <p className="font-bold text-white/95" style={{ fontSize: mobile ? 16 : 30 }}>
                {d.end.outcomeReason}
              </p>
            )}

            {/* Secret Word & Wolves Reveal */}
            <div className="mt-4 pt-5 border-t border-white/12 flex flex-wrap items-center justify-around gap-6 text-left">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-gold">{t('wolf.wordWas')}</div>
                <div className="font-black text-white mt-1" style={{ fontSize: mobile ? 26 : 52 }}>
                  {d.end.word}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-widest text-coral">{t('wolf.wolvesWere')}</div>
                <div className="flex flex-wrap gap-2.5">
                  {d.end.wolves.map((wid) => {
                    const wp = byId.get(wid);
                    return wp ? (
                      <div key={wid} className="rounded-full border border-coral/60 bg-coral/20 px-4 py-1.5 flex items-center gap-2.5">
                        <Avatar avatar={wp.avatar} color={wp.color} size={mobile ? 30 : 48} />
                        <span className="font-bold text-white" style={{ fontSize: mobile ? 15 : 26 }}>
                          {wp.nickname}
                        </span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </div>

            {d.end.guesses.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {d.end.guesses.map((g) => (
                  <span
                    key={g.pid}
                    className={`rounded-full border px-4 py-1 text-xs sm:text-base font-bold ${
                      g.ok ? 'border-coral bg-coral/20 text-coral' : 'border-white/15 bg-black/30 text-cloud'
                    }`}
                  >
                    {byId.get(g.pid)?.nickname ?? 'Wolf'} guessed &ldquo;{g.text}&rdquo; {g.ok ? '— Correct!' : '— Missed!'}
                  </span>
                ))}
              </div>
            )}
          </div>

          <Verse verse={d.end.verse} refText={d.end.ref} big={!mobile} />

          {/* Match Recap across all rounds on Final Screen */}
          {isEndMatch && (d.end.history?.length ?? 0) > 0 && (
            <div className="arcade-panel p-5 sm:p-7 space-y-3">
              <div className="text-xs font-bold uppercase tracking-widest text-gold">Match Recap</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {d.end.history!.map((item) => (
                  <div key={item.round} className="rounded-2xl border border-white/12 bg-night-3/85 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate">Round {item.round}</span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider ${
                          item.outcome === 'flock' ? 'bg-sky/20 text-sky border border-sky/40' : 'bg-coral/20 text-coral border border-coral/40'
                        }`}
                      >
                        {item.outcome === 'flock' ? 'Flock Won' : 'Wolves Won'}
                      </span>
                    </div>
                    <div className="font-bold text-white" style={{ fontSize: mobile ? 16 : 22 }}>
                      {item.word}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {item.wolves.map((wid) => {
                        const wp = byId.get(wid);
                        return wp ? (
                          <span key={wid} className="inline-flex items-center gap-1.5 rounded-full bg-coral/15 border border-coral/35 px-2.5 py-0.5 text-xs font-semibold text-white">
                            <Avatar avatar={wp.avatar} color={wp.color} size={18} />
                            {wp.nickname}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
