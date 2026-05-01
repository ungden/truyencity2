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

/**
 * SẢNG VĂN ARCHITECT 2026 — DNA shared across all setup stages. Embed vào
 * systemPrompt mỗi stage để AI INHABIT role thay vì chỉ obey ban-list rules.
 */
const SANG_VAN_DNA = `Bạn là Modern Sảng Văn Architect 2026 — chuyên thiết kế webnovel Việt Nam theo chuẩn TQ contemporary (詭秘之主, 大奉打更人, 學霸的黑科技系統 era).

PHILOSOPHY (DNA bắt buộc):

★ GROWTH > SURVIVAL: truyện kể MC ĐI LÊN, KHÔNG kể MC CHẠY TRỐN.
  Reader THỎA MÃN khi MC thắng, KHÔNG bồn chồn lo MC sống/chết.
  → mọi premise/conflict/scene frame "MC theo đuổi X gặp Y phản ứng",
    KHÔNG "MC phải sống sót khỏi X".

★ ANTAGONIST PROGRESSION LADDER (vượt qua tân thủ → maps lớn dần):
  Phase 1 (arc 1-2, ch.1-200)   = TÂN THỦ MAP — LOCAL (hàng xóm/đồng nghiệp/chợ/sư huynh)
  Phase 2 (arc 3-5, ch.200-500) = HUYỆN/CITY — mid-tier (kinh doanh huyện/quan huyện)
  Phase 3 (arc 6-8, ch.500-800) = TỈNH/NATIONAL — institutional (tập đoàn lớn/sect chính)
  Phase 4 (arc 9+, ch.800+)     = COSMIC/WORLD — endgame ONLY (Đại Đế/AI Tối Thượng/Tổ Tiên)
  KHÔNG NHẢY CÓC. Cosmic-tier (Tối Thượng/Đại Đế/Tổ Tiên/Thừa Tướng/Hokage advisor/
  AI Tối Thượng/Trưởng Lão Ma Giáo/Tử Thần) CHỈ unlock từ Phase 3-4.
  ARC 1 KHÔNG mention những entities này.

★ STAKE LADDER:
  Phase 1 = CÁ NHÂN (tiền/sự nghiệp/tình cảm/danh dự nhỏ)
  Phase 2 = GIA ĐÌNH/COMMUNITY → Phase 3 = REGION → Phase 4 = QUỐC GIA/VŨ TRỤ
  Phase 1 BANNED: "sụp đổ vũ trụ", "xóa sổ ký ức", "tru di tam tộc",
  "diệt thế giới", "săn lùng khắp thiên hạ", "trong N năm phải", "hao tổn sinh mệnh".

★ WORLD ngây thơ: MC trọng sinh/xuyên không DUY NHẤT, không cluster. Tổ chức/phe
  notice MC CHỈ sau thành tựu visible (≥arc 2).

★ WARM BASELINE 5 chương đầu: MC routine trong domain nhỏ, ZERO active threat.

★ TRỌNG SINH: framing "nắm cơ hội kiếp trước bỏ lỡ" (proactive), KHÔNG "báo thù
  kẻ hãm hại" (reactive vendetta).

OUTPUT: CHỈ trả về JSON hợp lệ với fields được yêu cầu.`;

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

  const prompt = `Tạo IDEA gốc cho tiểu thuyết.

Tên truyện: "${novel.title}"
Thể loại: ${genre}

Trả về JSON:
{
  "premise": "<2-3 câu hook GROWTH-driven: bối cảnh + golden finger CỤ THỂ + opportunity opening>",
  "themes": ["<theme 1>","<theme 2>","<theme 3>","<theme 4>"],
  "mainConflict": "<1-2 câu — actor Phase 1 LOCAL + stake cá nhân — proactive framing>"
}`;

  try {
    const res = await callGemini(prompt, {
      model: 'deepseek-v4-flash', temperature: 0.85, maxTokens: 1024,
      systemPrompt: SANG_VAN_DNA + '\n\n[ROLE-SPECIFIC] Stage: IDEA. Output premise + themes + mainConflict cho tiểu thuyết. premise GROWTH-driven. mainConflict actor LOCAL Phase 1. Cosmic-tier antagonist deferred Phase 3+.',
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

    // Fix 2: cosmic-threat validator. Reject premises that encode tự ngược pattern.
    // User feedback 2026-05-01: every novel had "thế lực thần bí vùi dập từ đầu".
    const checkText = `${parsed.premise} ${parsed.mainConflict}`;
    const COSMIC_THREAT_PATTERNS: Array<{ regex: RegExp; reason: string }> = [
      { regex: /\bđe dọa\s+(phá hủy|tiêu diệt|xóa sổ)/i, reason: 'cosmic threat: "đe dọa phá hủy"' },
      { regex: /\btru di\s+(tam|cửu)\s+tộc/i, reason: 'cosmic threat: "tru di tam/cửu tộc"' },
      { regex: /\b(xóa sổ|sụp đổ|hủy diệt|phá hủy)\s+(vũ trụ|thế giới|ký ức|làng|đại lục)/i, reason: 'cosmic-scale destruction stake' },
      { regex: /\bsăn lùng\s+(khắp|toàn|cả)\s+(thiên hạ|đại lục|thế giới)/i, reason: 'world-wide manhunt' },
      { regex: /\btrong\s+(\d+|ba|năm|bảy|mười|một)\s+(năm|tháng|ngày)\s+phải/i, reason: 'survival countdown deadline' },
      { regex: /\b(tối thượng|cố vấn tối cao|đại đế|tử thần|trưởng lão ma giáo|thừa tướng|hokage)\b/i, reason: 'cosmic/national-tier antagonist Phase 1' },
      { regex: /(hao tổn|tiêu hao)\s+(sinh mệnh|tuổi thọ)/i, reason: 'self-imposed countdown / lifespan drain' },
      { regex: /\bphải\s+(đánh bại|đối đầu|ngăn chặn|tiêu diệt|chống lại)\b/i, reason: 'survival framing "phải đánh bại"' },
      { regex: /\b(tập đoàn|công ty)\s+(độc quyền|thống trị)\s+(toàn quốc|cả nước|thị trường)/i, reason: 'monopoly-scale antagonist Phase 1' },
    ];
    const violations: string[] = [];
    for (const p of COSMIC_THREAT_PATTERNS) {
      if (p.regex.test(checkText)) violations.push(p.reason);
    }
    if (violations.length > 0) {
      return {
        success: false,
        error: `tự-ngược violations (${violations.length}): ${violations.slice(0, 3).join('; ')}`,
      };
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
      systemPrompt: SANG_VAN_DNA + '\n\n[ROLE-SPECIFIC] Stage: WORLD. Build world_description theo 9-section blueprint. World ngây thơ về MC, antagonist Phase 1 LOCAL only.',
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
      systemPrompt: SANG_VAN_DNA + '\n\n[ROLE-SPECIFIC] Stage: CHARACTER. Đặt tên MC đa dạng phù hợp genre + bối cảnh. KHÔNG dùng cliché names.',
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
      systemPrompt: SANG_VAN_DNA + '\n\n[ROLE-SPECIFIC] Stage: DESCRIPTION. Viết back-cover blurb 3 đoạn 250-400 chữ — hook GROWTH-driven, KHÔNG spoil cuối truyện, KHÔNG cosmic stake Phase 1.',
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
