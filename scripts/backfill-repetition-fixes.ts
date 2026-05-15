/**
 * Phase R backfill (2026-05-14) — surgical de-spam revision for chapters
 * flagged by audit-phase-q-content.ts.
 *
 * Strategy: for each outlier chapter, run a targeted editor pass with Gemini
 * Flash Lite that:
 *   - Replaces excess MC-name mentions with pronouns ("hắn"/"y")
 *   - Trims eye-descriptor template overuse (keep ~6-8, replace rest with
 *     body language / dialogue / action verbs)
 *   - Cuts inspirational monologue closer from tail (last 500 chars)
 *   - Trims chapter to ≤1.3× target word count
 *   - PRESERVES plot events, dialogue, scene structure
 *
 * Validates post-revision via same detectors. Saves only if all CRITICAL
 * flags clear AND content is within ±20% of original length.
 *
 * Usage:
 *   npx tsx scripts/backfill-repetition-fixes.ts <novel_id> [--apply] [--limit N]
 *
 * Default = dry-run, writes to tmp/backfill/<novel_id>/ for review. Add
 * --apply to update the chapters table.
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
  countWords,
} from '../src/services/story-engine/pipeline/chapter-writer-helpers';

dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const REVISER_SYSTEM = `Bạn là biên tập viên cao cấp truyện dài kỳ tiếng Việt 1000+ chương. Khi sửa lặp, GIỮ NGUYÊN: cốt truyện, dialogue, scene structure, sự kiện, thế giới quan, tên nhân vật. CHỈ thay đổi prose layer — cách diễn đạt, đại từ, mô tả gián tiếp.

KHÔNG thêm chú thích, KHÔNG xuất "Chương N", KHÔNG markdown. Trả về thuần văn chương Việt theo format có em-dash dialogue và đoạn văn cách nhau bằng newline đôi.`;

interface Flags {
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
  inspTail: number;
  tailMaj: boolean;
  tailMod: boolean;
  wordOvershoot: boolean;
  wordRatio: number;
  words: number;
  targetWords: number;
  hasCritical: boolean;
}

function diagnoseChapter(content: string, mc: string, targetWords: number): Flags {
  const words = countWords(content);
  const wordRatio = words / targetWords;
  const mcr = detectMcNameRate(content, mc);
  const eye = detectEyeTemplateOveruse(content);
  const insp = detectInspirationalCluster(content);
  const tail = detectMonologueTail(content, mc);

  const f: Flags = {
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
    inspTail: insp.tailCount,
    tailMaj: tail.severity === 'major',
    tailMod: tail.severity === 'moderate',
    wordOvershoot: wordRatio > 1.6,
    wordRatio,
    words,
    targetWords,
    hasCritical: false,
  };
  f.hasCritical =
    f.mcRateCrit || f.eyeCrit || f.inspCrit || f.tailMaj || f.wordOvershoot;
  return f;
}

function buildReviserPrompt(
  content: string,
  mc: string,
  flags: Flags,
  targetWords: number,
): string {
  const instructions: string[] = [];

  if (flags.mcRateCrit || flags.mcRateMod) {
    instructions.push(
      `MC NAME OVERUSE: "${mc}" hiện ${flags.mcCount} lần / ${flags.words} từ = ${flags.mcRate.toFixed(1)}/1K. Target webnovel 6-10/1K. Giảm xuống ≤10 lần/1K bằng cách:
  • Thay 30-50% lần "${mc}" bằng đại từ ("hắn"/"y"/"anh ta") khi context đã rõ subject.
  • Bỏ "${mc}" trong câu liên tiếp nhau — chỉ giữ ở câu đầu paragraph hoặc khi đổi subject.
  • Dialogue tag thay "${mc} nói/đáp/hỏi" bằng dialogue-only hoặc đại từ.
  • KHÔNG đổi tên MC, KHÔNG bỏ MC khỏi scene.`,
    );
  }

  if (flags.eyeCrit || flags.eyeMod) {
    instructions.push(
      `EYE TEMPLATE: "đôi mắt"/"ánh mắt" lặp ${flags.eyeCount} lần. Giảm xuống ≤8 lần bằng cách:
  • Thay vài lần bằng action verb (nhíu mày / bặm môi / nghiêng đầu / xoa cằm / gập tay / dựa lưng).
  • Thay vài lần bằng dialogue ngắn tiết lộ cảm xúc.
  • Giữ lại CHỈ những lần "đôi mắt/ánh mắt" thật sự cần (vd: lần đầu gặp một nhân vật, hoặc moment quan trọng).
  • KHÔNG xóa cảnh, chỉ thay đổi cách mô tả phản ứng cảm xúc.`,
    );
  }

  if (flags.inspCrit || flags.inspMod) {
    instructions.push(
      `INSPIRATIONAL CLOSER SPAM: ${flags.inspTotal} hits "huyền thoại/vinh quang/huy hoàng/rực rỡ/định sẵn/vĩ đại/thiên mệnh" (${flags.inspTail} ở 500 chars cuối). CẮT TOÀN BỘ phần "MC là huyền thoại / vương quốc của hắn / vĩnh hằng". Đoạn kết PHẢI:
  • Là scene cụ thể (action / dialogue / decision / setup chương sau)
  • KHÔNG monologue ca tụng MC
  • KHÔNG paraphrase chain ("vận mệnh bước sang chương mới... rẽ sang chương mới...")
  • KHÔNG dùng abstract noun "tương lai / huyền thoại / biểu tượng / vĩnh hằng" 2 lần liên tiếp.`,
    );
  }

  if (flags.tailMaj || flags.tailMod) {
    instructions.push(
      `MONOLOGUE TAIL: 20% cuối chương spam MC + future-tense + abstract noun. Cắt phần đó, thay bằng:
  • 1 scene cụ thể đóng chương (dialogue / action / quyết định)
  • HOẶC cliffhanger sự kiện (NPC xuất hiện / tin nhắn / điều bất ngờ)`,
    );
  }

  if (flags.wordOvershoot) {
    const targetMax = Math.round(targetWords * 1.2);
    instructions.push(
      `WORD OVERSHOOT: chương ${flags.words} từ vs target ${targetWords} (${Math.round(flags.wordRatio * 100)}%). Cắt xuống ≤${targetMax} từ. Ưu tiên cắt:
  1. Phần monologue cuối chương (nếu có)
  2. Câu paraphrase trùng ý
  3. Mô tả thừa (rất nhiều ánh mắt / nội tâm / repeat sự kiện đã kể)
  KHÔNG cắt: dialogue, plot event, character introductions.`,
    );
  }

  return `${REVISER_SYSTEM}

CHƯƠNG GỐC:
"""
${content}
"""

NHIỆM VỤ: Sửa các lỗi prose sau, GIỮ NGUYÊN cốt truyện:

${instructions.map((s, i) => `${i + 1}. ${s}`).join('\n\n')}

QUY TẮC CHUNG:
- GIỮ NGUYÊN: cốt truyện, dialogue (kể cả em-dash format), scene structure, tên nhân vật, world detail, sự kiện.
- CHỈ thay đổi: cách diễn đạt narration, đại từ, mô tả phản ứng cảm xúc.
- Độ dài: ≤${Math.round(targetWords * 1.2)} từ (target ${targetWords}, max 120%).
- Format output: thuần văn chương Việt, em-dash dialogue, đoạn cách bằng newline đôi.
- KHÔNG xuất "Chương N", KHÔNG markdown, KHÔNG chú thích.

Trả về NỘI DUNG ĐÃ SỬA:`;
}

async function reviseChapter(
  content: string,
  mc: string,
  targetWords: number,
  flags: Flags,
  projectId: string,
  chapterNumber: number,
): Promise<{ revised: string | null; error?: string }> {
  const prompt = buildReviserPrompt(content, mc, flags, targetWords);
  try {
    const res = await callGemini(
      prompt,
      {
        model: 'gemini-3.1-flash-lite',
        temperature: 0.3,
        maxTokens: 32768,
      },
      {
        tracking: { projectId, task: 'auto_revision', chapterNumber },
      },
    );
    let out = res.content?.trim() || '';
    // Strip leading "Chương N:" or markdown if model adds it
    out = out
      .replace(/^```[\w]*\s*/m, '')
      .replace(/\s*```\s*$/m, '')
      .replace(/^Chương\s+\d+\s*[:\-–—]\s*[^\n]*\n+/i, '')
      .replace(/^#{1,6}\s+[^\n]*\n+/m, '')
      .trim();
    if (!out || out.length < content.length * 0.5) {
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

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const novelId = args.find((a) => /^[0-9a-f]{8}-/.test(a));
  if (!novelId) {
    console.error('Usage: npx tsx scripts/backfill-repetition-fixes.ts <novel_id> [--apply] [--limit N]');
    process.exit(1);
  }
  let limit = 9999;
  const limitIdx = args.indexOf('--limit');
  if (limitIdx >= 0) limit = parseInt(args[limitIdx + 1], 10) || 9999;

  // Load project meta.
  const { data: project } = await s
    .from('ai_story_projects')
    .select('id,main_character,target_chapter_length,style_directives')
    .eq('novel_id', novelId)
    .maybeSingle();
  if (!project) {
    console.error(`No project for novel ${novelId}`);
    process.exit(1);
  }
  const mc = (project.main_character as string | null) || '';
  const targetWords = (project.target_chapter_length as number | null) || 2800;
  if (!mc) {
    console.error('Missing main_character on project');
    process.exit(1);
  }

  const { data: novel } = await s.from('novels').select('title').eq('id', novelId).maybeSingle();
  console.log(`\n████ Backfilling: ${novel?.title || novelId} ████`);
  console.log(`MC=${mc}  target=${targetWords}w  mode=${apply ? 'APPLY (writes to DB)' : 'DRY-RUN'}`);

  // Load all chapters.
  const { data: chapters } = await s
    .from('chapters')
    .select('id,chapter_number,title,content')
    .eq('novel_id', novelId)
    .order('chapter_number');
  if (!chapters?.length) {
    console.error('No chapters');
    return;
  }

  // Diagnose each, keep only those with CRITICAL flags.
  const candidates: Array<{ ch: typeof chapters[number]; flags: Flags }> = [];
  for (const ch of chapters) {
    const content = (ch.content as string) || '';
    if (content.length < 500) continue;
    const f = diagnoseChapter(content, mc, targetWords);
    if (f.hasCritical) candidates.push({ ch, flags: f });
  }

  console.log(`\n${candidates.length}/${chapters.length} chương có flag CRITICAL`);
  if (candidates.length === 0) return;

  const tmpDir = `tmp/backfill/${novelId}`;
  fs.mkdirSync(tmpDir, { recursive: true });

  const toProcess = candidates.slice(0, limit);
  let succeeded = 0;
  let failed = 0;
  let resolved = 0;
  let stillBad = 0;

  for (const { ch, flags } of toProcess) {
    const chNum = ch.chapter_number;
    const flagSummary = [
      flags.mcRateCrit && `MC-CRIT(${flags.mcRate.toFixed(1)}/1K)`,
      flags.eyeCrit && `EYE-CRIT(${flags.eyeCount})`,
      flags.inspCrit && `INSP-CRIT(${flags.inspTotal})`,
      flags.tailMaj && `TAIL-MAJ`,
      flags.wordOvershoot && `WORD(${Math.round(flags.wordRatio * 100)}%)`,
    ].filter(Boolean).join(' ');

    process.stdout.write(`  ch.${chNum} [${flagSummary}] ... `);
    const original = ch.content as string;
    const res = await reviseChapter(original, mc, targetWords, flags, project.id, chNum);
    if (!res.revised) {
      console.log(`✗ ${res.error}`);
      failed++;
      continue;
    }

    // Validate post-revision.
    const postFlags = diagnoseChapter(res.revised, mc, targetWords);
    const postWords = postFlags.words;
    const stillCritical =
      postFlags.mcRateCrit ||
      postFlags.eyeCrit ||
      postFlags.inspCrit ||
      postFlags.tailMaj ||
      postFlags.wordOvershoot;

    // Save preview to disk regardless.
    fs.writeFileSync(
      path.join(tmpDir, `ch${String(chNum).padStart(3, '0')}.before.txt`),
      original,
    );
    fs.writeFileSync(
      path.join(tmpDir, `ch${String(chNum).padStart(3, '0')}.after.txt`),
      res.revised,
    );
    fs.writeFileSync(
      path.join(tmpDir, `ch${String(chNum).padStart(3, '0')}.diff.json`),
      JSON.stringify(
        {
          chapter_number: chNum,
          original_words: flags.words,
          revised_words: postWords,
          before_flags: flags,
          after_flags: postFlags,
          still_critical: stillCritical,
        },
        null,
        2,
      ),
    );

    if (stillCritical) {
      console.log(`⚠ revised but ${postWords}w still critical: ${[
        postFlags.mcRateCrit && 'MC-CRIT',
        postFlags.eyeCrit && 'EYE-CRIT',
        postFlags.inspCrit && 'INSP-CRIT',
        postFlags.tailMaj && 'TAIL-MAJ',
        postFlags.wordOvershoot && 'WORD',
      ].filter(Boolean).join(' ')}`);
      stillBad++;
      // Don't apply
      continue;
    }

    resolved++;
    succeeded++;

    if (apply) {
      const { error } = await s
        .from('chapters')
        .update({ content: res.revised })
        .eq('id', ch.id as string);
      if (error) {
        console.log(`✗ DB update failed: ${error.message}`);
        failed++;
        continue;
      }
      console.log(`✓ saved (${flags.words}→${postWords}w)`);
    } else {
      console.log(`✓ resolved (${flags.words}→${postWords}w) [dry-run, not saved]`);
    }
  }

  console.log(`\n━━━━ DONE ━━━━`);
  console.log(`  Processed: ${toProcess.length}`);
  console.log(`  Resolved: ${resolved}`);
  console.log(`  Still critical after revision: ${stillBad}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Output: ${tmpDir}/`);
  if (!apply) {
    console.log(`\nRe-run with --apply to commit changes to DB.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
