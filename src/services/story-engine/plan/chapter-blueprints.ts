import { getSupabase } from '../utils/supabase';
import type { StyleDirectives } from '../types';
import type { CausalLogicIssue } from '../quality/causal-logic-check';

type DbClient = ReturnType<typeof getSupabase>;

export type ChapterBlueprintStatus = 'planned' | 'used' | 'repaired' | 'invalid';

export interface ChapterBlueprint {
  project_id: string;
  chapter_number: number;
  volume_number?: number | null;
  arc_number?: number | null;
  sub_arc_number?: number | null;
  title_hint?: string | null;
  goal: string;
  conflict?: string | null;
  payoff: string;
  ending_hook?: string | null;
  cast?: string[] | null;
  location?: string | null;
  resource_ledger_delta?: string | null;
  world_state_delta?: string | null;
  species_delta?: string | null;
  template_inspiration?: string | null;
  authority_constraints?: string | null;
  forbidden_terms?: string[] | null;
  status: ChapterBlueprintStatus;
  version: number;
  actual_summary_delta?: string | null;
  meta?: Record<string, unknown> | null;
}

export interface ChapterBlueprintCoverage {
  ok: boolean;
  targetChapters: number;
  generatedChapters: number;
  missingChapters: number[];
  invalidChapters: number[];
  version: number;
}

export type BlueprintLogicIssue = CausalLogicIssue;

export function shouldRequireChapterBlueprint(styleDirectives: StyleDirectives | null | undefined): boolean {
  return styleDirectives?.require_full_chapter_blueprint === true
    || typeof styleDirectives?.chapter_blueprint_version === 'number';
}

export async function loadChapterBlueprint(
  projectId: string,
  chapterNumber: number,
  version?: number,
  db: DbClient = getSupabase(),
): Promise<ChapterBlueprint | null> {
  let query = db.from('chapter_blueprints')
    .select('*')
    .eq('project_id', projectId)
    .eq('chapter_number', chapterNumber)
    .limit(1);
  if (typeof version === 'number') query = query.eq('version', version);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`CHAPTER_BLUEPRINT_QUERY_FAILED: ${error.message}`);
  return (data as ChapterBlueprint | null) || null;
}

export async function validateChapterBlueprintCoverage(
  projectId: string,
  targetChapters: number,
  version = 1,
  db: DbClient = getSupabase(),
): Promise<ChapterBlueprintCoverage> {
  const { data, error } = await db.from('chapter_blueprints')
    .select('chapter_number,status')
    .eq('project_id', projectId)
    .eq('version', version)
    .gte('chapter_number', 1)
    .lte('chapter_number', targetChapters);
  if (error) throw new Error(`CHAPTER_BLUEPRINT_COVERAGE_FAILED: ${error.message}`);

  const seen = new Set<number>();
  const invalidChapters: number[] = [];
  for (const row of data || []) {
    const chapter = Number(row.chapter_number);
    seen.add(chapter);
    if (row.status === 'invalid') invalidChapters.push(chapter);
  }

  const missingChapters: number[] = [];
  for (let chapter = 1; chapter <= targetChapters; chapter++) {
    if (!seen.has(chapter)) missingChapters.push(chapter);
  }

  return {
    ok: missingChapters.length === 0 && invalidChapters.length === 0,
    targetChapters,
    generatedChapters: seen.size,
    missingChapters,
    invalidChapters,
    version,
  };
}

export async function assertChapterBlueprintReady(
  input: {
    projectId: string;
    chapterNumber: number;
    targetChapters: number;
    styleDirectives?: StyleDirectives | null;
  },
  db: DbClient = getSupabase(),
): Promise<ChapterBlueprint | null> {
  if (!shouldRequireChapterBlueprint(input.styleDirectives)) return null;
  const version = input.styleDirectives?.chapter_blueprint_version || 1;
  const coverage = await validateChapterBlueprintCoverage(input.projectId, input.targetChapters, version, db);
  if (!coverage.ok) {
    throw new Error(`CHAPTER_BLUEPRINT_MISSING_OR_INVALID: coverage ${coverage.generatedChapters}/${coverage.targetChapters}, missing=${coverage.missingChapters.slice(0, 12).join(',')}, invalid=${coverage.invalidChapters.slice(0, 12).join(',')}`);
  }
  const blueprint = await loadChapterBlueprint(input.projectId, input.chapterNumber, version, db);
  if (!blueprint || blueprint.status === 'invalid') {
    throw new Error(`CHAPTER_BLUEPRINT_MISSING_OR_INVALID: no valid blueprint for ch.${input.chapterNumber}`);
  }
  return blueprint;
}

export function formatChapterBlueprintContext(blueprint: ChapterBlueprint | null | undefined): string {
  if (!blueprint) return '';
  return [
    `[FULL CHAPTER BLUEPRINT — SOURCE OF TRUTH FOR CH.${blueprint.chapter_number}]`,
    `Title hint: ${blueprint.title_hint || '(writer may choose a polished title aligned with goal)'}`,
    `Position: volume ${blueprint.volume_number || '?'}, arc ${blueprint.arc_number || '?'}, sub-arc ${blueprint.sub_arc_number || '?'}`,
    `Goal: ${blueprint.goal}`,
    `Conflict: ${blueprint.conflict || '(low-friction routine obstacle)'}`,
    `Payoff: ${blueprint.payoff}`,
    `Ending hook: ${blueprint.ending_hook || '(natural continuation)'}`,
    `Cast: ${(blueprint.cast || []).join(', ') || '(only established required cast)'}`,
    `Location: ${blueprint.location || '(use established location)'}`,
    `Resource ledger delta: ${blueprint.resource_ledger_delta || '(must state source/cost if resources change)'}`,
    `World-state delta: ${blueprint.world_state_delta || '(must show visible world/system state change)'}`,
    `Species/dependent-race delta: ${blueprint.species_delta || '(if applicable, show dependent species progress)'}`,
    `Template inspiration: ${blueprint.template_inspiration || '(if applicable, transform memory/template into viable law)'}`,
    `Authority constraints: ${blueprint.authority_constraints || '(no restricted access without permission/cost/log)'}`,
    `Forbidden terms: ${(blueprint.forbidden_terms || []).join(', ') || '(none)'}`,
    'Hard rule: prose may differ, but goal/payoff/resource/authority/forbidden-term constraints must hold.',
  ].join('\n');
}

export function evaluateBlueprintAlignment(content: string, blueprint: ChapterBlueprint | null | undefined): BlueprintLogicIssue[] {
  if (!blueprint) return [];
  const issues: BlueprintLogicIssue[] = [];
  const lower = content.toLowerCase();

  for (const term of blueprint.forbidden_terms || []) {
    if (term && lower.includes(term.toLowerCase())) {
      issues.push({
        code: 'blueprint_forbidden_term',
        severity: 'critical',
        message: `Chapter uses blueprint-forbidden term "${term}".`,
        evidence: term,
      });
    }
  }

  const authority = blueprint.authority_constraints || '';
  if (/học viện|khu cấm|quyền|giám sát|hợp đồng|đăng ký/i.test(authority)) {
    const mentionsRestricted = /Học Viện|học viện|khu cấm|phòng mô phỏng|kho học viện/i.test(content);
    const hasAuthoritySignal = /đăng ký|điểm công|giám sát|hợp đồng|cho phép|quyền|bảng nhiệm vụ|công khai|theo quy trình/i.test(content);
    if (mentionsRestricted && !hasAuthoritySignal) {
      issues.push({
        code: 'authority_access_violation',
        severity: 'major',
        message: 'Chapter enters restricted academy/managed space without the authority/cost/log required by blueprint.',
        evidence: authority.slice(0, 220),
      });
    }
  }

  if (blueprint.resource_ledger_delta && /điểm công|chi phí|đổi|tiêu hao|ledger|nguồn|phần thưởng|tài nguyên|Băng Lộ|Rêu Lam|Mộc Linh/i.test(blueprint.resource_ledger_delta)) {
    const hasLedgerSignal = /điểm công|chi phí|đổi|tiêu hao|ledger|nguồn|phần thưởng|bảng giá|giao dịch|khấu trừ|thu được|mất/i.test(content);
    if (!hasLedgerSignal) {
      issues.push({
        code: 'blueprint_resource_mismatch',
        severity: 'major',
        message: 'Blueprint requires a resource/ledger delta, but chapter does not show source, cost, or gain clearly.',
        evidence: blueprint.resource_ledger_delta.slice(0, 220),
      });
    }
  }

  const payoffKeywords = extractKeywords(blueprint.payoff);
  if (payoffKeywords.length >= 2 && payoffKeywords.every((keyword) => !lower.includes(keyword))) {
    issues.push({
      code: 'blueprint_goal_mismatch',
      severity: 'major',
      message: 'Chapter appears to miss the concrete blueprint payoff.',
      evidence: blueprint.payoff.slice(0, 220),
    });
  }

  return issues;
}

export async function markChapterBlueprintUsed(
  projectId: string,
  chapterNumber: number,
  actualSummaryDelta?: string | null,
  db: DbClient = getSupabase(),
): Promise<void> {
  const { error } = await db.from('chapter_blueprints')
    .update({
      status: 'used',
      actual_summary_delta: actualSummaryDelta || null,
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', projectId)
    .eq('chapter_number', chapterNumber);
  if (error) throw new Error(`CHAPTER_BLUEPRINT_MARK_USED_FAILED: ${error.message}`);
}

function extractKeywords(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 4)
    .filter((word) => !['trong', 'chương', 'được', 'bằng', 'thành', 'nguồn', 'thêm', 'nhận', 'một'].includes(word))
    .slice(0, 8);
}
