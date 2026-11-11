import type { WaiItem } from '@/shared/schemas';
import type { Difficulty } from '@/shared/types';
import { RAINBOW } from '@/shared/types';
import { END, activeIds, fail, isPlayer, mkPhase, ok, sec } from '../engine/kit';
import type { GameCtx, GameModule, GameStateBase, ModView } from '../engine/kit';
import { WAI_PENALTY, whoAmIPoints } from '../engine/scoring';
import { diffsFor, pickPlan } from '../content';

const LADDER: Difficulty[] = ['easy', 'easy', 'easy', 'medium', 'medium', 'medium', 'hard', 'hard'];
const clueOf = (name: string) => (name.startsWith('clue') ? Number(name.slice(4)) - 1 : -1);

interface Ans { choice: string; at: number; clueIndex: number; correct: boolean }
export interface State extends GameStateBase {
  rounds: number;
  plan: WaiItem[];
  options: string[];
  answers: Record<string, Ans>;
  gain: Record<string, number>;
  correctCount: number;
}
const subject = (s: State) => s.plan[s.round - 1];

function startRound(s: State, ctx: GameCtx, round: number): State {
  const sub = s.plan[round - 1];
  const others = sub.options.filter((o) => o !== sub.name);
  const pool = ctx.config.audience === 'kids' ? [sub.name, ...ctx.rng.sample(others, 3)] : sub.options;
  return { ...s, round, options: ctx.rng.shuffle(pool), answers: {}, gain: {}, correctCount: 0, phase: mkPhase('clue1', ctx.now(), sec(ctx, 10)) };
}

function toReveal(s: State, ctx: GameCtx): State {
  const scores = { ...s.scores };
  const gain: Record<string, number> = {};
  let correctCount = 0;
  for (const [pid, a] of Object.entries(s.answers)) {
    if (!a.correct) continue;
    gain[pid] = whoAmIPoints(a.clueIndex);
    scores[pid] = (scores[pid] ?? 0) + gain[pid];
    correctCount++;
  }
  return { ...s, scores, gain, correctCount, phase: mkPhase('reveal', ctx.now(), sec(ctx, 15)) };
}

function advance(s: State, ctx: GameCtx): State {
  const n = clueOf(s.phase.name);
  if (n >= 0 && n < 4) return { ...s, phase: mkPhase(`clue${n + 2}`, ctx.now(), sec(ctx, 10)) };
  if (n === 4) return toReveal(s, ctx);
  if (s.phase.name === 'reveal') return s.round < s.rounds ? startRound(s, ctx, s.round + 1) : { ...s, phase: mkPhase(END, ctx.now(), null) };
  return s;
}

const base = (s: State): Pick<ModView, 'round' | 'rounds'> => ({ round: s.round, rounds: s.rounds });
const cluesShown = (s: State) => {
  const n = clueOf(s.phase.name);
  return subject(s).clues.slice(0, n >= 0 ? n + 1 : 5);
};
const revealInfo = (s: State) => ({ name: subject(s).name, ref: subject(s).ref, story: subject(s).story, verse: subject(s).verse, correctCount: s.correctCount, startedAt: s.phase.startedAt });
const pubData = (s: State, ctx: GameCtx) => {
  const n = clueOf(s.phase.name);
  return {
    clues: cluesShown(s), clueIndex: n, nClues: 5, color: (s.round - 1) % RAINBOW.length, reveal: n >= 0 ? (n + 1) / 5 : 1,
    locked: Object.keys(s.answers).length, total: activeIds(ctx).length,
  };
};

export const whoAmI: GameModule<State> = {
  id: 'who-am-i',
  createState(ctx) {
    const plan = pickPlan(ctx.content.wai, diffsFor(ctx.config, LADDER), ctx.config.audience, ctx.rng);
    const s: State = { phase: mkPhase('clue1', ctx.now(), 0), round: 1, rounds: plan.length, plan, options: [], answers: {}, gain: {}, correctCount: 0, scores: {} };
    return startRound(s, ctx, 1);
  },
  reduce(s, a, ctx) {
    if ((a.by === 'system' && a.type === 'PHASE_TIMEOUT') || (a.by === 'mc' && a.type === 'SKIP')) return ok(advance(s, ctx));
    if (a.by === 'player' && a.type === 'ANSWER') {
      const ci = clueOf(s.phase.name);
      if (ci < 0) return fail(s, 'PHASE');
      if (!isPlayer(ctx, a.playerId)) return fail(s, 'SPECTATOR');
      if (s.answers[a.playerId]) return fail(s, 'LOCKED');
      const choice = String(a.payload?.choice ?? '');
      if (!s.options.includes(choice)) return fail(s, 'BAD_OPTION');
      if (s.phase.endsAt != null && a.receivedAt > s.phase.endsAt) return fail(s, 'LATE');
      // clue index is read from the phase at server receive time, never from the client
      const correct = choice === subject(s).name;
      const answers = { ...s.answers, [a.playerId]: { choice, at: a.receivedAt, clueIndex: ci, correct } };
      const scores = correct ? s.scores : { ...s.scores, [a.playerId]: Math.max(0, (s.scores[a.playerId] ?? 0) - WAI_PENALTY) };
      const next = { ...s, answers, scores };
      return ok(Object.keys(answers).length >= activeIds(ctx).length ? toReveal(next, ctx) : next);
    }
    return a.by === 'player' ? fail(s, 'PHASE') : ok(s);
  },
  views: {
    screen(s, ctx) {
      const p = s.phase.name;
      const data: Record<string, unknown> = { ...pubData(s, ctx) };
      if (p === 'reveal') data.result = revealInfo(s);
      return { ...base(s), data, showTop5: p === 'reveal' || p === END };
    },
    player(s, pid, ctx) {
      const p = s.phase.name;
      const a = s.answers[pid];
      const data: Record<string, unknown> = { ...pubData(s, ctx), status: a ? (a.correct ? 'locked' : 'out') : 'open', chosen: a?.choice ?? null };
      if (clueOf(p) >= 0) data.options = s.options;
      if (p === 'reveal') data.result = { ...revealInfo(s), gain: s.gain[pid] ?? 0, correct: !!a?.correct, answered: !!a };
      return { ...base(s), data };
    },
    mc(s, ctx) {
      const p = s.phase.name;
      return { ...base(s), data: p === 'reveal' ? { ...pubData(s, ctx), result: revealInfo(s) } : pubData(s, ctx), hint: `hint.wai.${p.startsWith('clue') ? 'clue' : p}` };
    },
  },
};
