import { GAME_IDS, GAME_META } from '@/shared/types';
import { coverage, getContent } from '@/server/content';
import { json } from '@/server/net/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  const c = getContent();
  const cov = coverage(c);
  const key = { 'what-came-first': 'wcf', 'fake-verse': 'fv', 'gideons-300': 'g300', 'spot-the-wolf': 'wolf', 'who-am-i': 'wai' } as const;
  return json({ games: GAME_IDS.map((id) => ({ id, ...GAME_META[id], content: cov[key[id]] })) });
}
