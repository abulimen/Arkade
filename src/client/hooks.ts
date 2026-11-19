'use client';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { serverNow } from './clock';
import {
  attachGestureAudioUnlock,
  getSensoryPrefs,
  haptic,
  playUi,
  setSensoryPrefs,
  subscribeSensoryPrefs,
  type SensoryPrefs,
} from './sound';

const SERVER_SENSORY: SensoryPrefs = { sound: true, haptics: true };

/** Remaining ms until endsAt on the synchronised server clock; re-renders ten times a second at most. */
export function useCountdown(endsAt: number | null, pausedMs: number | null = null) {
  const [tickState, setTickState] = useState<{ endsAt: number | null; ms: number; total: number }>(() => {
    const left = endsAt ? Math.max(0, endsAt - serverNow()) : 0;
    return { endsAt, ms: left, total: Math.max(1, left) };
  });

  useEffect(() => {
    if (pausedMs != null || endsAt == null) return;
    let raf = 0;
    let lastBucket = -1;
    let peak = Math.max(1, endsAt - serverNow());
    const tick = () => {
      const left = Math.max(0, endsAt - serverNow());
      if (left > peak) peak = left;
      const bucket = Math.ceil(left / 100);
      if (bucket !== lastBucket) {
        lastBucket = bucket;
        setTickState((prev) => ({
          endsAt,
          ms: left,
          total: prev.endsAt === endsAt ? Math.max(prev.total, peak) : peak,
        }));
      }
      if (left > 0) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [endsAt, pausedMs]);

  const ms =
    pausedMs != null
      ? pausedMs
      : endsAt == null
        ? 0
        : tickState.endsAt === endsAt
          ? tickState.ms
          : Math.max(0, endsAt - serverNow());
  const total =
    pausedMs != null
      ? Math.max(1, pausedMs)
      : endsAt == null
        ? 1
        : tickState.endsAt === endsAt
          ? tickState.total
          : Math.max(1, endsAt - serverNow());

  return { ms, secs: Math.ceil(ms / 1000), total };
}

export function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia('(prefers-reduced-motion: reduce)');
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  );
}

export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const get = () => navigator.wakeLock.request('screen').then((l) => { lock = l; }).catch(() => undefined);
    void get();
    const vis = () => { if (document.visibilityState === 'visible') void get(); };
    document.addEventListener('visibilitychange', vis);
    return () => { document.removeEventListener('visibilitychange', vis); void lock?.release(); };
  }, [active]);
}

export const vibrate = (pattern: number | number[] = 25) => {
  try {
    if (!getSensoryPrefs().haptics) return;
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
};

export function useSensory() {
  useEffect(() => {
    attachGestureAudioUnlock();
  }, []);

  const prefs = useSyncExternalStore(subscribeSensoryPrefs, getSensoryPrefs, () => SERVER_SENSORY);

  const toggleSound = () => {
    const next = !prefs.sound;
    setSensoryPrefs({ sound: next });
    if (next) playUi('ui-focus');
    haptic('tick');
  };

  const toggleHaptics = () => {
    const next = !prefs.haptics;
    setSensoryPrefs({ haptics: next });
    playUi('ui-focus');
    if (next) haptic('press');
  };

  return {
    soundOn: prefs.sound,
    hapticsOn: prefs.haptics,
    toggleSound,
    toggleHaptics,
  };
}

export function useMedia(query: string) {
  const subscribe = useCallback(
    (cb: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
