import type { GameId } from '@/shared/types';
import type { GameModule } from '../engine/kit';
import { whatCameFirst } from './whatCameFirst';
import { fakeVerse } from './fakeVerse';
import { whoAmI } from './whoAmI';
import { gideons300 } from './gideons300';
import { spotTheWolf } from './spotTheWolf';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GAMES: Record<GameId, GameModule<any>> = {
  'what-came-first': whatCameFirst,
  'fake-verse': fakeVerse,
  'who-am-i': whoAmI,
  'gideons-300': gideons300,
  'spot-the-wolf': spotTheWolf,
};
