// Normalisation, edit distance and the word filter.
export function norm(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

const strip = (s: string) => norm(s).replace(/^(the|a|an) /, '');

/** Wolf guess check: exact, alias, or edit distance 1 for words over 5 letters. */
export function guessMatches(guess: string, target: string, aliases: readonly string[] = []): boolean {
  const g = strip(guess);
  if (!g) return false;
  const t = strip(target);
  if (g === t) return true;
  if (aliases.some((a) => strip(a) === g)) return true;
  return t.length > 5 && editDistance(g, t) <= 1;
}

/** True if a player-typed answer is too close to the truth (never explained to the player). */
export function tooClose(text: string, truth: string): boolean {
  const a = norm(text);
  const b = norm(truth);
  if (!a) return false;
  return a === b || (b.length > 4 && editDistance(a, b) <= 1);
}

const STEMS = ['fuck', 'shit', 'bitch', 'cunt', 'nigg', 'whore', 'porn', 'slut', 'asshole', 'bastard', 'dickhead', 'pussy', 'cock', 'wank', 'rape', 'nazi'];
const WORDS = new Set(['dick', 'piss', 'sex', 'fag', 'tits', 'boob', 'boobs', 'crap', 'damn', 'penis', 'vagina', 'hoe', 'kkk', 'retard']);
const RESERVED = new Set(['admin', 'mc', 'host', 'arkade', 'system', 'moderator', 'server', 'staff', 'null', 'undefined']);
const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's', '!': 'i' };

export function isBlocked(text: string): boolean {
  const lower = text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const deleet = lower.replace(/[0134578@$!]/g, (c) => LEET[c] ?? c);
  // join runs of single letters ("f u c k") but never squash whole sentences (the Scunthorpe problem)
  const words: string[] = [];
  let run = '';
  for (const w of deleet.split(/[^a-z]+/).filter(Boolean)) {
    if (w.length === 1) run += w;
    else { if (run) words.push(run); run = ''; words.push(w); }
  }
  if (run) words.push(run);
  return words.some((w) => WORDS.has(w) || STEMS.some((s) => w === s || w.startsWith(s) || w.endsWith(s)));
}
export const isReserved = (nick: string) => RESERVED.has(norm(nick));

/** Trim, normalise, strip control chars, collapse spaces, cap length. */
export function cleanText(s: string, max: number): string {
  return s
    .normalize('NFKC')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}
