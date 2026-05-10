/**
 * Hard causal logic gate for long-running story production.
 *
 * This catches foundation-breaking issues that normal prose quality and memory
 * continuity can miss: a weak rival getting impossible access, high-tier items
 * appearing without source/cost, or a chapter violating its current arc rail.
 */

import { getSupabase } from '../utils/supabase';
import { evaluateBlueprintAlignment, formatChapterBlueprintContext, loadChapterBlueprint } from '../plan/chapter-blueprints';
import type { CriticIssue } from '../types';

export type CausalLogicIssueCode =
  | 'authority_access_violation'
  | 'resource_without_source'
  | 'power_scale_break'
  | 'motive_missing'
  | 'arc_rail_violation'
  | 'thread_jump'
  | 'unscheduled_rival_intrusion'
  | 'literal_artifact_leak'
  | 'blueprint_goal_mismatch'
  | 'blueprint_forbidden_term'
  | 'blueprint_resource_mismatch';

export interface CausalLogicIssue {
  code: CausalLogicIssueCode;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  message: string;
  evidence?: string;
}

export interface CausalLogicContext {
  projectId?: string;
  chapterNumber: number;
  protagonistName?: string;
  focusKey?: string | null;
  arcPlanText?: string | null;
  currentBrief?: string | null;
  activeThreads?: string[];
  characterStates?: Array<{
    character_name?: string | null;
    power_level?: string | null;
    status?: string | null;
    location?: string | null;
    notes?: string | null;
  }>;
}

interface ArcRow {
  plan_text?: string | null;
  chapter_briefs?: Array<{ chapterNumber?: number; brief?: string; sceneDirection?: string; mcBenefit?: string }> | null;
}

const ARTIFACT_RE = /(^|\n)\s*(Hook|CONTEXT COMPACT|FOCUS REQUIREMENTS|YÊU CẦU OUTPUT|KHUNG CHƯƠNG|BẢN TRƯỚC BỊ CHẶN|JSON object)\s*:/i;
const ACADEMY_RE = /Học Viện|học viện|viện trưởng|phòng mô phỏng|kho học viện|khu cấm|nội viện|hồ sơ nội bộ/i;
const ILLEGAL_ACCESS_RE = /đột nhập|lẻn vào|xông vào|lọt vào|bẻ khóa|vượt rào|qua mặt|trộm|cướp|đánh cắp|lấy được/i;
const LEGAL_ACCESS_RE = /hợp đồng|giấy phép|ủy quyền|chấp thuận|cho phép|giám sát|công khai|khu giao dịch|vòng ngoài|nhiệm vụ học viện|điểm công|được mời|theo quy trình|đăng ký/i;
const SOURCE_COST_RE = /chi phí|giá|đổi lấy|khấu trừ|tiêu hao|nguồn gốc|nguồn tin|hợp đồng|nhiệm vụ|phần thưởng|điểm công|ledger|sổ|bảng giá|giao dịch|đặt cọc|bồi hoàn|giám sát|thẩm định/i;
const FREE_WITHOUT_COST_RE = /không cần (?:trả )?giá|không mất gì|miễn phí|tự nhiên có|bỗng nhiên|vô duyên vô cớ/i;
const COST_NEGATION_RE = /không có gì miễn phí|không miễn phí|chẳng có gì miễn phí/i;
const MOTIVE_RE = /vì|để|nhằm|muốn|cần|đổi lấy|lợi ích|áp lực|bị ép|được trả|hợp đồng|mục tiêu|sợ|tham|cứu|bảo vệ|đánh cược/i;
const HIGH_TIER_TERMS = [
  'Thần Cách',
  'mảnh Thần Cách',
  'kẻ săn Thần Cách',
  'sát thủ Hư Không',
  'Hư Không giáp đen',
  'tháp đen',
  'tàn tích Thần Cách',
  'thần vật',
  'lõi pháp tắc',
];
const HIGH_VALUE_ITEM_RE = /mảnh Thần Cách|Thần Cách|lõi pháp tắc|chìa khóa|bản đồ|tọa độ|cổ vật|thần vật|tàn tích|tháp đen/i;
const OBTAIN_RE = /nhận|lấy|được\s+(?:trao|giao|nhận|cấp|mở|phép)|trao|đưa|giao|cướp|đánh cắp|mở ra|kích hoạt|nhặt|chiếm|mua|đổi/i;
const NEGATED_OR_DEFERRED_RE = /không cần|không mở|không có|không phải|chưa|cấm|tránh|đừng|thay vì/i;
const RIVAL_NAMES = ['Lăng Hạo', 'Hạ Vân Chu'];
const PLOT_MOVING_RIVAL_NAMES = ['Lăng Hạo'];

export function evaluateCausalLogic(content: string, context: CausalLogicContext): CausalLogicIssue[] {
  const issues: CausalLogicIssue[] = [];
  const normalizedArc = `${context.arcPlanText || ''}\n${context.currentBrief || ''}`;
  const normalizedThreads = (context.activeThreads || []).join('\n');

  if (ARTIFACT_RE.test(content)) {
    issues.push({
      code: 'literal_artifact_leak',
      severity: 'critical',
      message: 'Prompt/outline artifact leaked into reader-facing chapter.',
      evidence: firstMatch(content, ARTIFACT_RE),
    });
  }

  for (const term of HIGH_TIER_TERMS) {
    if (forbidsTerm(normalizedArc, term) && includesLoose(content, term)) {
      issues.push({
        code: 'arc_rail_violation',
        severity: 'critical',
        message: `Chapter introduces "${term}" even though the current arc rail forbids or defers it.`,
        evidence: term,
      });
    }
  }

  if (/không\s+(?:cho|để).{0,30}(đối thủ|rival).{0,50}(đột nhập|vượt quyền|vào sâu).{0,50}Học Viện/i.test(normalizedArc)) {
    const accessIssue = detectAcademyAccessViolation(content);
    if (accessIssue) issues.push(accessIssue);
  } else {
    const accessIssue = detectAcademyAccessViolation(content);
    if (accessIssue?.severity === 'critical') {
      issues.push({ ...accessIssue, severity: 'major' });
    }
  }

  issues.push(...detectResourceWithoutSource(content));
  issues.push(...detectUnscheduledRivalIntrusion(content, context));
  issues.push(...detectThreadJumps(content, normalizedArc, normalizedThreads));
  issues.push(...detectMotiveGaps(content, context));

  return dedupeIssues(issues);
}

export function causalIssuesToCriticIssues(issues: CausalLogicIssue[]): CriticIssue[] {
  return issues.map((issue) => ({
    type: 'logic',
    severity: issue.severity,
    description: `[${issue.code}] ${issue.message}${issue.evidence ? ` Evidence: ${issue.evidence}` : ''}`,
  }));
}

export function isHardCausalIssue(issue: CausalLogicIssue): boolean {
  return issue.severity === 'critical' || issue.severity === 'major';
}

export function buildCausalLogicHealth(issues: CausalLogicIssue[]) {
  return {
    verdict: issues.some(isHardCausalIssue) ? 'block' : issues.length > 0 ? 'revise' : 'pass',
    issues,
    hardIssueCount: issues.filter(isHardCausalIssue).length,
  };
}

export async function checkCausalLogicFast(
  projectId: string,
  chapterNumber: number,
  content: string,
  options: { protagonistName?: string; focusKey?: string | null } = {},
): Promise<CausalLogicIssue[]> {
  const db = getSupabase();
  const [{ data: projectRow }, { data: arcRow }, { data: threadRows }, { data: stateRows }, blueprint] = await Promise.all([
    db.from('ai_story_projects')
      .select('style_directives')
      .eq('id', projectId)
      .maybeSingle(),
    db.from('arc_plans')
      .select('plan_text,chapter_briefs')
      .eq('project_id', projectId)
      .lte('start_chapter', chapterNumber)
      .gte('end_chapter', chapterNumber)
      .order('arc_number', { ascending: false })
      .limit(1)
      .maybeSingle(),
    db.from('plot_threads')
      .select('name,description,status,last_active_chapter')
      .eq('project_id', projectId)
      .not('status', 'in', '("resolved","legacy")')
      .order('importance', { ascending: false })
      .limit(12),
    db.from('character_states')
      .select('character_name,power_level,status,location,notes')
      .eq('project_id', projectId)
      .lt('chapter_number', chapterNumber)
      .order('chapter_number', { ascending: false })
      .limit(40),
    loadChapterBlueprint(projectId, chapterNumber).catch(() => null),
  ]);

  const arc = arcRow as ArcRow | null;
  const currentBrief = Array.isArray(arc?.chapter_briefs)
    ? arc.chapter_briefs.find((brief) => brief.chapterNumber === chapterNumber)
    : undefined;
  const styleDirectives = projectRow?.style_directives as { focus_key?: string | null } | null | undefined;

  const issues = evaluateCausalLogic(content, {
    projectId,
    chapterNumber,
    protagonistName: options.protagonistName,
    focusKey: options.focusKey ?? styleDirectives?.focus_key,
    arcPlanText: arc?.plan_text || null,
    currentBrief: [
      currentBrief?.brief,
      currentBrief?.sceneDirection,
      currentBrief?.mcBenefit,
      formatChapterBlueprintContext(blueprint),
    ].filter(Boolean).join('\n'),
    activeThreads: (threadRows || []).map((thread) => [
      thread.name,
      thread.description,
      thread.status,
      thread.last_active_chapter ? `last ch.${thread.last_active_chapter}` : '',
    ].filter(Boolean).join(': ')),
    characterStates: stateRows || [],
  });
  issues.push(...evaluateBlueprintAlignment(content, blueprint));
  return issues;
}

function detectAcademyAccessViolation(content: string): CausalLogicIssue | null {
  for (const rival of PLOT_MOVING_RIVAL_NAMES) {
    for (const window of windowsAround(content, rival, 520)) {
      if (!ACADEMY_RE.test(window)) continue;
      if (!ILLEGAL_ACCESS_RE.test(window)) continue;
      if (LEGAL_ACCESS_RE.test(window)) continue;
      return {
        code: 'authority_access_violation',
        severity: 'critical',
        message: `${rival} appears to gain academy/internal access or take academy assets without an established legal mechanism.`,
        evidence: compact(window),
      };
    }
  }
  return null;
}

function detectResourceWithoutSource(content: string): CausalLogicIssue[] {
  const issues: CausalLogicIssue[] = [];
  const matches = matchTerms(content, HIGH_VALUE_ITEM_RE);
  const seenTerms = new Set<string>();
  for (const match of matches) {
    const normalizedTerm = match.value.toLowerCase();
    if (seenTerms.has(normalizedTerm)) continue;
    const window = sliceAround(content, match.index, 420);
    if (!OBTAIN_RE.test(window)) continue;
    if (isNegatedOrDeferredMention(window, match.value)) continue;
    if (SOURCE_COST_RE.test(window) && !hasUnpaidFreeClaim(window)) continue;
    seenTerms.add(normalizedTerm);
    issues.push({
      code: 'resource_without_source',
      severity: /Thần Cách|thần vật|lõi pháp tắc/i.test(window) ? 'critical' : 'major',
      message: `High-value item/resource "${match.value}" appears without a clear source, cost, or ledger.`,
      evidence: compact(window),
    });
  }
  return issues;
}

function detectThreadJumps(content: string, arcText: string, activeThreads: string): CausalLogicIssue[] {
  const issues: CausalLogicIssue[] = [];
  const known = `${arcText}\n${activeThreads}`;
  for (const term of HIGH_TIER_TERMS) {
    if (!includesLoose(content, term)) continue;
    if (includesLoose(known, term)) continue;
    const windows = windowsAround(content, term, 220);
    if (windows.length > 0 && windows.every((window) => isNegatedOrDeferredMention(window, term))) continue;
    issues.push({
      code: 'thread_jump',
      severity: 'major',
      message: `High-tier thread "${term}" appears without being seeded in the current arc rail or active plot threads.`,
      evidence: term,
    });
  }
  return issues;
}

function hasUnpaidFreeClaim(window: string): boolean {
  if (COST_NEGATION_RE.test(window)) return false;
  return FREE_WITHOUT_COST_RE.test(window);
}

function isNegatedOrDeferredMention(window: string, term: string): boolean {
  if (hasUnpaidFreeClaim(window)) return false;
  const termIndex = window.toLowerCase().indexOf(term.toLowerCase());
  if (termIndex < 0) return false;
  const before = window.slice(Math.max(0, termIndex - 90), termIndex + term.length + 20);
  return NEGATED_OR_DEFERRED_RE.test(before);
}

function detectUnscheduledRivalIntrusion(content: string, context: CausalLogicContext): CausalLogicIssue[] {
  const issues: CausalLogicIssue[] = [];
  const brief = context.currentBrief || '';
  for (const rival of PLOT_MOVING_RIVAL_NAMES) {
    if (includesLoose(brief, rival)) continue;
    for (const window of windowsAround(content, rival, 420)) {
      const plotMoving = /hợp tác|đề nghị|giao dịch|hợp đồng|dữ liệu|bản đồ|tọa độ|dẫn|đưa|giao|lấy|mua|bán|thách|đấu|gài|bẫy/i.test(window);
      if (!plotMoving) continue;
      issues.push({
        code: 'unscheduled_rival_intrusion',
        severity: 'major',
        message: `${rival} enters a plot-moving scene even though the current chapter brief did not schedule that rival.`,
        evidence: compact(window),
      });
      break;
    }
  }
  return issues;
}

function detectMotiveGaps(content: string, context: CausalLogicContext): CausalLogicIssue[] {
  const issues: CausalLogicIssue[] = [];
  for (const rival of PLOT_MOVING_RIVAL_NAMES) {
    if (includesLoose(context.currentBrief || '', rival) && MOTIVE_RE.test(context.currentBrief || '')) {
      continue;
    }
    for (const window of windowsAround(content, rival, 360)) {
      const highImpact = /bản đồ|tọa độ|tháp|tàn tích|Học Viện|học viện|lấy|cướp|giao|đưa|dẫn/i.test(window);
      if (!highImpact) continue;
      if (MOTIVE_RE.test(window)) continue;
      issues.push({
        code: 'motive_missing',
        severity: 'major',
        message: `${rival} performs a plot-moving action without a local motive, pressure, or benefit.`,
        evidence: compact(window),
      });
      break;
    }
  }
  return issues;
}

function forbidsTerm(text: string, term: string): boolean {
  if (!text) return false;
  const escaped = escapeRegExp(term);
  return new RegExp(`không.{0,80}${escaped}|cấm.{0,80}${escaped}|tránh.{0,80}${escaped}|chưa.{0,80}${escaped}|không\\s+mở.{0,80}${escaped}`, 'i').test(text);
}

function includesLoose(text: string, term: string): boolean {
  return text.toLowerCase().includes(term.toLowerCase());
}

function windowsAround(content: string, needle: string, radius: number): string[] {
  const windows: string[] = [];
  const lower = content.toLowerCase();
  const target = needle.toLowerCase();
  let cursor = 0;
  while (true) {
    const index = lower.indexOf(target, cursor);
    if (index < 0) break;
    windows.push(sliceAround(content, index, radius));
    cursor = index + target.length;
  }
  return windows;
}

function sliceAround(content: string, index: number, radius: number): string {
  return content.slice(Math.max(0, index - radius), Math.min(content.length, index + radius));
}

function matchTerms(content: string, re: RegExp): Array<{ value: string; index: number }> {
  const global = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
  const matches: Array<{ value: string; index: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = global.exec(content)) !== null) {
    matches.push({ value: match[0], index: match.index });
  }
  return matches;
}

function firstMatch(content: string, re: RegExp): string | undefined {
  const match = content.match(re);
  return match ? compact(match[0]) : undefined;
}

function compact(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 260);
}

function dedupeIssues(issues: CausalLogicIssue[]): CausalLogicIssue[] {
  const seen = new Set<string>();
  const result: CausalLogicIssue[] = [];
  for (const issue of issues) {
    const key = `${issue.code}:${issue.message}:${issue.evidence || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(issue);
  }
  return result;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
