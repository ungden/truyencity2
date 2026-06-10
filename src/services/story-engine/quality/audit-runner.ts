/**
 * Quality Overhaul 4.2 — coherence audit runner.
 *
 * Core of scripts/coherence-audit-v2.ts moved into the engine so audits run
 * automatically (quality-trend cron, every 50 chapters per production novel)
 * and PERSIST to coherence_audits instead of evaporating in stdout.
 *
 * Two layers per audit:
 *  - Structural (deterministic): chapter gaps, missing summaries, duplicate
 *    titles.
 *  - AI (5 dimensions, 1-10): coherence / continuity / character consistency
 *    / progression / quality stability over the 5 most recent chapters.
 *
 * Non-fatal: returns null on any failure; cron continues.
 */

import { getSupabase } from '../utils/supabase';
import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import type { GeminiConfig } from '../types';

export interface CoherenceAuditScores {
  coherence_score: number;
  continuity_score: number;
  character_consistency_score: number;
  progression_score: number;
  quality_stability_score: number;
  risk_level: 'high' | 'medium' | 'low';
  verdict: string;
}

export interface CoherenceAuditResult {
  projectId: string;
  novelId: string | null;
  chapterStart: number;
  chapterEnd: number;
  scores: CoherenceAuditScores;
  keyIssues: string[];
  structural: {
    chapter_count: number;
    gap_count: number;
    missing_summary_count: number;
    duplicate_title_count: number;
    structural_risk: 'high' | 'medium' | 'low';
  };
}

/** Pure structural analysis — exported for unit tests. */
export function analyzeStructure(
  chapterNumbers: number[],
  titles: string[],
  summaryNumbers: Set<number>,
): CoherenceAuditResult['structural'] {
  const maxChapter = chapterNumbers.length ? Math.max(...chapterNumbers) : 0;
  const present = new Set(chapterNumbers);
  let gapCount = 0;
  for (let i = 1; i <= maxChapter; i++) {
    if (!present.has(i)) gapCount++;
  }
  const missingSummaries = chapterNumbers.filter(n => !summaryNumbers.has(n)).length;
  const cleanTitles = titles.filter(Boolean);
  const dupTitles = cleanTitles.length - new Set(cleanTitles).size;
  const structuralRisk: 'high' | 'medium' | 'low' =
    gapCount > 0 ? 'high'
    : missingSummaries > chapterNumbers.length * 0.3 ? 'medium'
    : 'low';
  return {
    chapter_count: chapterNumbers.length,
    gap_count: gapCount,
    missing_summary_count: missingSummaries,
    duplicate_title_count: dupTitles,
    structural_risk: structuralRisk,
  };
}

export async function runCoherenceAudit(
  projectId: string,
  config: GeminiConfig,
): Promise<CoherenceAuditResult | null> {
  try {
    const db = getSupabase();
    const { data: project } = await db
      .from('ai_story_projects')
      .select('id, novel_id, genre, current_chapter, total_planned_chapters')
      .eq('id', projectId)
      .maybeSingle();
    if (!project?.novel_id) return null;

    const { data: chapters } = await db
      .from('chapters')
      .select('chapter_number, title')
      .eq('novel_id', project.novel_id)
      .order('chapter_number', { ascending: true });
    if (!chapters || chapters.length < 5) return null;

    const { data: recentRows } = await db
      .from('chapters')
      .select('chapter_number, title, content')
      .eq('novel_id', project.novel_id)
      .order('chapter_number', { ascending: false })
      .limit(5);
    const recent = (recentRows || []).reverse();
    if (recent.length < 3) return null;

    const { data: summaries } = await db
      .from('chapter_summaries')
      .select('chapter_number')
      .eq('project_id', projectId);

    const structural = analyzeStructure(
      chapters.map(c => c.chapter_number),
      chapters.map(c => c.title || ''),
      new Set((summaries || []).map(s => s.chapter_number)),
    );

    const { data: charStates } = await db
      .from('character_states')
      .select('character_name, status, chapter_number')
      .eq('project_id', projectId)
      .order('chapter_number', { ascending: false })
      .limit(10);
    const charContext = charStates?.length
      ? `\nCharacter states: ${charStates.map(c => `${c.character_name}(${c.status}, ch.${c.chapter_number})`).join(', ')}`
      : '';

    const chapterTexts = recent
      .map(c => `[Ch.${c.chapter_number}: "${c.title}"]\n${(c.content || '').slice(0, 1500)}`)
      .join('\n\n---\n\n');

    const prompt = `Bạn là chuyên gia đánh giá chất lượng truyện dài kỳ tiếng Việt.

Thể loại: ${project.genre || 'unknown'}
Tổng số chương hiện tại: ${chapters.length} / mục tiêu ${project.total_planned_chapters || '?'}${charContext}

5 chương GẦN NHẤT (mỗi chương 1500 ký tự đầu):

${chapterTexts}

Đánh giá thang 1-10 cho 5 tiêu chí:
1. coherence_score: mạch truyện logic, cốt truyện rõ ràng
2. continuity_score: chương sau nối tiếp chương trước (cliffhanger giải quyết, sự kiện nhất quán)
3. character_consistency_score: nhân vật nhất quán (tính cách, sức mạnh, trạng thái)
4. progression_score: truyện tiến triển, không lặp, không đứng yên
5. quality_stability_score: chất lượng viết ổn định giữa các chương

Thêm: risk_level ("high"/"medium"/"low"), key_issues (mảng tiếng Việt, tối đa 5), verdict ("pass"/"fail").

Trả về JSON: {"coherence_score":8,"continuity_score":7,"character_consistency_score":8,"progression_score":7,"quality_stability_score":8,"risk_level":"medium","key_issues":["..."],"verdict":"pass"}`;

    const res = await callGemini(prompt, {
      ...config,
      temperature: 0.2,
      maxTokens: 2048,
    }, {
      jsonMode: true,
      tracking: { projectId, task: 'coherence_audit', chapterNumber: project.current_chapter || 0 },
    });

    const parsed = parseJSON<CoherenceAuditScores & { key_issues?: string[] }>(res.content);
    if (!parsed?.coherence_score) return null;

    const result: CoherenceAuditResult = {
      projectId,
      novelId: project.novel_id,
      chapterStart: recent[0].chapter_number,
      chapterEnd: recent[recent.length - 1].chapter_number,
      scores: {
        coherence_score: Number(parsed.coherence_score) || 5,
        continuity_score: Number(parsed.continuity_score) || 5,
        character_consistency_score: Number(parsed.character_consistency_score) || 5,
        progression_score: Number(parsed.progression_score) || 5,
        quality_stability_score: Number(parsed.quality_stability_score) || 5,
        risk_level: parsed.risk_level || 'medium',
        verdict: parsed.verdict || 'unknown',
      },
      keyIssues: Array.isArray(parsed.key_issues) ? parsed.key_issues.slice(0, 5) : [],
      structural,
    };

    const { error } = await db.from('coherence_audits').insert({
      project_id: projectId,
      novel_id: project.novel_id,
      chapter_start: result.chapterStart,
      chapter_end: result.chapterEnd,
      audit_type: 'coherence_5dim',
      scores: result.scores,
      findings: { key_issues: result.keyIssues, structural },
    });
    if (error) console.warn(`[AuditRunner] persist failed for ${projectId}: ${error.message}`);

    return result;
  } catch (e) {
    console.warn(`[AuditRunner] audit threw for ${projectId}:`, e instanceof Error ? e.message : String(e));
    return null;
  }
}
