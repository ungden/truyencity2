/**
 * Phase R+1 (2026-05-15) — multi-mode backfill orchestrator.
 *
 * Routes each outlier chapter to the appropriate pipeline based on which
 * flags fired:
 *
 *   - WORD-OVERSHOOT only (no semantic flags) → Length-Normalizer pass
 *     (cheap, plot-preserving, ±15% length adjustment)
 *
 *   - 1 surface-only flag (MC-RATE-MOD, EYE-MOD, single PWV moderate) →
 *     Polisher pass (surface-only, ≤±15% length, plot preserved)
 *
 *   - 2+ critical flags OR INSP-CRIT OR TAIL-MAJ OR critical PWV
 *     (META-NARR / REPORT-TERMS / CHAPTER-REF) → full Reviser pass
 *     (broader rewrite, current Phase R backfill-repetition-fixes prompt)
 *
 * Each pass validates the revised output via the same detectors. If
 * critical flags remain, route to next-stronger mode (escalate).
 *
 * Usage:
 *   npx tsx scripts/backfill-orchestrator.ts <novel_id> [--apply] [--limit N]
 *   npx tsx scripts/backfill-orchestrator.ts --all-production [--apply]
 *
 * Default = dry-run, writes before/after/diff to tmp/backfill-orch/<novel>/.
 */

import * as dotenv from 'dotenv';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { callGemini } from '../src/services/story-engine/utils/gemini';
import {
  detectMcNameRate,
  detectEyeTemplateOveruse,
  detectInspirationalCluster,
  detectMonologueTail,
  detectSevereRepetition,
  countWords,
} from '../src/services/story-engine/pipeline/chapter-writer-helpers';
import { runPostWriteValidator } from '../src/services/story-engine/quality/post-write-validator';
import { normalizeChapterLength } from '../src/services/story-engine/pipeline/length-normalizer';
import { polishChapter } from '../src/services/story-engine/pipeline/polisher';
import { defaultLengthSpec } from '../src/services/story-engine/utils/length-metrics';
import { stripPostWriteMetaLines } from '../src/services/story-engine/quality/post-write-validator';

dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

type Mode = 'length' | 'polish' | 'revise' | 'skip';

interface FlagSet {
  mcRateCrit: boolean;
  mcRateMod: boolean;
  mcRate: number;
  mcCount: number;
  eyeCrit: boolean;
  eyeMod: boolean;
  eyeCount: number;
  inspCrit: boolean;
  inspMod: boolean;
  inspTotal: number;
  tailMaj: boolean;
  tailMod: boolean;
  wordOvershoot: boolean;
  wordOvershootSevere: boolean; // >2.0×
  wordRatio: number;
  words: number;
  pwvCritical: number;
  pwvMajor: number;
  pwvModerate: number;
  pwvTags: string[];
  repCrit: boolean;
  repMod: boolean;
  hasCritical: boolean;
}

function diagnose(content: string, mc: string, targetWords: number): FlagSet {
  const words = countWords(content);
  const wordRatio = words / targetWords;
  const mcr = detectMcNameRate(content, mc);
  const eye = detectEyeTemplateOveruse(content);
  const insp = detectInspirationalCluster(content);
  const tail = detectMonologueTail(content, mc);
  const repetition = detectSevereRepetition(content);
  const pwvIssues = runPostWriteValidator({ content });

  const f: FlagSet = {
    mcRateCrit: mcr.severity === 'critical',
    mcRateMod: mcr.severity === 'moderate',
    mcRate: mcr.rate,
    mcCount: mcr.count,
    eyeCrit: eye.severity === 'critical',
    eyeMod: eye.severity === 'moderate',
    eyeCount: eye.count,
    inspCrit: insp.severity === 'critical',
    inspMod: insp.severity === 'moderate',
    inspTotal: insp.total,
    tailMaj: tail.severity === 'major',
    tailMod: tail.severity === 'moderate',
    wordOvershoot: wordRatio > 1.6,
    wordOvershootSevere: wordRatio > 2.0,
    wordRatio,
    words,
    pwvCritical: pwvIssues.filter(i => i.severity === 'critical').length,
    pwvMajor: pwvIssues.filter(i => i.severity === 'major').length,
    pwvModerate: pwvIssues.filter(i => i.severity === 'moderate').length,
    pwvTags: pwvIssues.map(i => i.description.split('—')[0].slice(0, 40)),
    repCrit: repetition.some(r => r.severity === 'critical'),
    repMod: repetition.some(r => r.severity === 'moderate'),
    hasCritical: false,
  };
  f.hasCritical =
    f.mcRateCrit ||
    f.eyeCrit ||
    f.inspCrit ||
    f.tailMaj ||
    f.wordOvershoot ||
    f.pwvCritical > 0 ||
    f.repCrit;
  return f;
}

function chooseMode(flags: FlagSet): Mode {
  if (!flags.hasCritical) return 'skip';

  // Severe overshoot + multiple criticals → full revise
  if (
    flags.wordOvershootSevere ||
    flags.inspCrit ||
    flags.tailMaj ||
    flags.pwvCritical >= 2 ||
    countCriticalFlags(flags) >= 3
  ) {
    return 'revise';
  }

  // PWV critical (META-NARR / REPORT-TERMS / CHAPTER-REF) → revise
  if (flags.pwvCritical > 0) return 'revise';

  // Word overshoot only (or with mild surface flags) → length-normalize first
  if (flags.wordOvershoot) {
    // If only word + mild MC/EYE → length-normalize alone may handle it
    return 'length';
  }

  // 1-2 surface-only criticals (MC-RATE-CRIT or EYE-CRIT) → polish
  if ((flags.mcRateCrit ? 1 : 0) + (flags.eyeCrit ? 1 : 0) <= 2) {
    return 'polish';
  }

  // Fallback
  return 'revise';
}

function countCriticalFlags(f: FlagSet): number {
  return (
    (f.mcRateCrit ? 1 : 0) +
    (f.eyeCrit ? 1 : 0) +
    (f.inspCrit ? 1 : 0) +
    (f.tailMaj ? 1 : 0) +
    (f.wordOvershoot ? 1 : 0) +
    f.pwvCritical
  );
}

// ─── Revise pass (full content rewrite, broader scope) ──────────────────────

const REVISER_SYSTEM = `Bạn là biên tập viên cao cấp truyện dài kỳ tiếng Việt 1000+ chương. Khi sửa lặp, GIỮ NGUYÊN: cốt truyện, dialogue, scene structure, sự kiện, thế giới quan, tên nhân vật. CHỈ thay đổi prose layer — cách diễn đạt, đại từ, mô tả gián tiếp.

KHÔNG thêm chú thích, KHÔNG xuất "Chương N", KHÔNG markdown. Trả về thuần văn Việt theo format có em-dash dialogue và đoạn văn cách bằng newline đôi.`;

async function reviseChapter(
  content: string,
  mc: string,
  targetWords: number,
  flags: FlagSet,
  projectId: string,
  chapterNumber: number,
): Promise<{ revised: string | null; error?: string }> {
  const instructions: string[] = [];

  if (flags.mcRateCrit || flags.mcRateMod) {
    instructions.push(
      `MC NAME OVERUSE: "${mc}" ${flags.mcCount} lần / ${flags.words} từ = ${flags.mcRate.toFixed(1)}/1K. Target webnovel 6-10/1K. Giảm ≤10/1K: thay 30-50% lần "${mc}" bằng "hắn"/"y"/"anh ta" khi context rõ subject; bỏ trong câu liên tiếp; dialogue tag thay bằng đại từ. KHÔNG đổi tên MC.`,
    );
  }
  if (flags.eyeCrit || flags.eyeMod) {
    instructions.push(
      `EYE TEMPLATE: "đôi mắt"/"ánh mắt" ${flags.eyeCount} lần. Giảm ≤8: thay vài lần bằng action verb (nhíu mày / bặm môi / nghiêng đầu / xoa cằm / gập tay / dựa lưng) hoặc dialogue ngắn tiết lộ cảm xúc.`,
    );
  }
  if (flags.inspCrit || flags.inspMod) {
    instructions.push(
      `INSPIRATIONAL CLOSER SPAM: ${flags.inspTotal} hits "huyền thoại/vinh quang/huy hoàng/rực rỡ/định sẵn". CẮT TOÀN BỘ "MC là huyền thoại / vương quốc của hắn / vĩnh hằng". Đoạn kết PHẢI là scene cụ thể (action / dialogue / decision / setup chương sau), KHÔNG monologue ca tụng.`,
    );
  }
  if (flags.tailMaj || flags.tailMod) {
    instructions.push(
      `MONOLOGUE TAIL: 20% cuối spam MC + future-tense + abstract noun. Cắt phần đó, thay scene cụ thể đóng chương hoặc cliffhanger sự kiện.`,
    );
  }
  if (flags.wordOvershoot) {
    const targetMax = Math.round(targetWords * 1.2);
    instructions.push(
      `WORD OVERSHOOT: ${flags.words} từ vs target ${targetWords} (${Math.round(flags.wordRatio * 100)}%). Cắt ≤${targetMax} từ. Ưu tiên cắt: (1) monologue cuối, (2) paraphrase trùng ý, (3) mô tả thừa.`,
    );
  }
  if (flags.pwvCritical > 0 || flags.pwvMajor > 0) {
    instructions.push(
      `POST-WRITE-VALIDATOR: ${flags.pwvTags.slice(0, 5).join(' | ')}. Sửa theo nguyên tắc: KHÔNG meta-narration ("tiếp theo sẽ là.../ câu chuyện đến đây..."), KHÔNG analysis-report terms ("động cơ cốt lõi / lợi ích tối đa"), KHÔNG sermon words ("hiển nhiên / ai cũng biết"), KHÔNG crowd-shock ("cả hội trường chấn động"), KHÔNG "Chương N" trong body, paragraph length đa dạng (CV ≥ 0.15).`,
    );
  }

  const prompt = `${REVISER_SYSTEM}

CHƯƠNG GỐC:
"""
${content}
"""

NHIỆM VỤ: Sửa các lỗi sau, GIỮ NGUYÊN cốt truyện:

${instructions.map((s, i) => `${i + 1}. ${s}`).join('\n\n')}

QUY TẮC CHUNG:
- GIỮ NGUYÊN: cốt truyện, dialogue (em-dash), scene structure, tên character, world detail, sự kiện.
- CHỈ thay đổi: cách diễn đạt narration, đại từ, mô tả phản ứng cảm xúc.
- Độ dài: ≤${Math.round(targetWords * 1.2)} từ.
- Format: thuần văn Việt, em-dash dialogue, đoạn cách newline đôi.
- KHÔNG "Chương N", KHÔNG markdown, KHÔNG chú thích.

Trả về NỘI DUNG ĐÃ SỬA:`;

  try {
    const res = await callGemini(
      prompt,
      {
        model: 'gemini-3.1-flash-lite',
        temperature: 0.3,
        maxTokens: 32768,
      },
      { tracking: { projectId, task: 'auto_revision', chapterNumber } },
    );
    let out = res.content?.trim() || '';
    out = stripPostWriteMetaLines(out);
    out = out
      .replace(/^```[\w]*\s*/m, '')
      .replace(/\s*```\s*$/m, '')
      .replace(/^Chương\s+\d+\s*[:\-–—]\s*[^\n]*\n+/i, '')
      .replace(/^#{1,6}\s+[^\n]*\n+/m, '')
      .trim();
    if (!out || out.length < content.length * 0.4) {
      return { revised: null, error: `Revised too short: ${out.length}/${content.length}` };
    }
    if (out.length > content.length * 1.3) {
      return { revised: null, error: `Revised too long: ${out.length}/${content.length}` };
    }
    return { revised: out };
  } catch (e) {
    return { revised: null, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─── Main per-novel processor ────────────────────────────────────────────────

async function processNovel(
  novelId: string,
  apply: boolean,
  limit: number,
): Promise<{ processed: number; resolved: number; failed: number; stillBad: number; modeBreakdown: Record<Mode, number> }> {
  const { data: project } = await s
    .from('ai_story_projects')
    .select('id,main_character,target_chapter_length,style_directives')
    .eq('novel_id', novelId)
    .maybeSingle();
  if (!project) {
    console.error(`No project for ${novelId}`);
    return { processed: 0, resolved: 0, failed: 0, stillBad: 0, modeBreakdown: { length: 0, polish: 0, revise: 0, skip: 0 } };
  }
  const mc = (project.main_character as string | null) || '';
  const targetWords = (project.target_chapter_length as number | null) || 2800;
  if (!mc) {
    console.error('Missing main_character for ' + novelId);
    return { processed: 0, resolved: 0, failed: 0, stillBad: 0, modeBreakdown: { length: 0, polish: 0, revise: 0, skip: 0 } };
  }

  const { data: novel } = await s.from('novels').select('title').eq('id', novelId).maybeSingle();
  console.log(`\n████ ${novel?.title || novelId} ████  MC=${mc}  target=${targetWords}w  ${apply ? 'APPLY' : 'DRY'}`);

  const { data: chapters } = await s
    .from('chapters')
    .select('id,chapter_number,title,content')
    .eq('novel_id', novelId)
    .order('chapter_number');
  if (!chapters?.length) return { processed: 0, resolved: 0, failed: 0, stillBad: 0, modeBreakdown: { length: 0, polish: 0, revise: 0, skip: 0 } };

  // Diagnose all, filter to critical-flag chapters
  const candidates: Array<{ ch: typeof chapters[number]; flags: FlagSet; mode: Mode }> = [];
  for (const ch of chapters) {
    const content = (ch.content as string) || '';
    if (content.length < 500) continue;
    const f = diagnose(content, mc, targetWords);
    if (!f.hasCritical) continue;
    const mode = chooseMode(f);
    if (mode === 'skip') continue;
    candidates.push({ ch, flags: f, mode });
  }

  console.log(`  ${candidates.length}/${chapters.length} chương cần backfill`);
  if (candidates.length === 0) return { processed: 0, resolved: 0, failed: 0, stillBad: 0, modeBreakdown: { length: 0, polish: 0, revise: 0, skip: 0 } };

  const tmpDir = `tmp/backfill-orch/${novelId}`;
  fs.mkdirSync(tmpDir, { recursive: true });

  const toProcess = candidates.slice(0, limit);
  const stats = { processed: 0, resolved: 0, failed: 0, stillBad: 0, modeBreakdown: { length: 0, polish: 0, revise: 0, skip: 0 } as Record<Mode, number> };

  for (const { ch, flags, mode } of toProcess) {
    const chNum = ch.chapter_number;
    const flagSummary = [
      flags.wordOvershoot && `WORD(${Math.round(flags.wordRatio * 100)}%)`,
      flags.mcRateCrit && `MC-CRIT(${flags.mcRate.toFixed(1)}/1K)`,
      flags.eyeCrit && `EYE-CRIT(${flags.eyeCount})`,
      flags.inspCrit && `INSP-CRIT(${flags.inspTotal})`,
      flags.tailMaj && `TAIL-MAJ`,
      flags.pwvCritical > 0 && `PWV-CRIT(${flags.pwvCritical})`,
      flags.pwvMajor > 0 && `PWV-MAJ(${flags.pwvMajor})`,
    ].filter(Boolean).join(' ');

    process.stdout.write(`  ch.${chNum} [${mode}] [${flagSummary}] ... `);
    const original = ch.content as string;
    let revised: string | null = null;
    let error: string | undefined;

    stats.modeBreakdown[mode]++;
    stats.processed++;

    if (mode === 'length') {
      const r = await normalizeChapterLength(
        {
          chapterNumber: chNum,
          chapterContent: original,
          lengthSpec: defaultLengthSpec(targetWords),
          chapterIntent: (ch.title as string) || undefined,
        },
        { model: 'gemini-3.1-flash-lite', temperature: 0.2, maxTokens: 32768 },
        project.id as string,
      );
      if (r.applied) revised = r.normalizedContent;
      else error = r.warning;
    } else if (mode === 'polish') {
      const r = await polishChapter(
        {
          chapterNumber: chNum,
          chapterContent: original,
          chapterIntent: (ch.title as string) || undefined,
        },
        { model: 'gemini-3.1-flash-lite', temperature: 0.4, maxTokens: 32768 },
        project.id as string,
      );
      if (r.changed) revised = r.polishedContent;
      else error = r.warning;
    } else {
      const r = await reviseChapter(original, mc, targetWords, flags, project.id as string, chNum);
      revised = r.revised;
      error = r.error;
    }

    if (!revised) {
      console.log(`✗ ${error || 'unknown'}`);
      stats.failed++;
      continue;
    }

    // Validate post-revision
    const postFlags = diagnose(revised, mc, targetWords);

    // Save preview regardless
    fs.writeFileSync(path.join(tmpDir, `ch${String(chNum).padStart(3, '0')}.${mode}.before.txt`), original);
    fs.writeFileSync(path.join(tmpDir, `ch${String(chNum).padStart(3, '0')}.${mode}.after.txt`), revised);
    fs.writeFileSync(
      path.join(tmpDir, `ch${String(chNum).padStart(3, '0')}.${mode}.diff.json`),
      JSON.stringify({ chapter_number: chNum, mode, original_words: flags.words, revised_words: postFlags.words, before_flags: flags, after_flags: postFlags, still_critical: postFlags.hasCritical }, null, 2),
    );

    if (postFlags.hasCritical) {
      // Try escalating if not yet at revise mode
      if (mode === 'length' || mode === 'polish') {
        process.stdout.write(`(escalate to revise) `);
        const r2 = await reviseChapter(revised, mc, targetWords, postFlags, project.id as string, chNum);
        if (r2.revised) {
          const postFlags2 = diagnose(r2.revised, mc, targetWords);
          fs.writeFileSync(path.join(tmpDir, `ch${String(chNum).padStart(3, '0')}.escalated.after.txt`), r2.revised);
          if (!postFlags2.hasCritical) {
            revised = r2.revised;
            stats.resolved++;
            if (apply) {
              const { error: upErr } = await s.from('chapters').update({ content: revised }).eq('id', ch.id as string);
              if (upErr) {
                console.log(`✗ DB update failed: ${upErr.message}`);
                stats.failed++;
                continue;
              }
              console.log(`✓ saved escalated (${flags.words}→${postFlags2.words}w)`);
            } else {
              console.log(`✓ resolved escalated (${flags.words}→${postFlags2.words}w) [dry]`);
            }
            continue;
          }
        }
      }
      console.log(`⚠ still critical after ${mode}: ${[
        postFlags.mcRateCrit && 'MC',
        postFlags.eyeCrit && 'EYE',
        postFlags.inspCrit && 'INSP',
        postFlags.tailMaj && 'TAIL',
        postFlags.wordOvershoot && 'WORD',
        postFlags.pwvCritical && `PWV(${postFlags.pwvCritical})`,
      ].filter(Boolean).join(' ')}`);
      stats.stillBad++;
      continue;
    }

    stats.resolved++;
    if (apply) {
      const { error: upErr } = await s.from('chapters').update({ content: revised }).eq('id', ch.id as string);
      if (upErr) {
        console.log(`✗ DB update failed: ${upErr.message}`);
        stats.failed++;
        continue;
      }
      console.log(`✓ saved (${flags.words}→${postFlags.words}w)`);
    } else {
      console.log(`✓ resolved (${flags.words}→${postFlags.words}w) [dry]`);
    }
  }

  return stats;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const allProduction = args.includes('--all-production');
  const singleNovelId = args.find(a => /^[0-9a-f]{8}-/.test(a));
  let limit = 9999;
  const limitIdx = args.indexOf('--limit');
  if (limitIdx >= 0) limit = parseInt(args[limitIdx + 1], 10) || 9999;

  let novelIds: string[];
  if (singleNovelId) {
    novelIds = [singleNovelId];
  } else if (allProduction) {
    const { data: projects } = await s
      .from('ai_story_projects')
      .select('novel_id')
      .filter('style_directives->>production_enabled', 'eq', 'true');
    novelIds = (projects || []).map(p => p.novel_id).filter(Boolean) as string[];
  } else {
    console.error('Usage: backfill-orchestrator.ts <novel_id> | --all-production [--apply] [--limit N]');
    process.exit(1);
  }

  const totalStats = { processed: 0, resolved: 0, failed: 0, stillBad: 0, modeBreakdown: { length: 0, polish: 0, revise: 0, skip: 0 } as Record<Mode, number> };

  for (const id of novelIds) {
    const s2 = await processNovel(id, apply, limit);
    totalStats.processed += s2.processed;
    totalStats.resolved += s2.resolved;
    totalStats.failed += s2.failed;
    totalStats.stillBad += s2.stillBad;
    totalStats.modeBreakdown.length += s2.modeBreakdown.length;
    totalStats.modeBreakdown.polish += s2.modeBreakdown.polish;
    totalStats.modeBreakdown.revise += s2.modeBreakdown.revise;
  }

  console.log(`\n━━━━ ALL DONE ━━━━`);
  console.log(`  Processed: ${totalStats.processed}`);
  console.log(`  Resolved:  ${totalStats.resolved}`);
  console.log(`  Still bad: ${totalStats.stillBad}`);
  console.log(`  Failed:    ${totalStats.failed}`);
  console.log(`  Mode breakdown: length=${totalStats.modeBreakdown.length}, polish=${totalStats.modeBreakdown.polish}, revise=${totalStats.modeBreakdown.revise}`);
  if (!apply) console.log(`\nRe-run with --apply to commit changes.`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
