/**
 * Story Engine v2 — Timeline (Phase 27 W2.2)
 *
 * Tracks chapter ↔ in-world date for time consistency over 1000+ chapter novels.
 *
 * Pre-Phase-27 problem:
 *   - AI could write "3 năm sau" at ch.50, then "2 năm trước" at ch.51, with no detection.
 *   - MC's age drifted: 18 at ch.1, still 18 at ch.500 of a 1000-ch cultivation novel
 *     where decades should have passed.
 *   - Travel times weren't tracked: ch.30 said "đi 7 ngày tới Kinh Thành", ch.31 has
 *     MC suddenly back at sect with no transition.
 *
 * Phase 27 W2.2 fix:
 *   1. Post-write: AI extracts in-world time delta + MC age from chapter content
 *   2. Persist to story_timeline (one row per chapter)
 *   3. Pre-write: getTimelineContext injects last 5 chapters' time + MC age into Architect
 *   4. Critic gate: detects time-reversal (negative days_elapsed_delta) + age drift
 *
 * Đại thần workflow mapping:
 *   "Timeline" (时间线) — top web novel authors keep an explicit timeline
 *   document. Without it, 1000-chapter novels accumulate time-inconsistencies
 *   that break immersion (MC ages 0 years across 800 chapters, etc.).
 */

import { getSupabase } from '../utils/supabase';
import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import type { GeminiConfig } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface TimelineEntry {
  chapterNumber: number;
  inWorldDateText: string | null;
  daysElapsedSinceStart: number | null;
  season: string | null;
  mcAge: number | null;
  explicitInChapter: boolean;
  notes: string | null;
}

interface TimelineExtractionAIResponse {
  inWorldDateText?: string;
  daysElapsedDelta?: number; // days elapsed since previous chapter
  season?: string;
  mcAge?: number;
  explicitInChapter?: boolean;
  notes?: string;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Extract in-world time data from chapter content via AI; persist to story_timeline.
 * Called from orchestrator post-write (per reader chapter).
 *
 * Loads previous chapter's timeline (if any) so AI can compute delta accurately.
 * If AI returns no time info, infers entry from previous (no delta) so the row
 * still exists for consistency-check baseline.
 */
export async function recordChapterTime(
  projectId: string,
  chapterNumber: number,
  content: string,
  protagonistName: string,
  config: GeminiConfig,
): Promise<void> {
  try {
    const db = getSupabase();

    // Load previous chapter's timeline as baseline.
    const { data: prevRow } = await db
      .from('story_timeline')
      .select('chapter_number,in_world_date_text,days_elapsed_since_start,season,mc_age')
      .eq('project_id', projectId)
      .lt('chapter_number', chapterNumber)
      .order('chapter_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const prevDays = prevRow?.days_elapsed_since_start ?? null;
    const prevAge = prevRow?.mc_age ?? null;
    const prevDateText = prevRow?.in_world_date_text ?? null;
    const prevSeason = prevRow?.season ?? null;

    const prompt = `Bạn là time-tracker cho truyện dài kỳ. Phân tích chương vừa viết và trích thông tin THỜI GIAN trong truyện.

NHÂN VẬT CHÍNH: ${protagonistName}

THỜI GIAN CHƯƠNG TRƯỚC (chương ${prevRow?.chapter_number ?? 'chưa có'}):
- Date text: ${prevDateText || '(chưa có)'}
- Days elapsed since chương 1: ${prevDays ?? '(chưa có)'}
- Mùa: ${prevSeason || '(chưa có)'}
- Tuổi MC: ${prevAge ?? '(chưa có)'}

CHƯƠNG ${chapterNumber}:
${content.slice(0, 8000)}

Trả về JSON:
{
  "inWorldDateText": "<date text trong chương nếu có, vd 'Mùa hạ năm 2024', 'Năm thứ 5 thời Đại Tấn', 'Tháng giêng', 'Một tuần sau' — hoặc null nếu không đề cập>",
  "daysElapsedDelta": <số ngày trôi qua so với chương trước; ước lượng nếu chương dùng mơ hồ ("vài ngày sau"=3, "tuần sau"=7, "tháng sau"=30, "vài tháng"=90, "năm sau"=365). Nếu chương xảy ra trong cùng ngày = 0. KHÔNG được số âm — thời gian không lùi>,
  "season": "<xuân|hạ|thu|đông|null nếu không đề cập>",
  "mcAge": <tuổi MC nếu được nhắc/suy ra; null nếu không thay đổi>,
  "explicitInChapter": <true nếu chương ĐỀ CẬP RÕ thời gian; false nếu phải suy ra>,
  "notes": "<chỉ điền nếu có time-jump bất thường (vd 'Time skip 3 năm')>"
}

QUY TẮC:
- daysElapsedDelta TUYỆT ĐỐI ≥ 0. Truyện dài kỳ thời gian chỉ tiến, không lùi.
- Nếu chương không đề cập thời gian → daysElapsedDelta = 1 (mặc định 1 ngày trôi qua), explicitInChapter = false.
- Nếu chương là flashback rõ ràng → daysElapsedDelta = 0, notes = "flashback".`;

    const res = await callGemini(
      prompt,
      { ...config, temperature: 0.2, maxTokens: 1024 },
      { jsonMode: true, tracking: { projectId, task: 'timeline_extraction', chapterNumber } },
    );

    if (!res.content) {
      // Fallback: insert with minimal data so row exists.
      await insertFallbackEntry(projectId, chapterNumber, prevRow);
      return;
    }

    const parsed = parseJSON<TimelineExtractionAIResponse>(res.content);
    if (!parsed) {
      await insertFallbackEntry(projectId, chapterNumber, prevRow);
      return;
    }

    const delta = Math.max(0, parsed.daysElapsedDelta ?? 1); // clamp non-negative
    const newDays = (prevDays ?? 0) + delta;
    const newAge = parsed.mcAge !== undefined && parsed.mcAge !== null ? parsed.mcAge : prevAge;

    const { error } = await db.from('story_timeline').upsert({
      project_id: projectId,
      chapter_number: chapterNumber,
      in_world_date_text: parsed.inWorldDateText || prevDateText || null,
      days_elapsed_since_start: newDays,
      season: parsed.season || prevSeason || null,
      mc_age: newAge,
      explicit_in_chapter: parsed.explicitInChapter ?? false,
      notes: parsed.notes || null,
    }, { onConflict: 'project_id,chapter_number' });

    if (error) {
      console.warn(`[timeline] Insert failed for Ch.${chapterNumber}: ${error.message}`);
    }
  } catch (e) {
    console.warn(`[timeline] recordChapterTime threw for Ch.${chapterNumber}:`, e instanceof Error ? e.message : String(e));
  }
}

async function insertFallbackEntry(
  projectId: string,
  chapterNumber: number,
  prevRow: { days_elapsed_since_start?: number | null; in_world_date_text?: string | null; season?: string | null; mc_age?: number | null } | null,
): Promise<void> {
  const db = getSupabase();
  await db.from('story_timeline').upsert({
    project_id: projectId,
    chapter_number: chapterNumber,
    in_world_date_text: prevRow?.in_world_date_text || null,
    days_elapsed_since_start: (prevRow?.days_elapsed_since_start ?? 0) + 1,
    season: prevRow?.season || null,
    mc_age: prevRow?.mc_age || null,
    explicit_in_chapter: false,
    notes: null,
  }, { onConflict: 'project_id,chapter_number' }).then(({ error }) => {
    if (error) console.warn(`[timeline] Fallback insert failed: ${error.message}`);
  });
}

/**
 * Build context block showing recent timeline + MC age for Architect.
 */
export async function getTimelineContext(
  projectId: string,
  currentChapter: number,
): Promise<string | null> {
  if (currentChapter < 5) return null; // Not enough timeline data early

  try {
    const db = getSupabase();
    const { data } = await db
      .from('story_timeline')
      .select('chapter_number,in_world_date_text,days_elapsed_since_start,season,mc_age,explicit_in_chapter')
      .eq('project_id', projectId)
      .lt('chapter_number', currentChapter)
      .order('chapter_number', { ascending: false })
      .limit(8);

    if (!data?.length) return null;

    const sorted = [...data].sort((a, b) => a.chapter_number - b.chapter_number);
    const latest = sorted[sorted.length - 1];
    const earliest = sorted[0];

    const totalDaysElapsed = latest.days_elapsed_since_start ?? 0;
    const yearsElapsed = totalDaysElapsed / 365;

    const lines: string[] = [
      '[STORY TIMELINE — THỜI GIAN TRONG TRUYỆN, BẮT BUỘC GIỮ NHẤT QUÁN]',
      `Tổng cộng từ chương 1 đến chương ${latest.chapter_number}: ${Math.round(totalDaysElapsed)} ngày (~${yearsElapsed.toFixed(1)} năm) đã trôi qua.`,
      `Date text mới nhất: ${latest.in_world_date_text || '(chưa rõ)'}`,
      `Mùa hiện tại: ${latest.season || '(chưa rõ)'}`,
      latest.mc_age ? `Tuổi MC hiện tại: ${latest.mc_age}` : '',
    ].filter(Boolean);

    // Time-jump detection: if any window of 3-5 chapters has >365 days delta, surface it.
    if (sorted.length >= 3) {
      const recentDelta = (latest.days_elapsed_since_start ?? 0) - (sorted[Math.max(0, sorted.length - 5)].days_elapsed_since_start ?? 0);
      if (recentDelta > 365) {
        lines.push(`⏳ Time-jump nổi bật: ${Math.round(recentDelta)} ngày qua trong ${sorted.length} chương gần đây (~${(recentDelta / 365).toFixed(1)} năm). Đảm bảo MC age + thay đổi political/social context phản ánh đúng.`);
      }
    }

    lines.push('→ Chương kế tiếp: thời gian CHỈ tiến, không lùi. Nếu time-skip lớn, mô tả rõ "X năm sau...". MC age tăng đúng với thời gian.');

    return lines.join('\n');
  } catch (e) {
    console.warn(`[timeline] getTimelineContext failed:`, e instanceof Error ? e.message : String(e));
    return null;
  }
}

/**
 * Detect time-consistency violations:
 *   - days_elapsed_since_start went DOWN (impossible)
 *   - MC age went DOWN (impossible)
 *   - Sudden mc_age jump >50 years in <10 chapters (likely AI hallucination)
 *
 * Returns array of issue descriptions for orchestrator to log/throw.
 */
export async function detectTimelineViolations(
  projectId: string,
  currentChapter: number,
): Promise<string[]> {
  const violations: string[] = [];
  try {
    const db = getSupabase();
    const { data } = await db
      .from('story_timeline')
      .select('chapter_number,days_elapsed_since_start,mc_age')
      .eq('project_id', projectId)
      .lte('chapter_number', currentChapter)
      .order('chapter_number', { ascending: true });

    if (!data || data.length < 2) return violations;

    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const curr = data[i];
      if ((curr.days_elapsed_since_start ?? 0) < (prev.days_elapsed_since_start ?? 0)) {
        violations.push(`Time-reversal at ch.${curr.chapter_number}: days_elapsed went from ${prev.days_elapsed_since_start} → ${curr.days_elapsed_since_start}.`);
      }
      if (prev.mc_age !== null && curr.mc_age !== null && curr.mc_age < prev.mc_age) {
        violations.push(`MC age regression at ch.${curr.chapter_number}: ${prev.mc_age} → ${curr.mc_age}.`);
      }
      if (prev.mc_age !== null && curr.mc_age !== null) {
        const ageJump = curr.mc_age - prev.mc_age;
        const chapterGap = curr.chapter_number - prev.chapter_number;
        if (chapterGap < 10 && ageJump > 50) {
          violations.push(`Suspicious MC age jump at ch.${curr.chapter_number}: +${ageJump} years in ${chapterGap} chapters.`);
        }
      }
    }
  } catch (e) {
    console.warn(`[timeline] detectTimelineViolations threw:`, e instanceof Error ? e.message : String(e));
  }
  return violations;
}
