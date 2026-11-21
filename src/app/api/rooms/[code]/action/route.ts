import { PlayerActionSchema, PlayerPayloads } from '@/shared/schemas';
import { decideWolfGuessMatch } from '@/server/ai/geminiDecision';
import { cleanText, guessMatches, isBlocked } from '@/server/engine/text';
import { getManager } from '@/server/rooms/manager';
import { STATUS, json, readJson } from '@/server/net/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface WolfGuessCheckState {
  phase?: { name?: string; endsAt?: number | null };
  caught?: string[];
  guesses?: Record<string, string>;
  word?: { word: string; category?: string; aliases?: string[] };
}

/**
 * Runs Gemini Decision 1 as a fallback for Spot the Wolf final guesses only when
 * hard rules (`guessMatches`) return false and `GEMINI_API_KEY` is configured.
 */
async function resolveWolfGuessFallback(
  m: ReturnType<typeof getManager>,
  code: string,
  token: string,
  rawText: unknown,
  receivedAt: number,
): Promise<boolean> {
  if (!process.env.GEMINI_API_KEY?.trim()) return false;
  const text = cleanText(String(rawText ?? ''), 40);
  if (!text || isBlocked(text)) return false;

  const room = await m.getAsync(code);
  if (!room || room.gameId !== 'spot-the-wolf' || !room.game || room.closed) return false;

  const p = Object.values(room.players).find((x) => x.token === token);
  if (!p) return false;

  const s = room.game as unknown as WolfGuessCheckState;
  if (s.phase?.name !== 'guess') return false;
  if (s.phase.endsAt != null && receivedAt > s.phase.endsAt) return false;
  if (!s.caught?.includes(p.id)) return false;
  if (s.guesses?.[p.id] !== undefined) return false;
  if (!s.word?.word) return false;

  if (guessMatches(text, s.word.word, s.word.aliases ?? [])) return false;

  return decideWolfGuessMatch({
    guess: text,
    secretWord: s.word.word,
    category: s.word.category ?? '',
    aliases: s.word.aliases ?? [],
  });
}

/** Player intents. The server stamps receipt time itself; nothing the client claims about time is used. */
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const receivedAt = Date.now();
  const { code } = await params;
  const m = getManager();
  m.count();
  const body = await readJson(req, PlayerActionSchema, 2048);
  if ('error' in body) return body.error;
  const { token, type, seq } = body.data;
  if (!m.actionLimiter.allow(token)) return json({ seq, ok: false, error: 'RATE_LIMITED' }, 429);
  const parsed = PlayerPayloads[type].safeParse(body.data.payload ?? {});
  if (!parsed.success) return json({ seq, ok: false, error: 'BAD_PAYLOAD' }, 400);

  const payload: Record<string, unknown> = { ...(parsed.data as Record<string, unknown>) };
  if (type === 'GUESS') {
    delete payload.aiApproved;
    if (await resolveWolfGuessFallback(m, code, token, payload.text, receivedAt)) {
      payload.aiApproved = true;
    }
  }

  const out = await m.mutate(
    code,
    (room) => {
      const p = Object.values(room.players).find((x) => x.token === token);
      if (type === 'PING') {
        if (!p) return { ok: false, error: 'UNKNOWN_PLAYER' };
        room.rtts[p.id] = Number(payload.rtt) || 0;
        if (!p.connected) {
          p.connected = true;
          p.lastSeenAt = receivedAt;
          room.touch(false);
        } else if (receivedAt - (p.lastSeenAt ?? 0) >= 25_000) {
          p.lastSeenAt = receivedAt;
          room.dirty = true;
        }
        return { ok: true };
      }
      if (p && m.isDbMode()) {
        const was = p.connected;
        p.connected = true;
        p.lastSeenAt = receivedAt;
        if (!was) room.touch(false);
      }
      const r = room.playerAction(token, type, payload, receivedAt);
      const view = r.ok && !room.closed && p ? room.viewFor({ role: 'player', playerId: p.id }) : undefined;
      return view ? { ...r, view } : r;
    },
    { skipTimerAdvance: type === 'PING' },
  );
  if (out.notFound) return json({ seq, ok: false, error: 'ROOM_NOT_FOUND' }, 404);
  const r = out.result;
  return json({ seq, ...r }, r.ok ? 200 : (r.error && STATUS[r.error]) || 200);
}
