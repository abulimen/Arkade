import type { G3Item } from '@/shared/schemas';
import type { Difficulty } from '@/shared/types';
import { END, fail, mkPhase, ok, pubOf, sec } from '../engine/kit';
import type { GameCtx, GameModule, GameStateBase, ModView } from '../engine/kit';
import { G_CORRECT, G_POINT, G_SPEED, G_TARGET, G_WATCHMAN, G_WINNER, keepCount, rankIds, speedBonus } from '../engine/scoring';
import { diffsFor, pickPlan } from '../content';

const S1: Difficulty[] = ['easy', 'easy', 'easy', 'medium', 'medium', 'medium'];
const S2: Difficulty[] = ['medium', 'medium', 'medium', 'medium', 'medium', 'medium'];
const S3: Difficulty[] = Array.from({ length: 15 }, (_, i) => (i % 2 === 0 ? 'hard' : 'medium'));

export interface State extends GameStateBase {
  stage: 1 | 2 | 3;
  qIndex: number;
  plan: { s1: G3Item[]; s2: G3Item[]; s3: G3Item[] };
  started: string[];
  alive: string[];
  finalists: string[];
  answers: Record<string, { choice: number; at: number }>;
  totalMs: Record<string, number>;
  gain: Record<string, number>;
  frozen: string[];
  predictions: Record<string, string>;
  finalPoints: Record<string, number>;
  lastWinner: string | null;
  lastWatch: Record<string, number>;
  cut: { before: number; after: number } | null;
  champion: string | null;
  keep1: number;
  keep2: number;
  finalistCount: number;
}

const list = (s: State) => (s.stage === 1 ? s.plan.s1 : s.stage === 2 ? s.plan.s2 : s.plan.s3);
const curQ = (s: State) => list(s)[s.qIndex];
const qWindow = (stage: number) => (stage === 1 ? 15 : stage === 2 ? 10 : 15);
const aliveConnected = (s: State, ctx: GameCtx) => s.alive.filter((id) => ctx.players[id]?.connected);

function startQ(s: State, ctx: GameCtx, stage: 1 | 2 | 3, qIndex: number): State {
  return { ...s, stage, qIndex, answers: {}, frozen: [], gain: {}, phase: mkPhase(`s${stage}q`, ctx.now(), sec(ctx, qWindow(stage))) };
}

function scoreQ(s: State, ctx: GameCtx): State {
  const q = curQ(s);
  const start = s.phase.startedAt;
  const end = s.phase.endsAt ?? start;
  const scores = { ...s.scores };
  const totalMs = { ...s.totalMs };
  const gain: Record<string, number> = {};
  for (const pid of s.alive) {
    const a = s.answers[pid];
    const g = a && a.choice === q.correct ? G_CORRECT + speedBonus(G_SPEED, start, end, a.at) : 0;
    gain[pid] = g;
    scores[pid] = (scores[pid] ?? 0) + g;
    totalMs[pid] = (totalMs[pid] ?? 0) + (a ? Math.min(Math.max(a.at - start, 0), end - start) : end - start);
  }
  return { ...s, scores, totalMs, gain, phase: mkPhase(`s${s.stage}r`, ctx.now(), sec(ctx, s.stage === 1 ? 4 : 3)) };
}

function doCut(s: State, ctx: GameCtx): State {
  const sorted = rankIds(s.alive, s.scores, s.totalMs);
  const keep = keepCount(sorted.length, s.stage === 1 ? s.keep1 : s.keep2, 2);
  const alive = sorted.slice(0, keep);
  const finalists = s.stage === 2 ? alive.slice(0, Math.min(s.finalistCount, alive.length)) : s.finalists;
  return { ...s, alive, finalists, cut: { before: sorted.length, after: alive.length }, phase: mkPhase(`s${s.stage}cut`, ctx.now(), sec(ctx, 6)) };
}

const watchmen = (s: State, ctx: GameCtx) => Object.values(ctx.players).filter((p) => !s.finalists.includes(p.id));
function toPredict(s: State, ctx: GameCtx, qIndex = s.qIndex): State {
  const hasWatchers = watchmen(s, ctx).some((p) => p.connected);
  return { ...s, stage: 3, qIndex, answers: {}, frozen: [], predictions: {}, phase: mkPhase('s3pre', ctx.now(), hasWatchers ? sec(ctx, 8) : sec(ctx, 2)) };
}

function toS3Result(s: State, ctx: GameCtx, winner: string | null): State {
  const scores = { ...s.scores };
  const finalPoints = { ...s.finalPoints };
  const lastWatch: Record<string, number> = {};
  let champion: string | null = null;
  const key = winner ?? 'nobody';
  if (winner) {
    finalPoints[winner] = (finalPoints[winner] ?? 0) + 1;
    scores[winner] = (scores[winner] ?? 0) + G_POINT;
    if (finalPoints[winner] >= G_TARGET) champion = winner;
  }
  for (const [pid, pick] of Object.entries(s.predictions)) {
    if (pick === key) {
      scores[pid] = (scores[pid] ?? 0) + G_WATCHMAN;
      lastWatch[pid] = G_WATCHMAN;
    }
  }
  return { ...s, scores, finalPoints, lastWatch, champion, lastWinner: key, phase: mkPhase('s3r', ctx.now(), sec(ctx, 5)) };
}

function toEnd(s: State, ctx: GameCtx): State {
  const champion = s.champion ?? rankIds(s.finalists, s.finalPoints, undefined)[0] ?? null;
  const scores = { ...s.scores };
  if (champion) scores[champion] = (scores[champion] ?? 0) + G_WINNER;
  return { ...s, scores, champion, phase: mkPhase(END, ctx.now(), null) };
}

function advance(s: State, ctx: GameCtx): State {
  const p = s.phase.name;
  switch (p) {
    case 'intro': return startQ(s, ctx, 1, 0);
    case 's1q': case 's2q': return scoreQ(s, ctx);
    case 's1r': case 's2r': return s.qIndex + 1 < list(s).length ? startQ(s, ctx, s.stage, s.qIndex + 1) : doCut(s, ctx);
    case 's1cut': return startQ(s, ctx, 2, 0);
    case 's2cut': return toPredict(s, ctx, 0);
    case 's3pre': return { ...startQ(s, ctx, 3, s.qIndex), predictions: s.predictions };
    case 's3q': return toS3Result(s, ctx, null);
    case 's3r': return s.champion || s.qIndex + 1 >= s.plan.s3.length ? toEnd(s, ctx) : toPredict(s, ctx, s.qIndex + 1);
    default: return s;
  }
}

function revert(s: State): State {
  if (s.phase.name !== 's3r' || !s.lastWinner) return s;
  const scores = { ...s.scores };
  const finalPoints = { ...s.finalPoints };
  if (s.lastWinner !== 'nobody') {
    finalPoints[s.lastWinner] = Math.max(0, (finalPoints[s.lastWinner] ?? 1) - 1);
    scores[s.lastWinner] = (scores[s.lastWinner] ?? 0) - G_POINT;
  }
  for (const [pid, g] of Object.entries(s.lastWatch)) scores[pid] = (scores[pid] ?? 0) - g;
  return { ...s, scores, finalPoints, champion: null, lastWatch: {}, lastWinner: null };
}

const roleOf = (s: State, pid: string): 'finalist' | 'watchman' | 'alive' | 'out' | 'spectator' => {
  if (s.stage === 3) return s.finalists.includes(pid) ? 'finalist' : 'watchman';
  if (s.alive.includes(pid)) return 'alive';
  return s.started.includes(pid) ? 'out' : 'spectator';
};

const qPub = (s: State) => {
  const q = curQ(s);
  return q ? { text: q.question, options: q.options } : null;
};
const qReveal = (s: State) => {
  const q = curQ(s);
  return { correct: q.correct, ref: q.ref, verse: q.verse };
};
const hist = (s: State) => {
  const h = [0, 0, 0, 0];
  for (const a of Object.values(s.answers)) h[a.choice]++;
  return h;
};
const board = (s: State, ctx: GameCtx) =>
  s.finalists.map((id) => ({ ...pubOf(ctx, id), points: s.finalPoints[id] ?? 0, frozen: s.frozen.includes(id) }));

function common(s: State, ctx: GameCtx) {
  const p = s.phase.name;
  const inQ = p === 's1q' || p === 's2q' || p === 's3q';
  const inR = p === 's1r' || p === 's2r' || p === 's3r';
  const d: Record<string, unknown> = { stage: s.stage, n: s.qIndex + 1, of: s.stage === 3 ? s.plan.s3.length : 6, target: G_TARGET, counts: { alive: s.alive.length, started: s.started.length, finalists: s.finalists.length } };
  if (inQ || p === 's3pre') d.q = p === 's3pre' ? null : qPub(s);
  if (inQ) d.answered = Object.keys(s.answers).length;
  if (inQ) d.total = s.stage === 3 ? s.finalists.length : aliveConnected(s, ctx).length;
  if (inR) Object.assign(d, qReveal(s), { hist: s.stage === 3 ? null : hist(s), q: qPub(s) });
  if (p === 's1cut' || p === 's2cut') d.cut = s.cut;
  if (s.stage === 3 || p === END) d.board = board(s, ctx);
  if (p === 's3r') d.winner = s.lastWinner && s.lastWinner !== 'nobody' ? pubOf(ctx, s.lastWinner) : null;
  if (p === END && s.champion) d.champion = pubOf(ctx, s.champion);
  return d;
}

export const gideons300: GameModule<State> = {
  id: 'gideons-300',
  createState(ctx, _opts) {
    void _opts;
    const diffs = [...diffsFor(ctx.config, S1), ...diffsFor(ctx.config, S2), ...diffsFor(ctx.config, S3)];
    const all = pickPlan(ctx.content.g300, diffs, ctx.config.audience, ctx.rng);
    const started = Object.values(ctx.players).filter((p) => p.role === 'player').map((p) => p.id);
    return {
      phase: mkPhase('intro', ctx.now(), sec(ctx, 8)), round: 1, scores: {}, stage: 1, qIndex: 0,
      plan: { s1: all.slice(0, 6), s2: all.slice(6, 12), s3: all.slice(12) },
      started, alive: started, finalists: [], answers: {}, totalMs: {}, gain: {}, frozen: [], predictions: {}, finalPoints: {},
      lastWinner: null, lastWatch: {}, cut: null, champion: null,
      keep1: ctx.config.keep1, keep2: ctx.config.keep2, finalistCount: ctx.config.finalists,
    };
  },
  rank(s, ctx) {
    const ids = Object.values(ctx.players).filter((p) => p.role === 'player' || (s.scores[p.id] ?? 0) > 0).map((p) => p.id);
    if (!s.finalists.length) return rankIds(ids, s.scores, s.totalMs);
    const fin = rankIds(s.finalists, s.finalPoints, undefined).sort((a, b) => (s.finalPoints[b] ?? 0) - (s.finalPoints[a] ?? 0) || (s.scores[b] ?? 0) - (s.scores[a] ?? 0) || (a < b ? -1 : 1));
    if (s.champion) fin.splice(0, fin.length, s.champion, ...fin.filter((x) => x !== s.champion));
    return [...fin, ...rankIds(ids.filter((i) => !s.finalists.includes(i)), s.scores, s.totalMs)];
  },
  reduce(s, a, ctx) {
    if ((a.by === 'system' && a.type === 'PHASE_TIMEOUT') || (a.by === 'mc' && a.type === 'SKIP')) return ok(advance(s, ctx));
    if (a.by === 'mc' && a.type === 'REASK') {
      if (s.phase.name !== 's3q' && s.phase.name !== 's3r') return fail(s, 'PHASE');
      return ok(toPredict(revert(s), ctx));
    }
    if (a.by !== 'player') return ok(s);
    const pid = a.playerId;
    const late = s.phase.endsAt != null && a.receivedAt > s.phase.endsAt;
    if (a.type === 'ANSWER' && (s.phase.name === 's1q' || s.phase.name === 's2q')) {
      if (!s.alive.includes(pid)) return fail(s, 'NOT_IN');
      if (s.answers[pid]) return fail(s, 'LOCKED');
      const choice = Number(a.payload?.choice);
      if (!Number.isInteger(choice) || choice < 0 || choice > 3) return fail(s, 'BAD_OPTION');
      if (late) return fail(s, 'LATE');
      const next = { ...s, answers: { ...s.answers, [pid]: { choice, at: a.receivedAt } } };
      const conn = aliveConnected(next, ctx);
      const done = conn.length > 0 && conn.every((id) => next.answers[id]);
      return ok(done ? scoreQ(next, ctx) : next);
    }
    if (a.type === 'BUZZ' && s.phase.name === 's3q') {
      // Arrival order is the order the server processes receipts; receivedAt is the server clock.
      if (!s.finalists.includes(pid)) return fail(s, 'NOT_FINALIST');
      if (s.frozen.includes(pid)) return fail(s, 'FROZEN');
      if (late) return fail(s, 'LATE');
      const choice = Number(a.payload?.choice);
      if (!Number.isInteger(choice) || choice < 0 || choice > 3) return fail(s, 'BAD_OPTION');
      if (choice === curQ(s).correct) return ok(toS3Result({ ...s, answers: { ...s.answers, [pid]: { choice, at: a.receivedAt } } }, ctx, pid));
      const frozen = [...s.frozen, pid];
      const next = { ...s, frozen };
      return ok(s.finalists.every((id) => frozen.includes(id)) ? toS3Result(next, ctx, null) : next);
    }
    if (a.type === 'PREDICT' && s.phase.name === 's3pre') {
      if (s.finalists.includes(pid)) return fail(s, 'FINALIST');
      const target = String(a.payload?.target);
      if (target !== 'nobody' && !s.finalists.includes(target)) return fail(s, 'BAD_OPTION');
      if (s.predictions[pid]) return fail(s, 'LOCKED');
      const next = { ...s, predictions: { ...s.predictions, [pid]: target } };
      const w = watchmen(next, ctx).filter((p) => p.connected);
      return ok(w.length > 0 && w.every((p) => next.predictions[p.id]) ? advance(next, ctx) : next);
    }
    return a.by === 'player' ? fail(s, 'PHASE') : ok(s);
  },
  views: {
    screen(s, ctx) {
      const d = common(s, ctx) as Record<string, unknown>;
      const order = s.started;
      d.tents = order.map((id, i) => (ctx.players[id]?.color ?? i % 6) * 3 + (s.finalists.includes(id) ? 2 : s.alive.includes(id) ? 1 : 0));
      if (s.phase.name === 's3pre') {
        const tally: Record<string, number> = {};
        for (const v of Object.values(s.predictions)) tally[v] = (tally[v] ?? 0) + 1;
        d.predicted = tally;
      }
      const p = s.phase.name;
      return { round: null, rounds: null, data: d, showTop5: (p.endsWith('r') && s.stage < 3) || p.endsWith('cut') || p === END };
    },
    player(s, pid, ctx) {
      const d = common(s, ctx) as Record<string, unknown>;
      const p = s.phase.name;
      const role = roleOf(s, pid);
      d.role = role;
      d.myAnswer = s.answers[pid]?.choice ?? null;
      d.myGain = s.gain[pid] ?? 0;
      if (p === 's3q') d.frozen = s.frozen.includes(pid);
      if (p === 's3pre') {
        d.targets = board(s, ctx).map(({ id, nickname, avatar, color }) => ({ id, nickname, avatar, color }));
        d.myPick = s.predictions[pid] ?? null;
      }
      if (p === 's3r') d.myWatch = s.lastWatch[pid] ?? 0;
      if (p === 's1cut' || p === 's2cut') d.safe = s.alive.includes(pid);
      if (p === 's2cut') d.finalist = s.finalists.includes(pid);
      return { round: null, rounds: null, data: d };
    },
    mc(s, ctx) {
      const d = common(s, ctx) as Record<string, unknown>;
      const p = s.phase.name;
      return { round: null, rounds: null, data: d, hint: `hint.g3.${p}`, controls: p === 's3q' || p === 's3r' ? ['reask'] : [] } as ModView;
    },
  },
};

