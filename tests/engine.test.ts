import { describe, expect, it } from 'vitest';
import { Rng } from '@/server/engine/rng';
import { keepCount, rankIds, scoreOrder, speedBonus, whoAmIPoints, wolfCount } from '@/server/engine/scoring';
import { cleanText, editDistance, guessMatches, isBlocked, isReserved, norm, tooClose } from '@/server/engine/text';
import { coverage, expand, getContent, validate } from '@/server/content';
import { RateLimiter } from '@/server/rooms/manager';

describe('scoring (PRD numbers)', () => {
  it('speedBonus is linear from full to none', () => {
    expect(speedBonus(200, 0, 1000, 0)).toBe(200);
    expect(speedBonus(200, 0, 1000, 500)).toBe(100);
    expect(speedBonus(200, 0, 1000, 1000)).toBe(0);
    expect(speedBonus(200, 0, 1000, 5000)).toBe(0);
  });
  it('scoreOrder: 160 per card, bonus only for perfect', () => {
    const truth = ['a', 'b', 'c', 'd', 'e'];
    expect(scoreOrder(truth, truth, 200, [0, 40000, 0])).toBe(1000);
    expect(scoreOrder(truth, truth, 200, [0, 40000, 40000])).toBe(800);
    expect(scoreOrder(['b', 'a', 'c', 'd', 'e'], truth, 200, [0, 40000, 0])).toBe(480);
    expect(scoreOrder(['e', 'd', 'c', 'b', 'a'], truth, 200, [0, 40000, 0])).toBe(160);
  });
  it('who am I points and wolf counts', () => {
    expect([0, 1, 2, 3, 4].map(whoAmIPoints)).toEqual([500, 400, 300, 200, 100]);
    expect([4, 7, 8, 9, 10].map(wolfCount)).toEqual([1, 1, 2, 2, 3]);
  });
  it('keepCount and rankIds', () => {
    expect(keepCount(150, 0.67)).toBe(101);
    expect(keepCount(100, 0.34)).toBe(34);
    expect(keepCount(3, 0.1)).toBe(2);
    expect(rankIds(['a', 'b', 'c'], { a: 5, b: 5, c: 9 }, { a: 10, b: 3 })).toEqual(['c', 'b', 'a']);
  });
});

describe('text', () => {
  it('normalises and measures distance', () => {
    expect(norm('  Noah\'s   ARK! ')).toBe('noahs ark');
    expect(editDistance('kitten', 'sitting')).toBe(3);
  });
  it('wolf guesses: exact, alias, distance 1 over 5 letters only', () => {
    expect(guessMatches('noahs ark', "Noah's Ark", ['ark'])).toBe(true);
    expect(guessMatches('ARK', "Noah's Ark", ['ark', 'the ark'])).toBe(true);
    expect(guessMatches('Goliath', 'Goliath')).toBe(true);
    expect(guessMatches('Goliat', 'Goliath')).toBe(true);
    expect(guessMatches('Davis', 'David')).toBe(false); // 5 letters: no leniency
    expect(guessMatches('', 'David')).toBe(false);
  });
  it('filters words, reserved names and look-alike spellings', () => {
    expect(isBlocked('what the f u c k')).toBe(true); // spaced-out evasion is squashed
    expect(isBlocked('fuck')).toBe(true);
    expect(isBlocked('sh1t')).toBe(true);
    expect(isBlocked('Balaam\'s ass')).toBe(false);
    expect(isBlocked('Scunthorpe class')).toBe(false);
    expect(isReserved('Admin')).toBe(true);
    expect(tooClose('Windows', 'window')).toBe(true);
    expect(tooClose('tent', 'window')).toBe(false);
    expect(cleanText('  a\u0000  b\u200b ', 10)).toBe('a b');
  });
});

describe('rng', () => {
  it('is deterministic and snapshot-able', () => {
    const a = new Rng(5), b = new Rng(5);
    expect([a.next(), a.next()]).toEqual([b.next(), b.next()]);
    const c = new Rng(a.state);
    expect(c.next()).toBe(a.next());
    expect(new Rng(1).shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('content (build-time validation)', () => {
  it('every item passes its Zod schema with reference and verse text', () => {
    const { problems } = validate();
    expect(problems).toEqual([]);
  });
  it('rejects items without a reference or verse', () => {
    const raw = expand();
    raw.fv[0] = { ...raw.fv[0], verse: '' };
    raw.wcf[0] = { ...raw.wcf[0], ref: '' };
    expect(validate(raw).problems.length).toBeGreaterThanOrEqual(2);
  });
  it('has enough items for every difficulty ladder without repeats', () => {
    const c = getContent();
    const cov = coverage(c);
    expect(cov.wcf.easy).toBeGreaterThanOrEqual(2);
    expect(cov.wcf.medium).toBeGreaterThanOrEqual(3);
    expect(cov.wcf.hard).toBeGreaterThanOrEqual(3);
    expect(c.g300.length).toBeGreaterThanOrEqual(27);
    expect(c.fv.length).toBeGreaterThanOrEqual(6);
    expect(c.wai.length).toBeGreaterThanOrEqual(8);
    expect(c.wolf.length).toBeGreaterThanOrEqual(3);
  });
  it('gideon answers are spread across positions', () => {
    const pos = new Set(getContent().g300.map((q) => q.correct));
    expect(pos.size).toBe(4);
  });
});

describe('rate limiter', () => {
  it('allows a burst of 20 then throttles to 5/s', () => {
    const rl = new RateLimiter(20, 5);
    let allowed = 0;
    for (let i = 0; i < 40; i++) if (rl.allow('k', 1000)) allowed++;
    expect(allowed).toBe(20);
    expect(rl.allow('k', 1200)).toBe(true);
    expect(rl.allow('k', 1200)).toBe(false);
  });
});
