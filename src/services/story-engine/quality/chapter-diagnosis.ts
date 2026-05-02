/**
 * Story Engine v2 — 10-Chapter Meta-Diagnosis (Phase 29)
 *
 * Per-chapter Critic only sees ONE chapter at a time. It can't catch
 * arc-level pathologies that only show up across a window:
 *
 *   - "MC won 4 fights in a row, no real cost" (pacing flatness)
 *   - "Female lead hasn't appeared in 12 chapters" (cast neglect)
 *   - "Setup at ch.51 still hasn't paid off by ch.60" (drift / forgotten thread)
 *   - "Antagonist losing menace — same threats repeated 3 chapters running"
 *   - "Chapters 53-58 all dialogue, no action beats" (rhythm collapse)
 *
 * This module runs ONE meta-review AI call over the last 10 chapters'
 * summaries + quality scores + open plot threads + overdue foreshadowing +
 * cast roster, and returns a structured diagnosis JSON.
 *
 * Triggered from `/api/cron/quality-trend` daily — runs when
 * `current_chapter % 10 === 0` OR `alert_level !== 'ok'`. Result stuffed
 * into `quality_trends.meta.diagnosis` (JSONB, no migration needed).
 *
 * Surfaced on /admin/quality dashboard.
 *
 * Cost: ~$0.003 per snapshot (1 DeepSeek Flash call, ~6K input + 1K output).
 * For 100 active novels × 1 snapshot/day = ~$0.30/day = ~$9/month.
 */

import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import { getSupabase } from '../utils/supabase';
import { getActiveCast } from '../state/cast-database';
import { getOverdueForeshadowingForCritic } from '../plan/foreshadowing';
import type { GeminiConfig } from '../types';

const WINDOW_SIZE = 10;
const PER_CHAPTER_SUMMARY_CHARS = 600;
const CAST_NEGLECT_THRESHOLD = 8; // chapters without appearance to flag

export interface ChapterDiagnosis {
  windowStart: number;
  windowEnd: number;
  /** Pacing issues across the window — flat dopamine, repetitive scene types,
   *  too much dialogue with no beats, easy wins streak. */
  pacingIssues: DiagnosisIssue[];
  /** Character issues — neglected cast, OOC drift, overpowered MC streaks,
   *  villain losing menace. */
  characterIssues: DiagnosisIssue[];
  /** Plot issues — drift from arc goal, forgotten threads, overdue foreshadowing,
   *  unresolved cliffhangers. */
  plotIssues: DiagnosisIssue[];
  /** Reader engagement issues — boring chapters, missing emotional payoff,
   *  weak hooks, hookless endings. */
  readerEngagementIssues: DiagnosisIssue[];
  /** Concrete recommendations for the next 5-10 chapters. */
  suggestions: string[];
  /** 1-line summary for compact dashboard display. */
  oneLineSummary: string;
}

export interface DiagnosisIssue {
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  description: string;
  /** Specific chapter numbers in the window where the issue is visible. */
  evidenceChapters?: number[];
}

interface ChapterSummaryRow {
  chapter_number: number;
  title: string | null;
  summary: string | null;
  cliffhanger: string | null;
}

interface QualityMetricRow {
  chapter_number: number;
  overall_score: number | null;
  dopamine_score: number | null;
  pacing_score: number | null;
  ending_hook_score: number | null;
}

/**
 * Run meta-diagnosis over the last 10 chapters of a project.
 * Returns null if insufficient data or AI call fails.
 */
export async function diagnoseRecent10Chapters(
  projectId: string,
  currentChapter: number,
  config: GeminiConfig,
): Promise<ChapterDiagnosis | null> {
  if (currentChapter < WINDOW_SIZE) return null;

  const db = getSupabase();
  const windowStart = currentChapter - WINDOW_SIZE + 1;
  const windowEnd = currentChapter;

  const [summariesRes, metricsRes, cast, overdueHints, openThreadsRes] = await Promise.all([
    db.from('chapter_summaries')
      .select('chapter_number,title,summary,cliffhanger')
      .eq('project_id', projectId)
      .gte('chapter_number', windowStart)
      .lte('chapter_number', windowEnd)
      .order('chapter_number', { ascending: true }),
    db.from('quality_metrics')
      .select('chapter_number,overall_score,dopamine_score,pacing_score,ending_hook_score')
      .eq('project_id', projectId)
      .gte('chapter_number', windowStart)
      .lte('chapter_number', windowEnd)
      .order('chapter_number', { ascending: true }),
    getActiveCast(projectId, currentChapter, 30),
    getOverdueForeshadowingForCritic(projectId, currentChapter),
    db.from('plot_threads')
      .select('name,description,priority,importance')
      .eq('project_id', projectId)
      .eq('status', 'active')
      .order('importance', { ascending: false })
      .limit(15),
  ]);

  const summaries = (summariesRes.data || []) as ChapterSummaryRow[];
  const metrics = (metricsRes.data || []) as QualityMetricRow[];
  const openThreads = openThreadsRes.data || [];

  if (summaries.length < 5) {
    // Not enough chapters with summaries to draw a diagnosis.
    return null;
  }

  // Build digest sections.
  const summaryDigest = summaries
    .map(s => `Ch.${s.chapter_number} "${s.title || ''}": ${(s.summary || '').slice(0, PER_CHAPTER_SUMMARY_CHARS)}${s.cliffhanger ? `\n  → cliff: ${s.cliffhanger.slice(0, 200)}` : ''}`)
    .join('\n\n');

  const metricsDigest = metrics.length > 0
    ? metrics.map(m => `Ch.${m.chapter_number}: overall=${m.overall_score ?? '—'}, dopamine=${m.dopamine_score ?? '—'}, pacing=${m.pacing_score ?? '—'}, hook=${m.ending_hook_score ?? '—'}`).join('\n')
    : '(no quality_metrics rows for window)';

  const castDigest = cast.length > 0
    ? cast.map(c => {
        const gap = currentChapter - c.lastSeenChapter;
        const flag = gap >= CAST_NEGLECT_THRESHOLD ? ` ⚠ ${gap}ch gap` : '';
        return `  • ${c.characterName} (${c.status}) — last ch.${c.lastSeenChapter}${flag}`;
      }).join('\n')
    : '(no cast data)';

  const overdueDigest = overdueHints.length > 0
    ? overdueHints.map(h => `  • "${h.hintText.slice(0, 100)}" — payoff was due ch.${h.payoffChapter}, overdue by ${h.overdueBy}ch`).join('\n')
    : '(none overdue)';

  const threadsDigest = openThreads.length > 0
    ? openThreads.map((t: { name: string; description?: string | null; priority?: string | null; importance?: number | null }) =>
        `  • [${t.priority || 'med'}/${t.importance ?? 0}] ${t.name}: ${(t.description || '').slice(0, 120)}`
      ).join('\n')
    : '(no open threads)';

  const prompt = `Bạn là biên tập viên trưởng web-novel. Đây là review tổng cho 10 chương gần nhất (ch.${windowStart}-${windowEnd}) của một bộ truyện dài đang chạy. Per-chapter critic không thấy được pattern arc-level — bạn phải catch những vấn đề CHỈ HIỆN RA khi nhìn cả window.

[10 CHƯƠNG GẦN NHẤT — SUMMARY + CLIFFHANGER]
${summaryDigest}

[QUALITY SCORES TỪNG CHƯƠNG]
${metricsDigest}

[CAST ROSTER — CÒN ACTIVE, last_seen]
${castDigest}

[FORESHADOWING OVERDUE]
${overdueDigest}

[OPEN PLOT THREADS]
${threadsDigest}

NHIỆM VỤ: Phát hiện 4 nhóm vấn đề arc-level. CHỈ flag những gì THỰC SỰ có vấn đề trong dữ liệu — không bịa.

1. PACING ISSUES — VD: "MC thắng dễ 4 chương liên tiếp không có cost" / "5/10 chương score dopamine ≤5" / "chương 53-57 toàn dialogue không có beat hành động" / "không có peak nào ≥7 trong cả window"

2. CHARACTER ISSUES — VD: "Lâm Nguyệt 12 chương không xuất hiện dù là main supporting" / "Trần Hạo từng đe dọa MC ch.45 nhưng 8 chương qua không follow up" / "MC overpowered streak — không thua trận nào trong window"

3. PLOT ISSUES — VD: "Arc goal là 'tìm bí kíp X' nhưng 7/10 chương không liên quan" / "Foreshadowing 'người áo đen' overdue 5 chương" / "Cliffhanger ch.52 chưa giải quyết tới ch.60"

4. READER ENGAGEMENT ISSUES — VD: "Ch.55-57 endingHook ≤4 — 3 chương mở yếu liên tiếp" / "Không có moment cảm xúc với người thân trong cả window" / "Chương quá dài thông tin mà thiếu drama"

Trả về JSON đúng format:
{
  "pacingIssues": [{"severity": "minor|moderate|major|critical", "description": "...", "evidenceChapters": [53, 54]}],
  "characterIssues": [...],
  "plotIssues": [...],
  "readerEngagementIssues": [...],
  "suggestions": ["khuyến nghị cụ thể cho 5-10 chương tới — vd 'cho MC một thất bại lớn ở chương ${windowEnd + 2}', 'đưa Lâm Nguyệt trở lại ch.${windowEnd + 1}', 'payoff foreshadowing người áo đen trong vòng 3 chương'"],
  "oneLineSummary": "1 câu mô tả tình trạng arc — vd 'Pacing flat, MC thắng dễ, cast bị bỏ rơi' / 'Khoẻ — peak đều, threads tiến triển'"
}

Nguyên tắc severity:
- minor: nice to fix, không ảnh hưởng reader stay
- moderate: cần xử lý trong 5 chương tới
- major: arc đang xuống chất lượng, fix ngay 1-2 chương
- critical: reader sẽ drop, cần intervene gấp (vd MC OOC nặng, plot hole, foreshadowing overdue 10+ chương)

Nếu window OK, trả arrays rỗng + oneLineSummary tích cực. KHÔNG bịa vấn đề để có gì đó nói.`;

  const res = await callGemini(
    prompt,
    { ...config, temperature: 0.2, maxTokens: 3072 },
    { jsonMode: true, tracking: { projectId, task: 'chapter_diagnosis', chapterNumber: currentChapter } },
  );

  if (!res.content) {
    console.warn(`[ChapterDiagnosis] Empty response for project ${projectId} ch.${currentChapter}`);
    return null;
  }

  const parsed = parseJSON<Omit<ChapterDiagnosis, 'windowStart' | 'windowEnd'>>(res.content);
  if (!parsed) {
    console.warn(`[ChapterDiagnosis] JSON parse failed for project ${projectId}`);
    return null;
  }

  const normalized: ChapterDiagnosis = {
    windowStart,
    windowEnd,
    pacingIssues: Array.isArray(parsed.pacingIssues) ? parsed.pacingIssues : [],
    characterIssues: Array.isArray(parsed.characterIssues) ? parsed.characterIssues : [],
    plotIssues: Array.isArray(parsed.plotIssues) ? parsed.plotIssues : [],
    readerEngagementIssues: Array.isArray(parsed.readerEngagementIssues) ? parsed.readerEngagementIssues : [],
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 8) : [],
    oneLineSummary: typeof parsed.oneLineSummary === 'string' ? parsed.oneLineSummary.slice(0, 240) : '',
  };

  const issueCount =
    normalized.pacingIssues.length +
    normalized.characterIssues.length +
    normalized.plotIssues.length +
    normalized.readerEngagementIssues.length;

  console.log(
    `[ChapterDiagnosis] Project ${projectId} ch.${windowStart}-${windowEnd}: ` +
    `${issueCount} issues — ${normalized.oneLineSummary.slice(0, 100)}`,
  );

  return normalized;
}
