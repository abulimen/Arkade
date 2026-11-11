'use client';
import { useEffect, useState } from 'react';
import { useChannel } from '@/client/channel';
import { resolveUrls } from '@/client/urls';
import ScreenRoot from './ScreenRoot';
import type { RoomUrls } from './ScreenRoot';

export default function ScreenPage({ code }: { code: string }) {
  const [urls, setUrls] = useState<RoomUrls | null>(null);
  const ch = useChannel({ code, role: 'screen' });
  useEffect(() => { fetch(`/api/rooms/${code}`).then((r) => r.json()).then((j) => setUrls(resolveUrls(j, code))).catch(() => undefined); }, [code]);
  return <ScreenRoot view={ch.view} conn={ch.conn} urls={urls} />;
}
