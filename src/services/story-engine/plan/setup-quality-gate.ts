/**
 * Setup Contract Gate
 *
 * Pure validation helpers for the one-time novel setup pipeline. These checks
 * intentionally separate hard invariants from taste. Prompts describe the
 * positive setup contract; this gate only rejects states that would break later
 * stages: canon drift, absent operating model, incoherent escalation, or missing
 * outline artifacts before chapter 1.
 */

import { validateSeedStructure } from './seed-blueprint';
import type { StoryKernel } from '../types';

export interface SetupGateIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
}

export interface SetupGateInput {
  worldDescription?: string | null;
  mainCharacter?: string | null;
  storyOutline?: unknown;
  masterOutline?: unknown;
  setupKernel?: StoryKernel | null;
  requireStoryOutline?: boolean;
  requireMasterOutline?: boolean;
  strictContract?: boolean;
}

export interface SetupGateResult {
  passed: boolean;
  issues: SetupGateIssue[];
  extractedWorldMainCharacter?: string;
}

interface StoryOutlineLike {
  premise?: string;
  mainConflict?: string;
  themes?: unknown[];
  majorPlotPoints?: unknown[];
  protagonist?: {
    name?: string;
    startingState?: string;
    endGoal?: string;
    characterArc?: string;
  };
  readerPromise?: string;
  openingExperience?: unknown;
  dopamineContract?: unknown;
  conflictLadder?: unknown;
  setupKernel?: StoryKernel;
}

interface MasterOutlineLike {
  majorArcs?: unknown[];
  volumes?: unknown[];
}

const SECTION_BOUNDARY = /(?:^|\n)###\s+/;
const MC_SECRET_LEAK_PATTERNS: Array<{ regex: RegExp; code: string; message: string }> = [
  {
    regex: /(tổ\s*chức|thế\s*lực|hội|cục|viện|tập\s*đoàn)\s+(bí\s*ẩn|ẩn\s*mật|thần\s*bí)[^.!?\n]{0,80}(theo\s*dõi|giám\s*sát|để\s*ý|săn\s*lùng|biết|phát\s*hiện)/i,
    code: 'early_mysterious_org_tracking',
    message: 'early setup must not add a mysterious organization tracking MC',
  },
  {
    regex: /(người\s*lạ|kẻ\s*lạ|đối\s*thủ|nhân\s*vật\s+bí\s*ẩn|thế\s*lực\s+bí\s*ẩn)[^.!?\n]{0,80}(biết|phát\s*hiện|nhận\s*ra|nắm)[^.!?\n]{0,80}(trọng\s*sinh|hệ\s*thống|bàn\s*tay\s*vàng|golden\s*finger|bí\s*mật|năng\s*lực\s+thật)/i,
    code: 'early_mc_secret_leak',
    message: 'rebirth/system/golden finger is MC secret; outsiders cannot know it in Phase 1',
  },
  {
    regex: /(trọng\s*sinh|hệ\s*thống|bàn\s*tay\s*vàng|golden\s*finger|năng\s*lực\s+thật)[^.!?\n]{0,80}(bị\s+lộ|bị\s+phát\s+hiện|đã\s+bị\s+biết|lọt\s+vào\s+tầm\s+mắt)/i,
    code: 'early_mc_secret_leak',
    message: 'setup cannot leak MC secret before the story earns a late reveal',
  },
];

const WEAK_SYSTEM_PATTERNS = /(mơ\s*hồ|không\s+rõ|chưa\s+giúp|không\s+giúp|không\s+có\s+lợi|hên\s+xui|ngẫu\s*nhiên|vô\s*dụng|không\s+đáng\s+kể|chỉ\s+gợi\s+ý\s+chung)/i;
// 2026-05-12 (round 2): expanded again to cover writer/lord/territory/cultivation
// flavors that Pro setup model produces. Adds: lợi nhuận/doanh số/sản phẩm/hàng
// hóa/thị trường (business), văn khí/văn đạo/văn chương/sách/danh tiếng (writer),
// tinh thạch/quặng/khoáng (mining), lãnh địa/lương dân (lord), đệ tử/đồ đệ/độc
// giả/fan (follower base), tài sản/vàng/wealth/gold (asset).
//
// 2026-05-12 (round 1): expanded with survival/apocalypse + magic/cultivation
// benefit terms so the validator works across mat-the / linh-di / kiem-hiep /
// di-gioi genres. The list intentionally errs broad — any of these counts as a
// concrete, repeatable reader payoff per chapter.
const BENEFIT_KEYWORDS = /(tiền|doanh\s*thu|doanh\s*số|lợi\s*nhuận|tài\s*nguyên|tài\s*sản|wealth|gold|vàng|skill|kỹ\s*năng|công\s*nhận|uy\s*tín|danh\s*tiếng|fame|quan\s*hệ|network|thông\s*tin|insight|manh\s*mối|đột\s*phá|level|cảnh\s*giới|khách|đơn\s*hàng|hợp\s*đồng|hàng\s*hóa|sản\s*phẩm|thị\s*trường|vật\s*phẩm|item|kinh\s*nghiệm|lương\s*thực|nhu\s*yếu\s*phẩm|đồ\s*ăn|thuốc|vũ\s*khí|đạn|súng|nước\s+sạch|năng\s*lượng|lãnh\s*thổ|lãnh\s*địa|lương\s*dân|trung\s*thành|loyalty|đệ\s*tử|đồ\s*đệ|độc\s*giả|fan|fanbase|kho|hầm|công\s*nghệ|drone|cảm\s*biến|linh\s*lực|nội\s*lực|pháp\s*bảo|công\s*pháp|huyết\s*mạch|đan\s*dược|linh\s*thạch|tinh\s*thạch|quặng|khoáng|văn\s*khí|văn\s*đạo|văn\s*chương|sách|spirit|mana|aura)/i;

// 2026-05-12: Phase 1 antagonist scale check — only flag mysterious / cosmic /
// kingdom-level forces, not bare "hội/cục/viện" which match local guilds and
// associations (e.g. "Hắc thương Hội" is a local crime guild, not a too-large
// antagonist). Modifiers like "bí ẩn / thần bí / toàn cầu / tối thượng" are the
// true signal that the antagonist is too big for Phase 1.
const ANTAGONIST_TOO_LARGE = /(bí\s*ẩn|thần\s*bí|ẩn\s*mật|toàn\s*cầu|toàn\s*quốc|tối\s*thượng|đại\s*đế|hoàng\s*đế|hoàng\s*gia|hoàng\s*tộc|tiên\s*vương|tà\s*thần|cổ\s*thần|thần\s*linh|quốc\s*sư)/i;

function normalizeName(value?: string | null): string {
  return (value || '')
    .replace(/\s+/g, ' ')
    .replace(/[“”"']/g, '')
    .trim();
}

function getSection(text: string, headingPattern: RegExp): string {
  const match = headingPattern.exec(text);
  if (!match || match.index < 0) return '';
  const start = match.index + match[0].length;
  const rest = text.slice(start);
  const next = rest.search(SECTION_BOUNDARY);
  return (next >= 0 ? rest.slice(0, next) : rest).trim();
}

export function extractMainCharacterNameFromWorld(worldDescription?: string | null): string | undefined {
  if (!worldDescription) return undefined;
  const mainSection = getSection(worldDescription, /###\s*NHÂN\s*VẬT\s*CHÍNH/i);
  const text = mainSection || worldDescription.slice(0, 1200);
  const match = text.match(/(?:^|\n)\s*-\s*Tên\s*:\s*([^\n—,;()]+)/i)
    || text.match(/\bMC\s+(?:tên\s+)?([A-ZÀ-Ỵ][\p{L}]+(?:\s+[A-ZÀ-Ỵ][\p{L}]+){1,3})/iu);
  return match ? normalizeName(match[1]) : undefined;
}

function hasMasterOutlineShape(masterOutline: unknown): boolean {
  if (!masterOutline || typeof masterOutline !== 'object') return false;
  const mo = masterOutline as MasterOutlineLike;
  return (Array.isArray(mo.volumes) && mo.volumes.length > 0)
    || (Array.isArray(mo.majorArcs) && mo.majorArcs.length > 0);
}

function getStoryOutline(input: unknown): StoryOutlineLike | undefined {
  if (!input || typeof input !== 'object') return undefined;
  return input as StoryOutlineLike;
}

function getSetupKernel(input: SetupGateInput, story?: StoryOutlineLike): StoryKernel | undefined {
  return input.setupKernel || story?.setupKernel;
}

function validateSetupKernel(kernel: StoryKernel | undefined, strict: boolean | undefined, issues: SetupGateIssue[]): void {
  const severity = strict ? 'error' : 'warning';
  if (!kernel || typeof kernel !== 'object') {
    issues.push({ severity, code: 'setup_kernel_missing', message: 'StoryKernel missing from story_outline.setupKernel' });
    return;
  }

  const requiredStrings: Array<[keyof Pick<StoryKernel, 'readerFantasy' | 'protagonistEngine'>, string]> = [
    ['readerFantasy', 'StoryKernel.readerFantasy is required'],
    ['protagonistEngine', 'StoryKernel.protagonistEngine is required'],
  ];
  for (const [key, message] of requiredStrings) {
    if (typeof kernel[key] !== 'string' || kernel[key].trim().length < 20) {
      issues.push({ severity, code: `setup_kernel_${key}_missing`, message });
    }
  }

  if (!Array.isArray(kernel.pleasureLoop) || kernel.pleasureLoop.filter(Boolean).length < 4) {
    issues.push({ severity: 'error', code: 'setup_kernel_pleasure_loop_missing', message: 'StoryKernel.pleasureLoop must contain at least 4 repeatable beats' });
  }

  const mechanic = kernel.systemMechanic;
  if (!mechanic || typeof mechanic !== 'object'
    || !mechanic.input || !mechanic.output || !mechanic.limit || !mechanic.reward) {
    issues.push({ severity: 'error', code: 'setup_kernel_system_mechanic_missing', message: 'StoryKernel.systemMechanic must define input/output/limit/reward' });
  } else {
    const mechanicText = `${mechanic.output} ${mechanic.reward}`;
    if (WEAK_SYSTEM_PATTERNS.test(mechanicText) || !BENEFIT_KEYWORDS.test(mechanicText)) {
      issues.push({
        severity: 'error',
        code: 'setup_kernel_system_mechanic_weak',
        message: 'StoryKernel.systemMechanic output/reward must create concrete benefit every 1-3 chapters',
      });
    }
  }

  if (!kernel.mcSecret?.secret || !kernel.mcSecret?.outsideWorldKnowledge || !kernel.mcSecret?.revealRule) {
    issues.push({
      severity: 'error',
      code: 'setup_kernel_mc_secret_missing',
      message: 'StoryKernel.mcSecret must define secret, outside-world knowledge, and reveal rule',
    });
  }

  const benefit = kernel.benefitLoop;
  if (!benefit?.goal || !benefit?.action || !benefit?.benefit || !benefit?.cadence) {
    issues.push({
      severity: 'error',
      code: 'setup_kernel_benefit_loop_missing',
      message: 'StoryKernel.benefitLoop must define goal/action/benefit/cadence',
    });
  } else if (WEAK_SYSTEM_PATTERNS.test(`${benefit.benefit} ${benefit.cadence}`) || !BENEFIT_KEYWORDS.test(benefit.benefit)) {
    issues.push({
      severity: 'error',
      code: 'setup_kernel_benefit_loop_weak',
      message: 'StoryKernel.benefitLoop.benefit must be concrete: resource, money, relation, information, skill, reputation, or protection',
    });
  }

  if (!kernel.interventionRule || kernel.interventionRule.trim().length < 30 || !BENEFIT_KEYWORDS.test(kernel.interventionRule)) {
    issues.push({
      severity: 'error',
      code: 'setup_kernel_intervention_rule_weak',
      message: 'StoryKernel.interventionRule must state MC only intervenes when there is concrete benefit or established-circle protection',
    });
  }

  const playground = kernel.phase1Playground;
  if (!playground || typeof playground !== 'object'
    || !Array.isArray(playground.locations) || playground.locations.length < 2
    || !Array.isArray(playground.cast) || playground.cast.length < 2
    || !Array.isArray(playground.localAntagonists) || playground.localAntagonists.length < 1
    || !Array.isArray(playground.repeatableSceneTypes) || playground.repeatableSceneTypes.length < 3) {
    issues.push({ severity: 'error', code: 'setup_kernel_phase1_playground_missing', message: 'StoryKernel.phase1Playground must define local locations, cast, antagonist, and repeatable scene types' });
  } else if (playground.localAntagonists.some(a => ANTAGONIST_TOO_LARGE.test(String(a)))) {
    issues.push({
      severity: 'error',
      code: 'setup_kernel_phase1_antagonist_too_large',
      message: 'Phase 1 localAntagonists must be local and visible, not mysterious organizations or high-scale forces',
    });
  }

  if (!kernel.socialReactor || !Array.isArray(kernel.socialReactor.witnesses) || kernel.socialReactor.witnesses.length < 2) {
    issues.push({ severity, code: 'setup_kernel_social_reactor_missing', message: 'StoryKernel.socialReactor must define witnesses/reactions/report-back' });
  }

  if (!Array.isArray(kernel.noveltyLadder) || kernel.noveltyLadder.length < 3) {
    issues.push({ severity: 'error', code: 'setup_kernel_novelty_ladder_missing', message: 'StoryKernel.noveltyLadder must contain at least 3 controlled expansion steps' });
  }

  if (!kernel.controlRules?.payoffCadence || !kernel.controlRules?.attentionGradient
    || typeof kernel.controlRules.openThreadsPerArc !== 'number'
    || typeof kernel.controlRules.closeThreadsPerArc !== 'number') {
    issues.push({ severity, code: 'setup_kernel_control_rules_missing', message: 'StoryKernel.controlRules must define payoff cadence, attention gradient, and thread quotas' });
  }
}

function rejectIf(pattern: RegExp, text: string, issues: SetupGateIssue[], code: string, message: string): void {
  if (pattern.test(text)) issues.push({ severity: 'error', code, message });
}

function rejectSecretLeaks(text: string, issues: SetupGateIssue[]): void {
  for (const rule of MC_SECRET_LEAK_PATTERNS) {
    rejectIf(rule.regex, text, issues, rule.code, rule.message);
  }
}

function hasBriefWithoutMcBenefit(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(hasBriefWithoutMcBenefit);

  const record = value as Record<string, unknown>;
  const looksLikeChapterBrief = typeof record.brief === 'string'
    && (typeof record.chapterNumber === 'number' || Array.isArray(record.scenes));
  if (looksLikeChapterBrief && typeof record.mcBenefit !== 'string') return true;

  return Object.values(record).some(hasBriefWithoutMcBenefit);
}

function requireIfMissing(
  ok: boolean,
  strict: boolean | undefined,
  issues: SetupGateIssue[],
  code: string,
  message: string,
): void {
  if (!ok) issues.push({ severity: strict ? 'error' : 'warning', code, message });
}

export function validateSetupCanon(input: SetupGateInput): SetupGateResult {
  const issues: SetupGateIssue[] = [];
  const world = (input.worldDescription || '').trim();
  const worldName = extractMainCharacterNameFromWorld(world);
  const projectName = normalizeName(input.mainCharacter);
  const story = getStoryOutline(input.storyOutline);
  const strict = input.strictContract;
  const setupKernel = getSetupKernel(input, story);

  if (!world || world.length < 500) {
    issues.push({
      severity: 'error',
      code: 'world_missing',
      message: `world_description missing or too short (${world.length} chars, need >=500)`,
    });
  } else {
    const structure = validateSeedStructure(world);
    if (!structure.passed) {
      issues.push({
        severity: 'error',
        code: 'world_structure',
        message: `world blueprint score ${structure.score}/100: ${structure.issues.slice(0, 3).join('; ') || structure.missingSections.join(', ')}`,
      });
    }
    if (!worldName) {
      issues.push({
        severity: 'error',
        code: 'world_mc_missing',
        message: 'world_description must declare protagonist under NHÂN VẬT CHÍNH as "- Tên: <full name>"',
      });
    }
  }

  if (projectName && worldName && projectName !== worldName) {
    issues.push({
      severity: 'error',
      code: 'mc_world_mismatch',
      message: `main_character "${projectName}" does not match world protagonist "${worldName}"`,
    });
  }

  const storyName = normalizeName(story?.protagonist?.name);
  if (projectName && storyName && projectName !== storyName) {
    issues.push({
      severity: 'error',
      code: 'mc_story_mismatch',
      message: `main_character "${projectName}" does not match story_outline protagonist "${storyName}"`,
    });
  }
  if (worldName && storyName && worldName !== storyName) {
    issues.push({
      severity: 'error',
      code: 'world_story_mismatch',
      message: `world protagonist "${worldName}" does not match story_outline protagonist "${storyName}"`,
    });
  }

  const opening = getSection(world, /###\s*OPENING\s*SCENE/i);
  const openingText = opening || world.slice(0, 1500);
  rejectSecretLeaks(openingText, issues);
  rejectIf(
    /(bị\s+(trục\s*xuất|đuổi|bắt|truy\s*sát|ám\s*sát|săn\s*lùng)|ngất\s*xỉu|tự\s*tử|chết\s+đói|chủ\s+nhà\s+giục|nợ\s+trọ\s+3\s+tháng)/i,
    openingText,
    issues,
    'opening_not_warm',
    'opening scene does not satisfy warm-baseline contract: routine + competence + first opportunity',
  );
  if (opening && !/(cơ\s*hội|khách|deal|nhiệm\s*vụ\s+nhỏ|routine|đang\s+làm|mở\s+quán|luyện|thử|phát\s+hiện)/i.test(opening)) {
    issues.push({
      severity: 'warning',
      code: 'opening_promise_weak',
      message: 'opening scene does not clearly state the early opportunity/routine hook',
    });
  }

  const storyEngine = getSection(world, /###\s*(?:STORY\s*ENGINE|STORY\s*KERNEL\s*SUMMARY)/i);
  if (world) {
    requireIfMissing(
      storyEngine.length > 0,
      strict,
      issues,
      'story_engine_missing',
      'world_description must include STORY KERNEL SUMMARY: reader fantasy, pleasure loop, social reactor, and novelty ladder',
    );
    requireIfMissing(
      /(reader\s*(promise|fantasy)|lời\s*hứa|đọc\s+để|reader\s+đọc)/i.test(storyEngine),
      strict,
      issues,
      'reader_promise_missing',
      'setup must state a concrete reader promise, not just lore',
    );
    requireIfMissing(
      /(core\s*loop|pleasure\s*loop|vòng\s*lặp|hành\s*động.*feedback|feedback.*payoff|mỗi\s+2-3\s+chương)/i.test(storyEngine),
      strict,
      issues,
      'core_loop_missing',
      'setup must define a repeatable chapter engine/core loop',
    );
    requireIfMissing(
      /(dopamine|payoff|thưởng|công\s*nhận|đột\s*phá|đơn\s*hàng|clue|item|relationship\s*shift)/i.test(storyEngine),
      strict,
      issues,
      'dopamine_cadence_missing',
      'setup must define the payoff cadence readers will feel every few chapters',
    );
    requireIfMissing(
      /(novelty|mở\s+(cái|thứ|sân|map|case|khách|bí\s*cảnh|công\s*thức|dungeon)\s+mới|mỗi\s+20\s+chương)/i.test(storyEngine),
      strict,
      issues,
      'novelty_plan_missing',
      'setup must define how the same premise stays fresh across long-form arcs',
    );
  }

  validateSetupKernel(setupKernel, strict, issues);

  const phase1 = getSection(world, /PHASE\s*1\s*\([^)]*\)\s*:/i);
  const phase1Text = `${phase1} ${story?.mainConflict || ''}`;
  rejectSecretLeaks(phase1Text, issues);
  rejectIf(
    /\b(tối\s*thượng|đại\s*đế|tổ\s*tiên|tử\s*thần|trưởng\s*lão\s+ma\s+giáo|ai\s+tối\s+thượng|hỗn\s*độn\s+ma\s*thần)\b/i,
    phase1Text,
    issues,
    'phase1_cosmic_tier',
    'Phase 1 breaks escalation ladder: endgame-tier entity appears before local foundation',
  );
  rejectIf(
    /(đe\s*dọa\s+(phá\s*hủy|tiêu\s*diệt|xóa\s*sổ)|tru\s+di\s+(tam|cửu)\s+tộc|sụp\s*đổ\s+(vũ\s*trụ|thế\s*giới)|săn\s*lùng\s+(khắp|toàn|cả)\s+(thiên\s*hạ|đại\s*lục|thế\s*giới))/i,
    phase1Text,
    issues,
    'phase1_cosmic_stake',
    'Phase 1 breaks setup scale: stakes must be local, measurable, and tied to the first domain',
  );

  const gf = getSection(world, /###\s*GOLDEN\s*FINGER/i);
  if (gf) {
    if (!/(cơ\s*chế|hoạt\s*động)/i.test(gf)) {
      issues.push({ severity: 'error', code: 'golden_finger_no_mechanism', message: 'golden finger lacks a concrete mechanism' });
    }
    if (!/(trigger|kích\s*hoạt|khi\s+nào)/i.test(gf)) {
      issues.push({ severity: 'error', code: 'golden_finger_no_trigger', message: 'golden finger lacks a trigger condition' });
    }
    if (!/(điểm\s*yếu|giới\s*hạn|cooldown|không\s*thể|tối\s*đa|lần\/ngày)/i.test(gf)) {
      issues.push({ severity: 'error', code: 'golden_finger_no_limit', message: 'golden finger lacks a cost/limit/weakness' });
    }
  }

  if (input.requireStoryOutline && !story) {
    issues.push({ severity: 'error', code: 'story_outline_missing', message: 'story_outline is required before this stage' });
  }
  if (story) {
    rejectSecretLeaks(JSON.stringify(story), issues);
    if (hasBriefWithoutMcBenefit(story)) {
      issues.push({
        severity: 'error',
        code: 'chapter_brief_mc_benefit_missing',
        message: 'chapter/arc briefs must include mcBenefit so MC never meddles without concrete gain',
      });
    }
    if (!story.premise || story.premise.length < 80) {
      issues.push({ severity: 'error', code: 'story_premise_weak', message: 'story_outline premise is missing or too short' });
    }
    if (!story.mainConflict || story.mainConflict.length < 30) {
      issues.push({ severity: 'error', code: 'story_conflict_weak', message: 'story_outline mainConflict is missing or too short' });
    }
    if (!Array.isArray(story.majorPlotPoints) || story.majorPlotPoints.length < 4) {
      issues.push({ severity: 'error', code: 'story_plot_points_missing', message: 'story_outline needs at least 4 major plot points' });
    }
    if (!story.readerPromise || story.readerPromise.length < 40) {
      issues.push({ severity: 'warning', code: 'reader_promise_missing', message: 'story_outline should include a concrete readerPromise' });
    }
    if (!story.openingExperience) {
      issues.push({ severity: 'warning', code: 'opening_experience_missing', message: 'story_outline should include ch.1-10 openingExperience' });
    }
    if (!story.dopamineContract) {
      issues.push({ severity: 'warning', code: 'dopamine_contract_missing', message: 'story_outline should include a dopamineContract' });
    }
    if (!story.conflictLadder) {
      issues.push({ severity: 'warning', code: 'conflict_ladder_missing', message: 'story_outline should include a long-form conflictLadder' });
    }
  }

  if (input.requireMasterOutline && !hasMasterOutlineShape(input.masterOutline)) {
    issues.push({
      severity: 'error',
      code: 'master_outline_missing',
      message: 'master_outline is required and must contain volumes or majorArcs',
    });
  }

  const passed = issues.every(i => i.severity !== 'error');
  return { passed, issues, extractedWorldMainCharacter: worldName };
}

export function formatSetupGateIssues(result: SetupGateResult): string {
  return result.issues.map(i => `${i.code}: ${i.message}`).join('; ');
}

export function assertSetupGate(input: SetupGateInput): SetupGateResult {
  const result = validateSetupCanon(input);
  if (!result.passed) {
    throw new Error(`Setup quality gate failed: ${formatSetupGateIssues(result)}`);
  }
  return result;
}
