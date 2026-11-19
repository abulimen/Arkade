'use client';

import { useState } from 'react';
import { t } from '@/i18n';
import { haptic, playUi } from '@/client/sound';
import { Icon } from '@/ui/icons';
import { AnswerButton, Button } from '@/ui/kit';
import type { PlayerProps } from '../types';
import { Feedback, LockedIn, ScrollCard, Verse, Waiting } from '../shared';

interface FakeOption {
  id: string;
  text: string;
}

interface FakeVerseResult {
  pickedTruth: boolean;
  gain: number;
  foolGain: number;
  fooledCount: number;
  truth: string;
  ref: string;
  verse: string;
  correct: number;
  fakes: { text: string; authors: string[]; votes: number; points: number }[];
}

interface FakeVersePlayerData {
  mult?: number;
  text: string;
  submitted?: boolean;
  options?: FakeOption[];
  voted?: boolean;
  result?: FakeVerseResult;
}

function PromptText({ text }: { text: string }) {
  const parts = text.split('____');
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <span className="inline-block min-w-20 border-b-4 border-indigo px-2 mx-1 font-extrabold text-indigo">
              _____
            </span>
          )}
        </span>
      ))}
    </>
  );
}

export default function FakeVersePlayer({ view, send }: PlayerProps) {
  const d = view.data as FakeVersePlayerData;
  const p = view.phase;
  const [draft, setDraft] = useState({ round: view.round, text: '' });
  const [busy, setBusy] = useState(false);

  const fake = draft.round === view.round ? draft.text : '';
  const setFake = (text: string) => setDraft({ round: view.round, text });

  const multBadge = d.mult === 2 && (
    <div className="inline-flex items-center gap-2 rounded-full bg-gold px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-night shadow">
      <Icon n="sparkle" size={14} /> {t('fv.double')}
    </div>
  );

  if (p === 'prompt') {
    return (
      <div className="space-y-4 my-auto">
        {multBadge}
        <ScrollCard>
          <div className="text-xs font-bold uppercase tracking-widest text-indigo mb-2">{t('fv.read')}</div>
          <PromptText text={d.text} />
        </ScrollCard>
        <p className="text-center text-sm text-slate">{t('fv.readBody')}</p>
      </div>
    );
  }

  if (p === 'write') {
    if (d.submitted) {
      return <LockedIn sub={t('fv.waitOthers')} />;
    }
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!fake.trim()) return;
          setBusy(true);
          const res = await send('WRITE', { text: fake.trim() });
          if (res.ok) setFake('');
          setBusy(false);
        }}
        className="space-y-4"
      >
        {multBadge}
        <ScrollCard>
          <PromptText text={d.text} />
        </ScrollCard>

        <div className="arcade-panel p-5 space-y-3">
          <label htmlFor="fv-input" className="block text-sm font-semibold text-white">
            {t('fv.writeFake')}
          </label>
          <input
            id="fv-input"
            type="text"
            maxLength={90}
            value={fake}
            onChange={(e) => setFake(e.target.value)}
            placeholder={t('fv.placeholder')}
            className="arcade-input font-semibold"
          />
          <Button type="submit" variant="primary" loading={busy} disabled={!fake.trim()} className="w-full">
            {t('phone.lockIt')}
          </Button>
        </div>
      </form>
    );
  }

  if (p === 'vote') {
    if (d.voted) {
      return <LockedIn sub={t('fv.waitOthers')} />;
    }
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold text-white fs-h2">{t('fv.pickTruth')}</h2>
          {multBadge}
        </div>
        <div className="grid gap-2.5">
          {(d.options ?? []).map((o, idx) => (
            <AnswerButton
              key={o.id}
              index={idx}
              onClick={() => {
                playUi('ui-snap');
                haptic('press');
                void send('VOTE', { target: o.id });
              }}
            >
              {o.text}
            </AnswerButton>
          ))}
        </div>
      </div>
    );
  }

  const res = d.result;
  if (!res) return <Waiting mascot="fenn" title={t('ph.end')} />;

  return (
    <div className="space-y-4">
      <Feedback
        ok={res.pickedTruth}
        gain={res.gain}
        title={res.pickedTruth ? t('fv.gotTruth') : d.voted === false ? t('fv.noVote') : t('fv.fooled')}
        sub={`${t('fv.truth')}: ${res.truth}`}
      />
      {res.fooledCount > 0 && (
        <div className="rounded-2xl border border-gold/45 bg-gold/12 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Icon n="sparkle" size={16} className="text-gold shrink-0" />
            <span>
              You fooled {res.fooledCount} {res.fooledCount === 1 ? 'player' : 'players'}!
            </span>
          </div>
          <span className="rounded-full bg-gold px-2.5 py-0.5 text-xs font-extrabold text-night shrink-0">
            +{res.foolGain} pts
          </span>
        </div>
      )}
      <Verse verse={res.verse} refText={res.ref} />
    </div>
  );
}
