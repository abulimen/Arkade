import type { RoomUrls } from '@/features/screen/ScreenRoot';

/** Join URL for the QR code: an explicitly configured PUBLIC_URL (LAN or custom domain) wins, otherwise the page's own origin. */
export function resolveUrls(info: { configured?: boolean; urls?: RoomUrls } | null, code: string): RoomUrls {
  if (info?.configured && info.urls) return info.urls;
  const { origin, host } = window.location;
  return { join: `${origin}/j/${code}`, short: `${host}/j/${code}` };
}
