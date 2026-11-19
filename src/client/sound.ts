'use client';
// Dual-layer Web Audio synthesizer: Sony PS5 / Switch crystal UI micro-sounds + 11 broadcast show cues.
export type Sfx = 'pop' | 'beep' | 'go' | 'tick' | 'chime' | 'buzz' | 'drum' | 'fanfare' | 'shofar' | 'howl' | 'whoosh' | 'hit' | 'heartbeat' | 'sparkle' | 'thud';
export type UiSfx = 'ui-focus' | 'ui-snap' | 'ui-press' | 'ui-back' | 'ui-sheet' | 'ui-lock' | 'ui-error';
export type HapticKind = 'tick' | 'snap' | 'press' | 'lock' | 'success' | 'error' | 'turn';
export type WolfAudioClip = 'wolf-intro' | 'wolf-vote' | 'wolf-win-crew' | 'wolf-win-impo';

const WOLF_AUDIO_FILES: Record<WolfAudioClip, string> = {
  'wolf-intro': '/audio/among-us-role-reveal-sound-effect.mp3',
  'wolf-vote': '/audio/among-us-vote-locking_01.mp3',
  'wolf-win-crew': '/audio/victory-crew_4x1xHQC.mp3',
  'wolf-win-impo': '/audio/victory-impo.mp3',
};

let activeLongAudio: HTMLAudioElement | null = null;

/** Play an MP3 audio cue for Spot the Wolf (projector broadcast or local UI tap). */
export function playWolfAudio(clip: WolfAudioClip, opts?: { forceUi?: boolean }) {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
  loadPrefs();
  if (opts?.forceUi) {
    if (!prefs.sound) return;
  } else {
    if (!broadcastOn || volume <= 0) return;
  }
  try {
    const src = WOLF_AUDIO_FILES[clip];
    if (clip !== 'wolf-vote' && activeLongAudio) {
      activeLongAudio.pause();
      activeLongAudio.currentTime = 0;
      activeLongAudio = null;
    }
    const el = new Audio(src);
    el.volume = Math.max(0, Math.min(1, opts?.forceUi ? 0.85 : volume));
    if (clip !== 'wolf-vote') activeLongAudio = el;
    void el.play().catch(() => undefined);
  } catch {
    /* ignore playback restrictions */
  }
}

export interface SensoryPrefs {
  sound: boolean;
  haptics: boolean;
}

const PREFS_KEY = 'arkade:sensory';
let ctx: AudioContext | null = null;
let volume = 0.72;
let broadcastOn = true;
let prefs: SensoryPrefs = { sound: true, haptics: true };
let prefsLoaded = false;
let gestureHooked = false;
const listeners = new Set<() => void>();

function loadPrefs() {
  if (prefsLoaded || typeof window === 'undefined') return;
  prefsLoaded = true;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SensoryPrefs>;
      prefs = {
        sound: parsed.sound !== false,
        haptics: parsed.haptics !== false,
      };
    }
  } catch {
    /* ignore storage failures */
  }
}

function ensureAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => undefined);
    }
    return ctx;
  } catch {
    return null;
  }
}

export function attachGestureAudioUnlock() {
  if (gestureHooked || typeof window === 'undefined') return;
  gestureHooked = true;
  loadPrefs();
  const unlock = () => {
    if (!prefs.sound) return;
    ensureAudioContext();
  };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });
}

export function getSensoryPrefs(): SensoryPrefs {
  loadPrefs();
  return prefs;
}

export function setSensoryPrefs(next: Partial<SensoryPrefs>) {
  loadPrefs();
  prefs = { ...prefs, ...next };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }
  if (prefs.sound) ensureAudioContext();
  listeners.forEach((fn) => fn());
}

export function subscribeSensoryPrefs(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const soundReady = () => !!ctx && ctx.state === 'running';

export function enableSound(): boolean {
  const c = ensureAudioContext();
  return !!c;
}

export function configureSound(o: { on: boolean; volume: number }) {
  broadcastOn = o.on;
  volume = o.volume;
}

interface ToneOpts {
  freq: number;
  to?: number;
  at?: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  filterFreq?: number;
  filterType?: BiquadFilterType;
  pan?: number;
  volScale?: number;
}

function filteredTone({
  freq,
  to,
  at = 0,
  dur,
  type = 'sine',
  gain = 0.22,
  filterFreq = 4200,
  filterType = 'lowpass',
  pan = 0,
  volScale = 1,
}: ToneOpts) {
  if (!ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const amp = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), now + dur);

  filter.type = filterType;
  filter.frequency.setValueAtTime(filterFreq, now);
  filter.Q.setValueAtTime(1.1, now);

  const peak = Math.max(0.0002, gain * volScale);
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(peak, now + Math.min(0.014, dur * 0.25));
  amp.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  if (typeof ctx.createStereoPanner === 'function' && pan !== 0) {
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(Math.max(-0.85, Math.min(0.85, pan)), now);
    osc.connect(filter).connect(amp).connect(panner).connect(ctx.destination);
  } else {
    osc.connect(filter).connect(amp).connect(ctx.destination);
  }

  osc.start(now);
  osc.stop(now + dur + 0.04);
}

let noiseBuf: AudioBuffer | null = null;

interface NoiseOpts {
  at?: number;
  dur: number;
  gain: number;
  filterFreq: number;
  filterType?: BiquadFilterType;
  q?: number;
  volScale?: number;
  dest?: AudioNode;
}

/** Filtered white-noise burst: snare taps, cymbal crashes, stage air. */
function noiseHit({ at = 0, dur, gain, filterFreq, filterType = 'bandpass', q = 0.8, volScale = 1, dest }: NoiseOpts) {
  if (!ctx || ctx.state !== 'running') return;
  if (!noiseBuf || noiseBuf.sampleRate !== ctx.sampleRate) {
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  const now = ctx.currentTime + at;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = filterType;
  f.frequency.setValueAtTime(filterFreq, now);
  f.Q.setValueAtTime(q, now);
  const amp = ctx.createGain();
  const peak = Math.max(0.0002, gain * volScale);
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(peak, now + 0.004);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(f).connect(amp).connect(dest ?? ctx.destination);
  src.start(now, Math.random() * 1.5);
  src.stop(now + dur + 0.05);
}

const canBroadcast = () => !!ctx && broadcastOn && ctx.state === 'running';

/**
 * Game-show snare drumroll that accelerates and swells for `seconds`.
 * Returns a stop function that cuts it dead (for the dramatic silence before a reveal).
 */
export function playDrumroll(seconds: number): () => void {
  if (!canBroadcast() || !ctx) return () => undefined;
  const c = ctx;
  const bus = c.createGain();
  bus.gain.setValueAtTime(1, c.currentTime);
  bus.connect(c.destination);
  let t = 0;
  while (t < seconds) {
    const p = t / seconds;
    const gap = 0.072 - 0.032 * p; // speeds up
    const g = 0.05 + 0.2 * p * p; // crescendo
    noiseHit({ at: t, dur: 0.06, gain: g, filterFreq: 2600 + 900 * p, filterType: 'bandpass', q: 0.9, volScale: volume, dest: bus });
    if (Math.round(t / gap) % 4 === 0) {
      filteredTone({ freq: 150, to: 95, at: t, dur: 0.07, type: 'triangle', gain: 0.06 + 0.12 * p, filterFreq: 600, volScale: volume });
    }
    t += gap + (Math.random() - 0.5) * 0.008;
  }
  return () => {
    try {
      bus.gain.cancelScheduledValues(c.currentTime);
      bus.gain.setValueAtTime(bus.gain.value, c.currentTime);
      bus.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.04);
      setTimeout(() => bus.disconnect(), 200);
    } catch {
      /* already gone */
    }
  };
}

/** Slow rising tension sweep under the final drumroll. */
export function playRiser(seconds: number): () => void {
  if (!canBroadcast() || !ctx) return () => undefined;
  const c = ctx;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const osc2 = c.createOscillator();
  const f = c.createBiquadFilter();
  const amp = c.createGain();
  osc.type = 'sawtooth';
  osc2.type = 'sawtooth';
  osc.frequency.setValueAtTime(110, now);
  osc.frequency.exponentialRampToValueAtTime(440, now + seconds);
  osc2.frequency.setValueAtTime(111.5, now);
  osc2.frequency.exponentialRampToValueAtTime(446, now + seconds);
  f.type = 'lowpass';
  f.frequency.setValueAtTime(300, now);
  f.frequency.exponentialRampToValueAtTime(3800, now + seconds);
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.09 * volume), now + seconds);
  osc.connect(f);
  osc2.connect(f);
  f.connect(amp).connect(c.destination);
  osc.start(now);
  osc2.start(now);
  osc.stop(now + seconds + 0.1);
  osc2.stop(now + seconds + 0.1);
  return () => {
    try {
      amp.gain.cancelScheduledValues(c.currentTime);
      amp.gain.setValueAtTime(amp.gain.value, c.currentTime);
      amp.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.04);
      osc.stop(c.currentTime + 0.06);
      osc2.stop(c.currentTime + 0.06);
    } catch {
      /* already stopped */
    }
  };
}

/** Tactile PS5 / Switch crystal UI micro-sounds. */
export function playUi(name: UiSfx, pan = 0) {
  loadPrefs();
  if (!prefs.sound) return;
  const c = ensureAudioContext();
  if (!c || c.state !== 'running') return;
  const volScale = 0.48;

  switch (name) {
    case 'ui-focus':
      filteredTone({ freq: 880, to: 1120, dur: 0.045, type: 'sine', gain: 0.14, filterFreq: 2600, pan, volScale });
      break;
    case 'ui-snap':
      filteredTone({ freq: 440, to: 660, dur: 0.065, type: 'triangle', gain: 0.18, filterFreq: 2200, pan, volScale });
      filteredTone({ freq: 1320, to: 1760, at: 0.015, dur: 0.055, type: 'sine', gain: 0.09, filterFreq: 3200, pan, volScale });
      break;
    case 'ui-press':
      filteredTone({ freq: 240, to: 130, dur: 0.055, type: 'triangle', gain: 0.24, filterFreq: 1100, pan, volScale });
      filteredTone({ freq: 720, to: 960, at: 0.008, dur: 0.075, type: 'sine', gain: 0.14, filterFreq: 3000, pan, volScale });
      break;
    case 'ui-back':
      filteredTone({ freq: 580, to: 360, dur: 0.08, type: 'sine', gain: 0.16, filterFreq: 1800, pan, volScale });
      break;
    case 'ui-sheet':
      filteredTone({ freq: 320, to: 640, dur: 0.14, type: 'sine', gain: 0.16, filterFreq: 2000, pan, volScale });
      filteredTone({ freq: 640, to: 960, at: 0.04, dur: 0.16, type: 'sine', gain: 0.12, filterFreq: 3200, pan, volScale });
      break;
    case 'ui-lock':
      filteredTone({ freq: 587.33, dur: 0.09, type: 'triangle', gain: 0.18, filterFreq: 2400, pan, volScale });
      filteredTone({ freq: 880, at: 0.045, dur: 0.16, type: 'sine', gain: 0.22, filterFreq: 3400, pan, volScale });
      break;
    case 'ui-error':
      filteredTone({ freq: 185, to: 125, dur: 0.16, type: 'sawtooth', gain: 0.16, filterFreq: 680, pan, volScale });
      filteredTone({ freq: 138, to: 98, at: 0.06, dur: 0.18, type: 'triangle', gain: 0.18, filterFreq: 520, pan, volScale });
      break;
  }
}

const HAPTIC_PATTERNS: Record<HapticKind, number | number[]> = {
  tick: 10,
  snap: 16,
  press: 22,
  lock: [14, 24, 34],
  success: [18, 30, 18, 30, 48],
  error: [38, 42, 38],
  turn: [28, 36, 56],
};

export function haptic(kind: HapticKind) {
  loadPrefs();
  if (!prefs.haptics || typeof navigator === 'undefined') return;
  try {
    navigator.vibrate?.(HAPTIC_PATTERNS[kind]);
  } catch {
    /* unsupported */
  }
}

/** Broadcast stage cues played on the Projector screen. */
export function play(name: Sfx) {
  if (!ctx || !broadcastOn || ctx.state !== 'running') return;
  const volScale = volume;

  switch (name) {
    case 'pop':
      filteredTone({ freq: 520, to: 940, dur: 0.09, type: 'sine', gain: 0.28, filterFreq: 3400, volScale });
      break;
    case 'beep':
      filteredTone({ freq: 660, dur: 0.12, type: 'triangle', gain: 0.18, filterFreq: 2400, volScale });
      break;
    case 'go':
      filteredTone({ freq: 880, to: 1046.5, dur: 0.28, type: 'triangle', gain: 0.2, filterFreq: 3600, volScale });
      filteredTone({ freq: 1318.5, at: 0.04, dur: 0.26, type: 'sine', gain: 0.14, filterFreq: 4200, volScale });
      break;
    case 'tick':
      filteredTone({ freq: 1180, dur: 0.04, type: 'triangle', gain: 0.14, filterFreq: 2800, volScale });
      break;
    case 'chime':
      [783.99, 987.77, 1318.51].forEach((f, i) =>
        filteredTone({ freq: f, at: i * 0.085, dur: 0.42, type: 'sine', gain: 0.22, filterFreq: 4400, volScale })
      );
      break;
    case 'buzz':
      filteredTone({ freq: 150, to: 98, dur: 0.3, type: 'sawtooth', gain: 0.16, filterFreq: 680, volScale });
      break;
    case 'drum':
      for (let i = 0; i < 6; i++) {
        filteredTone({ freq: 112, to: 82, at: i * 0.095, dur: 0.08, type: 'triangle', gain: 0.24, filterFreq: 450, volScale });
      }
      filteredTone({ freq: 78, to: 42, at: 0.68, dur: 0.38, type: 'sine', gain: 0.36, filterFreq: 320, volScale });
      break;
    case 'fanfare':
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        filteredTone({ freq: f, at: i * 0.13, dur: 0.3, type: 'triangle', gain: 0.18, filterFreq: 3600, volScale })
      );
      filteredTone({ freq: 1046.5, at: 0.56, dur: 0.65, type: 'sine', gain: 0.24, filterFreq: 4200, volScale });
      filteredTone({ freq: 1567.98, at: 0.58, dur: 0.6, type: 'sine', gain: 0.12, filterFreq: 4800, volScale });
      break;
    case 'shofar':
      filteredTone({ freq: 180, to: 265, dur: 1.0, type: 'sawtooth', gain: 0.18, filterFreq: 1400, volScale });
      filteredTone({ freq: 190, to: 274, at: 0.04, dur: 1.0, type: 'triangle', gain: 0.12, filterFreq: 1600, volScale });
      break;
    case 'howl':
      filteredTone({ freq: 300, to: 620, dur: 0.88, type: 'sine', gain: 0.22, filterFreq: 2000, volScale });
      filteredTone({ freq: 620, to: 360, at: 0.88, dur: 0.52, type: 'sine', gain: 0.18, filterFreq: 1800, volScale });
      break;
    case 'whoosh':
      filteredTone({ freq: 880, to: 115, dur: 0.58, type: 'sawtooth', gain: 0.08, filterFreq: 1200, volScale });
      break;
    case 'hit':
      // Cymbal crash + deep stage boom
      noiseHit({ dur: 2.4, gain: 0.32, filterFreq: 7200, filterType: 'highpass', q: 0.5, volScale });
      noiseHit({ dur: 0.9, gain: 0.2, filterFreq: 3800, filterType: 'bandpass', q: 0.6, volScale });
      filteredTone({ freq: 96, to: 38, dur: 1.1, type: 'sine', gain: 0.5, filterFreq: 400, volScale });
      filteredTone({ freq: 196, to: 98, dur: 0.35, type: 'triangle', gain: 0.22, filterFreq: 900, volScale });
      break;
    case 'heartbeat':
      filteredTone({ freq: 62, to: 44, dur: 0.16, type: 'sine', gain: 0.5, filterFreq: 220, volScale });
      filteredTone({ freq: 58, to: 40, at: 0.22, dur: 0.2, type: 'sine', gain: 0.38, filterFreq: 200, volScale });
      break;
    case 'sparkle':
      [1318.51, 1567.98, 2093, 2637].forEach((f, i) =>
        filteredTone({ freq: f, at: i * 0.06, dur: 0.5, type: 'sine', gain: 0.12, filterFreq: 6000, volScale })
      );
      break;
    case 'thud':
      filteredTone({ freq: 120, to: 55, dur: 0.32, type: 'sine', gain: 0.42, filterFreq: 500, volScale });
      noiseHit({ dur: 0.12, gain: 0.1, filterFreq: 1400, filterType: 'lowpass', volScale });
      break;
  }
}
