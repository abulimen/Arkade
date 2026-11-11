import type { WcfItem } from '@/shared/schemas';
import type { Difficulty } from '@/shared/types';
import { END, activeIds, fail, isPlayer, mkPhase, ok, sec } from '../engine/kit';
import type { GameCtx, GameModule, GameStateBase, ModView } from '../engine/kit';
import { scoreOrder } from '../engine/scoring';
import { diffsFor, pickPlan } from '../content';

const LADDER: Difficulty[] = ['easy', 'easy', 'medium', 'medium', 'medium', 'hard', 'hard', 'hard'];

export interface State extends GameStateBase {
  rounds: number;
  plan: WcfItem[];
  shown: string[];
  locks: Record<string, { order: string[]; at: number }>;
  roundScores: Record<string, number>;
  perfect: number;
}

const item = (s: State) => s.plan[s.round - 1];
const truthOrder = (s: State) => item(s).events.slice().sort((a, b) => a.order - b.order).map((e) => e.id);
const ev = (s: State, id: string) => item(s).events.find((e) => e.id === id)!;

function startRound(s: State, ctx: GameCtx, round: number): State {
  const truth = truthOrder({ ...s, round });
  let shown = ctx.rng.shuffle(truth);
  for (let i = 0; i < 6 && shown.join() === truth.join(); i++) shown = ctx.rng.shuffle(truth);
  return { ...s, round, shown, locks: {}, roundScores: {}, perfect: 0, phase: mkPhase('prompt', ctx.now(), sec(ctx, 10)) };
}

function toReveal(s: State, ctx: GameCtx): State {
  const truth = truthOrder(s);
  const scores = { ...s.scores };
  const roundScores: Record<string, number> = {};
  let perfect = 0;
  for (const [pid, l] of Object.entries(s.locks)) {
    const pts = scoreOrder(l.order, truth, 200, [s.phase.startedAt, s.phase.endsAt ?? l.at, l.at]);
    roundScores[pid] = pts;
    scores[pid] = (scores[pid] ?? 0) + pts;
    if (l.order.join() === truth.join()) perfect++;
  }
  return { ...s, scores, roundScores, perfect, phase: mkPhase('reveal', ctx.now(), sec(ctx, 20)) };
}

function advance(s: State, ctx: GameCtx): State {
  switch (s.phase.name) {
    case 'prompt': return { ...s, phase: mkPhase('order', ctx.now(), sec(ctx, 40)) };
    case 'order': return toReveal(s, ctx);
    case 'reveal': return s.round < s.rounds ? startRound(s, ctx, s.round + 1) : { ...s, phase: mkPhase(END, ctx.now(), null) };
    default: return s;
  }
}

const cards = (s: State) => s.shown.map((id) => ({ id, text: ev(s, id).text }));
const timeline = (s: State) => truthOrder(s).map((id) => ({ id, text: ev(s, id).text, ref: ev(s, id).ref }));
const revealData = (s: State, ctx: GameCtx) => ({
  timeline: timeline(s), perfect: s.perfect, total: Object.keys(s.locks).length, active: activeIds(ctx).length, verse: item(s).verse, ref: item(s).ref, startedAt: s.phase.startedAt,
});
const live = (s: State, ctx: GameCtx) => ({ locked: Object.keys(s.locks).length, total: activeIds(ctx).length });
const base = (s: State): Pick<ModView, 'round' | 'rounds'> => ({ round: s.round, rounds: s.rounds });

export const whatCameFirst: GameModule<State> = {
  id: 'what-came-first',
  createState(ctx) {
    const plan = pickPlan(ctx.content.wcf, diffsFor(ctx.config, LADDER), ctx.config.audience, ctx.rng);
    const s: State = { phase: mkPhase('prompt', ctx.now(), 0), round: 1, rounds: plan.length, plan, shown: [], locks: {}, roundScores: {}, perfect: 0, scores: {} };
    return startRound(s, ctx, 1);
  },
  reduce(s, a, ctx) {
    if ((a.by === 'system' && a.type === 'PHASE_TIMEOUT') || (a.by === 'mc' && a.type === 'SKIP')) return ok(advance(s, ctx));
    if (a.by === 'player' && a.type === 'LOCK') {
      if (s.phase.name !== 'order') return fail(s, 'PHASE');
      if (!isPlayer(ctx, a.playerId)) return fail(s, 'SPECTATOR');
      if (s.locks[a.playerId]) return fail(s, 'LOCKED');
      const order: unknown = a.payload?.order;
      const ids = s.shown.slice().sort().join();
      if (!Array.isArray(order) || order.slice().sort().join() !== ids) return fail(s, 'BAD_ORDER');
      if (s.phase.endsAt != null && a.receivedAt > s.phase.endsAt) return fail(s, 'LATE');
      const next = { ...s, locks: { ...s.locks, [a.playerId]: { order: order as string[], at: a.receivedAt } } };
      return ok(Object.keys(next.locks).length >= activeIds(ctx).length ? toReveal(next, ctx) : next);
    }
    return a.by === 'player' ? fail(s, 'PHASE') : ok(s);
  },
  views: {
    screen(s, ctx) {
      const p = s.phase.name;
      const data: Record<string, unknown> = { ...live(s, ctx) };
      if (p === 'prompt' || p === 'order') data.cards = cards(s);
      if (p === 'reveal') data.reveal = revealData(s, ctx);
      return { ...base(s), data, showTop5: p === 'reveal' || p === END };
    },
    player(s, pid, ctx) {
      const p = s.phase.name;
      const lock = s.locks[pid];
      const data: Record<string, unknown> = { locked: !!lock, mine: lock?.order ?? null };
      if (p === 'order') data.cards = cards(s);
      if (p === 'reveal') {
        const truth = truthOrder(s);
        data.reveal = { ...revealData(s, ctx), gain: s.roundScores[pid] ?? 0, correct: lock ? lock.order.filter((v, i) => v === truth[i]).length : 0 };
      }
      return { ...base(s), data };
    },
    mc(s, ctx) {
      const p = s.phase.name;
      return { ...base(s), data: { ...live(s, ctx), cards: p === 'prompt' || p === 'order' ? cards(s) : null, reveal: p === 'reveal' ? revealData(s, ctx) : null }, hint: `hint.wcf.${p}` };
    },
  },
};
