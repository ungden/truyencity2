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
 *   idea          → premise + StoryKernel (prerequisite for world)
 *   world         → world_description với StoryKernel summary + blueprint
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
import { buildSeedBlueprintInstructions, validateSeedStructure } from '../plan/seed-blueprint';
import {
  formatPlaybookForIdeaStage,
  formatPlaybookForWorldStage,
  formatPlaybookForCharacterStage,
  formatPlaybookForDescriptionStage,
  validateWorldHooks,
  validateMcArchetype,
  getGenreSetupPlaybook,
} from '../templates/genre-setup-playbooks';
import { getDopaminePatternsByGenre, GENRE_ANTI_CLICHE, GENRE_TITLE_EXAMPLES } from '../templates';
import { generateMasterOutline } from '../plan/master-outline';
import { generateStoryOutline } from '../plan/story-outline';
import { generateArcPlan } from '../context/generators';
import { DEFAULT_CONFIG, type GeminiConfig, type GenreType, type StoryKernel } from '../types';
import { formatAuthorPatternDnaForSetup } from '../templates/author-pattern-dna';
import {
  assertSetupGate,
  extractMainCharacterNameFromWorld,
  formatSetupGateIssues,
  validateSetupCanon,
} from '../plan/setup-quality-gate';

/**
 * SẢNG VĂN ARCHITECT 2026 — DNA shared across all setup stages. Embed vào
 * systemPrompt mỗi stage để AI INHABIT role thay vì chỉ obey ban-list rules.
 */
const SANG_VAN_DNA = `Bạn là Modern Sảng Văn Architect 2026 — thiết kế webnovel Việt Nam theo chuẩn setup có thể viết dài hơi.

SETUP CONTRACT:

★ Reader promise trước, ban-list sau:
  Mỗi truyện cần một lời hứa đọc cụ thể: reader theo dõi MC tăng trưởng bằng năng lực,
  lựa chọn thông minh, payoff đều, và một domain đủ rõ để chapter 1-20 tự sinh cảnh.

★ Growth engine:
  Premise/frame cảnh xoay quanh "MC chủ động theo đuổi mục tiêu nhỏ → thế giới phản ứng
  hợp lý → MC nhận feedback/payoff → mở mục tiêu kế tiếp". Reader phải cảm thấy MC đang
  đi lên từng bậc, không bị kéo lê bởi khủng hoảng vô danh.

★ Escalation ladder:
  Phase 1 (arc 1-2, ch.1-200) = local domain: phố/chợ/lớp/huyện/tân thủ map.
  Phase 2 (arc 3-5, ch.200-500) = community/city/industry.
  Phase 3 (arc 6-8, ch.500-800) = regional/institutional.
  Phase 4 (arc 9+, ch.800+) = national/world/endgame.
  Mỗi phase phải có goal, milestone cuối phase, antagonist scale, và reader payoff riêng.

★ Attention gradient:
  World ban đầu chỉ biết MC trong phạm vi nhỏ. Người/phe lớn chú ý sau khi MC tạo thành
  tích nhìn thấy ở đúng tầng scale. Setup tốt cho phép "được công nhận" tăng dần.

★ Warm opening:
  Chương 1-5 mở bằng routine + competence + opportunity trong domain nhỏ. Conflict đầu
  truyện là việc làm, khách, nhiệm vụ nhỏ, bài test, deal, hoặc lựa chọn nghề nghiệp.

★ Golden finger as operating model:
  Năng lực/hệ thống phải có trigger, input, output, giới hạn, đường nâng cấp, và kiểu payoff.
  Nó là vòng lặp vận hành của truyện, không phải nút giải quyết mọi vấn đề.

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
  story_bible?: string | null;
  total_planned_chapters?: number | null;
  setup_stage: SetupStage;
  setup_stage_attempts: number;
  novels: { id: string; title: string } | { id: string; title: string }[] | null;
}

export interface IdeaPayload {
  premise: string;
  themes: string[];
  mainConflict: string;
  setupKernel: StoryKernel;
  /** Phase 29: tension axis name picked from playbook (optional, AI returns) */
  tensionAxis?: string;
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
  const update: Record<string, unknown> = {
    setup_stage: next,
    setup_stage_updated_at: new Date().toISOString(),
    setup_stage_error: null,
    setup_stage_attempts: 0,
  };
  if (next === 'ready_to_write') {
    update.status = 'active';
    update.pause_reason = null;
  }
  await getSupabase().from('ai_story_projects').update(update).eq('id', projectId);
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

function getSetupKernelFromOutline(storyOutline: unknown): StoryKernel | undefined {
  if (!storyOutline || typeof storyOutline !== 'object') return undefined;
  const outline = storyOutline as { setupKernel?: StoryKernel; __stage_idea?: { setupKernel?: StoryKernel } };
  return outline.setupKernel || outline.__stage_idea?.setupKernel;
}

function validateStoryKernel(kernel: StoryKernel | undefined): string | null {
  if (!kernel || typeof kernel !== 'object') return 'setupKernel missing';
  if (!kernel.readerFantasy || kernel.readerFantasy.length < 30) return 'setupKernel.readerFantasy too short';
  if (!kernel.protagonistEngine || kernel.protagonistEngine.length < 30) return 'setupKernel.protagonistEngine too short';
  if (!Array.isArray(kernel.pleasureLoop) || kernel.pleasureLoop.length < 4 || kernel.pleasureLoop.length > 6) {
    return 'setupKernel.pleasureLoop must have 4-6 beats';
  }
  if (!kernel.systemMechanic?.input || !kernel.systemMechanic?.output || !kernel.systemMechanic?.limit || !kernel.systemMechanic?.reward) {
    return 'setupKernel.systemMechanic must define input/output/limit/reward';
  }
  if (!kernel.phase1Playground?.locations?.length || !kernel.phase1Playground?.cast?.length || !kernel.phase1Playground?.repeatableSceneTypes?.length) {
    return 'setupKernel.phase1Playground incomplete';
  }
  if (!kernel.socialReactor?.witnesses?.length || !kernel.socialReactor?.reactionModes?.length || !kernel.socialReactor?.reportBackCadence) {
    return 'setupKernel.socialReactor incomplete';
  }
  if (!Array.isArray(kernel.noveltyLadder) || kernel.noveltyLadder.length < 3) return 'setupKernel.noveltyLadder too short';
  if (!kernel.controlRules?.payoffCadence || !kernel.controlRules?.attentionGradient) return 'setupKernel.controlRules incomplete';
  if (!Array.isArray(kernel.patternCards) || kernel.patternCards.length < 3) return 'setupKernel.patternCards must pick at least 3 DNA cards';
  return null;
}

function formatStoryKernelForPrompt(kernel: StoryKernel): string {
  return JSON.stringify(kernel, null, 2);
}

// ── Stage 1: IDEA ──────────────────────────────────────────────────────────
async function runStageIdea(p: ProjectStageRow): Promise<{ success: boolean; error?: string }> {
  const novel = getNovel(p);
  if (!novel) return { success: false, error: 'no novel linked' };
  const genre = (p.genre || 'tien-hiep') as GenreType;

  // Phase 29: thread genre-specific tension axes + dopamine patterns + anti-cliché
  const playbookSection = formatPlaybookForIdeaStage(genre);
  const dopamine = getDopaminePatternsByGenre(genre).slice(0, 5).map(p => p.name).join(', ');
  const antiCliche = (GENRE_ANTI_CLICHE[genre] || []).slice(0, 6).map(c => `- ${c}`).join('\n');
  const patternDna = formatAuthorPatternDnaForSetup();

  const prompt = `Tạo IDEA gốc cho tiểu thuyết.

Tên truyện: "${novel.title}"
Thể loại: ${genre}

${playbookSection}

PATTERN DNA CARDS (chọn 4-6 card phối vào setupKernel.patternCards, không mô phỏng tác giả cụ thể):
${patternDna}

DOPAMINE PATTERNS phải hứa hẹn (premise nên ám chỉ ≥3): ${dopamine}

GENRE ANTI-CLICHÉ — KHÔNG dùng những điều sau:
${antiCliche || '- (không có ban list cho genre này)'}

Trả về JSON:
{
  "premise": "<2-3 câu hook GROWTH-driven: bối cảnh + golden finger CỤ THỂ + opportunity opening; rõ ràng ám chỉ 1 tension axis từ playbook>",
  "setupKernel": {
    "readerFantasy": "<cảm giác sướng chính reader nhận được, cụ thể theo genre/title>",
    "protagonistEngine": "<MC thắng bằng lợi thế gì, tính cách gì, kiểu hành động gì>",
    "pleasureLoop": ["<beat 1>", "<beat 2>", "<beat 3>", "<beat 4>"],
    "systemMechanic": {
      "name": "<tên hệ thống/năng lực/golden finger>",
      "input": "<MC phải đưa gì/làm gì để kích hoạt>",
      "output": "<nó trả về insight/tool/resource gì>",
      "limit": "<giới hạn/cost/cooldown/chống omnipotent>",
      "reward": "<payoff reader thấy được mỗi 1-3 chương>"
    },
    "phase1Playground": {
      "locations": ["<địa điểm local 1>", "<địa điểm local 2>"],
      "cast": ["<người chứng kiến/phản ứng 1>", "<người chứng kiến/phản ứng 2>"],
      "resources": ["<tài nguyên local 1>", "<tài nguyên local 2>"],
      "localAntagonists": ["<đối thủ/cản trở local>"],
      "repeatableSceneTypes": ["<scene type 1>", "<scene type 2>", "<scene type 3>"]
    },
    "socialReactor": {
      "witnesses": ["<ai thấy MC làm được việc>", "<ai lan tin>"],
      "reactionModes": ["<khen/đặt hàng/rank/comment/report>", "<phản ứng thứ 2>"],
      "reportBackCadence": "<mỗi mấy chương thành quả quay lại thành công nhận/cơ hội>"
    },
    "noveltyLadder": [
      {"chapterRange": "1-20", "newToy": "<món/tool/case/map đầu>", "keepsSameLane": "<vì sao vẫn đúng promise>"},
      {"chapterRange": "21-50", "newToy": "<mở rộng kế>", "keepsSameLane": "<vì sao vẫn đúng promise>"},
      {"chapterRange": "51-100", "newToy": "<mở rộng cuối Phase 1>", "keepsSameLane": "<vì sao vẫn đúng promise>"}
    ],
    "controlRules": {
      "payoffCadence": "<payoff nhỏ mỗi 1-3 chương, payoff lớn mỗi sub-arc>",
      "attentionGradient": "<ai chú ý trước/sau theo tầng scale>",
      "openThreadsPerArc": 2,
      "closeThreadsPerArc": 1
    },
    "patternCards": ["smooth_opportunity", "casual_competence", "audience_reaction", "resource_unlock"]
  },
  "themes": ["<theme 1>","<theme 2>","<theme 3>","<theme 4>"],
  "mainConflict": "<1-2 câu — actor Phase 1 LOCAL + stake cá nhân — proactive framing — link với tension axis đã chọn>",
  "tensionAxis": "<tên 1 axis từ list trên>"
}`;

  try {
    const res = await callGemini(prompt, {
      // Phase 29: bumped maxTokens 1024→3072 because Phase 29 idea prompt is larger
      // (playbook tension axes + dopamine + anti-cliche injected). DeepSeek V4 thinking
      // burns reasoning_content tokens before emitting structured `content` — 1024 was
      // truncating the JSON output for half the genres.
      model: 'deepseek-v4-flash', temperature: 0.85, maxTokens: 3072,
      systemPrompt: SANG_VAN_DNA + '\n\n[ROLE-SPECIFIC] Stage: IDEA. Sinh StoryKernel trung tâm cho tiểu thuyết. Không nhồi ban-list; thiết kế reader fantasy + pleasure loop + system mechanic + phase1 playground đủ đẻ 100 chương đầu.',
    }, { jsonMode: true, tracking: { projectId: p.id, task: 'stage_idea' } });

    const parsed = parseJSON<IdeaPayload>(res.content);
    if (!parsed?.premise || parsed.premise.length < 80) {
      const contentLen = (res.content || '').length;
      const preview = (res.content || '').slice(0, 80).replace(/\n/g, ' ');
      return { success: false, error: `idea premise too short (premise=${parsed?.premise?.length || 0}, raw_content=${contentLen}, preview="${preview}")` };
    }
    if (!parsed.themes || parsed.themes.length < 3) {
      return { success: false, error: `idea themes count ${parsed?.themes?.length || 0} < 3` };
    }
    if (!parsed.mainConflict || parsed.mainConflict.length < 20) {
      return { success: false, error: 'idea mainConflict missing/too short' };
    }
    const kernelIssue = validateStoryKernel(parsed.setupKernel);
    if (kernelIssue) return { success: false, error: `idea ${kernelIssue}` };

    // Fix 2: cosmic-threat validator. Reject premises that encode tự ngược pattern.
    // User feedback 2026-05-01: every novel had "thế lực thần bí vùi dập từ đầu".
    const checkText = `${parsed.premise} ${parsed.mainConflict}`;
    const COSMIC_THREAT_PATTERNS: Array<{ regex: RegExp; reason: string }> = [
      { regex: /\bđe dọa\s+(phá hủy|tiêu diệt|xóa sổ)/i, reason: 'cosmic threat: "đe dọa phá hủy"' },
      { regex: /\btru di\s+(tam|cửu)\s+tộc/i, reason: 'cosmic threat: "tru di tam/cửu tộc"' },
      { regex: /\b(xóa sổ|sụp đổ|hủy diệt|phá hủy)\s+(vũ trụ|thế giới|ký ức|làng|đại lục)/i, reason: 'cosmic-scale destruction stake' },
      { regex: /\bsăn lùng\s+(khắp|toàn|cả)\s+(thiên hạ|đại lục|thế giới)/i, reason: 'world-wide manhunt' },
      { regex: /\btrong\s+(\d+|ba|năm|bảy|mười|một)\s+(năm|tháng|ngày)\s+phải/i, reason: 'survival countdown deadline' },
      // Phase 29 v3: removed "thừa tướng" + "hokage" — they often appear legitimately
      // in lich-su / dong-nhan as MC's superior, not antagonist. Kept truly cosmic-tier
      // names. Also require an antagonistic verb / object within ~25 chars to fire.
      { regex: /\b(tối thượng|đại đế|tử thần|trưởng lão ma giáo)\b[^.,;]{0,40}\b(đối đầu|đánh bại|tiêu diệt|hãm hại|thù|truy sát|đe dọa|săn lùng)\b|\b(đối đầu|đánh bại|tiêu diệt|hãm hại|truy sát)\b[^.,;]{0,40}\b(tối thượng|đại đế|tử thần|trưởng lão ma giáo)\b/i, reason: 'cosmic-tier antagonist Phase 1' },
      { regex: /(hao tổn|tiêu hao)\s+(sinh mệnh|tuổi thọ)/i, reason: 'self-imposed countdown / lifespan drain' },
      // Phase 29 hotfix v2: narrow this from any "phải đánh bại" to "phải đánh bại + cosmic-tier target".
      // Was catching legitimate Phase 1 LOCAL business/historical conflicts ("phải đánh bại đối thủ thương mại").
      // Cosmic intent only fires when target is national/cosmic tier within ~30 chars.
      { regex: /\bphải\s+(đánh bại|đối đầu|ngăn chặn|tiêu diệt|chống lại)\s+[^.,;]{0,40}(tối thượng|đại đế|tổ tiên|tử thần|thừa tướng|hoàng đế|vũ trụ|đại lục|toàn quốc|cả thế giới|toàn cầu|ma giáo|thiên đạo)\b/i, reason: 'survival framing "phải đánh bại + cosmic-tier"' },
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
    const tempStash = { __stage_idea: parsed, setupKernel: parsed.setupKernel };
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
  const setupKernel = idea.setupKernel || getSetupKernelFromOutline(p.story_outline);
  const kernelIssue = validateStoryKernel(setupKernel);
  if (kernelIssue) return { success: false, error: `world preflight ${kernelIssue}` };

  const blueprintInstructions = buildSeedBlueprintInstructions(genre);
  // Phase 29: thread playbook hooks (mandatory ≥3 hooks must appear)
  const playbookSection = formatPlaybookForWorldStage(genre);

  const prompt = `Tạo world_description cho tiểu thuyết DỰA TRÊN IDEA đã có.

Tên truyện: "${novel.title}"
Thể loại: ${genre}
Premise: ${idea.premise}
Themes: ${idea.themes.join(', ')}
MainConflict: ${idea.mainConflict}
${idea.tensionAxis ? `TensionAxis: ${idea.tensionAxis}` : ''}

STORY KERNEL (CANON, KHÔNG REWRITE ENGINE — chỉ expand thành world):
${formatStoryKernelForPrompt(setupKernel!)}

${playbookSection}

${blueprintInstructions}

Trả về JSON: {"worldDescription":"<800-1500 từ tuân blueprint 10-section, mở đầu BẮT BUỘC bằng ### STORY KERNEL SUMMARY, BẮT BUỘC inject ≥3 worldbuilding hooks từ playbook>"}`;

  try {
    const res = await callGemini(prompt, {
      model: 'deepseek-v4-flash', temperature: 0.8, maxTokens: 8192,
      systemPrompt: SANG_VAN_DNA + '\n\n[ROLE-SPECIFIC] Stage: WORLD. Build world_description theo StoryKernel + 10-section blueprint. Section đầu là ### STORY KERNEL SUMMARY. World ngây thơ về MC, antagonist Phase 1 LOCAL only.',
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
    const semantic = validateSetupCanon({ worldDescription: wd, setupKernel, strictContract: true });
    if (!semantic.passed) {
      return { success: false, error: `world semantic gate failed: ${formatSetupGateIssues(semantic)}` };
    }

    // Phase 29: validate ≥minHooks worldbuilding hooks from playbook present
    const hookCheck = validateWorldHooks(genre, wd);
    if (!hookCheck.passed) {
      return {
        success: false,
        error: `world hooks insufficient: matched ${hookCheck.matchedCount}/${hookCheck.minRequired} from playbook`,
      };
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
  const worldMc = extractMainCharacterNameFromWorld(wd);
  if (!worldMc) return { success: false, error: 'world protagonist name missing — cannot lock canon MC' };
  const setupKernel = getSetupKernelFromOutline(p.story_outline);
  const kernelIssue = validateStoryKernel(setupKernel);
  if (kernelIssue) return { success: false, error: `character preflight ${kernelIssue}` };

  // Phase 29: thread MC archetype menu — AI picks 1 instead of generic
  const playbookSection = formatPlaybookForCharacterStage(genre);

  const prompt = `Chọn archetype + voice/signature cho MC đã được khóa canon trong world_description.

Tên truyện: "${novel.title}"
Thể loại: ${genre}
MC CANON (KHÔNG ĐỔI TÊN): ${worldMc}

STORY KERNEL (CANON — voice/archetype phải phục vụ engine này):
${formatStoryKernelForPrompt(setupKernel!)}

${playbookSection}

WORLD CONTEXT:
${wd.slice(0, 4000)}

Trả về JSON:
{
  "mcArchetype": "<tên 1 archetype từ playbook list>",
  "mcVoice": "<1-2 câu mô tả voice/personality, paraphrase từ archetype>",
  "mcSignature": "<1 câu signature trait/move của MC>"
}

QUY TẮC: KHÔNG đặt lại tên MC. Archetype CHÍNH XÁC 1 trong list playbook.`;

  try {
    const res = await callGemini(prompt, {
      // Phase 29: bumped 256→1536 because output now includes archetype/voice/signature
      // (was just MC name) + DeepSeek thinking reasoning overhead.
      model: 'deepseek-v4-flash', temperature: 0.9, maxTokens: 1536,
      systemPrompt: SANG_VAN_DNA + '\n\n[ROLE-SPECIFIC] Stage: CHARACTER. Tên MC đã khóa từ world_description; KHÔNG đổi tên. Chỉ chọn archetype/voice/signature từ playbook.',
    }, { jsonMode: true, tracking: { projectId: p.id, task: 'stage_character' } });

    const parsed = parseJSON<{
      mcArchetype?: string;
      mcVoice?: string;
      mcSignature?: string;
    }>(res.content);

    // Phase 29: validate archetype matches playbook list
    const archetypeName = (parsed?.mcArchetype || '').trim();
    if (archetypeName) {
      const archCheck = validateMcArchetype(genre, archetypeName);
      if (!archCheck.passed) {
        return {
          success: false,
          error: `mc archetype "${archetypeName}" not in playbook. Suggested: ${archCheck.suggested.slice(0, 3).join(' / ')}`,
        };
      }
    }

    // Stash archetype + voice + signature in story_outline JSON for downstream stages
    // (existing pattern from idea stage). These feed into character bibles + voice anchor later.
    const existingStash = (p.story_outline as Record<string, unknown> | null) || {};
    await getSupabase().from('ai_story_projects').update({
      main_character: worldMc,
      mc_archetype: archetypeName || null,
      story_outline: {
        ...existingStash,
        __stage_character: {
          name: worldMc,
          archetype: archetypeName || null,
          voice: (parsed?.mcVoice || '').trim() || null,
          signature: (parsed?.mcSignature || '').trim() || null,
        },
      } as unknown as Record<string, unknown>,
    }).eq('id', p.id);
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
  const setupKernel = getSetupKernelFromOutline(p.story_outline);
  const semantic = validateSetupCanon({ worldDescription: wd, mainCharacter: mc, setupKernel });
  if (!semantic.passed) {
    return { success: false, error: `description preflight gate failed: ${formatSetupGateIssues(semantic)}` };
  }

  // Phase 29: thread tension reference + title examples for blurb tone
  const playbookSection = formatPlaybookForDescriptionStage(genre);
  const titleExamples = (GENRE_TITLE_EXAMPLES[genre] || []).slice(0, 5).map(t => `"${t}"`).join(', ');

  const prompt = `Viết giới thiệu/back-cover blurb (description) cho novel detail page.

Tên truyện: "${novel.title}"
Thể loại: ${genre}
MC: ${mc}

${playbookSection}

GENRE TITLE EXAMPLES (tham khảo tone, KHÔNG copy):
${titleExamples}

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
      // Phase 29 v4: 2048→4096 — lich-su hit exact 2048 ceiling repeatedly with
      // playbook content. DeepSeek reasoning overhead eats ~1500 tokens, leaves
      // <600 for 250-400-char blurb output → premature truncation.
      model: 'deepseek-v4-flash', temperature: 0.7, maxTokens: 4096,
      systemPrompt: SANG_VAN_DNA + '\n\n[ROLE-SPECIFIC] Stage: DESCRIPTION. Viết back-cover blurb 3 đoạn 250-400 chữ — hook GROWTH-driven, KHÔNG spoil cuối truyện, KHÔNG cosmic stake Phase 1.',
    }, { jsonMode: true, tracking: { projectId: p.id, task: 'stage_description' } });

    const parsed = parseJSON<{ description?: string }>(res.content);
    const desc = (parsed?.description || '').trim();
    if (desc.length < 200) {
      const contentLen = (res.content || '').length;
      return { success: false, error: `description too short (desc=${desc.length}, raw_content=${contentLen})` };
    }
    const mcCount = (desc.match(new RegExp(mc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    if (mcCount < 2) return { success: false, error: `MC name "${mc}" appears ${mcCount}× (need ≥2)` };
    const paragraphs = desc.split(/\n\n+/).filter(p => p.trim().length > 0);
    if (paragraphs.length < 3) return { success: false, error: `description has ${paragraphs.length} paragraphs (need 3)` };

    // Preserve StoryKernel while clearing temporary stage stash. The kernel is
    // now the one setup artifact downstream stages must expand, not rewrite.
    await getSupabase().from('ai_story_projects').update({
      story_outline: setupKernel ? { setupKernel } as unknown as Record<string, unknown> : null,
    }).eq('id', p.id);
    await getSupabase().from('novels').update({ description: desc }).eq('id', novel.id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function stageConfig(): GeminiConfig {
  return {
    model: DEFAULT_CONFIG.model,
    temperature: 0.3,
    maxTokens: DEFAULT_CONFIG.maxTokens,
  };
}

// ── Stage 5: MASTER OUTLINE ─────────────────────────────────────────────────
async function runStageMasterOutline(p: ProjectStageRow): Promise<{ success: boolean; error?: string }> {
  const novel = getNovel(p);
  if (!novel) return { success: false, error: 'no novel linked' };
  const genre = (p.genre || 'tien-hiep') as GenreType;
  const wd = (p.world_description || '').trim();
  const mc = (p.main_character || '').trim();
  const setupKernel = getSetupKernelFromOutline(p.story_outline);

  try {
    assertSetupGate({ worldDescription: wd, mainCharacter: mc, setupKernel, strictContract: true });
    const outline = await generateMasterOutline(
      p.id,
      novel.title,
      genre,
      wd.slice(0, 6000),
      p.total_planned_chapters || 1000,
      { ...stageConfig(), model: 'deepseek-v4-flash' },
    );
    if (!outline?.majorArcs?.length && !outline?.volumes?.length) {
      return { success: false, error: 'master_outline generation returned no volumes/majorArcs' };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── Stage 6: STORY OUTLINE ──────────────────────────────────────────────────
async function runStageStoryOutline(p: ProjectStageRow): Promise<{ success: boolean; error?: string }> {
  const novel = getNovel(p);
  if (!novel) return { success: false, error: 'no novel linked' };
  const genre = (p.genre || 'tien-hiep') as GenreType;
  const wd = (p.world_description || '').trim();
  const mc = (p.main_character || '').trim();
  const setupKernel = getSetupKernelFromOutline(p.story_outline);

  try {
    assertSetupGate({ worldDescription: wd, mainCharacter: mc, setupKernel, masterOutline: p.master_outline, requireMasterOutline: true, strictContract: true });
    const outline = await generateStoryOutline(
      p.id,
      novel.title,
      genre,
      mc,
      wd,
      p.total_planned_chapters || 1000,
      { ...stageConfig(), model: 'deepseek-v4-flash' },
      setupKernel,
    );
    if (!outline) return { success: false, error: 'story_outline generation returned null' };
    const outlineWithKernel = { ...outline, setupKernel };

    const semantic = validateSetupCanon({
      worldDescription: wd,
      mainCharacter: mc,
      storyOutline: outlineWithKernel,
      setupKernel,
      masterOutline: p.master_outline,
      requireMasterOutline: true,
      requireStoryOutline: true,
      strictContract: true,
    });
    if (!semantic.passed) {
      return { success: false, error: `story_outline gate failed: ${formatSetupGateIssues(semantic)}` };
    }

    await getSupabase()
      .from('ai_story_projects')
      .update({ story_outline: outlineWithKernel as unknown as Record<string, unknown> })
      .eq('id', p.id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── Stage 7: ARC PLAN ───────────────────────────────────────────────────────
async function runStageArcPlan(p: ProjectStageRow): Promise<{ success: boolean; error?: string }> {
  const genre = (p.genre || 'tien-hiep') as GenreType;
  const wd = (p.world_description || '').trim();
  const mc = (p.main_character || '').trim();
  const setupKernel = getSetupKernelFromOutline(p.story_outline);

  try {
    assertSetupGate({
      worldDescription: wd,
      mainCharacter: mc,
      storyOutline: p.story_outline,
      setupKernel,
      masterOutline: p.master_outline,
      requireStoryOutline: true,
      requireMasterOutline: true,
      strictContract: true,
    });

    const outline = p.story_outline as {
      premise?: string;
      mainConflict?: string;
      endingVision?: string;
      protagonist?: { name?: string; startingState?: string; endGoal?: string };
      majorPlotPoints?: Array<{ name?: string; description?: string } | string>;
      setupKernel?: StoryKernel;
    } | null;
    const outlineSynopsis = outline ? [
      outline.premise ? `Premise: ${outline.premise}` : '',
      outline.mainConflict ? `Xung đột: ${outline.mainConflict}` : '',
      outline.protagonist?.name ? `MC: ${outline.protagonist.name} — ${outline.protagonist.startingState || ''}` : '',
      outline.endingVision ? `Kết cục: ${outline.endingVision}` : '',
    ].filter(Boolean).join('\n') : undefined;

    const storyVision = outline ? {
      endingVision: outline.endingVision,
      mainConflict: outline.mainConflict,
      endGoal: outline.protagonist?.endGoal,
      majorPlotPoints: outline.majorPlotPoints
        ?.map(p => typeof p === 'string' ? p : p.description || p.name || JSON.stringify(p))
        ?.slice(0, 6),
      setupKernel,
    } : undefined;

    await generateArcPlan(
      p.id,
      1,
      genre,
      mc,
      outlineSynopsis,
      p.story_bible || undefined,
      p.total_planned_chapters || 1000,
      stageConfig(),
      storyVision,
      wd,
      p.master_outline,
    );
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
  master_outline: runStageMasterOutline,
  story_outline: runStageStoryOutline,
  arc_plan: runStageArcPlan,
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
