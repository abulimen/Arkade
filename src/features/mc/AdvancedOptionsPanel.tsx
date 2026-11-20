'use client';

import { useRef, useState, type DragEvent } from 'react';
import {
  DEFAULT_CONFIG,
  GAME_META,
  type GameConfig,
  type GameId,
  type TestamentFilter,
} from '@/shared/types';
import {
  CSV_TEMPLATES,
  WOLF_CATEGORIES,
  parseGameCsv,
  type CsvParseError,
} from '@/shared/customCsv';
import type { FvItem, G3Item, WaiItem, WcfItem, WolfItem } from '@/shared/schemas';
import { t } from '@/i18n';
import { haptic, playUi } from '@/client/sound';
import { Icon } from '@/ui/icons';

export interface UploadedCsvState {
  filename: string;
  items: unknown[];
  errors: CsvParseError[];
}

export const EMPTY_UPLOAD: UploadedCsvState = {
  filename: '',
  items: [],
  errors: [],
};

const DEFAULT_ROUNDS: Record<Exclude<GameId, 'gideons-300'>, number> = {
  'what-came-first': 8,
  'fake-verse': 6,
  'who-am-i': 8,
  'spot-the-wolf': 3,
};

export function countActiveOverrides(game: GameId, cfg: GameConfig): number {
  let n = 0;
  if (cfg.testament !== DEFAULT_CONFIG.testament) n++;
  if (cfg.countdownSec !== DEFAULT_CONFIG.countdownSec) n++;
  if (game !== 'gideons-300' && cfg.rounds !== DEFAULT_CONFIG.rounds) n++;
  if (cfg.customMode !== DEFAULT_CONFIG.customMode) n++;

  if (game === 'spot-the-wolf') {
    if (cfg.wolves !== DEFAULT_CONFIG.wolves) n++;
    if (cfg.lookalike !== DEFAULT_CONFIG.lookalike) n++;
    if (cfg.clueRounds !== DEFAULT_CONFIG.clueRounds) n++;
    if (cfg.debateSec !== DEFAULT_CONFIG.debateSec) n++;
    if (cfg.allowWolfGuess !== DEFAULT_CONFIG.allowWolfGuess) n++;
    if (cfg.wolfCategories.length > 0) n++;
  } else if (game === 'gideons-300') {
    if (cfg.keep1 !== DEFAULT_CONFIG.keep1) n++;
    if (cfg.keep2 !== DEFAULT_CONFIG.keep2) n++;
    if (cfg.finalists !== DEFAULT_CONFIG.finalists) n++;
    if (cfg.s1Questions !== DEFAULT_CONFIG.s1Questions) n++;
    if (cfg.s2Questions !== DEFAULT_CONFIG.s2Questions) n++;
    if (cfg.s3Target !== DEFAULT_CONFIG.s3Target) n++;
    if (cfg.questionSec !== DEFAULT_CONFIG.questionSec) n++;
  } else if (game === 'fake-verse') {
    if (cfg.writeSec !== DEFAULT_CONFIG.writeSec) n++;
    if (cfg.voteSec !== DEFAULT_CONFIG.voteSec) n++;
    if (cfg.doubleFinalRounds !== DEFAULT_CONFIG.doubleFinalRounds) n++;
    if (cfg.showDecoys !== DEFAULT_CONFIG.showDecoys) n++;
  } else if (game === 'what-came-first') {
    if (cfg.orderSec !== DEFAULT_CONFIG.orderSec) n++;
  } else if (game === 'who-am-i') {
    if (cfg.clueSec !== DEFAULT_CONFIG.clueSec) n++;
    if (cfg.wrongPenalty !== DEFAULT_CONFIG.wrongPenalty) n++;
    if (cfg.optionCount !== DEFAULT_CONFIG.optionCount) n++;
  }
  return n;
}

function describeCustomItem(game: GameId, item: unknown): { title: string; subtitle: string; badge: string } {
  if (game === 'what-came-first') {
    const it = item as WcfItem;
    return {
      title: it.events.map((e) => e.text).join(' → '),
      subtitle: `${it.ref} · ${it.testament}`,
      badge: it.difficulty,
    };
  }
  if (game === 'fake-verse') {
    const it = item as FvItem;
    return {
      title: it.text,
      subtitle: `Truth: ${it.truth} · Decoys: ${it.decoys.join(', ')} · ${it.ref}`,
      badge: it.difficulty,
    };
  }
  if (game === 'who-am-i') {
    const it = item as WaiItem;
    return {
      title: it.name,
      subtitle: `Clue 1: ${it.clues[0]} (${it.ref})`,
      badge: it.difficulty,
    };
  }
  if (game === 'gideons-300') {
    const it = item as G3Item;
    return {
      title: it.question,
      subtitle: `Answer: ${it.options[it.correct]} · ${it.ref}`,
      badge: it.difficulty,
    };
  }
  const it = item as WolfItem;
  return {
    title: it.word,
    subtitle: `${it.category}${it.lookalike ? ` · Look-alike: ${it.lookalike}` : ''}${it.aliases.length ? ` · Aliases: ${it.aliases.join(', ')}` : ''}`,
    badge: it.difficulty,
  };
}

interface AdvancedOptionsPanelProps {
  game: GameId;
  cfg: GameConfig;
  setField: <K extends keyof GameConfig>(key: K, val: GameConfig[K]) => void;
  uploaded: UploadedCsvState;
  onCsvLoaded: (next: UploadedCsvState) => void;
  onCsvCleared: () => void;
  onResetDefaults: () => void;
}

export default function AdvancedOptionsPanel({
  game,
  cfg,
  setField,
  uploaded,
  onCsvLoaded,
  onCsvCleared,
  onResetDefaults,
}: AdvancedOptionsPanelProps) {
  const [open, setOpen] = useState(false);

  const overrideCount = countActiveOverrides(game, cfg);
  const customCount = uploaded.items.length;
  const activeBadgeCount = overrideCount + (customCount > 0 ? 1 : 0);
  const meta = GAME_META[game];

  const isWolf = game === 'spot-the-wolf';
  const defaultRounds = game === 'gideons-300' ? 6 : DEFAULT_ROUNDS[game];
  const minRounds = isWolf ? 1 : 2;
  const maxRounds = isWolf ? 8 : 15;

  const extraWolfCategories = isWolf
    ? [...new Set((uploaded.items as WolfItem[]).map((it) => it.category))].filter(
        (cat) => !(WOLF_CATEGORIES as readonly string[]).includes(cat),
      )
    : [];
  const allWolfCategories = [...WOLF_CATEGORIES, ...extraWolfCategories];

  const toggleWolfCategory = (cat: string) => {
    const exists = cfg.wolfCategories.includes(cat);
    const next = exists
      ? cfg.wolfCategories.filter((c) => c !== cat)
      : [...cfg.wolfCategories, cat];
    setField('wolfCategories', next);
  };

  return (
    <div className="rounded-2xl border border-white/12 bg-night-3/65 overflow-hidden">
      {/* Collapsible Header Bar (no nested interactive controls) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 px-3.5 sm:px-4 py-3 bg-night-2/70">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="mc-advanced-options-body"
          onClick={() => {
            playUi('ui-focus');
            haptic('tick');
            setOpen((v) => !v);
          }}
          className="cursor-pointer w-full sm:flex-1 min-w-0 min-h-10 flex items-center gap-3 text-left group"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/12 bg-night-3 text-gold">
            <Icon n="sliders" size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-white group-hover:text-gold transition-colors">
                Advanced Rules &amp; Custom Questions
              </span>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold tabular-nums ${
                  activeBadgeCount > 0
                    ? 'border-gold/45 bg-gold/15 text-gold'
                    : 'border-white/12 bg-night-3 text-cloud/75'
                }`}
              >
                {overrideCount} {overrideCount === 1 ? 'override' : 'overrides'}
              </span>
              {customCount > 0 && (
                <span className="rounded-full border border-leaf/45 bg-leaf/15 px-2.5 py-0.5 text-[11px] font-bold text-leaf tabular-nums">
                  {customCount} custom CSV
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate truncate">
              Testament filter, countdown, {meta.name} timers &amp; rules, or CSV question upload
            </p>
          </div>
          <Icon
            n="chevronRight"
            size={16}
            className={`text-cloud/75 shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
          />
        </button>

        {overrideCount > 0 && (
          <button
            type="button"
            onClick={onResetDefaults}
            className="cursor-pointer self-end sm:self-auto rounded-full border border-white/15 bg-night-3 px-3.5 min-h-9 text-xs font-bold text-cloud hover:text-white hover:border-white/30 transition-colors shrink-0"
          >
            Reset Defaults
          </button>
        )}
      </div>

      {open && (
        <div id="mc-advanced-options-body" className="border-t border-white/10 p-4 sm:p-5 space-y-6 a-fade">
          {/* 1. Universal Game Rules */}
          <section aria-labelledby="adv-universal-heading" className="space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <h3 id="adv-universal-heading" className="text-xs font-bold uppercase tracking-widest text-gold">
                Universal Game Rules
              </h3>
              <span className="text-[11px] text-slate">Applies to all games</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <SegGroup<TestamentFilter>
                label="Bible Testament"
                value={cfg.testament}
                onChange={(v) => setField('testament', v)}
                options={[
                  ['all', 'All Bible'],
                  ['OT', 'Old Testament'],
                  ['NT', 'New Testament'],
                ]}
              />

              <RangeTile
                label="Pre-Game Countdown"
                valueLabel={`${cfg.countdownSec}s`}
                hint="Default: 7s (3s–15s launch stage)"
                min={3}
                max={15}
                step={1}
                value={cfg.countdownSec}
                onChange={(n) => setField('countdownSec', n)}
              />
            </div>

            {game !== 'gideons-300' && (
              <div className="rounded-2xl border border-white/10 bg-night-2/70 p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-slate">Custom Rounds</div>
                    <p className="text-[11px] text-cloud/75 mt-0.5">
                      Default for {meta.name} is {defaultRounds} rounds.
                    </p>
                  </div>
                  <div className="inline-flex rounded-xl border border-white/10 bg-night-3 p-1 gap-1">
                    <button
                      type="button"
                      aria-pressed={cfg.rounds === null}
                      onClick={() => setField('rounds', null)}
                      className={`cursor-pointer rounded-lg px-3 min-h-9 text-xs font-bold transition-colors ${
                        cfg.rounds === null ? 'bg-gold text-night' : 'text-cloud hover:text-white'
                      }`}
                    >
                      Auto (Default)
                    </button>
                    <button
                      type="button"
                      aria-pressed={cfg.rounds !== null}
                      onClick={() => setField('rounds', cfg.rounds ?? defaultRounds)}
                      className={`cursor-pointer rounded-lg px-3 min-h-9 text-xs font-bold transition-colors ${
                        cfg.rounds !== null ? 'bg-gold text-night' : 'text-cloud hover:text-white'
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                </div>

                <RangeTile
                  label={cfg.rounds === null ? `Rounds (Auto: ${defaultRounds})` : 'Rounds'}
                  valueLabel={`${cfg.rounds ?? defaultRounds} ${(cfg.rounds ?? defaultRounds) === 1 ? 'round' : 'rounds'}`}
                  hint={`Allowed range for ${meta.name}: ${minRounds}–${maxRounds} rounds`}
                  min={minRounds}
                  max={maxRounds}
                  step={1}
                  value={Math.min(maxRounds, Math.max(minRounds, cfg.rounds ?? defaultRounds))}
                  onChange={(n) => setField('rounds', n)}
                />
              </div>
            )}
          </section>

          {/* 2. Contextual Rules for Selected Game */}
          <section aria-labelledby="adv-game-heading" className="space-y-3.5 border-t border-white/10 pt-5">
            <div className="flex items-center justify-between gap-2">
              <h3 id="adv-game-heading" className="text-xs font-bold uppercase tracking-widest text-gold">
                {meta.name} Rules
              </h3>
              <span className="text-[11px] text-slate">Game-specific overrides</span>
            </div>

            {game === 'spot-the-wolf' && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <SegGroup
                    label={t('mc.wolves')}
                    value={cfg.wolves === null ? 'auto' : String(cfg.wolves)}
                    onChange={(v) => setField('wolves', v === 'auto' ? null : (Number(v) as 1 | 2 | 3))}
                    options={[
                      ['auto', t('mc.auto')],
                      ['1', '1'],
                      ['2', '2'],
                      ['3', '3'],
                    ]}
                  />

                  <SegGroup<'1' | '2'>
                    label="Clue Rounds"
                    value={String(cfg.clueRounds) as '1' | '2'}
                    onChange={(v) => setField('clueRounds', Number(v) as 1 | 2)}
                    options={[
                      ['1', '1 Clue Round'],
                      ['2', '2 Clue Rounds'],
                    ]}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <RangeTile
                    label="Debate Timer"
                    valueLabel={`${cfg.debateSec}s`}
                    hint="Default: 90s (30s–180s)"
                    min={30}
                    max={180}
                    step={5}
                    value={cfg.debateSec}
                    onChange={(n) => setField('debateSec', n)}
                  />

                  <div className="space-y-2.5">
                    <ToggleTile
                      checked={cfg.lookalike}
                      onChange={(checked) => setField('lookalike', checked)}
                      label={t('mc.lookalike')}
                      hint="Wolves receive a decoy word instead of a blank card."
                    />
                    <ToggleTile
                      checked={cfg.allowWolfGuess}
                      onChange={(checked) => setField('allowWolfGuess', checked)}
                      label="Allow Caught Wolf Final Guess"
                      hint="Caught wolves get 15s to guess the secret word and steal the round."
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-night-2/70 p-3.5 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest text-slate">Category Filter</div>
                      <p className="text-[11px] text-cloud/75 mt-0.5">
                        {cfg.wolfCategories.length === 0
                          ? 'All categories included (empty filter = all categories).'
                          : `${cfg.wolfCategories.length} selected (${cfg.wolfCategories.join(', ')})`}
                      </p>
                    </div>
                    {cfg.wolfCategories.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setField('wolfCategories', [])}
                        className="cursor-pointer rounded-full border border-white/15 bg-night-3 px-3 min-h-8 text-[11px] font-bold text-cloud hover:text-white"
                      >
                        Clear Filter
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      aria-pressed={cfg.wolfCategories.length === 0}
                      onClick={() => setField('wolfCategories', [])}
                      className={`cursor-pointer rounded-full border px-3 min-h-9 text-xs font-bold transition-colors ${
                        cfg.wolfCategories.length === 0
                          ? 'border-gold bg-gold text-night'
                          : 'border-white/12 bg-night-3 text-cloud hover:text-white'
                      }`}
                    >
                      All Categories
                    </button>
                    {allWolfCategories.map((cat) => {
                      const active = cfg.wolfCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggleWolfCategory(cat)}
                          className={`cursor-pointer rounded-full border px-3 min-h-9 text-xs font-bold transition-colors ${
                            active
                              ? 'border-gold bg-gold text-night'
                              : 'border-white/12 bg-night-3 text-cloud hover:text-white'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {game === 'gideons-300' && (
              <div className="space-y-4">
                <div className="grid gap-3.5 sm:grid-cols-3">
                  <RangeTile
                    label="Stage 1 Questions"
                    valueLabel={`${cfg.s1Questions}`}
                    hint="Default: 6 (3–10)"
                    min={3}
                    max={10}
                    step={1}
                    value={cfg.s1Questions}
                    onChange={(n) => setField('s1Questions', n)}
                  />
                  <RangeTile
                    label="Stage 2 Questions"
                    valueLabel={`${cfg.s2Questions}`}
                    hint="Default: 6 (3–10)"
                    min={3}
                    max={10}
                    step={1}
                    value={cfg.s2Questions}
                    onChange={(n) => setField('s2Questions', n)}
                  />
                  <RangeTile
                    label="Finals First-to-Score Target"
                    valueLabel={`${cfg.s3Target} pts`}
                    hint="Default: 5 points (3–10)"
                    min={3}
                    max={10}
                    step={1}
                    value={cfg.s3Target}
                    onChange={(n) => setField('s3Target', n)}
                  />
                </div>

                <div className="rounded-2xl border border-white/10 bg-night-2/70 p-3.5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest text-slate">Question Timer Override</div>
                      <p className="text-[11px] text-cloud/75 mt-0.5">
                        Auto uses 15s (Stage 1), 10s (Stage 2), and 15s (Finals).
                      </p>
                    </div>
                    <div className="inline-flex rounded-xl border border-white/10 bg-night-3 p-1 gap-1">
                      <button
                        type="button"
                        aria-pressed={cfg.questionSec === null}
                        onClick={() => setField('questionSec', null)}
                        className={`cursor-pointer rounded-lg px-3 min-h-9 text-xs font-bold transition-colors ${
                          cfg.questionSec === null ? 'bg-gold text-night' : 'text-cloud hover:text-white'
                        }`}
                      >
                        Auto
                      </button>
                      <button
                        type="button"
                        aria-pressed={cfg.questionSec !== null}
                        onClick={() => setField('questionSec', cfg.questionSec ?? 15)}
                        className={`cursor-pointer rounded-lg px-3 min-h-9 text-xs font-bold transition-colors ${
                          cfg.questionSec !== null ? 'bg-gold text-night' : 'text-cloud hover:text-white'
                        }`}
                      >
                        Custom
                      </button>
                    </div>
                  </div>

                  <RangeTile
                    label={cfg.questionSec === null ? 'Question Timer (Auto)' : 'Question Timer'}
                    valueLabel={cfg.questionSec === null ? 'Auto (15s/10s/15s)' : `${cfg.questionSec}s`}
                    hint="Allowed range: 8s–30s per question"
                    min={8}
                    max={30}
                    step={1}
                    value={cfg.questionSec ?? 15}
                    onChange={(n) => setField('questionSec', n)}
                  />
                </div>

                <div className="grid gap-3.5 sm:grid-cols-3">
                  <RangeTile
                    label={t('mc.keep1', { n: Math.round(cfg.keep1 * 100) })}
                    valueLabel={`${Math.round(cfg.keep1 * 100)}%`}
                    min={40}
                    max={100}
                    step={1}
                    value={Math.round(cfg.keep1 * 100)}
                    onChange={(n) => setField('keep1', n / 100)}
                  />
                  <RangeTile
                    label={t('mc.keep2', { n: Math.round(cfg.keep2 * 100) })}
                    valueLabel={`${Math.round(cfg.keep2 * 100)}%`}
                    min={10}
                    max={60}
                    step={1}
                    value={Math.round(cfg.keep2 * 100)}
                    onChange={(n) => setField('keep2', n / 100)}
                  />
                  <RangeTile
                    label={t('mc.finalists', { n: cfg.finalists })}
                    valueLabel={`${cfg.finalists}`}
                    min={2}
                    max={20}
                    step={1}
                    value={cfg.finalists}
                    onChange={(n) => setField('finalists', n)}
                  />
                </div>
              </div>
            )}

            {game === 'fake-verse' && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <RangeTile
                    label="Write Timer"
                    valueLabel={`${cfg.writeSec}s`}
                    hint="Default: 45s (20s–90s)"
                    min={20}
                    max={90}
                    step={5}
                    value={cfg.writeSec}
                    onChange={(n) => setField('writeSec', n)}
                  />
                  <RangeTile
                    label="Vote Timer"
                    valueLabel={`${cfg.voteSec}s`}
                    hint="Default: 20s (10s–60s)"
                    min={10}
                    max={60}
                    step={5}
                    value={cfg.voteSec}
                    onChange={(n) => setField('voteSec', n)}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ToggleTile
                    checked={cfg.doubleFinalRounds}
                    onChange={(checked) => setField('doubleFinalRounds', checked)}
                    label="2x Final Rounds"
                    hint="Double points in the final stretch of rounds."
                  />
                  <ToggleTile
                    checked={cfg.showDecoys}
                    onChange={(checked) => setField('showDecoys', checked)}
                    label="House Decoys"
                    hint="Mix up to 2 Arkade decoys alongside player-written lies."
                  />
                </div>
              </div>
            )}

            {game === 'what-came-first' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <RangeTile
                  label="Lock-in Order Timer"
                  valueLabel={`${cfg.orderSec}s`}
                  hint="Default: 40s (20s–90s)"
                  min={20}
                  max={90}
                  step={5}
                  value={cfg.orderSec}
                  onChange={(n) => setField('orderSec', n)}
                />
              </div>
            )}

            {game === 'who-am-i' && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <RangeTile
                    label="Seconds Per Clue"
                    valueLabel={`${cfg.clueSec}s`}
                    hint="Default: 10s per clue (5s–25s)"
                    min={5}
                    max={25}
                    step={1}
                    value={cfg.clueSec}
                    onChange={(n) => setField('clueSec', n)}
                  />

                  <SegGroup<'0' | '25' | '50' | '100'>
                    label="Wrong Answer Penalty"
                    value={String(cfg.wrongPenalty) as '0' | '25' | '50' | '100'}
                    onChange={(v) => setField('wrongPenalty', Number(v))}
                    options={[
                      ['0', '0'],
                      ['25', '-25'],
                      ['50', '-50'],
                      ['100', '-100'],
                    ]}
                  />
                </div>

                <SegGroup<'auto' | '4' | '6'>
                  label="Choice Count"
                  value={cfg.optionCount === null ? 'auto' : (String(cfg.optionCount) as '4' | '6')}
                  onChange={(v) => setField('optionCount', v === 'auto' ? null : (Number(v) as 4 | 6))}
                  options={[
                    ['auto', 'Auto by Audience'],
                    ['4', '4 Choices'],
                    ['6', '6 Choices'],
                  ]}
                />
              </div>
            )}
          </section>

          {/* 3. Custom Questions (CSV Upload) */}
          <CsvUploaderSection
            key={game}
            game={game}
            cfg={cfg}
            setField={setField}
            uploaded={uploaded}
            onCsvLoaded={onCsvLoaded}
            onCsvCleared={onCsvCleared}
          />
        </div>
      )}
    </div>
  );
}

function CsvUploaderSection({
  game,
  cfg,
  setField,
  uploaded,
  onCsvLoaded,
  onCsvCleared,
}: {
  game: GameId;
  cfg: GameConfig;
  setField: <K extends keyof GameConfig>(key: K, val: GameConfig[K]) => void;
  uploaded: UploadedCsvState;
  onCsvLoaded: (next: UploadedCsvState) => void;
  onCsvCleared: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const template = CSV_TEMPLATES[game];
  const meta = GAME_META[game];
  const customOnlyEmpty = cfg.customMode === 'only' && uploaded.items.length === 0;

  const parseText = (text: string, filename: string) => {
    const res = parseGameCsv(game, text);
    playUi(res.items.length > 0 ? 'ui-lock' : 'ui-error');
    haptic(res.items.length > 0 ? 'success' : 'error');
    onCsvLoaded({ filename, items: res.items, errors: res.errors });
  };

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      playUi('ui-error');
      haptic('error');
      onCsvLoaded({
        filename: file.name,
        items: [],
        errors: [{ row: 1, message: 'CSV file is too large (max 2 MB, 200 questions).' }],
      });
      return;
    }
    try {
      const text = await file.text();
      parseText(text, file.name);
    } catch {
      playUi('ui-error');
      haptic('error');
      onCsvLoaded({
        filename: file.name,
        items: [],
        errors: [{ row: 1, message: 'Could not read that file. Please try another .csv file or paste CSV text.' }],
      });
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    void handleFile(file);
  };

  const handleClear = () => {
    playUi('ui-back');
    haptic('tick');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setPasteText('');
    onCsvCleared();
  };

  return (
    <section aria-labelledby="adv-csv-heading" className="space-y-4 border-t border-white/10 pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <h3 id="adv-csv-heading" className="text-xs font-bold uppercase tracking-widest text-gold">
            Custom Questions (CSV Upload) — {meta.name}
          </h3>
          <p className="text-xs text-cloud/80 leading-relaxed">{template.description}</p>
        </div>

        <a
          href={`/api/content/template/${game}`}
          download={template.filename}
          onClick={() => {
            playUi('ui-focus');
            haptic('tick');
          }}
          className="cursor-pointer press inline-flex items-center gap-2 rounded-full border border-sky/40 bg-sky/12 px-4 min-h-10 text-xs font-bold text-sky hover:bg-sky/20 transition-colors shrink-0"
        >
          <Icon n="download" size={14} />
          <span>Download Template (.csv)</span>
        </a>
      </div>

      {/* Template Columns Hint */}
      <div className="rounded-xl border border-white/10 bg-night/70 px-3.5 py-2.5 space-y-1.5">
        <div className="text-[11px] font-bold uppercase tracking-widest text-slate">Expected CSV Columns</div>
        <div className="flex flex-wrap gap-1.5">
          {template.columns.map((col) => (
            <code
              key={col}
              className="rounded-md border border-white/10 bg-night-3 px-2 py-0.5 font-mono text-[11px] text-cloud"
            >
              {col}
            </code>
          ))}
        </div>
      </div>

      {/* Drag & Select Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed p-4 transition-colors ${
          dragActive
            ? 'border-gold bg-gold/10'
            : 'border-white/18 bg-night-2/65 hover:border-white/30'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-white">
              Drop a <code className="text-gold">.csv</code> file here or choose from device
            </div>
            <p className="text-xs text-slate">
              Parsed instantly in your browser (up to 200 questions per game; saved per game if you switch tabs).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer press inline-flex items-center gap-2 rounded-full bg-gold px-4 min-h-10 text-xs font-bold text-night shadow">
              <Icon n="plus" size={14} />
              <span>Choose CSV File</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  void handleFile(file);
                }}
              />
            </label>

            <button
              type="button"
              aria-expanded={pasteOpen}
              onClick={() => {
                playUi('ui-focus');
                setPasteOpen((v) => !v);
              }}
              className="cursor-pointer rounded-full border border-white/15 bg-night-3 px-3.5 min-h-10 text-xs font-bold text-cloud hover:text-white"
            >
              {pasteOpen ? 'Hide Paste' : 'Paste CSV'}
            </button>

            {(uploaded.items.length > 0 || uploaded.errors.length > 0 || uploaded.filename) && (
              <button
                type="button"
                onClick={handleClear}
                className="cursor-pointer rounded-full border border-coral/40 bg-coral/12 px-3.5 min-h-10 text-xs font-bold text-coral hover:bg-coral/20"
              >
                Clear CSV
              </button>
            )}
          </div>
        </div>

        {pasteOpen && (
          <div className="mt-3 pt-3 border-t border-white/10 space-y-2.5">
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={4}
              placeholder={`Paste CSV rows starting with header (${template.columns.slice(0, 4).join(',')}...)`}
              className="arcade-input font-mono text-xs min-h-24"
            />
            <div className="flex justify-end">
              <button
                type="button"
                disabled={!pasteText.trim()}
                onClick={() => parseText(pasteText, 'Pasted CSV')}
                className="cursor-pointer rounded-full bg-leaf px-4 min-h-10 text-xs font-bold text-night disabled:opacity-45"
              >
                Parse Pasted CSV
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Status Pill + Mix / Custom Only Toggle */}
      <div className="grid gap-4 sm:grid-cols-2 items-start">
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-widest text-slate">Upload Status</div>
          {uploaded.items.length > 0 ? (
            <div className="inline-flex flex-wrap items-center gap-2 rounded-2xl border border-leaf/40 bg-leaf/12 px-3.5 py-2 text-xs font-bold text-leaf">
              <Icon n="check" size={14} />
              <span>
                Loaded {uploaded.items.length} custom {uploaded.items.length === 1 ? 'question' : 'questions'}
              </span>
              {uploaded.filename && <span className="text-cloud/80 font-normal">({uploaded.filename})</span>}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-night-2/60 px-3.5 py-2.5 text-xs text-slate">
              No custom CSV loaded for {meta.name} yet.
            </div>
          )}
        </div>

        <SegGroup<'mix' | 'only'>
          label="Question Source Mode"
          value={cfg.customMode}
          onChange={(v) => setField('customMode', v)}
          options={[
            ['mix', 'Mix with Arkade'],
            ['only', 'Custom Only'],
          ]}
        />
      </div>

      {customOnlyEmpty && (
        <div
          role="alert"
          className="rounded-2xl border border-coral/45 bg-coral/12 px-4 py-3 text-xs font-semibold text-white flex items-start gap-2.5"
        >
          <Icon n="info" size={16} className="text-coral shrink-0 mt-0.5" />
          <span>
            <strong className="text-coral">Custom Only mode requires custom questions:</strong> Upload at least 1 valid CSV question for {meta.name}, or switch back to <strong className="text-white">Mix with Arkade</strong> before launching.
          </span>
        </div>
      )}

      {/* Validation Errors */}
      {uploaded.errors.length > 0 && (
        <div className="rounded-2xl border border-coral/40 bg-coral/10 p-3.5 space-y-2">
          <div className="text-xs font-bold text-coral">
            CSV Validation Warnings ({uploaded.errors.length})
          </div>
          <ul className="max-h-36 overflow-y-auto space-y-1 text-xs text-cloud/90 list-disc pl-4">
            {uploaded.errors.map((e, idx) => (
              <li key={`${e.row}-${idx}`}>
                <span className="font-bold text-coral">Row {e.row}:</span> {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview of first 3 parsed questions */}
      {uploaded.items.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate">
            <span>Preview (First {Math.min(3, uploaded.items.length)})</span>
            {uploaded.items.length > 3 && <span>+{uploaded.items.length - 3} more ready</span>}
          </div>
          <ol className="space-y-2">
            {uploaded.items.slice(0, 3).map((item, i) => {
              const info = describeCustomItem(game, item);
              return (
                <li
                  key={i}
                  className="rounded-xl border border-white/10 bg-night-2/80 px-3.5 py-2.5 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-xs font-semibold text-white truncate">{info.title}</div>
                    <div className="text-[11px] text-cloud/75 truncate">{info.subtitle}</div>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/15 bg-night-3 px-2 py-0.5 text-[10px] font-bold uppercase text-gold">
                    {info.badge}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}

export function SegGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2 min-w-0">
      <div className="text-xs font-bold uppercase tracking-widest text-slate">{label}</div>
      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-white/10 bg-night-3/80 p-1.5">
        {options.map(([v, text]) => {
          const active = value === v;
          return (
            <button
              key={v}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => onChange(v)}
              className={`cursor-pointer flex-1 min-h-10 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all disabled:opacity-45 disabled:cursor-not-allowed ${
                active
                  ? 'bg-gold text-night shadow-[0_4px_14px_-2px_rgba(255,208,38,0.45)]'
                  : 'text-cloud hover:bg-white/8 hover:text-white'
              }`}
            >
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function RangeTile({
  label,
  valueLabel,
  hint,
  min,
  max,
  step,
  value,
  disabled = false,
  onChange,
}: {
  label: string;
  valueLabel?: string;
  hint?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  disabled?: boolean;
  onChange: (n: number) => void;
}) {
  return (
    <label
      className={`block rounded-2xl border border-white/10 bg-night-2/80 p-3.5 space-y-2 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-cloud">{label}</span>
        {valueLabel && (
          <span className="rounded-full border border-gold/35 bg-gold/12 px-2 py-0.5 text-[11px] font-bold text-gold tabular-nums">
            {valueLabel}
          </span>
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-gold cursor-pointer disabled:cursor-not-allowed"
      />
      {hint && <div className="text-[11px] text-cloud/70">{hint}</div>}
    </label>
  );
}

function ToggleTile({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="cursor-pointer flex items-start gap-3 rounded-2xl border border-white/12 bg-night-2 px-3.5 py-3 text-sm font-semibold text-white hover:border-white/25 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-gold cursor-pointer"
      />
      <div className="min-w-0">
        <div className="text-xs font-bold text-white leading-snug">{label}</div>
        {hint && <div className="text-[11px] font-normal text-cloud/75 mt-0.5 leading-snug">{hint}</div>}
      </div>
    </label>
  );
}
