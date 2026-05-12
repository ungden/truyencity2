/**
 * Story Engine v2 — Arc Enforcement (Phase M.5, 2026-05-12).
 *
 * Deterministic gate ensuring each chapter respects master_outline directional
 * plot trajectory. Closes Supreme Goal 3 (directional plot progression) which
 * currently has no enforcer — master_outline is READ for context but no gate
 * validates that the written chapter advances arc/sub-arc as designed.
 *
 * Checks:
 *   1. Volume + sub-arc lookup — find current position in hierarchy
 *   2. KeyMilestone proximity — if within last 5 chapters of sub-arc and
 *      milestone not yet hit, flag.
 *   3. Power monotonic — character_states.power_realm_index for MC monotonic
 *      non-decreasing across sub-arc (anti-power-regression).
 *   4. Scope cap — active plot threads (status='active') count ≤7 (anti-
 *      scope-explosion per Supreme Goals criterion 14).
 *
 * Design: pure DB query + regex (no AI calls). Mirrors canon-enforcement.ts
 * pattern. Runs post-Critic, pre-save in chapter-writer.ts.
 */

import { getSupabase } from '../utils/supabase';
import type { CriticIssue } from '../types';

export interface ArcEnforcementInput {
  projectId: string;
  chapterNumber: number;
  content: string;
}

interface SubArc {
  arcNumber?: number;
  startChapter: number;
  endChapter: number;
  keyMilestone?: string;
  arcName?: string;
}

interface Volume {
  volumeNumber: number;
  name?: string;
  startChapter: number;
  endChapter: number;
  volumeClimaxAt?: number;
  subArcs?: SubArc[];
}

interface MasterOutlineShape {
  volumes?: Volume[];
  majorArcs?: SubArc[];
}

/**
 * Run all arc-level gates. Returns CriticIssue[] to merge into Critic output.
 * Each gate is non-fatal — one failure does not block others.
 */
export async function enforceArcGates(input: ArcEnforcementInput): Promise<CriticIssue[]> {
  const issues: CriticIssue[] = [];

  try {
    const db = getSupabase();
    const { data: row, error } = await db
      .from('ai_story_projects')
      .select('master_outline, main_character')
      .eq('id', input.projectId)
      .maybeSingle();
    if (error || !row) return [];

    const masterOutline = row.master_outline as MasterOutlineShape | null;
    const mcName = row.main_character || 'MC';
    if (!masterOutline) return [];

    // Gate 1: locate sub-arc for current chapter
    const currentSubArc = findCurrentSubArc(masterOutline, input.chapterNumber);
    if (!currentSubArc) {
      // No sub-arc covers this chapter — possible orphan. Log soft warning.
      issues.push({
        type: 'continuity',
        severity: 'moderate',
        description: `Chapter ${input.chapterNumber} không nằm trong sub-arc nào của master_outline. Có thể master_outline lỗi thời.`,
      });
      return issues;
    }

    // Gate 2: KeyMilestone proximity check
    const milestoneIssue = checkKeyMilestoneProximity(currentSubArc, input.chapterNumber, input.content);
    if (milestoneIssue) issues.push(milestoneIssue);

    // Gate 3: Power monotonic check
    const powerIssue = await checkPowerMonotonic(db, input.projectId, currentSubArc, mcName, input.chapterNumber);
    if (powerIssue) issues.push(powerIssue);

    // Gate 4: Scope cap (≤7 active threads)
    const scopeIssue = await checkScopeCap(db, input.projectId);
    if (scopeIssue) issues.push(scopeIssue);

    // Gate 5 (Phase N.4): Foreshadowing overdue — hints planted ch.X với
    // payoff_chapter ≤ currentChapter-20 nhưng status còn 'planted'/'seeding'
    // (chưa resolved). Reader đã quên context → urgent payoff hoặc archive.
    const overdueIssue = await checkForeshadowingOverdue(db, input.projectId, input.chapterNumber);
    if (overdueIssue) issues.push(overdueIssue);
  } catch (e) {
    console.warn(`[ArcEnforcement] non-fatal: ${e instanceof Error ? e.message : String(e)}`);
  }

  return issues;
}

// ── Gate 1: find current sub-arc ─────────────────────────────────────────────

function findCurrentSubArc(mo: MasterOutlineShape, chapterNumber: number): SubArc | null {
  // Volumes hierarchical: prefer volumes if present
  if (mo.volumes && mo.volumes.length > 0) {
    for (const vol of mo.volumes) {
      if (chapterNumber < vol.startChapter || chapterNumber > vol.endChapter) continue;
      if (!vol.subArcs) continue;
      for (const sa of vol.subArcs) {
        if (chapterNumber >= sa.startChapter && chapterNumber <= sa.endChapter) return sa;
      }
    }
  }
  // Fallback: majorArcs flat list
  if (mo.majorArcs && mo.majorArcs.length > 0) {
    for (const arc of mo.majorArcs) {
      if (chapterNumber >= arc.startChapter && chapterNumber <= arc.endChapter) return arc;
    }
  }
  return null;
}

// ── Gate 2: keyMilestone proximity ───────────────────────────────────────────

function checkKeyMilestoneProximity(
  subArc: SubArc,
  chapterNumber: number,
  content: string,
): CriticIssue | null {
  if (!subArc.keyMilestone || subArc.keyMilestone.trim().length < 10) return null;
  // Only enforce in last 5 chapters of sub-arc
  const chaptersToEnd = subArc.endChapter - chapterNumber;
  if (chaptersToEnd > 5 || chaptersToEnd < 0) return null;

  // Extract content keywords from milestone (rough match — Vietnamese tokens 4+ chars)
  const milestone = subArc.keyMilestone.toLowerCase();
  const keywords = milestone
    .split(/[\s,;.]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
  if (keywords.length === 0) return null;

  // Score: count how many keywords appear in chapter content (case-insensitive)
  const contentLower = content.toLowerCase();
  const hits = keywords.filter((w) => contentLower.includes(w));
  const hitRatio = hits.length / keywords.length;

  // If sub-arc ending in ≤2 chapters and <30% milestone keywords present, flag major
  if (chaptersToEnd <= 2 && hitRatio < 0.3) {
    return {
      type: 'pacing',
      severity: 'major',
      description: `Sub-arc "${subArc.arcName ?? 'unnamed'}" ending ch.${subArc.endChapter}, hit milestone "${subArc.keyMilestone.slice(0, 80)}" overdue — chỉ ${hits.length}/${keywords.length} keywords match trong chương ${chapterNumber}.`,
    };
  }
  // Soft warning 3-5 ch away với <20% match
  if (chaptersToEnd <= 5 && hitRatio < 0.2) {
    return {
      type: 'pacing',
      severity: 'moderate',
      description: `Sub-arc milestone "${subArc.keyMilestone.slice(0, 60)}" có thể bị bỏ qua (${hits.length}/${keywords.length} keywords match, còn ${chaptersToEnd} chương).`,
    };
  }
  return null;
}

const STOPWORDS = new Set([
  'của', 'và', 'với', 'cho', 'qua', 'một', 'những', 'các', 'là', 'có', 'đã', 'sẽ',
  'từ', 'trong', 'trên', 'dưới', 'sau', 'trước', 'này', 'kia', 'đó', 'khi', 'để',
  'mà', 'thì', 'nhưng', 'vì', 'nếu', 'hoặc', 'cũng', 'lại', 'chỉ', 'còn', 'được',
]);

// ── Gate 3: power monotonic ──────────────────────────────────────────────────

async function checkPowerMonotonic(
  db: ReturnType<typeof getSupabase>,
  projectId: string,
  subArc: SubArc,
  mcName: string,
  chapterNumber: number,
): Promise<CriticIssue | null> {
  // Query MC power_realm_index ở 3 chương gần nhất trong sub-arc
  const { data, error } = await db
    .from('character_states')
    .select('chapter_number, power_realm_index')
    .eq('project_id', projectId)
    .eq('character_name', mcName)
    .gte('chapter_number', Math.max(subArc.startChapter, chapterNumber - 3))
    .lte('chapter_number', chapterNumber)
    .order('chapter_number', { ascending: true });
  if (error || !data || data.length < 2) return null;

  // Check monotonic non-decreasing
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1].power_realm_index;
    const curr = data[i].power_realm_index;
    if (prev != null && curr != null && curr < prev) {
      return {
        type: 'continuity',
        severity: 'critical',
        description: `MC power thoái lui: ch.${data[i - 1].chapter_number} realm_index=${prev}, ch.${data[i].chapter_number} realm_index=${curr}. Vi phạm directional plot progression.`,
      };
    }
  }
  return null;
}

// ── Gate 4: scope cap (≤7 active threads) ────────────────────────────────────

async function checkScopeCap(
  db: ReturnType<typeof getSupabase>,
  projectId: string,
): Promise<CriticIssue | null> {
  const { count, error } = await db
    .from('plot_threads')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('status', 'active');
  if (error) return null;
  const active = count ?? 0;
  if (active > 7) {
    return {
      type: 'pacing',
      severity: 'moderate',
      description: `${active} active plot threads (cap 7) — scope explosion risk, reader có thể lost focus. Resolve hoặc consolidate threads cũ.`,
    };
  }
  return null;
}

// ── Gate 5: foreshadowing overdue (Phase N.4) ────────────────────────────────

async function checkForeshadowingOverdue(
  db: ReturnType<typeof getSupabase>,
  projectId: string,
  currentChapter: number,
): Promise<CriticIssue | null> {
  const { data, error } = await db
    .from('foreshadowing_plans')
    .select('hint_id, hint_text, plant_chapter, payoff_chapter, status')
    .eq('project_id', projectId)
    .in('status', ['planted', 'seeding'])
    .lte('payoff_chapter', currentChapter - 20);
  if (error || !data || data.length === 0) return null;

  const previews = data
    .slice(0, 3)
    .map((h) => `[ch.${h.plant_chapter} → ${h.payoff_chapter}] ${(h.hint_text || h.hint_id || '').slice(0, 50)}`)
    .join('; ');
  return {
    type: 'continuity',
    severity: data.length >= 3 ? 'major' : 'moderate',
    description: `${data.length} foreshadowing hints overdue payoff (planted nhưng chưa resolve, target ≤ ch.${currentChapter - 20}): ${previews}. Pay off NGAY trong chương này HOẶC mark abandoned. Reader đã quên context.`,
  };
}
