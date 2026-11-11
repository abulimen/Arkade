'use client';
// The 11 sound effects are synthesised with the Web Audio API, so there are no audio files to download (DESIGN 7.2).
export type Sfx = 'pop' | 'beep' | 'go' | 'tick' | 'chime' | 'buzz' | 'drum' | 'fanfare' | 'shofar' | 'howl' | 'whoosh';

let ctx: AudioContext | null = null;
let volume = 0.7;
let on = true;

export const soundReady = () => !!ctx && ctx.state === 'running';
export function enableSound(): boolean {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx ??= new AC();
    void ctx.resume();
    return true;
  } catch { return false; }
}
export function configureSound(o: { on: boolean; volume: number }) { on = o.on; volume = o.volume; }

function tone(freq: number, at: number, dur: number, type: OscillatorType = 'sine', gain = 0.3, to?: number) {
  if (!ctx) return;
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain * volume), t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export function play(name: Sfx) {
  if (!ctx || !on || ctx.state !== 'running') return;
  switch (name) {
    case 'pop': tone(520, 0, 0.09, 'sine', 0.3, 900); break;
    case 'beep': tone(660, 0, 0.12, 'square', 0.12); break;
    case 'go': tone(990, 0, 0.3, 'square', 0.14); break;
    case 'tick': tone(1200, 0, 0.04, 'triangle', 0.12); break;
    case 'chime': [784, 988, 1319].forEach((f, i) => tone(f, i * 0.09, 0.4, 'sine', 0.22)); break;
    case 'buzz': tone(140, 0, 0.3, 'triangle', 0.14, 100); break;
    case 'drum': for (let i = 0; i < 6; i++) tone(110, i * 0.1, 0.08, 'triangle', 0.25); tone(70, 0.7, 0.35, 'sine', 0.4, 45); break;
    case 'fanfare': [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.14, 0.28, 'square', 0.12)); tone(1047, 0.6, 0.6, 'square', 0.12); break;
    case 'shofar': tone(180, 0, 1.0, 'sawtooth', 0.16, 260); tone(190, 0.05, 1.0, 'square', 0.06, 270); break;
    case 'howl': tone(300, 0, 0.9, 'sine', 0.2, 620); tone(620, 0.9, 0.5, 'sine', 0.16, 380); break;
    case 'whoosh': tone(900, 0, 0.6, 'sawtooth', 0.05, 120); break;
  }
}
