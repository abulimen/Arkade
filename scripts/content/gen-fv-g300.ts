import fs from 'node:fs';
import path from 'node:path';
import { loadDataset, normBookName, FORBIDDEN_TEST_STRINGS, hashStr, DATA_DIR } from './shared';
import { norm, tooClose } from '../../src/server/engine/text';
import { FvSchema, G3Schema } from '../../src/shared/schemas';

// ============================================================================
// 1. DATA STRUCTURES & EXPANDED SEMANTIC FAMILIES FOR FAKE VERSE
// ============================================================================

const FAMILIES: Record<string, string[]> = {
  animals_sing: [
    'lion', 'bear', 'wolf', 'leopard', 'sheep', 'lamb', 'ram', 'goat', 'kid',
    'horse', 'mule', 'donkey', 'ass', 'camel', 'serpent', 'viper', 'adder',
    'dragon', 'eagle', 'dove', 'raven', 'sparrow', 'owl', 'quail', 'partridge',
    'stork', 'crane', 'swallow', 'dog', 'swine', 'calf', 'ox', 'bull',
    'bullock', 'heifer', 'fish', 'whale', 'worm', 'frog', 'locust',
    'grasshopper', 'flea', 'spider', 'bee', 'hornet', 'moth', 'hart',
    'roebuck', 'fox', 'ape', 'peacock'
  ],
  animals_plur: [
    'lions', 'bears', 'wolves', 'leopards', 'sheep', 'lambs', 'rams', 'goats',
    'kids', 'horses', 'mules', 'donkeys', 'asses', 'camels', 'serpents',
    'vipers', 'adders', 'dragons', 'eagles', 'doves', 'ravens', 'sparrows',
    'owls', 'dogs', 'swine', 'calves', 'oxen', 'bulls', 'bullocks', 'heifers',
    'fishes', 'whales', 'worms', 'frogs', 'locusts', 'grasshoppers', 'spiders',
    'bees', 'moths', 'harts', 'foxes', 'apes', 'peacocks'
  ],
  plants_food_sing: [
    'bread', 'honey', 'milk', 'wine', 'oil', 'vinegar', 'water', 'wheat',
    'barley', 'rye', 'corn', 'olive', 'fig', 'vine', 'branch', 'leaf', 'seed',
    'herb', 'apple', 'cedar', 'myrtle', 'hyssop', 'mustard', 'palm', 'willow',
    'bramble', 'thistle', 'thorn', 'brier', 'pomegranate', 'reed', 'grass',
    'tree', 'flower', 'lily', 'rose', 'almond', 'melon', 'cucumber', 'garlic',
    'leek', 'onion', 'salt', 'butter', 'cheese', 'fat', 'marrow', 'flour',
    'meal', 'dough'
  ],
  plants_food_plur: [
    'olives', 'figs', 'vines', 'branches', 'leaves', 'seeds', 'herbs', 'apples',
    'cedars', 'myrtles', 'palms', 'willows', 'brambles', 'thistles', 'thorns',
    'briers', 'pomegranates', 'reeds', 'loaves', 'grapes', 'trees', 'flowers',
    'lilies', 'roses', 'almonds', 'melons', 'cucumbers', 'leeks', 'onions'
  ],
  metals_gems_sing: [
    'gold', 'silver', 'brass', 'iron', 'tin', 'lead', 'steel', 'stone', 'rock',
    'jewel', 'ruby', 'sapphire', 'diamond', 'emerald', 'pearl', 'jasper',
    'onyx', 'agate', 'amethyst', 'beryl', 'coral', 'crystal', 'brimstone',
    'treasure', 'clay', 'dust', 'sand', 'mire'
  ],
  metals_gems_plur: [
    'stones', 'rocks', 'jewels', 'rubies', 'sapphires', 'diamonds', 'emeralds',
    'pearls', 'treasures'
  ],
  weapons_armor_sing: [
    'sword', 'spear', 'shield', 'buckler', 'helmet', 'bow', 'arrow', 'quiver',
    'rod', 'staff', 'sling', 'dart', 'javelin', 'axe', 'hammer', 'sickle',
    'anvil', 'plowshare', 'yoke', 'chain', 'cord', 'rope', 'band', 'snare',
    'net', 'trap', 'bridle', 'bit', 'scourge'
  ],
  weapons_armor_plur: [
    'swords', 'spears', 'shields', 'bucklers', 'helmets', 'bows', 'arrows',
    'quivers', 'rods', 'staves', 'darts', 'javelins', 'axes', 'hammers',
    'sickles', 'yokes', 'chains', 'cords', 'ropes', 'bands', 'snares',
    'nets', 'traps', 'scourges'
  ],
  vessels_objects_sing: [
    'cup', 'pitcher', 'bottle', 'bowl', 'basin', 'basket', 'pot', 'pan',
    'kettle', 'caldron', 'lamp', 'candle', 'candlestick', 'torch', 'oven',
    'furnace', 'bed', 'couch', 'table', 'altar', 'anchor', 'key', 'sack',
    'bag', 'purse', 'veil', 'curtain', 'pillar', 'wheel', 'pen', 'ink',
    'paper', 'scroll', 'book', 'ark', 'chest', 'throne', 'crown', 'diadem',
    'mitre', 'sceptre', 'mantle', 'coat', 'garment', 'robe', 'vesture',
    'girdle', 'shoe', 'sandal', 'ring'
  ],
  vessels_objects_plur: [
    'cups', 'pitchers', 'bottles', 'bowls', 'basins', 'baskets', 'pots',
    'pans', 'kettles', 'caldrons', 'lamps', 'candles', 'candlesticks',
    'torches', 'beds', 'couches', 'tables', 'altars', 'keys', 'sacks',
    'bags', 'purses', 'veils', 'curtains', 'pillars', 'wheels', 'books',
    'thrones', 'crowns', 'sceptres', 'mantles', 'coats', 'garments', 'robes',
    'girdles', 'shoes', 'sandals', 'rings'
  ],
  weather_cosmos_sing: [
    'sun', 'moon', 'star', 'rain', 'snow', 'hail', 'lightning', 'thunder',
    'wind', 'whirlwind', 'tempest', 'storm', 'cloud', 'dew', 'frost', 'ice',
    'vapor', 'mist', 'shadow', 'light', 'darkness', 'fire', 'flame', 'smoke',
    'rainbow'
  ],
  weather_cosmos_plur: [
    'stars', 'clouds', 'storms', 'thunders', 'lightnings', 'winds', 'shadows', 'flames'
  ],
  roles_titles_sing: [
    'king', 'queen', 'prince', 'princess', 'prophet', 'prophetess', 'priest',
    'judge', 'shepherd', 'captain', 'soldier', 'centurion', 'servant', 'maid',
    'handmaid', 'master', 'messenger', 'watchman', 'fisherman', 'disciple',
    'apostle', 'scribe', 'virgin', 'widow', 'stranger', 'brother', 'sister',
    'father', 'mother', 'son', 'daughter', 'child', 'ruler', 'governor',
    'elder', 'builder', 'minister', 'baker', 'butler', 'physician', 'merchant',
    'counsellor'
  ],
  roles_titles_plur: [
    'kings', 'queens', 'princes', 'princesses', 'prophets', 'priests', 'judges',
    'shepherds', 'captains', 'soldiers', 'servants', 'maids', 'handmaids',
    'masters', 'messengers', 'watchmen', 'fishermen', 'disciples', 'apostles',
    'scribes', 'virgins', 'widows', 'strangers', 'brethren', 'children',
    'rulers', 'governors', 'elders', 'builders', 'ministers', 'merchants',
    'counsellors'
  ],
  body_parts_sing: [
    'heart', 'hand', 'foot', 'head', 'eye', 'ear', 'mouth', 'tongue', 'lip',
    'face', 'arm', 'knee', 'neck', 'bone', 'shoulder', 'belly', 'womb', 'tooth',
    'flesh', 'spirit', 'soul', 'forehead', 'voice', 'breath', 'blood', 'heel',
    'bosom', 'thigh', 'finger', 'beard', 'hair'
  ],
  body_parts_plur: [
    'hands', 'feet', 'eyes', 'ears', 'lips', 'arms', 'knees', 'bones',
    'shoulders', 'teeth', 'souls', 'voices', 'fingers'
  ],
  numbers: [
    'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'twelve', 'twenty', 'thirty', 'forty', 'fifty', 'seventy', 'hundred', 'thousand'
  ],
  colors_fabrics: [
    'purple', 'scarlet', 'crimson', 'blue', 'white', 'black', 'red', 'green',
    'yellow', 'grey', 'linen', 'sackcloth', 'silk', 'wool'
  ],
  instruments_sing: [
    'harp', 'psaltery', 'timbrel', 'trumpet', 'cornet', 'flute', 'pipe',
    'cymbal', 'horn', 'organ', 'tabret', 'viol', 'dulcimer', 'sackbut'
  ],
  instruments_plur: [
    'harps', 'psalteries', 'timbrels', 'trumpets', 'cornets', 'flutes', 'pipes',
    'cymbals', 'horns', 'organs', 'viols'
  ],
  places_landscape_sing: [
    'mountain', 'hill', 'valley', 'river', 'brook', 'stream', 'sea', 'lake',
    'pool', 'desert', 'wilderness', 'cave', 'pit', 'well', 'fountain',
    'spring', 'tower', 'gate', 'city', 'town', 'village', 'vineyard', 'garden',
    'orchard', 'house', 'tent', 'tabernacle', 'palace', 'temple', 'chamber',
    'field', 'forest', 'wood', 'path', 'highway', 'way'
  ],
  places_landscape_plur: [
    'mountains', 'hills', 'valleys', 'rivers', 'brooks', 'streams', 'seas',
    'lakes', 'pools', 'caves', 'pits', 'wells', 'fountains', 'springs',
    'towers', 'gates', 'cities', 'towns', 'villages', 'vineyards', 'gardens',
    'houses', 'tents', 'palaces', 'temples', 'chambers', 'fields', 'forests',
    'paths', 'ways'
  ]
};

function matchCase(word: string, sample: string): string {
  if (sample[0] === sample[0].toUpperCase()) {
    return word[0].toUpperCase() + word.slice(1);
  }
  return word.toLowerCase();
}

function extractSeedBlock(filePath: string, exportVar: string): string {
  const content = fs.readFileSync(filePath, 'utf8');
  let rawSeeds = '';
  if (content.includes('// === GENERATED ITEMS ===')) {
    const before = content.split('// === GENERATED ITEMS ===')[0];
    const match = before.match(new RegExp(`export const ${exportVar}: [A-Za-z0-9_]+\\[\\] = \\[\\s*([\\s\\S]*)`));
    rawSeeds = match ? match[1].trimEnd() : '';
  } else {
    const match = content.match(new RegExp(`export const ${exportVar}: [A-Za-z0-9_]+\\[\\] = \\[\\s*([\\s\\S]*?)\\s*\\];`));
    rawSeeds = match ? match[1].trimEnd() : '';
  }
  return rawSeeds
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `  ${line}`)
    .join('\n');
}

// ============================================================================
// 2. FAKE VERSE GENERATOR WITH WORD-CAP & ROUND-ROBIN BOOK SPREAD
// ============================================================================

export interface GeneratedFvRow {
  id: string;
  d: 'e' | 'm' | 'h';
  a: string;
  t: 'OT' | 'NT';
  ref: string;
  prompt: string;
  truth: string;
  decoys: [string, string];
}

interface RawCandidateFv {
  ref: string;
  prompt: string;
  truth: string;
  decoys: [string, string];
  testament: 'OT' | 'NT';
  bookName: string;
  bookOrder: number;
  chapterNum: number;
}

function generateFakeVerse(ds: ReturnType<typeof loadDataset>): GeneratedFvRow[] {
  const kjvNormSet = new Set(ds.verses.map((v) => norm(v.text)));
  const books = ds.books.map((b) => ({
    name: normBookName(b.fields.bookName),
    order: b.fields.bookOrder,
    testament: b.fields.bookOrder <= 39 ? ('OT' as const) : ('NT' as const),
  }));

  const MAX_PER_WORD = 5; // Cap each word to at most 5 occurrences across all generated rows
  const wordUsage = new Map<string, number>();
  const seenRefTruth = new Set<string>();

  // Group verses by book
  const versesByBook = new Map<string, typeof ds.verses>();
  for (const b of books) {
    versesByBook.set(b.name, []);
  }
  for (const v of ds.verses) {
    versesByBook.get(v.bookName)?.push(v);
  }

  const candidatesByBook = new Map<string, RawCandidateFv[]>();
  for (const b of books) {
    candidatesByBook.set(b.name, []);
  }

  // Pointer for each book to avoid scanning from 0 every time
  const bookPointers = new Map<string, number>();
  for (const b of books) {
    bookPointers.set(b.name, 0);
  }

  // Fair round-robin candidate extraction across all 66 books
  let lastPickedWord = '';
  for (let round = 0; round < 35; round++) {
    for (const b of books) {
      const bList = candidatesByBook.get(b.name)!;
      const bCap = b.testament === 'OT' ? 16 : 22; // ensure OT and NT balance
      if (bList.length >= bCap) continue;

      const vList = versesByBook.get(b.name) || [];
      let ptr = bookPointers.get(b.name) || 0;
      let found = false;

      while (ptr < vList.length && !found) {
        const v = vList[ptr++];
        if (v.text.length < 35 || v.text.length > 185) continue;
        if (/begat|were numbered|twenty and two thousand|thousand and five hundred/i.test(v.text)) continue;

        // Deterministically offset family start so books explore different lexical domains
        const famEntries = Object.entries(FAMILIES);
        const famOffset = (b.order * 3 + round * 5) % famEntries.length;
        const rotatedFamilies = [
          ...famEntries.slice(famOffset),
          ...famEntries.slice(0, famOffset),
        ];

        for (const [famName, words] of rotatedFamilies) {
          for (const w of words) {
            const reg = new RegExp(`\\b${w}\\b`, 'gi');
            const m = v.text.match(reg);
            if (m && m.length === 1) {
              const rawTruth = m[0];
              const normTruth = norm(rawTruth);

              if (normTruth === lastPickedWord) continue; // prevent back-to-back repeats

              const curUsage = wordUsage.get(normTruth) || 0;
              if (curUsage >= MAX_PER_WORD) continue;

              const key = `${v.ref}::${normTruth}`;
              if (seenRefTruth.has(key)) continue;

              const prompt = v.text.replace(reg, '____');
              if (!prompt.includes('____')) continue;

              const validDecoys: string[] = [];
              for (const dw of words) {
                if (norm(dw) === normTruth) continue;
                if (tooClose(dw, rawTruth)) continue;
                if (FORBIDDEN_TEST_STRINGS.has(norm(dw))) continue;
                if (new RegExp(`\\b${dw}\\b`, 'i').test(v.text)) continue;

                const formatted = matchCase(dw, rawTruth);
                const replaced = prompt.replace('____', formatted);
                if (kjvNormSet.has(norm(replaced))) continue;

                validDecoys.push(formatted);
              }

              if (validDecoys.length >= 2) {
                const h = hashStr(v.ref + rawTruth);
                const d1 = validDecoys[h % validDecoys.length];
                const rem = validDecoys.filter((x) => norm(x) !== norm(d1) && !tooClose(x, d1));
                if (rem.length >= 1) {
                  const d2 = rem[(h >>> 4) % rem.length];
                  seenRefTruth.add(key);
                  wordUsage.set(normTruth, curUsage + 1);
                  lastPickedWord = normTruth;

                  bList.push({
                    ref: v.ref,
                    prompt,
                    truth: rawTruth,
                    decoys: [d1, d2],
                    testament: v.testament,
                    bookName: v.bookName,
                    bookOrder: v.bookOrder,
                    chapterNum: v.chapterNum,
                  });
                  found = true;
                  break;
                }
              }
            }
          }
          if (found) break;
        }
      }
      bookPointers.set(b.name, ptr);
    }
  }

  // Interleave across all 66 books so consecutive rows jump across books!
  const bookQueues = books.map((b) => ({
    book: b,
    items: candidatesByBook.get(b.name) || [],
  }));

  const interleaved: RawCandidateFv[] = [];
  let added = true;

  while (added && interleaved.length < 1035) {
    added = false;
    for (const bq of bookQueues) {
      if (bq.items.length > 0) {
        interleaved.push(bq.items.shift()!);
        added = true;
        if (interleaved.length >= 1035) break;
      }
    }
  }

  // Balanced rotation for difficulty and audience
  const DIFFS: ('e' | 'm' | 'h')[] = ['e', 'm', 'h'];
  const AUDS = ['kya', 'ya', 'a'];

  const rows: GeneratedFvRow[] = interleaved.map((item, idx) => ({
    id: `gen-${idx + 1}`,
    d: DIFFS[idx % 3],
    a: AUDS[(idx + Math.floor(idx / 3)) % 3],
    t: item.testament,
    ref: item.ref,
    prompt: item.prompt,
    truth: item.truth,
    decoys: item.decoys,
  }));

  return rows;
}

// ============================================================================
// 3. BATTLE ROYALE GENERATOR WITH QUALITY FILTERING & BOOK INTERLEAVING
// ============================================================================

export interface GeneratedG3Row {
  d: 'e' | 'm' | 'h';
  ref: string;
  question: string;
  right: string;
  wrong: [string, string, string];
}

interface RawCandidateG3 {
  d: 'e' | 'm' | 'h';
  ref: string;
  question: string;
  right: string;
  wrong: [string, string, string];
  bookName: string;
  bookOrder: number;
  type: string;
}

function generateBattleRoyale(ds: ReturnType<typeof loadDataset>): GeneratedG3Row[] {
  const books = ds.books.map((b) => ({
    name: normBookName(b.fields.bookName),
    order: b.fields.bookOrder,
    div: b.fields.bookDiv,
    testament: b.fields.bookOrder <= 39 ? ('OT' as const) : ('NT' as const),
    chapters: b.fields.chapterCount,
    writers: b.fields.writers || [],
  }));

  const otBooks = books.filter((b) => b.testament === 'OT').map((b) => b.name);
  const ntBooks = books.filter((b) => b.testament === 'NT').map((b) => b.name);

  const otDivs = ['Pentateuch', 'Historical Books', 'Poetry and Wisdom', 'Major Prophets', 'Minor Prophets'];
  const ntDivs = ['Gospels', 'Historical (Acts)', 'Pauline Epistles', 'General Epistles', 'Apocalyptic Literature'];

  const otWriters = ['Moses', 'Joshua', 'Samuel', 'David', 'Solomon', 'Isaiah', 'Jeremiah', 'Ezekiel', 'Daniel', 'Ezra'];
  const ntWriters = ['Matthew', 'Mark', 'Luke', 'John', 'Paul', 'Peter', 'James', 'Jude'];

  const candidatesByBook = new Map<string, RawCandidateG3[]>();
  for (const b of books) {
    candidatesByBook.set(b.name, []);
  }

  const seenQuestions = new Set<string>();

  function addRow(
    d: 'e' | 'm' | 'h',
    ref: string,
    question: string,
    right: string,
    wrong: [string, string, string],
    type: string
  ) {
    const v = ds.verseByRef.get(ref.toLowerCase());
    if (!v) return;
    const qNorm = norm(question);
    if (seenQuestions.has(qNorm)) return;

    // Sanitize options
    const cleanRight = right.trim().slice(0, 60);
    const cleanW = wrong.map((w) => w.trim().slice(0, 60)) as [string, string, string];
    if (!cleanRight || cleanW.some((w) => !w)) return;

    // Strict uniqueness check
    const allNorm = new Set([norm(cleanRight), norm(cleanW[0]), norm(cleanW[1]), norm(cleanW[2])]);
    if (allNorm.size !== 4) return;

    seenQuestions.add(qNorm);
    const list = candidatesByBook.get(v.bookName);
    if (list) {
      list.push({
        d,
        ref,
        question,
        right: cleanRight,
        wrong: cleanW,
        bookName: v.bookName,
        bookOrder: v.bookOrder,
        type,
      });
    }
  }

  // --- COMPONENT 1: Quizzle Questions ---
  function cleanRef(raw: string): string | null {
    if (!raw) return null;
    let s = raw.trim()
      .replace(/\u2013|\u2014/g, '-')
      .replace(/^By [^()]*\(([^)]+)\).*/, '$1')
      .replace(/Revelations/i, 'Revelation')
      .replace(/Exodous/i, 'Exodus')
      .replace(/^Dan /i, 'Daniel ')
      .replace(/\([^)]*\)/g, '')
      .replace(/\[[^\]]*\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const first = s.split(/[,;]/)[0].trim();
    if (/^Philemon\s+(\d+)$/i.test(first)) return first.replace(/^Philemon\s+(\d+)$/i, 'Philemon 1:$1');
    if (/^Psalm\s+(\d+)$/i.test(first)) return first.replace(/^Psalm\s+(\d+)$/i, 'Psalm $1:1');
    const m = first.match(/^([1-3]?\s*[A-Za-z]+)\s+(\d+)\s*:\s*(\d+)/);
    if (m) {
      let b = m[1].trim();
      if (b.toLowerCase() === 'revelations') b = 'Revelation';
      if (b.toLowerCase() === 'psalms') b = 'Psalm';
      return `${b} ${m[2]}:${m[3]}`;
    }
    return null;
  }

  const maleOtPool = ['David', 'Moses', 'Solomon', 'Abraham', 'Elijah', 'Joshua', 'Aaron', 'Samuel', 'Gideon', 'Joseph', 'Isaac', 'Jacob', 'Hezekiah', 'Josiah', 'Saul', 'Elisha'];
  const maleNtPool = ['Peter', 'John', 'Paul', 'Philip', 'Thomas', 'Andrew', 'James', 'Stephen', 'Barnabas', 'Timothy', 'Luke', 'Mark', 'Matthew'];
  const femalePool = ['Sarah', 'Rachel', 'Miriam', 'Deborah', 'Ruth', 'Esther', 'Mary', 'Martha', 'Elisabeth', 'Hannah', 'Rahab', 'Rebekah', 'Leah'];
  const otPlacesPool = ['Jerusalem', 'Bethel', 'Hebron', 'Shiloh', 'Jericho', 'Babylon', 'Egypt', 'Nineveh', 'Mount Sinai', 'Mount Carmel', 'Midian', 'Canaan', 'Goshen', 'Gilgal', 'Samaria', 'Ur'];
  const ntPlacesPool = ['Bethlehem', 'Nazareth', 'Capernaum', 'Jerusalem', 'Antioch', 'Damascus', 'Rome', 'Athens', 'Corinth', 'Galilee', 'Judea', 'Ephesus', 'Bethany', 'Patmos'];
  const specialPlacesPool = ['City of David', 'Cana of Galilee', 'New Jerusalem', 'Garden of Eden', 'Mount of Olives', 'Sea of Galilee'];
  const tribesPool = ['Judah', 'Benjamin', 'Levi', 'Ephraim', 'Dan', 'Reuben', 'Asher', 'Gad', 'Naphtali', 'Zebulun', 'Issachar', 'Manasseh', 'Simeon'];
  const tribalGroupsPool = ['Levites', 'Reubenites', 'Judahites', 'Ephraimites', 'Benjaminites'];
  const animalsPool = ['Donkey', 'Lion', 'Camel', 'Serpent', 'Raven', 'Dove', 'Ram', 'Goat', 'Bull'];
  const treesPool = ['Juniper', 'Cedar', 'Olive', 'Fig', 'Sycamore', 'Oak', 'Palm', 'Acacia'];
  const virtuesPool = ['Love', 'Faith', 'Hope', 'Peace', 'Joy', 'Wisdom', 'Patience', 'Mercy', 'Humility', 'Truth'];
  const otBooksPool = ds.books.filter((b) => b.fields.bookOrder <= 39).map((b) => normBookName(b.fields.bookName));
  const ntBooksPool = ds.books.filter((b) => b.fields.bookOrder > 39).map((b) => normBookName(b.fields.bookName));

  function pickPoolDistractors(pool: string[], excludeAns: string, qText: string): [string, string, string] | null {
    const qLower = qText.toLowerCase();
    const filtered = pool.filter(
      (item) => norm(item) !== norm(excludeAns) && !qLower.includes(item.toLowerCase())
    );
    if (filtered.length < 3) return null;
    const h = hashStr(excludeAns + qText);
    const i1 = h % filtered.length;
    const i2 = (i1 + 1 + ((h >>> 3) % (filtered.length - 1))) % filtered.length;
    const rem = filtered.filter((_, idx) => idx !== i1 && idx !== i2);
    if (rem.length === 0) return null;
    const i3 = (h >>> 7) % rem.length;
    return [filtered[i1], filtered[i2], rem[i3]];
  }

  for (const q of ds.quizzle) {
    const cr = cleanRef(q.reference || '');
    if (!cr) continue;
    const v = ds.verseByRef.get(cr.toLowerCase());
    if (!v) continue;

    const ans = String(q.answer).trim();
    if (!ans || ans.length > 50) continue;

    let wrong: [string, string, string] | null = null;

    if (/^\d+$/.test(ans)) {
      const num = Number(ans);
      if (num <= 5) {
        const pool = [2, 3, 4, 5, 6, 7].filter((n) => n !== num);
        wrong = [String(pool[0]), String(pool[1]), String(pool[2])];
      } else if (num <= 12) {
        const pool = [3, 7, 10, 12, 14, 20].filter((n) => n !== num);
        wrong = [String(pool[0]), String(pool[1]), String(pool[2])];
      } else if (num <= 40) {
        const pool = [20, 30, 40, 50, 70].filter((n) => n !== num);
        wrong = [String(pool[0]), String(pool[1]), String(pool[2])];
      } else if (num <= 120) {
        const pool = [40, 70, 100, 120, 150].filter((n) => n !== num);
        wrong = [String(pool[0]), String(pool[1]), String(pool[2])];
      } else {
        const pool = [300, 365, 400, 430, 500, 969, 1000].filter((n) => n !== num);
        wrong = [String(pool[0]), String(pool[1]), String(pool[2])];
      }
    } else if (tribesPool.some((t) => norm(t) === norm(ans))) {
      wrong = pickPoolDistractors(tribesPool, ans, q.question);
    } else if (tribalGroupsPool.some((t) => norm(t) === norm(ans))) {
      wrong = pickPoolDistractors(tribalGroupsPool, ans, q.question);
    } else if (otPlacesPool.some((p) => norm(p) === norm(ans)) || ntPlacesPool.some((p) => norm(p) === norm(ans))) {
      const pool = v.testament === 'OT' ? otPlacesPool : ntPlacesPool;
      wrong = pickPoolDistractors(pool, ans, q.question);
    } else if (specialPlacesPool.some((p) => norm(p) === norm(ans))) {
      wrong = pickPoolDistractors(v.testament === 'OT' ? otPlacesPool : ntPlacesPool, ans, q.question);
    } else if (animalsPool.some((a) => norm(a) === norm(ans))) {
      wrong = pickPoolDistractors(animalsPool, ans, q.question);
    } else if (treesPool.some((t) => norm(t) === norm(ans))) {
      wrong = pickPoolDistractors(treesPool, ans, q.question);
    } else if (virtuesPool.some((u) => norm(u) === norm(ans))) {
      wrong = pickPoolDistractors(virtuesPool, ans, q.question);
    } else if (otBooksPool.some((b) => norm(b) === norm(ans))) {
      wrong = pickPoolDistractors(otBooksPool, ans, q.question);
    } else if (ntBooksPool.some((b) => norm(b) === norm(ans))) {
      wrong = pickPoolDistractors(ntBooksPool, ans, q.question);
    } else if (femalePool.some((f) => norm(f) === norm(ans))) {
      wrong = pickPoolDistractors(femalePool, ans, q.question);
    } else if (maleNtPool.some((p) => norm(p) === norm(ans))) {
      wrong = pickPoolDistractors(maleNtPool, ans, q.question);
    } else if (maleOtPool.some((p) => norm(p) === norm(ans))) {
      wrong = pickPoolDistractors(maleOtPool, ans, q.question);
    } else if (
      /^[A-Z][a-z]{2,18}$/.test(ans) &&
      /\b(who|whom|whose|father of|mother of|son of|daughter of|brother of|sister of|husband|wife|king|prophet|apostle|disciple|high priest)\b/i.test(
        q.question
      )
    ) {
      const pool = v.testament === 'NT' ? maleNtPool : maleOtPool;
      wrong = pickPoolDistractors(pool, ans, q.question);
    }

    if (wrong) {
      const isObscureQuizzle =
        /which tree|buried|replaced|second wife|fulfillment|tribes? of|prohibited|jahwe|cube|martyred|called christians/i.test(
          q.question
        ) ||
        /^(Juniper|City of David|Matthias|Levi|Levites|Benjamin|Midian|Antioch|Cyrus|Heli|Ahab|Andrew and Simon)$/i.test(
          ans
        );
      const isSimpleFamous =
        !isObscureQuizzle &&
        q.question.length <= 75 &&
        /Adam|Eve|Noah|Abraham|Isaac|Jacob|Joseph|Moses|Aaron|Joshua|Samson|David|Goliath|Solomon|Elijah|Daniel|Jonah|Jesus|Mary|Bethlehem|Peter|Paul|John the Baptist|Lazarus/i.test(
          `${q.question} ${ans}`
        );
      addRow(isSimpleFamous ? 'e' : 'm', v.ref, q.question, ans, wrong, 'quizzle');
    }
  }

  const MAJOR_BOOKS = new Set([
    'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges',
    'Ruth', '1 Samuel', '2 Samuel', '1 Kings', 'Psalms', 'Proverbs', 'Isaiah',
    'Jeremiah', 'Daniel', 'Jonah', 'Matthew', 'Mark', 'Luke', 'John', 'Acts',
    'Romans', '1 Corinthians', 'Revelation'
  ]);
  const FAMOUS_AUTHOR_BOOKS = new Set([
    'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Psalms', 'Proverbs',
    'Isaiah', 'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', 'Revelation'
  ]);
  const FAMOUS_EVENT_RE =
    /Creation|Adam|Eve|Eden|Cain|Abel|Noah|Flood|Ark|Babel|Abra|Sarah|Lot|Sodom|Isaac|Rebekah|Jacob|Esau|Joseph|Pharaoh|Moses|Bush|Plague|Passover|Red Sea|Manna|Sinai|Commandments|Golden Calf|Joshua|Jericho|Gideon|Samson|Delilah|Ruth|Samuel|Saul|David|Goliath|Bathsheba|Solomon|Temple|Elijah|Carmel|Elisha|Naaman|Daniel|Furnace|Shadrach|Lions|Nebuchadnezzar|Esther|Haman|Jonah|Nineveh|Job|Jesus|Mary|Bethlehem|Magi|Wise Men|Baptist|Baptism|Lazarus|Transfiguration|Supper|Gethsemane|Crucif|Resurrection|Ascension|Pentecost|Stephen|Peter|Paul|Damascus|Barnabas|Patmos/i;

  function pickThree(pool: string[], excludes: string[], seedStr: string): [string, string, string] | null {
    const ex = new Set(excludes.map((s) => norm(s)));
    const filtered = pool.filter((x) => !ex.has(norm(x)));
    if (filtered.length < 3) return null;
    const start = hashStr(seedStr) % filtered.length;
    const step = filtered.length > 5 ? 3 : 1;
    const out: string[] = [];
    for (let k = 0; out.length < 3 && k < filtered.length; k++) {
      const cand = filtered[(start + k * step) % filtered.length];
      if (!out.includes(cand)) out.push(cand);
    }
    if (out.length < 3) {
      for (const cand of filtered) {
        if (!out.includes(cand)) out.push(cand);
        if (out.length === 3) break;
      }
    }
    return out.length === 3 ? (out as [string, string, string]) : null;
  }

  // --- COMPONENT 2: Book Trivia Questions (5 per book across all 66 books) ---
  for (let i = 0; i < books.length; i++) {
    const b = books[i];
    const bRef = `${b.name} 1:1`;
    const bookPool = b.testament === 'OT' ? otBooks : ntBooks;

    // Q1: Following book
    if (i < books.length - 1) {
      const right = books[i + 1].name;
      const wrong = bookPool.filter((x) => x !== b.name && x !== right).slice(0, 3) as [string, string, string];
      if (wrong.length === 3) {
        const ordDiff: 'e' | 'm' = MAJOR_BOOKS.has(b.name) && MAJOR_BOOKS.has(right) ? 'e' : 'm';
        addRow(ordDiff, bRef, `Which book of the Bible immediately follows the book of ${b.name}?`, right, wrong, 'book_order');
      }
    } else {
      const right = 'Revelation';
      const wrong: [string, string, string] = ['Jude', '3 John', 'Hebrews'];
      addRow('e', bRef, 'Which book concludes the New Testament and the entire Bible as its final book?', right, wrong, 'book_order');
    }

    // Q2: Preceding book
    if (i > 0) {
      const right = books[i - 1].name;
      const wrong = bookPool.filter((x) => x !== b.name && x !== right).slice(0, 3) as [string, string, string];
      if (wrong.length === 3) {
        const ordDiff: 'e' | 'm' = MAJOR_BOOKS.has(b.name) && MAJOR_BOOKS.has(right) ? 'e' : 'm';
        addRow(ordDiff, bRef, `Which book of the Bible immediately precedes the book of ${b.name}?`, right, wrong, 'book_order');
      }
    } else {
      const right = 'Genesis';
      const wrong: [string, string, string] = ['Exodus', 'Job', 'Matthew'];
      addRow('e', bRef, 'Which book opens the Old Testament as the very first book of the Bible?', right, wrong, 'book_order');
    }

    // Q3: Book division
    const divPool = b.testament === 'OT' ? otDivs : ntDivs;
    let rightDiv = b.div;
    if (rightDiv === 'Historical') rightDiv = 'Historical Books';
    if (rightDiv === 'Poetry-Wisdom') rightDiv = 'Poetry and Wisdom';
    if (rightDiv === 'Acts') rightDiv = 'Historical (Acts)';
    if (rightDiv === 'Revelation') rightDiv = 'Apocalyptic Literature';
    const wrongDivs = divPool.filter((d) => norm(d) !== norm(rightDiv)).slice(0, 3) as [string, string, string];
    if (wrongDivs.length === 3) {
      const divDiff: 'm' | 'h' = ['Minor Prophets', 'General Epistles', 'Apocalyptic Literature'].includes(rightDiv) ? 'h' : 'm';
      addRow(divDiff, bRef, `In which biblical division is the book of ${b.name} classified?`, rightDiv, wrongDivs, 'book_div');
    }

    // Q4: Chapter count
    const cCount = b.chapters;
    let wChapters: [string, string, string];
    if (cCount === 1) {
      wChapters = ['3', '5', '8'];
    } else if (cCount <= 5) {
      const p = [1, 3, 4, 6, 8, 10].filter((n) => n !== cCount);
      wChapters = [String(p[0]), String(p[1]), String(p[2])];
    } else if (cCount <= 28) {
      const p = [cCount - 4, cCount + 3, cCount + 7].map(String) as [string, string, string];
      wChapters = p;
    } else {
      const p = [cCount - 8, cCount + 6, cCount + 12].map(String) as [string, string, string];
      wChapters = p;
    }
    addRow('h', bRef, `How many chapters are contained in the book of ${b.name}?`, String(cCount), wChapters, 'book_chapters');

    // Q5: Author
    const wPool = b.testament === 'OT' ? otWriters : ntWriters;
    let rightWriter: string | null = null;
    if (b.order <= 5 || b.name === 'Job') rightWriter = 'Moses';
    else if (b.name === 'Joshua') rightWriter = 'Joshua';
    else if (b.name === 'Judges' || b.name === 'Ruth') rightWriter = 'Samuel';
    else if (b.name === '1 Samuel' || b.name === '2 Samuel') rightWriter = 'Samuel';
    else if (b.name === '1 Kings' || b.name === '2 Kings' || b.name === 'Jeremiah' || b.name === 'Lamentations') rightWriter = 'Jeremiah';
    else if (b.name === '1 Chronicles' || b.name === '2 Chronicles' || b.name === 'Ezra') rightWriter = 'Ezra';
    else if (b.name === 'Nehemiah') rightWriter = 'Nehemiah';
    else if (b.name === 'Psalms' || b.name === 'Psalm') rightWriter = 'David';
    else if (b.name === 'Proverbs' || b.name === 'Ecclesiastes' || b.name === 'Song of Solomon') rightWriter = 'Solomon';
    else if (b.name === 'Isaiah') rightWriter = 'Isaiah';
    else if (b.name === 'Ezekiel') rightWriter = 'Ezekiel';
    else if (b.name === 'Daniel') rightWriter = 'Daniel';
    else if (b.name === 'Matthew') rightWriter = 'Matthew';
    else if (b.name === 'Mark') rightWriter = 'Mark';
    else if (b.name === 'Luke' || b.name === 'Acts') rightWriter = 'Luke';
    else if (b.name === 'John' || b.name === '1 John' || b.name === '2 John' || b.name === '3 John' || b.name === 'Revelation') rightWriter = 'John';
    else if (['Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews'].includes(b.name)) rightWriter = 'Paul';
    else if (b.name === 'James') rightWriter = 'James';
    else if (b.name === '1 Peter' || b.name === '2 Peter') rightWriter = 'Peter';
    else if (b.name === 'Jude') rightWriter = 'Jude';

    if (rightWriter) {
      const wrongWriters = pickThree(wPool, [rightWriter], b.name);
      if (wrongWriters && new Set([rightWriter, ...wrongWriters]).size === 4) {
        addRow(FAMOUS_AUTHOR_BOOKS.has(b.name) ? 'e' : 'm', bRef, `Which author is traditionally attributed with writing the book of ${b.name}?`, rightWriter, wrongWriters, 'book_author');
      }
    }
  }

  // --- COMPONENT 3: Event Trivia Questions ---
  for (const e of ds.eventMap.values()) {
    if (!e.title || !e.verses || e.verses.length === 0) continue;
    if (/^Lifetime of /i.test(e.title)) continue;
    const v = ds.verseById.get(e.verses[0]);
    if (!v) continue;

    const isFamousEv = FAMOUS_EVENT_RE.test(e.title) && !/^(?:Birth|Death|Reign) of /i.test(e.title);

    // Event book trivia (skip if event title already contains book name)
    const bookPool = v.testament === 'OT' ? otBooks : ntBooks;
    const wrongBooks = pickThree(bookPool, [v.bookName], e.title);
    if (wrongBooks && new Set([v.bookName, ...wrongBooks]).size === 4 && !norm(e.title).includes(norm(v.bookName))) {
      addRow(isFamousEv ? 'e' : 'm', v.ref, `In which book of the Bible does the event '${e.title}' occur?`, v.bookName, wrongBooks, 'event_book');
    }

    // Event location trivia
    if (e.locations && e.locations.length === 1) {
      const place = ds.placeMap.get(e.locations[0]);
      if (place && place.displayTitle && place.displayTitle.length <= 40 && !norm(e.title).includes(norm(place.displayTitle))) {
        const placePool = v.testament === 'OT' ? otPlacesPool : ntPlacesPool;
        const wrongPlaces = pickThree(placePool, [place.displayTitle], e.title);
        if (wrongPlaces && new Set([place.displayTitle, ...wrongPlaces]).size === 4) {
          addRow('h', v.ref, `Where did the biblical event '${e.title}' take place?`, place.displayTitle, wrongPlaces, 'event_loc');
        }
      }
    }
  }

  // --- COMPONENT 4: Clean Named Person Relationship Questions ---
  for (const p of ds.personMap.values()) {
    if (!p.name || !p.verses || p.verses.length === 0) continue;
    const v = ds.verseById.get(p.verses[0]);
    if (!v) continue;

    // Strict person filters: named individual, not gentilic demonym, verseCount >= 2 or linked events
    if (p.isProperName === false) continue;
    const personClean = p.name.replace(/\s*\(\d+\)$/, '').replace(/_\d+$/, '').trim();
    if (personClean.length < 3 || /^the /i.test(personClean)) continue;
    if (/['’]|^[a-z]/.test(personClean)) continue;
    if (/ite$|ites$|im$/i.test(personClean)) continue;
    if (['jesus', 'god', 'christ', 'israel'].includes(personClean.toLowerCase())) continue;
    if ((p.verseCount ?? 0) < 2 && (!p.events || p.events.length === 0)) continue;

    // Father questions
    if (p.father && p.father.length === 1) {
      const f = ds.personMap.get(p.father[0]);
      if (f && f.name && f.isProperName !== false) {
        let fatherClean = f.name.replace(/\s*\(\d+\)$/, '').replace(/_\d+$/, '').trim();
        if (fatherClean.toLowerCase() === 'israel') fatherClean = 'Jacob';
        if (fatherClean.length >= 3 && !/ite$|ites$|im$/i.test(fatherClean) && !/^the /i.test(fatherClean) && norm(fatherClean) !== norm(personClean)) {
          const pool = v.testament === 'OT' ? maleOtPool : maleNtPool;
          const wrongFathers = pickThree(pool, [fatherClean, personClean], personClean + fatherClean);
          if (wrongFathers && new Set([fatherClean, ...wrongFathers]).size === 4) {
            const pVc = p.verseCount ?? 0;
            const fVc = f.verseCount ?? 0;
            if (v.testament === 'NT' || pVc >= 5 || (hashStr(personClean + fatherClean) % 4 === 0)) {
              const fatherDiff: 'e' | 'm' | 'h' =
                pVc >= 50 && (fVc >= 50 || fatherClean === 'Jacob') ? 'e' : pVc >= 15 ? 'm' : 'h';
              addRow(fatherDiff, v.ref, `According to biblical records, who was the father of ${personClean}?`, fatherClean, wrongFathers, 'person_father');
            }
          }
        }
      }
    }

    // Mother questions
    if (p.mother && p.mother.length === 1) {
      const m = ds.personMap.get(p.mother[0]);
      if (m && m.name && m.isProperName !== false) {
        const motherClean = m.name.replace(/\s*\(\d+\)$/, '').replace(/_\d+$/, '').trim();
        if (motherClean.length >= 3 && !/ite$|ites$|im$/i.test(motherClean) && norm(motherClean) !== norm(personClean)) {
          const wrongMothers = pickThree(femalePool, [motherClean, personClean], personClean + motherClean);
          if (wrongMothers && new Set([motherClean, ...wrongMothers]).size === 4) {
            const pVc = p.verseCount ?? 0;
            const mVc = m.verseCount ?? 0;
            const motherDiff: 'e' | 'm' | 'h' = pVc >= 50 && mVc >= 40 ? 'e' : pVc >= 15 ? 'm' : 'h';
            addRow(motherDiff, v.ref, `Who was the mother of ${personClean}?`, motherClean, wrongMothers, 'person_mother');
          }
        }
      }
    }

    // Tribe questions (strictly 'm' or 'h' — never 'e'!)
    if (p.memberOf && p.memberOf.length === 1) {
      const g = ds.groupMap.get(p.memberOf[0]);
      if (g && g.groupName) {
        const cleanTribe = g.groupName.replace(/^Tribe of /, '').trim();
        if (tribesPool.includes(cleanTribe) && norm(cleanTribe) !== norm(personClean)) {
          const wrongTribes = pickThree(tribesPool, [cleanTribe, personClean], personClean + cleanTribe);
          if (wrongTribes && new Set([cleanTribe, ...wrongTribes]).size === 4) {
            const tribeDiff: 'm' | 'h' = (p.verseCount ?? 0) >= 80 ? 'm' : 'h';
            addRow(tribeDiff, v.ref, `To which tribe of Israel did ${personClean} belong?`, cleanTribe, wrongTribes, 'person_tribe');
          }
        }
      }
    }
  }

  // --- COMPONENT 5: Verse Completion Questions (filling out book representation) ---
  for (const v of ds.verses) {
    const list = candidatesByBook.get(v.bookName) || [];
    const bookCap = v.testament === 'OT' ? 24 : 32;
    if (list.length >= bookCap) continue;
    if (v.text.length < 40 || v.text.length > 170) continue;
    if (/begat|were numbered|twenty and two thousand/i.test(v.text)) continue;

    for (const [famName, words] of Object.entries(FAMILIES)) {
      for (const w of words) {
        const reg = new RegExp(`\\b${w}\\b`, 'gi');
        const m = v.text.match(reg);
        if (m && m.length === 1) {
          const rawTruth = m[0];
          const prompt = v.text.replace(reg, '____');
          const validDecoys = words.filter(
            (dw) => norm(dw) !== norm(rawTruth) &&
                    !tooClose(dw, rawTruth) &&
                    !FORBIDDEN_TEST_STRINGS.has(norm(dw)) &&
                    !new RegExp(`\\b${dw}\\b`, 'i').test(v.text)
          );

          if (validDecoys.length >= 3) {
            const h = hashStr(v.ref + rawTruth);
            const w1 = matchCase(validDecoys[h % validDecoys.length], rawTruth);
            const rem1 = validDecoys.filter((x) => norm(x) !== norm(w1) && !tooClose(x, w1));
            if (rem1.length >= 2) {
              const w2 = matchCase(rem1[(h >>> 3) % rem1.length], rawTruth);
              const rem2 = rem1.filter((x) => norm(x) !== norm(w2) && !tooClose(x, w2));
              if (rem2.length >= 1) {
                const w3 = matchCase(rem2[(h >>> 6) % rem2.length], rawTruth);
                const qText = `Complete ${v.ref}: "${prompt}"`;
                const isEasyCompletion =
                  ['Genesis', 'Exodus', 'Psalms', 'Psalm', 'Proverbs', 'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans'].includes(v.bookName) &&
                  v.text.length <= 105 &&
                  /^(?:love|grace|faith|peace|light|king|lord|heart|bread|water|sheep|shepherd|temple|heaven|earth|truth|spirit|moses|david|abraham|jerusalem|israel)$/i.test(rawTruth);
                addRow(isEasyCompletion ? 'e' : 'm', v.ref, qText, rawTruth, [w1, w2, w3], 'verse_completion');
                break;
              }
            }
          }
        }
      }
    }
  }

  // --- INTERLEAVE ACROSS ALL 66 BOOKS & ROTATE QUESTION TYPES ---
  // In each book's queue, stagger question types so consecutive books ask different question types
  const TYPE_RANKS: Record<string, number> = {
    quizzle: 0,
    verse_completion: 1,
    person_father: 2,
    event_book: 3,
    book_order: 4,
    person_mother: 5,
    event_loc: 6,
    book_div: 7,
    person_tribe: 8,
    book_chapters: 9,
    book_author: 10,
  };

  for (const [bName, list] of candidatesByBook.entries()) {
    list.sort((a, b) => {
      const rankA = ((TYPE_RANKS[a.type] ?? 0) + a.bookOrder * 3) % 11;
      const rankB = ((TYPE_RANKS[b.type] ?? 0) + b.bookOrder * 3) % 11;
      if (rankA !== rankB) return rankA - rankB;
      return a.ref.localeCompare(b.ref);
    });
  }

  const bookQueues = books.map((b) => ({
    book: b,
    items: candidatesByBook.get(b.name) || [],
  }));

  const interleaved: RawCandidateG3[] = [];
  let added = true;
  while (added && interleaved.length < 2100) {
    added = false;
    for (const bq of bookQueues) {
      if (bq.items.length > 0) {
        interleaved.push(bq.items.shift()!);
        added = true;
        if (interleaved.length >= 2100) break;
      }
    }
  }

  // Preserve each question's genuine difficulty ('e' | 'm' | 'h') instead of blindly rotating
  const finalRows: GeneratedG3Row[] = interleaved.map((r) => ({
    d: r.d,
    ref: r.ref,
    question: r.question,
    right: r.right,
    wrong: r.wrong,
  }));

  return finalRows;
}

// ============================================================================
// 4. MAIN ORCHESTRATOR & OUTPUT GENERATOR
// ============================================================================

export function run() {
  console.log('Loading Arkade biblical dataset...');
  const ds = loadDataset();

  console.log('Generating Fake Verse items (with word-cap & round-robin book interleaving)...');
  const fvRows = generateFakeVerse(ds);

  console.log('Generating Battle Royale (Gideon 300) items (with clean named people & book interleaving)...');
  const g3Rows = generateBattleRoyale(ds);

  const fvPath = path.join(DATA_DIR, 'fv.ts');
  const g3Path = path.join(DATA_DIR, 'g300.ts');

  const fvSeeds = extractSeedBlock(fvPath, 'FV');
  const g3Seeds = extractSeedBlock(g3Path, 'G3');

  if (!fvSeeds || !g3Seeds) {
    throw new Error('Failed to extract original seed rows from data files!');
  }

  console.log(`Preserved ${fvSeeds.split('\n').length} FV seed rows and ${g3Seeds.split('\n').length} G3 seed rows.`);

  // Write fv.ts
  const fvLines = fvRows.map((r) =>
    `  [${JSON.stringify(r.id)}, ${JSON.stringify(r.d)}, ${JSON.stringify(r.a)}, ${JSON.stringify(r.t)}, ${JSON.stringify(r.ref)}, ${JSON.stringify(r.prompt)}, ${JSON.stringify(r.truth)}, [${JSON.stringify(r.decoys[0])}, ${JSON.stringify(r.decoys[1])}]],`
  );

  const fvOutput = `// Fake Verse prompts. [id, difficulty, audience, testament, verse key, prompt, truth, [decoy, decoy]]
export type FvRow = [string, 'e' | 'm' | 'h', string, 'OT' | 'NT' | 'both', string, string, string, [string, string]];
export const FV: FvRow[] = [
${fvSeeds}
  // === GENERATED ITEMS ===
${fvLines.join('\n')}
];
`;

  fs.writeFileSync(fvPath, fvOutput, 'utf8');
  console.log(`Wrote ${fvRows.length} generated items to ${fvPath} (total FV: ${fvSeeds.split('\n').length + fvRows.length})`);

  // Write g300.ts
  const g3Lines = g3Rows.map((r) =>
    `  [${JSON.stringify(r.d)}, ${JSON.stringify(r.ref)}, ${JSON.stringify(r.question)}, ${JSON.stringify(r.right)}, [${JSON.stringify(r.wrong[0])}, ${JSON.stringify(r.wrong[1])}, ${JSON.stringify(r.wrong[2])}]],`
  );

  const g3Output = `// Gideon's 300 questions. [difficulty, verse key, question, correct answer, [3 wrong answers]]
// The correct option's position is rotated deterministically by the loader.
export type G3Row = ['e' | 'm' | 'h', string, string, string, [string, string, string]];
export const G3: G3Row[] = [
${g3Seeds}
  // === GENERATED ITEMS ===
${g3Lines.join('\n')}
];
`;

  fs.writeFileSync(g3Path, g3Output, 'utf8');
  console.log(`Wrote ${g3Rows.length} generated items to ${g3Path} (total G3: ${g3Seeds.split('\n').length + g3Rows.length})`);

  // ============================================================================
  // 5. COMPREHENSIVE VERIFICATION & REPORTING
  // ============================================================================

  console.log('\n================ VERIFICATION REPORT ================');

  // Validate FV items
  const fvBookSet = new Set<string>();
  const fvDiff = { e: 0, m: 0, h: 0 };
  const fvAud = { kya: 0, ya: 0, a: 0 };
  const fvTest = { OT: 0, NT: 0 };
  const seenFvIds = new Set<string>();
  const seenFvRefTruth = new Set<string>();
  const fvWordFreq = new Map<string, number>();

  for (const r of fvRows) {
    if (seenFvIds.has(r.id)) throw new Error(`Duplicate FV ID: ${r.id}`);
    seenFvIds.add(r.id);

    const rtKey = `${r.ref}::${r.truth.toLowerCase()}`;
    if (seenFvRefTruth.has(rtKey)) throw new Error(`Duplicate FV ref+truth: ${rtKey}`);
    seenFvRefTruth.add(rtKey);

    fvDiff[r.d]++;
    if (r.a in fvAud) (fvAud as any)[r.a]++;
    fvTest[r.t]++;

    const nTruth = norm(r.truth);
    fvWordFreq.set(nTruth, (fvWordFreq.get(nTruth) || 0) + 1);

    const v = ds.verseByRef.get(r.ref.toLowerCase());
    if (!v) throw new Error(`FV ref not found in verses: ${r.ref}`);
    fvBookSet.add(v.bookName);

    // Schema validation
    const item = {
      id: `fv-${r.id}`,
      difficulty: r.d === 'e' ? 'easy' : r.d === 'm' ? 'medium' : 'hard',
      audience: [...r.a].map((c) => (c === 'k' ? 'kids' : c === 'y' ? 'youth' : 'adults')),
      testament: r.t,
      ref: r.ref,
      verse: v.text,
      translation: 'KJV' as const,
      review: 'approved' as const,
      text: r.prompt,
      truth: r.truth,
      decoys: r.decoys,
    };
    const sRes = FvSchema.safeParse(item);
    if (!sRes.success) throw new Error(`FvSchema failed for ${r.id}: ${sRes.error.message}`);
  }

  // Check word cap
  let maxWordCount = 0;
  let maxWord = '';
  for (const [w, count] of fvWordFreq.entries()) {
    if (count > maxWordCount) {
      maxWordCount = count;
      maxWord = w;
    }
  }

  console.log(`FV Verification:
  - Total Generated Rows: ${fvRows.length} (Target: >= 1000)
  - Total Combined Rows: ${fvSeeds.split('\n').length + fvRows.length} (Target: >= 1030)
  - Book Coverage: ${fvBookSet.size} / 66 books
  - Lexical Variety: ${fvWordFreq.size} distinct blank words (max count for single word "${maxWord}" = ${maxWordCount} <= 5)
  - Difficulty: Easy=${fvDiff.e}, Medium=${fvDiff.m}, Hard=${fvDiff.h}
  - Audience: kya=${fvAud.kya}, ya=${fvAud.ya}, a=${fvAud.a}
  - Testament: OT=${fvTest.OT}, NT=${fvTest.NT}
  - Schema & Invariants: All valid, 0 errors!`);

  console.log('\n--- First 10 Generated FV Rows (Sample Diversity) ---');
  for (let i = 0; i < 10 && i < fvRows.length; i++) {
    const r = fvRows[i];
    console.log(`  [${r.id}] ${r.ref} (${r.t}, ${r.d}, ${r.a}): "${r.truth}" -> [${r.decoys.join(', ')}] | Prompt: ${r.prompt.slice(0, 60)}...`);
  }

  // Validate G3 items
  const g3BookSet = new Set<string>();
  const g3Diff = { e: 0, m: 0, h: 0 };
  const g3Test = { OT: 0, NT: 0 };

  for (let i = 0; i < g3Rows.length; i++) {
    const r = g3Rows[i];
    g3Diff[r.d]++;

    const v = ds.verseByRef.get(r.ref.toLowerCase());
    if (!v) throw new Error(`G3 ref not found in verses: ${r.ref}`);
    g3BookSet.add(v.bookName);
    g3Test[v.testament]++;

    // Option uniqueness and length checks
    const optSet = new Set([r.right, ...r.wrong]);
    if (optSet.size !== 4) throw new Error(`G3 row ${i} has duplicate options: ${r.right}, ${r.wrong.join(', ')}`);

    const options = [r.right, ...r.wrong];
    for (const opt of options) {
      if (!opt || opt.length > 60) throw new Error(`G3 option invalid length: "${opt}"`);
    }

    // Schema validation
    const item = {
      id: `g3-${i + 1}`,
      difficulty: r.d === 'e' ? 'easy' : r.d === 'm' ? 'medium' : 'hard',
      audience: r.d === 'e' ? ['kids', 'youth', 'adults'] : ['youth', 'adults'],
      testament: 'both' as const,
      ref: r.ref,
      verse: v.text,
      translation: 'KJV' as const,
      review: 'approved' as const,
      question: r.question,
      options,
      correct: 0,
    };
    const sRes = G3Schema.safeParse(item);
    if (!sRes.success) throw new Error(`G3Schema failed for ${r.ref}: ${sRes.error.message}`);
  }

  console.log(`\nG3 Verification:
  - Total Generated Rows: ${g3Rows.length} (Target: >= 1200, within 1500-2500 range)
  - Total Combined Rows: ${g3Seeds.split('\n').length + g3Rows.length} (Target: >= 1260)
  - Book Coverage: ${g3BookSet.size} / 66 books
  - Difficulty: Easy=${g3Diff.e}, Medium=${g3Diff.m}, Hard=${g3Diff.h}
  - Testament: OT=${g3Test.OT}, NT=${g3Test.NT}
  - Schema & Invariants: All valid, 0 errors!`);

  console.log('\n--- First 10 Generated G3 Rows (Sample Diversity) ---');
  for (let i = 0; i < 10 && i < g3Rows.length; i++) {
    const r = g3Rows[i];
    console.log(`  [G3-${i + 1}] ${r.ref} (${r.d}): "${r.question}" -> Right: "${r.right}" | Wrong: [${r.wrong.join(', ')}]`);
  }

  console.log('\nDeterministic compilation completed successfully with ZERO errors.');
}

// Execute if run directly
run();
