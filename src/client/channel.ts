'use client';
import { createStore } from 'zustand/vanilla';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { View } from '@/shared/types';
import { syncClock } from './clock';

export type Conn = 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'closed' | 'kicked';
export interface ChannelState { conn: Conn; view: View | null; rev: number; reason: string | null }
export interface ChannelOpts { code: string; role: 'screen' | 'player' | 'mc'; token?: string; key?: string }
export interface Ack { ok: boolean; error?: string }

const INIT: ChannelState = { conn: 'connecting', view: null, rev: -1, reason: null };

export function createChannel(o: ChannelOpts) {
  const store = createStore<ChannelState>(() => INIT);
  let es: EventSource | null = null;
  let tries = 0;
  let stopped = false;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let seq = 0;
  const q = `role=${o.role}${o.token ? `&token=${encodeURIComponent(o.token)}` : ''}${o.key ? `&key=${encodeURIComponent(o.key)}` : ''}`;

  const finish = (conn: Conn, reason: string | null = null) => {
    stopped = true;
    es?.close();
    store.setState({ conn, reason });
  };

  const open = () => {
    if (stopped) return;
    es = new EventSource(`/api/rooms/${o.code}/stream?${q}`);
    es.addEventListener('open', () => { tries = 0; store.setState({ conn: 'connected', rev: -1 }); void syncClock(); });
    es.addEventListener('view', (e) => {
      const v = JSON.parse((e as MessageEvent<string>).data) as View;
      if (v.rev < store.getState().rev) return; // views are full snapshots; ignore stale revisions
      store.setState({ view: v, rev: v.rev, conn: 'connected', reason: null });
    });
    es.addEventListener('kicked', (e) => finish('kicked', (JSON.parse((e as MessageEvent<string>).data) as { code: string }).code));
    es.addEventListener('closed', () => finish('closed'));
    es.onerror = () => {
      es?.close();
      if (stopped) return;
      store.setState({ conn: typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'reconnecting' });
      // exponential backoff from 500 ms to 5 s; stop if the room is gone
      retry = setTimeout(async () => {
        try {
          const r = await fetch(`/api/rooms/${o.code}`, { cache: 'no-store' });
          if (r.status === 404 || r.status === 410) return finish('closed');
        } catch { /* still offline */ }
        open();
      }, Math.min(5000, 500 * 2 ** tries++));
    };
  };
  open();

  const post = async (path: string, body: Record<string, unknown>): Promise<Ack> => {
    try {
      const r = await fetch(`/api/rooms/${o.code}/${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, seq: ++seq }) });
      return (await r.json()) as Ack;
    } catch {
      return { ok: false, error: 'OFFLINE' };
    }
  };

  const ping = setInterval(async () => {
    const rtt = await syncClock();
    if (rtt != null && o.role === 'player' && o.token) void post('action', { token: o.token, type: 'PING', payload: { rtt } });
  }, 30_000);
  const onNet = () => { if (!stopped && store.getState().conn !== 'connected') { clearTimeout(retry); tries = 0; es?.close(); open(); } };
  if (typeof window !== 'undefined') window.addEventListener('online', onNet);

  return {
    store,
    sendPlayer: (type: string, payload: unknown = {}) => post('action', { token: o.token, type, payload }),
    sendMc: (type: string, payload: unknown = {}) => post('mc', { hostKey: o.key, type, payload }),
    stop() {
      stopped = true;
      clearTimeout(retry);
      clearInterval(ping);
      if (typeof window !== 'undefined') window.removeEventListener('online', onNet);
      es?.close();
    },
  };
}
export type Channel = ReturnType<typeof createChannel>;

const noopSub = () => () => undefined;
export function useChannel(o: ChannelOpts | null) {
  const [ch, setCh] = useState<Channel | null>(null);
  const code = o?.code, role = o?.role, token = o?.token, key = o?.key;
  useEffect(() => {
    if (!code || !role) return;
    const c = createChannel({ code, role, token, key });
    setCh(c);
    return () => { c.stop(); setCh(null); };
  }, [code, role, token, key]);
  const state = useSyncExternalStore(ch ? ch.store.subscribe : noopSub, ch ? ch.store.getState : () => INIT, () => INIT);
  return { ...state, sendPlayer: ch?.sendPlayer, sendMc: ch?.sendMc };
}
