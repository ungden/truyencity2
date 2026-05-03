/**
 * Derive `story_outline.setupKernel` for published novels that lack it.
 *
 * Context:
 *   Commit 9267a60 ("Guard chapter writes behind story kernel") removed the
 *   orchestrator self-healing that silently regenerated story_outline without
 *   keeping its setupKernel. Projects whose story_outline was wiped before that
 *   commit and then auto-healed now have chapters but no kernel — orchestrator
 *   throws PUBLISHED_SETUP_KERNEL_MISSING for them every cron tick. The cron
 *   pauses them on first throw; this script derives a kernel from existing
 *   canon (world_description + MC + first chapter summaries + remaining
 *   story_outline) and resumes the project.
 *
 * Usage:
 *   ./node_modules/.bin/tsx scripts/backfill-setup-kernels.ts                # all eligible
 *   ./node_modules/.bin/tsx scripts/backfill-setup-kernels.ts <projectId>     # single project
 *   ./node_modules/.bin/tsx scripts/backfill-setup-kernels.ts --limit=10      # cap
 *   ./node_modules/.bin/tsx scripts/backfill-setup-kernels.ts --dry-run       # no DB writes
 *
 * Cost: 1 DeepSeek V4 Flash call per project (~$0.002).
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { callGemini } from '@/services/story-engine/utils/gemini';
import { parseJSON } from '@/services/story-engine/utils/json-repair';
import { hasValidSetupKernel } from '@/services/story-engine/pipeline/setup-kernel-guards';
import type { StoryKernel } from '@/services/story-engine/types';

dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });

const SINGLE_PROJECT = process.argv.slice(2).find(a => !a.startsWith('--'));
const LIMIT = Number(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || 100);
const DRY_RUN = process.argv.includes('--dry-run');
const CONCURRENCY = Math.max(1, Number(process.argv.find(a => a.startsWith('--concurrency='))?.split('=')[1] || 1));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const db = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface ProjectRow {
  id: string;
  novel_id: string;
  genre: string | null;
  main_character: string | null;
  world_description: string | null;
  story_outline: unknown;
  current_chapter: number | null;
  status: string | null;
  pause_reason: string | null;
  novels?: { title?: string | null } | { title?: string | null }[] | null;
}

interface ChapterSummaryRow {
  chapter_number: number;
  title: string | null;
  summary: string | null;
  cliffhanger: string | null;
}

function novelTitle(row: ProjectRow): string {
  const n = Array.isArray(row.novels) ? row.novels[0] : row.novels;
  return n?.title || '(untitled)';
}

function buildDerivePrompt(args: {
  title: string;
  genre: string;
  mc: string;
  worldDescription: string;
  storyOutlineWithoutKernel: unknown;
  summaries: ChapterSummaryRow[];
}): string {
  const { title, genre, mc, worldDescription, storyOutlineWithoutKernel, summaries } = args;
  const summaryBlock = summaries.slice(0, 8).map(s =>
    `Ch ${s.chapter_number}${s.title ? ` — ${s.title}` : ''}: ${s.summary || '(no summary)'}${s.cliffhanger ? ` || cliffhanger: ${s.cliffhanger}` : ''}`,
  ).join('\n');

  return `Bạn là editor đang khai quật (REVERSE-ENGINEER) StoryKernel cho một tiểu thuyết ĐÃ ĐANG VIẾT.
KHÔNG được tái thiết kế. Phải DERIVE kernel từ canon đã chạy: world, MC, story_outline còn lại, và các chapter_summaries đầu.

Truyện: "${title}"
Genre: ${genre}
MC: ${mc}

WORLD (canon đã viết, KHÔNG REWRITE):
${worldDescription.slice(0, 4000)}

STORY OUTLINE (canon đã viết, không có setupKernel cũ):
${JSON.stringify(storyOutlineWithoutKernel, null, 2).slice(0, 6000)}

CHAPTER SUMMARIES (bằng chứng pleasure loop và dopamine pattern thực tế):
${summaryBlock || '(no summaries available)'}

Yêu cầu output:
- Mọi field phải PHẢN ÁNH canon trên — không thêm cốt mới, không đổi tone, không đổi MC.
- pleasureLoop: 4-6 beats — quan sát từ chapter_summaries (MC làm gì → world phản hồi gì → recognition/insight).
- systemMechanic: nếu story đã có golden finger / system / ability cụ thể trong outline hoặc summaries thì dùng đúng tên đó. Nếu MC không có golden finger rõ ràng, dùng "competence engine" trừu tượng (vd "tay nghề + quan sát" với input/output/limit phản ánh hành động lặp lại trong summaries).
- phase1Playground.locations / cast / repeatableSceneTypes: lấy từ địa điểm và nhân vật xuất hiện trong các summaries đầu.
- socialReactor.witnesses + reactionModes: ai chứng kiến + phản ứng kiểu gì trong summaries.
- noveltyLadder: 3 hàng cho 1-20, 21-50, 51-100 — newToy phải là điểm mở rộng đã hoặc sẽ xuất hiện theo storyOutline.
- patternCards: 3-6 pattern reflective. Examples: smooth_opportunity, casual_competence, audience_reaction, resource_unlock, knowledge_leverage, business_pivot, peaceful_growth, insider_advantage.

Output JSON DUY NHẤT (không markdown, không comment):
{
  "setupKernel": {
    "readerFantasy": "<2-3 câu — cảm giác sướng chính reader nhận từ truyện này, derived từ summaries>",
    "protagonistEngine": "<2-3 câu — MC thắng bằng gì, derived từ MC actions trong summaries>",
    "pleasureLoop": ["<beat 1>", "<beat 2>", "<beat 3>", "<beat 4>"],
    "systemMechanic": {
      "name": "<tên hệ thống/competence/golden finger derived>",
      "input": "<MC làm gì để kích hoạt>",
      "output": "<nó trả về cái gì>",
      "limit": "<giới hạn tự nhiên — đếm số lần / cooldown / chi phí>",
      "reward": "<payoff reader thấy mỗi 1-3 chương>"
    },
    "phase1Playground": {
      "locations": ["<location 1>", "<location 2>"],
      "cast": ["<recurring NPC 1>", "<recurring NPC 2>"],
      "resources": ["<resource 1>", "<resource 2>"],
      "localAntagonists": ["<đối thủ local 1>"],
      "repeatableSceneTypes": ["<scene type 1>", "<scene type 2>", "<scene type 3>"]
    },
    "socialReactor": {
      "witnesses": ["<witness 1>", "<witness 2>"],
      "reactionModes": ["<reaction mode 1>", "<reaction mode 2>"],
      "reportBackCadence": "<mỗi mấy chương có người mang công nhận/cơ hội mới quay lại>"
    },
    "noveltyLadder": [
      {"chapterRange": "1-20", "newToy": "<new toy ch 1-20 từ summaries>", "keepsSameLane": "<vì sao vẫn đúng promise>"},
      {"chapterRange": "21-50", "newToy": "<derived next toy>", "keepsSameLane": "<vì sao vẫn đúng promise>"},
      {"chapterRange": "51-100", "newToy": "<derived next toy>", "keepsSameLane": "<vì sao vẫn đúng promise>"}
    ],
    "controlRules": {
      "payoffCadence": "payoff nhỏ mỗi 1-3 chương",
      "attentionGradient": "<derived: ai chú ý trước, ai sau>",
      "openThreadsPerArc": 2,
      "closeThreadsPerArc": 1
    },
    "patternCards": ["<card 1>", "<card 2>", "<card 3>", "<card 4>"]
  }
}`;
}

async function deriveKernelForProject(row: ProjectRow): Promise<{ ok: boolean; reason?: string; kernel?: StoryKernel }> {
  const title = novelTitle(row);
  const genre = row.genre || 'tien-hiep';
  const mc = (row.main_character || '').trim();
  const wd = (row.world_description || '').trim();

  if (!mc) return { ok: false, reason: 'main_character empty — fix MC first' };
  if (wd.length < 200) return { ok: false, reason: `world_description too short (${wd.length})` };

  const outlineCopy = row.story_outline && typeof row.story_outline === 'object'
    ? { ...(row.story_outline as Record<string, unknown>) }
    : null;
  if (outlineCopy) delete outlineCopy.setupKernel;
  if (!outlineCopy || Object.keys(outlineCopy).length === 0) {
    return { ok: false, reason: 'story_outline empty — backfill canon first via outline regen' };
  }

  const { data: summaries } = await db
    .from('chapter_summaries')
    .select('chapter_number,title,summary,cliffhanger')
    .eq('project_id', row.id)
    .order('chapter_number', { ascending: true })
    .limit(8);

  const prompt = buildDerivePrompt({
    title,
    genre,
    mc,
    worldDescription: wd,
    storyOutlineWithoutKernel: outlineCopy,
    summaries: (summaries || []) as ChapterSummaryRow[],
  });

  const res = await callGemini(prompt, {
    model: 'deepseek-v4-flash',
    temperature: 0.5,
    // 4096 truncated mid-JSON for ~2% of novels (DeepSeek V4 thinking model
    // burns reasoning_content before emitting structured output). 8192 gives
    // headroom without meaningfully bumping cost.
    maxTokens: 8192,
    systemPrompt: '[ROLE-SPECIFIC] Derive StoryKernel from EXISTING canon. Reverse-engineer only. Do NOT invent new plot, do NOT change MC, do NOT change tone. Output MUST include all required fields per the schema, including socialReactor.witnesses/reactionModes/reportBackCadence and at least 3 noveltyLadder rows.',
  }, { jsonMode: true, tracking: { projectId: row.id, task: 'backfill_setup_kernel' } });

  const parsed = parseJSON<{ setupKernel?: StoryKernel }>(res.content);
  if (!parsed?.setupKernel) {
    return { ok: false, reason: `model returned no setupKernel (raw=${(res.content || '').slice(0, 120).replace(/\n/g, ' ')})` };
  }
  if (!hasValidSetupKernel({ setupKernel: parsed.setupKernel })) {
    return { ok: false, reason: 'derived setupKernel failed hasValidSetupKernel checks' };
  }
  return { ok: true, kernel: parsed.setupKernel };
}

async function patchKernelIntoProject(row: ProjectRow, kernel: StoryKernel): Promise<void> {
  const merged = row.story_outline && typeof row.story_outline === 'object'
    ? { ...(row.story_outline as Record<string, unknown>), setupKernel: kernel }
    : { setupKernel: kernel };

  const update: Record<string, unknown> = {
    story_outline: merged,
    updated_at: new Date().toISOString(),
  };

  // Auto-resume only if the project was paused specifically for kernel-missing.
  // Other pause reasons (cost cap, circuit breaker, outline revision) need
  // their own resolution path — leave them paused for human decision.
  if (row.status === 'paused' && row.pause_reason?.startsWith('setup_kernel_missing_manual_review')) {
    update.status = 'active';
    update.pause_reason = null;
  }

  const { error } = await db.from('ai_story_projects').update(update).eq('id', row.id);
  if (error) throw error;
}

async function main(): Promise<void> {
  console.log(`[backfill-setup-kernels] mode=${DRY_RUN ? 'DRY RUN' : 'APPLY'} ${SINGLE_PROJECT ? `project=${SINGLE_PROJECT}` : `limit=${LIMIT}`}`);

  let query = db
    .from('ai_story_projects')
    .select('id,novel_id,genre,main_character,world_description,story_outline,current_chapter,status,pause_reason,novels!ai_story_projects_novel_id_fkey(title)')
    .gt('current_chapter', 0)
    .not('story_outline', 'is', null)
    .order('current_chapter', { ascending: false })
    .limit(LIMIT);

  if (SINGLE_PROJECT) {
    query = db
      .from('ai_story_projects')
      .select('id,novel_id,genre,main_character,world_description,story_outline,current_chapter,status,pause_reason,novels!ai_story_projects_novel_id_fkey(title)')
      .eq('id', SINGLE_PROJECT);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data || []) as ProjectRow[];
  const candidates = rows.filter(r => !hasValidSetupKernel(r.story_outline));

  console.log(`Scanned ${rows.length} project(s); ${candidates.length} missing valid setupKernel.`);

  let derived = 0;
  let patched = 0;
  let failed = 0;
  const failures: Array<{ id: string; title: string; reason: string }> = [];

  async function processRow(row: ProjectRow): Promise<void> {
    const title = novelTitle(row);
    const tag = `${row.id.slice(0, 8)} "${title}" ch=${row.current_chapter}`;
    try {
      const result = await deriveKernelForProject(row);
      if (!result.ok || !result.kernel) {
        failed += 1;
        failures.push({ id: row.id, title, reason: result.reason || 'unknown' });
        console.warn(`[skip] ${tag} — ${result.reason}`);
        return;
      }
      derived += 1;
      if (DRY_RUN) {
        console.log(`[dry-run] ${tag} — would patch kernel (readerFantasy="${result.kernel.readerFantasy.slice(0, 60)}…")`);
        return;
      }
      await patchKernelIntoProject(row, result.kernel);
      patched += 1;
      console.log(`[ok] ${tag} — kernel patched${row.status === 'paused' && row.pause_reason?.startsWith('setup_kernel_missing_manual_review') ? ' + resumed' : ''}`);
    } catch (e) {
      failed += 1;
      const reason = e instanceof Error ? e.message : String(e);
      failures.push({ id: row.id, title, reason });
      console.error(`[fail] ${tag} — ${reason}`);
    }
  }

  // Concurrency-limited workers: pull from a shared queue index. Avoids
  // 6-hour serial runs without bursting beyond CONCURRENCY parallel calls.
  let cursor = 0;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < candidates.length) {
      const idx = cursor++;
      await processRow(candidates[idx]);
    }
  });
  await Promise.all(workers);

  console.log(`\nSummary: candidates=${candidates.length} derived=${derived} patched=${patched} failed=${failed}`);
  if (failures.length > 0) {
    console.log('\nFailures:');
    for (const f of failures.slice(0, 20)) {
      console.log(`  - ${f.id} "${f.title}" — ${f.reason.slice(0, 200)}`);
    }
    if (failures.length > 20) console.log(`  … and ${failures.length - 20} more`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
