// Client side of time:ping / time:pong. offset = serverNow - (clientNow + rtt / 2), median of the last 5 samples.
let offset = 0;
const samples: number[] = [];

export const serverNow = () => Date.now() + offset;
export const clockOffset = () => offset;

export async function syncClock(): Promise<number | null> {
  try {
    const t0 = Date.now();
    const r = await fetch('/api/time', { cache: 'no-store' });
    const { serverNow: s } = (await r.json()) as { serverNow: number };
    const rtt = Date.now() - t0;
    samples.push(s - (t0 + rtt / 2));
    if (samples.length > 5) samples.shift();
    offset = [...samples].sort((a, b) => a - b)[Math.floor(samples.length / 2)];
    return rtt;
  } catch {
    return null;
  }
}

export const resetClock = () => { samples.length = 0; offset = 0; };
export function medianOffset(xs: number[]) { return [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]; }
