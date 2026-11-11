import type { FvItem } from '@/shared/schemas';
import type { Difficulty } from '@/shared/types';
import { END, activeIds, fail, isPlayer, mkPhase, nick, ok, sec } from '../engine/kit';
import type { GameCtx, GameModule, GameStateBase, ModView } from '../engine/kit';
import { FV_PER_VOTE, FV_TRUTH, fvMultiplier } from '../engine/scoring';
import { cleanText, isBlocked, norm, tooClose } from '../engine/text';
import { diffsFor, pickPlan } from '../content';

const LADDER: Difficulty[] = ['easy', 'easy', 'medium', 'medium', 'medium', 'hard'];

interface Opt { id: string; text: string; kind: 'truth' | 'lie' | 'decoy'; authors: string[] }
interface Result {
  truth: string; ref: string; verse: string; correct: number;
  fakes: { text: string; authors: string[]; votes: number; kind: 'lie' | 'decoy' }[];
  gain: Record<string, number>;
}
export interface State extends GameStateBase {
  rounds: number;
  plan: FvItem[];
  multiplier: 1 | 2;
  lies: Record<string, { text: string; key: string }>;
  hidden: string[];
  options: Opt[];
  votes: Record<string, string>;
  result: Result | null;
}

const item = (s: State) => s.plan[s.round - 1];

function startRound(s: State, ctx: GameCtx, round: number): State {
  return { ...s, round, multiplier: fvMultiplier(round) as 1 | 2, lies: {}, hidden: [], options: [], votes: {}, result: null, phase: mkPhase('prompt', ctx.now(), sec(ctx, 10)) };
}

/** Merge duplicates, add decoys, cap at 8 sampled lies when more than 10, then shuffle with the seeded RNG. */
export function buildOptions(it: FvItem, lies: State['lies'], hidden: string[], ctx: GameCtx): Opt[] {
  const groups = new Map<string, { text: string; authors: string[] }>();
  for (const [pid, l] of Object.entries(lies)) {
    if (hidden.includes(pid)) continue;
    const g = groups.get(l.key);
    if (g) g.authors.push(pid);
    else groups.set(l.key, { text: l.text, authors: [pid] });
  }
  let list = [...groups.values()];
  if (list.length > 10) list = ctx.rng.sample(list, 8);
  const decoys = it.decoys.filter((d) => !groups.has(norm(d)) && norm(d) !== norm(it.truth)).slice(0, 2);
  const raw: Omit<Opt, 'id'>[] = [
    { text: it.truth, kind: 'truth', authors: [] },
    ...decoys.map((text) => ({ text, kind: 'decoy' as const, authors: [] })),
    ...list.map((g) => ({ text: g.text, kind: 'lie' as const, authors: g.authors })),
  ];
  return ctx.rng.shuffle(raw).map((o, i) => ({ ...o, id: `o${i}` }));
}

function toVote(s: State, ctx: GameCtx): State {
  return { ...s, options: buildOptions(item(s), s.lies, s.hidden, ctx), votes: {}, phase: mkPhase('vote', ctx.now(), sec(ctx, 20)) };
}

function toReveal(s: State, ctx: GameCtx): State {
  const it = item(s);
  const gain: Record<string, number> = {};
  const tally: Record<string, number> = {};
  let correct = 0;
  for (const [voter, optId] of Object.entries(s.votes)) {
    const o = s.options.find((x) => x.id === optId);
    if (!o) continue;
    tally[o.id] = (tally[o.id] ?? 0) + 1;
    if (o.kind === 'truth') {
      correct++;
      gain[voter] = (gain[voter] ?? 0) + FV_TRUTH * s.multiplier;
    } else if (o.kind === 'lie') {
      const share = Math.floor((FV_PER_VOTE * s.multiplier) / o.authors.length);
      for (const a of o.authors) gain[a] = (gain[a] ?? 0) + share;
    }
  }
  const scores = { ...s.scores };
  for (const [pid, g] of Object.entries(gain)) scores[pid] = (scores[pid] ?? 0) + g;
  const fakes = s.options
    .filter((o) => o.kind !== 'truth')
    .map((o) => ({ text: o.text, authors: o.kind === 'decoy' ? ['Arkade'] : o.authors.map((a) => nick(ctx, a)), votes: tally[o.id] ?? 0, kind: o.kind as 'lie' | 'decoy' }))
    .sort((a, b) => b.votes - a.votes || (a.text < b.text ? -1 : 1));
  const result: Result = { truth: it.truth, ref: it.ref, verse: it.verse, correct, fakes, gain };
  return { ...s, scores, result, phase: mkPhase('reveal', ctx.now(), sec(ctx, 30)) };
}

function advance(s: State, ctx: GameCtx): State {
  switch (s.phase.name) {
    case 'prompt': return { ...s, phase: mkPhase('write', ctx.now(), sec(ctx, 45)) };
    case 'write': return toVote(s, ctx);
    case 'vote': return toReveal(s, ctx);
    case 'reveal': return s.round < s.rounds ? startRound(s, ctx, s.round + 1) : { ...s, phase: mkPhase(END, ctx.now(), null) };
    default: return s;
  }
}

const base = (s: State): Pick<ModView, 'round' | 'rounds'> => ({ round: s.round, rounds: s.rounds });
const pub = (s: State) => ({ text: item(s).text, mult: s.multiplier });

export const fakeVerse: GameModule<State> = {
  id: 'fake-verse',
  createState(ctx) {
    const plan = pickPlan(ctx.content.fv, diffsFor(ctx.config, LADDER), ctx.config.audience, ctx.rng);
    const s: State = { phase: mkPhase('prompt', ctx.now(), 0), round: 1, rounds: plan.length, plan, multiplier: 1, lies: {}, hidden: [], options: [], votes: {}, result: null, scores: {} };
    return startRound(s, ctx, 1);
  },
  reduce(s, a, ctx) {
    if ((a.by === 'system' && a.type === 'PHASE_TIMEOUT') || (a.by === 'mc' && a.type === 'SKIP')) return ok(advance(s, ctx));
    if (a.by === 'mc' && a.type === 'HIDE_ANSWER') {
      const pid = a.payload?.playerId as string | undefined;
      const oid = a.payload?.optionId as string | undefined;
      if (s.phase.name === 'write' && pid && !s.hidden.includes(pid)) return ok({ ...s, hidden: [...s.hidden, pid] });
      if (s.phase.name === 'vote' && oid) {
        const o = s.options.find((x) => x.id === oid);
        if (!o || o.kind === 'truth') return fail(s, 'NOT_HIDEABLE');
        const votes = Object.fromEntries(Object.entries(s.votes).filter(([, v]) => v !== oid));
        return ok({ ...s, options: s.options.filter((x) => x.id !== oid), votes });
      }
      return fail(s, 'PHASE');
    }
    if (a.by !== 'player') return ok(s);
    if (a.type === 'WRITE') {
      if (s.phase.name !== 'write') return fail(s, 'PHASE');
      if (!isPlayer(ctx, a.playerId)) return fail(s, 'SPECTATOR');
      if (s.lies[a.playerId]) return fail(s, 'LOCKED');
      const text = cleanText(String(a.payload?.text ?? ''), 40);
      if (!text) return fail(s, 'EMPTY');
      if (isBlocked(text) || tooClose(text, item(s).truth)) return fail(s, 'AGAIN'); // never say why
      const next = { ...s, lies: { ...s.lies, [a.playerId]: { text, key: norm(text) } } };
      return ok(Object.keys(next.lies).length >= activeIds(ctx).length ? toVote(next, ctx) : next);
    }
    if (a.type === 'VOTE') {
      if (s.phase.name !== 'vote') return fail(s, 'PHASE');
      if (!isPlayer(ctx, a.playerId)) return fail(s, 'SPECTATOR');
      if (s.votes[a.playerId]) return fail(s, 'LOCKED');
      const o = s.options.find((x) => x.id === a.payload?.target);
      if (!o) return fail(s, 'BAD_OPTION');
      if (o.authors.includes(a.playerId)) return fail(s, 'OWN');
      if (s.phase.endsAt != null && a.receivedAt > s.phase.endsAt) return fail(s, 'LATE');
      const next = { ...s, votes: { ...s.votes, [a.playerId]: o.id } };
      return ok(Object.keys(next.votes).length >= activeIds(ctx).length ? toReveal(next, ctx) : next);
    }
    return a.by === 'player' ? fail(s, 'PHASE') : ok(s);
  },
  views: {
    screen(s, ctx) {
      const p = s.phase.name;
      const data: Record<string, unknown> = { ...pub(s), submitted: Object.keys(s.lies).length, voted: Object.keys(s.votes).length, total: activeIds(ctx).length };
      if (p === 'vote') data.options = s.options.map((o) => ({ id: o.id, text: o.text }));
      if (p === 'reveal' && s.result) data.result = { truth: s.result.truth, ref: s.result.ref, verse: s.result.verse, correct: s.result.correct, fakes: s.result.fakes, startedAt: s.phase.startedAt };
      return { ...base(s), data, showTop5: p === 'reveal' || p === END };
    },
    player(s, pid) {
      const p = s.phase.name;
      const data: Record<string, unknown> = { ...pub(s), submitted: !!s.lies[pid], voted: s.votes[pid] ?? null };
      if (p === 'vote') data.options = s.options.filter((o) => !o.authors.includes(pid)).map((o) => ({ id: o.id, text: o.text }));
      if (p === 'reveal' && s.result) data.result = { truth: s.result.truth, ref: s.result.ref, verse: s.result.verse, correct: s.result.correct, fakes: s.result.fakes, gain: s.result.gain[pid] ?? 0, pickedTruth: s.options.find((o) => o.id === s.votes[pid])?.kind === 'truth' };
      return { ...base(s), data };
    },
    mc(s, ctx) {
      const p = s.phase.name;
      const data: Record<string, unknown> = { ...pub(s), submitted: Object.keys(s.lies).length, voted: Object.keys(s.votes).length, total: activeIds(ctx).length };
      if (p === 'write') data.submissions = Object.entries(s.lies).map(([pid, l]) => ({ pid, nick: nick(ctx, pid), text: l.text, hidden: s.hidden.includes(pid) }));
      if (p === 'vote') data.options = s.options.map((o) => ({ id: o.id, text: o.text, by: o.kind === 'lie' ? o.authors.map((a) => nick(ctx, a)) : o.kind === 'decoy' ? ['Arkade'] : ['?'] }));
      if (p === 'reveal' && s.result) data.result = s.result;
      return { ...base(s), data, hint: `hint.fv.${p}`, controls: p === 'write' || p === 'vote' ? ['hide'] : [] };
    },
  },
};
