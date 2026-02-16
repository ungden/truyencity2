import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { AIProviderService } from '@/services/ai-provider';
import type { GenreType } from '@/services/story-writing-factory/types';

dotenv.config({ path: '.env.local' });

type ProjectRow = {
  id: string;
  novel_id: string;
  current_chapter: number | null;
  total_planned_chapters: number | null;
  genre: string | null;
  main_character: string | null;
  novels: { id: string; title: string } | { id: string; title: string }[] | null;
};

type ChapterRow = {
  novel_id: string;
  chapter_number: number;
  title: string | null;
};

type SummaryRow = {
  project_id: string;
  chapter_number: number;
  title: string | null;
  summary: string | null;
  mc_state: string | null;
  cliffhanger: string | null;
  opening_sentence: string | null;
};

type AiAssessment = {
  coherence_score: number;
  continuity_score: number;
  character_consistency_score: number;
  progression_score: number;
  quality_stability_score: number;
  risk_level: 'low' | 'medium' | 'high';
  key_issues: string[];
  verdict: 'pass' | 'watch' | 'fail';
};

const MAX_SUMMARY_WINDOW = 40;
const AI_CONCURRENCY = 4;

function getEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing env var: ${name}`);
  return val;
}

function extractJson(content: string): string {
  const fenced = content.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start >= 0 && end > start) return content.slice(start, end + 1);
  return content.trim();
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, Math.round(n * 10) / 10));
}

function normalizeAssessment(raw: unknown): AiAssessment {
  const obj = (typeof raw === 'object' && raw !== null) ? raw as Record<string, unknown> : {};
  const risk = String(obj.risk_level || 'high').toLowerCase();
  const verdict = String(obj.verdict || 'fail').toLowerCase();
  return {
    coherence_score: clampScore(Number(obj.coherence_score ?? 0)),
    continuity_score: clampScore(Number(obj.continuity_score ?? 0)),
    character_consistency_score: clampScore(Number(obj.character_consistency_score ?? 0)),
    progression_score: clampScore(Number(obj.progression_score ?? 0)),
    quality_stability_score: clampScore(Number(obj.quality_stability_score ?? 0)),
    risk_level: (risk === 'low' || risk === 'medium' || risk === 'high') ? risk : 'high',
    key_issues: Array.isArray(obj.key_issues) ? obj.key_issues.map((x) => String(x)).slice(0, 8) : [],
    verdict: (verdict === 'pass' || verdict === 'watch' || verdict === 'fail') ? verdict : 'fail',
  };
}

function buildSummaryWindowText(rows: SummaryRow[]): string {
  return rows
    .sort((a, b) => a.chapter_number - b.chapter_number)
    .map((r) => {
      return [
        `CH${r.chapter_number}: ${r.title || '(không tiêu đề)'}`,
        `SUMMARY: ${r.summary || ''}`,
        `MC_STATE: ${r.mc_state || ''}`,
        `CLIFFHANGER: ${r.cliffhanger || ''}`,
        `OPENING_NEXT: ${r.opening_sentence || ''}`,
      ].join('\n');
    })
    .join('\n\n---\n\n');
}

async function runWithConcurrency<T>(tasks: Array<() => Promise<T>>, concurrency: number): Promise<T[]> {
  if (tasks.length === 0) return [];
  const limit = Math.max(1, Math.min(concurrency, tasks.length));
  const results: T[] = new Array(tasks.length);
  let cursor = 0;

  const worker = async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= tasks.length) break;
      results[idx] = await tasks[idx]();
    }
  };

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
}

async function main() {
  const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
  const aiService = new AIProviderService({ gemini: getEnv('GEMINI_API_KEY') });

  const { data: projectsRaw, error: projectsErr } = await supabase
    .from('ai_story_projects')
    .select(`
      id, novel_id, current_chapter, total_planned_chapters, genre, main_character,
      novels!ai_story_projects_novel_id_fkey (id, title)
    `)
    .eq('status', 'active');

  if (projectsErr) throw new Error(`Load projects failed: ${projectsErr.message}`);
  const projects = (projectsRaw || []) as ProjectRow[];
  if (projects.length === 0) {
    console.log('No active projects.');
    return;
  }

  const aiTasks = projects.map((project) => async () => {
    const novel = Array.isArray(project.novels) ? project.novels[0] : project.novels;
    const novelTitle = novel?.title || project.novel_id;
    const [{ data: chData, error: chErr }, { data: suData, error: suErr }] = await Promise.all([
      supabase
        .from('chapters')
        .select('novel_id,chapter_number,title')
        .eq('novel_id', project.novel_id)
        .order('chapter_number', { ascending: true }),
      supabase
        .from('chapter_summaries')
        .select('project_id,chapter_number,title,summary,mc_state,cliffhanger,opening_sentence')
        .eq('project_id', project.id)
        .order('chapter_number', { ascending: true }),
    ]);

    if (chErr) throw new Error(`Load chapters failed for ${project.id}: ${chErr.message}`);
    if (suErr) throw new Error(`Load summaries failed for ${project.id}: ${suErr.message}`);

    const chapterRows = (chData || []) as ChapterRow[];
    const summaryRows = (suData || []) as SummaryRow[];

    const numbers = chapterRows.map((c) => c.chapter_number).sort((a, b) => a - b);
    const titleRows = chapterRows.map((c) => (c.title || '').trim()).filter(Boolean);
    const titleSet = new Set(titleRows);
    const duplicateTitleCount = Math.max(0, titleRows.length - titleSet.size);

    let gapCount = 0;
    let firstGap: number | null = null;
    if (numbers.length > 0) {
      const set = new Set(numbers);
      for (let n = 1; n <= numbers[numbers.length - 1]; n++) {
        if (!set.has(n)) {
          gapCount++;
          if (firstGap === null) firstGap = n;
        }
      }
    }

    const summaryNums = new Set(summaryRows.map((s) => s.chapter_number));
    let missingSummaryCount = 0;
    for (const n of numbers) {
      if (!summaryNums.has(n)) missingSummaryCount++;
    }

    const recentSummaries = summaryRows.slice(-MAX_SUMMARY_WINDOW);
    let ai: AiAssessment = {
      coherence_score: 0,
      continuity_score: 0,
      character_consistency_score: 0,
      progression_score: 0,
      quality_stability_score: 0,
      risk_level: 'high',
      key_issues: ['insufficient_summary_data'],
      verdict: 'fail',
    };

    if (recentSummaries.length >= 6) {
      const systemPrompt = `Bạn là senior editor kiểm định chất lượng truyện dài kỳ.\nĐánh giá mạch lạc liên chương, consistency nhân vật/sức mạnh, tiến triển cốt truyện, và độ ổn định chất lượng.\nTrả JSON thuần, không markdown.`;
      const userPrompt = `ĐÁNH GIÁ TRUYỆN:\n- title: ${novelTitle}\n- project_id: ${project.id}\n- genre: ${(project.genre || 'unknown') as GenreType}\n- current_chapter: ${project.current_chapter || 0}\n\nDỮ LIỆU ${recentSummaries.length} CHƯƠNG GẦN NHẤT:\n${buildSummaryWindowText(recentSummaries)}\n\nYÊU CẦU:\n- Chấm điểm 0-10 cho: coherence_score, continuity_score, character_consistency_score, progression_score, quality_stability_score\n- risk_level: low|medium|high\n- verdict: pass|watch|fail\n- key_issues: tối đa 8 ý, ngắn gọn\n\nFORMAT JSON:\n{\n  "coherence_score": 0,\n  "continuity_score": 0,\n  "character_consistency_score": 0,\n  "progression_score": 0,\n  "quality_stability_score": 0,\n  "risk_level": "low",\n  "verdict": "pass",\n  "key_issues": ["..."]\n}`;

      const resp = await aiService.chat({
        provider: 'gemini',
        model: 'gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        maxTokens: 2048,
      });

      if (resp.success && resp.content) {
        try {
          ai = normalizeAssessment(JSON.parse(extractJson(resp.content)));
        } catch {
          const retry = await aiService.chat({
            provider: 'gemini',
            model: 'gemini-3-flash-preview',
            messages: [
              { role: 'system', content: 'Trả duy nhất 1 object JSON hợp lệ, không markdown, không giải thích.' },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0,
            maxTokens: 1024,
          });

          if (retry.success && retry.content) {
            try {
              ai = normalizeAssessment(JSON.parse(extractJson(retry.content)));
            } catch {
              ai = {
                coherence_score: 0,
                continuity_score: 0,
                character_consistency_score: 0,
                progression_score: 0,
                quality_stability_score: 0,
                risk_level: 'high',
                verdict: 'fail',
                key_issues: ['ai_response_parse_failed'],
              };
            }
          } else {
            ai = {
              coherence_score: 0,
              continuity_score: 0,
              character_consistency_score: 0,
              progression_score: 0,
              quality_stability_score: 0,
              risk_level: 'high',
              verdict: 'fail',
              key_issues: ['ai_response_parse_failed'],
            };
          }
        }
      } else {
        ai = {
          coherence_score: 0,
          continuity_score: 0,
          character_consistency_score: 0,
          progression_score: 0,
          quality_stability_score: 0,
          risk_level: 'high',
          verdict: 'fail',
          key_issues: [resp.error || 'ai_call_failed'],
        };
      }
    }

    const structuralRisk = gapCount > 0 || missingSummaryCount > 0 ? 'high' : duplicateTitleCount > 0 ? 'medium' : 'low';

    return {
      project_id: project.id,
      novel_id: project.novel_id,
      novel_title: novelTitle,
      genre: project.genre,
      current_chapter: project.current_chapter || 0,
      total_planned_chapters: project.total_planned_chapters || 0,
      structural: {
        chapter_count: numbers.length,
        max_chapter: numbers.length > 0 ? numbers[numbers.length - 1] : 0,
        gap_count: gapCount,
        first_gap: firstGap,
        missing_summary_count: missingSummaryCount,
        duplicate_title_count: duplicateTitleCount,
        structural_risk: structuralRisk,
      },
      ai,
      overall_risk: (gapCount > 0 || missingSummaryCount > 0)
        ? 'high'
        : (ai.risk_level === 'high' || ai.verdict === 'fail')
          ? 'high'
          : (ai.risk_level === 'medium' || ai.verdict === 'watch' || duplicateTitleCount > 0)
            ? 'medium'
            : 'low',
    };
  });

  const audits = await runWithConcurrency(aiTasks, AI_CONCURRENCY);

  const aggregate = {
    active_projects: audits.length,
    high_risk: audits.filter((a) => a.overall_risk === 'high').length,
    medium_risk: audits.filter((a) => a.overall_risk === 'medium').length,
    low_risk: audits.filter((a) => a.overall_risk === 'low').length,
    structural_gap_projects: audits.filter((a) => a.structural.gap_count > 0).length,
    structural_missing_summary_projects: audits.filter((a) => a.structural.missing_summary_count > 0).length,
    avg_scores: {
      coherence: Math.round((audits.reduce((s, a) => s + a.ai.coherence_score, 0) / audits.length) * 100) / 100,
      continuity: Math.round((audits.reduce((s, a) => s + a.ai.continuity_score, 0) / audits.length) * 100) / 100,
      character_consistency: Math.round((audits.reduce((s, a) => s + a.ai.character_consistency_score, 0) / audits.length) * 100) / 100,
      progression: Math.round((audits.reduce((s, a) => s + a.ai.progression_score, 0) / audits.length) * 100) / 100,
      quality_stability: Math.round((audits.reduce((s, a) => s + a.ai.quality_stability_score, 0) / audits.length) * 100) / 100,
    },
  };

  const output = {
    generated_at: new Date().toISOString(),
    aggregate,
    high_risk_projects: audits
      .filter((a) => a.overall_risk === 'high')
      .sort((a, b) => b.current_chapter - a.current_chapter),
    all_projects: audits.sort((a, b) => a.novel_title.localeCompare(b.novel_title)),
  };

  const outDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.join(outDir, `coherence-audit-${stamp}.json`);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');

  console.log(`Audit complete. Report: ${outPath}`);
  console.log(JSON.stringify(aggregate, null, 2));
}

main().catch((err) => {
  console.error('Fatal:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
