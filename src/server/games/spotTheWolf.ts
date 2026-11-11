import type { WolfItem } from '@/shared/schemas';
import type { Difficulty } from '@/shared/types';
import { END, fail, mkPhase, nick, ok, pubOf, sec } from '../engine/kit';
import type { GameCtx, GameModule, GameStateBase, ModView } from '../engine/kit';
import { WOLF_CAUGHT_GUESS, WOLF_FLOCK, WOLF_HIDDEN, rankIds, wolfCount } from '../engine/scoring';
import { cleanText, guessMatches, isBlocked } from '../engine/text';
import { diffsFor, pickPlan } from '../content';

const LADDER: Difficulty[] = ['easy', 'easy', 'medium'];
interface Clue { pid: string; round: number; text: string; hidden?: boolean; spoken?: boolean }

export interface State extends GameStateBase {
  rounds: number;
  plan: WolfItem[];
  stage: string[];
  wolves: string[];
  word: WolfItem;
  lookalike: boolean;
  wolfN: number | null;
  turnOrder: string[];
  turnIndex: number;
  clueRound: 1 | 2;
  clues: Clue[];
  votes: Record<string, string>;
  accused: string[];
  caught: string[];
  guesses: Record<string, string>;
  guessOk: Record<string, boolean>;
  gain: Record<string, number>;
  log: string[];
}

const inClues = (s: State) => s.phase.name === 'clues1' || s.phase.name === 'clues2';
const turnMs = (s: State, ctx: GameCtx, round: 1 | 2) => Math.max(6000, Math.floor(sec(ctx, round === 1 ? 90 : 60) / Math.max(1, s.stage.length)));

function startRound(s: State, ctx: GameCtx, round: number): State {
  const word = s.plan[round - 1];
  const n = Math.max(1, Math.min(3, s.stage.length - 2, s.wolfN ?? wolfCount(s.stage.length)));
  return {
    ...s, round, word, wolves: ctx.rng.sample(s.stage, n), turnOrder: ctx.rng.shuffle(s.stage), turnIndex: 0, clueRound: 1, clues: [], votes: {}, accused: [], caught: [], guesses: {}, guessOk: {}, gain: {},
    phase: mkPhase('reveal', ctx.now(), sec(ctx, 20)),
  };
}
const enterClues = (s: State, ctx: GameCtx, round: 1 | 2): State => ({ ...s, clueRound: round, turnIndex: 0, phase: mkPhase(`clues${round}`, ctx.now(), turnMs(s, ctx, round)) });
const enterDebate = (s: State, ctx: GameCtx): State => ({ ...s, phase: mkPhase('debate', ctx.now(), sec(ctx, 90)) });

function nextTurn(s: State, ctx: GameCtx): State {
  const idx = s.turnIndex + 1;
  if (idx < s.turnOrder.length) return { ...s, turnIndex: idx, phase: mkPhase(s.phase.name, ctx.now(), turnMs(s, ctx, s.clueRound)) };
  return s.clueRound === 1 ? enterClues(s, ctx, 2) : enterDebate(s, ctx);
}

function toAccuse(s: State, ctx: GameCtx): State {
  const cnt: Record<string, number> = {};
  for (const t of Object.values(s.votes)) cnt[t] = (cnt[t] ?? 0) + 1;
  const k = s.wolves.length;
  const order = ctx.rng.shuffle(s.stage).sort((a, b) => (cnt[b] ?? 0) - (cnt[a] ?? 0));
  const log = [...s.log];
  if (order.length > k && (cnt[order[k - 1]] ?? 0) === (cnt[order[k]] ?? 0) && (cnt[order[k - 1]] ?? 0) > 0) {
    log.push(`round ${s.round}: tie at the accusation line, broken randomly (${order.slice(0, k + 1).join(',')})`);
  }
  const accused = order.slice(0, k).filter((id) => (cnt[id] ?? 0) > 0);
  const caught = accused.filter((id) => s.wolves.includes(id));
  return { ...s, accused, caught, log, phase: mkPhase('accuse', ctx.now(), sec(ctx, 15)) };
}

function toRoundEnd(s: State, ctx: GameCtx): State {
  const scores = { ...s.scores };
  const gain: Record<string, number> = {};
  for (const id of s.stage) {
    let g = 0;
    if (s.wolves.includes(id)) {
      if (!s.accused.includes(id)) g = WOLF_HIDDEN;
      else if (s.guessOk[id]) g = WOLF_CAUGHT_GUESS;
    } else if (s.votes[id] && s.wolves.includes(s.votes[id])) g = WOLF_FLOCK;
    gain[id] = g;
    scores[id] = (scores[id] ?? 0) + g;
  }
  return { ...s, scores, gain, phase: mkPhase('roundEnd', ctx.now(), sec(ctx, 12)) };
}

function advance(s: State, ctx: GameCtx, skip = false): State {
  switch (s.phase.name) {
    case 'reveal': return enterClues(s, ctx, 1);
    case 'clues1': case 'clues2':
      if (!skip) return nextTurn(s, ctx);
      return s.clueRound === 1 ? enterClues(s, ctx, 2) : enterDebate(s, ctx);
    case 'debate': return { ...s, phase: mkPhase('vote', ctx.now(), sec(ctx, 30)) };
    case 'vote': return toAccuse(s, ctx);
    case 'accuse': return s.caught.length ? { ...s, phase: mkPhase('guess', ctx.now(), sec(ctx, 15)) } : toRoundEnd(s, ctx);
    case 'guess': return toRoundEnd(s, ctx);
    case 'roundEnd': return s.round < s.rounds ? startRound(s, ctx, s.round + 1) : { ...s, phase: mkPhase(END, ctx.now(), null) };
    default: return s;
  }
}

const isRevealed = (s: State) => ['accuse', 'guess', 'roundEnd'].includes(s.phase.name);

function pub(s: State, ctx: GameCtx) {
  const p = s.phase.name;
  const rev = isRevealed(s);
  return {
    category: s.word.category,
    stage: s.stage.map((id) => pubOf(ctx, id)),
    turnOrder: s.turnOrder,
    turnIndex: inClues(s) ? s.turnIndex : null,
    clueRound: s.clueRound,
    clues: s.clues.filter((c) => !c.hidden).map(({ pid, round, text, spoken }) => ({ pid, round, text, spoken: !!spoken })),
    voted: Object.keys(s.votes).length,
    votes: rev ? s.votes : null,
    accused: rev ? s.accused.map((id) => ({ id, wolf: s.wolves.includes(id) })) : null,
    guessing: p === 'guess' ? s.caught : null,
    end: p === 'roundEnd' || p === END
      ? { word: s.word.word, ref: s.word.ref, verse: s.word.verse, wolves: s.wolves, guesses: Object.entries(s.guesses).map(([pid, text]) => ({ pid, text, ok: !!s.guessOk[pid] })), gain: s.gain }
      : null,
  };
}
const base = (s: State): Pick<ModView, 'round' | 'rounds'> => ({ round: s.round, rounds: s.rounds });

export const spotTheWolf: GameModule<State> = {
  id: 'spot-the-wolf',
  createState(ctx, opts) {
    const stage = opts?.stage ?? Object.values(ctx.players).filter((p) => p.role === 'player').slice(0, 10).map((p) => p.id);
    const plan = pickPlan(ctx.content.wolf, diffsFor(ctx.config, LADDER), ctx.config.audience, ctx.rng);
    const s: State = {
      phase: mkPhase('reveal', ctx.now(), 0), round: 1, rounds: plan.length, scores: {}, plan, stage, wolves: [], word: plan[0], lookalike: ctx.config.lookalike, wolfN: ctx.config.wolves,
      turnOrder: [], turnIndex: 0, clueRound: 1, clues: [], votes: {}, accused: [], caught: [], guesses: {}, guessOk: {}, gain: {}, log: [],
    };
    return startRound(s, ctx, 1);
  },
  rank(s) {
    return rankIds(s.stage, s.scores);
  },
  reduce(s, a, ctx) {
    if (a.by === 'system' && a.type === 'PHASE_TIMEOUT') return ok(advance(s, ctx));
    if (a.by === 'mc') {
      if (a.type === 'SKIP') return ok(advance(s, ctx, true));
      if (a.type === 'NEXT') {
        if (inClues(s)) {
          const pid = s.turnOrder[s.turnIndex];
          return ok(nextTurn({ ...s, clues: [...s.clues, { pid, round: s.clueRound, text: '', spoken: true }] }, ctx));
        }
        return ok(advance(s, ctx));
      }
      if (a.type === 'HIDE_ANSWER') {
        const i = Number(a.payload?.index);
        if (!s.clues[i]) return fail(s, 'BAD_INDEX');
        return ok({ ...s, clues: s.clues.map((c, j) => (j === i ? { ...c, hidden: true } : c)) });
      }
      return ok(s);
    }
    if (a.by !== 'player') return ok(s);
    const pid = a.playerId;
    if (!s.stage.includes(pid)) return fail(s, 'SPECTATOR');
    const late = s.phase.endsAt != null && a.receivedAt > s.phase.endsAt;
    if (a.type === 'CLUE' && inClues(s)) {
      if (s.turnOrder[s.turnIndex] !== pid) return fail(s, 'NOT_YOUR_TURN');
      const text = cleanText(String(a.payload?.text ?? ''), 60).split(' ')[0]?.slice(0, 24) ?? '';
      if (!text) return fail(s, 'EMPTY');
      if (isBlocked(text)) return fail(s, 'AGAIN');
      return ok(nextTurn({ ...s, clues: [...s.clues, { pid, round: s.clueRound, text }] }, ctx));
    }
    if (a.type === 'VOTE' && s.phase.name === 'vote') {
      const t = String(a.payload?.target);
      if (!s.stage.includes(t) || t === pid) return fail(s, 'BAD_TARGET');
      if (s.votes[pid]) return fail(s, 'LOCKED');
      if (late) return fail(s, 'LATE');
      const next = { ...s, votes: { ...s.votes, [pid]: t } };
      return ok(Object.keys(next.votes).length >= s.stage.filter((id) => ctx.players[id]?.connected).length ? toAccuse(next, ctx) : next);
    }
    if (a.type === 'GUESS' && s.phase.name === 'guess') {
      if (!s.caught.includes(pid)) return fail(s, 'NOT_CAUGHT');
      if (s.guesses[pid] !== undefined) return fail(s, 'LOCKED');
      const text = cleanText(String(a.payload?.text ?? ''), 40);
      if (!text) return fail(s, 'EMPTY');
      if (isBlocked(text)) return fail(s, 'AGAIN');
      if (late) return fail(s, 'LATE');
      const next = { ...s, guesses: { ...s.guesses, [pid]: text }, guessOk: { ...s.guessOk, [pid]: guessMatches(text, s.word.word, s.word.aliases) } };
      return ok(s.caught.every((id) => next.guesses[id] !== undefined) ? toRoundEnd(next, ctx) : next);
    }
    return a.by === 'player' ? fail(s, 'PHASE') : ok(s);
  },
  views: {
    screen(s, ctx) {
      return { ...base(s), data: pub(s, ctx), showTop5: isRevealed(s) || s.phase.name === END };
    },
    player(s, pid, ctx) {
      const d: Record<string, unknown> = { ...pub(s, ctx) };
      if (!s.stage.includes(pid)) return { ...base(s), data: { ...d, spectator: true } };
      d.spectator = false;
      const isWolf = s.wolves.includes(pid);
      const disguised = isWolf && s.lookalike && !!s.word.lookalike;
      d.card = isWolf && !disguised ? { wolf: true, category: s.word.category } : { wolf: false, word: disguised ? s.word.lookalike : s.word.word, category: s.word.category };
      d.myTurn = inClues(s) && s.turnOrder[s.turnIndex] === pid;
      d.myVote = s.votes[pid] ?? null;
      d.suspects = s.stage.filter((id) => id !== pid).map((id) => pubOf(ctx, id));
      d.canGuess = s.phase.name === 'guess' && s.caught.includes(pid) && s.guesses[pid] === undefined;
      d.myGain = s.gain[pid] ?? 0;
      return { ...base(s), data: d };
    },
    mc(s, ctx) {
      const p = s.phase.name;
      const d: Record<string, unknown> = { ...pub(s, ctx), mcClues: s.clues.map((c, i) => ({ i, nick: nick(ctx, c.pid), text: c.spoken ? '(said aloud)' : c.text, hidden: !!c.hidden })), log: s.log };
      d.currentTurn = inClues(s) ? nick(ctx, s.turnOrder[s.turnIndex]) : null;
      return { ...base(s), data: d, hint: `hint.wolf.${p.startsWith('clues') ? 'clues' : p}`, controls: inClues(s) ? ['hide', 'next'] : [] };
    },
  },
};
