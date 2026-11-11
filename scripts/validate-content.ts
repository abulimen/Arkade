// Build-time content validation (FR-53): schema, unique ids, references and verse text, option sanity, plus a coverage report.
//   npx tsx scripts/validate-content.ts
import { TARGETS, coverage, validate } from '../src/server/content';

const { content, problems } = validate();
const cov = coverage(content);
console.log('Content coverage (items / PRD launch target)');
for (const k of Object.keys(TARGETS) as (keyof typeof TARGETS)[]) {
  const c = cov[k];
  const gap = TARGETS[k] - c.total;
  console.log(`  ${k.padEnd(5)} ${String(c.total).padStart(3)}/${TARGETS[k]}  easy ${c.easy}  medium ${c.medium}  hard ${c.hard}  | kids ${c.kids}  youth ${c.youth}  adults ${c.adults}${gap > 0 ? `   (${gap} short of launch target)` : ''}`);
}
if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ✗ ${p.game}/${p.id}: ${p.message}`);
  process.exit(1);
}
console.log('\n✓ every item has a reference, verse text (KJV) and passes its schema');
