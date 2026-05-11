/**
 * Story Engine v2 — Soft Ending Enforcer (Phase M.6, 2026-05-12).
 *
 * Closes Supreme Goal 4 (natural ending in 1000-2000 chương range).
 *
 * `total_planned_chapters` là SOFT target — không hard cut-off ở chương đó.
 * Thay vào đó 4 phase với guidance khác nhau:
 *   Phase 1 (ch.1 → target-20): Normal writing — story builds, conflicts escalate
 *   Phase 2 (target-20 → target): Wrap-up — không introduce new conflicts/threads
 *   Phase 3 (target → target+20): Grace period — close at arc boundary if found
 *   Phase 4 (target+20+): Hard stop — mark project completed, no more chapters
 *
 * Module exports:
 *   - getEndingPhase(currentChapter, totalPlanned) → SoftEndingPhase
 *   - getArchitectGuidance(phase) → string injected vào Architect prompt
 *   - shouldMarkCompleted(phase, isArcBoundary) → boolean (Phase 3 + arc boundary OR Phase 4)
 *
 * Phase-aware enforcement runs trong orchestrator BEFORE 3-agent pipeline.
 */

export type SoftEndingPhase = 'phase_1_normal' | 'phase_2_wrapup' | 'phase_3_grace' | 'phase_4_hardstop';

/**
 * Determine current ending phase based on chapter progression vs soft target.
 * Returns 'phase_1_normal' if target unset (default behavior — write indefinitely).
 */
export function getEndingPhase(
  currentChapter: number,
  totalPlanned: number | null | undefined,
): SoftEndingPhase {
  if (!totalPlanned || totalPlanned <= 0) return 'phase_1_normal';
  const writingChapter = currentChapter + 1; // next chương to write
  if (writingChapter < totalPlanned - 20) return 'phase_1_normal';
  if (writingChapter < totalPlanned) return 'phase_2_wrapup';
  if (writingChapter <= totalPlanned + 20) return 'phase_3_grace';
  return 'phase_4_hardstop';
}

/**
 * Returns Architect prompt guidance string for current phase.
 * Empty string for phase_1_normal (no special handling).
 */
export function getArchitectGuidance(
  phase: SoftEndingPhase,
  totalPlanned: number,
  currentChapter: number,
): string {
  const chaptersRemaining = totalPlanned - currentChapter;

  switch (phase) {
    case 'phase_1_normal':
      return '';

    case 'phase_2_wrapup':
      return `

═══════════════════════════════════════════
🟡 PHASE WRAP-UP (chương ${currentChapter + 1}/${totalPlanned}, còn ${chaptersRemaining} chương):
═══════════════════════════════════════════
- KHÔNG introduce new conflicts / new villains / new factions / new plot threads
- TẬP TRUNG resolve các thread đang dang dở: payoff foreshadowing, close character arcs, settle relationships
- Pacing: chậm hơn, scene emotional, ít action mới
- MC growth: consolidate năng lực đã có, không break thêm cảnh giới mới (trừ khi đã foreshadowing rõ)
- Setup cho final climax — không lan man side story`;

    case 'phase_3_grace':
      return `

═══════════════════════════════════════════
🟠 PHASE GRACE (chương ${currentChapter + 1}, đã vượt target ${totalPlanned} +${currentChapter - totalPlanned} chương):
═══════════════════════════════════════════
- CHƯƠNG NÀY có thể là chương kết — tìm CƠ HỘI close arc tự nhiên (arc boundary).
- Nếu có thể: trigger final climax / resolve main conflict / show MC's endgame state.
- Đoạn kết để mở (epilogue tone) — không cliffhanger.
- Nếu chương này nằm GIỮA arc → tiếp tục bình thường nhưng prepare cho chương kết ASAP.`;

    case 'phase_4_hardstop':
      return `

═══════════════════════════════════════════
🔴 PHASE HARD-STOP (chương ${currentChapter + 1}, đã vượt target ${totalPlanned} +${currentChapter - totalPlanned} chương):
═══════════════════════════════════════════
- BUỘC PHẢI VIẾT chương kết. Đây là chương cuối của truyện.
- Resolve toàn bộ main conflict. MC reach final state. World stable hoặc reformed.
- Đoạn kết epilogue: 1-2 năm sau, MC + family + community. KHÔNG cliffhanger, KHÔNG sequel hook.
- Final scene: cảm xúc resolution (warm / triumphant / bittersweet tuỳ genre).`;
  }
}

/**
 * Check if chapter is at arc boundary (last chapter of a sub-arc) based on
 * master_outline. Used trong Phase 3 grace period to close ending naturally.
 */
export function isAtArcBoundary(
  currentChapter: number,
  masterOutline: { volumes?: Array<{ subArcs?: Array<{ endChapter: number }> }>; majorArcs?: Array<{ endChapter: number }> } | null,
): boolean {
  if (!masterOutline) return false;
  const endChapters: number[] = [];
  if (masterOutline.volumes) {
    for (const v of masterOutline.volumes) {
      for (const sa of v.subArcs || []) endChapters.push(sa.endChapter);
    }
  }
  if (masterOutline.majorArcs) {
    for (const arc of masterOutline.majorArcs) endChapters.push(arc.endChapter);
  }
  return endChapters.includes(currentChapter);
}

/**
 * Decide if project should be marked completed after this chapter.
 * Phase 4 = always. Phase 3 + arc boundary = yes.
 */
export function shouldMarkCompleted(
  phase: SoftEndingPhase,
  isArcBoundary: boolean,
): boolean {
  if (phase === 'phase_4_hardstop') return true;
  if (phase === 'phase_3_grace' && isArcBoundary) return true;
  return false;
}
