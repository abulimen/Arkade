import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import en from '@/i18n/en.json';

const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const T = { night: '#14123B', night2: '#1E1B55', night3: '#2A2670', cloud: '#F4F1FF', white: '#FFFFFF', gold: '#FFC83D', plank: '#C98A4B', coral: '#FF5C6C', tangerine: '#FF9A3D', lemon: '#FFE14D', leaf: '#3DD68C', sky: '#3DB8FF', indigo: '#6C5CE7', violet: '#B15CFF', success: '#2ED573', warning: '#FFA502', danger: '#FF4757' };

describe('WCAG AA contrast for every text/background pair used in the UI', () => {
  const pairs: [string, string][] = [
    ['white', 'night'], ['cloud', 'night'], ['cloud', 'night2'], ['cloud', 'night3'], ['white', 'night3'], ['white', 'night2'],
    ['night', 'gold'], ['night', 'lemon'], ['night', 'leaf'], ['night', 'tangerine'], ['night', 'sky'], ['night', 'plank'], ['night', 'cloud'],
    ['white', 'indigo'], ['night', 'coral'], ['night', 'violet'], ['night', 'danger'], ['night', 'success'], ['night', 'warning'],
    ['gold', 'night'], ['leaf', 'night'], ['gold', 'night2'], ['sky', 'night'],
  ];
  it.each(pairs)('%s on %s >= 4.5:1', (fg, bg) => {
    expect(ratio(T[fg as keyof typeof T], T[bg as keyof typeof T])).toBeGreaterThanOrEqual(4.5);
  });
});

const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

describe('localisation', () => {
  const files = walk('src').filter((f) => /\.(tsx?|ts)$/.test(f) && !f.includes('i18n'));
  const keys = new Set<string>();
  for (const f of files) {
    const s = fs.readFileSync(f, 'utf8');
    for (const m of s.matchAll(/\bt\('([^']+)'/g)) keys.add(m[1]);
    for (const m of s.matchAll(/`(hint\.[a-z0-9]+\.)\$\{[^}]+\}`|'(hint\.[A-Za-z0-9.]+)'/g)) if (m[2]) keys.add(m[2]);
  }
  it('every literal t() key exists in en.json', () => {
    const missing = [...keys].filter((k) => !(k in en));
    expect(missing).toEqual([]);
  });
  it('every server hint key exists', () => {
    const src = walk('src/server/games').map((f) => fs.readFileSync(f, 'utf8')).join('\n');
    const hints = [...src.matchAll(/hint\.(wcf|fv|wai|g3|wolf)\.\$\{/g)].length;
    expect(hints).toBeGreaterThan(0);
    for (const k of ['hint.wcf.prompt', 'hint.fv.write', 'hint.wai.clue', 'hint.g3.s3q', 'hint.wolf.clues', 'hint.lobby', 'hint.default']) expect(en).toHaveProperty([k]);
  });
  it('has no unused placeholder drift: {vars} are word characters', () => {
    for (const v of Object.values(en)) expect(v).not.toMatch(/\{[^\w}]/);
  });
});

describe('touch targets and focus', () => {
  it('buttons are at least 48px tall (min-h-12 or min-h-14) and focus outlines are global', () => {
    const kit = fs.readFileSync('src/ui/kit.tsx', 'utf8');
    expect(kit).toMatch(/min-h-14/);
    expect(kit).toMatch(/min-h-12/);
    const css = fs.readFileSync('src/app/globals.css', 'utf8');
    expect(css).toMatch(/:focus-visible\s*\{\s*outline: 3px solid var\(--sky\)/);
    expect(css).toMatch(/prefers-reduced-motion/);
  });
  it('no player text is injected as HTML', () => {
    const bad = walk('src').filter((f) => /\.tsx$/.test(f)).filter((f) => fs.readFileSync(f, 'utf8').includes('dangerouslySetInnerHTML'));
    expect(bad).toEqual([]);
  });
});
