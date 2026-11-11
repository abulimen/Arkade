import type { Audience, Difficulty, GameConfig } from '@/shared/types';
import { FvSchema, G3Schema, WaiSchema, WcfSchema, WolfSchema } from '@/shared/schemas';
import type { FvItem, G3Item, WaiItem, WcfItem, WolfItem } from '@/shared/schemas';
import type { Rng } from '../engine/rng';
import { VERSES } from './verses';
import { WCF } from './data/wcf';
import { FV } from './data/fv';
import { G3 } from './data/g300';
import { WOLF } from './data/wolf';
import { WAI } from './data/wai';

export interface Content {
  wcf: WcfItem[];
  fv: FvItem[];
  g300: G3Item[];
  wolf: WolfItem[];
  wai: WaiItem[];
}

const D = { e: 'easy', m: 'medium', h: 'hard' } as const;
const A: Record<string, Audience> = { k: 'kids', y: 'youth', a: 'adults' };
const aud = (s: string) => [...s].map((c) => A[c]);
const base = (id: string, d: 'e' | 'm' | 'h', a: string, t: 'OT' | 'NT' | 'both', ref: string) => ({
  id, difficulty: D[d], audience: aud(a), testament: t, ref, verse: VERSES[ref] ?? '', translation: 'KJV' as const, review: 'approved' as const,
});

/** Expand the compact authoring tables into full, schema-shaped items (unvalidated). */
export function expand() {
  return {
    wcf: WCF.map(([id, d, a, t, ref, ev]) => ({
      ...base(`wcf-${id}`, d, a, t, ref),
      events: ev.map(([text, r], order) => ({ id: `e${order + 1}`, text, ref: r, order })),
    })),
    fv: FV.map(([id, d, a, t, ref, text, truth, decoys]) => ({ ...base(`fv-${id}`, d, a, t, ref), text, truth, decoys })),
    g300: G3.map(([d, ref, question, right, wrong], i) => {
      const pos = (i * 3 + 1) % 4;
      const options = wrong.slice();
      options.splice(pos, 0, right);
      return { ...base(`g3-${i + 1}`, d, d === 'e' ? 'kya' : 'ya', 'both', ref), question, options, correct: pos };
    }),
    wolf: WOLF.map(([word, category, aliases, lookalike, ref, d], i) => ({
      ...base(`wolf-${i + 1}`, d, d === 'e' ? 'kya' : 'ya', 'both', ref), word, category, aliases, lookalike,
    })),
    wai: WAI.map(([id, d, a, t, ref, name, clues, distractors, story]) => ({
      ...base(`wai-${id}`, d, a, t, ref), name, clues, options: [name, ...distractors], story,
    })),
  };
}

export interface Problem { game: string; id: string; message: string }

/** Full validation used by the build-time script, the tests and server start. */
export function validate(raw = expand()): { content: Content; problems: Problem[] } {
  const problems: Problem[] = [];
  const out: Content = { wcf: [], fv: [], g300: [], wolf: [], wai: [] };
  const run = <K extends keyof Content>(game: K, schema: { safeParse: (v: unknown) => { success: boolean; data?: unknown; error?: { issues: { path: PropertyKey[]; message: string }[] } } }, items: unknown[]) => {
    const seen = new Set<string>();
    for (const it of items) {
      const id = (it as { id: string }).id;
      const r = schema.safeParse(it);
      if (!r.success) problems.push({ game, id, message: (r.error?.issues ?? []).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
      else {
        if (seen.has(id)) problems.push({ game, id, message: 'duplicate id' });
        seen.add(id);
        (out[game] as unknown[]).push(r.data);
      }
    }
  };
  run('wcf', WcfSchema, raw.wcf);
  run('fv', FvSchema, raw.fv);
  run('g300', G3Schema, raw.g300);
  run('wolf', WolfSchema, raw.wolf);
  run('wai', WaiSchema, raw.wai);
  for (const [game, items] of Object.entries(raw)) {
    for (const it of items as { id: string; ref: string; verse: string }[]) {
      if (!VERSES[it.ref]) problems.push({ game, id: it.id, message: `no verse text for ${it.ref}` });
    }
  }
  for (const it of out.g300) {
    if (new Set(it.options).size !== 4) problems.push({ game: 'g300', id: it.id, message: 'duplicate options' });
  }
  for (const it of out.wai) {
    if (new Set(it.options).size !== 6 || it.options[0] !== it.name) problems.push({ game: 'wai', id: it.id, message: 'options must be 6 unique with the name included' });
  }
  for (const it of out.wcf) {
    if (new Set(it.events.map((e) => e.text)).size !== 5) problems.push({ game: 'wcf', id: it.id, message: 'duplicate events' });
  }
  return { content: out, problems };
}

/** PRD section 10 launch targets, used for the coverage report. */
export const TARGETS = { wcf: 50, fv: 80, g300: 120, wolf: 100, wai: 50 } as const;

export function coverage(c: Content) {
  const tally = (items: { difficulty: string; audience: string[] }[]) => ({
    total: items.length,
    easy: items.filter((i) => i.difficulty === 'easy').length,
    medium: items.filter((i) => i.difficulty === 'medium').length,
    hard: items.filter((i) => i.difficulty === 'hard').length,
    kids: items.filter((i) => i.audience.includes('kids')).length,
    youth: items.filter((i) => i.audience.includes('youth')).length,
    adults: items.filter((i) => i.audience.includes('adults')).length,
  });
  return { wcf: tally(c.wcf), fv: tally(c.fv), g300: tally(c.g300), wolf: tally(c.wolf), wai: tally(c.wai) };
}

let cached: Content | null = null;
export function getContent(): Content {
  if (cached) return cached;
  const { content, problems } = validate();
  if (problems.length) throw new Error('Invalid content: ' + problems.map((p) => `${p.game}/${p.id}: ${p.message}`).join(' | '));
  const allowPending = process.env.ALLOW_PENDING === 'true';
  const keep = <T extends { review: string }>(a: T[]) => (allowPending ? a : a.filter((i) => i.review === 'approved'));
  cached = { wcf: keep(content.wcf), fv: keep(content.fv), g300: keep(content.g300), wolf: keep(content.wolf), wai: keep(content.wai) };
  return cached;
}

type Pickable = { id: string; difficulty: Difficulty; audience: Audience[] };
/** Pick one unused item per requested difficulty, preferring the audience, falling back gracefully. */
export function pickPlan<T extends Pickable>(items: T[], diffs: Difficulty[], audience: Audience, rng: Rng): T[] {
  const used = new Set<string>();
  const out: T[] = [];
  for (const d of diffs) {
    const tiers: ((i: T) => boolean)[] = [(i) => i.difficulty === d && i.audience.includes(audience), (i) => i.difficulty === d, (i) => i.audience.includes(audience), () => true];
    for (const f of tiers) {
      const pool = items.filter((i) => !used.has(i.id) && f(i));
      if (pool.length) {
        const it = rng.pick(pool);
        used.add(it.id);
        out.push(it);
        break;
      }
    }
  }
  return out;
}

/** Use the MC's difficulty choice, or the ladder when mixed. */
export const diffsFor = (config: GameConfig, ladder: Difficulty[]): Difficulty[] => (config.difficulty === 'mixed' ? ladder : ladder.map(() => config.difficulty as Difficulty));
