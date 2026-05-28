/**
 * Story Engine v2 — Per-chapter corrective directive (Goal 5: uniform quality)
 *
 * Closes the missing feedback loop: quality scores, guardian issues and voice
 * drift are all recorded AFTER a chapter ships, but the NEXT chapter's context
 * never learned "the previous chapter scored 4/10 / reopened a closed subplot /
 * drifted into these anti-patterns". Without that signal, a quality dip has no
 * mechanism to self-correct — it just persists.
 *
 * This is DETERMINISTIC (no AI call): it reads the most recent `quality_metrics`
 * row plus `voice_fingerprints.anti_patterns` and, when the previous chapter was
 * weak, returns a short Vietnamese `[SỬA LỖI CHƯƠNG TRƯỚC]` block naming the
 * specific weak dimension(s). The orchestrator appends it to `context.ragContext`
 * (same channel as finaleContext / customPrompt) so both Architect and Writer
 * see it. When the previous chapter was fine, returns '' (no noise).
 */

import { getSupabase } from '../utils/supabase';

// Critic dimension scores are 0-10; <=5 is the "weak" floor.
const WEAK_SCORE = 5;

export async function buildCorrectiveDirective(
  projectId: string,
  prevChapter: number,
): Promise<string> {
  if (prevChapter < 1) return '';

  try {
    const db = getSupabase();

    const [metricsRes, voiceRes] = await Promise.all([
      db.from('quality_metrics')
        .select('chapter_number,overall_score,dopamine_score,pacing_score,ending_hook_score,guardian_issues_critical,contradictions_critical')
        .eq('project_id', projectId)
        .lte('chapter_number', prevChapter)
        .order('chapter_number', { ascending: false })
        .limit(1)
        .maybeSingle(),
      db.from('voice_fingerprints')
        .select('anti_patterns')
        .eq('project_id', projectId)
        .maybeSingle(),
    ]);

    const m = metricsRes.data;
    const antiPatterns = ((voiceRes.data?.anti_patterns || []) as string[]).filter(Boolean);

    if (!m && antiPatterns.length === 0) return '';

    const weak: string[] = [];
    if (m) {
      if (m.overall_score != null && m.overall_score <= WEAK_SCORE) {
        weak.push(`điểm tổng thể chương trước chỉ ${m.overall_score}/10 — nâng chất lượng tổng thể lên rõ rệt`);
      }
      if (m.dopamine_score != null && m.dopamine_score <= WEAK_SCORE) {
        weak.push(`dopamine yếu (${m.dopamine_score}/10) — tăng mật độ "sướng": ≥2 cao trào (face-slap/được công nhận/thu hoạch/đột phá), đỉnh đầu tiên ≤50% chương`);
      }
      if (m.pacing_score != null && m.pacing_score <= WEAK_SCORE) {
        weak.push(`nhịp truyện chậm (${m.pacing_score}/10) — cắt setup thừa, payoff sớm, tránh kìm nén`);
      }
      if (m.ending_hook_score != null && m.ending_hook_score <= WEAK_SCORE) {
        weak.push(`hook kết chương yếu (${m.ending_hook_score}/10) — kết bằng cliffhanger/câu hỏi khiến độc giả phải đọc tiếp`);
      }
      if ((m.guardian_issues_critical ?? 0) > 0) {
        weak.push(`chương trước có ${m.guardian_issues_critical} lỗi liên tục nghiêm trọng — tuyệt đối không lặp lại (nhân vật chết sống lại, mở tuyến đã đóng, mâu thuẫn cảnh giới)`);
      }
      if ((m.contradictions_critical ?? 0) > 0) {
        weak.push(`chương trước có ${m.contradictions_critical} mâu thuẫn nhân vật nghiêm trọng — kiểm tra trạng thái/cảnh giới/địa điểm nhân vật khớp lịch sử`);
      }
    }
    if (antiPatterns.length > 0) {
      weak.push(`tránh các anti-pattern giọng văn đã phát hiện: ${antiPatterns.slice(0, 8).join('; ')}`);
    }

    if (weak.length === 0) return '';

    return `[SỬA LỖI CHƯƠNG TRƯỚC — BẮT BUỘC KHẮC PHỤC]\n` +
      weak.map(w => `• ${w}`).join('\n');
  } catch (e) {
    console.warn('[CorrectiveDirective] failed:', e instanceof Error ? e.message : String(e));
    return '';
  }
}
