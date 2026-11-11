/** Seeded mulberry32. State is a single int so it can be snapshotted and restored. */
export class Rng {
  state: number;
  constructor(seed: number) {
    this.state = seed | 0;
  }
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(n: number): number {
    return Math.floor(this.next() * n);
  }
  pick<T>(a: readonly T[]): T {
    return a[this.int(a.length)];
  }
  shuffle<T>(a: readonly T[]): T[] {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  }
  sample<T>(a: readonly T[], n: number): T[] {
    return this.shuffle(a).slice(0, n);
  }
}
