import type { GameConfig, GameId, Phase, Player } from '@/shared/types';
import type { Rng } from './rng';
import type { Content } from '../content';
import { rankIds } from './scoring';

export interface GameCtx {
  now(): number;
  rng: Rng;
  players: Readonly<Record<string, Player>>;
  content: Content;
  config: GameConfig;
}

export type GAction =
  | { by: 'player'; playerId: string; type: string; payload: any; receivedAt: number } // eslint-disable-line @typescript-eslint/no-explicit-any
  | { by: 'mc'; type: string; payload?: any } // eslint-disable-line @typescript-eslint/no-explicit-any
  | { by: 'system'; type: 'PHASE_TIMEOUT' | 'PLAYER_JOINED' | 'PLAYER_LEFT'; payload?: unknown };

export interface Reduced<S> {
  state: S;
  error?: string;
}

export interface ModView {
  data: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  round?: number | null;
  rounds?: number | null;
  hint?: string;
  controls?: string[];
  showTop5?: boolean;
}

export interface GameStateBase {
  phase: Phase;
  round: number;
  scores: Record<string, number>;
}

export interface GameModule<S extends GameStateBase = any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  id: GameId;
  createState(ctx: GameCtx, opts?: { stage?: string[] }): S;
  reduce(state: S, action: GAction, ctx: GameCtx): Reduced<S>;
  /** Final ordering of player ids (defaults to score order). */
  rank?(state: S, ctx: GameCtx): string[];
  views: {
    screen(state: S, ctx: GameCtx): ModView;
    player(state: S, playerId: string, ctx: GameCtx): ModView;
    mc(state: S, ctx: GameCtx): ModView;
  };
}

export const ok = <S>(state: S): Reduced<S> => ({ state });
export const fail = <S>(state: S, error: string): Reduced<S> => ({ state, error });

export const mkPhase = (name: string, now: number, ms: number | null): Phase => ({ name, startedAt: now, endsAt: ms == null ? null : now + ms });
/** Seconds to ms, scaled by the pace option (1.5 = fast, 0.75 = relaxed). */
export const sec = (ctx: GameCtx, s: number) => Math.round((s * 1000) / ctx.config.pace);

export function pausePhase(p: Phase, now: number): Phase {
  if (p.paused || p.endsAt == null) return p;
  return { ...p, paused: { remainingMs: Math.max(0, p.endsAt - now) } };
}
export function resumePhase(p: Phase, now: number): Phase {
  if (!p.paused) return p;
  return { name: p.name, startedAt: p.startedAt, endsAt: now + p.paused.remainingMs };
}
export function addTime(p: Phase, ms: number): Phase {
  if (p.paused) return { ...p, paused: { remainingMs: p.paused.remainingMs + ms } };
  if (p.endsAt == null) return p;
  return { ...p, endsAt: p.endsAt + ms };
}

/** Connected players who can act (not spectators). */
export const activeIds = (ctx: GameCtx): string[] => Object.values(ctx.players).filter((p) => p.role === 'player' && p.connected).map((p) => p.id);

export const isPlayer = (ctx: GameCtx, id: string) => ctx.players[id]?.role === 'player';
export const nick = (ctx: GameCtx, id: string) => ctx.players[id]?.nickname ?? '?';

export function pubOf(ctx: GameCtx, id: string) {
  const p = ctx.players[id];
  return p ? { id: p.id, nickname: p.nickname, avatar: p.avatar, color: p.color, kind: p.kind } : { id, nickname: '?', avatar: 0, color: 0, kind: 'individual' as const };
}

export const rankByScore = (s: GameStateBase, ctx: GameCtx) =>
  rankIds(Object.values(ctx.players).filter((p) => p.role === 'player').map((p) => p.id), s.scores);

export const END = 'end';
