'use client';

import { useState } from 'react';
import { t } from '@/i18n';
import { haptic, playUi } from '@/client/sound';
import { Icon } from '@/ui/icons';
import { Button } from '@/ui/kit';
import type { PlayerProps } from '../types';
import { Feedback, LockedIn, Verse, Waiting } from '../shared';

interface WcfCard {
  id: string;
  text: string;
}

interface WcfTimelineItem {
  id: string;
  text: string;
  ref: string;
}

interface WcfPlayerData {
  cards?: WcfCard[];
  locked?: boolean;
  mine?: string[] | null;
  reveal?: {
    correct: number;
    gain: number;
    perfect: number;
    verse: string;
    ref: string;
    timeline: WcfTimelineItem[];
  };
}

export default function WcfPlayer({ view, send }: PlayerProps) {
  const d = view.data as WcfPlayerData;
  const p = view.phase;
  const roundKey = `${view.round ?? 0}:${p}`;
  const [tapState, setTapState] = useState<{ key: string; ids: string[] }>({ key: roundKey, ids: [] });
  const [busy, setBusy] = useState(false);

  const taps = tapState.key === roundKey ? tapState.ids : [];
  const updateTaps = (fn: (prev: string[]) => string[]) =>
    setTapState((curr) => ({ key: roundKey, ids: fn(curr.key === roundKey ? curr.ids : []) }));

  if (p === 'prompt') {
    return <Waiting mascot="tilly" title={t('wcf.look')} body={t('wcf.lookBody')} />;
  }

  if (p === 'order') {
    if (d.locked) {
      return <LockedIn />;
    }

    const cards = d.cards ?? [];
    const byId = new Map(cards.map((c) => [c.id, c]));
    const ready = taps.length === cards.length && cards.length > 0;

    const tapCard = (id: string) => {
      if (taps.includes(id)) {
        playUi('ui-back');
        haptic('tick');
        updateTaps((prev) => prev.filter((x) => x !== id));
        return;
      }
      playUi('ui-focus', ((taps.length + 1) / Math.max(1, cards.length) - 0.5) * 0.6);
      haptic('press');
      updateTaps((prev) => [...prev, id]);
    };

    const submit = async () => {
      if (!ready) return;
      setBusy(true);
      await send('LOCK', { order: taps });
      setBusy(false);
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 px-1">
          <p className="text-sm font-semibold text-cloud">{t('wcf.tapInOrder')}</p>
          {taps.length > 0 && (
            <button
              type="button"
              onClick={() => {
                playUi('ui-back');
                haptic('tick');
                updateTaps((prev) => prev.slice(0, -1));
              }}
              className="cursor-pointer rounded-full border border-white/15 bg-night-3 px-3 py-1 text-xs font-bold text-gold hover:bg-white/10"
            >
              {t('wcf.undo')}
            </button>
          )}
        </div>

        {/* Selected Queue Preview */}
        {taps.length > 0 && (
          <div className="rounded-2xl border border-gold/35 bg-gold/10 p-3 space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-widest text-gold">{t('wcf.yourOrder')}</div>
            <div className="flex flex-wrap gap-1.5">
              {taps.map((id, i) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-night-2 border border-white/12 px-2.5 py-1 text-xs font-semibold text-white"
                >
                  <span className="text-gold font-extrabold">#{i + 1}</span>
                  <span className="truncate max-w-[14ch]">{byId.get(id)?.text}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tap Cards */}
        <div className="grid gap-2.5">
          {cards.map((c) => {
            const idx = taps.indexOf(c.id);
            const picked = idx >= 0;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => tapCard(c.id)}
                className={`cursor-pointer press rounded-2xl border p-4 min-h-14 flex items-center gap-3 text-left transition-all ${
                  picked
                    ? 'border-leaf/60 bg-leaf/15 text-white shadow-[0_0_18px_-6px_rgba(56,236,130,0.45)]'
                    : 'arcade-card text-cloud hover:border-white/25'
                }`}
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl font-extrabold text-sm ${
                    picked ? 'bg-leaf text-night' : 'bg-night-3 text-slate border border-white/10'
                  }`}
                >
                  {picked ? idx + 1 : '•'}
                </span>
                <span className="font-semibold text-sm sm:text-base leading-snug">{c.text}</span>
              </button>
            );
          })}
        </div>

        <Button type="button" variant="primary" loading={busy} disabled={!ready} onClick={submit} className="w-full">
          <Icon n="lock" size={18} />
          <span>{t('phone.lockIt')}</span>
        </Button>
      </div>
    );
  }

  const rev = d.reveal;
  if (!rev) return <Waiting mascot="tilly" title={t('ph.end')} />;
  const total = rev.timeline.length;
  const allRight = d.locked && rev.correct === total;

  return (
    <div className="space-y-4">
      <Feedback
        ok={!!allRight || rev.gain > 0}
        gain={rev.gain}
        title={!d.locked ? t('wcf.noLock') : allRight ? t('wcf.perfect') : t('wcf.close')}
        sub={d.locked ? t('wcf.rightPlace', { n: rev.correct, of: total }) : undefined}
      />

      <div className="arcade-card p-4 space-y-2.5">
        <div className="text-xs font-bold uppercase tracking-widest text-gold">{t('wcf.correctOrder')}</div>
        <ol className="space-y-2">
          {rev.timeline.map((item, idx) => (
            <li key={item.id} className="flex items-start gap-3 rounded-2xl bg-night-3/80 p-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gold text-night font-extrabold text-xs">
                {idx + 1}
              </span>
              <div className="min-w-0">
                <div className="font-semibold text-white text-sm leading-snug">{item.text}</div>
                <div className="text-xs text-slate mt-0.5">{item.ref}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <Verse verse={rev.verse} refText={rev.ref} />
    </div>
  );
}
