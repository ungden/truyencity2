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
import { detectOriginContradiction } from '../plan/origin-guard';
import { generateStoryOutline } from '../plan/story-outline';
import { generateArcPlan } from '../context/generators';
import { runTopicPositioning } from '../plan/topic-positioning';
import { spawnSetupCanon } from '../plan/setup-canon-spawn';
import { runFoundationReview, persistFoundationReview } from '../quality/foundation-reviewer';
import { formatGenreContractReport, validateGenreSetupContract } from '../quality/genre-contract-validator';
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

★ MC OPENING IDENTITY TIER (HARD CAP — Sảng văn 2026 cross-genre):
  MC ở chương 1 PHẢI ở identity tier "established competent in domain":
  - Đệ tử nội môn / chủ tiệm / công tử nhỏ / nhân viên có vị trí ổn định
  - Võ giả với kỹ năng đã thiết lập / shop owner / studio operator
  - Professional (luật sư / bác sĩ / kỹ sư) / chủ doanh nghiệp nhỏ
  - Tướng quân / quan chức cấp dưới / freelancer có client base
  Golden finger active từ TRƯỚC story start, KHÔNG phải "vừa awakening ở chương 1".

  CẤM identity tier "rock bottom" (cross-genre — 2024-2026 đã từ chối "凄惨开局"):
  - Phế vật / "tên phế vật" / đệ tử ngoại môn nhặt rác / cuốc xẻng / lao động bậc thấp
  - Nô lệ / tù binh / ăn xin / "lão ăn mày" / vô gia cư
  - "MC từ con số 0" / "MC tự lực bootstrap từ phế vật / nhặt rác"
  - "Fake phế vật" CŨNG vi phạm scene 1-3 — dù MC giấu thực lực, KHÔNG được tả MC nhặt rác / cuốc xẻng / "lão ăn mày" trong scene đầu. Reveal-of-power phải xảy ra scene 1-2.
  - Modern genres (do-thi/quan-truong/khoa-huyen): cấm MC nghèo đói ngập đầu, mất việc + đói lả, nợ nần ngập đầu, sống lay lắt, ngất xỉu/amnesia ở chương 1.

  CARVE-OUT EXEMPTION duy nhất: dong-nhan với canon-locked entry tại sự kiện đẫm máu (Đấu La phế vật của Tang Sansan, Naruto Cửu Vĩ Attack…). Trường hợp đó MC vẫn PHẢI: golden finger ACTIVE scene 1, đạt 1 small win scene 1-2, voice tỉnh táo/tính toán không whining.

  Reason: Reader bỏ trong 3 chương đầu nếu MC mở chương ở rock-bottom — kể cả "fake phế vật" pattern. Sảng văn = MC dominance từ scene 1, KHÔNG underdog rise.

★ MC secret + benefit logic:
  Trọng sinh/hệ thống/bàn tay vàng là bí mật lớn nhất của MC. Người ngoài chỉ thấy kết quả,
  không ai biết nguồn gốc trong Phase 1-2. MC chỉ can thiệp chuyện ngoài khi có lợi ích
  rõ: tài nguyên, tiền, thông tin, quan hệ, uy tín, skill, hoặc bảo vệ circle đã thiết lập.

  BẮT BUỘC THIẾT LẬP VỎ BỌC (COVER STORY) CHO MC:
  Tại setup, AI phải thiết lập một "coverStory" (vỏ bọc thực tế) để giải thích cho năng lực
  phi thường của MC. Ví dụ: "được thế ngoại cao nhân truyền dạy", "kỳ ngộ nhặt được cổ thư/đan dược",
  "ngộ tính thiên tài tự giác ngộ", "mắt nhìn nhạy bén bẩm sinh". MC tuyệt đối KHÔNG bao giờ thừa nhận
  thân phận xuyên việt/hệ thống/bàn tay vàng với bất kỳ ai, kể cả người thân. NPCs chỉ được phép
  biết về vỏ bọc này và xem MC là thiên tài xuất sắc, tuyệt đối không nghi ngờ siêu nhiên.

  ĐỒNG NHÂN (FANFICTION) — THIẾT LẬP LỘ TRÌNH CANON & CALLBACK:
  Setup cho truyện Đồng Nhân PHẢI xác định rõ: tác phẩm gốc, mốc thời gian bắt đầu, tuyến cốt truyện (route),
  danh sách các nhân vật canon chính, và ít nhất 5 sự kiện canon kinh điển mà MC biết trước sẽ diễn ra.
  Mô tả rõ cách MC dùng 'biết trước kịch bản' (meta-knowledge) để nẫng tay trên cơ duyên hoặc tránh nguy hiểm.
  Thế giới và kịch bản chương phải liên tục có các đoạn MC hồi tưởng/so sánh/đối chiếu với nguyên tác gốc
  để gợi nhớ lại hồi ức cho độc giả, tạo cảm giác thỏa mãn khi MC thay đổi cốt truyện gốc theo hướng có lợi.

  KIM THỦ CHỈ / BÓI TOÁN / HỆ THỐNG — IM LẶNG GIẤU TÀI:
  Đối với các thể loại huyền học (bói toán/quẻ bói), hệ thống chế tạo, hoặc các bàn tay vàng khác,
  mục tiêu hàng đầu là giúp MC nhanh chóng thu thập tài nguyên và phát triển trong âm thầm ("im lặng giấu tài").
  CẤM thiết lập MC làm từ thiện công ích vô ích, bày sạp bói toán ngoài đường, bói miễn phí/giá rẻ cho người lạ.
  MC chỉ bói toán/cung cấp thông tin trong bóng tối hoặc giao dịch với các khách hàng có tầm ảnh hưởng lớn
  (đại gia, KOL, quyền thế) để đổi lấy tài nguyên lớn, sự bảo hộ hoặc cổ phần thế lực lớn.
  Xung đột chỉ xuất hiện thỉnh thoảng để làm bàn đạp cho MC vả mặt thế lực coi thường mình, còn lại MC tập trung
  tích lũy tài nguyên cá nhân và củng cố thế lực riêng.

OUTPUT: CHỈ trả về JSON hợp lệ với fields được yêu cầu.`;

export type SetupStage =
  | 'idea' | 'world' | 'character' | 'description'
  | 'master_outline' | 'story_outline'
  | 'canon_spawn'     // Phase S — modular canon (factions / world / power / foreshadowing / twists / themes / voice)
  | 'arc_plan'
  | 'arc_approval'    // Human-in-the-Loop gate — pause for admin to review arc plan before proceeding
  | 'foundation_review' // Phase S — scored 14-dim review, loop on fail
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
  style_directives?: Record<string, unknown> | null;
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
  story_outline: 'canon_spawn',
  canon_spawn: 'arc_plan',
  arc_plan: 'arc_approval',
  arc_approval: 'foundation_review',
  foundation_review: 'ready_to_write',
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

/**
 * Cascade-deletes all generated setup artifacts on database tables and resets
 * project fields when a project setup is rewound to an earlier stage.
 * Prevent stale, mismatched context (e.g. old characters, locations, timelines)
 * from polluting the prompt context of subsequent regenerated stages.
 */
async function cleanupStageArtifacts(projectId: string, rewindToStage: SetupStage): Promise<void> {
  const db = getSupabase();

  // Define which tables to clear based on the target rewind stage.
  // When rewinding to a stage, we delete all artifacts produced by that stage and any stage AFTER it.
  const tablesToClear: string[] = [];

  const SETUP_STAGES_ORDER: SetupStage[] = [
    'idea', 'world', 'character', 'description', 'master_outline', 
    'story_outline', 'canon_spawn', 'arc_plan', 'arc_approval', 'foundation_review'
  ];

  const currentStageIndex = SETUP_STAGES_ORDER.indexOf(rewindToStage);
  if (currentStageIndex === -1) return;

  // Map tables to their producing stages
  const stageTables: Record<string, string[]> = {
    world: ['world_locations', 'location_bibles'],
    character: ['character_states', 'character_arcs', 'character_signature_traits', 'voice_fingerprints', 'voice_anchors', 'mc_power_states'],
    master_outline: ['volume_summaries'],
    story_outline: ['plot_threads', 'story_memory_chunks'],
    canon_spawn: ['foreshadowing_plans', 'pacing_blueprints'],
    arc_plan: ['arc_plans'],
    foundation_review: ['first_10_evaluations', 'chapter_blueprints', 'failed_memory_tasks']
  };

  // Identify all tables that belong to stages >= rewindToStage
  for (let i = currentStageIndex; i < SETUP_STAGES_ORDER.length; i++) {
    const stage = SETUP_STAGES_ORDER[i];
    const tables = stageTables[stage];
    if (tables) {
      tablesToClear.push(...tables);
    }
  }

  // Also include general tables if rewinding back to idea
  if (rewindToStage === 'idea') {
    tablesToClear.push(
      'character_states', 'character_arcs', 'character_signature_traits',
      'foreshadowing_plans', 'pacing_blueprints', 'voice_fingerprints', 'voice_anchors',
      'mc_power_states', 'world_locations', 'location_bibles', 'story_memory_chunks',
      'plot_threads', 'volume_summaries', 'failed_memory_tasks', 'chapter_blueprints',
      'arc_plans'
    );
  }

  // Deduplicate table list
  const uniqueTables = [...new Set(tablesToClear)];

  console.log(`[cleanup] Rewound to stage "${rewindToStage}". Cleaning up ${uniqueTables.length} tables for project ${projectId.slice(0, 8)}...`);

  // Delete records from Supabase in parallel
  const deletePromises = uniqueTables.map(async (table) => {
    try {
      await db.from(table).delete().eq('project_id', projectId);
    } catch (e) {
      console.warn(`  [cleanup-warn] failed to clear table ${table}:`, e instanceof Error ? e.message : String(e));
    }
  });

  await Promise.all(deletePromises);

  // 2. Reset fields in ai_story_projects record
  const resetFields: Record<string, unknown> = {};
  
  if (currentStageIndex <= SETUP_STAGES_ORDER.indexOf('world')) {
    resetFields.world_description = null;
    resetFields.worldbuilding_canon = null;
    resetFields.power_system_canon = null;
    resetFields.cultivation_system = null;
    resetFields.magic_system = null;
    resetFields.martial_arts_system = null;
    resetFields.apocalypse_type = null;
    resetFields.supernatural_system = null;
    resetFields.political_system = null;
    resetFields.world_system = null;
    resetFields.romance_type = null;
    resetFields.game_system = null;
  }
  if (currentStageIndex <= SETUP_STAGES_ORDER.indexOf('character')) {
    resetFields.main_character = null;
  }
  if (currentStageIndex <= SETUP_STAGES_ORDER.indexOf('master_outline')) {
    resetFields.master_outline = null;
  }
  if (currentStageIndex <= SETUP_STAGES_ORDER.indexOf('story_outline')) {
    resetFields.story_outline = null;
    resetFields.story_bible = null;
  }

  if (Object.keys(resetFields).length > 0) {
    try {
      await db.from('ai_story_projects').update(resetFields).eq('id', projectId);
      console.log(`  ✓ reset ${Object.keys(resetFields).join(', ')} on ai_story_projects`);
    } catch (e) {
      console.error(`  [cleanup-error] failed to update project record:`, e instanceof Error ? e.message : String(e));
    }
  }

  // 3. Delete written chapters if any exist (since we are rewinding to setup)
  try {
    const { data: proj } = await db.from('ai_story_projects').select('novel_id').eq('id', projectId).maybeSingle();
    const novelId = proj?.novel_id;
    if (novelId) {
      const { error } = await db.from('chapters').delete().eq('novel_id', novelId);
      if (!error) console.log(`  ✓ deleted all chapters for novel ${novelId}`);
    }
  } catch (e) {
    // ignore
  }
}

/**
 * Validate MC opening identity tier against Sảng văn 2026 hard cap.
 * Reject "rock-bottom" patterns (phế vật / nhặt rác / cuốc xẻng / ăn mày /
 * nô lệ / tù binh / "từ con số 0") cross-genre. Carve-out: dong-nhan only.
 *
 * Wired into both world stage (scanning worldDescription) and character
 * stage (scanning mcArchetype + mcVoice + mcSignature).
 */
function validateMcOpeningIdentityTier(
  text: string,
  genre: GenreType,
  mcName?: string,
): { passed: boolean; reason?: string } {
  // dong-nhan exemption — canon-locked entries (Đấu La phế vật, Naruto Cửu Vĩ)
  // legitimately require MC entry at adverse event. Architect rule C3 still
  // requires golden finger active + small win + tỉnh táo voice for these.
  if (genre === 'dong-nhan') return { passed: true };

  const escapedMc = mcName ? mcName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
  const mcRefs = ['mc', 'nam chính', 'nhân vật chính', 'chủ nhân', 'hắn', 'y', 'ta', 'đế'];
  if (escapedMc) mcRefs.push(escapedMc.toLowerCase());
  const mcRefPattern = `(?:${mcRefs.join('|')})`;

  const FORBIDDEN_PATTERNS: Array<{ re: RegExp; label: string }> = [
    { re: new RegExp(`${mcRefPattern}\\s*(?:vốn\\s+là|bị\\s+coi\\s+là|chỉ\\s+là|là\\s+một)?\\s*phế\\s+vật`, 'i'), label: '"phế vật" identity' },
    { re: new RegExp(`${mcRefPattern}\\s*(?:vốn\\s+là|bị\\s+coi\\s+là|chỉ\\s+là|là\\s+một)?\\s*đệ\\s+tử\\s+ngoại\\s+môn\\s+(?:nhặt|cuốc|làm\\s+thuê|lao\\s+động|dọn\\s+dẹp)`, 'i'), label: '"đệ tử ngoại môn nhặt rác/lao động" pattern' },
    { re: new RegExp(`${mcRefPattern}\\s*(?:phải|chuyên)?\\s*(?:nhặt\\s+rác|cuốc\\s+xẻng|nhặt\\s+phế\\s+liệu)`, 'i'), label: 'menial labor MC opening' },
    { re: new RegExp(`${mcRefPattern}\\s*(?:vốn\\s+là|bị\\s+coi\\s+là|chỉ\\s+là|là\\s+một|sống\\s+như|trở\\s+thành)?\\s*(?:nô\\s+lệ|tù\\s+binh|ăn\\s+xin|ăn\\s+mày|lão\\s+ăn\\s+mày)`, 'i'), label: 'slave/beggar identity' },
    { re: new RegExp(`${mcRefPattern}\\s*.{0,40}(?:từ\\s+con\\s+số\\s+0|bootstrap\\s+từ|tự\\s+lực\\s+từ\\s+phế|đi\\s+lên\\s+từ\\s+phế)`, 'i'), label: '"từ con số 0" trajectory' },
    { re: new RegExp(`${mcRefPattern}\\s*.{0,40}(?:nghèo\\s+đói\\s+ngập\\s+đầu|mất\\s+việc\\s+đói\\s+lả|nợ\\s+nần\\s+ngập\\s+đầu|vô\\s+gia\\s+cư|sống\\s+lay\\s+lắt)`, 'i'), label: 'modern genre rock-bottom (do-thi/khoa-huyen)' },
    { re: new RegExp(`${mcRefPattern}\\s*.{0,40}(?:amnesia|mất\\s+trí\\s+nhớ|ngất\\s+xỉu)\\s+(?:ở|tại)\\s+(?:chương\\s+1|đầu\\s+truyện|scene\\s+1)`, 'i'), label: 'amnesia/faint opening' },
  ];

  for (const { re, label } of FORBIDDEN_PATTERNS) {
    const m = text.match(re);
    if (m) {
      return {
        passed: false,
        reason: `MC identity vi phạm Sảng văn 2026 "rock-bottom" hard cap: ${label} (matched "${m[0]}"). Identity phải "established competent": chủ tiệm/đệ tử nội môn/công tử/professional/võ giả với kỹ năng thiết lập. Regenerate stage này — chọn archetype khác từ playbook.`,
      };
    }
  }
  return { passed: true };
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
  if (!kernel.mcSecret?.secret || !kernel.mcSecret?.outsideWorldKnowledge || !kernel.mcSecret?.revealRule || !kernel.mcSecret?.coverStory) {
    return 'setupKernel.mcSecret must define secret/outsideWorldKnowledge/revealRule/coverStory';
  }
  if (kernel.mcSecret.coverStory.length < 15) {
    return 'setupKernel.mcSecret.coverStory too short (must be >= 15 chars)';
  }
  if (!kernel.benefitLoop?.goal || !kernel.benefitLoop?.action || !kernel.benefitLoop?.benefit || !kernel.benefitLoop?.cadence) {
    return 'setupKernel.benefitLoop must define goal/action/benefit/cadence';
  }
  if (!kernel.interventionRule || kernel.interventionRule.length < 30) {
    return 'setupKernel.interventionRule too short';
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

  // Phase S — run topic positioning if not already done. Stores
  // benchmarks + differentiation contract + reader expectations into
  // style_directives.positioning. Subsequent IDEA prompt injects.
  try {
    const { data: existingRow } = await getSupabase()
      .from('ai_story_projects')
      .select('style_directives')
      .eq('id', p.id)
      .maybeSingle();
    const styleDir = (existingRow?.style_directives as Record<string, unknown>) || {};
    if (!styleDir.positioning) {
      await runTopicPositioning(
        {
          projectId: p.id,
          genre,
          subGenres: (existingRow as { sub_genres?: string[] })?.sub_genres,
          targetChapters: p.total_planned_chapters || 1000,
          userHint: novel.title,
        },
        stageConfig(),
      );
    }
  } catch (e) {
    console.warn(
      `[setup-pipeline] topic positioning threw for ${p.id}:`,
      e instanceof Error ? e.message : String(e),
    );
    // Non-fatal — IDEA stage continues without positioning context
  }

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
    "mcOrigin": "<CHỐT 1 LẦN — gốc gác MC, mọi stage sau PHẢI tuân: native (người bản địa, KHÔNG xuyên không/trọng sinh) | transmigrator (xuyên không từ thế giới khác) | reincarnated (trọng sinh CÙNG thế giới, giữ ký ức kiếp trước) | system-bestowed (bản địa được Hệ Thống ban tặng, nguồn IN-WORLD) | returnee (bản địa hồi quy)>",
    "originLockNote": "<1 câu khoá: điều TUYỆT ĐỐI không được mâu thuẫn về gốc gác MC ở master_outline/story_outline>",
    "mcSecret": {
      "secret": "<bí mật năng lực MC — PHẢI NHẤT QUÁN với mcOrigin: nếu mcOrigin=native/system-bestowed thì nguồn Hệ Thống/golden finger PHẢI in-world (kỳ ngộ/gia truyền/linh mạch/cổ thư), TUYỆT ĐỐI KHÔNG 'kiếp trước'/'tiền kiếp'/'xuyên không'. Chỉ dùng 'kiếp trước' khi mcOrigin=reincarnated; chỉ dùng 'thế giới khác' khi mcOrigin=transmigrator>",
      "outsideWorldKnowledge": "<người ngoài chỉ được thấy kết quả gì, KHÔNG biết nguồn gốc>",
      "revealRule": "<chỉ reveal muộn khi outline chỉ định rõ; Phase 1-2 tuyệt đối không ai biết>",
      "coverStory": "<vỏ bọc cụ thể trong thế giới thực để giải thích năng lực siêu phàm của MC, vd: sư phụ bí ẩn truyền dạy, ngộ tính thiên tài bộc phát, gia truyền cổ thư>"
    },
    "benefitLoop": {
      "goal": "<mục tiêu nhỏ MC chủ động theo đuổi trong 1-3 chương>",
      "action": "<hành động cụ thể MC làm>",
      "benefit": "<lợi ích cụ thể MC nhận: tài nguyên/tiền/thông tin/quan hệ/uy tín/skill/bảo vệ circle>",
      "cadence": "<mỗi chương hoặc 1-3 chương phải thấy benefit/payoff>"
    },
    "interventionRule": "<MC chỉ can thiệp chuyện ngoài nếu có lợi ích cụ thể hoặc bảo vệ người thuộc circle đã thiết lập; KHÔNG chõ mồm vô cớ>",
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
      // Phase O (2026-05-12): bumped 3072→8192. Pro tier emits richer prose per field,
      // hits 3072 cap before themes/mainConflict/tensionAxis (which come AFTER setupKernel
      // patternCards in the JSON template). Symptom: "idea themes count 0 < 3" — json-repair
      // closes truncated braces, leaving themes absent. 8192 gives Pro headroom; Flash still
      // typically uses ~2.5K so no cost regression for Flash path.
      model: 'gemini-3.1-flash-lite', temperature: 0.85, maxTokens: 8192,
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

    // Single-source-of-truth: chốt gốc gác MC ngay tại idea stage. Nếu model bỏ trống
    // hoặc trả giá trị lạ → default 'native' (an toàn cho sảng văn warm-baseline; engine
    // đã cấm motif xuyên-không-phế-vật). Đảm bảo DB luôn có canonical mcOrigin để các stage
    // sau (master_outline/story_outline) tuân theo và origin-guard đối chiếu.
    const VALID_ORIGINS = ['native', 'transmigrator', 'reincarnated', 'system-bestowed', 'returnee'] as const;
    if (parsed.setupKernel) {
      const raw = (parsed.setupKernel.mcOrigin as string | undefined)?.trim() as
        | (typeof VALID_ORIGINS)[number]
        | undefined;
      parsed.setupKernel.mcOrigin = raw && VALID_ORIGINS.includes(raw) ? raw : 'native';
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

/**
 * Validate an existing world_description against every gate the regen path
 * checks (length, structure blueprint, semantic canon, playbook hooks, MC
 * identity tier). Returns `{ passed: true }` if all gates pass — in that case
 * the caller may SKIP the Gemini regen step entirely and preserve the
 * existing world_description (admin-curated, or already AI-generated last run).
 *
 * Added 2026-05-12 (Phase Q) after the world stage handler kept overwriting
 * a manually-rebuilt world_description with empty Gemini output, causing
 * "world too short (0 chars)" failures even though the saved field had 8k+
 * valid chars.
 */
function evaluateExistingWorld(
  wd: string | null | undefined,
  genre: GenreType,
  setupKernel: StoryKernel,
): { passed: boolean; reason?: string } {
  const text = (wd || '').trim();
  if (text.length < 500) return { passed: false, reason: 'too short' };
  const structure = validateSeedStructure(text);
  if (!structure.passed) return { passed: false, reason: `blueprint ${structure.score}/100` };
  const semantic = validateSetupCanon({ worldDescription: text, setupKernel, strictContract: true });
  if (!semantic.passed) return { passed: false, reason: `semantic ${formatSetupGateIssues(semantic).slice(0, 80)}` };
  const hookCheck = validateWorldHooks(genre, text);
  if (!hookCheck.passed) return { passed: false, reason: `hooks ${hookCheck.matchedCount}/${hookCheck.minRequired}` };
  const worldMc = extractMainCharacterNameFromWorld(text);
  const identityCheck = validateMcOpeningIdentityTier(text, genre, worldMc);
  if (!identityCheck.passed) return { passed: false, reason: `identity ${identityCheck.reason}` };
  return { passed: true };
}

async function runStageWorld(p: ProjectStageRow): Promise<{ success: boolean; error?: string }> {
  const novel = getNovel(p);
  if (!novel) return { success: false, error: 'no novel linked' };
  const genre = (p.genre || 'tien-hiep') as GenreType;
  const idea = (p.story_outline as { __stage_idea?: IdeaPayload } | null)?.__stage_idea;
  if (!idea) return { success: false, error: 'idea stage output missing — re-run idea' };
  const setupKernel = idea.setupKernel || getSetupKernelFromOutline(p.story_outline);
  const kernelIssue = validateStoryKernel(setupKernel);
  if (kernelIssue) return { success: false, error: `world preflight ${kernelIssue}` };

  // Phase Q (2026-05-12): if world_description already passes every gate the
  // regen path would check, skip the Gemini call. Lets admins curate the world
  // manually (or preserve a prior good generation) instead of having the
  // handler clobber it on each retry. Saves an AI call too.
  const preexisting = evaluateExistingWorld(p.world_description, genre, setupKernel!);
  if (preexisting.passed) {
    console.log(`[setup-pipeline] ${p.id.slice(0, 8)} world stage: keeping existing world_description (passes all gates)`);
    return { success: true };
  }

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
    // Phase T+2 (2026-05-15): adapt model + temp + ROUTING BYPASS based on
    // kernel_repair_attempts. Two failure modes observed:
    //   1. Pro thinking model (gemini-3-flash-preview) burns output tokens via
    //      hidden reasoning, leaving no budget for content → empty response.
    //      installModelTierRouting routes 'stage_world' → Pro by default.
    //   2. Gemini 3 family at temp 1.0 (forced by callGemini for gemini-3*)
    //      can be stochastic empty on certain content. Caller temp < 0.7 now
    //      respected.
    // Solution after 2+ repair attempts: use task name 'stage_world_retry'
    // which is NOT in PRO_TASKS → router falls back to MODEL_FLASH = flash-lite.
    // Pass temp 0.4 explicitly (below 0.7 threshold) so it's actually used.
    const { data: projectRow } = await getSupabase()
      .from('ai_story_projects').select('kernel_repair_attempts').eq('id', p.id).maybeSingle();
    const repairAttempts = (projectRow?.kernel_repair_attempts as number) || 0;
    const useRetryPath = repairAttempts >= 2;
    const worldTaskName = useRetryPath ? 'stage_world_retry' : 'stage_world';
    const worldModel = 'gemini-3.1-flash-lite'; // routing may override on first path
    const worldTemp = useRetryPath ? 0.4 : 0.8;
    const worldMaxTokens = useRetryPath ? 16384 : 8192;

    const res = await callGemini(prompt, {
      model: worldModel, temperature: worldTemp, maxTokens: worldMaxTokens,
      systemPrompt: SANG_VAN_DNA + '\n\n[ROLE-SPECIFIC] Stage: WORLD. Build world_description theo StoryKernel + 10-section blueprint. Section đầu là ### STORY KERNEL SUMMARY. World ngây thơ về MC, antagonist Phase 1 LOCAL only.',
    }, { jsonMode: true, tracking: { projectId: p.id, task: worldTaskName } });

    const parsed = parseJSON<{ worldDescription?: string }>(res.content);
    const wd = (parsed?.worldDescription || '').trim();
    if (wd.length < 500) {
      console.error(`[ERROR] runStageWorld failed for project ${p.id}. wd.length = ${wd.length}. parsed is null? ${parsed === null}. Keys of parsed: ${parsed ? Object.keys(parsed).join(', ') : 'none'}. Raw content length: ${res.content.length}. Snippet:\n${res.content.slice(0, 800)}`);
      return { success: false, error: `world too short (${wd.length} chars, need ≥500). Task=${worldTaskName} temp=${worldTemp} maxTokens=${worldMaxTokens} repair_attempts=${repairAttempts}.` };
    }
    const validation = validateSeedStructure(wd);
    if (!validation.passed) {
      return { success: false, error: `world blueprint score ${validation.score}/100 — issues: ${validation.issues.slice(0, 3).join('; ')}` };
    }
    const semantic = validateSetupCanon({ worldDescription: wd, setupKernel, strictContract: true });
    if (!semantic.passed) {
      // The kernel comes from the 'idea' stage. When validateSetupCanon flags a
      // weak kernel field (system_mechanic / benefit_loop / intervention_rule),
      // re-running 'world' with the same setupKernel will fail identically every
      // time → 5× pause. Rewind to 'idea' to regenerate the kernel.
      // Cap via kernel_repair_attempts so we don't loop idea→world→idea forever.
      const kernelWeak = semantic.issues.some(i => /^setup_kernel_.*_weak$/.test(i.code));
      if (kernelWeak && repairAttempts < 3) {
        await cleanupStageArtifacts(p.id, 'idea');
        await getSupabase().from('ai_story_projects').update({
          setup_stage: 'idea',
          setup_stage_attempts: 0,
          setup_stage_error: `world rewound to idea: kernel weak (${semantic.issues.filter(i => /weak/.test(i.code)).map(i => i.code).join(', ')})`,
          kernel_repair_attempts: repairAttempts + 1,
        }).eq('id', p.id);
        return { success: false, error: `Rewound to stage=idea (kernel repair ${repairAttempts + 1}/3): world semantic gate failed: ${formatSetupGateIssues(semantic)}` };
      }
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

    // Sảng văn 2026 hard cap — reject MC rock-bottom identity in worldDescription.
    const worldMc = extractMainCharacterNameFromWorld(wd);
    const identityCheck = validateMcOpeningIdentityTier(wd, genre, worldMc);
    if (!identityCheck.passed) {
      return { success: false, error: `world identity gate: ${identityCheck.reason}` };
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
      // Phase O (2026-05-12): bumped 1536→4096 to give Pro tier headroom (Pro emits
      // richer paragraphs for archetype/voice/signature fields).
      model: 'gemini-3.1-flash-lite', temperature: 0.9, maxTokens: 4096,
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

    // Sảng văn 2026 hard cap — reject MC rock-bottom identity in archetype/voice/signature.
    const identityScanText = [archetypeName, parsed?.mcVoice, parsed?.mcSignature]
      .filter(Boolean)
      .join(' \n ');
    const identityCheck = validateMcOpeningIdentityTier(identityScanText, genre, worldMc);
    if (!identityCheck.passed) {
      return { success: false, error: `character identity gate: ${identityCheck.reason}` };
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
      model: 'gemini-3.1-flash-lite', temperature: 0.7, maxTokens: 4096,
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
      { ...stageConfig(), model: 'gemini-3.1-flash-lite' },
      setupKernel,
    );
    if (!outline?.majorArcs?.length && !outline?.volumes?.length) {
      return { success: false, error: 'master_outline generation returned no volumes/majorArcs' };
    }

    // Fix 3: deterministic origin-consistency guard. Fail-closed nếu master_outline
    // mâu thuẫn gốc gác MC đã chốt ở idea (vd origin=native nhưng outline nói "xuyên không").
    // NO FALLBACK — trả lỗi để cron retry stage này ở tick sau.
    const originIssue = detectOriginContradiction(setupKernel, outline);
    if (originIssue) {
      return { success: false, error: `mc_origin_contradiction: ${originIssue}` };
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
      { ...stageConfig(), model: 'gemini-3.1-flash-lite' },
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

// ── Stage 7b: ARC APPROVAL (Human-in-the-Loop Gate) ─────────────────────────
/**
 * Pause the project for human review of the Arc 1 plan generated in the
 * previous stage. The admin must approve (or edit) the arc plan before
 * the pipeline continues to foundation_review.
 *
 * This handler is special: it always "succeeds" immediately so that
 * advanceStage can transition to the next stage — but advanceStage itself
 * is NOT called because runOneStage sees a paused project. Instead, we
 * pause here and wait for the approve_arc admin API to advance the stage.
 */
async function runStageArcApproval(p: ProjectStageRow): Promise<{ success: boolean; error?: string }> {
  const novel = Array.isArray(p.novels) ? p.novels[0] : p.novels;
  const novelTitle = novel?.title || 'Unknown';

  await getSupabase()
    .from('ai_story_projects')
    .update({
      status: 'paused',
      pause_reason: `awaiting_arc_approval:arc_1_setup:${novelTitle}`,
      paused_at: new Date().toISOString(),
    })
    .eq('id', p.id);

  console.log(`[SetupPipeline] Project ${p.id.slice(0, 8)} paused for arc approval (${novelTitle})`);

  // Return false so runOneStage does NOT call advanceStage.
  // The approve_arc API will advance the stage when admin approves.
  return { success: false, error: 'awaiting_arc_approval' };
}

// ── Stage 8 (Phase S): CANON SPAWN ──────────────────────────────────────────
async function runStageCanonSpawn(p: ProjectStageRow): Promise<{ success: boolean; error?: string }> {
  const wd = (p.world_description || '').trim();
  const mc = (p.main_character || '').trim();

  try {
    assertSetupGate({
      worldDescription: wd,
      mainCharacter: mc,
      storyOutline: p.story_outline,
      masterOutline: p.master_outline,
      requireStoryOutline: true,
      requireMasterOutline: true,
    });

    const result = await spawnSetupCanon(
      {
        projectId: p.id,
        novelId: p.novel_id,
        genre: p.genre,
        mainCharacter: mc,
        worldDescription: wd,
        storyOutline: p.story_outline,
        masterOutline: p.master_outline,
        storyBible: p.story_bible || null,
      },
      stageConfig(),
    );

    // Persist result summary to style_directives for admin visibility
    const { data: row } = await getSupabase()
      .from('ai_story_projects')
      .select('style_directives')
      .eq('id', p.id)
      .maybeSingle();
    const sd = (row?.style_directives as Record<string, unknown>) || {};
    await getSupabase()
      .from('ai_story_projects')
      .update({
        style_directives: {
          ...sd,
          canon_spawn_result: result,
          canon_spawn_at: new Date().toISOString(),
        },
      })
      .eq('id', p.id);

    // Stage passes if at least 4 of 7 canon types generated successfully.
    const generatedCount = [
      result.factions.generated,
      result.worldCanon.generated,
      result.powerSystem.generated,
      result.foreshadowing.generated,
      result.plotTwists.generated,
      result.themes.generated,
      result.voiceAnchors.generated,
    ].filter(Boolean).length;

    if (generatedCount < 4) {
      const errors = [
        result.factions.error && `factions: ${result.factions.error}`,
        result.worldCanon.error && `worldCanon: ${result.worldCanon.error}`,
        result.powerSystem.error && `powerSystem: ${result.powerSystem.error}`,
        result.foreshadowing.error && `foreshadowing: ${result.foreshadowing.error}`,
        result.plotTwists.error && `plotTwists: ${result.plotTwists.error}`,
        result.themes.error && `themes: ${result.themes.error}`,
        result.voiceAnchors.error && `voiceAnchors: ${result.voiceAnchors.error}`,
      ].filter(Boolean).join(' | ');
      return {
        success: false,
        error: `Canon spawn coverage too low (${generatedCount}/7): ${errors.slice(0, 400)}`,
      };
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── Stage 9 (Phase S): FOUNDATION REVIEW ────────────────────────────────────
async function runStageFoundationReview(
  p: ProjectStageRow,
): Promise<{ success: boolean; error?: string }> {
  const wd = (p.world_description || '').trim();

  try {
    const { data: project } = await getSupabase()
      .from('ai_story_projects')
      .select('style_directives, worldbuilding_canon, power_system_canon')
      .eq('id', p.id)
      .maybeSingle();
    const styleDir = (project?.style_directives as Record<string, unknown>) || {};
    const positioning = styleDir.positioning;
    const setupKernel = getSetupKernelFromOutline(p.story_outline);
    const genre = (p.genre || 'tien-hiep') as GenreType;

    // Load supporting canon for review
    const db = getSupabase();
    const [factions, voiceAnchors] = await Promise.all([
      db.from('factions').select('*').eq('project_id', p.id),
      db.from('voice_anchors').select('*').eq('project_id', p.id),
    ]);

    const genreContractIssues = validateGenreSetupContract({
      genre,
      worldDescription: wd,
      setupKernel,
      masterOutline: p.master_outline,
      storyOutline: p.story_outline,
    });

    const hardGenreFailures = genreContractIssues.filter((issue) => issue.severity === 'critical' || issue.severity === 'major');
    if (hardGenreFailures.length > 0) {
      return {
        success: false,
        error: formatGenreContractReport(hardGenreFailures).slice(0, 900),
      };
    }

    const result = await runFoundationReview(
      {
        projectId: p.id,
        artifacts: {
          positioning,
          genreContractReport: formatGenreContractReport(genreContractIssues),
          kernel: setupKernel,
          worldDescription: wd,
          worldCanon: project?.worldbuilding_canon,
          castRoster: factions.data,
          masterOutline: p.master_outline,
          storyOutline: p.story_outline,
          voiceAnchors: voiceAnchors.data,
        },
      },
      stageConfig(),
    );

    await persistFoundationReview(p.id, result);

    if (!result.passed) {
      const retry = result.retryRecommendation;
      const errMsg = `Foundation review FAILED total=${result.totalScore}/140 avg=${result.avgScore} min=${result.minDimScore}/10. ${retry ? `[retry stage=${retry.stage} priority=${retry.priority}] ${retry.instruction.slice(0, 300)}` : ''}`;

      // If retry recommendation points to earlier stage, rewind setup_stage.
      // Foundation reviewer dimension stages: 'idea' | 'world' | 'cast' | 'master_outline' |
      // 'story_outline' | 'voice_anchor' | 'trial'. The non-SetupStage values must map to the
      // SetupStage that actually generates that artifact, otherwise rewind silently no-ops and
      // cron retries foundation_review with the same data → 5× pause loop.
      //   - 'cast' / 'voice_anchor' artifacts are created in 'canon_spawn' stage (factions +
      //     voice_anchors tables seeded there)
      //   - 'trial' is pre-write only, skipped in the reviewer pre-trial anyway
      if (retry && retry.stage && retry.stage !== 'foundation_review') {
        const STAGE_REWIND_MAP: Record<string, SetupStage> = {
          idea: 'idea',
          world: 'world',
          character: 'character',
          description: 'description',
          master_outline: 'master_outline',
          story_outline: 'story_outline',
          canon_spawn: 'canon_spawn',
          cast: 'canon_spawn',
          voice_anchor: 'canon_spawn',
          trial: 'canon_spawn',
        };
        const rewindToStage = STAGE_REWIND_MAP[retry.stage];
        if (rewindToStage) {
          // Cap rewinds — kernel_repair_attempts gates max 3 rewinds total
          const { data: row } = await getSupabase()
            .from('ai_story_projects')
            .select('kernel_repair_attempts')
            .eq('id', p.id)
            .maybeSingle();
          const attempts = (row?.kernel_repair_attempts as number) || 0;
          if (attempts < 3) {
            await cleanupStageArtifacts(p.id, rewindToStage);
            await getSupabase()
              .from('ai_story_projects')
              .update({
                setup_stage: rewindToStage,
                setup_stage_attempts: 0,
                setup_stage_error: errMsg,
                kernel_repair_attempts: attempts + 1,
              })
              .eq('id', p.id);
            return { success: false, error: `Rewound to stage=${rewindToStage} (foundation review attempt ${attempts + 1}/3): ${errMsg}` };
          }
          // Exceeded max rewinds — pause for admin
          return { success: false, error: `${errMsg} [Max 3 foundation review rewinds exceeded — admin must intervene]` };
        }
      }
      return { success: false, error: errMsg };
    }

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
  canon_spawn: runStageCanonSpawn,
  arc_plan: runStageArcPlan,
  arc_approval: runStageArcApproval,
  foundation_review: runStageFoundationReview,
};

/**
 * Run ONE stage for a project. Caller invokes this per cron tick.
 * Returns true if stage advanced; false if stage failed (will retry next tick).
 */
export async function runOneStage(p: ProjectStageRow): Promise<boolean> {
  // Claude Code authoring (2026-05-29): when setup_source='claude_code', the
  // novel's setup artifacts (idea/world/canon/outline/foundation) are hand-authored
  // locally by Claude Code and applied via scripts/cc-apply-setup.ts, which pushes
  // setup_stage straight to 'ready_to_write'. If the cron ever sees such a project
  // still in a model-API staged state, SKIP — running a model stage here would
  // overwrite the curated artifacts. cc-apply-setup is the only writer for these.
  if ((p.style_directives as Record<string, unknown> | null | undefined)?.setup_source === 'claude_code') {
    if (process.env.DEBUG_ROUTING === '1') {
      console.warn(`[SetupPipeline] skip stage ${p.setup_stage} for ${p.id} — setup_source=claude_code (cc-apply-setup owns setup)`);
    }
    return false;
  }

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
  } else if (result.error === 'awaiting_arc_approval') {
    // arc_approval stage paused the project directly — do NOT increment
    // attempts or record error; admin will resume via approve_arc API.
    return false;
  } else {
    await recordStageError(p.id, result.error || 'unknown', p.setup_stage_attempts);
    return false;
  }
}
