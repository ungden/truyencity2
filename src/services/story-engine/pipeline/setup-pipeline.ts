/**
 * Setup Pipeline State Machine — explicit per-stage progression.
 *
 * User feedback: "không được fallback mà phải đi qua đầy đủ các bước".
 *
 * Replaces ad-hoc "regen lump call" với 7 explicit stages, 1 per cron tick.
 * Each stage:
 *   1. Reads project state
 *   2. Calls dedicated AI prompt (focused on that stage only)
 *   3. Validates output (per-stage validator)
 *   4. Advances `setup_stage` ONLY if validation passes
 *   5. On fail → record error + bump attempts; retry next tick
 *
 * NO FALLBACK to defaults. Stage MUST succeed to advance.
 *
 * Stages:
 *   idea          → premise + theme + concept (prerequisite for world)
 *   world         → world_description với 9-section blueprint
 *   character     → main_character + cast roster (uses world for grounding)
 *   description   → novels.description blurb 3-paragraph 250-400 chữ
 *   master_outline → 8-12 arcs × 6-axis
 *   story_outline → cast roster + worldRules + tone + antiTropes
 *   arc_plan      → arc 1 chapter briefs (auto-gen by orchestrator)
 *   ready_to_write → init-write tier picks up
 *   writing       → resume tier
 *   completed     → done
 */

import { getSupabase } from '../utils/supabase';
import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import { buildSeedBlueprintInstructions, validateSeedStructure } from '../seed-blueprint';
import type { GenreType } from '../types';

export type SetupStage =
  | 'idea' | 'world' | 'character' | 'description'
  | 'master_outline' | 'story_outline' | 'arc_plan'
  | 'ready_to_write' | 'writing' | 'completed';

export interface ProjectStageRow {
  id: string;
  novel_id: string;
  genre: string | null;
  main_character: string | null;
  world_description: string | null;
  master_outline: unknown;
  story_outline: unknown;
  setup_stage: SetupStage;
  setup_stage_attempts: number;
  novels: { id: string; title: string } | { id: string; title: string }[] | null;
}

export interface IdeaPayload {
  premise: string;
  themes: string[];
  mainConflict: string;
}

const NEXT_STAGE: Record<SetupStage, SetupStage> = {
  idea: 'world',
  world: 'character',
  character: 'description',
  description: 'master_outline',
  master_outline: 'story_outline',
  story_outline: 'arc_plan',
  arc_plan: 'ready_to_write',
  ready_to_write: 'writing',
  writing: 'completed',
  completed: 'completed',
};

async function advanceStage(projectId: string, currentStage: SetupStage): Promise<void> {
  const next = NEXT_STAGE[currentStage];
  await getSupabase()
    .from('ai_story_projects')
    .update({
      setup_stage: next,
      setup_stage_updated_at: new Date().toISOString(),
      setup_stage_error: null,
      setup_stage_attempts: 0,
    })
    .eq('id', projectId);
}

async function recordStageError(projectId: string, error: string, attempts: number): Promise<void> {
  await getSupabase()
    .from('ai_story_projects')
    .update({
      setup_stage_error: error.slice(0, 500),
      setup_stage_attempts: attempts + 1,
      setup_stage_updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);
}

function getNovel(p: ProjectStageRow): { id: string; title: string } | null {
  return Array.isArray(p.novels) ? p.novels[0] : p.novels;
}

// ── Stage 1: IDEA ──────────────────────────────────────────────────────────
async function runStageIdea(p: ProjectStageRow): Promise<{ success: boolean; error?: string }> {
  const novel = getNovel(p);
  if (!novel) return { success: false, error: 'no novel linked' };
  const genre = (p.genre || 'tien-hiep') as GenreType;

  const prompt = `Tạo IDEA gốc cho tiểu thuyết. Chỉ output premise + themes + mainConflict.

Tên truyện: "${novel.title}"
Thể loại: ${genre}

Trả về JSON:
{
  "premise": "<2-3 câu hook chứa setup + golden finger + stakes opening>",
  "themes": ["<theme 1>","<theme 2>","<theme 3>","<theme 4>"],
  "mainConflict": "<1-2 câu xung đột TRỤC — actor + stake cụ thể>"
}

QUY TẮC:
- premise mention golden finger CỤ THỂ (KHÔNG vague "anh ta nhận sức mạnh kỳ lạ")
- themes 4-6 concrete, KHÔNG generic ("growth", "love", "success" alone)
- mainConflict KHÔNG mở 3 phe đối kháng cùng lúc — TỐI ĐA 1 antagonist arc 1`;

  try {
    const res = await callGemini(prompt, {
      model: 'deepseek-v4-flash', temperature: 0.85, maxTokens: 1024,
      systemPrompt: 'Bạn là Story Concept Architect. CHỈ trả về JSON.',
    }, { jsonMode: true, tracking: { projectId: p.id, task: 'stage_idea' } });

    const parsed = parseJSON<IdeaPayload>(res.content);
    if (!parsed?.premise || parsed.premise.length < 80) {
      return { success: false, error: `idea premise too short (${parsed?.premise?.length || 0})` };
    }
    if (!parsed.themes || parsed.themes.length < 3) {
      return { success: false, error: `idea themes count ${parsed?.themes?.length || 0} < 3` };
    }
    if (!parsed.mainConflict || parsed.mainConflict.length < 20) {
      return { success: false, error: 'idea mainConflict missing/too short' };
    }

    // Stash idea into world_description as a marker until world stage runs
    // OR persist to a temp column. Use story_outline JSON briefly.
    const tempStash = { __stage_idea: parsed };
    await getSupabase().from('ai_story_projects').update({
      story_outline: tempStash as unknown as Record<string, unknown>,
    }).eq('id', p.id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── Stage 2: WORLD ─────────────────────────────────────────────────────────
async function runStageWorld(p: ProjectStageRow): Promise<{ success: boolean; error?: string }> {
  const novel = getNovel(p);
  if (!novel) return { success: false, error: 'no novel linked' };
  const genre = (p.genre || 'tien-hiep') as GenreType;
  const idea = (p.story_outline as { __stage_idea?: IdeaPayload } | null)?.__stage_idea;
  if (!idea) return { success: false, error: 'idea stage output missing — re-run idea' };

  const blueprintInstructions = buildSeedBlueprintInstructions(genre);
  const prompt = `Tạo world_description cho tiểu thuyết DỰA TRÊN IDEA đã có.

Tên truyện: "${novel.title}"
Thể loại: ${genre}
Premise: ${idea.premise}
Themes: ${idea.themes.join(', ')}
MainConflict: ${idea.mainConflict}

${blueprintInstructions}

Trả về JSON: {"worldDescription":"<800-1500 từ tuân blueprint 9-section>"}`;

  try {
    const res = await callGemini(prompt, {
      model: 'deepseek-v4-flash', temperature: 0.8, maxTokens: 8192,
      systemPrompt: 'Bạn là Worldbuilder. CHỈ trả về JSON với field worldDescription.',
    }, { jsonMode: true, tracking: { projectId: p.id, task: 'stage_world' } });

    const parsed = parseJSON<{ worldDescription?: string }>(res.content);
    const wd = (parsed?.worldDescription || '').trim();
    if (wd.length < 500) {
      return { success: false, error: `world too short (${wd.length} chars, need ≥500)` };
    }
    const validation = validateSeedStructure(wd);
    if (!validation.passed) {
      return { success: false, error: `world blueprint score ${validation.score}/100 — issues: ${validation.issues.slice(0, 3).join('; ')}` };
    }

    await getSupabase().from('ai_story_projects').update({
      world_description: wd,
    }).eq('id', p.id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── Stage 3: CHARACTER ─────────────────────────────────────────────────────
async function runStageCharacter(p: ProjectStageRow): Promise<{ success: boolean; error?: string }> {
  const novel = getNovel(p);
  if (!novel) return { success: false, error: 'no novel linked' };
  const genre = (p.genre || 'tien-hiep') as GenreType;
  const wd = (p.world_description || '').trim();
  if (wd.length < 500) return { success: false, error: 'world stage incomplete — cannot derive character' };

  const prompt = `Đặt tên MC + xác nhận character sheet dựa trên world_description.

Tên truyện: "${novel.title}"
Thể loại: ${genre}

WORLD CONTEXT:
${wd.slice(0, 4000)}

Trả về JSON:
{"mainCharacter":"<họ + tên đầy đủ tiếng Việt 2-3 chữ — đa dạng, KHÔNG dùng cliché Lâm Phong/Lê Minh/Trần Vũ/Trần Hạo/Lý Phong/Lăng Thiên>"}

QUY TẮC: tên phù hợp genre + bối cảnh; phải 2-3 từ Vietnamese hoặc Hán-Việt.`;

  try {
    const res = await callGemini(prompt, {
      model: 'deepseek-v4-flash', temperature: 0.9, maxTokens: 256,
      systemPrompt: 'Bạn là Character Architect. CHỈ trả về JSON.',
    }, { jsonMode: true, tracking: { projectId: p.id, task: 'stage_character' } });

    const parsed = parseJSON<{ mainCharacter?: string }>(res.content);
    const mc = (parsed?.mainCharacter || '').trim();
    if (mc.length < 2 || mc.split(/\s+/).length > 4) {
      return { success: false, error: `mc invalid (length ${mc.length}, words ${mc.split(/\s+/).length})` };
    }
    const cliches = ['Lâm Phong', 'Lê Minh', 'Trần Vũ', 'Trần Hạo', 'Lý Phong', 'Lăng Thiên'];
    if (cliches.some(c => mc === c)) {
      return { success: false, error: `mc is cliché name "${mc}" — must regen` };
    }

    await getSupabase().from('ai_story_projects').update({ main_character: mc }).eq('id', p.id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── Stage 4: DESCRIPTION ───────────────────────────────────────────────────
async function runStageDescription(p: ProjectStageRow): Promise<{ success: boolean; error?: string }> {
  const novel = getNovel(p);
  if (!novel) return { success: false, error: 'no novel linked' };
  const genre = (p.genre || 'tien-hiep') as GenreType;
  const wd = (p.world_description || '').trim();
  const mc = (p.main_character || '').trim();
  if (wd.length < 500 || mc.length < 2) return { success: false, error: 'world/character incomplete' };

  const prompt = `Viết giới thiệu/back-cover blurb (description) cho novel detail page.

Tên truyện: "${novel.title}"
Thể loại: ${genre}
MC: ${mc}

WORLD:
${wd.slice(0, 4000)}

Trả về JSON: {"description":"<3-đoạn 250-400 chữ tiếng Việt CÓ DẤU>"}

CẤU TRÚC:
- Đoạn 1 (60-90 chữ): Hook bối cảnh + tình huống bất thường, MC tên đầy đủ
- Đoạn 2 (70-120 chữ): Tease năng lực + xung đột + mục tiêu (KHÔNG spoil cuối)
- Đoạn 3 (40-90 chữ): Closing hook khiến reader muốn đọc

QUY TẮC:
- Tên "${mc}" PHẢI xuất hiện ≥2 lần
- KHÔNG dùng từ kỹ thuật engine: MC, Bàn Tay Vàng, Hệ thống X, Sảng văn, vả mặt, BOM, engine
- 3 đoạn phân cách bằng \\n\\n trong JSON string`;

  try {
    const res = await callGemini(prompt, {
      model: 'deepseek-v4-flash', temperature: 0.7, maxTokens: 1024,
      systemPrompt: 'Bạn là Marketing Copy Writer. CHỈ trả về JSON.',
    }, { jsonMode: true, tracking: { projectId: p.id, task: 'stage_description' } });

    const parsed = parseJSON<{ description?: string }>(res.content);
    const desc = (parsed?.description || '').trim();
    if (desc.length < 200) return { success: false, error: `description too short (${desc.length} chars)` };
    const mcCount = (desc.match(new RegExp(mc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    if (mcCount < 2) return { success: false, error: `MC name "${mc}" appears ${mcCount}× (need ≥2)` };
    const paragraphs = desc.split(/\n\n+/).filter(p => p.trim().length > 0);
    if (paragraphs.length < 3) return { success: false, error: `description has ${paragraphs.length} paragraphs (need 3)` };

    await getSupabase().from('novels').update({ description: desc }).eq('id', novel.id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── Stage Handler dispatch ─────────────────────────────────────────────────
type StageHandler = (p: ProjectStageRow) => Promise<{ success: boolean; error?: string }>;

const STAGE_HANDLERS: Partial<Record<SetupStage, StageHandler>> = {
  idea: runStageIdea,
  world: runStageWorld,
  character: runStageCharacter,
  description: runStageDescription,
  // master_outline / story_outline / arc_plan handled by existing modules — this orchestrator
  // calls them but each is its own stage (advances state on success).
};

/**
 * Run ONE stage for a project. Caller invokes this per cron tick.
 * Returns true if stage advanced; false if stage failed (will retry next tick).
 */
export async function runOneStage(p: ProjectStageRow): Promise<boolean> {
  const handler = STAGE_HANDLERS[p.setup_stage];
  if (!handler) return false; // Unknown stage — caller fallback

  // Hard fail after N attempts to prevent infinite retry storms.
  const MAX_ATTEMPTS = 5;
  if (p.setup_stage_attempts >= MAX_ATTEMPTS) {
    await getSupabase()
      .from('ai_story_projects')
      .update({
        status: 'paused',
        pause_reason: `setup_stage ${p.setup_stage} failed ${MAX_ATTEMPTS}× — admin investigate`,
        paused_at: new Date().toISOString(),
      })
      .eq('id', p.id);
    return false;
  }

  const result = await handler(p);
  if (result.success) {
    await advanceStage(p.id, p.setup_stage);
    return true;
  } else {
    await recordStageError(p.id, result.error || 'unknown', p.setup_stage_attempts);
    return false;
  }
}
