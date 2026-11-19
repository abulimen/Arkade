import fs from 'node:fs';
import path from 'node:path';
import { loadDataset, ascii, hashStr } from './shared';
import { WCF, type WcfRow } from '../../src/server/content/data/wcf';
import { WAI, type WaiRow } from '../../src/server/content/data/wai';
import { WOLF, type WolfRow } from '../../src/server/content/data/wolf';
import { CURATED_WAI_BANK, sanitizeCuratedAnswerLeaks } from './wai-curated';

const DATA_DIR = path.resolve(process.cwd(), 'src/server/content/data');
const ds = loadDataset();

console.log('Dataset loaded:');
console.log('  Events:', ds.eventMap.size);
console.log('  People:', ds.personMap.size);
console.log('  Places:', ds.placeMap.size);
console.log('  Verses:', ds.verses.length);

// ============================================================================
// PART 1: What Came First? (WCF)
// ============================================================================
console.log('\n--- Compiling WCF ---');

interface CleanEvent {
  id: string;
  title: string;
  year: number;
  sortKey: number;
  chapterRef: string;
  verseRef: string;
  verseID: string;
  verseNumSort: number;
  bookOrder: number;
  bookName: string;
  testament: 'OT' | 'NT';
  famous: boolean;
  era: number;
}

const FAMOUS_WCF_RE =
  /Creation|Adam|Eve|Eden|Cain|Abel|Noah|Flood|Ark|Babel|Abra|Sarah|Lot|Sodom|Isaac|Rebekah|Jacob|Esau|Joseph|Pharaoh(?!(?:-nechoh|-hophra))|Moses|Bush|Plague|Passover|Red Sea|Manna|Sinai|Commandments|Golden Calf|Joshua|Jericho|Gideon|Samson|Delilah|Ruth|Samuel|Saul|David|Goliath|Bathsheba|Solomon|Temple|Elijah|Carmel|Elisha|Naaman|Daniel|Furnace|Shadrach|Lions|Nebuchadnezzar.*(?:Dream|Image|Furnace|Jerusalem|Mad)|Esther|Haman|Jonah|Nineveh|Job|Jesus|Mary|Bethlehem|Magi|Wise Men|Baptist|Baptism|Lazarus|Transfiguration|Supper|Gethsemane|Crucif|Resurrection|Ascension|Pentecost|Stephen|Peter|Paul|Damascus|Barnabas|Patmos/i;

const FAMOUS_BIO_EVENT_RE =
  /^(?:Birth|Death|Reign) of (?:Jesus|Isaac|Moses|John the Baptist|David|Solomon|Saul|Samuel|Stephen|Hezekiah|Josiah|Joshua|Elisha)\b/i;

function getEra(bookName: string): number {
  if (['Genesis', 'Job'].includes(bookName)) return 1; // Creation & Patriarchs
  if (['Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'].includes(bookName)) return 2; // Exodus & Wilderness
  if (['Joshua', 'Judges', 'Ruth'].includes(bookName)) return 3; // Conquest & Judges
  if ([
    '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles',
    'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Jonah', 'Amos',
    'Hosea', 'Micah', 'Isaiah', 'Nahum', 'Zephaniah', 'Habakkuk'
  ].includes(bookName)) return 4; // United & Divided Monarchy
  if ([
    'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Obadiah', 'Haggai',
    'Zechariah', 'Malachi', 'Ezra', 'Nehemiah', 'Esther'
  ].includes(bookName)) return 5; // Exile & Return
  if (['Matthew', 'Mark', 'Luke', 'John'].includes(bookName)) return 6; // Gospels
  return 7; // Acts, Epistles, Revelation
}

const cleanEvents: CleanEvent[] = [];
for (const [id, ev] of ds.eventMap.entries()) {
  const vId = ev.verses?.[0];
  const iv = vId ? ds.verseById.get(vId) : undefined;
  const title = ev.title?.trim();
  if (!title || title.length < 12 || title.length > 65) continue;
  if (!ev.startDate || !iv) continue;
  const year = Number(ev.startDate);
  if (isNaN(year)) continue;
  // Drop "Lifetime of X" (spans centuries & flips canonical chapter order) and obscure genealogy Birth/Death/Reign filler
  if (/^Lifetime of /i.test(title)) continue;
  if (/^(?:Birth|Death|Reign) of /i.test(title) && !FAMOUS_BIO_EVENT_RE.test(title)) continue;
  if (title.toLowerCase().includes(iv.chapterRef.toLowerCase()) || title.toLowerCase().includes(iv.bookName.toLowerCase())) continue;

  cleanEvents.push({
    id,
    title,
    year,
    sortKey: ev.sortKey ?? year,
    chapterRef: iv.chapterRef,
    verseRef: iv.ref,
    verseID: iv.verseID,
    verseNumSort: Number(iv.verseID),
    bookOrder: iv.bookOrder,
    bookName: iv.bookName,
    testament: iv.testament,
    famous: FAMOUS_WCF_RE.test(title),
    era: getEra(iv.bookName),
  });
}

cleanEvents.sort((a, b) => (a.year !== b.year ? a.year - b.year : a.sortKey - b.sortKey));
const famousEvents = cleanEvents.filter((e) => e.famous);
console.log('Clean events available:', cleanEvents.length, '| Famous story events:', famousEvents.length);

const seedWcf = WCF.slice(0, 17);
const emittedWcfSets: string[][] = seedWcf.map((r) => r[5].map((e) => e[0]));
const eventUsage = new Map<string, number>();

function overlap(a: string[], b: string[]) {
  let count = 0;
  for (const x of a) if (b.includes(x)) count++;
  return count;
}

function isMonotonicSubset(subset: CleanEvent[]): boolean {
  for (let k = 0; k < 4; k++) {
    if (subset[k + 1].year - subset[k].year < 2) return false;
    if (subset[k + 1].era < subset[k].era) return false;
    if (
      subset[k + 1].bookName === subset[k].bookName &&
      subset[k + 1].verseNumSort <= subset[k].verseNumSort
    ) {
      return false;
    }
  }
  return true;
}

function buildCandidatesFromPool(pool: CleanEvent[]): CleanEvent[][] {
  const n = pool.length;
  const cands: CleanEvent[][] = [];
  for (let stride = 1; stride < 45; stride++) {
    for (let offset = 0; offset < stride; offset++) {
      for (let i = offset; i < n - stride * 4; i += stride) {
        const subset = [
          pool[i],
          pool[i + stride],
          pool[i + stride * 2],
          pool[i + stride * 3],
          pool[i + stride * 4],
        ];
        if (isMonotonicSubset(subset)) cands.push(subset);
      }
    }
  }
  for (let s1 = 1; s1 <= 19; s1 += 2) {
    for (let s2 = 1; s2 <= 19; s2 += 2) {
      for (let s3 = 1; s3 <= 19; s3 += 2) {
        for (let s4 = 1; s4 <= 19; s4 += 2) {
          for (let i = 0; i < n - (s1 + s2 + s3 + s4); i += 2) {
            const subset = [
              pool[i],
              pool[i + s1],
              pool[i + s1 + s2],
              pool[i + s1 + s2 + s3],
              pool[i + s1 + s2 + s3 + s4],
            ];
            if (isMonotonicSubset(subset)) cands.push(subset);
          }
        }
      }
    }
  }
  cands.sort(
    (a, b) =>
      hashStr(a[0].title + a[2].title + a[4].title) -
      hashStr(b[0].title + b[2].title + b[4].title)
  );
  return cands;
}

const famousCandidates = buildCandidatesFromPool(famousEvents);
const wcfCandidates = buildCandidatesFromPool(cleanEvents);

const TARGET_WCF_TOTAL = 615;
const NEEDED_WCF = TARGET_WCF_TOTAL - seedWcf.length;
const TARGET_EASY_WCF = 200;
const MAX_EVENT_USAGE = 18;
const generatedWcfRows: WcfRow[] = [];

function pushWcfSubset(subset: CleanEvent[], d: 'e' | 'm' | 'h'): boolean {
  const titles = subset.map((s) => s.title);
  if (new Set(titles).size !== 5) return false;
  if (titles.some((t) => (eventUsage.get(t) ?? 0) >= MAX_EVENT_USAGE)) return false;
  if (emittedWcfSets.some((prior) => overlap(prior, titles) > 2)) return false;

  const allOt = subset.every((s) => s.testament === 'OT');
  const allNt = subset.every((s) => s.testament === 'NT');
  const testament: 'OT' | 'NT' | 'both' = allOt ? 'OT' : allNt ? 'NT' : 'both';

  const aud = d === 'e' ? 'kya' : 'ya';
  const id = `gen-wcf-${generatedWcfRows.length + 1}`;
  const ref = subset[0].verseRef;
  const eventsTuples: [string, string][] = subset.map((s) => [s.title, s.chapterRef]);

  for (const t of titles) {
    eventUsage.set(t, (eventUsage.get(t) ?? 0) + 1);
  }
  emittedWcfSets.push(titles);
  generatedWcfRows.push([id, d, aud, testament, ref, eventsTuples]);
  return true;
}

// 1. Emit Easy ('e') strictly from recognizable famous story events
for (const subset of famousCandidates) {
  if (generatedWcfRows.length >= TARGET_EASY_WCF) break;
  pushWcfSubset(subset, 'e');
}

// 2. Emit Medium ('m') and Hard ('h') from the broader clean event pool
for (const subset of wcfCandidates) {
  if (generatedWcfRows.length >= NEEDED_WCF) break;
  const span = subset[4].year - subset[0].year;
  const d: 'm' | 'h' = span < 120 ? 'h' : 'm';
  pushWcfSubset(subset, d);
}

console.log(
  `Generated WCF rows: ${generatedWcfRows.length} (Easy=${generatedWcfRows.filter((r) => r[1] === 'e').length}, total with seeds: ${seedWcf.length + generatedWcfRows.length})`
);

// ============================================================================
// PART 2: Who Am I? (WAI)
// ============================================================================
console.log('\n--- Compiling WAI ---');

const seedWai = WAI.slice(0, 20);
const seedNames = new Set(seedWai.map((r) => r[5].toLowerCase()));

// Build clean, recognizable distractor pools
const otPeoplePool: string[] = [];
const ntPeoplePool: string[] = [];
const otPlacesPool: string[] = [];
const ntPlacesPool: string[] = [];

const EXCLUDED_PEOPLE = new Set([
  'god', 'jesus', 'christ', 'holy spirit', 'israel', 'genealogy of jesus',
  'angel', 'satan', 'devil', 'lucifer', 'michael', 'gabriel', 'lord'
]);

function isCleanProperName(name: string): boolean {
  if (!name || name.length < 3 || name.length > 20) return false;
  if (!/^[A-Z][a-zA-Z' -]{2,19}$/.test(name)) return false;
  if (name.includes('(') || name.includes(';') || name.includes('_')) return false;
  if (/\b(?:of|in|the|and|son|daughter|man|giant|king|wife)\b/i.test(name)) return false;
  if (/ite$|ites$|im$/i.test(name)) return false;
  return true;
}

for (const p of ds.personMap.values()) {
  const name = p.name?.trim();
  if (!name || p.isProperName === false || !isCleanProperName(name)) continue;
  if (EXCLUDED_PEOPLE.has(name.toLowerCase())) continue;
  if ((p.verseCount ?? 0) < 8) continue;
  const isNt = (p.verses ?? []).some((vId) => ds.verseById.get(vId)?.testament === 'NT');
  if (isNt) {
    if (!ntPeoplePool.includes(name)) ntPeoplePool.push(name);
  } else {
    if (!otPeoplePool.includes(name)) otPeoplePool.push(name);
  }
}

for (const pl of ds.placeMap.values()) {
  const name = pl.displayTitle?.trim();
  if (!name || !/^[A-Z][a-zA-Z' -]{2,22}$/.test(name)) continue;
  if (name.includes('(') || name.includes(';') || name.includes('_')) continue;
  if ((pl.verseCount ?? 0) < 5) continue;
  const isNt = (pl.verses ?? []).some((vId) => ds.verseById.get(vId)?.testament === 'NT');
  if (isNt) {
    if (!ntPlacesPool.includes(name)) ntPlacesPool.push(name);
  } else {
    if (!otPlacesPool.includes(name)) otPlacesPool.push(name);
  }
}

// Deterministically shuffle distractor pools so picks span the whole alphabet
for (const pool of [otPeoplePool, ntPeoplePool, otPlacesPool, ntPlacesPool]) {
  pool.sort((a, b) => hashStr(a) - hashStr(b));
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolvePersonDisplayName(personId: string): string | undefined {
  const rel = ds.personMap.get(personId);
  if (!rel || !rel.name || rel.isProperName === false) return undefined;
  const cleaned = rel.name.replace(/\s*\(\d+\)$/, '').replace(/_\d+$/, '').trim();
  if (!cleaned || cleaned.includes('(') || /^[a-z]/.test(cleaned) || /^the /i.test(cleaned)) {
    return undefined;
  }
  if (/ite$|ites$|im$/i.test(cleaned)) return undefined;
  // Map Jacob's title "Israel" cleanly to "Jacob" in parent/relative refs
  if (cleaned.toLowerCase() === 'israel') return 'Jacob';
  return cleaned;
}

const ETYMOLOGY_PREFIX_RE =
  /^[A-Z][a-zA-Z' -]{1,28},\s+(?=(?:(?:a|an|the)\s+)?(?:first|second|third|fourth|fifth|eldest|youngest|only|one|son|daughter|child|father|mother|brother|sister|wife|husband|widow|king|queen|prophet|prophetess|priest|high priest|apostle|disciple|captain|ruler|judge|commander|governor|leader|warrior|servant|shepherd|city|town|village|mountain|hill|valley|river|region|country|land)\b)/;

const ROLE_LEAD_RE =
  /^(?:(?:a|an|the)\s+)?(?:first|second|third|fourth|fifth|eldest|youngest|son|daughter|child|father|mother|brother|sister|wife|husband|widow|king|queen|prophet|prophetess|priest|high priest|apostle|disciple|captain|ruler|judge|commander|governor|leader|warrior|servant|shepherd|city|town|village|mountain|hill|valley|river|region|country)\b/i;

function stripEtymologyGloss(s: string): string {
  let out = s.replace(ETYMOLOGY_PREFIX_RE, '').trim();
  // Normalize leading bare role noun: "son of Abijah" -> "the son of Abijah"
  if (/^(?:first|second|third|fourth|eldest|youngest|son|daughter|king|queen|prophet|priest|judge|ruler|commander|captain|wife|husband|city|town|mountain|river)\b/i.test(out)) {
    out = 'the ' + out[0].toLowerCase() + out.slice(1);
  }
  return out;
}

function preprocessEastonText(raw: string): string[] {
  if (!raw) return [];
  let text = ascii(raw)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\b(?:1|2|3)?\s*[A-Z][a-z]+\.\s*\d+(?::\d+(?:-\d+)?)?/g, ' ')
    .replace(/\b(?:ch|chap|ver|vv|v)\.\s*\d+(?::\d+)?/gi, ' ')
    .replace(/\bi\.e\./gi, 'that is')
    .replace(/\be\.g\./gi, 'for example')
    .replace(/\bq\.v\./gi, '')
    .replace(/\bB\.C\./g, 'BC')
    .replace(/\bA\.D\./g, 'AD')
    .replace(/\bcomp\./gi, '')
    .replace(/\bHeb\./g, '')
    .replace(/\bGr\./g, '')
    .replace(/\bLat\./g, '')
    .replace(/\bSt\./g, 'Saint')
    .replace(/\s+/g, ' ')
    .trim();

  return text.split(/(?<=[.!?])\s+/);
}

const BAD_EASTON_WORDS = [
  'rendering', 'etymology', 'meaning', 'signifies', 'translated',
  'derived', 'spelled', 'pronounced', 'called also', 'abbreviation',
  'spelt', 'margin', 'circumstances', 'tradition', 'account',
  'legend', 'discrepancy', 'originally called', 'signifying', 'literal',
];

function hasNameLeak(s: string, name: string, extraAliases: string[]): boolean {
  const lower = s.toLowerCase();
  if (lower.includes(name.toLowerCase())) return true;
  for (const a of extraAliases) {
    if (a.length >= 4 && new RegExp(`\\b${escapeRe(a)}`, 'i').test(s)) return true;
  }
  for (const part of name.split(/[\s,'’]+/)) {
    if (part.length >= 4 && lower.includes(part.toLowerCase())) return true;
  }
  return false;
}

function cleanEastonSentences(
  raw: string,
  name: string,
  extraAliases: string[],
  isPlace = false
): string[] {
  const rawSentences = preprocessEastonText(raw);
  const clean: string[] = [];

  for (let s of rawSentences) {
    s = s.replace(/^[^a-zA-Z]+/, '').trim();
    if (s.length < 24 || s.length > 145) continue;
    if (!/[a-zA-Z]{4,}/.test(s) || /^\d/.test(s)) continue;
    if (BAD_EASTON_WORDS.some((w) => s.toLowerCase().includes(w))) continue;

    // 1. Strip headword at the very start of the sentence if present
    s = s.replace(new RegExp(`^${escapeRe(name)}[.,:;\\s]+`, 'i'), '').trim();
    // 2. Strip Easton's leading Hebrew etymology gloss ("Physician, son of...")
    s = stripEtymologyGloss(s);

    // 3. Rewrite appositive copula ("the son of Abijah, was the third king...") cleanly
    if (!isPlace && ROLE_LEAD_RE.test(s)) {
      const appMatch = s.match(/^([^,]{8,75}),\s+(was|became|ruled|reigned)\s+(.*)$/i);
      if (appMatch) {
        const rhs = appMatch[1][0].toLowerCase() + appMatch[1].slice(1);
        s = `I was ${rhs}, and I ${appMatch[2].toLowerCase()} ${appMatch[3]}`;
      } else if (!/\b(?:was|is|were|are|became)\b/i.test(s)) {
        s = `I was ${s[0].toLowerCase() + s.slice(1)}`;
      }
    } else if (!isPlace && /^One of the\b/i.test(s) && !/\b(?:was|is|were|are)\b/i.test(s)) {
      s = `I was ${s[0].toLowerCase() + s.slice(1)}`;
    } else if (isPlace && ROLE_LEAD_RE.test(s)) {
      const appMatch = s.match(/^([^,]{6,75}),\s+(was|became|stood|lay)\s+(.*)$/i);
      if (appMatch) {
        const rhs = appMatch[1][0].toLowerCase() + appMatch[1].slice(1);
        s = `This place was ${rhs}, and it ${appMatch[2].toLowerCase()} ${appMatch[3]}`;
      } else if (!/\b(?:was|is|were|are|became)\b/i.test(s)) {
        s = `This place was ${s[0].toLowerCase() + s.slice(1)}`;
      }
    }

    // 4. Only rewrite subject-position Name + Verb -> I + Verb; convert possessive Name's -> my
    s = s.replace(new RegExp(`\\b${escapeRe(name)}'s\\b`, 'gi'), 'my');
    s = s.replace(
      new RegExp(
        `^${escapeRe(name)}\\s+(was|is|had|became|ruled|reigned|led|built|fought|went|came|called|sent|took|gave|made|died|lived|spoke|prayed|warned|served|married|stood|wrote|fled|preached|helped)\\b`,
        'i'
      ),
      isPlace ? 'This site $1' : 'I $1'
    );

    // Fix sentence-initial 3rd person pronouns to 1st person (for people only)
    if (!isPlace) {
      s = s
        .replace(/^He (was|had|became|remained|served|died|escaped|ruled|reigned|lived|went|came|led|fought|married|sent|wrote|built)\b/i, 'I $1')
        .replace(/^She (was|had|became|remained|served|died|escaped|ruled|reigned|lived|went|came|led|fought|married|sent|wrote|built)\b/i, 'I $1')
        .replace(/^He is\b/i, 'I am')
        .replace(/^She is\b/i, 'I am')
        .replace(/^His\b/, 'My')
        .replace(/^Her\b/, 'My')
        .replace(/\bhis\b/g, 'my')
        .replace(/\bher\b/g, 'my')
        .replace(/\bhim\b/g, 'me');
    }

    // Drop fragmented subjectless starts or leftover 3rd person / broken I-replacements
    if (/^(?:He|She|They|It|We|There|Has|Had|Was|Is|Were|Are|Seems|Called|Mentioned)\b/i.test(s)) continue;
    if (/^(?:I|My)\s*[,.;:]/.test(s)) continue;
    if (/\b(?:called|named|the|a|an|of|to|for|from|with|by|in|at|as|into|against|before|after|upon)\s+I\b/i.test(s)) continue;
    if (/\bI\s+(?:of|at|from)\b/i.test(s)) continue;
    if (/-\d+/.test(s)) continue;
    if (/\b(?:in|at|from|by|to|with|of|for|as|and|or|the|a|an)\s*[-.]?$/i.test(s)) continue;

    // Normalize father "Israel" inside dictionary text where possible
    s = s.replace(/\bson of Israel and\b/gi, 'son of Jacob and');

    s = s.replace(/\s*([,.;:!?])\s*[,.;:!?]+/g, '$1').replace(/\s+([,.;:!?])/g, '$1').trim();
    if (s.length < 22 || s.length > 145) continue;
    if (!/[.!?]$/.test(s)) s += '.';
    s = s[0].toUpperCase() + s.slice(1);

    if (!hasNameLeak(s, name, extraAliases)) {
      clean.push(s);
    }
  }
  return clean;
}

const ROLE_OF =
  /^(?:the\s+|a\s+|an\s+)?(?:eldest\s+|youngest\s+|first-born\s+|first\s+|second\s+|third\s+|fourth\s+|fifth\s+|high\s+)?(?:son|daughter|child|father|mother|brother|sister|king|queen|priest|prophet|prophetess|judge|apostle|disciple|warrior|mighty man|servant|patriarch|leader|ruler|governor|shepherd|pharisee|sadducee|levite|captain|officer|follower|companion|wife|husband|widow|herald)\s+(?:of|in|to)\b/i;

function extractCleanEastonSummary(raw: string, name: string): string | null {
  const parts = preprocessEastonText(raw);
  for (let s of parts) {
    s = s.replace(/^[^a-zA-Z]+/, '').trim();
    if (s.length < 20 || s.length > 120) continue;
    if (/^\d/.test(s)) continue;
    if (/^(?:He|She|They|It|This|When|Till|While|After|Before|We|There)\b/i.test(s)) continue;
    if (BAD_EASTON_WORDS.some((w) => s.toLowerCase().includes(w))) continue;

    s = s.replace(new RegExp(`^${escapeRe(name)}[.,:;\\s]+`, 'i'), '').trim();
    s = stripEtymologyGloss(s);
    const appMatch = s.match(/^([^,]{8,70}),\s+(was|became|ruled|reigned)\s+(.*)$/i);
    if (appMatch) {
      s = `${appMatch[1]} who ${appMatch[2].toLowerCase()} ${appMatch[3]}`;
    } else {
      s = s.replace(/^was\s+/i, '').replace(/^is\s+/i, '');
    }
    s = s.replace(/\s+([,.;:!?])/g, '$1').trim();

    if (!ROLE_OF.test(s)) continue;
    if (/\b(?:was|is|were|are|became)\b/i.test(s) && !/^[^,]+who\b/i.test(s)) continue;
    if (/\b(?:in|to|with|by|of|for|at|from|that|as|into|upon|against)\s*$/i.test(s)) continue;
    if (s.toLowerCase().includes(name.toLowerCase())) continue;

    if (s.length >= 15 && s.length <= 120 && !/^[,\s]/.test(s)) {
      return s.replace(/[.!?:;]+$/, '');
    }
  }
  return null;
}

function buildUniquePersonStory(
  name: string,
  p: any,
  ref: string,
  books: string[],
  testament: 'OT' | 'NT' | 'both'
): string {
  const father = p.father?.[0] ? resolvePersonDisplayName(p.father[0]) : undefined;
  const mother = p.mother?.[0] ? resolvePersonDisplayName(p.mother[0]) : undefined;
  const partner = p.partners?.[0] ? resolvePersonDisplayName(p.partners[0]) : undefined;
  const tribeRaw = p.memberOf?.[0] ? ds.groupMap.get(p.memberOf[0])?.groupName : undefined;
  const tribe =
    tribeRaw &&
    !tribeRaw.includes('(') &&
    !tribeRaw.toLowerCase().includes('genealogy') &&
    !tribeRaw.toLowerCase().includes('people of the')
      ? tribeRaw.toLowerCase().startsWith('tribe of')
        ? tribeRaw
        : 'the ' + tribeRaw
      : undefined;

  const summary = extractCleanEastonSummary(p.dictText?.[0] || p.dictionaryText || '', name);
  if (summary && !summary.toLowerCase().includes(name.toLowerCase())) {
    const lead = summary[0].toLowerCase() + summary.slice(1);
    return `${name} was ${lead} (${ref}).`;
  }

  const childNoun = p.gender === 'Female' ? 'daughter' : 'son';
  if (father && father.toLowerCase() !== name.toLowerCase()) {
    if (mother && mother.toLowerCase() !== name.toLowerCase()) {
      return `${name} was the ${childNoun} of ${father} and ${mother}, recorded in ${books[0] || 'Scripture'} (${ref}).`;
    }
    return `${name} was the ${childNoun} of ${father}, appearing in ${books[0] || 'Scripture'} (${ref}).`;
  }
  if (partner && partner.toLowerCase() !== name.toLowerCase()) {
    return `${name} was married to ${partner} in the narrative of ${books[0] || 'Scripture'} (${ref}).`;
  }
  if (tribe) {
    return `${name} belonged to ${tribe}, mentioned in ${books[0] || 'Scripture'} (${ref}).`;
  }
  if (books.length > 1) {
    return `${name} is a biblical figure appearing in ${books[0]} and ${books[1]} (${ref}).`;
  }
  return `${name} is a figure from the ${testament === 'NT' ? 'New Testament' : 'Old Testament'} recorded in ${books[0] || 'Scripture'} (${ref}).`;
}

function buildUniquePlaceStory(
  name: string,
  pl: any,
  ref: string,
  books: string[],
  visitors: string[]
): string {
  const feat = pl.featureType ? pl.featureType.toLowerCase() : undefined;
  if (visitors.length > 0 && feat) {
    return `${name} was a ${feat} visited by ${visitors.join(' and ')}, featured in ${books[0] || 'Scripture'} (${ref}).`;
  }
  if (feat) {
    return `${name} was a ${feat} in biblical geography, featured in ${books[0] || 'Scripture'} (${ref}).`;
  }
  if (visitors.length > 0) {
    return `${name} was a biblical place connected with ${visitors.join(' and ')} in ${books[0] || 'Scripture'} (${ref}).`;
  }
  return `${name} was an ancient biblical site recorded in ${books[0] || 'Scripture'} (${ref}).`;
}

function pickDistractors(pool: string[], name: string, count = 5, seed = 0): string[] {
  const nameTokens = name
    .toLowerCase()
    .split(/[\s,'’]+/)
    .filter((w) => w.length >= 4);
  const available = pool.filter((item) => {
    const il = item.toLowerCase();
    if (il === name.toLowerCase() || il.includes(name.toLowerCase()) || name.toLowerCase().includes(il)) {
      return false;
    }
    if (nameTokens.some((t) => il.includes(t))) return false;
    return true;
  });
  const chosen: string[] = [];
  let idx = Math.abs(seed);
  let steps = 0;
  while (chosen.length < count && chosen.length < available.length && steps < available.length * 2) {
    const candidate = available[idx % available.length];
    if (!chosen.includes(candidate)) {
      chosen.push(candidate);
    }
    idx += 7;
    steps++;
  }
  return chosen;
}

const generatedWaiRows: WaiRow[] = [];
const TARGET_WAI_TOTAL = 505;
const NEEDED_WAI = TARGET_WAI_TOTAL - seedWai.length;
const emittedWaiNames = new Set(seedNames);

// 0. Emit ALL curated household-name Easy ('e'/'kya') and Medium ('m'/'ya') items first
for (const c of CURATED_WAI_BANK) {
  if (emittedWaiNames.has(c.name.toLowerCase())) continue;
  const row = sanitizeCuratedAnswerLeaks(c, ds.verseByRef);
  if (row) {
    generatedWaiRows.push(row);
    emittedWaiNames.add(c.name.toLowerCase());
  }
}
console.log(`Emitted ${generatedWaiRows.length} curated WAI rows (Easy + curated Medium).`);

function pickTemplated<T>(arr: T[], seed: string): T {
  return arr[hashStr(seed) % arr.length];
}

function buildEventClue(evTitle: string, name: string, extraAliases: string[], seed: string): string | null {
  const title = evTitle.trim();
  if (!title || title.length < 10 || title.length > 75) return null;
  if (/^(?:Lifetime|Birth|Death) of /i.test(title)) return null;

  // Replace leading "<Name>'s X" cleanly
  const possRe = new RegExp(`^${escapeRe(name)}'s\\s+(.+)$`, 'i');
  const pm = title.match(possRe);
  if (pm && !hasNameLeak(pm[1], name, extraAliases)) {
    return pickTemplated(
      [
        `One memorable turning point in Scripture records my ${pm[1].toLowerCase()}.`,
        `A key event tied to my life is remembered as my ${pm[1].toLowerCase()}.`,
      ],
      seed
    );
  }

  // Event mentioning someone else or not leaking my name
  if (!hasNameLeak(title, name, extraAliases)) {
    return pickTemplated(
      [
        `I appear directly in the biblical event: "${title}."`,
        `Scripture links my life to the episode "${title}."`,
        `When "${title}" unfolded, I was part of the story.`,
      ],
      seed
    );
  }

  // Mask subject name inside quoted timeline title cleanly
  const masked = title.replace(new RegExp(`\\b${escapeRe(name)}\\b`, 'gi'), '___');
  if (masked.includes('___') && !hasNameLeak(masked, name, extraAliases)) {
    return `In Bible timelines, I fill in the blank for this event: "${masked}."`;
  }
  return null;
}

function buildMaskedVerseClue(
  vMatches: Array<{ text: string; ref: string }>,
  name: string,
  extraAliases: string[],
  seed: string
): string | null {
  const sortedVerses = [...vMatches]
    .filter(
      (v) =>
        v.text.length >= 45 &&
        v.text.length <= 130 &&
        !/begat|sons of|were numbered|thousand and/i.test(v.text)
    )
    .sort((a, b) => hashStr(a.ref + seed) - hashStr(b.ref + seed));

  for (const v of sortedVerses) {
    const exactMatches = v.text.match(new RegExp(`\\b${escapeRe(name)}\\b`, 'gi'));
    if (!exactMatches || exactMatches.length !== 1) continue;
    const masked = v.text.replace(new RegExp(`\\b${escapeRe(name)}\\b`, 'i'), '___').replace(/[,:;]+\s*$/, '.');
    if (!hasNameLeak(masked, name, extraAliases)) {
      return `A Bible verse describing me reads: "${masked}"`;
    }
  }
  return null;
}

// 1. Process Programmatic People candidates sorted by verseCount descending (STRICTLY 'm' or 'h', NEVER 'e')
const sortedPeople = Array.from(ds.personMap.values())
  .filter((p) => {
    const name = p.name?.trim();
    if (!name || p.isProperName === false || !isCleanProperName(name)) return false;
    if (EXCLUDED_PEOPLE.has(name.toLowerCase())) return false;
    return (p.verseCount ?? 0) >= 3;
  })
  .sort((a, b) => (b.verseCount ?? 0) - (a.verseCount ?? 0));

const targetAfterPeople = NEEDED_WAI - 95; // leave room for ~95 Medium/Hard places
for (const p of sortedPeople) {
  if (generatedWaiRows.length >= targetAfterPeople) break;
  const name = p.name.trim();
  if (emittedWaiNames.has(name.toLowerCase())) continue;

  const vMatches = (p.verses ?? [])
    .map((vId) => ds.verseById.get(vId))
    .filter((iv): iv is NonNullable<typeof iv> => Boolean(iv));
  if (vMatches.length === 0) continue;

  const mentionVerse = vMatches.find((iv) => iv.text.toLowerCase().includes(name.toLowerCase()));
  const anchorVerse = mentionVerse || vMatches[0];
  const ref = anchorVerse.ref;

  const otCount = vMatches.filter((iv) => iv.testament === 'OT').length;
  const ntCount = vMatches.filter((iv) => iv.testament === 'NT').length;
  let testament: 'OT' | 'NT' | 'both';
  if (otCount > 0 && ntCount === 0) testament = 'OT';
  else if (ntCount > 0 && otCount === 0) testament = 'NT';
  else if (otCount >= 3 * ntCount) testament = 'OT';
  else if (ntCount >= 3 * otCount) testament = 'NT';
  else testament = 'both';

  const books = Array.from(new Set(vMatches.map((iv) => iv.bookName)));
  const extraAliases = (p.alsoCalled ?? '')
    .split(/[,;/]+/)
    .map((x) => x.trim().toLowerCase())
    .filter((x) => x.length >= 4);

  // Collect varied, natural candidate clues (zero repetitive boilerplate!)
  const candidateClues: string[] = [];

  // Slot A: Varied Scripture context
  if (books.length === 1) {
    candidateClues.push(
      pickTemplated(
        [
          `You can read my story in the book of ${books[0]}.`,
          `Readers encounter me during the events of ${books[0]}.`,
          `Turn to ${books[0]} to find my role in Scripture.`,
          `My story unfolds inside the pages of ${books[0]}.`,
        ],
        name + 'book1'
      )
    );
  } else if (books.length > 1) {
    candidateClues.push(
      pickTemplated(
        [
          `You can find my name in ${books[0]} as well as ${books[1]}.`,
          `Events involving me stretch across ${books[0]} and ${books[1]}.`,
          `Look in ${books[0]} to see where my story begins before continuing in ${books[1]}.`,
          `Several biblical books mention me, including ${books[0]} and ${books[1]}.`,
        ],
        name + 'book2'
      )
    );
  }

  // Slot B: Places (birthPlace / deathPlace) or non-clumped Tribe heritage
  const birthPl = p.birthPlace?.[0] ? ds.placeMap.get(p.birthPlace[0])?.displayTitle : undefined;
  const deathPl = p.deathPlace?.[0] ? ds.placeMap.get(p.deathPlace[0])?.displayTitle : undefined;
  const tribeRaw = p.memberOf?.[0] ? ds.groupMap.get(p.memberOf[0])?.groupName : undefined;
  const childNoun = p.gender === 'Female' ? 'daughter' : 'son';

  if (birthPl && !birthPl.includes('(')) {
    candidateClues.push(
      pickTemplated(
        [
          `My origins trace back to ${birthPl}.`,
          `I hailed from the region of ${birthPl}.`,
        ],
        name + 'bpl'
      )
    );
  } else if (deathPl && !deathPl.includes('(')) {
    candidateClues.push(
      pickTemplated(
        [
          `The end of my life took place near ${deathPl}.`,
          `My earthly story closed at ${deathPl}.`,
        ],
        name + 'dpl'
      )
    );
  } else if (
    tribeRaw &&
    !tribeRaw.includes('(') &&
    !tribeRaw.toLowerCase().includes('genealogy') &&
    !tribeRaw.toLowerCase().includes('people of the') &&
    (!/tribe of judah/i.test(tribeRaw) || hashStr(name) % 3 === 0)
  ) {
    const tribeClean = tribeRaw.replace(/^Tribe of\s+/i, '');
    if (tribeClean.toLowerCase() !== name.toLowerCase()) {
      candidateClues.push(
        pickTemplated(
          [
            `Among Israel's twelve tribes, my family belonged to ${tribeClean}.`,
            `My ancestry came from the tribe of ${tribeClean}.`,
            `I traced my heritage back to the tribe of ${tribeClean}.`,
          ],
          name + 'trb'
        )
      );
    }
  }

  // Slot C: Family connections (at most 1-2 early family clues so Events/Easton/Verse always fit!)
  const father = p.father?.[0] ? resolvePersonDisplayName(p.father[0]) : undefined;
  const mother = p.mother?.[0] ? resolvePersonDisplayName(p.mother[0]) : undefined;
  const partner = p.partners?.[0] ? resolvePersonDisplayName(p.partners[0]) : undefined;
  const child = p.children?.[0] ? resolvePersonDisplayName(p.children[0]) : undefined;
  const sibling = p.siblings?.[0] ? resolvePersonDisplayName(p.siblings[0]) : undefined;

  const extraRelClues: string[] = [];
  let primaryRelAdded = false;
  if (partner && partner.toLowerCase() !== name.toLowerCase()) {
    const c = pickTemplated(
      [
        `I was married to ${partner}.`,
        `${partner} and I shared life together as husband and wife.`,
      ],
      name + 'prt'
    );
    if (!primaryRelAdded) { candidateClues.push(c); primaryRelAdded = true; }
    else extraRelClues.push(c);
  }
  if (father && father.toLowerCase() !== name.toLowerCase()) {
    const c = pickTemplated(
      [
        `${father} was my father.`,
        `I grew up as the ${childNoun} of ${father}.`,
        `Scripture identifies me as ${father}'s ${childNoun}.`,
      ],
      name + 'fth'
    );
    if (!primaryRelAdded) { candidateClues.push(c); primaryRelAdded = true; }
    else extraRelClues.push(c);
  } else if (mother && mother.toLowerCase() !== name.toLowerCase()) {
    const c = `My mother's name in Scripture was ${mother}.`;
    if (!primaryRelAdded) { candidateClues.push(c); primaryRelAdded = true; }
    else extraRelClues.push(c);
  }
  if (child && child.toLowerCase() !== name.toLowerCase()) {
    extraRelClues.push(
      pickTemplated(
        [
          `I raised a child named ${child} in Scripture.`,
          `Among my children named in the Bible was ${child}.`,
        ],
        name + 'cld'
      )
    );
  }
  if (sibling && sibling.toLowerCase() !== name.toLowerCase()) {
    extraRelClues.push(`${sibling} and I were siblings.`);
  }

  // Slot D: Concrete Biblical Events (p.events)
  for (const eId of (p.events ?? []).slice(0, 3)) {
    const ev = ds.eventMap.get(eId);
    if (ev?.title) {
      const ec = buildEventClue(ev.title, name, extraAliases, name + eId);
      if (ec) candidateClues.push(ec);
    }
  }

  // Slot E: Clean Easton Dictionary Sentences (most descriptive -> later in order)
  const cleanSentences = cleanEastonSentences(
    p.dictText?.[0] || p.dictionaryText || '',
    name,
    extraAliases,
    false
  );
  for (const s of cleanSentences.slice(0, 2)) {
    candidateClues.push(s);
  }

  // Slot F: Dramatic Masked Verse Quote
  const verseClue = buildMaskedVerseClue(vMatches, name, extraAliases, name);
  if (verseClue) candidateClues.push(verseClue);

  // Backfill remaining Slots with secondary relatives or extra Easton lines only if needed
  for (const rc of extraRelClues) candidateClues.push(rc);
  for (const s of cleanSentences.slice(2)) candidateClues.push(s);

  // Deduplicate & check anti-leak strictly across all candidateClues (also avoid repeating the same relative twice!)
  const usedRelTokens = new Set<string>();
  const relCandidates = [father, mother, partner, child, sibling].filter((x): x is string => Boolean(x && x.length >= 4));
  const finalClues: string[] = [];
  for (const clue of candidateClues) {
    if (clue.length < 10) continue;
    if (hasNameLeak(clue, name, extraAliases)) continue;

    // Avoid two clues naming the exact same parent/relative (e.g. "Jacob was my father" + "fifth son of Jacob")
    const relHit = relCandidates.find((r) => new RegExp(`\\b${escapeRe(r)}\\b`, 'i').test(clue));
    if (relHit && usedRelTokens.has(relHit.toLowerCase())) continue;

    const hasOverlap = finalClues.some(
      (existing) =>
        existing.toLowerCase().includes(clue.toLowerCase()) ||
        clue.toLowerCase().includes(existing.toLowerCase())
    );
    if (!hasOverlap) {
      finalClues.push(clue);
      if (relHit) usedRelTokens.add(relHit.toLowerCase());
      if (finalClues.length === 5) break;
    }
  }

  // Require 5 genuine clues without dumping repetitive fallback fluff!
  if (finalClues.length !== 5) continue;

  const story = buildUniquePersonStory(name, p, ref, books, testament);
  if (story.length < 15) continue;
  if (finalClues.some((c) => story.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(story.toLowerCase()))) {
    continue;
  }

  const pool = testament === 'NT' ? ntPeoplePool : otPeoplePool;
  const distractors = pickDistractors(pool, name, 5, generatedWaiRows.length);
  if (distractors.length !== 5) continue;
  if (new Set([name, ...distractors]).size !== 6) continue;

  const id = `gen-wai-${generatedWaiRows.length + 1}`;
  const vc = p.verseCount ?? 0;
  // Strictly 'm' or 'h' for programmatic people: 100% of Easy ('e') comes from curated household-name bank!
  const d: 'm' | 'h' = vc >= 18 ? 'm' : 'h';
  const aud = 'ya';

  const row: WaiRow = [id, d, aud, testament, ref, name, finalClues, distractors, story];
  generatedWaiRows.push(row);
  emittedWaiNames.add(name.toLowerCase());
}

// 2. Process Programmatic Place candidates sorted by verseCount descending (STRICTLY 'm' or 'h', NEVER 'e')
const sortedPlaces = Array.from(ds.placeMap.values())
  .filter((pl) => {
    const name = pl.displayTitle?.trim();
    if (!name || !/^[A-Z][a-zA-Z' -]{2,22}$/.test(name)) return false;
    if (name.includes('(') || name.includes(';') || name.includes('_')) return false;
    return (pl.verseCount ?? 0) >= 3;
  })
  .sort((a, b) => (b.verseCount ?? 0) - (a.verseCount ?? 0));

for (const pl of sortedPlaces) {
  if (generatedWaiRows.length >= NEEDED_WAI) break;
  const name = pl.displayTitle.trim();
  if (emittedWaiNames.has(name.toLowerCase())) continue;

  const vMatches = (pl.verses ?? [])
    .map((vId) => ds.verseById.get(vId))
    .filter((iv): iv is NonNullable<typeof iv> => Boolean(iv));
  if (vMatches.length === 0) continue;

  const mentionVerse = vMatches.find((iv) => iv.text.toLowerCase().includes(name.toLowerCase()));
  const anchorVerse = mentionVerse || vMatches[0];
  const ref = anchorVerse.ref;

  const otCount = vMatches.filter((iv) => iv.testament === 'OT').length;
  const ntCount = vMatches.filter((iv) => iv.testament === 'NT').length;
  let testament: 'OT' | 'NT' | 'both';
  if (otCount > 0 && ntCount === 0) testament = 'OT';
  else if (ntCount > 0 && otCount === 0) testament = 'NT';
  else if (otCount >= 3 * ntCount) testament = 'OT';
  else if (ntCount >= 3 * otCount) testament = 'NT';
  else testament = 'both';

  const books = Array.from(new Set(vMatches.map((iv) => iv.bookName)));
  const candidateClues: string[] = [];

  if (pl.featureType) {
    candidateClues.push(
      pickTemplated(
        [
          `On biblical maps, I am identified as a ${pl.featureType.toLowerCase()}.`,
          `Travelers knew this site as an important ${pl.featureType.toLowerCase()}.`,
        ],
        name + 'ft'
      )
    );
  } else {
    candidateClues.push(`I am a historic biblical landmark named across Scripture.`);
  }

  if (books.length === 1) {
    candidateClues.push(
      pickTemplated(
        [
          `Events at my location are described in the book of ${books[0]}.`,
          `Readers come across this place in ${books[0]}.`,
        ],
        name + 'plb1'
      )
    );
  } else if (books.length > 1) {
    candidateClues.push(
      pickTemplated(
        [
          `Multiple books mention me, including ${books[0]} and ${books[1]}.`,
          `My story spans scenes recorded in ${books[0]} and ${books[1]}.`,
        ],
        name + 'plb2'
      )
    );
  }

  const visitors = Array.isArray(pl.hasBeenHere)
    ? pl.hasBeenHere
        .slice(0, 2)
        .map((pId) => resolvePersonDisplayName(pId))
        .filter((n): n is string => Boolean(n))
    : [];
  if (visitors.length > 0) {
    candidateClues.push(
      pickTemplated(
        [
          `Well-known figures including ${visitors.join(' and ')} spent time here.`,
          `Scripture records ${visitors.join(' and ')} traveling through this place.`,
        ],
        name + 'vis'
      )
    );
  }

  const cleanSentences = cleanEastonSentences(
    pl.dictText?.[0] || pl.dictionaryText || pl.comment || '',
    name,
    [],
    true
  );
  for (const s of cleanSentences) {
    candidateClues.push(s);
  }

  const verseClue = buildMaskedVerseClue(vMatches, name, [], name + 'pv');
  if (verseClue) candidateClues.push(verseClue);

  const finalClues: string[] = [];
  for (const clue of candidateClues) {
    if (clue.length < 10) continue;
    if (hasNameLeak(clue, name, [])) continue;

    const hasOverlap = finalClues.some(
      (existing) =>
        existing.toLowerCase().includes(clue.toLowerCase()) ||
        clue.toLowerCase().includes(existing.toLowerCase())
    );
    if (!hasOverlap) {
      finalClues.push(clue);
      if (finalClues.length === 5) break;
    }
  }

  if (finalClues.length !== 5) continue;

  const story = buildUniquePlaceStory(name, pl, ref, books, visitors);
  if (story.length < 15) continue;
  if (finalClues.some((c) => story.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(story.toLowerCase()))) {
    continue;
  }

  const pool = testament === 'NT' ? ntPlacesPool : otPlacesPool;
  const distractors = pickDistractors(pool, name, 5, generatedWaiRows.length);
  if (distractors.length !== 5) continue;
  if (new Set([name, ...distractors]).size !== 6) continue;

  const id = `gen-wai-${generatedWaiRows.length + 1}`;
  const vc = pl.verseCount ?? 0;
  const d: 'm' | 'h' = vc >= 25 ? 'm' : 'h';
  const aud = 'ya';

  const row: WaiRow = [id, d, aud, testament, ref, name, finalClues, distractors, story];
  generatedWaiRows.push(row);
  emittedWaiNames.add(name.toLowerCase());
}

console.log(
  `Generated WAI rows: ${generatedWaiRows.length} (Easy=${generatedWaiRows.filter((r) => r[1] === 'e').length}, Medium=${generatedWaiRows.filter((r) => r[1] === 'm').length}, Hard=${generatedWaiRows.filter((r) => r[1] === 'h').length}, total with seeds: ${seedWai.length + generatedWaiRows.length})`
);

// ============================================================================
// PART 3: Spot the Wolf (WOLF)
// ============================================================================
console.log('\n--- Compiling WOLF ---');

const seedWolf = WOLF.slice(0, 48);

function isSafeWolfWord(word: string, category: string): boolean {
  if (word.length < 4) return false;
  const w = word.toLowerCase();
  const c = category.toLowerCase();
  if (c.includes(w) || w.includes(c)) return false;

  const forbidden = [
    'spot-the-wolf', 'reveal', 'clues1', 'clues2', 'debate', 'vote', 'round', 'rounds',
    'stage', 'turnorder', 'turnindex', 'clueround', 'player', 'screen', 'nickname',
    'voted', 'accused', 'guessing', 'true', 'false', 'null', 'bot', 'person', 'place',
    'object', 'animal', 'food', 'event', 'book', 'miracle', 'parable', 'title',
    'avatar', 'color', 'kind', 'individual', 'showtop5', 'startedat', 'endsat',
    'duration', 'test', 'data', 'name', 'phase', 'spectator', 'card', 'suspects',
    'canguess', 'myturn', 'myvote', 'mygain', 'mcclues', 'currentturn', 'hint',
    'controls', 'word', 'wolves', 'verse', 'status',
  ];
  for (const f of forbidden) {
    if (f.includes(w)) return false;
  }
  return true;
}

interface ThematicWolfItem {
  word: string;
  category: string;
  aliases: string[];
  lookalike: string;
  ref: string;
  d: 'e' | 'm' | 'h';
}

// Canonical curated verses for thematic entities
const thematicPairs: ThematicWolfItem[] = [
  // Famous Bible People (household names first!)
  { word: 'Jesus Christ', category: 'Person', aliases: ['jesus', 'messiah', 'christ'], lookalike: 'John the Baptist', ref: 'Matthew 1:21', d: 'e' },
  { word: 'Adam', category: 'Person', aliases: ['first man'], lookalike: 'Noah', ref: 'Genesis 2:7', d: 'e' },
  { word: 'Mary', category: 'Person', aliases: ['mother of jesus', 'virgin mary'], lookalike: 'Martha', ref: 'Luke 1:27', d: 'e' },
  { word: 'Abraham', category: 'Person', aliases: ['abram'], lookalike: 'Isaac', ref: 'Genesis 12:2', d: 'e' },
  { word: 'Sarah', category: 'Person', aliases: ['sarai'], lookalike: 'Rebekah', ref: 'Genesis 17:15', d: 'e' },
  { word: 'Isaac', category: 'Person', aliases: [], lookalike: 'Jacob', ref: 'Genesis 22:2', d: 'e' },
  { word: 'Jacob', category: 'Person', aliases: ['israel'], lookalike: 'Esau', ref: 'Genesis 28:12', d: 'e' },
  { word: 'Joseph', category: 'Person', aliases: ['dreamer'], lookalike: 'Benjamin', ref: 'Genesis 37:3', d: 'e' },
  { word: 'Joshua', category: 'Person', aliases: [], lookalike: 'Caleb', ref: 'Joshua 1:9', d: 'e' },
  { word: 'Samuel', category: 'Person', aliases: ['prophet samuel'], lookalike: 'Eli', ref: '1 Samuel 3:10', d: 'e' },
  { word: 'King Saul', category: 'Person', aliases: ['saul'], lookalike: 'King David', ref: '1 Samuel 10:1', d: 'e' },
  { word: 'Jonah', category: 'Person', aliases: [], lookalike: 'Daniel', ref: 'Jonah 1:17', d: 'e' },
  { word: 'John the Baptist', category: 'Person', aliases: ['john'], lookalike: 'Elijah', ref: 'Matthew 3:1', d: 'e' },
  { word: 'Peter', category: 'Person', aliases: ['simon peter'], lookalike: 'Andrew', ref: 'Matthew 16:18', d: 'e' },
  { word: 'Paul', category: 'Person', aliases: ['apostle paul', 'saul of tarsus'], lookalike: 'Barnabas', ref: 'Acts 9:4', d: 'e' },
  { word: 'Judas', category: 'Person', aliases: ['judas iscariot'], lookalike: 'Peter', ref: 'Matthew 26:14', d: 'e' },
  { word: 'Noah', category: 'Person', aliases: [], lookalike: 'Moses', ref: 'Genesis 6:9', d: 'e' },
  { word: 'Aaron', category: 'Person', aliases: [], lookalike: 'Moses', ref: 'Exodus 4:14', d: 'm' },
  { word: 'Miriam', category: 'Person', aliases: [], lookalike: 'Deborah', ref: 'Exodus 15:20', d: 'm' },
  { word: 'Hannah', category: 'Person', aliases: [], lookalike: 'Sarah', ref: '1 Samuel 1:11', d: 'm' },
  { word: 'Elisha', category: 'Person', aliases: [], lookalike: 'Elijah', ref: '2 Kings 2:9', d: 'm' },
  { word: 'Martha', category: 'Person', aliases: [], lookalike: 'Mary', ref: 'Luke 10:38', d: 'e' },
  { word: 'Timothy', category: 'Person', aliases: [], lookalike: 'Titus', ref: '1 Timothy 1:2', d: 'm' },
  { word: 'Stephen', category: 'Person', aliases: [], lookalike: 'Philip', ref: 'Acts 7:59', d: 'm' },
  { word: 'Pontius Pilate', category: 'Person', aliases: ['pilate'], lookalike: 'King Herod', ref: 'Matthew 27:2', d: 'e' },
  { word: 'King Herod', category: 'Person', aliases: ['herod'], lookalike: 'Pharaoh', ref: 'Matthew 2:1', d: 'e' },
  { word: 'Nicodemus', category: 'Person', aliases: [], lookalike: 'Zacchaeus', ref: 'John 3:1', d: 'm' },
  { word: 'Angel', category: 'Person', aliases: ['angel of the lord', 'gabriel'], lookalike: 'Prophet', ref: 'Luke 1:26', d: 'e' },
  { word: 'Prophet', category: 'Person', aliases: ['prophet of god'], lookalike: 'Priest', ref: 'Deuteronomy 18:15', d: 'e' },
  { word: 'Fisherman', category: 'Person', aliases: ['fishers'], lookalike: 'Carpenter', ref: 'Matthew 4:18', d: 'e' },
  { word: 'Carpenter', category: 'Person', aliases: ['builder'], lookalike: 'Shepherd', ref: 'Mark 6:3', d: 'e' },

  // Familiar Bible Places
  { word: 'Garden of Eden', category: 'Place', aliases: ['eden', 'paradise'], lookalike: 'Promised Land', ref: 'Genesis 2:8', d: 'e' },
  { word: 'Egypt', category: 'Place', aliases: ['land of egypt'], lookalike: 'Babylon', ref: 'Exodus 1:1', d: 'e' },
  { word: 'Jerusalem', category: 'Place', aliases: ['zion', 'holy city'], lookalike: 'Bethlehem', ref: 'Psalm 122:6', d: 'e' },
  { word: 'Jordan River', category: 'Place', aliases: ['jordan'], lookalike: 'Nile River', ref: 'Joshua 3:17', d: 'e' },
  { word: 'Mount Sinai', category: 'Place', aliases: ['sinai', 'horeb'], lookalike: 'Mount Carmel', ref: 'Exodus 19:20', d: 'e' },
  { word: 'Sea of Galilee', category: 'Place', aliases: ['galilee'], lookalike: 'Red Sea', ref: 'Matthew 4:18', d: 'e' },
  { word: 'Nazareth', category: 'Place', aliases: [], lookalike: 'Bethlehem', ref: 'Matthew 2:23', d: 'e' },
  { word: 'Walls of Jericho', category: 'Place', aliases: ['jericho'], lookalike: 'Tower of Babel', ref: 'Joshua 6:20', d: 'e' },
  { word: 'Canaan', category: 'Place', aliases: ['promised land'], lookalike: 'Egypt', ref: 'Genesis 12:5', d: 'e' },
  { word: 'Babylon', category: 'Place', aliases: [], lookalike: 'Nineveh', ref: 'Daniel 1:1', d: 'e' },
  { word: 'Nineveh', category: 'Place', aliases: [], lookalike: 'Babylon', ref: 'Jonah 1:2', d: 'e' },
  { word: 'Mount of Olives', category: 'Place', aliases: ['olivet'], lookalike: 'Mount Sinai', ref: 'Luke 22:39', d: 'e' },
  { word: 'Garden of Gethsemane', category: 'Place', aliases: ['gethsemane'], lookalike: 'Mount of Olives', ref: 'Matthew 26:36', d: 'm' },
  { word: 'Golgotha', category: 'Place', aliases: ['calvary'], lookalike: 'Gethsemane', ref: 'John 19:17', d: 'e' },
  { word: 'Sodom and Gomorrah', category: 'Place', aliases: ['sodom'], lookalike: 'Nineveh', ref: 'Genesis 19:24', d: 'e' },
  { word: 'Wilderness', category: 'Place', aliases: ['desert'], lookalike: 'Mountain', ref: 'Exodus 16:1', d: 'e' },

  // Animals
  { word: 'Lion', category: 'Animal', aliases: ['lion of judah'], lookalike: 'Leopard', ref: 'Genesis 49:9', d: 'e' },
  { word: 'Leopard', category: 'Animal', aliases: [], lookalike: 'Lion', ref: 'Isaiah 11:6', d: 'h' },
  { word: 'Sheep', category: 'Animal', aliases: ['the sheep', 'flock'], lookalike: 'Lamb', ref: 'Psalm 79:13', d: 'e' },
  { word: 'Lamb', category: 'Animal', aliases: ['the lamb'], lookalike: 'Sheep', ref: 'John 1:29', d: 'e' },
  { word: 'Goat', category: 'Animal', aliases: ['scapegoat'], lookalike: 'Sheep', ref: 'Leviticus 16:10', d: 'e' },
  { word: 'Donkey', category: 'Animal', aliases: ['ass'], lookalike: 'Camel', ref: 'Numbers 22:28', d: 'e' },
  { word: 'Camel', category: 'Animal', aliases: [], lookalike: 'Donkey', ref: 'Genesis 24:10', d: 'e' },
  { word: 'Horse', category: 'Animal', aliases: ['steed'], lookalike: 'Donkey', ref: 'Revelation 19:11', d: 'e' },
  { word: 'Oxen', category: 'Animal', aliases: ['ox'], lookalike: 'Bull', ref: 'Exodus 21:28', d: 'h' },
  { word: 'Bull', category: 'Animal', aliases: [], lookalike: 'Oxen', ref: 'Leviticus 4:11', d: 'h' },
  { word: 'Eagle', category: 'Animal', aliases: ['the eagle'], lookalike: 'Raven', ref: 'Isaiah 40:31', d: 'e' },
  { word: 'Raven', category: 'Animal', aliases: ['ravens'], lookalike: 'Eagle', ref: '1 Kings 17:6', d: 'h' },
  { word: 'Dove', category: 'Animal', aliases: ['the dove'], lookalike: 'Pigeon', ref: 'Genesis 8:11', d: 'e' },
  { word: 'Pigeon', category: 'Animal', aliases: [], lookalike: 'Dove', ref: 'Leviticus 1:14', d: 'h' },
  { word: 'Serpent', category: 'Animal', aliases: ['snake'], lookalike: 'Viper', ref: 'Genesis 3:1', d: 'e' },
  { word: 'Viper', category: 'Animal', aliases: [], lookalike: 'Serpent', ref: 'Acts 28:3', d: 'h' },
  { word: 'Locust', category: 'Animal', aliases: ['locusts'], lookalike: 'Grasshopper', ref: 'Exodus 10:4', d: 'h' },
  { word: 'Grasshopper', category: 'Animal', aliases: [], lookalike: 'Locust', ref: 'Numbers 13:33', d: 'h' },
  { word: 'Scorpion', category: 'Animal', aliases: ['scorpions'], lookalike: 'Spider', ref: 'Luke 10:19', d: 'h' },
  { word: 'Spider', category: 'Animal', aliases: [], lookalike: 'Scorpion', ref: 'Proverbs 30:28', d: 'h' },
  { word: 'Sparrow', category: 'Animal', aliases: ['sparrows'], lookalike: 'Swallow', ref: 'Matthew 10:29', d: 'm' },
  { word: 'Swallow', category: 'Animal', aliases: [], lookalike: 'Sparrow', ref: 'Psalm 84:3', d: 'h' },
  { word: 'Quail', category: 'Animal', aliases: ['quails'], lookalike: 'Partridge', ref: 'Exodus 16:13', d: 'h' },
  { word: 'Partridge', category: 'Animal', aliases: [], lookalike: 'Quail', ref: '1 Samuel 26:20', d: 'h' },
  { word: 'Leviathan', category: 'Animal', aliases: ['sea creature'], lookalike: 'Behemoth', ref: 'Job 41:1', d: 'h' },
  { word: 'Behemoth', category: 'Animal', aliases: [], lookalike: 'Leviathan', ref: 'Job 40:15', d: 'h' },

  // Foods
  { word: 'Honey', category: 'Food', aliases: ['honeycomb'], lookalike: 'Manna', ref: 'Exodus 16:31', d: 'e' },
  { word: 'Bread', category: 'Food', aliases: ['loaf', 'daily bread'], lookalike: 'Wine', ref: 'Matthew 6:11', d: 'e' },
  { word: 'Wine', category: 'Food', aliases: ['new wine'], lookalike: 'Bread', ref: 'John 2:9', d: 'e' },
  { word: 'Unleavened Bread', category: 'Food', aliases: ['matzah'], lookalike: 'Barley Loaves', ref: 'Exodus 12:8', d: 'h' },
  { word: 'Pomegranates', category: 'Food', aliases: ['pomegranate'], lookalike: 'Figs', ref: 'Numbers 13:23', d: 'h' },
  { word: 'Figs', category: 'Food', aliases: ['fig'], lookalike: 'Pomegranates', ref: 'Numbers 13:23', d: 'e' },
  { word: 'Grapes', category: 'Food', aliases: ['vine'], lookalike: 'Raisins', ref: 'Numbers 13:23', d: 'e' },
  { word: 'Raisins', category: 'Food', aliases: ['dried grapes'], lookalike: 'Grapes', ref: '1 Samuel 25:18', d: 'h' },
  { word: 'Olives', category: 'Food', aliases: ['olive oil'], lookalike: 'Figs', ref: 'Deuteronomy 8:8', d: 'e' },
  { word: 'Barley Loaves', category: 'Food', aliases: ['barley bread'], lookalike: 'Unleavened Bread', ref: 'John 6:9', d: 'h' },
  { word: 'Roasted Grain', category: 'Food', aliases: ['parched grain'], lookalike: 'Lentil Stew', ref: 'Ruth 2:14', d: 'h' },
  { word: 'Lentil Stew', category: 'Food', aliases: ['pottage', 'red stew'], lookalike: 'Roasted Grain', ref: 'Genesis 25:34', d: 'h' },
  { word: 'Bitter Herbs', category: 'Food', aliases: ['herbs'], lookalike: 'Unleavened Bread', ref: 'Exodus 12:8', d: 'h' },
  { word: 'Milk and Honey', category: 'Food', aliases: ['land of milk and honey'], lookalike: 'Butter and Honey', ref: 'Exodus 3:8', d: 'e' },
  { word: 'Butter and Honey', category: 'Food', aliases: [], lookalike: 'Milk and Honey', ref: 'Isaiah 7:15', d: 'h' },
  { word: 'Broiled Fish', category: 'Food', aliases: ['fish'], lookalike: 'Honeycomb', ref: 'Luke 24:42', d: 'h' },
  { word: 'Honeycomb', category: 'Food', aliases: ['honey'], lookalike: 'Broiled Fish', ref: 'Luke 24:42', d: 'h' },
  { word: 'Vinegar', category: 'Food', aliases: ['sour wine'], lookalike: 'Wine', ref: 'Matthew 27:48', d: 'h' },
  { word: 'Cucumbers', category: 'Food', aliases: [], lookalike: 'Melons', ref: 'Numbers 11:5', d: 'h' },
  { word: 'Melons', category: 'Food', aliases: [], lookalike: 'Cucumbers', ref: 'Numbers 11:5', d: 'h' },
  { word: 'Leeks and Onions', category: 'Food', aliases: ['onions'], lookalike: 'Garlic', ref: 'Numbers 11:5', d: 'h' },
  { word: 'Garlic', category: 'Food', aliases: [], lookalike: 'Leeks and Onions', ref: 'Numbers 11:5', d: 'h' },
  { word: 'Almonds', category: 'Food', aliases: ['almond'], lookalike: 'Pistachios', ref: 'Genesis 43:11', d: 'h' },
  { word: 'Pistachios', category: 'Food', aliases: ['nuts'], lookalike: 'Almonds', ref: 'Genesis 43:11', d: 'h' },

  // Objects
  { word: 'Ark of the Covenant', category: 'Object', aliases: ['the ark'], lookalike: 'Stone Tablets', ref: 'Joshua 3:6', d: 'e' },
  { word: 'Table of Shewbread', category: 'Object', aliases: ['shewbread table'], lookalike: 'Ark of the Covenant', ref: 'Exodus 25:23', d: 'h' },
  { word: 'Golden Candlestick', category: 'Object', aliases: ['menorah'], lookalike: 'Altar of Incense', ref: 'Exodus 25:31', d: 'h' },
  { word: 'Altar of Incense', category: 'Object', aliases: ['incense altar'], lookalike: 'Golden Candlestick', ref: 'Exodus 30:1', d: 'h' },
  { word: "Aaron's Rod", category: 'Object', aliases: ['the rod', 'budding rod'], lookalike: "Moses' Staff", ref: 'Numbers 17:8', d: 'm' },
  { word: "Moses' Staff", category: 'Object', aliases: ['staff of god'], lookalike: "Aaron's Rod", ref: 'Exodus 4:2', d: 'e' },
  { word: 'Stone Tablets', category: 'Object', aliases: ['tablets of stone', 'ten commandments'], lookalike: 'Book of the Law', ref: 'Exodus 31:18', d: 'm' },
  { word: 'Book of the Law', category: 'Object', aliases: ['scroll of the law'], lookalike: 'Stone Tablets', ref: 'Joshua 1:8', d: 'h' },
  { word: 'Breastplate of Judgment', category: 'Object', aliases: ['breastplate'], lookalike: 'Golden Ephod', ref: 'Exodus 28:15', d: 'h' },
  { word: 'Golden Ephod', category: 'Object', aliases: ['ephod'], lookalike: 'Breastplate of Judgment', ref: 'Exodus 28:6', d: 'h' },
  { word: 'Urim and Thummim', category: 'Object', aliases: ['lights and perfections'], lookalike: 'Golden Bells', ref: 'Exodus 28:30', d: 'h' },
  { word: 'Golden Bells', category: 'Object', aliases: ['bells of gold'], lookalike: 'Urim and Thummim', ref: 'Exodus 28:33', d: 'h' },
  { word: 'Bronze Serpent', category: 'Object', aliases: ['brass serpent', 'nehushtan'], lookalike: 'Golden Calf', ref: 'Numbers 21:9', d: 'h' },
  { word: "Ram's Horn Trumpet", category: 'Object', aliases: ['shofar', 'ram horn'], lookalike: 'Silver Trumpet', ref: 'Joshua 6:4', d: 'e' },
  { word: 'Silver Trumpet', category: 'Object', aliases: ['two silver trumpets'], lookalike: "Ram's Horn Trumpet", ref: 'Numbers 10:2', d: 'h' },
  { word: 'Sword of Goliath', category: 'Object', aliases: ['sword', 'goliaths sword', 'giant sword'], lookalike: 'Sling of David', ref: '1 Samuel 21:9', d: 'e' },
  { word: 'Spear of Phinehas', category: 'Object', aliases: ['javelin'], lookalike: 'Sword of Goliath', ref: 'Numbers 25:7', d: 'h' },
  { word: 'Sling of David', category: 'Object', aliases: ['sling', 'davids sling', 'slingshot', 'five smooth stones'], lookalike: 'Bow of Jonathan', ref: '1 Samuel 17:40', d: 'e' },
  { word: 'Bow of Jonathan', category: 'Object', aliases: ['jonathan bow'], lookalike: 'Sling of David', ref: '2 Samuel 1:22', d: 'h' },
  { word: 'Crown of Thorns', category: 'Object', aliases: ['thorns'], lookalike: 'Purple Robe', ref: 'Matthew 27:29', d: 'e' },
  { word: 'Purple Robe', category: 'Object', aliases: ['scarlet robe'], lookalike: 'Crown of Thorns', ref: 'John 19:2', d: 'e' },
  { word: 'The Cross', category: 'Object', aliases: ['cross'], lookalike: 'Crown of Thorns', ref: 'Luke 23:26', d: 'e' },
  { word: 'Star of Bethlehem', category: 'Object', aliases: ['star'], lookalike: 'Pillar of Fire', ref: 'Matthew 2:2', d: 'e' },
  { word: 'Altar', category: 'Object', aliases: [], lookalike: 'Temple', ref: 'Genesis 8:20', d: 'e' },
  { word: 'Temple', category: 'Object', aliases: ['solomon temple'], lookalike: 'Tabernacle', ref: '1 Kings 6:1', d: 'e' },
  { word: 'Seamless Tunic', category: 'Object', aliases: ['coat without seam'], lookalike: 'Linen Shroud', ref: 'John 19:23', d: 'h' },
  { word: 'Linen Shroud', category: 'Object', aliases: ['grave clothes'], lookalike: 'Seamless Tunic', ref: 'Matthew 27:59', d: 'h' },
  { word: 'Alabaster Box', category: 'Object', aliases: ['alabaster flask'], lookalike: 'Jar of Ointment', ref: 'Matthew 26:7', d: 'h' },
  { word: 'Jar of Ointment', category: 'Object', aliases: ['spikenard'], lookalike: 'Alabaster Box', ref: 'John 12:3', d: 'h' },
  { word: 'Waterpots of Stone', category: 'Object', aliases: ['six stone jars'], lookalike: 'Bronze Basin', ref: 'John 2:6', d: 'h' },
  { word: 'Millstone', category: 'Object', aliases: ['upper millstone'], lookalike: 'Winnowing Fan', ref: 'Mark 9:42', d: 'h' },
  { word: 'Winnowing Fan', category: 'Object', aliases: ['fan in hand'], lookalike: 'Millstone', ref: 'Matthew 3:12', d: 'h' },
  { word: 'Golden Censer', category: 'Object', aliases: ['censer'], lookalike: 'Silver Basin', ref: 'Leviticus 16:12', d: 'h' },
  { word: "Potter's Vessel", category: 'Object', aliases: ['clay jar'], lookalike: 'Crucible of Silver', ref: 'Jeremiah 19:1', d: 'h' },

  // Books of the Bible
  { word: 'Genesis', category: 'Biblical Book', aliases: [], lookalike: 'Exodus', ref: 'Genesis 1:1', d: 'e' },
  { word: 'Exodus', category: 'Biblical Book', aliases: [], lookalike: 'Leviticus', ref: 'Exodus 1:1', d: 'e' },
  { word: 'Leviticus', category: 'Biblical Book', aliases: [], lookalike: 'Numbers', ref: 'Leviticus 1:1', d: 'h' },
  { word: 'Numbers', category: 'Biblical Book', aliases: [], lookalike: 'Deuteronomy', ref: 'Numbers 1:1', d: 'h' },
  { word: 'Deuteronomy', category: 'Biblical Book', aliases: [], lookalike: 'Joshua', ref: 'Deuteronomy 1:1', d: 'h' },
  { word: 'Joshua', category: 'Biblical Book', aliases: [], lookalike: 'Judges', ref: 'Joshua 1:1', d: 'e' },
  { word: 'Judges', category: 'Biblical Book', aliases: [], lookalike: 'Ruth', ref: 'Judges 1:1', d: 'm' },
  { word: 'Ruth', category: 'Biblical Book', aliases: [], lookalike: 'Esther', ref: 'Ruth 1:1', d: 'm' },
  { word: '1 Samuel', category: 'Biblical Book', aliases: [], lookalike: '2 Samuel', ref: '1 Samuel 1:1', d: 'h' },
  { word: '2 Samuel', category: 'Biblical Book', aliases: [], lookalike: '1 Kings', ref: '2 Samuel 1:1', d: 'h' },
  { word: '1 Kings', category: 'Biblical Book', aliases: [], lookalike: '2 Kings', ref: '1 Kings 1:1', d: 'h' },
  { word: '2 Kings', category: 'Biblical Book', aliases: [], lookalike: '1 Chronicles', ref: '2 Kings 1:1', d: 'h' },
  { word: 'Ezra', category: 'Biblical Book', aliases: [], lookalike: 'Nehemiah', ref: 'Ezra 1:1', d: 'h' },
  { word: 'Nehemiah', category: 'Biblical Book', aliases: [], lookalike: 'Esther', ref: 'Nehemiah 1:1', d: 'h' },
  { word: 'Esther', category: 'Biblical Book', aliases: [], lookalike: 'Ruth', ref: 'Esther 1:1', d: 'e' },
  { word: 'Book of Job', category: 'Biblical Book', aliases: ['job'], lookalike: 'Psalms', ref: 'Job 1:1', d: 'm' },
  { word: 'Psalms', category: 'Biblical Book', aliases: ['psalm'], lookalike: 'Proverbs', ref: 'Psalm 1:1', d: 'e' },
  { word: 'Proverbs', category: 'Biblical Book', aliases: [], lookalike: 'Ecclesiastes', ref: 'Proverbs 1:1', d: 'e' },
  { word: 'Ecclesiastes', category: 'Biblical Book', aliases: [], lookalike: 'Song of Solomon', ref: 'Ecclesiastes 1:1', d: 'h' },
  { word: 'Isaiah', category: 'Biblical Book', aliases: [], lookalike: 'Jeremiah', ref: 'Isaiah 1:1', d: 'm' },
  { word: 'Jeremiah', category: 'Biblical Book', aliases: [], lookalike: 'Ezekiel', ref: 'Jeremiah 1:1', d: 'h' },
  { word: 'Ezekiel', category: 'Biblical Book', aliases: [], lookalike: 'Daniel', ref: 'Ezekiel 1:1', d: 'h' },
  { word: 'Daniel', category: 'Biblical Book', aliases: [], lookalike: 'Zechariah', ref: 'Daniel 1:1', d: 'e' },
  { word: 'Matthew', category: 'Biblical Book', aliases: [], lookalike: 'Mark', ref: 'Matthew 1:1', d: 'e' },
  { word: 'Mark', category: 'Biblical Book', aliases: [], lookalike: 'Luke', ref: 'Mark 1:1', d: 'e' },
  { word: 'Luke', category: 'Biblical Book', aliases: [], lookalike: 'John', ref: 'Luke 1:1', d: 'e' },
  { word: 'John', category: 'Biblical Book', aliases: [], lookalike: 'Acts', ref: 'John 1:1', d: 'e' },
  { word: 'Acts', category: 'Biblical Book', aliases: ['acts of the apostles'], lookalike: 'Romans', ref: 'Acts 1:1', d: 'e' },
  { word: 'Romans', category: 'Biblical Book', aliases: [], lookalike: 'Galatians', ref: 'Romans 1:1', d: 'm' },
  { word: 'Galatians', category: 'Biblical Book', aliases: [], lookalike: 'Ephesians', ref: 'Galatians 1:1', d: 'h' },
  { word: 'Ephesians', category: 'Biblical Book', aliases: [], lookalike: 'Philippians', ref: 'Ephesians 1:1', d: 'h' },
  { word: 'Philippians', category: 'Biblical Book', aliases: [], lookalike: 'Colossians', ref: 'Philippians 1:1', d: 'h' },
  { word: 'Colossians', category: 'Biblical Book', aliases: [], lookalike: 'Thessalonians', ref: 'Colossians 1:1', d: 'h' },
  { word: 'Hebrews', category: 'Biblical Book', aliases: [], lookalike: 'James', ref: 'Hebrews 1:1', d: 'h' },
  { word: 'James', category: 'Biblical Book', aliases: [], lookalike: '1 Peter', ref: 'James 1:1', d: 'h' },
  { word: 'Revelation', category: 'Biblical Book', aliases: ['apocalypse'], lookalike: 'Daniel', ref: 'Revelation 1:1', d: 'e' },

  // Parables
  { word: 'Good Samaritan', category: 'Parable', aliases: ['samaritan'], lookalike: 'Prodigal Son', ref: 'Luke 10:33', d: 'e' },
  { word: 'Sower and the Seeds', category: 'Parable', aliases: ['parable of the sower'], lookalike: 'Wheat and Tares', ref: 'Matthew 13:3', d: 'm' },
  { word: 'Wheat and Tares', category: 'Parable', aliases: ['tares among wheat'], lookalike: 'Sower and the Seeds', ref: 'Matthew 13:24', d: 'h' },
  { word: 'Pearl of Great Price', category: 'Parable', aliases: ['costly pearl'], lookalike: 'Hidden Treasure', ref: 'Matthew 13:45', d: 'h' },
  { word: 'Hidden Treasure', category: 'Parable', aliases: ['treasure in a field'], lookalike: 'Pearl of Great Price', ref: 'Matthew 13:44', d: 'h' },
  { word: 'Wise and Foolish Builders', category: 'Parable', aliases: ['house on the rock'], lookalike: 'Ten Virgins', ref: 'Matthew 7:24', d: 'e' },
  { word: 'Ten Virgins', category: 'Parable', aliases: ['wise and foolish virgins'], lookalike: 'Wise and Foolish Builders', ref: 'Matthew 25:1', d: 'e' },
  { word: 'Parable of the Talents', category: 'Parable', aliases: ['the talents'], lookalike: 'Parable of the Minas', ref: 'Matthew 25:14', d: 'm' },
  { word: 'Parable of the Minas', category: 'Parable', aliases: ['ten minas'], lookalike: 'Parable of the Talents', ref: 'Luke 19:12', d: 'h' },
  { word: 'Rich Fool', category: 'Parable', aliases: ['bigger barns'], lookalike: 'Rich Man and Lazarus', ref: 'Luke 12:16', d: 'h' },
  { word: 'Rich Man and Lazarus', category: 'Parable', aliases: ['dives and lazarus'], lookalike: 'Rich Fool', ref: 'Luke 16:19', d: 'm' },
  { word: 'Persistent Widow', category: 'Parable', aliases: ['unjust judge'], lookalike: 'Pharisee and Publican', ref: 'Luke 18:2', d: 'h' },
  { word: 'Pharisee and Publican', category: 'Parable', aliases: ['tax collector praying'], lookalike: 'Persistent Widow', ref: 'Luke 18:10', d: 'h' },
  { word: 'Laborers in the Vineyard', category: 'Parable', aliases: ['vineyard workers'], lookalike: 'Wicked Vinedressers', ref: 'Matthew 20:1', d: 'h' },
  { word: 'Wicked Vinedressers', category: 'Parable', aliases: ['evil tenants'], lookalike: 'Laborers in the Vineyard', ref: 'Matthew 21:33', d: 'h' },
  { word: 'Mustard Seed', category: 'Parable', aliases: ['grain of mustard seed'], lookalike: 'Leaven in the Meal', ref: 'Matthew 13:31', d: 'e' },
  { word: 'Leaven in the Meal', category: 'Parable', aliases: ['the leaven'], lookalike: 'Mustard Seed', ref: 'Matthew 13:33', d: 'h' },
  { word: 'Barren Fig Tree', category: 'Parable', aliases: ['fig tree in vineyard'], lookalike: 'Great Banquet', ref: 'Luke 13:6', d: 'h' },
  { word: 'Great Banquet', category: 'Parable', aliases: ['marriage feast'], lookalike: 'Barren Fig Tree', ref: 'Luke 14:16', d: 'h' },
  { word: 'Lost Coin', category: 'Parable', aliases: ['drachma'], lookalike: 'Lost Sheep', ref: 'Luke 15:8', d: 'e' },
  { word: 'Lost Sheep', category: 'Parable', aliases: ['the shepherd and ninety-nine'], lookalike: 'Lost Coin', ref: 'Luke 15:4', d: 'e' },

  // Miracles
  { word: 'Healing the Nobleman Son', category: 'Miracle', aliases: ['official son healed'], lookalike: 'Centurion Servant Healed', ref: 'John 4:46', d: 'h' },
  { word: 'Centurion Servant Healed', category: 'Miracle', aliases: ['centurion servant'], lookalike: 'Healing the Nobleman Son', ref: 'Matthew 8:5', d: 'h' },
  { word: 'Healing at Bethesda Pool', category: 'Miracle', aliases: ['paralytic at bethesda'], lookalike: 'Healing the Man Born Blind', ref: 'John 5:2', d: 'h' },
  { word: 'Healing the Man Born Blind', category: 'Miracle', aliases: ['blind man at siloam'], lookalike: 'Healing at Bethesda Pool', ref: 'John 9:1', d: 'e' },
  { word: 'Raising of the Widow Son', category: 'Miracle', aliases: ['widow of nain son'], lookalike: 'Raising of Jairus Daughter', ref: 'Luke 7:12', d: 'h' },
  { word: 'Raising of Jairus Daughter', category: 'Miracle', aliases: ['talitha cumi'], lookalike: 'Raising of the Widow Son', ref: 'Mark 5:22', d: 'm' },
  { word: 'Healing the Ten Lepers', category: 'Miracle', aliases: ['ten lepers'], lookalike: 'Centurion Servant Healed', ref: 'Luke 17:12', d: 'e' },
  { word: 'Feeding Four Thousand', category: 'Miracle', aliases: ['seven loaves'], lookalike: 'Feeding Five Thousand', ref: 'Mark 8:1', d: 'h' },
  { word: 'Feeding Five Thousand', category: 'Miracle', aliases: ['five loaves and two fish'], lookalike: 'Feeding Four Thousand', ref: 'John 6:10', d: 'e' },
  { word: 'Miraculous Catch of Fish', category: 'Miracle', aliases: ['draught of fishes'], lookalike: 'Coin in the Fish Mouth', ref: 'Luke 5:4', d: 'h' },
  { word: 'Coin in the Fish Mouth', category: 'Miracle', aliases: ['temple tax coin'], lookalike: 'Miraculous Catch of Fish', ref: 'Matthew 17:27', d: 'h' },
  { word: 'Withering the Fig Tree', category: 'Miracle', aliases: ['cursed fig tree'], lookalike: 'Calming the Storm', ref: 'Matthew 21:19', d: 'h' },

  // Biblical Events
  { word: 'Creation', category: 'Old Testament event', aliases: ['six days of creation'], lookalike: "Noah's Flood", ref: 'Genesis 1:1', d: 'e' },
  { word: 'Ten Commandments', category: 'Old Testament event', aliases: ['commandments'], lookalike: 'Golden Calf', ref: 'Exodus 20:3', d: 'e' },
  { word: 'Destruction of Sodom', category: 'Old Testament event', aliases: ['fire on sodom'], lookalike: 'Offering of Isaac', ref: 'Genesis 19:24', d: 'h' },
  { word: 'Offering of Isaac', category: 'Old Testament event', aliases: ['mount moriah sacrifice'], lookalike: 'Destruction of Sodom', ref: 'Genesis 22:2', d: 'm' },
  { word: 'Sale of Joseph into Egypt', category: 'Old Testament event', aliases: ['joseph sold'], lookalike: 'Famine in Egypt', ref: 'Genesis 37:28', d: 'm' },
  { word: 'Famine in Egypt', category: 'Old Testament event', aliases: ['seven years famine'], lookalike: 'Sale of Joseph into Egypt', ref: 'Genesis 41:54', d: 'm' },
  { word: 'First Passover Night', category: 'Old Testament event', aliases: ['passover'], lookalike: 'Crossing the Red Sea', ref: 'Exodus 12:12', d: 'h' },
  { word: 'Bitter Waters of Marah', category: 'Old Testament event', aliases: ['marah waters sweetened'], lookalike: 'Manna in the Wilderness', ref: 'Exodus 15:23', d: 'h' },
  { word: 'Sun Standing Still', category: 'Old Testament event', aliases: ['gibeon miracle'], lookalike: 'Fall of Jericho Walls', ref: 'Joshua 10:12', d: 'h' },
  { word: 'Fall of Jericho Walls', category: 'Old Testament event', aliases: ['walls of jericho'], lookalike: 'Sun Standing Still', ref: 'Joshua 6:20', d: 'e' },
  { word: 'Song of Deborah', category: 'Old Testament event', aliases: ['deborah victory'], lookalike: 'Routing of Midian', ref: 'Judges 5:1', d: 'h' },
  { word: 'Routing of Midian', category: 'Old Testament event', aliases: ['gideon battle'], lookalike: 'Song of Deborah', ref: 'Judges 7:19', d: 'h' },
  { word: 'Translation of Elijah', category: 'Old Testament event', aliases: ['elijah in whirlwind'], lookalike: 'Healing of Naaman', ref: '2 Kings 2:11', d: 'h' },
  { word: 'Healing of Naaman', category: 'Old Testament event', aliases: ['seven dips in jordan'], lookalike: 'Translation of Elijah', ref: '2 Kings 5:14', d: 'm' },
  { word: 'Floating Iron Axe Head', category: 'Old Testament event', aliases: ['axe head swims'], lookalike: 'Healing of Naaman', ref: '2 Kings 6:6', d: 'h' },
  { word: 'Rebuilding Jerusalem Walls', category: 'Old Testament event', aliases: ['nehemiah wall'], lookalike: 'Return from Babylon', ref: 'Nehemiah 2:17', d: 'h' },
  { word: 'Return from Babylon', category: 'Old Testament event', aliases: ['cyrus decree'], lookalike: 'Rebuilding Jerusalem Walls', ref: 'Ezra 1:1', d: 'h' },

  // New Testament events
  { word: 'Birth of Jesus', category: 'New Testament event', aliases: ['nativity', 'christmas'], lookalike: 'Last Supper', ref: 'Luke 2:7', d: 'e' },
  { word: 'Last Supper', category: 'New Testament event', aliases: ['communion'], lookalike: 'Birth of Jesus', ref: 'Luke 22:19', d: 'e' },
  { word: 'Annunciation to Mary', category: 'New Testament event', aliases: ['angel gabriel visit'], lookalike: 'Birth of Jesus', ref: 'Luke 1:28', d: 'h' },
  { word: 'Flight into Egypt', category: 'New Testament event', aliases: ['escaping herod'], lookalike: 'Boy Jesus in Temple', ref: 'Matthew 2:14', d: 'm' },
  { word: 'Boy Jesus in Temple', category: 'New Testament event', aliases: ['twelve years old in temple'], lookalike: 'Flight into Egypt', ref: 'Luke 2:46', d: 'h' },
  { word: 'Temptation in Wilderness', category: 'New Testament event', aliases: ['forty days fast'], lookalike: 'Baptism in Jordan River', ref: 'Matthew 4:1', d: 'e' },
  { word: 'Baptism in Jordan River', category: 'New Testament event', aliases: ['jesus baptized'], lookalike: 'Temptation in Wilderness', ref: 'Matthew 3:13', d: 'e' },
  { word: 'Transfiguration', category: 'New Testament event', aliases: ['holy mount'], lookalike: 'Palm Sunday', ref: 'Matthew 17:2', d: 'm' },
  { word: 'Palm Sunday', category: 'New Testament event', aliases: ['triumphal entry'], lookalike: 'Transfiguration', ref: 'Matthew 21:8', d: 'e' },
  { word: 'Agony in Gethsemane', category: 'New Testament event', aliases: ['garden prayer'], lookalike: 'Crucifixion at Golgotha', ref: 'Matthew 26:36', d: 'h' },
  { word: 'Crucifixion', category: 'New Testament event', aliases: ['the cross', 'good friday'], lookalike: 'Resurrection', ref: 'Matthew 27:33', d: 'e' },
  { word: 'Resurrection', category: 'New Testament event', aliases: ['empty tomb', 'easter'], lookalike: 'Ascension into Heaven', ref: 'Matthew 28:6', d: 'e' },
  { word: 'Ascension into Heaven', category: 'New Testament event', aliases: ['taken up in cloud'], lookalike: 'Resurrection', ref: 'Acts 1:9', d: 'e' },
  { word: 'Vision of Cornelius', category: 'New Testament event', aliases: ['centurion vision'], lookalike: 'Conversion of Saul', ref: 'Acts 10:3', d: 'h' },
  { word: 'Conversion of Saul', category: 'New Testament event', aliases: ['damascus road light'], lookalike: 'Vision of Cornelius', ref: 'Acts 9:3', d: 'm' },
  { word: 'Shipwreck at Melita', category: 'New Testament event', aliases: ['malta storm'], lookalike: 'Council of Jerusalem', ref: 'Acts 27:41', d: 'h' },
  { word: 'Council of Jerusalem', category: 'New Testament event', aliases: ['apostles council'], lookalike: 'Shipwreck at Melita', ref: 'Acts 15:6', d: 'h' },
];

const generatedWolfRows: WolfRow[] = [];
const emittedWolfWords = new Set(seedWolf.map((r) => r[0].toLowerCase()));

// 1. Add all valid thematic items with genuine curated references
for (const tp of thematicPairs) {
  if (emittedWolfWords.has(tp.word.toLowerCase())) continue;
  if (!isSafeWolfWord(tp.word, tp.category)) continue;
  if (!isSafeWolfWord(tp.lookalike, tp.category)) continue;
  if (tp.word.toLowerCase() === tp.lookalike.toLowerCase()) continue;
  if (!ds.verseByRef.has(tp.ref.toLowerCase())) continue;

  const row: WolfRow = [tp.word, tp.category, tp.aliases, tp.lookalike, tp.ref, tp.d];
  generatedWolfRows.push(row);
  emittedWolfWords.add(tp.word.toLowerCase());
}

// 2. Generate Place pairs from placeMap (~160 items)
const qualifiedPlaces = Array.from(ds.placeMap.values())
  .filter((pl) => {
    const name = pl.displayTitle?.trim();
    if (!name || name.length < 4 || name.includes('(') || name.includes(';') || name.includes('_')) return false;
    if ((pl.verseCount ?? 0) < 2) return false;
    return isSafeWolfWord(name, 'Place');
  })
  .sort((a, b) => (b.verseCount ?? 0) - (a.verseCount ?? 0));

for (let i = 0; i < qualifiedPlaces.length && generatedWolfRows.length < 320; i++) {
  const pl1 = qualifiedPlaces[i];
  const name1 = pl1.displayTitle.trim();
  if (emittedWolfWords.has(name1.toLowerCase())) continue;

  const vMatches1 = (pl1.verses ?? [])
    .map((vId) => ds.verseById.get(vId))
    .filter((iv): iv is NonNullable<typeof iv> => Boolean(iv));
  if (vMatches1.length === 0) continue;

  const anchorVerse =
    vMatches1.find((iv) => iv.text.toLowerCase().includes(name1.toLowerCase())) || vMatches1[0];
  const ref = anchorVerse.ref;
  const isNt1 = vMatches1.some((iv) => iv.testament === 'NT');

  const partner = qualifiedPlaces.find((pl2, idx) => {
    if (idx === i) return false;
    const name2 = pl2.displayTitle.trim();
    if (name2.toLowerCase() === name1.toLowerCase()) return false;
    const pl2IsNt = (pl2.verses ?? []).some((vId) => ds.verseById.get(vId)?.testament === 'NT');
    return isNt1 === pl2IsNt && isSafeWolfWord(name2, 'Place');
  });

  if (!partner) continue;
  const name2 = partner.displayTitle.trim();
  const EASY_WOLF_PLACES = new Set([
    'jerusalem', 'egypt', 'bethlehem', 'nazareth', 'babylon', 'nineveh', 'galilee', 'canaan', 'sinai', 'jericho', 'damascus',
  ]);
  const d: 'e' | 'm' | 'h' = EASY_WOLF_PLACES.has(name1.toLowerCase()) ? 'm' : 'h';

  const row: WolfRow = [name1, 'Place', [], name2, ref, d];
  generatedWolfRows.push(row);
  emittedWolfWords.add(name1.toLowerCase());
}

// 3. Generate People pairs from personMap (remaining items to reach 570)
const qualifiedPeople = Array.from(ds.personMap.values())
  .filter((p) => {
    const name = p.name?.trim();
    if (!name || name.length < 4 || name.includes('(') || name.includes(';') || name.includes('_')) return false;
    if (EXCLUDED_PEOPLE.has(name.toLowerCase())) return false;
    if ((p.verseCount ?? 0) < 2) return false;
    return isSafeWolfWord(name, 'Person');
  })
  .sort((a, b) => (b.verseCount ?? 0) - (a.verseCount ?? 0));

const FAMILIAR_WOLF_PEOPLE = new Set([
  'moses', 'abraham', 'sarah', 'isaac', 'jacob', 'joseph', 'noah', 'adam', 'joshua',
  'solomon', 'samson', 'goliath', 'elijah', 'elisha', 'daniel', 'jonah', 'esther', 'ruth', 'jesus', 'mary',
  'peter', 'paul', 'john', 'james', 'judas', 'pilate', 'aaron', 'miriam', 'gideon',
  'deborah', 'lazarus', 'rebekah', 'hannah', 'martha', 'stephen', 'timothy',
]);

for (let i = 0; i < qualifiedPeople.length && generatedWolfRows.length < 570; i++) {
  const p1 = qualifiedPeople[i];
  const name1 = p1.name.trim();
  if (emittedWolfWords.has(name1.toLowerCase())) continue;

  const vMatches1 = (p1.verses ?? [])
    .map((vId) => ds.verseById.get(vId))
    .filter((iv): iv is NonNullable<typeof iv> => Boolean(iv));
  if (vMatches1.length === 0) continue;

  const anchorVerse =
    vMatches1.find((iv) => iv.text.toLowerCase().includes(name1.toLowerCase())) || vMatches1[0];
  const ref = anchorVerse.ref;
  const isNt1 = vMatches1.some((iv) => iv.testament === 'NT');

  const partner = qualifiedPeople.find((p2, idx) => {
    if (idx === i) return false;
    const name2 = p2.name.trim();
    if (name2.toLowerCase() === name1.toLowerCase()) return false;
    const p2IsNt = (p2.verses ?? []).some((vId) => ds.verseById.get(vId)?.testament === 'NT');
    return isNt1 === p2IsNt && isSafeWolfWord(name2, 'Person');
  });

  if (!partner) continue;
  const name2 = partner.name.trim();
  const d: 'e' | 'm' | 'h' = FAMILIAR_WOLF_PEOPLE.has(name1.toLowerCase()) ? 'm' : 'h';

  const row: WolfRow = [name1, 'Person', [], name2, ref, d];
  generatedWolfRows.push(row);
  emittedWolfWords.add(name1.toLowerCase());
}

console.log(
  `Generated WOLF rows: ${generatedWolfRows.length} (total with seeds: ${seedWolf.length + generatedWolfRows.length})`
);

// ============================================================================
// PART 4: Serialization and File Writing
// ============================================================================
console.log('\n--- Writing Files ---');

function serializeWcf(seed: WcfRow[], gen: WcfRow[]): string {
  const lines: string[] = [
    '// What Came First? sets. Events are listed in true chronological order.',
    '// [id, difficulty, audience(k/y/a), testament, verse key, [[event, reference] x5]]',
    "export type WcfRow = [string, 'e' | 'm' | 'h', string, 'OT' | 'NT' | 'both', string, [string, string][]];",
    'export const WCF: WcfRow[] = [',
  ];
  for (const row of seed) {
    lines.push(`  ${JSON.stringify(row)},`);
  }
  lines.push('  // === GENERATED ITEMS ===');
  for (const row of gen) {
    lines.push(`  ${JSON.stringify(row)},`);
  }
  lines.push('];');
  return lines.join('\n') + '\n';
}

function serializeWai(seed: WaiRow[], gen: WaiRow[]): string {
  const lines: string[] = [
    '// Who Am I? subjects. Clues run hardest to easiest.',
    '// [id, difficulty, audience, testament, verse key, name, [5 clues], [5 distractors], story]',
    "export type WaiRow = [string, 'e' | 'm' | 'h', string, 'OT' | 'NT' | 'both', string, string, string[], string[], string];",
    'export const WAI: WaiRow[] = [',
  ];
  for (const row of seed) {
    lines.push(`  ${JSON.stringify(row)},`);
  }
  lines.push('  // === GENERATED ITEMS ===');
  for (const row of gen) {
    lines.push(`  ${JSON.stringify(row)},`);
  }
  lines.push('];');
  return lines.join('\n') + '\n';
}

function serializeWolf(seed: WolfRow[], gen: WolfRow[]): string {
  const lines: string[] = [
    '// Spot the Wolf words. [word, category, aliases, look-alike word, verse key, difficulty]',
    "export type WolfRow = [string, string, string[], string, string, 'e' | 'm' | 'h'];",
    'export const WOLF: WolfRow[] = [',
  ];
  for (const row of seed) {
    lines.push(`  ${JSON.stringify(row)},`);
  }
  lines.push('  // === GENERATED ITEMS ===');
  for (const row of gen) {
    lines.push(`  ${JSON.stringify(row)},`);
  }
  lines.push('];');
  return lines.join('\n') + '\n';
}

fs.writeFileSync(path.join(DATA_DIR, 'wcf.ts'), serializeWcf(seedWcf, generatedWcfRows), 'utf8');
fs.writeFileSync(path.join(DATA_DIR, 'wai.ts'), serializeWai(seedWai, generatedWaiRows), 'utf8');
fs.writeFileSync(path.join(DATA_DIR, 'wolf.ts'), serializeWolf(seedWolf, generatedWolfRows), 'utf8');

console.log('Successfully written wcf.ts, wai.ts, and wolf.ts.');
