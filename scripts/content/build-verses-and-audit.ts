import fs from 'node:fs';
import path from 'node:path';
import { loadDataset } from './shared';
import { WCF } from '../../src/server/content/data/wcf';
import { FV } from '../../src/server/content/data/fv';
import { G3 } from '../../src/server/content/data/g300';
import { WOLF } from '../../src/server/content/data/wolf';
import { WAI } from '../../src/server/content/data/wai';
import { VERSES as EXISTING_VERSES } from '../../src/server/content/verses';

const OUT_VERSES = path.resolve(process.cwd(), 'src/server/content/verses.ts');

function main() {
  const ds = loadDataset();

  const merged: Record<string, string> = {};
  const existingKeys = Object.keys(EXISTING_VERSES);
  for (const k of existingKeys) {
    merged[k] = EXISTING_VERSES[k];
  }

  const neededRefs = new Set<string>();
  for (const r of WCF) neededRefs.add(r[4]);
  for (const r of FV) neededRefs.add(r[4]);
  for (const r of G3) neededRefs.add(r[1]);
  for (const r of WOLF) neededRefs.add(r[4]);
  for (const r of WAI) neededRefs.add(r[4]);

  const missing: string[] = [];
  let added = 0;

  // Sort new refs canonically by bookOrder -> chapter -> verse
  const newEntries: { key: string; order: string; text: string }[] = [];
  for (const ref of neededRefs) {
    if (merged[ref]) continue;
    const v = ds.verseByRef.get(ref.toLowerCase());
    if (!v || v.text.length < 10) {
      missing.push(ref);
      continue;
    }
    newEntries.push({ key: ref, order: v.verseID, text: v.text });
  }

  if (missing.length > 0) {
    console.error(`ERROR: ${missing.length} refs not found in dataset.verseByRef:`, missing.slice(0, 20));
    process.exit(1);
  }

  newEntries.sort((a, b) => a.order.localeCompare(b.order));
  for (const e of newEntries) {
    merged[e.key] = e.text;
    added++;
  }

  const lines = [
    '// Public-domain KJV verse text, keyed by reference. Content items point at these keys.',
    'export const VERSES: Record<string, string> = {',
    ...Object.entries(merged).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`),
    '};',
    '',
  ];

  fs.writeFileSync(OUT_VERSES, lines.join('\n'), 'utf8');
  console.log(`Updated ${OUT_VERSES}: preserved ${existingKeys.length} existing verses + added ${added} new verses (total ${Object.keys(merged).length}).`);

  // Sample sanity checks on WAI distractors & WCF difficulty spread
  console.log('Sample WAI row 20 (first generated):', JSON.stringify(WAI[20]));
  console.log('Sample WCF row 17 (first generated):', JSON.stringify(WCF[17]));
}

main();
