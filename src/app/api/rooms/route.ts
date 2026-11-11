import { CreateRoomSchema } from '@/shared/schemas';
import { GAME_META } from '@/shared/types';
import type { GameConfig } from '@/shared/types';
import { getManager } from '@/server/rooms/manager';
import { baseUrl, ipOf, json, readJson } from '@/server/net/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const m = getManager();
  if (!m.createLimiter.allow(ipOf(req))) return json({ error: 'RATE_LIMITED' }, 429);
  const body = await readJson(req, CreateRoomSchema);
  if ('error' in body) return body.error;
  const { gameId } = body.data;
  const config = body.data.config as GameConfig;
  if (!GAME_META[gameId].modes.includes(config.mode)) config.mode = 'individual';
  const made = m.create(gameId, config);
  if ('error' in made) return json({ error: made.error }, 429);
  const base = baseUrl(req);
  const code = made.room.code;
  return json({ code, hostKey: made.hostKey, urls: { join: `${base}/j/${code}`, screen: `${base}/screen/${code}`, mc: `${base}/mc/${code}` } }, 201);
}
