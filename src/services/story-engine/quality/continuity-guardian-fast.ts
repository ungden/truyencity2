/**
 * Story Engine v2 — Continuity Guardian (FAST / deterministic variant)
 *
 * The full `runContinuityGuardian` fires an AI call and so only runs on every
 * 2nd AI write (cost trade-off). On the *skipped* writes the orchestrator used
 * to substitute an empty `{ issues: [], contradictions: [] }` stub — which left
 * `quality_metrics.guardian_issues_*` blank on half of all chapters, starving
 * both the Goal-5 drift tracking and the per-chapter corrective feedback loop.
 *
 * This module fills that gap with a ZERO-AI-COST deterministic pass that returns
 * the SAME `GuardianReport` shape, so it drops straight into the existing
 * pre-save path. It does NOT duplicate work already done every chapter:
 *   - dead-character resurrection  → `checkConsistencyFast` (runs every chapter)
 *   - power_realm_index regression → `detectCharacterContradictions` (every chapter)
 * Those already feed auto-revise, so re-emitting them here would only double up.
 *
 * What it uniquely adds (telemetry-grade, no auto-revise):
 *   1. dead_character — surfaced as a GuardianIssue so the guardian telemetry
 *      counts aren't blank on skipped writes (the contradiction itself is still
 *      raised by checkConsistencyFast).
 *   2. subplot_reopen — a resolved plot_thread's verbatim name reappearing
 *      without a `[CALLBACK]` marker. Caught by NEITHER deterministic check
 *      above; the AI guardian is otherwise the only thing that flags it.
 *
 * Findings are returned as `issues` only (telemetry → quality_metrics →
 * corrective directive). `contradictions` stays empty: deterministic
 * string-match evidence is too false-positive-prone to justify an auto-revise
 * rewrite, and the genuinely high-confidence classes are already escalated
 * elsewhere every chapter.
 */

import { getSupabase } from '../utils/supabase';
import type { GuardianIssue, GuardianReport } from './continuity-guardian';

const SKIP_BEFORE_CHAPTER = 10;

// Same windowed flashback heuristics as checkConsistencyFast, kept in sync.
const TIME_JUMP_PATTERNS = /(nhớ lại|hồi tưởng|ký ức|trước đây \d+|năm xưa|hồi đó|kiếp trước|trước khi (chết|qua đời|mất)|trong giấc mơ|trong mơ|tưởng tượng|hình bóng)/i;
const LIVING_ACTION_PATTERNS = /(nói|hỏi|đáp|cười|cau mày|gật đầu|lắc đầu|đứng dậy|ngồi xuống|đi tới|bước|vung tay|ra lệnh|quyết định|nhìn thấy)/i;
const CALLBACK_MARKER = /\[CALLBACK\]/i;

// A resolved-thread name is only distinctive enough to trust as a reopen signal
// when it's a multi-word phrase. Single common words recur naturally and would
// produce constant false positives.
const MIN_THREAD_NAME_CHARS = 8;

export async function runContinuityGuardianFast(
  projectId: string,
  chapterNumber: number,
  content: string,
): Promise<GuardianReport> {
  if (chapterNumber < SKIP_BEFORE_CHAPTER) {
    return { issues: [], contradictions: [] };
  }

  try {
    const db = getSupabase();
    const issues: GuardianIssue[] = [];

    const [deadCharsRes, closedThreadsRes] = await Promise.all([
      db.from('character_states')
        .select('character_name, chapter_number')
        .eq('project_id', projectId)
        .eq('status', 'dead'),
      db.from('plot_threads')
        .select('name, last_active_chapter')
        .eq('project_id', projectId)
        .eq('status', 'resolved')
        .order('last_active_chapter', { ascending: false })
        .limit(20),
    ]);

    // ── Check 1: dead-character non-flashback appearance (telemetry) ──────────
    const deadChars = deadCharsRes.data || [];
    const seenDead = new Set<string>();
    for (const { character_name, chapter_number: deathChapter } of deadChars) {
      if (!character_name || seenDead.has(character_name)) continue;
      if (!content.includes(character_name)) continue;
      seenDead.add(character_name);

      let searchFrom = 0;
      for (;;) {
        const idx = content.indexOf(character_name, searchFrom);
        if (idx < 0) break;
        const window = content.slice(
          Math.max(0, idx - 200),
          Math.min(content.length, idx + character_name.length + 200),
        );
        const hasFlashback = TIME_JUMP_PATTERNS.test(window);
        const hasLivingAction = LIVING_ACTION_PATTERNS.test(window);
        if (!hasFlashback || hasLivingAction) {
          issues.push({
            type: 'dead_character',
            severity: hasLivingAction ? 'critical' : 'major',
            description: `${character_name} đã chết ở chương ${deathChapter ?? '?'} nhưng xuất hiện ở chương ${chapterNumber}${hasLivingAction ? ' với hành động sống (nói/đi/quyết định)' : ' không có ngữ cảnh flashback rõ ràng'}`,
            evidence: window.trim().slice(0, 200),
          });
          break;
        }
        searchFrom = idx + character_name.length;
      }
    }

    // ── Check 2: closed-subplot reopen without [CALLBACK] (net-new) ───────────
    const hasCallback = CALLBACK_MARKER.test(content);
    if (!hasCallback) {
      for (const { name, last_active_chapter } of closedThreadsRes.data || []) {
        const threadName = (name || '').trim();
        if (threadName.length < MIN_THREAD_NAME_CHARS) continue;
        if (!threadName.includes(' ')) continue; // require multi-word distinctiveness
        if (!content.includes(threadName)) continue;
        issues.push({
          type: 'subplot_reopen',
          severity: 'moderate',
          description: `Tuyến truyện đã đóng "${threadName}" (ch.${last_active_chapter ?? '?'}) tái xuất ở chương ${chapterNumber} mà KHÔNG có [CALLBACK] chủ động`,
          evidence: threadName,
        });
      }
    }

    if (issues.length > 0) {
      console.warn(
        `[ContinuityGuardianFast] Ch.${chapterNumber}: ${issues.length} deterministic issue(s)`,
        issues.map(i => `${i.severity}/${i.type}`),
      );
    }

    return { issues, contradictions: [] };
  } catch (e) {
    console.warn(`[ContinuityGuardianFast] Ch.${chapterNumber} failed:`, e instanceof Error ? e.message : String(e));
    return { issues: [], contradictions: [] };
  }
}
