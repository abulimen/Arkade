import multiavatar from '@multiavatar/multiavatar';
import { AVATAR_COUNT } from '@/shared/types';

const PROFILE_ADJECTIVES = [
  'Brave', 'Bright', 'Swift', 'Noble', 'Wise', 'Bold', 'Kind', 'True',
  'Sunny', 'Golden', 'Silver', 'Emerald', 'Cobalt', 'Coral', 'Royal',
  'Calm', 'Merry', 'Starry', 'Lively', 'Mighty', 'Gentle', 'Clever',
  'Daring', 'Steady', 'Joyful',
] as const;

const PROFILE_ROLES = [
  'Explorer', 'Captain', 'Scout', 'Guardian', 'Builder', 'Scribe',
  'Runner', 'Watcher', 'Herald', 'Navigator', 'Keeper', 'Champion',
] as const;

/**
 * Generates one of 300 unique, deterministic character SVG avatars using
 * the open-source Multiavatar library.
 */
export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsed = Number.parseInt(id, 10);
  const idx = Number.isFinite(parsed) ? ((parsed % AVATAR_COUNT) + AVATAR_COUNT) % AVATAR_COUNT : 0;
  const adj = PROFILE_ADJECTIVES[idx % PROFILE_ADJECTIVES.length];
  const role = PROFILE_ROLES[Math.floor(idx / PROFILE_ADJECTIVES.length) % PROFILE_ROLES.length];
  const seed = `arkade-v2-${idx}-${adj}-${role}`;
  const svg = multiavatar(seed);
  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}
