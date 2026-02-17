/**
 * Coherence Audit v2 — Post-upgrade comparison
 * 
 * Audits all active projects using Gemini AI to score:
 *   coherence, continuity, character_consistency, progression, quality_stability
 * 
 * Compares with baseline from 2026-02-16.
 * 
 * Usage: npx tsx scripts/coherence-audit-v2.ts
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
const GEMINI_KEY = getEnv('GEMINI_API_KEY');
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

type Scores = {
  coherence_score: number;
  continuity_score: number;
  character_consistency_score: number;
  progression_score: number;
  quality_stability_score: number;
  risk_level: string;
  key_issues: string[];
  verdict: string;
};

type ProjectAudit = {
  project_id: string;
  novel_id: string;
  novel_title: string;
  genre: string;
  current_chapter: number;
  total_planned_chapters: number;
  structural: {
    chapter_count: number;
    max_chapter: number;
    gap_count: number;
    first_gap: number | null;
    missing_summary_count: number;
    duplicate_title_count: number;
    structural_risk: string;
  };
  ai: Scores;
  overall_risk: string;
};

async function callGemini(prompt: string): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, 2000 * attempt));
      
      const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (res.status === 429 || res.status === 503) {
        console.log(`    Rate limited (${res.status}), retry ${attempt + 1}/3...`);
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.log(`    Gemini error: ${res.status} ${body.slice(0, 100)}`);
        return '';
      }

      const data = await res.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (e) {
      if (attempt >= 2) return '';
    }
  }
  return '';
}

function parseScores(text: string): Scores | null {
  try {
    // Extract JSON from markdown code block or raw text
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) return null;
    
    const parsed = JSON.parse(jsonMatch[1]);
    
    return {
      coherence_score: Number(parsed.coherence_score) || 5,
      continuity_score: Number(parsed.continuity_score) || 5,
      character_consistency_score: Number(parsed.character_consistency_score) || 5,
      progression_score: Number(parsed.progression_score) || 5,
      quality_stability_score: Number(parsed.quality_stability_score) || 5,
      risk_level: parsed.risk_level || 'medium',
      key_issues: Array.isArray(parsed.key_issues) ? parsed.key_issues : [],
      verdict: parsed.verdict || 'unknown',
    };
  } catch {
    return null;
  }
}

async function auditProject(project: any, novelTitle: string): Promise<ProjectAudit | null> {
  const projectId = project.id;
  const novelId = project.novel_id;

  // Fetch chapters
  const { data: chapters } = await supabase
    .from('chapters')
    .select('chapter_number, title, content')
    .eq('novel_id', novelId)
    .order('chapter_number', { ascending: true });

  if (!chapters || chapters.length < 3) {
    console.log(`  Skipping "${novelTitle}" — only ${chapters?.length || 0} chapters`);
    return null;
  }

  // Structural analysis
  const chapterNums = chapters.map(c => c.chapter_number);
  const maxChapter = Math.max(...chapterNums);
  let gapCount = 0;
  let firstGap: number | null = null;
  for (let i = 1; i <= maxChapter; i++) {
    if (!chapterNums.includes(i)) {
      gapCount++;
      if (firstGap === null) firstGap = i;
    }
  }

  // Check summaries
  const { data: summaries } = await supabase
    .from('chapter_summaries')
    .select('chapter_number')
    .eq('project_id', projectId);
  const summaryNums = new Set((summaries || []).map(s => s.chapter_number));
  const missingSummaries = chapterNums.filter(n => !summaryNums.has(n)).length;

  // Duplicate titles
  const titles = chapters.map(c => c.title).filter(Boolean);
  const titleSet = new Set(titles);
  const dupTitles = titles.length - titleSet.size;

  const structuralRisk = gapCount > 0 ? 'high' : missingSummaries > chapters.length * 0.3 ? 'medium' : 'low';

  // Take last 5 chapters for AI analysis (most recent = written with new system)
  const recentChapters = chapters.slice(-5);
  const chapterTexts = recentChapters.map(c => {
    const content = (c.content || '').slice(0, 1500);
    return `[Ch.${c.chapter_number}: "${c.title}"]\n${content}`;
  }).join('\n\n---\n\n');

  // Fetch character states for context
  const { data: charStates } = await supabase
    .from('character_states')
    .select('character_name, status, power_level, chapter_number')
    .eq('project_id', projectId)
    .order('chapter_number', { ascending: false })
    .limit(10);

  const charContext = (charStates || []).length > 0
    ? `\nCharacter states tracked: ${(charStates || []).map(c => `${c.character_name}(${c.status}, ch.${c.chapter_number})`).join(', ')}`
    : '';

  const prompt = `Bạn là chuyên gia đánh giá chất lượng truyện dài kỳ tiếng Việt.

Thể loại: ${project.genre || 'unknown'}
Tổng số chương hiện tại: ${chapters.length}
Mục tiêu: ${project.total_planned_chapters || '?'} chương${charContext}

Dưới đây là 5 chương GẦN NHẤT (mỗi chương chỉ 1500 ký tự đầu):

${chapterTexts}

Hãy đánh giá trên thang 1-10 cho 5 tiêu chí:
1. coherence_score: Mạch truyện có logic, cốt truyện rõ ràng
2. continuity_score: Chương sau nối tiếp chương trước tốt (cliffhanger được giải quyết, sự kiện nhất quán)
3. character_consistency_score: Nhân vật nhất quán (tính cách, sức mạnh, trạng thái)
4. progression_score: Truyện có tiến triển, không lặp lại, không đứng yên
5. quality_stability_score: Chất lượng viết ổn định giữa các chương

Thêm:
- risk_level: "high", "medium", hoặc "low"
- key_issues: mảng các vấn đề chính (tiếng Việt, tối đa 5)
- verdict: "pass" hoặc "fail"

Trả lời CHÍNH XÁC bằng JSON:
\`\`\`json
{
  "coherence_score": 8,
  "continuity_score": 7,
  "character_consistency_score": 8,
  "progression_score": 7,
  "quality_stability_score": 8,
  "risk_level": "medium",
  "key_issues": ["vấn đề 1", "vấn đề 2"],
  "verdict": "pass"
}
\`\`\``;

  const response = await callGemini(prompt);
  const scores = parseScores(response);

  if (!scores) {
    console.log(`  Failed to parse AI scores for "${novelTitle}"`);
    return null;
  }

  const overallRisk = scores.risk_level === 'high' || structuralRisk === 'high' ? 'high'
    : scores.risk_level === 'medium' || structuralRisk === 'medium' ? 'medium'
    : 'low';

  return {
    project_id: projectId,
    novel_id: novelId,
    novel_title: novelTitle,
    genre: project.genre || 'unknown',
    current_chapter: project.current_chapter || 0,
    total_planned_chapters: project.total_planned_chapters || 0,
    structural: {
      chapter_count: chapters.length,
      max_chapter: maxChapter,
      gap_count: gapCount,
      first_gap: firstGap,
      missing_summary_count: missingSummaries,
      duplicate_title_count: dupTitles,
      structural_risk: structuralRisk,
    },
    ai: scores,
    overall_risk: overallRisk,
  };
}

async function main() {
  console.log('═'.repeat(80));
  console.log('COHERENCE AUDIT v2 — Post-upgrade comparison');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('═'.repeat(80));

  // Fetch all active projects
  const { data: projects, error } = await supabase
    .from('ai_story_projects')
    .select('id, novel_id, genre, current_chapter, total_planned_chapters, status, novels!ai_story_projects_novel_id_fkey(id, title)')
    .eq('status', 'active')
    .order('current_chapter', { ascending: false });

  if (error || !projects) {
    console.error('Failed to fetch projects:', error?.message);
    return;
  }

  console.log(`\nFound ${projects.length} active projects\n`);

  const results: ProjectAudit[] = [];
  let idx = 0;

  for (const p of projects as any[]) {
    idx++;
    const novel = Array.isArray(p.novels) ? p.novels[0] : p.novels;
    const title = novel?.title || `Project ${p.id.slice(0, 8)}`;
    
    console.log(`[${idx}/${projects.length}] Auditing "${title}" (ch.${p.current_chapter})...`);
    
    const result = await auditProject(p, title);
    if (result) {
      results.push(result);
      const s = result.ai;
      console.log(`  Scores: coh=${s.coherence_score} cont=${s.continuity_score} char=${s.character_consistency_score} prog=${s.progression_score} qual=${s.quality_stability_score} | risk=${s.risk_level}`);
    }

    // Rate limit: 500ms between projects
    await new Promise(r => setTimeout(r, 500));
  }

  // Aggregate
  const n = results.length;
  const avg = (field: keyof Scores) => {
    const vals = results.map(r => Number(r.ai[field]) || 0);
    return vals.length > 0 ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : 0;
  };

  const aggregate = {
    active_projects: n,
    high_risk: results.filter(r => r.overall_risk === 'high').length,
    medium_risk: results.filter(r => r.overall_risk === 'medium').length,
    low_risk: results.filter(r => r.overall_risk === 'low').length,
    avg_scores: {
      coherence: avg('coherence_score'),
      continuity: avg('continuity_score'),
      character_consistency: avg('character_consistency_score'),
      progression: avg('progression_score'),
      quality_stability: avg('quality_stability_score'),
    },
  };

  const highRisk = results.filter(r => r.overall_risk === 'high');

  const output = {
    generated_at: new Date().toISOString(),
    aggregate,
    high_risk_projects: highRisk,
    all_projects: results,
  };

  // Save
  const filename = `logs/coherence-audit-v2-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.mkdirSync('logs', { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(output, null, 2));

  // Print comparison
  console.log('\n' + '═'.repeat(80));
  console.log('RESULTS');
  console.log('═'.repeat(80));
  console.log(`\nProjects audited: ${n}`);
  console.log(`High risk: ${aggregate.high_risk} | Medium: ${aggregate.medium_risk} | Low: ${aggregate.low_risk}`);
  console.log('\nAverage Scores (1-10):');

  // Load baseline for comparison
  const baselineFile = 'logs/coherence-audit-2026-02-16T09-23-08-784Z.json';
  let baseline: any = null;
  try {
    baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf-8'));
  } catch {}

  const metrics = ['coherence', 'continuity', 'character_consistency', 'progression', 'quality_stability'] as const;
  
  for (const m of metrics) {
    const now = aggregate.avg_scores[m];
    const before = baseline?.aggregate?.avg_scores?.[m];
    const diff = before != null ? now - before : null;
    const diffStr = diff != null ? (diff > 0 ? ` (+${diff.toFixed(2)})` : diff < 0 ? ` (${diff.toFixed(2)})` : ' (=)') : '';
    const arrow = diff != null ? (diff > 0 ? ' ^' : diff < 0 ? ' v' : ' =') : '';
    console.log(`  ${m.padEnd(25)} ${now.toFixed(2)}${diffStr}${arrow}`);
  }

  if (baseline) {
    console.log('\n--- Baseline (2026-02-16, pre-upgrade) ---');
    for (const m of metrics) {
      console.log(`  ${m.padEnd(25)} ${baseline.aggregate.avg_scores[m].toFixed(2)}`);
    }
    console.log(`  Projects: ${baseline.aggregate.active_projects} | High risk: ${baseline.aggregate.high_risk}`);
  }

  console.log(`\nSaved to: ${filename}`);
  console.log('═'.repeat(80));
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
