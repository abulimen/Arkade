import { z } from 'zod';

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export const ipOf = (req: Request) => (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'local';

/** Reads a small JSON body; anything over `max` bytes is rejected (message size limit). */
export async function readJson<T extends z.ZodTypeAny>(req: Request, schema: T, max = 4096): Promise<{ data: z.infer<T> } | { error: Response }> {
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > max) return { error: json({ error: 'TOO_LARGE' }, 413) };
  let text = '';
  try { text = await req.text(); } catch { return { error: json({ error: 'BAD_BODY' }, 400) }; }
  if (text.length > max) return { error: json({ error: 'TOO_LARGE' }, 413) };
  let raw: unknown;
  try { raw = JSON.parse(text || '{}'); } catch { return { error: json({ error: 'BAD_JSON' }, 400) }; }
  const r = schema.safeParse(raw);
  if (!r.success) return { error: json({ error: 'BAD_REQUEST' }, 400) };
  return { data: r.data };
}

/** Public base URL: PUBLIC_URL when configured (cloud domain or LAN address), else the request's own origin. */
export function baseUrl(req: Request): string {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, '');
  const h = req.headers;
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (/^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?$/.test(host) ? 'http' : 'https');
  return `${proto}://${host}`;
}

export const STATUS: Record<string, number> = { ROOM_NOT_FOUND: 404, BANNED: 403, ROOM_FULL: 409, ROOM_CLOSED: 410, UNKNOWN_PLAYER: 404, BAD_KEY: 403, RATE_LIMITED: 429 };
