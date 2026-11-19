import type { Audience, CustomQuestionMode, Difficulty, GameConfig, TestamentFilter } from '@/shared/types';
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

const OT_BOOKS = new Set([
  'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy',
  'joshua', 'judges', 'ruth', '1 samuel', '2 samuel', '1 kings', '2 kings',
  '1 chronicles', '2 chronicles', 'ezra', 'nehemiah', 'esther',
  'job', 'psalm', 'psalms', 'proverbs', 'ecclesiastes', 'song of solomon', 'song of songs',
  'isaiah', 'jeremiah', 'lamentations', 'ezekiel', 'daniel',
  'hosea', 'joel', 'amos', 'obadiah', 'jonah', 'micah', 'nahum', 'habakkuk', 'zephaniah', 'haggai', 'zechariah', 'malachi',
]);

const NT_BOOKS = new Set([
  'matthew', 'mark', 'luke', 'john', 'acts',
  'romans', '1 corinthians', '2 corinthians', 'galatians', 'ephesians', 'philippians', 'colossians',
  '1 thessalonians', '2 thessalonians', '1 timothy', '2 timothy', 'titus', 'philemon',
  'hebrews', 'james', '1 peter', '2 peter', '1 john', '2 john', '3 john', 'jude', 'revelation',
]);

/** Derive Old/New Testament from a Scripture reference like "1 Samuel 17:49" or "Psalm 23:1". */
export function testamentFromRef(ref: string): 'OT' | 'NT' | 'both' {
  const book = ref.replace(/\s+\d+.*$/, '').trim().toLowerCase();
  if (OT_BOOKS.has(book)) return 'OT';
  if (NT_BOOKS.has(book)) return 'NT';
  return 'both';
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
      return { ...base(`g3-${i + 1}`, d, d === 'e' ? 'kya' : 'ya', testamentFromRef(ref), ref), question, options, correct: pos };
    }),
    wolf: WOLF.map(([word, category, aliases, lookalike, ref, d], i) => ({
      ...base(`wolf-${i + 1}`, d, d === 'e' ? 'kya' : 'ya', testamentFromRef(ref), ref), word, category, aliases, lookalike,
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

/** Expanded content library targets, used for the coverage report. */
export const TARGETS = { wcf: 600, fv: 1000, g300: 2000, wolf: 600, wai: 500 } as const;

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

export type Pickable = {
  id: string;
  difficulty: Difficulty;
  audience: Audience[];
  testament?: 'OT' | 'NT' | 'both';
  category?: string;
};

export interface PickPlanOpts<T extends Pickable> {
  testament?: TestamentFilter;
  categories?: string[];
  custom?: T[];
  customMode?: CustomQuestionMode;
}

/** Scale a base difficulty ladder proportionally to a custom round count while preserving start/end progression. */
export function scaleLadder(base: Difficulty[], rounds: number | null): Difficulty[] {
  if (rounds == null || rounds <= 0) return base;
  if (base.length === 0) return [];
  if (rounds === base.length) return base.slice();
  if (rounds === 1) return [base[0]];
  return Array.from({ length: rounds }, (_, i) => base[Math.round((i * (base.length - 1)) / (rounds - 1))]);
}

/** Pick one item per requested difficulty, applying testament, category, and custom question pack rules. */
export function pickPlan<T extends Pickable>(
  items: T[],
  diffs: Difficulty[],
  audience: Audience,
  rng: Rng,
  opts?: PickPlanOpts<T>,
): T[] {
  const testament = opts?.testament ?? 'all';
  const cats = opts?.categories?.length ? new Set(opts.categories.map((c) => c.toLowerCase())) : null;
  const matchesTestament = (i: T) => {
    if (testament === 'all') return true;
    const t = i.testament ?? 'both';
    return t === testament || t === 'both';
  };
  const matchesCategory = (i: T) => !cats || (typeof i.category === 'string' && cats.has(i.category.toLowerCase()));
  const matchesAll = (i: T) => matchesTestament(i) && matchesCategory(i);

  const pickOne = (pool: T[], d: Difficulty, used: Set<string>, avoidId?: string): T | undefined => {
    if (!pool.length) return undefined;
    const tiers: ((i: T) => boolean)[] = [
      (i) => i.difficulty === d && i.audience.includes(audience),
      (i) => i.difficulty === d,
      (i) => i.audience.includes(audience),
      () => true,
    ];
    for (const f of tiers) {
      const candidates = pool.filter((i) => !used.has(i.id) && f(i));
      if (candidates.length) {
        const it = rng.pick(candidates);
        used.add(it.id);
        return it;
      }
    }
    // Pool exhausted; cycle cleanly while avoiding immediate back-to-back repeats when possible.
    for (const i of pool) used.delete(i.id);
    const nonRepeat = avoidId && pool.length > 1 ? pool.filter((i) => i.id !== avoidId) : pool;
    for (const f of tiers) {
      const candidates = nonRepeat.filter(f);
      if (candidates.length) {
        const it = rng.pick(candidates);
        used.add(it.id);
        return it;
      }
    }
    const it = rng.pick(nonRepeat);
    used.add(it.id);
    return it;
  };

  const custom = opts?.custom?.length ? opts.custom : undefined;
  const customMode = opts?.customMode ?? 'mix';

  if (custom && customMode === 'only') {
    const filteredCustom = custom.filter(matchesAll);
    const pool = filteredCustom.length
      ? filteredCustom
      : custom.filter(matchesTestament).length
        ? custom.filter(matchesTestament)
        : custom.filter(matchesCategory).length
          ? custom.filter(matchesCategory)
          : custom;
    const used = new Set<string>();
    const out: T[] = [];
    for (const d of diffs) {
      const it = pickOne(pool, d, used, out[out.length - 1]?.id);
      if (it) out.push(it);
    }
    return out;
  }

  const filteredBuiltin = items.filter(matchesAll);
  const builtinPool = filteredBuiltin.length
    ? filteredBuiltin
    : items.filter(matchesTestament).length
      ? items.filter(matchesTestament)
      : items.filter(matchesCategory).length
        ? items.filter(matchesCategory)
        : items;

  if (!custom || customMode !== 'mix') {
    const used = new Set<string>();
    const out: T[] = [];
    for (const d of diffs) {
      const it = pickOne(builtinPool, d, used, out[out.length - 1]?.id);
      if (it) out.push(it);
    }
    return out;
  }

  const filteredCustom = custom.filter(matchesAll);
  const out: (T | undefined)[] = Array(diffs.length).fill(undefined);
  const used = new Set<string>();

  if (filteredCustom.length) {
    for (let idx = 0; idx < diffs.length; idx++) {
      const d = diffs[idx];
      const matchBoth = filteredCustom.filter((i) => !used.has(i.id) && i.difficulty === d && i.audience.includes(audience));
      const matchDiff = matchBoth.length ? matchBoth : filteredCustom.filter((i) => !used.has(i.id) && i.difficulty === d);
      if (matchDiff.length) {
        const it = rng.pick(matchDiff);
        used.add(it.id);
        out[idx] = it;
      }
    }
    for (let idx = 0; idx < diffs.length; idx++) {
      if (out[idx]) continue;
      const matchAud = filteredCustom.filter((i) => !used.has(i.id) && i.audience.includes(audience));
      const remaining = matchAud.length ? matchAud : filteredCustom.filter((i) => !used.has(i.id));
      if (!remaining.length) break;
      const it = rng.pick(remaining);
      used.add(it.id);
      out[idx] = it;
    }
  }

  for (let idx = 0; idx < diffs.length; idx++) {
    if (out[idx]) continue;
    const prevId = idx > 0 ? out[idx - 1]?.id : undefined;
    const it = pickOne(builtinPool, diffs[idx], used, prevId);
    if (it) out[idx] = it;
  }

  return out.filter((x): x is T => x !== undefined);
}

/** Use the MC's difficulty choice, or the ladder when mixed. */
export const diffsFor = (config: GameConfig, ladder: Difficulty[]): Difficulty[] => (config.difficulty === 'mixed' ? ladder : ladder.map(() => config.difficulty as Difficulty));
