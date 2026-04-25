/**
 * DeepSeek V4 vs Gemini — Quality & Cost Experiment
 *
 * Creates 3 novels (same genre + MC seed), runs 20 chapters each with different
 * model routing configs. Outputs a markdown report with cost/quality breakdown.
 *
 * Usage:
 *   npx tsx scripts/test-deepseek-v4.ts              # 20 chapters, 3 variants
 *   npx tsx scripts/test-deepseek-v4.ts --chapters 2 # smoke test
 *   npx tsx scripts/test-deepseek-v4.ts --variants pro,hybrid
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load env from the main project (one level up from worktree)
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });

// Override + explicit DeepSeek key
process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-ef7b0c18ca9d4270921ddabc191a19c3';
process.env.DEBUG_ROUTING = '1'; // Always enable routing debug for this test

const REQUIRED = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GEMINI_API_KEY', 'DEEPSEEK_API_KEY'];
for (const k of REQUIRED) {
  if (!process.env[k]) {
    console.error(`Missing env: ${k}`);
    process.exit(1);
  }
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { writeOneChapter } from '@/services/story-engine/pipeline/orchestrator';
import { generateMasterOutline } from '@/services/story-engine/pipeline/master-outline';
import { callGemini } from '@/services/story-engine/utils/gemini';
import { parseJSON } from '@/services/story-engine/utils/json-repair';
import type { GeminiConfig, GenreType, StoryOutline } from '@/services/story-engine/types';

const supabase: SupabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// ── CLI Args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function arg(name: string, def: string): string {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : def;
}

const NUM_CHAPTERS = Number(arg('chapters', '20'));
const VARIANTS_ARG = arg('variants', 'pro,flash,hybrid');
const GENRE: GenreType = arg('genre', 'tien-hiep') as GenreType;
const TOTAL_PLANNED = Number(arg('total', '1500'));

// ── Routing Configs ──────────────────────────────────────────────────────────

type Variant = 'pro' | 'flash' | 'hybrid' | 'gemini';

// All task names used in the pipeline
const ALL_TASKS = [
  'master_outline', 'story_outline', 'story_bible', 'synopsis', 'arc_plan',
  'architect', 'writer', 'writer_continuation', 'critic', 'auto_revision',
  'chapter_summary', 'combined_summary', 'character_knowledge', 'character_arc',
  'power_system', 'voice_fingerprint', 'world_expansion', 'location_bible',
  'pacing', 'foreshadowing', 'plot_tracker',
];

const HYBRID_PRO_TASKS = new Set([
  'master_outline', 'story_outline', 'story_bible', 'synopsis', 'arc_plan',
  'architect', 'critic', 'auto_revision',
]);

function buildRouting(variant: Variant): Record<string, string> {
  const routing: Record<string, string> = {};
  for (const task of ALL_TASKS) {
    if (variant === 'pro') routing[task] = 'deepseek-v4-pro';
    else if (variant === 'flash') routing[task] = 'deepseek-v4-flash';
    else if (variant === 'hybrid') {
      routing[task] = HYBRID_PRO_TASKS.has(task) ? 'deepseek-v4-pro' : 'deepseek-v4-flash';
    }
    // 'gemini' = no routing (empty = falls through to Gemini default)
  }
  return routing;
}

function setRouting(variant: Variant): void {
  if (variant === 'gemini') {
    (globalThis as { __MODEL_ROUTING__?: Record<string, string> }).__MODEL_ROUTING__ = undefined;
  } else {
    (globalThis as { __MODEL_ROUTING__?: Record<string, string> }).__MODEL_ROUTING__ = buildRouting(variant);
  }
}

// ── Test Seed ────────────────────────────────────────────────────────────────

const TEST_SEED = {
  title_base: 'Thí Nghiệm Nghịch Thiên',
  main_character: 'Lâm Thiên',
  world_description: `Một thiếu niên phàm nhân tại Thanh Hà Thôn vô tình nhặt được mảnh ngọc bí ẩn phát ra linh khí, trong đó ẩn chứa tàn hồn của một Tu Chân Giả thượng cổ. Từ đây, Lâm Thiên bước trên con đường nghịch thiên tu tiên, đối mặt với các đại gia tộc, tông môn và bí mật về Thiên Đạo.

Thế giới tu tiên chia làm các cảnh giới: Luyện Khí → Trúc Cơ → Kim Đan → Nguyên Anh → Hóa Thần → Luyện Hư → Hợp Thể → Đại Thừa → Độ Kiếp → Tiên Nhân. Hệ thống có linh căn (Kim/Mộc/Thủy/Hỏa/Thổ), công pháp phân cấp (Phàm/Hoàng/Huyền/Địa/Thiên/Tiên), và pháp bảo phân cấp tương tự.`,
  genre: GENRE,
  topic: 'Tu tiên nghịch thiên từ phàm nhân',
};

// ── DB Setup ─────────────────────────────────────────────────────────────────

async function getOrCreateOwner(): Promise<string> {
  const { data } = await supabase.from('profiles').select('id').limit(1).single();
  if (!data?.id) throw new Error('No owner profile found');
  return data.id;
}

async function createNovelAndProject(variant: Variant, ownerId: string): Promise<{ projectId: string; novelId: string }> {
  const timestamp = Date.now();
  const slug = `test-${variant}-${timestamp}`;
  const title = `[TEST ${variant.toUpperCase()} ${timestamp}] ${TEST_SEED.title_base}`;

  const { data: novel, error: novelErr } = await supabase.from('novels').insert({
    title,
    slug,
    author: 'Truyện City',
    description: `[EXPERIMENT — ${variant}] ${TEST_SEED.world_description.slice(0, 300)}`,
    genres: [TEST_SEED.genre],
    status: 'ongoing',
  }).select('id').single();

  if (novelErr || !novel) throw new Error(`Novel insert failed: ${novelErr?.message}`);

  const { data: project, error: projErr } = await supabase.from('ai_story_projects').insert({
    novel_id: novel.id,
    user_id: ownerId,
    genre: TEST_SEED.genre,
    main_character: TEST_SEED.main_character,
    world_description: TEST_SEED.world_description,
    total_planned_chapters: TOTAL_PLANNED,
    current_chapter: 0,
    status: 'paused', // Prevent Vercel cron from racing with local run

    temperature: 0.75,
    target_chapter_length: 2800,
    ai_model: 'gemini-3-flash-preview',
  }).select('id').single();

  if (projErr || !project) throw new Error(`Project insert failed: ${projErr?.message}`);

  return { projectId: project.id, novelId: novel.id };
}

async function seedStoryOutline(projectId: string, title: string): Promise<void> {
  // Generate story outline using variant's routing
  const targetArcs = Math.ceil(TOTAL_PLANNED / 20);
  const prompt = `Tạo dàn ý tổng thể cho truyện:

TITLE: ${title}
GENRE: ${TEST_SEED.genre}
PROTAGONIST: ${TEST_SEED.main_character}
PREMISE: ${TEST_SEED.world_description.slice(0, 500)}

TARGET: ${TOTAL_PLANNED} chương, ${targetArcs} arcs

Trả về JSON:
{
  "id": "story_${Date.now()}",
  "title": "${title}",
  "genre": "${TEST_SEED.genre}",
  "premise": "Mô tả premise 2-3 câu hấp dẫn",
  "themes": ["theme1", "theme2", "theme3"],
  "mainConflict": "Xung đột chính xuyên suốt truyện",
  "targetChapters": ${TOTAL_PLANNED},
  "protagonist": {
    "name": "${TEST_SEED.main_character}",
    "startingState": "Trạng thái ban đầu",
    "endGoal": "Mục tiêu cuối cùng",
    "characterArc": "Hành trình phát triển"
  },
  "majorPlotPoints": [
    {"chapter": 1, "event": "Khởi đầu"},
    {"chapter": ${Math.ceil(TOTAL_PLANNED * 0.2)}, "event": "Rising Action 1"},
    {"chapter": ${Math.ceil(TOTAL_PLANNED / 2)}, "event": "Midpoint"},
    {"chapter": ${Math.ceil(TOTAL_PLANNED * 0.7)}, "event": "Rising Action 2"},
    {"chapter": ${TOTAL_PLANNED - 20}, "event": "Climax"},
    {"chapter": ${TOTAL_PLANNED}, "event": "Resolution"}
  ],
  "endingVision": "Kết thúc như thế nào",
  "uniqueHooks": ["Hook 1", "Hook 2", "Hook 3"]
}`;

  const res = await callGemini(prompt, {
    model: 'gemini-3-flash-preview',
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: 'Bạn là STORY ARCHITECT. CHỈ trả về JSON, không thêm text.',
  }, { jsonMode: true, tracking: { projectId, task: 'story_outline' } });

  const outline = parseJSON<StoryOutline>(res.content);
  if (!outline) throw new Error('Failed to parse story_outline');

  await supabase.from('ai_story_projects')
    .update({ story_outline: outline as unknown as Record<string, unknown> })
    .eq('id', projectId);
}

// ── Cost Tracking ────────────────────────────────────────────────────────────

async function getCostReport(projectId: string): Promise<{
  total: number;
  byTask: Record<string, { cost: number; inputTokens: number; outputTokens: number; calls: number; model: string }>;
  byModel: Record<string, { cost: number; calls: number }>;
}> {
  const { data } = await supabase.from('cost_tracking')
    .select('task,model,input_tokens,output_tokens,cost')
    .eq('project_id', projectId);

  const byTask: Record<string, { cost: number; inputTokens: number; outputTokens: number; calls: number; model: string }> = {};
  const byModel: Record<string, { cost: number; calls: number }> = {};
  let total = 0;

  for (const row of data || []) {
    const task = row.task as string;
    const model = row.model as string;
    const cost = Number(row.cost) || 0;
    const input = Number(row.input_tokens) || 0;
    const output = Number(row.output_tokens) || 0;

    total += cost;

    byTask[task] ??= { cost: 0, inputTokens: 0, outputTokens: 0, calls: 0, model };
    byTask[task].cost += cost;
    byTask[task].inputTokens += input;
    byTask[task].outputTokens += output;
    byTask[task].calls += 1;

    byModel[model] ??= { cost: 0, calls: 0 };
    byModel[model].cost += cost;
    byModel[model].calls += 1;
  }

  return { total, byTask, byModel };
}

// ── Quality Signals ──────────────────────────────────────────────────────────

async function getQualitySignals(projectId: string, novelId: string): Promise<{
  avgWordCount: number;
  avgQualityScore: number;
  chapters: Array<{ num: number; title: string; words: number; firstLine: string }>;
}> {
  const { data: chapters } = await supabase.from('chapters')
    .select('chapter_number,title,content')
    .eq('novel_id', novelId)
    .order('chapter_number');

  if (!chapters) return { avgWordCount: 0, avgQualityScore: 0, chapters: [] };

  const chapterInfo = chapters.map(c => {
    const content = (c.content as string) || '';
    const words = content.split(/\s+/).filter(Boolean).length;
    const firstLine = content.split('\n').find(l => l.trim())?.slice(0, 120) || '';
    return { num: c.chapter_number as number, title: c.title as string, words, firstLine };
  });

  const avgWordCount = chapterInfo.reduce((s, c) => s + c.words, 0) / (chapterInfo.length || 1);

  // Quality score from summaries table (if Critic ran)
  const { data: sums } = await supabase.from('chapter_summaries')
    .select('quality_score')
    .eq('project_id', projectId);
  const scores = (sums || []).map(s => Number(s.quality_score) || 0).filter(s => s > 0);
  const avgQualityScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  return { avgWordCount, avgQualityScore, chapters: chapterInfo };
}

// ── Main ─────────────────────────────────────────────────────────────────────

interface VariantResult {
  variant: Variant;
  projectId: string;
  novelId: string;
  chaptersWritten: number;
  totalDuration: number;
  errors: string[];
  cost: Awaited<ReturnType<typeof getCostReport>>;
  quality: Awaited<ReturnType<typeof getQualitySignals>>;
}

async function runVariant(variant: Variant, ownerId: string): Promise<VariantResult> {
  const t0 = Date.now();
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`▶ VARIANT: ${variant.toUpperCase()}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  setRouting(variant);

  const { projectId, novelId } = await createNovelAndProject(variant, ownerId);
  console.log(`  Project: ${projectId}`);
  console.log(`  Novel:   ${novelId}`);

  const errors: string[] = [];

  // Pre-seed story outline + master outline using this variant's routing
  try {
    console.log(`  → Generating story_outline...`);
    await seedStoryOutline(projectId, `[TEST ${variant.toUpperCase()}] ${TEST_SEED.title_base}`);

    console.log(`  → Generating master_outline...`);
    const geminiConfig: GeminiConfig = { model: 'gemini-3-flash-preview', temperature: 0.7, maxTokens: 2048 };
    await generateMasterOutline(projectId, TEST_SEED.title_base, TEST_SEED.genre, TEST_SEED.world_description, TOTAL_PLANNED, geminiConfig);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`  ✗ Outline gen failed: ${msg}`);
    errors.push(`outline: ${msg}`);
  }

  // Write chapters
  let chaptersWritten = 0;
  for (let i = 1; i <= NUM_CHAPTERS; i++) {
    const tc0 = Date.now();
    try {
      const result = await writeOneChapter({ projectId });
      const tc1 = Date.now();
      console.log(`  ✓ Ch.${result.chapterNumber}: "${result.title}" — ${result.wordCount}w, Q${result.qualityScore}, ${Math.round((tc1 - tc0) / 1000)}s`);
      chaptersWritten++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ✗ Ch.${i} FAILED: ${msg.slice(0, 200)}`);
      errors.push(`ch.${i}: ${msg.slice(0, 200)}`);
      // Continue with next chapter — don't abort variant
    }
  }

  // Wait a bit for async cost_tracking inserts to flush
  await new Promise(r => setTimeout(r, 3000));

  const cost = await getCostReport(projectId);
  const quality = await getQualitySignals(projectId, novelId);

  return {
    variant,
    projectId,
    novelId,
    chaptersWritten,
    totalDuration: Date.now() - t0,
    errors,
    cost,
    quality,
  };
}

// ── Report ───────────────────────────────────────────────────────────────────

function formatMoney(n: number): string {
  return `$${n.toFixed(4)}`;
}

function buildReport(results: VariantResult[]): string {
  const lines: string[] = [];
  lines.push(`# DeepSeek V4 vs Gemini — Experiment Report`);
  lines.push(``);
  lines.push(`**Run**: ${new Date().toISOString()}`);
  lines.push(`**Genre**: ${GENRE}`);
  lines.push(`**MC**: ${TEST_SEED.main_character}`);
  lines.push(`**Chapters per variant**: ${NUM_CHAPTERS}`);
  lines.push(`**Total planned**: ${TOTAL_PLANNED}`);
  lines.push(``);
  lines.push(`## Summary`);
  lines.push(``);
  lines.push(`| Variant | Chapters | Total $ | $/chapter | Avg words | Avg quality | Duration | Errors |`);
  lines.push(`|---------|----------|---------|-----------|-----------|-------------|----------|--------|`);
  for (const r of results) {
    const costPerCh = r.chaptersWritten > 0 ? r.cost.total / r.chaptersWritten : 0;
    lines.push(`| **${r.variant}** | ${r.chaptersWritten}/${NUM_CHAPTERS} | ${formatMoney(r.cost.total)} | ${formatMoney(costPerCh)} | ${Math.round(r.quality.avgWordCount)} | ${r.quality.avgQualityScore.toFixed(1)} | ${Math.round(r.totalDuration / 1000)}s | ${r.errors.length} |`);
  }
  lines.push(``);

  for (const r of results) {
    lines.push(`## ${r.variant.toUpperCase()} — project ${r.projectId}`);
    lines.push(``);
    lines.push(`**Novel ID**: ${r.novelId}`);
    lines.push(`**Chapters**: ${r.chaptersWritten}/${NUM_CHAPTERS}`);
    lines.push(`**Total cost**: ${formatMoney(r.cost.total)}`);
    lines.push(`**Duration**: ${Math.round(r.totalDuration / 1000)}s`);
    lines.push(``);

    lines.push(`### Cost by model`);
    lines.push(``);
    lines.push(`| Model | Calls | Cost |`);
    lines.push(`|-------|-------|------|`);
    for (const [model, m] of Object.entries(r.cost.byModel).sort((a, b) => b[1].cost - a[1].cost)) {
      lines.push(`| ${model} | ${m.calls} | ${formatMoney(m.cost)} |`);
    }
    lines.push(``);

    lines.push(`### Cost by task`);
    lines.push(``);
    lines.push(`| Task | Model | Calls | Input tok | Output tok | Cost | $/call |`);
    lines.push(`|------|-------|-------|-----------|------------|------|--------|`);
    for (const [task, t] of Object.entries(r.cost.byTask).sort((a, b) => b[1].cost - a[1].cost)) {
      lines.push(`| ${task} | ${t.model} | ${t.calls} | ${t.inputTokens} | ${t.outputTokens} | ${formatMoney(t.cost)} | ${formatMoney(t.calls > 0 ? t.cost / t.calls : 0)} |`);
    }
    lines.push(``);

    lines.push(`### Chapters written`);
    lines.push(``);
    lines.push(`| # | Title | Words | First line |`);
    lines.push(`|---|-------|-------|------------|`);
    for (const c of r.quality.chapters) {
      lines.push(`| ${c.num} | ${c.title.replace(/\|/g, '\\|')} | ${c.words} | ${c.firstLine.replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`);
    }
    lines.push(``);

    if (r.errors.length > 0) {
      lines.push(`### Errors`);
      for (const err of r.errors) lines.push(`- ${err}`);
      lines.push(``);
    }
  }

  lines.push(`## Read chapters on web`);
  lines.push(``);
  for (const r of results) {
    lines.push(`- **${r.variant}**: https://truyencity.com/truyen/test-${r.variant}-* (or query novels table for slug)`);
  }
  lines.push(``);

  return lines.join('\n');
}

// ── Entry ────────────────────────────────────────────────────────────────────

async function main() {
  const variantList = VARIANTS_ARG.split(',').map(v => v.trim()) as Variant[];
  console.log(`🔬 DeepSeek V4 Experiment`);
  console.log(`   Variants: ${variantList.join(', ')}`);
  console.log(`   Chapters: ${NUM_CHAPTERS}`);
  console.log(`   Genre:    ${GENRE}`);

  const ownerId = await getOrCreateOwner();
  const results: VariantResult[] = [];

  for (const v of variantList) {
    try {
      const r = await runVariant(v, ownerId);
      results.push(r);
    } catch (e) {
      console.error(`Variant ${v} fatally failed:`, e);
    }
  }

  const report = buildReport(results);
  const reportPath = path.join(process.cwd(), `deepseek-experiment-report-${Date.now()}.md`);
  fs.writeFileSync(reportPath, report);

  console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✓ Report: ${reportPath}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log();
  console.log(report);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
