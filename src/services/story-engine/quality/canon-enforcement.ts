/**
 * Story Engine v2 — Canon Enforcement (Phase 28 TIER 1)
 *
 * Centralizes all DETERMINISTIC post-Critic gates that verify chapter content
 * against canon/state. Phase 27 added 11 canon/state context blocks for the
 * Architect to read, but Critic only enforced ~3. This module closes that gap.
 *
 * Gates run AFTER Critic AI returns. Each gate appends issues to the parsed
 * critic output. Critical/major issues automatically force requiresRewrite=true.
 *
 * Design: deterministic only (no AI calls — fast, free). Uses existing canon/
 * state queries + regex/substring matching. AI judgment is delegated to the
 * Critic prompt rules updated in chapter-writer.ts runCritic.
 *
 * Gates included:
 *   1. Cast roster — invented characters not in roster
 *   2. Timeline violations — time reversal / age regression
 *   3. POV consistency — wrong-viewpoint thoughts in 3rd-limited
 *   4. Voice drift — fingerprint deviation from ch.1-3 anchor
 *
 * Items, themes, factions, plot twists, worldbuilding/power-system common
 * violations are handled in Critic AI prompt rules (added separately) —
 * they need semantic judgment that regex can't reliably do.
 */

import { getSupabase } from '../utils/supabase';
import { detectTimelineViolations } from '../state/timeline';
import { checkPovConsistency } from './pov-check';
import { analyzeSensoryBalance } from './sensory-balance';
import { evaluateHooks } from './hook-strength';
import type { CriticIssue } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CanonEnforcementInput {
  projectId: string;
  chapterNumber: number;
  content: string;
  protagonistName: string;
  /** Cast names allowed to appear (from Architect outline + recent activity). */
  expectedCharacters: string[];
  /** Optional POV setting from project (vd '1st' / '3rd-limited' / '3rd-omniscient'). */
  expectedPov?: '1st' | '3rd-limited' | '3rd-omniscient';
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Run all deterministic canon gates. Returns issues to be merged into Critic
 * output. Each gate is non-fatal — failure to run one doesn't block others.
 */
export async function enforceCanonGates(
  input: CanonEnforcementInput,
): Promise<CriticIssue[]> {
  const issues: CriticIssue[] = [];
  const promises: Array<Promise<CriticIssue[]>> = [];

  // 1. Cast roster — flag named entities not in expected cast.
  promises.push(checkCastRoster(input).catch(() => []));

  // 2. Timeline violations — time reversal, age regression.
  promises.push(checkTimelineViolations(input).catch(() => []));

  // 3. POV consistency — only if expectedPov provided.
  if (input.expectedPov) {
    promises.push(checkPovGate(input).catch(() => []));
  }

  // 4. Voice drift vs anchor — compare current chapter metrics to ch.1-3.
  promises.push(checkVoiceDrift(input).catch(() => []));

  // 5. Sensory + hook gates — soft (moderate) issues only.
  promises.push(checkSensoryFloor(input).catch(() => []));
  promises.push(checkHookFloor(input).catch(() => []));

  const results = await Promise.all(promises);
  for (const r of results) issues.push(...r);
  return issues;
}

// ── Gate 1: Cast roster ──────────────────────────────────────────────────────

/**
 * Detect named characters in chapter content that are NOT in the expected
 * cast roster. If chapter introduces 5+ new named characters in 1 chapter,
 * flag (likely AI inventing characters that drift from canon cast).
 *
 * Heuristic: extract Vietnamese capitalized 2-3-word noun phrases that look
 * like character names; subtract known cast + protagonist; if remainder ≥5,
 * flag major issue.
 */
async function checkCastRoster(input: CanonEnforcementInput): Promise<CriticIssue[]> {
  const issues: CriticIssue[] = [];

  // Extract candidate names from content via Vietnamese capitalized noun pattern.
  // Match 2-4 capitalized words (Đào Lệ Băng, Nguyễn Văn A, Lý Phong, ...).
  const NAME_RE = /\b[A-ZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ][a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]+(?:\s+[A-ZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ][a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]+){1,3}\b/g;

  const candidates = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = NAME_RE.exec(input.content)) !== null) {
    const name = m[0].trim();
    // Filter out 1-word matches and likely place names / titles.
    if (name.split(/\s+/).length < 2) continue;
    if (PLACE_PREFIXES.some(p => name.startsWith(p))) continue;
    if (TITLE_WORDS.some(t => name.includes(t))) continue;
    candidates.add(name);
  }

  // Also subtract: protagonist + expected characters + recent cast roster.
  const allowed = new Set<string>([input.protagonistName, ...input.expectedCharacters]);
  // Pull current roster from character_states for fuller allowlist.
  try {
    const db = getSupabase();
    const { data } = await db
      .from('character_states')
      .select('character_name')
      .eq('project_id', input.projectId)
      .lt('chapter_number', input.chapterNumber);
    if (data) {
      for (const r of data) if (r.character_name) allowed.add(r.character_name);
    }
  } catch {
    // Non-fatal — work with what we have.
  }

  const allowedLower = new Set([...allowed].map(s => s.toLowerCase()));
  const novel = [...candidates].filter(c => !allowedLower.has(c.toLowerCase()));

  // Tolerance: ≥5 new named entities = sus; ≥10 = major.
  if (novel.length >= 10) {
    issues.push({
      type: 'continuity',
      severity: 'major',
      description: `${novel.length} tên nhân vật MỚI xuất hiện trong chương này không có trong cast roster: ${novel.slice(0, 8).join(', ')}. Có thể AI đang invent characters drift khỏi canon. Verify: chỉ giữ characters đã establish + characters MỚI có narrative reason.`,
    });
  } else if (novel.length >= 5) {
    issues.push({
      type: 'quality',
      severity: 'moderate',
      description: `${novel.length} tên có thể là nhân vật mới (chưa từng appear): ${novel.slice(0, 5).join(', ')}. Verify cần thiết hay drift.`,
    });
  }

  return issues;
}

const PLACE_PREFIXES = [
  'Đại Lục', 'Sơn', 'Thành', 'Quận', 'Phường', 'Xã', 'Phố',
  'Đường', 'Hồ', 'Sông', 'Núi', 'Đảo', 'Tầng',
  'Đông', 'Tây', 'Nam', 'Bắc', 'Trung', 'Hà Nội', 'Sài Gòn', 'TP',
];
const TITLE_WORDS = [
  'Sư Phụ', 'Đại Sư', 'Tổ Sư', 'Trưởng Lão', 'Trưởng Tộc', 'Gia Chủ', 'Chủ Tịch',
  'Tổng Giám Đốc', 'Bộ Trưởng', 'Thị Trưởng', 'Sở Trưởng',
];

// ── Gate 2: Timeline violations ──────────────────────────────────────────────

async function checkTimelineViolations(input: CanonEnforcementInput): Promise<CriticIssue[]> {
  const violations = await detectTimelineViolations(input.projectId, input.chapterNumber);
  return violations.map(desc => ({
    type: 'continuity' as const,
    severity: 'major' as const,
    description: desc,
  }));
}

// ── Gate 3: POV consistency ──────────────────────────────────────────────────

async function checkPovGate(input: CanonEnforcementInput): Promise<CriticIssue[]> {
  if (!input.expectedPov) return [];
  const violations = checkPovConsistency(input.content, {
    expectedPov: input.expectedPov,
    protagonistName: input.protagonistName,
    allowedPovCharacters: input.expectedCharacters.slice(0, 5),
  });
  return violations.map(v => ({
    type: 'quality' as const,
    severity: v.severity === 'major' ? 'major' as const : v.severity === 'moderate' ? 'moderate' as const : 'minor' as const,
    description: `POV violation [${v.type}]: ${v.description}`,
  }));
}

// ── Gate 4: Voice drift vs anchor ────────────────────────────────────────────

/**
 * Compare current chapter's voice metrics to the ch.1-3 anchor metrics.
 * If drift exceeds threshold, flag.
 */
async function checkVoiceDrift(input: CanonEnforcementInput): Promise<CriticIssue[]> {
  if (input.chapterNumber < 50) return []; // Need enough writing to expect drift.
  if (input.chapterNumber % 50 !== 0 && input.chapterNumber < 500) return []; // Cadence.

  try {
    const db = getSupabase();
    const { data: anchors } = await db
      .from('voice_anchors')
      .select('snippet_type,voice_metrics')
      .eq('project_id', input.projectId)
      .in('snippet_type', ['opening', 'narration']);

    if (!anchors?.length) return [];

    // Compute current chapter metrics from the same text.
    const currentMetrics = computeMetrics(input.content);

    // Compare to anchor average.
    const anchorMetrics = anchors
      .map(a => a.voice_metrics as { avgSentenceLength?: number; dialogueRatio?: number; emDashCount?: number; exclamationRatio?: number } | null)
      .filter(Boolean);
    if (anchorMetrics.length === 0) return [];

    const anchorAvg = {
      avgSentenceLength: avg(anchorMetrics.map(m => m!.avgSentenceLength || 0)),
      dialogueRatio: avg(anchorMetrics.map(m => m!.dialogueRatio || 0)),
      exclamationRatio: avg(anchorMetrics.map(m => m!.exclamationRatio || 0)),
    };

    const issues: CriticIssue[] = [];
    const sentenceDrift = Math.abs(currentMetrics.avgSentenceLength - anchorAvg.avgSentenceLength) / Math.max(1, anchorAvg.avgSentenceLength);
    const dialogueDrift = Math.abs(currentMetrics.dialogueRatio - anchorAvg.dialogueRatio);
    const exclamationDrift = Math.abs(currentMetrics.exclamationRatio - anchorAvg.exclamationRatio);

    if (sentenceDrift > 0.5) {
      issues.push({
        type: 'quality',
        severity: 'major',
        description: `Voice drift major: avg sentence length ${currentMetrics.avgSentenceLength.toFixed(0)} vs ch.1-3 anchor ${anchorAvg.avgSentenceLength.toFixed(0)} (${(sentenceDrift * 100).toFixed(0)}% deviation). Re-read voice anchor + restore cadence.`,
      });
    } else if (sentenceDrift > 0.3) {
      issues.push({
        type: 'quality',
        severity: 'moderate',
        description: `Voice drift: sentence length ${currentMetrics.avgSentenceLength.toFixed(0)} vs anchor ${anchorAvg.avgSentenceLength.toFixed(0)} (${(sentenceDrift * 100).toFixed(0)}% deviation).`,
      });
    }

    if (dialogueDrift > 0.3) {
      issues.push({
        type: 'dialogue',
        severity: 'moderate',
        description: `Dialogue ratio drift: ${(currentMetrics.dialogueRatio * 100).toFixed(0)}% vs anchor ${(anchorAvg.dialogueRatio * 100).toFixed(0)}%. Possible style shift.`,
      });
    }

    if (exclamationDrift > 0.2) {
      issues.push({
        type: 'quality',
        severity: 'minor',
        description: `Punctuation drift: exclamation ratio ${(currentMetrics.exclamationRatio * 100).toFixed(0)}% vs anchor ${(anchorAvg.exclamationRatio * 100).toFixed(0)}%.`,
      });
    }

    return issues;
  } catch {
    return [];
  }
}

function computeMetrics(text: string) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  const exclamations = (text.match(/!/g) || []).length;
  const dialogueParagraphs = paragraphs.filter(p => p.includes('—')).length;
  return {
    avgSentenceLength: sentences.length > 0 ? text.length / sentences.length : 0,
    dialogueRatio: paragraphs.length > 0 ? dialogueParagraphs / paragraphs.length : 0,
    exclamationRatio: sentences.length > 0 ? exclamations / sentences.length : 0,
  };
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// ── Gate 5: Sensory floor ────────────────────────────────────────────────────

/**
 * Soft gate: if sensory balance score ≤3, flag moderate. Below 2 = major.
 */
async function checkSensoryFloor(input: CanonEnforcementInput): Promise<CriticIssue[]> {
  const report = analyzeSensoryBalance(input.content);
  if (report.balanceScore <= 2) {
    return [{
      type: 'quality',
      severity: 'major',
      description: `Sensory balance ${report.balanceScore}/10 — chương quá flat (chỉ ${report.flatSenses.length === 5 ? 'có 1 giác quan' : `thiếu ${report.flatSenses.join(', ')}`}). Thêm sensory details cho immersion.`,
    }];
  }
  if (report.balanceScore <= 4 && input.content.length >= 5000) {
    return [{
      type: 'quality',
      severity: 'moderate',
      description: `Sensory balance ${report.balanceScore}/10 — thiếu giác quan: ${report.flatSenses.join(', ')}.`,
    }];
  }
  return [];
}

// ── Gate 6: Hook floor ───────────────────────────────────────────────────────

/**
 * Soft gate: opening hook score ≤3 OR closing ≤3 = moderate. Both ≤3 = major.
 */
async function checkHookFloor(input: CanonEnforcementInput): Promise<CriticIssue[]> {
  const report = evaluateHooks(input.content);
  const issues: CriticIssue[] = [];

  if (report.openingScore <= 3 && report.closingScore <= 3) {
    issues.push({
      type: 'quality',
      severity: 'major',
      description: `Cả opening (${report.openingScore}/10 ${report.openingType}) lẫn closing (${report.closingScore}/10 ${report.closingType}) đều yếu. Reader rủi ro bỏ chương.`,
    });
  } else {
    if (report.openingScore <= 3) {
      issues.push({
        type: 'quality',
        severity: 'moderate',
        description: `Opening yếu (${report.openingScore}/10 ${report.openingType}) — cần action / mystery / dialogue mạnh hơn.`,
      });
    }
    if (report.closingScore <= 3) {
      issues.push({
        type: 'quality',
        severity: 'moderate',
        description: `Closing yếu (${report.closingScore}/10 ${report.closingType}) — cần cliffhanger / reveal / mystery hook.`,
      });
    }
  }
  return issues;
}
