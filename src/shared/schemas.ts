// Server-side Zod schemas: protocol messages and every content pack.
import { z } from 'zod';
import { GAME_IDS } from './types';

export const GameIdSchema = z.enum(GAME_IDS);

// ---------- content ----------
const Meta = z.object({
  id: z.string().min(2),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  audience: z.array(z.enum(['kids', 'youth', 'adults'])).min(1),
  testament: z.enum(['OT', 'NT', 'both']),
  ref: z.string().min(3),
  verse: z.string().min(10),
  translation: z.enum(['KJV', 'WEB']),
  review: z.enum(['pending', 'approved']),
});

export const WcfSchema = Meta.extend({
  events: z.array(z.object({ id: z.string(), text: z.string().min(2), ref: z.string().min(3), order: z.number().int() })).length(5),
});
export const FvSchema = Meta.extend({
  text: z.string().refine((t) => t.includes('____'), 'prompt needs a blank'),
  truth: z.string().min(1).max(40),
  decoys: z.array(z.string().min(1).max(40)).min(2).max(3),
});
export const G3Schema = Meta.extend({
  question: z.string().min(8),
  options: z.array(z.string().min(1)).length(4),
  correct: z.number().int().min(0).max(3),
});
export const WolfSchema = Meta.extend({
  word: z.string().min(2),
  category: z.string().min(3),
  aliases: z.array(z.string()),
  lookalike: z.string().optional(),
});
export const WaiSchema = Meta.extend({
  name: z.string().min(2),
  clues: z.array(z.string().min(8)).length(5),
  options: z.array(z.string().min(1)).length(6),
  story: z.string().min(10),
});

export type WcfItem = z.infer<typeof WcfSchema>;
export type FvItem = z.infer<typeof FvSchema>;
export type G3Item = z.infer<typeof G3Schema>;
export type WolfItem = z.infer<typeof WolfSchema>;
export type WaiItem = z.infer<typeof WaiSchema>;

export const CustomQuestionsSchema = z.object({
  wcf: z.array(WcfSchema).max(200).optional(),
  fv: z.array(FvSchema).max(200).optional(),
  g300: z.array(G3Schema).max(200).optional(),
  wolf: z.array(WolfSchema).max(200).optional(),
  wai: z.array(WaiSchema).max(200).optional(),
});

export const ConfigSchema = z
  .object({
    audience: z.enum(['kids', 'youth', 'adults']).default('youth'),
    difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).default('mixed'),
    mode: z.enum(['individual', 'team']).default('individual'),
    pace: z.union([z.literal(0.75), z.literal(1), z.literal(1.5)]).default(1),
    lookalike: z.boolean().default(false),
    keep1: z.number().min(0.3).max(1).default(0.67),
    keep2: z.number().min(0.1).max(1).default(0.34),
    finalists: z.number().int().min(2).max(20).default(10),
    wolves: z.number().int().min(1).max(3).nullable().default(null),
    countdownSec: z.number().int().min(3).max(15).default(7),
    testament: z.enum(['all', 'OT', 'NT']).default('all'),
    rounds: z.number().int().min(1).max(20).nullable().default(null),
    s1Questions: z.number().int().min(1).max(15).default(6),
    s2Questions: z.number().int().min(1).max(15).default(6),
    s3Target: z.number().int().min(1).max(15).default(5),
    questionSec: z.number().int().min(8).max(30).nullable().default(null),
    wolfCategories: z.array(z.string().min(1).max(60)).max(20).default([]),
    clueRounds: z.union([z.literal(1), z.literal(2)]).default(2),
    debateSec: z.number().int().min(15).max(300).default(90),
    allowWolfGuess: z.boolean().default(true),
    orderSec: z.number().int().min(15).max(120).default(40),
    writeSec: z.number().int().min(15).max(120).default(45),
    voteSec: z.number().int().min(10).max(90).default(20),
    doubleFinalRounds: z.boolean().default(true),
    showDecoys: z.boolean().default(true),
    clueSec: z.number().int().min(5).max(30).default(10),
    wrongPenalty: z.number().int().min(0).max(200).default(50),
    optionCount: z.union([z.literal(4), z.literal(6)]).nullable().default(null),
    customMode: z.enum(['only', 'mix']).default('mix'),
    customQuestions: CustomQuestionsSchema.optional(),
  })
  .default(() => ({
    audience: 'youth' as const,
    difficulty: 'mixed' as const,
    mode: 'individual' as const,
    pace: 1 as const,
    lookalike: false,
    keep1: 0.67,
    keep2: 0.34,
    finalists: 10,
    wolves: null,
    countdownSec: 7,
    testament: 'all' as const,
    rounds: null,
    s1Questions: 6,
    s2Questions: 6,
    s3Target: 5,
    questionSec: null,
    wolfCategories: [],
    clueRounds: 2 as const,
    debateSec: 90,
    allowWolfGuess: true,
    orderSec: 40,
    writeSec: 45,
    voteSec: 20,
    doubleFinalRounds: true,
    showDecoys: true,
    clueSec: 10,
    wrongPenalty: 50,
    optionCount: null,
    customMode: 'mix' as const,
  }));

export const CreateRoomSchema = z.object({ gameId: GameIdSchema, config: ConfigSchema });

export const JoinSchema = z.object({
  nickname: z.string().max(60),
  avatar: z.number().int().min(0).max(23).optional(),
  token: z.string().max(64).optional(),
  kind: z.enum(['individual', 'team']).optional(),
  teamSize: z.number().int().min(1).max(30).optional(),
});

const Id = z.string().min(1).max(40);
export const PlayerPayloads = {
  REROLL: z.object({}).optional(),
  PING: z.object({ rtt: z.number().min(0).max(60000) }),
  WRITE: z.object({ text: z.string().max(120) }),
  VOTE: z.object({ target: Id }),
  LOCK: z.object({ order: z.array(Id).max(12) }),
  CLUE: z.object({ text: z.string().max(80) }),
  ANSWER: z.object({ choice: z.union([z.string().max(80), z.number().int().min(0).max(9)]) }),
  BUZZ: z.object({ choice: z.number().int().min(0).max(9) }),
  PREDICT: z.object({ target: Id }),
  GUESS: z.object({ text: z.string().max(80) }),
} as const;
export type PlayerActionType = keyof typeof PlayerPayloads;

export const PlayerActionSchema = z.object({
  token: z.string().max(64),
  type: z.enum(Object.keys(PlayerPayloads) as [PlayerActionType, ...PlayerActionType[]]),
  payload: z.unknown().optional(),
  seq: z.number().int().min(0).default(0),
});

export const MC_TYPES = ['START', 'PAUSE', 'RESUME', 'SKIP', 'ADD_TIME', 'HIDE_ANSWER', 'KICK', 'BAN', 'END', 'CLOSE', 'SOUND', 'REASK', 'NEXT'] as const;
export const McActionSchema = z.object({
  hostKey: z.string().max(64),
  type: z.enum(MC_TYPES),
  payload: z.record(z.string(), z.unknown()).optional(),
  seq: z.number().int().min(0).default(0),
});
