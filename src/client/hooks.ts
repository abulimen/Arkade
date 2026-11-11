'use client';
import { useEffect, useRef, useState } from 'react';
import { serverNow } from './clock';

/** Remaining ms until endsAt on the synchronised server clock; re-renders ten times a second at most. */
export function useCountdown(endsAt: number | null, pausedMs: number | null = null) {
  const [ms, setMs] = useState(() => (pausedMs != null ? pausedMs : endsAt ? Math.max(0, endsAt - serverNow()) : 0));
  const total = useRef(ms);
  const lastEnds = useRef<number | null | undefined>(undefined);
  useEffect(() => {
    if (pausedMs != null) { setMs(pausedMs); return; }
    if (endsAt == null) { setMs(0); return; }
    if (lastEnds.current !== endsAt) {
      const first = lastEnds.current === undefined || endsAt < (lastEnds.current ?? 0);
      lastEnds.current = endsAt;
      if (first) total.current = Math.max(1, endsAt - serverNow());
      else total.current = Math.max(total.current, endsAt - serverNow());
    }
    let raf = 0;
    let last = -1;
    const tick = () => {
      const left = Math.max(0, endsAt - serverNow());
      const bucket = Math.ceil(left / 100);
      if (bucket !== last) { last = bucket; setMs(left); }
      if (left > 0) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [endsAt, pausedMs]);
  return { ms, secs: Math.ceil(ms / 1000), total: total.current };
}

export function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    setR(m.matches);
    const f = () => setR(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return r;
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

export const vibrate = (ms = 30) => { try { navigator.vibrate?.(ms); } catch { /* unsupported */ } };

export function useMedia(query: string) {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    setM(mq.matches);
    const f = () => setM(mq.matches);
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, [query]);
  return m;
}

export function usePrevious<T>(v: T) {
  const r = useRef<T>(v);
  useEffect(() => { r.current = v; });
  return r.current;
}
