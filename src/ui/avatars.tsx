import { AVATAR_COUNT, RAINBOW } from '@/shared/types';

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

/** Circular passenger avatar backed by 300 unique Multiavatar character profiles. */
export function Avatar({ avatar, color, size = 48, label }: { avatar: number; color: number; size?: number; label?: string }) {
  const idx = ((avatar % AVATAR_COUNT) + AVATAR_COUNT) % AVATAR_COUNT;
  const ring = RAINBOW[((color % 6) + 6) % 6];
  return (
    <img
      src={`/api/avatar/${idx}`}
      width={size}
      height={size}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      style={{ width: size, height: size, boxShadow: `0 0 0 2px ${ring}` }}
      className="rounded-full shrink-0 object-cover bg-night-3"
    />
  );
}

export const animalName = (i: number) => {
  const idx = ((i % AVATAR_COUNT) + AVATAR_COUNT) % AVATAR_COUNT;
  const adj = PROFILE_ADJECTIVES[idx % PROFILE_ADJECTIVES.length];
  const role = PROFILE_ROLES[Math.floor(idx / PROFILE_ADJECTIVES.length) % PROFILE_ROLES.length];
  return `${adj} ${role}`;
};
