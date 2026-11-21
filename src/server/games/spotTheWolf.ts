import type { WolfItem } from '@/shared/schemas';
import type { Difficulty } from '@/shared/types';
import { END, fail, mkPhase, nick, ok, pubOf, sec } from '../engine/kit';
import type { GameCtx, GameModule, GameStateBase, ModView } from '../engine/kit';
import { WOLF_CAUGHT_GUESS, WOLF_FLOCK, WOLF_HIDDEN, rankIds, wolfCount } from '../engine/scoring';
import { cleanText, guessMatches, isBlocked } from '../engine/text';
import { diffsFor, pickPlan, scaleLadder } from '../content';

const LADDER: Difficulty[] = ['easy', 'easy', 'medium'];
interface Clue { pid: string; round: number; text: string; hidden?: boolean; spoken?: boolean; missed?: boolean }

export interface WolfRoundRecord {
  round: number;
  word: string;
  ref: string;
  wolves: string[];
  accused: string[];
  outcome: 'flock' | 'wolves';
  outcomeReason: string;
}

export interface State extends GameStateBase {
  rounds: number;
  plan: WolfItem[];
  stage: string[];
  wolves: string[];
  wolfCounts: Record<string, number>;
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
  outcome: 'flock' | 'wolves' | null;
  outcomeReason: string | null;
  roundHistory: WolfRoundRecord[];
  log: string[];
}

const inClues = (s: State) => s.phase.name === 'clues1' || s.phase.name === 'clues2';
const turnMs = (s: State, ctx: GameCtx, round: 1 | 2) => Math.max(6000, Math.floor(sec(ctx, round === 1 ? 90 : 60) / Math.max(1, s.stage.length)));

function startRound(s: State, ctx: GameCtx, round: number): State {
  const word = s.plan[round - 1];
  const n = Math.max(1, Math.min(3, s.stage.length - 2, s.wolfN ?? wolfCount(s.stage.length)));
  // Rotate wolves fairly across rounds so the same player doesn't get picked repeatedly while keeping Round 1 RNG identical.
  const counts = s.wolfCounts ?? {};
  const wolves = ctx.rng
    .shuffle(s.stage)
    .sort((a, b) => (counts[a] ?? 0) - (counts[b] ?? 0) || (s.wolves.includes(a) ? 1 : 0) - (s.wolves.includes(b) ? 1 : 0))
    .slice(0, n);
  const wolfCounts = { ...counts };
  for (const w of wolves) wolfCounts[w] = (wolfCounts[w] ?? 0) + 1;
  return {
    ...s,
    round,
    word,
    wolves,
    wolfCounts,
    turnOrder: ctx.rng.shuffle(s.stage),
    turnIndex: 0,
    clueRound: 1,
    clues: [],
    votes: {},
    accused: [],
    caught: [],
    guesses: {},
    guessOk: {},
    gain: {},
    outcome: null,
    outcomeReason: null,
    phase: mkPhase('reveal', ctx.now(), sec(ctx, 20)),
  };
}
const enterClues = (s: State, ctx: GameCtx, round: 1 | 2): State => ({ ...s, clueRound: round, turnIndex: 0, phase: mkPhase(`clues${round}`, ctx.now(), turnMs(s, ctx, round)) });
const enterDebate = (s: State, ctx: GameCtx): State => ({ ...s, phase: mkPhase('debate', ctx.now(), sec(ctx, ctx.config.debateSec ?? 90)) });

function nextTurn(s: State, ctx: GameCtx): State {
  const idx = s.turnIndex + 1;
  if (idx < s.turnOrder.length) return { ...s, turnIndex: idx, phase: mkPhase(s.phase.name, ctx.now(), turnMs(s, ctx, s.clueRound)) };
  const maxClueRounds = ctx.config.clueRounds ?? 2;
  return s.clueRound === 1 && maxClueRounds >= 2 ? enterClues(s, ctx, 2) : enterDebate(s, ctx);
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

function computeOutcome(s: State): { outcome: 'flock' | 'wolves'; outcomeReason: string } {
  const plural = s.wolves.length > 1;
  const anyGuessed = s.caught.some((id) => s.guessOk[id]);
  if (anyGuessed) {
    return {
      outcome: 'wolves',
      outcomeReason: plural ? 'A caught Wolf guessed the secret word!' : 'Caught, but the Wolf guessed the secret word!',
    };
  }
  const allCaught = s.wolves.length > 0 && s.wolves.every((id) => s.accused.includes(id));
  if (allCaught) {
    return {
      outcome: 'flock',
      outcomeReason: plural ? 'Every Wolf was caught and stumped!' : 'The Wolf was caught and stumped!',
    };
  }
  return {
    outcome: 'wolves',
    outcomeReason: plural
      ? s.caught.length > 0
        ? 'Another Wolf slipped past the vote!'
        : 'The Wolves escaped undetected!'
      : 'The Wolf escaped undetected!',
  };
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
  const { outcome, outcomeReason } = computeOutcome(s);
  const record: WolfRoundRecord = {
    round: s.round,
    word: s.word.word,
    ref: s.word.ref,
    wolves: [...s.wolves],
    accused: [...s.accused],
    outcome,
    outcomeReason,
  };
  const roundHistory = [...(s.roundHistory ?? []).filter((r) => r.round !== s.round), record];
  return { ...s, scores, gain, outcome, outcomeReason, roundHistory, phase: mkPhase('roundEnd', ctx.now(), sec(ctx, 12)) };
}

function advance(s: State, ctx: GameCtx, skip = false): State {
  switch (s.phase.name) {
    case 'reveal': return enterClues(s, ctx, 1);
    case 'clues1': case 'clues2':
      if (!skip) {
        const pid = s.turnOrder[s.turnIndex];
        const next = pid ? { ...s, clues: [...s.clues, { pid, round: s.clueRound, text: '', missed: true }] } : s;
        return nextTurn(next, ctx);
      }
      return s.clueRound === 1 && (ctx.config.clueRounds ?? 2) >= 2 ? enterClues(s, ctx, 2) : enterDebate(s, ctx);
    case 'debate': return { ...s, phase: mkPhase('vote', ctx.now(), sec(ctx, 30)) };
    case 'vote': return toAccuse(s, ctx);
    case 'accuse': return s.caught.length && (ctx.config.allowWolfGuess ?? true) ? { ...s, phase: mkPhase('guess', ctx.now(), sec(ctx, 15)) } : toRoundEnd(s, ctx);
    case 'guess': return toRoundEnd(s, ctx);
    case 'roundEnd': return s.round < s.rounds ? startRound(s, ctx, s.round + 1) : { ...s, phase: mkPhase(END, ctx.now(), null) };
    default: return s;
  }
}

const isRevealed = (s: State) => ['accuse', 'guess', 'roundEnd', END].includes(s.phase.name);

function pub(s: State, ctx: GameCtx) {
  const p = s.phase.name;
  const rev = isRevealed(s);
  const resolvedOutcome = s.outcome ?? computeOutcome(s).outcome;
  const resolvedReason = s.outcomeReason ?? computeOutcome(s).outcomeReason;
  return {
    category: s.word.category,
    stage: s.stage.map((id) => pubOf(ctx, id)),
    turnOrder: s.turnOrder,
    turnIndex: inClues(s) ? s.turnIndex : null,
    clueRound: s.clueRound,
    clues: s.clues.filter((c) => !c.hidden).map(({ pid, round, text, spoken, missed }) => ({ pid, round, text, spoken: !!spoken, missed: !!missed })),
    impostorCount: s.wolves.length,
    voted: Object.keys(s.votes).length,
    votedIds: Object.keys(s.votes),
    votes: rev ? s.votes : null,
    accused: rev ? s.accused.map((id) => ({ id, wolf: s.wolves.includes(id) })) : null,
    guessing: p === 'guess' ? s.caught : null,
    end: p === 'roundEnd' || p === END
      ? {
          word: s.word.word,
          ref: s.word.ref,
          verse: s.word.verse,
          wolves: s.wolves,
          guesses: Object.entries(s.guesses).map(([pid, text]) => ({ pid, text, ok: !!s.guessOk[pid] })),
          gain: s.gain,
          outcome: resolvedOutcome,
          outcomeReason: resolvedReason,
          history: s.roundHistory ?? [],
        }
      : null,
  };
}
const base = (s: State): Pick<ModView, 'round' | 'rounds'> => ({ round: s.round, rounds: s.rounds });

export const spotTheWolf: GameModule<State> = {
  id: 'spot-the-wolf',
  createState(ctx, opts) {
    const stage = opts?.stage ?? Object.values(ctx.players).filter((p) => p.role === 'player').slice(0, 10).map((p) => p.id);
    const ladder = scaleLadder(LADDER, ctx.config.rounds ?? null);
    const plan = pickPlan(ctx.content.wolf, diffsFor(ctx.config, ladder), ctx.config.audience, ctx.rng, {
      testament: ctx.config.testament,
      categories: ctx.config.wolfCategories,
      custom: ctx.config.customQuestions?.wolf,
      customMode: ctx.config.customMode,
    });
    const s: State = {
      phase: mkPhase('reveal', ctx.now(), 0), round: 1, rounds: plan.length, scores: {}, plan, stage, wolves: [], wolfCounts: {}, word: plan[0], lookalike: ctx.config.lookalike, wolfN: ctx.config.wolves,
      turnOrder: [], turnIndex: 0, clueRound: 1, clues: [], votes: {}, accused: [], caught: [], guesses: {}, guessOk: {}, gain: {}, outcome: null, outcomeReason: null, roundHistory: [], log: [],
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
      // Keep the vote window open (don't reveal who was accused/caught until the vote timer ends or MC advances).
      return ok({ ...s, votes: { ...s.votes, [pid]: t } });
    }
    if (a.type === 'GUESS' && s.phase.name === 'guess') {
      if (!s.caught.includes(pid)) return fail(s, 'NOT_CAUGHT');
      if (s.guesses[pid] !== undefined) return fail(s, 'LOCKED');
      const text = cleanText(String(a.payload?.text ?? ''), 40);
      if (!text) return fail(s, 'EMPTY');
      if (isBlocked(text)) return fail(s, 'AGAIN');
      if (late) return fail(s, 'LATE');
      const okGuess = guessMatches(text, s.word.word, s.word.aliases) || a.payload?.aiApproved === true;
      const next = { ...s, guesses: { ...s.guesses, [pid]: text }, guessOk: { ...s.guessOk, [pid]: okGuess } };
      return ok(s.caught.every((id) => next.guesses[id] !== undefined) ? toRoundEnd(next, ctx) : next);
    }
    return a.by === 'player' ? fail(s, 'PHASE') : ok(s);
  },
  views: {
    screen(s, ctx) {
      return { ...base(s), data: pub(s, ctx), showTop5: false };
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
      const d: Record<string, unknown> = { ...pub(s, ctx), mcClues: s.clues.map((c, i) => ({ i, nick: nick(ctx, c.pid), text: c.missed ? '(failed to type a word)' : c.spoken ? '(said aloud)' : c.text, hidden: !!c.hidden })), log: s.log };
      d.currentTurn = inClues(s) ? nick(ctx, s.turnOrder[s.turnIndex]) : null;
      return { ...base(s), data: d, hint: `hint.wolf.${p.startsWith('clues') ? 'clues' : p}`, controls: inClues(s) ? ['hide', 'next'] : [] };
    },
  },
};
