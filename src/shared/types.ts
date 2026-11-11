// Client-safe shared types and constants (no zod import: keeps the phone bundle small).
export const GAME_IDS = ['spot-the-wolf', 'fake-verse', 'gideons-300', 'what-came-first', 'who-am-i'] as const;
export type GameId = (typeof GAME_IDS)[number];
export type Audience = 'kids' | 'youth' | 'adults';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type RoomStatus = 'lobby' | 'playing' | 'paused' | 'results' | 'closed';
export type Mode = 'individual' | 'team';

export interface GameConfig {
  audience: Audience;
  difficulty: Difficulty | 'mixed';
  mode: Mode;
  pace: 0.75 | 1 | 1.5;
  lookalike: boolean;
  keep1: number;
  keep2: number;
  finalists: number;
  wolves: number | null;
}

export const DEFAULT_CONFIG: GameConfig = {
  audience: 'youth',
  difficulty: 'mixed',
  mode: 'individual',
  pace: 1,
  lookalike: false,
  keep1: 0.67,
  keep2: 0.34,
  finalists: 10,
  wolves: null,
};

export interface GameMeta {
  name: string;
  tagline: string;
  minPlayers: number;
  modes: Mode[];
  est: [number, number];
  mascot: 'wilf' | 'fenn' | 'jari' | 'tilly' | 'cami';
  /** what a device that joins after the game started becomes */
  lateJoin: 'play' | 'spectate';
}

export const GAME_META: Record<GameId, GameMeta> = {
  'spot-the-wolf': { name: 'Spot the Wolf', tagline: 'Find the wolf in the flock', minPlayers: 4, modes: ['individual'], est: [12, 15], mascot: 'wilf', lateJoin: 'spectate' },
  'fake-verse': { name: 'Fake Verse', tagline: 'Fool your friends, find the truth', minPlayers: 3, modes: ['individual'], est: [12, 14], mascot: 'fenn', lateJoin: 'play' },
  'gideons-300': { name: "Gideon's 300", tagline: 'Only the brave remain', minPlayers: 2, modes: ['individual'], est: [13, 15], mascot: 'jari', lateJoin: 'spectate' },
  'what-came-first': { name: 'What Came First?', tagline: 'Put the story in order', minPlayers: 1, modes: ['individual', 'team'], est: [10, 12], mascot: 'tilly', lateJoin: 'play' },
  'who-am-i': { name: 'Who Am I?', tagline: 'Guess from the clues', minPlayers: 1, modes: ['individual', 'team'], est: [10, 12], mascot: 'cami', lateJoin: 'play' },
};

export const RAINBOW = ['#FF5C6C', '#FF9A3D', '#3DD68C', '#3DB8FF', '#6C5CE7', '#B15CFF'] as const;
export const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon'] as const;
export const AVATAR_NAMES = ['lamb', 'lion', 'camel', 'elephant', 'giraffe', 'zebra', 'donkey', 'ox', 'goat', 'ram', 'bear', 'deer', 'rabbit', 'hedgehog', 'turtle', 'owl', 'frog', 'fish', 'dove', 'duck', 'mouse', 'fox', 'cat', 'dog'] as const;
export const ROOM_LETTERS = 'BCDFHJKMNPRSTVWXZ';

export interface Phase {
  name: string;
  startedAt: number;
  endsAt: number | null;
  paused?: { remainingMs: number };
}

export interface PlayerPublic {
  id: string;
  nickname: string;
  avatar: number;
  color: number;
  kind: 'individual' | 'team';
  teamSize?: number;
}

export interface Player extends PlayerPublic {
  token: string;
  role: 'player' | 'spectator';
  connected: boolean;
  rerolled: boolean;
  joinedAt: number;
}

export interface MyInfo extends PlayerPublic {
  role: 'player' | 'spectator';
  score: number;
  rank: number | null;
  of: number;
  rerolled: boolean;
  spotlighted: boolean;
}

export interface RankEntry extends PlayerPublic {
  score: number;
}

export interface McInfo {
  hint: string;
  controls: string[];
  players: [string, string, number, number, string, string][]; // id, nickname, avatar, connected, role, kind
  diag: { connected: number; away: number; medianRtt: number | null; rooms?: number };
}

/** One envelope for every surface. `data` is game/phase specific and already projected for the audience. */
export interface View {
  rev: number;
  room: string;
  gameId: GameId;
  status: RoomStatus;
  phase: string;
  endsAt: number | null;
  pausedMs: number | null;
  round: number | null;
  rounds: number | null;
  count: { total: number; connected: number };
  config: Pick<GameConfig, 'audience' | 'difficulty' | 'mode' | 'pace'>;
  me?: MyInfo;
  top5?: RankEntry[];
  podium?: RankEntry[];
  spotlight?: { at: number; players: PlayerPublic[] } | null;
  sound: { on: boolean; volume: number };
  mc?: McInfo;
  data: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export const PHASE_CUES = { join: 'join' } as const;

export const MAX_NICK = 16;
export const MIN_NICK = 2;
export const SCORE_DISPLAY = (n: number) => Math.max(0, Math.round(n));
