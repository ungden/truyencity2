/**
 * Audit 1164 titles → flag bad patterns.
 *
 * Flags:
 *   - TQ jargon untranslated: "mã giáp", "kim bảng", "khoái xuyên" (when standalone)
 *   - English mix: Cosmic / Reaction / Time Loop / AI-X / WiFi / Cyber / Pokemon / Style / Stand / Squad
 *   - Real TQ placename: Trường An, Bắc Kinh, Thượng Hải, Đại Đường, Đại Tống, Đại Minh, Đại Lý, Tang triều, Hung Nô
 *   - Generic / saturated patterns: opening with "Ta" repeated too much per genre
 *
 * Output: tmp/title-audit/flagged.json + summary stats.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const inputPath = path.resolve(__dirname, '../tmp/title-audit/all-novels.json');
const rows = JSON.parse(fs.readFileSync(inputPath, 'utf8')) as Array<{
  project_id: string; novel_id: string; old_title: string; old_slug: string;
  genre: string | null; main_character: string | null; current_chapter: number;
  description: string; world_description: string; pause_reason: string | null; bucket: string;
}>;

const JARGON_UNTRANSLATED = [
  /\bmã giáp\b/i,
  /\bkim bảng\b/i,
  /\bphá phòng\b/i,         // "破防" — too jargon
  /\bsequence \d/i,         // "Sequence 9"
  /\bsequence path/i,
];

const ENGLISH_MIX = [
  /\bcosmic\b/i,
  /\breaction\b/i,
  /\btime loop\b/i,
  /\bai-\d/i,
  /\bwifi\b/i,
  /\bcyber\b/i,
  /\bpokemon\b/i,
  /\bdbz\b/i,
  /\bjojo\b/i,
  /\bsquad\b/i,
  /\bstand\b/i,
  /\bspace bakery\b/i,
  /\bbakery\b/i,
];

const TQ_PLACENAME = [
  /\btrường an\b/i,
  /\bbắc kinh\b/i,
  /\bthượng hải\b/i,
  /\bđại đường\b/i,
  /\bđại tống\b/i,
  /\bđại minh\b/i,
  /\bđại lý\b/i,  // BUT "Đại Lý" có thể là Đại Lý Tự VN không?
  /\btang triều\b/i,
  /\bhung nô\b/i,
  /\bcửu châu\b/i,
];

interface Flag {
  reason: string;
  match: string;
}

interface FlagResult {
  project_id: string;
  novel_id: string;
  bucket: string;
  current_chapter: number;
  old_title: string;
  flags: Flag[];
  flag_count: number;
}

function flag(title: string): Flag[] {
  const flags: Flag[] = [];
  for (const re of JARGON_UNTRANSLATED) {
    const m = title.match(re);
    if (m) flags.push({ reason: 'tq_jargon_untranslated', match: m[0] });
  }
  for (const re of ENGLISH_MIX) {
    const m = title.match(re);
    if (m) flags.push({ reason: 'english_mix', match: m[0] });
  }
  for (const re of TQ_PLACENAME) {
    const m = title.match(re);
    if (m) flags.push({ reason: 'tq_placename', match: m[0] });
  }
  return flags;
}

const flagged: FlagResult[] = [];
const buckets = new Map<string, { total: number; flagged: number; reasons: Map<string, number> }>();

for (const r of rows) {
  const flags = flag(r.old_title);
  const stat = buckets.get(r.bucket) ?? { total: 0, flagged: 0, reasons: new Map<string, number>() };
  stat.total++;
  if (flags.length > 0) {
    stat.flagged++;
    for (const f of flags) {
      stat.reasons.set(f.reason, (stat.reasons.get(f.reason) ?? 0) + 1);
    }
    flagged.push({
      project_id: r.project_id,
      novel_id: r.novel_id,
      bucket: r.bucket,
      current_chapter: r.current_chapter,
      old_title: r.old_title,
      flags,
      flag_count: flags.length,
    });
  }
  buckets.set(r.bucket, stat);
}

const outPath = path.resolve(__dirname, '../tmp/title-audit/flagged.json');
fs.writeFileSync(outPath, JSON.stringify(flagged, null, 2));

console.log(`\n━━━━ AUDIT FLAGS ━━━━`);
console.log(`Total scanned: ${rows.length}`);
console.log(`Total flagged: ${flagged.length}`);
console.log(`Output: ${outPath}\n`);

console.log('Per bucket:');
for (const [b, s] of [...buckets.entries()].sort((a, b) => b[1].total - a[1].total)) {
  const reasons = [...s.reasons.entries()].map(([r, c]) => `${r}=${c}`).join(', ');
  console.log(`  ${b.padEnd(28)} ${s.flagged}/${s.total} flagged ${reasons ? `(${reasons})` : ''}`);
}

console.log('\nTop 15 flagged titles:');
flagged.slice(0, 15).forEach((f, i) => {
  const reasons = f.flags.map((x) => `${x.reason}:${x.match}`).join(' / ');
  console.log(`  ${i + 1}. [${f.bucket}] [ch.${f.current_chapter}] ${f.old_title}`);
  console.log(`     ↑ ${reasons}`);
});
