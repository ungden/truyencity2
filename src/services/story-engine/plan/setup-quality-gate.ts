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
}

interface MasterOutlineLike {
  majorArcs?: unknown[];
  volumes?: unknown[];
}

const SECTION_BOUNDARY = /(?:^|\n)###\s+/;

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

function rejectIf(pattern: RegExp, text: string, issues: SetupGateIssue[], code: string, message: string): void {
  if (pattern.test(text)) issues.push({ severity: 'error', code, message });
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

  const storyEngine = getSection(world, /###\s*STORY\s*ENGINE/i);
  if (world) {
    requireIfMissing(
      storyEngine.length > 0,
      strict,
      issues,
      'story_engine_missing',
      'world_description must include STORY ENGINE: reader promise, core loop, dopamine cadence, and novelty plan',
    );
    requireIfMissing(
      /(reader\s*promise|lời\s*hứa|đọc\s+để|reader\s+đọc)/i.test(storyEngine),
      strict,
      issues,
      'reader_promise_missing',
      'setup must state a concrete reader promise, not just lore',
    );
    requireIfMissing(
      /(core\s*loop|vòng\s*lặp|hành\s*động.*feedback|feedback.*payoff|mỗi\s+2-3\s+chương)/i.test(storyEngine),
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

  const phase1 = getSection(world, /PHASE\s*1\s*\([^)]*\)\s*:/i);
  const phase1Text = `${phase1} ${story?.mainConflict || ''}`;
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
