'use client';
import { useMemo } from 'react';
import qrcode from 'qrcode-generator';
import { t } from '@/i18n';

/** QR code as an SVG path (no innerHTML). Only the projector and MC bundles import this. */
export function QRPanel({ url, size = 280 }: { url: string; size?: number }) {
  const { d, n } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return { d, n };
  }, [url]);
  return (
    <div className="inline-block rounded-3xl border border-white/20 bg-white p-4 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.75)]" style={{ width: size }}>
      <svg viewBox={`0 0 ${n} ${n}`} width="100%" role="img" aria-label={t('lobby.scan')} shapeRendering="crispEdges"><path d={d} fill="#0C0E14" /></svg>
    </div>
  );
}

