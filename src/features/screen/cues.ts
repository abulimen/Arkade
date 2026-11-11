'use client';
import { useEffect, useRef } from 'react';
import type { View } from '@/shared/types';
import { configureSound, play } from '@/client/sound';
import { useCountdown } from '@/client/hooks';

/** Every sound has a matching visual cue; this only adds the audio on the projector once the MC enabled sound. */
export function useCues(view: View | null, enabled: boolean) {
  const prev = useRef<View | null>(null);
  useEffect(() => {
    const p = prev.current;
    prev.current = view;
    if (!view || !enabled) return;
    configureSound(view.sound);
    if (!p) return;
    if (view.status === 'lobby' && view.count.total > p.count.total) play('pop');
    if (view.phase === p.phase && view.round === p.round) return;
    const ph = view.phase;
    const accusedWolf = ph === 'accuse' && Array.isArray(view.data?.accused) && view.data.accused.some((a: { wolf: boolean }) => a.wolf);
    if (ph === 'end') play('fanfare');
    else if (ph.endsWith('cut')) { play('shofar'); setTimeout(() => play('whoosh'), 900); }
    else if (accusedWolf) play('howl');
    else if (['reveal', 'accuse', 'roundEnd', 's1r', 's2r', 's3r'].includes(ph) && !(view.gameId === 'spot-the-wolf' && ph === 'reveal')) { play('drum'); setTimeout(() => play('chime'), 800); }
  }, [view, enabled]);

  const { secs } = useCountdown(view?.endsAt ?? null, view?.pausedMs ?? null);
  const lead = view && ['prompt', 'intro', 'reveal'].includes(view.phase);
  useEffect(() => {
    if (!enabled || !view || view.pausedMs != null || view.endsAt == null) return;
    if (lead && secs >= 1 && secs <= 3) play('beep');
    else if (secs >= 1 && secs <= 5) play('tick');
  }, [secs]); // eslint-disable-line react-hooks/exhaustive-deps
}
