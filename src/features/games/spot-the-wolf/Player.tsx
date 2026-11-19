'use client';

import { useState } from 'react';
import type { PlayerPublic } from '@/shared/types';
import { t } from '@/i18n';
import { haptic, playWolfAudio } from '@/client/sound';
import { Avatar } from '@/ui/avatars';
import { Icon } from '@/ui/icons';
import { Button, PlayerChip, SecretCard } from '@/ui/kit';
import { MascotView } from '@/ui/mascots';
import type { PlayerProps } from '../types';
import { LockedIn, Verse, Waiting } from '../shared';

export { PlayerChip };

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

interface WolfPlayerData {
  stage: PlayerPublic[];
  clues: Clue[];
  category: string;
  spectator?: boolean;
  card?: { wolf: boolean; category: string; word?: string };
  turnOrder?: string[];
  turnIndex?: number;
  clueRound?: number;
  myTurn?: boolean;
  myVote?: string | null;
  suspects?: PlayerPublic[];
  voted?: number;
  votedIds?: string[];
  votes?: Record<string, string>;
  accused?: { id: string; wolf: boolean }[];
  canGuess?: boolean;
  myGain?: number;
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

export default function SpotWolfPlayer({ view, send }: PlayerProps) {
  const d = view.data as WolfPlayerData;
  const p = view.phase;
  const [clue, setClue] = useState('');
  const [guess, setGuess] = useState('');
  const [busy, setBusy] = useState(false);

  const byId = new Map((d.stage ?? []).map((s) => [s.id, s]));

  if (d.spectator) {
    return (
      <div className="space-y-4 my-auto">
        <Waiting mascot="wilf" title={t('lobby.spectator')} body={t('wolf.watchBody', { cat: d.category })} />
        {(d.clues?.length ?? 0) > 0 && <ClueFeed clues={d.clues} byId={byId} />}
      </div>
    );
  }

  if (p === 'reveal' && d.card) {
    const wolf = d.card.wolf;
    return (
      <div className="space-y-4">
        <div className="text-center text-xs font-bold uppercase tracking-widest text-gold">
          {t('wolf.category', { cat: d.card.category })}
        </div>
        <SecretCard hint={t('wolf.hold')}>
          <div className="space-y-4 text-center">
            <div
              className={`mx-auto w-fit rounded-3xl p-4 border ${
                wolf ? 'border-coral/50 bg-coral/15' : 'border-leaf/50 bg-leaf/15'
              }`}
            >
              <MascotView name="wilf" expression={wolf ? 'oops' : 'cheer'} size={96} decorative />
            </div>
            {wolf ? (
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-coral px-4 py-1 text-xs font-extrabold uppercase tracking-widest text-night">
                  <Icon n="flame" size={14} /> {t('wolf.youAre')}
                </div>
                <div className="font-bold text-coral fs-h1 leading-tight">{t('wolf.wolfCard')}</div>
                <p className="text-sm text-cloud">{t('wolf.wolfTip')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-widest text-leaf">{t('wolf.yourWord')}</div>
                <div className="rounded-2xl border border-gold/50 bg-gold/15 px-5 py-3 font-bold text-gold fs-h1">
                  {d.card.word}
                </div>
                <p className="text-sm text-cloud">{t('wolf.flockTip')}</p>
              </div>
            )}
          </div>
        </SecretCard>
      </div>
    );
  }

  if (p === 'clues1' || p === 'clues2') {
    const currentId = d.turnOrder?.[d.turnIndex ?? 0];
    const currentName = (currentId && byId.get(currentId)?.nickname) || '…';

    const submitClue = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!clue.trim()) return;
      setBusy(true);
      await send('CLUE', { text: clue.trim() });
      setClue('');
      setBusy(false);
    };

    return (
      <div className="space-y-4">
        {d.myTurn ? (
          <form
            onSubmit={submitClue}
            className="arcade-panel border-leaf/50 bg-leaf/10 p-5 space-y-4 a-pop shadow-[0_0_32px_-8px_rgba(56,236,130,0.4)]"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full bg-leaf px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-night">
                <Icon n="bolt" size={13} /> {t('wolf.yourTurn')}
              </span>
              <span className="text-xs font-bold text-slate">
                {t('wolf.clueRound', { n: d.clueRound ?? (p === 'clues2' ? 2 : 1) })}
              </span>
            </div>
            <label htmlFor="wolf-clue" className="block text-sm font-semibold text-white">
              {t('wolf.clueLabel')}
            </label>
            <input
              id="wolf-clue"
              type="text"
              maxLength={40}
              value={clue}
              onChange={(e) => setClue(e.target.value)}
              placeholder="One sharp clue word…"
              className="arcade-input font-semibold"
            />
            <Button type="submit" variant="primary" loading={busy} disabled={!clue.trim()} className="w-full">
              {t('wolf.sendClue')}
            </Button>
            <p className="text-center text-xs text-slate">{t('wolf.orAloud')}</p>
          </form>
        ) : (
          <Waiting mascot="wilf" title={t('wolf.waitingFor', { name: currentName })} />
        )}

        {(d.clues?.length ?? 0) > 0 && <ClueFeed clues={d.clues} byId={byId} />}
      </div>
    );
  }

  if (p === 'debate') {
    return (
      <div className="space-y-4">
        <Waiting mascot="wilf" title={t('wolf.discuss')} body={t('wolf.discussBody')} />
        {(d.clues?.length ?? 0) > 0 && <ClueFeed clues={d.clues} byId={byId} />}
      </div>
    );
  }

  if (p === 'vote') {
    const stage = d.stage ?? [];
    const votedSet = new Set(d.votedIds ?? []);
    const voteStatus = stage.length > 0 && (
      <div className="arcade-card p-3.5 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-slate">
          <span>Crew Vote Status</span>
          <span className="text-leaf tabular-nums">
            {d.voted ?? votedSet.size}/{stage.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {stage.map((sp) => {
            const done = votedSet.has(sp.id);
            return (
              <span
                key={sp.id}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  done
                    ? 'border-leaf/55 bg-leaf/15 text-leaf'
                    : 'border-white/10 bg-night-3/70 text-slate'
                }`}
              >
                <Avatar avatar={sp.avatar} color={sp.color} size={18} />
                <span>{sp.nickname}</span>
                <span className="text-[10px] font-extrabold">{done ? '✓' : '…'}</span>
              </span>
            );
          })}
        </div>
      </div>
    );

    if (d.myVote) {
      const target = byId.get(d.myVote);
      return (
        <div className="space-y-4">
          <LockedIn sub={target ? `Voted for ${target.nickname}` : undefined} />
          {voteStatus}
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <h2 className="font-bold text-white fs-h2 text-center">{t('wolf.whoIsWolf')}</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {(d.suspects ?? []).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                playWolfAudio('wolf-vote', { forceUi: true });
                haptic('press');
                void send('VOTE', { target: s.id });
              }}
              className="cursor-pointer press arcade-card p-3.5 flex items-center gap-3 text-left hover:border-gold/50 hover:bg-night-3 transition-all min-h-14"
            >
              <Avatar avatar={s.avatar} color={s.color} size={42} />
              <span className="truncate font-semibold text-white text-sm">{s.nickname}</span>
            </button>
          ))}
        </div>
        {voteStatus}
      </div>
    );
  }

  if (p === 'accuse') {
    const accused = d.accused ?? [];
    return (
      <div className="arcade-panel p-6 text-center space-y-4 my-auto a-pop">
        <h2 className="font-bold text-white fs-h2">
          {accused.length === 0
            ? t('wolf.noOne')
            : accused.some((a) => a.wolf)
              ? t('wolf.wolfOut')
              : t('wolf.notWolf')}
        </h2>
        <div className="flex flex-wrap justify-center gap-2.5">
          {accused.map((a) => {
            const sp = byId.get(a.id);
            if (!sp) return null;
            return (
              <div
                key={a.id}
                className={`rounded-2xl border p-3 flex items-center gap-2.5 ${
                  a.wolf ? 'border-coral/60 bg-coral/15' : 'border-sky/50 bg-sky/12'
                }`}
              >
                <Avatar avatar={sp.avatar} color={sp.color} size={36} />
                <span className="font-semibold text-white text-sm">{sp.nickname}</span>
                {a.wolf && (
                  <span className="rounded-full bg-coral px-2 py-0.5 text-[10px] font-extrabold uppercase text-night">
                    {t('wolf.wolfTag')}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (p === 'guess') {
    if (!d.canGuess) {
      return <Waiting mascot="wilf" title={t('wolf.guessing')} body={t('wolf.guessingBody')} />;
    }
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!guess.trim()) return;
          setBusy(true);
          await send('GUESS', { text: guess.trim() });
          setBusy(false);
        }}
        className="arcade-panel border-coral/50 bg-coral/12 p-5 space-y-4 a-pop"
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-coral px-3 py-1 text-xs font-extrabold uppercase text-night">
          <Icon n="flame" size={14} /> {t('wolf.caught')}
        </div>
        <label htmlFor="wolf-guess" className="block font-semibold text-white text-base">
          {t('wolf.guessLabel')}
        </label>
        <input
          id="wolf-guess"
          type="text"
          maxLength={60}
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          placeholder="Type secret word…"
          className="arcade-input font-semibold"
        />
        <Button type="submit" variant="primary" loading={busy} disabled={!guess.trim()} className="w-full">
          {t('wolf.guess')}
        </Button>
      </form>
    );
  }

  const end = d.end;
  const outcome = end?.outcome ?? 'wolves';
  const flockWon = outcome === 'flock';
  const myWolf = Boolean(end?.wolves.includes(view.me?.id ?? ''));
  const iWon = (flockWon && !myWolf) || (!flockWon && myWolf);
  return (
    <div className="space-y-4">
      <div
        className={`arcade-panel p-5 text-center space-y-2 a-pop ${
          flockWon ? 'border-sky/50 bg-sky/10' : 'border-coral/50 bg-coral/10'
        }`}
      >
        <div
          className={`text-xs font-extrabold uppercase tracking-[0.25em] ${
            flockWon ? 'text-sky' : 'text-coral'
          }`}
        >
          {flockWon ? 'FLOCK VICTORY' : 'WOLVES VICTORY'}
        </div>
        <h2 className="font-bold text-white fs-h2">
          {iWon ? 'Victory! Your team won!' : 'Defeat — better luck next round!'}
        </h2>
        {end?.outcomeReason && <p className="text-sm text-cloud">{end.outcomeReason}</p>}
        {end && (
          <div className="pt-2 border-t border-white/10 text-xs font-bold uppercase tracking-widest text-gold">
            {t('wolf.wordWas')}: <span className="text-white normal-case text-sm ml-1">{end.word}</span>
          </div>
        )}
      </div>

      {end && (
        <>
          <div className="arcade-card p-4 space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-widest text-coral">{t('wolf.wolvesWere')}</div>
            <div className="flex flex-wrap gap-2">
              {end.wolves.map((wid) => {
                const wp = byId.get(wid);
                return wp ? <PlayerChip key={wid} p={wp} size={30} /> : null;
              })}
            </div>
          </div>
          <Verse verse={end.verse} refText={end.ref} />
          {p === 'end' && (end.history?.length ?? 0) > 0 && (
            <div className="arcade-card p-4 space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-widest text-gold">Match Recap</div>
              <div className="space-y-2">
                {end.history!.map((item) => (
                  <div key={item.round} className="rounded-xl bg-night-3/80 px-3 py-2 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="font-bold text-slate mr-1.5">R{item.round}</span>
                      <span className="font-semibold text-white">{item.word}</span>
                    </div>
                    <span className={item.outcome === 'flock' ? 'font-bold text-sky' : 'font-bold text-coral'}>
                      {item.outcome === 'flock' ? 'Flock Won' : 'Wolves Won'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ClueFeed({ clues, byId }: { clues: Clue[]; byId: Map<string, PlayerPublic> }) {
  return (
    <div className="arcade-card p-4 space-y-2.5">
      <div className="text-xs font-bold uppercase tracking-widest text-slate">{t('wolf.clues')}</div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {clues.map((c, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm ${
              c.missed ? 'border border-coral/35 bg-coral/10' : 'bg-night-3/80'
            }`}
          >
            <span className="font-semibold text-gold">{byId.get(c.pid)?.nickname ?? 'Player'}</span>
            <span className={c.missed ? 'font-semibold italic text-coral' : 'font-medium text-cloud'}>
              {c.missed ? 'Failed to type a word' : c.spoken ? t('wolf.spoken') : c.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
