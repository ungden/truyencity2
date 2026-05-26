import './codex-env';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import path from 'path';
import { createOfflineSupabaseClient, shouldUseOfflineSupabase } from '../src/services/story-engine/utils/offline-supabase';
import {
  assertCoverImageFile,
  parseCoverApplyInput,
  parseContinuityExtractionPayload,
  parseStoryFactoryPayload,
  type CodexAutomationManifest,
  type CodexAutomationTask,
  type ContinuityHealthReport,
  type CoverApplyInput,
  type StoryFactoryPayload,
} from '../src/services/story-engine/codex-automation/contract';
import {
  auditContinuityWindow,
  buildHeuristicContinuityPayload,
  evaluateContinuityExtraction,
  loadContinuityEvaluationContext,
  persistContinuityMemory,
} from '../src/services/story-engine/codex-automation/continuity';
import { assembleContext, loadContext } from '../src/services/story-engine/context/assembler';
import { retrieveEntityContext, retrieveRAGContext, retrieveThemeContext } from '../src/services/story-engine/memory/rag-store';
import { buildBeatContext } from '../src/services/story-engine/memory/beat-ledger';
import { buildRuleContext } from '../src/services/story-engine/canon/world-rules';
import { buildPlotThreadContext } from '../src/services/story-engine/state/plot-threads';
import { postWriteHealthCheck } from '../src/services/story-engine/utils/post-write-health-check';
import { evaluateChapterQuality, type ChapterQualityReport } from '../src/services/story-engine/quality/quality-contract';
import { UNIVERSAL_SANG_VAN_DIRECTIVE } from '../src/services/story-engine/templates/sang-van-directives';
import { getVietnamDayBounds } from '../src/lib/utils/vietnam-time';
import type { GenreType } from '../src/services/story-engine/types';
import {
  buildGenreKnowledgeContext,
  formatKnowledgeAlignmentReport,
  GENRE_KNOWLEDGE_PACK_VERSION,
  validateKnowledgeCoverage,
} from '../src/services/story-engine/codex-automation/genre-knowledge';
import {
  appendForecastHistory,
  DEFAULT_FOCUS_PROJECT_TITLE,
  evaluateCompletionReadinessFacts,
  type CompletionReadinessReport,
} from '../src/services/story-engine/codex-automation/completion-readiness';
import {
  applyFocusPresetTemplate,
  buildFocusPresetContext,
  formatFocusPresetReport,
  getFocusPreset,
  isFocusKey,
  validateFocusPresetChapterContent,
  validateFocusPresetContinuity,
  validateFocusPresetStorySetup,
} from '../src/services/story-engine/codex-automation/focus-presets';

const explicitOfflineMode = process.argv.includes('--offline');
if (explicitOfflineMode) {
  process.env.CODEX_AUTOMATION_OFFLINE = '1';
  process.env.STORY_ENGINE_OFFLINE = '1';
} else if (
  process.env.NEXT_PUBLIC_SUPABASE_URL
  && process.env.SUPABASE_SERVICE_ROLE_KEY
) {
  process.env.CODEX_AUTOMATION_OFFLINE = '0';
  process.env.STORY_ENGINE_OFFLINE = '0';
}

const DB_MODE = shouldUseOfflineSupabase() ? 'offline' : 'live';

const db = (() => {
  if (DB_MODE === 'offline') {
    return createOfflineSupabaseClient({ rootDir: process.cwd() }) as any;
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
})();

console.log(`db_mode=${DB_MODE}`);

type Command =
  | 'plan'
  | 'rescue-rewrite'
  | 'prepare-new-story'
  | 'apply-new-story'
  | 'prepare-cover'
  | 'apply-cover'
  | 'prepare-chapter'
  | 'apply-chapter'
  | 'focus-bulk'
  | 'audit-continuity'
  | 'repair-continuity';

type AutomationMode = 'qa-slow' | 'production';

interface ProjectRow {
  id: string;
  novel_id: string;
  status: string;
  genre: string | null;
  current_chapter: number | null;
  total_planned_chapters: number | null;
  target_chapter_length: number | null;
  ai_model: string | null;
  main_character: string | null;
  world_description: string | null;
  story_outline: unknown;
  master_outline: unknown;
  style_directives: Record<string, unknown> | null;
  updated_at: string | null;
}

interface NovelRow {
  id: string;
  title: string;
  description: string | null;
  genres?: string[] | null;
  cover_url?: string | null;
  cover_prompt?: string | null;
}

interface ChapterRunMeta {
  projectId: string;
  novelId: string;
  novelTitle: string;
  genre: string | null;
  chapterNumber: number;
  targetWords: number;
  minWords: number;
  protagonistName: string;
  contextChars: number;
  preparedAt: string;
  sourceProjectStatus: string;
  sourceAiModel?: string | null;
  focusKey?: string | null;
  lockToken?: string | null;
}

interface AutomationQuotas {
  maxNewStories: number;
  maxCovers: number;
  maxChapters: number;
  newStoriesToday: number;
  coversToday: number;
  chaptersToday: number;
}

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function command(): Command {
  const raw = process.argv[2] as Command | undefined;
  const commands: Command[] = ['plan', 'rescue-rewrite', 'prepare-new-story', 'apply-new-story', 'prepare-cover', 'apply-cover', 'prepare-chapter', 'apply-chapter', 'focus-bulk', 'audit-continuity', 'repair-continuity'];
  if (raw && commands.includes(raw)) return raw;
  throw new Error(`Usage: npm run codex:automation -- <${commands.join('|')}> [options]`);
}

function numberArg(name: string, fallback: number): number {
  const raw = arg(name);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'story';
}

function safeJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function normalizeRunDir(raw: string): string {
  return path.resolve(process.cwd(), raw);
}

function outputRoot(): string {
  return path.resolve(process.cwd(), arg('out') || '.automation/automation-runs');
}

function makeRunDir(label: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const runDir = path.join(outputRoot(), `${label}-${stamp}`);
  mkdirSync(runDir, { recursive: true });
  return runDir;
}

function archiveRoot(): string {
  const dir = path.resolve(process.cwd(), '.automation/archives');
  mkdirSync(dir, { recursive: true });
  return dir;
}

type FocusRunLock = {
  focusKey: string;
  token: string;
  projectId: string;
  novelTitle: string;
  runDir: string;
  pid: number;
  acquiredAt: string;
  expiresAt: string;
};

const CANONICAL_FOCUS_TITLES: Record<string, string> = {
  'song-xuyen-trade': 'Thương Lộ Song Giới',
  'sang-the-than-minh': 'Thần Vực Khởi Nguyên: Ta Nuôi Ra Vạn Giới Thiên Đạo',
};

function lockRoot(): string {
  const dir = path.resolve(process.cwd(), '.automation/locks');
  mkdirSync(dir, { recursive: true });
  return dir;
}

function focusLockPath(focusKey: string): string {
  return path.join(lockRoot(), `${slugify(focusKey)}.json`);
}

function focusLockTtlMs(): number {
  const raw = Number(process.env.CODEX_AUTOMATION_FOCUS_LOCK_TTL_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 2 * 60 * 60 * 1000;
}

function readFocusLock(focusKey: string): FocusRunLock | null {
  const filePath = focusLockPath(focusKey);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as FocusRunLock;
  } catch {
    return null;
  }
}

function isFocusLockActive(lock: FocusRunLock | null): lock is FocusRunLock {
  if (!lock?.expiresAt) return false;
  return new Date(lock.expiresAt).getTime() > Date.now();
}

function removeFocusLock(focusKey: string): void {
  const filePath = focusLockPath(focusKey);
  if (!existsSync(filePath)) return;
  try {
    unlinkSync(filePath);
  } catch {
    // Best-effort cleanup; stale locks expire automatically.
  }
}

function acquireFocusLock(
  focusKey: string,
  project: ProjectRow,
  novel: NovelRow,
  runDir: string,
): { acquired: true; lock: FocusRunLock } | { acquired: false; activeLock: FocusRunLock } {
  const existing = readFocusLock(focusKey);
  if (isFocusLockActive(existing)) return { acquired: false, activeLock: existing };
  if (existing) removeFocusLock(focusKey);

  const now = Date.now();
  const lock: FocusRunLock = {
    focusKey,
    token: randomUUID(),
    projectId: project.id,
    novelTitle: novel.title,
    runDir,
    pid: process.pid,
    acquiredAt: new Date(now).toISOString(),
    expiresAt: new Date(now + focusLockTtlMs()).toISOString(),
  };

  try {
    writeFileSync(focusLockPath(focusKey), safeJson(lock), { encoding: 'utf-8', flag: 'wx' });
    return { acquired: true, lock };
  } catch {
    const activeLock = readFocusLock(focusKey);
    if (isFocusLockActive(activeLock)) return { acquired: false, activeLock };
    removeFocusLock(focusKey);
    writeFileSync(focusLockPath(focusKey), safeJson(lock), { encoding: 'utf-8', flag: 'wx' });
    return { acquired: true, lock };
  }
}

function releaseFocusLock(focusKey: string | null | undefined, token: string | null | undefined): void {
  if (!focusKey || !token) return;
  const existing = readFocusLock(focusKey);
  if (existing?.token !== token) return;
  removeFocusLock(focusKey);
  console.log(`focus_lock=released focus_key=${focusKey}`);
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function extractTitleAndContent(raw: string): { title: string; content: string } {
  const text = raw.replace(/\r\n/g, '\n').trim();
  const lines = text.split('\n');
  const firstNonEmptyIndex = lines.findIndex((line) => line.trim().length > 0);
  if (firstNonEmptyIndex < 0) throw new Error('chapter.md is empty');
  const first = lines[firstNonEmptyIndex].trim();
  let title = '';
  if (first.startsWith('# ')) {
    title = first.slice(2).trim();
    lines.splice(firstNonEmptyIndex, 1);
  } else if (/^title\s*:/i.test(first)) {
    title = first.replace(/^title\s*:/i, '').trim();
    lines.splice(firstNonEmptyIndex, 1);
  }
  const content = lines.join('\n').trim();
  if (!title) title = content.split('\n').find((line) => line.trim())?.trim().slice(0, 80) || 'Chuong moi';
  return { title, content };
}

function score10(report: ChapterQualityReport): number {
  return Math.round(report.score / 10);
}

function smartTruncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.floor(maxChars * 0.58))}\n\n[...lược bớt...]\n\n${value.slice(-Math.floor(maxChars * 0.38))}`;
}

async function getSystemUserId(): Promise<string> {
  const { data, error } = await db.from('profiles').select('id').limit(1);
  if (error) throw error;
  const id = data?.[0]?.id;
  if (!id) throw new Error('No user found in profiles table');
  return id;
}

async function getOrCreateCodexAuthor(): Promise<{ id: string; name: string }> {
  const { data: existing, error: existingError } = await db
    .from('ai_authors')
    .select('id,name')
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1);
  if (existingError) throw existingError;
  if (existing?.[0]?.id) return { id: existing[0].id, name: existing[0].name || 'Truyện City' };

  const id = randomUUID();
  const row = {
    id,
    name: 'Codex Thanh Chu',
    bio: 'Tác giả vận hành bởi Codex Automation, ưu tiên mạch truyện logic và payoff đều.',
    writing_style_description: 'Modern Vietnamese webnovel, coherent long-form setup, concrete payoff loops.',
    ai_prompt_persona: 'Codex Automation story operator',
    specialized_genres: ['do-thi', 'tien-hiep', 'huyen-huyen'],
    status: 'active',
  };
  const { error } = await db.from('ai_authors').insert(row);
  if (error) throw error;
  return { id, name: row.name };
}

async function countRowsToday(table: string, startIso: string, endIso: string, metaProvider?: string): Promise<number> {
  let query = db.from(table).select('id', { count: 'exact', head: true }).gte('created_at', startIso).lte('created_at', endIso);
  if (metaProvider) query = query.contains('meta', { provider: metaProvider });
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function countCodexCoversToday(startIso: string, endIso: string): Promise<number> {
  const { count, error } = await db
    .from('ai_image_jobs')
    .select('id', { count: 'exact', head: true })
    .contains('metadata', { provider: 'codex_image_tool' })
    .gte('created_at', startIso)
    .lte('created_at', endIso);
  if (error) throw error;
  return count || 0;
}

async function countCodexProjectsToday(startIso: string, endIso: string): Promise<number> {
  const { count, error } = await db
    .from('ai_story_projects')
    .select('id', { count: 'exact', head: true })
    .contains('style_directives', { codex_automation_pipeline: true })
    .gte('created_at', startIso)
    .lte('created_at', endIso);
  if (error) throw error;
  return count || 0;
}

function parseStatusFilter(): string[] {
  const raw = arg('status') || 'active,paused';
  return raw.split(',').map((item) => item.trim()).filter(Boolean);
}

function singleNovel(value: unknown): NovelRow | null {
  if (Array.isArray(value)) return (value[0] as NovelRow | undefined) || null;
  return (value as NovelRow | null) || null;
}

function metricScore100(metric: { overall_score?: number | null; meta?: Record<string, unknown> | null }): number | null {
  const contract = metric.meta?.quality_contract as { score?: number; verdict?: string } | undefined;
  if (typeof contract?.score === 'number') return contract.score;
  if (typeof metric.overall_score === 'number') return metric.overall_score * 10;
  return null;
}

function metricQualityVerdict(metric: { meta?: Record<string, unknown> | null }): 'pass' | 'revise' | 'block' | null {
  const contract = metric.meta?.quality_contract as { verdict?: string } | undefined;
  return contract?.verdict === 'pass' || contract?.verdict === 'revise' || contract?.verdict === 'block'
    ? contract.verdict
    : null;
}

function metricContinuityVerdict(metric: { meta?: Record<string, unknown> | null }): 'pass' | 'revise' | 'block' | null {
  const continuity = metric.meta?.continuity_health as { verdict?: string } | undefined;
  return continuity?.verdict === 'pass' || continuity?.verdict === 'revise' || continuity?.verdict === 'block'
    ? continuity.verdict
    : null;
}

type RescueArchiveTable =
  | 'chapters'
  | 'quality_metrics'
  | 'chapter_summaries'
  | 'character_states'
  | 'story_memory_chunks'
  | 'story_timeline'
  | 'item_events'
  | 'plot_threads'
  | 'character_relationships'
  | 'economic_ledger'
  | 'factions';

const RESCUE_TABLES: Array<{ table: RescueArchiveTable; column: 'novel_id' | 'project_id' }> = [
  { table: 'chapters', column: 'novel_id' },
  { table: 'quality_metrics', column: 'project_id' },
  { table: 'chapter_summaries', column: 'project_id' },
  { table: 'character_states', column: 'project_id' },
  { table: 'story_memory_chunks', column: 'project_id' },
  { table: 'story_timeline', column: 'project_id' },
  { table: 'item_events', column: 'project_id' },
  { table: 'plot_threads', column: 'project_id' },
  { table: 'character_relationships', column: 'project_id' },
  { table: 'economic_ledger', column: 'project_id' },
  { table: 'factions', column: 'project_id' },
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function songXuyenRewriteContract() {
  return {
    version: 'song-xuyen-trade-payoff-v2-2026-05-09',
    readerFantasy: 'Nguyen Khai khai thac chenh lech gia tri giua Sai Gon va Aram de giau len, co quyen hon, co nhieu nguon hang/khach hang hon, va ngay cang kiem soat duoc cong.',
    chapterLoop: [
      'phat hien chenh lech gia tri/nhu cau',
      'gom nguon hang hoac thong tin co gia von ro',
      'giai mot rang buoc logistics bang su thong minh cua MC',
      'chot trade/route/right/contract va an dividend cu the',
      'the gioi phan ung va mo co hoi loi nhuan lon hon',
    ],
    measurableLadders: ['capital', 'inventory', 'supply', 'customers', 'route_rights', 'faction_trust', 'team_capability', 'gate_capability'],
    hardRules: [
      'Moi chuong phai co readerPayoff.tradeDividend va readerPayoff.progressionDelta.',
      'Khong pure suffering: neu co nguy co thi nguy co phai doi duoc loi the trong chapter/window.',
      'Moi 3 chuong tang it nhat mot measurable ladder.',
      'Security/continuity puzzle khong duoc thay the trade fantasy qua nhieu chuong lien tiep.',
      'Mini-arc ket bang profitable deal/status upgrade, khong chi song sot.',
    ],
    openingRewritePlan: [
      'Ch.1: ap luc kho/no la setup, payoff phai la arbitrage dau tien co loi/asset that.',
      'Ch.2: Mai An nhin ra so lieu, bo doi bien bi mat thanh business system.',
      'Ch.3: deal dau voi Vay Dong co price lock/route right/nguon hang ky ro.',
      'Ch.4-6: scale hang thanh package lap lai, blocker nao cung bien thanh paid service hoac quyen moi.',
      'Ch.7-10: faction reaction dau tien, Khai dung ledger data de lay bao ho/khach hang/quyen route.',
    ],
  };
}

function withSongXuyenRewriteBible(project: ProjectRow): {
  worldDescription: string | null;
  storyOutline: unknown;
  masterOutline: unknown;
  styleDirectives: Record<string, unknown>;
} {
  const contract = songXuyenRewriteContract();
  const worldBase = project.world_description || '';
  const contractBlock = [
    '[SONG XUYEN TRADE PAYOFF CONTRACT V2]',
    'Truyen phai doc nhu sang van thuong mai hien dai: Nguyen Khai khong bi keo kho lien tuc.',
    'Moi chuong bat buoc co mot khoan lai hoac tien bo cu the: tien, hang, nguon cung, khach hang, quyen route, du lieu gia, uy tin phe phai, giay phep, hop dong, don bay xa hoi, hoac nang cap cong.',
    'Nguy co/leak/thu tuc chi la gia vi va phai doi duoc leverage/payoff trong chapter/window; neu chi them ap luc thi revise, khong publish.',
    'Moi 3 chuong phai tang it nhat mot ladder: capital, inventory, supply, customers, route_rights, faction_trust, team_capability, gate_capability.',
  ].join('\n');
  const worldDescription = worldBase.includes('[SONG XUYEN TRADE PAYOFF CONTRACT V2]')
    ? worldBase
    : `${worldBase.trim()}\n\n${contractBlock}`.trim();
  const storyOutline = {
    ...asRecord(project.story_outline),
    rescueRewriteContract: contract,
    tone: 'sang van trade/progression, competent, profit-forward, main ngay cang co quyen chu dong; risk phuc vu payoff, khong de main bi hanh lien tuc',
  };
  const masterOutline = {
    ...asRecord(project.master_outline),
    rescueRewriteContract: contract,
  };
  const previousStyle = project.style_directives || {};
  const styleDirectives = {
    ...previousStyle,
    focus_rescue_status: 'rewriting',
    focus_rewrite_started_at: new Date().toISOString(),
    focus_rewrite_from_chapter: 1,
    production_blocked_reason: null,
    song_xuyen_trade_payoff_contract_version: contract.version,
    song_xuyen_rewrite_contract: contract,
    disable_chapter_split: true,
    codex_automation_pipeline: true,
    codex_writer_replacement: true,
    provider: 'codex_automation',
  };
  return { worldDescription, storyOutline, masterOutline, styleDirectives };
}

async function resolveFocusProject(): Promise<{ project: ProjectRow; novel: NovelRow }> {
  const projectId = arg('project-id');
  if (projectId) return loadProject(projectId);
  const focusKey = arg('focus-key');
  if (focusKey) {
    const preset = getFocusPreset(focusKey);
    if (!preset) throw new Error(`Unsupported focus-key: ${focusKey}`);
    const { data, error } = await db
      .from('ai_story_projects')
      .select('id,novel_id,status,genre,current_chapter,total_planned_chapters,target_chapter_length,ai_model,main_character,world_description,story_outline,master_outline,style_directives,updated_at,novels!ai_story_projects_novel_id_fkey(id,title,description,genres,cover_url,cover_prompt)')
      .contains('style_directives', { focus_key: preset.key })
      .in('status', ['paused', 'active'])
      .order('updated_at', { ascending: false });
    if (error) throw error;

    if (DB_MODE === 'live' && (data?.length || 0) > 1) {
      const candidates = (data || [])
        .map((row: unknown) => {
          const novel = singleNovel((row as { novels?: unknown }).novels);
          const project = row as ProjectRow;
          return `${project.id} | ${novel?.title || 'unknown title'} | current=${project.current_chapter || 0} | status=${project.status}`;
        })
        .join('\n');
      throw new Error(`Duplicate live focus projects for focus-key=${preset.key}. Refusing to auto-pick:\n${candidates}`);
    }

    const row = data?.[0];
    const novel = singleNovel((row as { novels?: unknown } | undefined)?.novels);
    if (!row || !novel) {
      throw new Error(`No project found for focus-key=${preset.key}. Run prepare-new-story --focus-key=${preset.key} first.`);
    }
    const canonicalTitle = CANONICAL_FOCUS_TITLES[preset.key];
    if (DB_MODE === 'live' && canonicalTitle && novel.title !== canonicalTitle) {
      throw new Error(`Live focus-key=${preset.key} resolved to "${novel.title}", expected canonical "${canonicalTitle}". Refusing to use offline/duplicate focus.`);
    }
    return { project: row as ProjectRow, novel };
  }

  const { data: novels, error: novelError } = await db
    .from('novels')
    .select('id,title,description,genres,cover_url,cover_prompt')
    .eq('title', DEFAULT_FOCUS_PROJECT_TITLE)
    .limit(1);
  if (novelError) throw novelError;
  const novel = novels?.[0] as NovelRow | undefined;
  if (!novel) throw new Error(`Default focus novel not found: ${DEFAULT_FOCUS_PROJECT_TITLE}. Pass --project-id=<id>.`);

  const { data: project, error: projectError } = await db
    .from('ai_story_projects')
    .select('id,novel_id,status,genre,current_chapter,total_planned_chapters,target_chapter_length,ai_model,main_character,world_description,story_outline,master_outline,style_directives,updated_at')
    .eq('novel_id', novel.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (projectError) throw projectError;
  if (!project) throw new Error(`No project found for default focus novel: ${DEFAULT_FOCUS_PROJECT_TITLE}`);
  return { project: project as ProjectRow, novel };
}

async function fetchScopedRows(table: RescueArchiveTable, column: 'novel_id' | 'project_id', value: string): Promise<unknown[]> {
  const { data, error } = await db
    .from(table)
    .select('*')
    .eq(column, value);
  if (error) throw new Error(`Failed to fetch ${table}: ${error.message}`);
  return data || [];
}

async function countScopedRows(table: RescueArchiveTable, column: 'novel_id' | 'project_id', value: string): Promise<number> {
  const { count, error } = await db
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq(column, value);
  if (error) throw new Error(`Failed to count ${table}: ${error.message}`);
  return count || 0;
}

async function deleteScopedRows(table: RescueArchiveTable, column: 'novel_id' | 'project_id', value: string): Promise<void> {
  const { error } = await db.from(table).delete().eq(column, value);
  if (error) throw new Error(`Failed to delete ${table}: ${error.message}`);
}

async function rescueRewrite(): Promise<void> {
  const projectId = arg('project-id');
  if (!projectId) throw new Error('rescue-rewrite requires --project-id=<project-id>');
  const dryRun = hasFlag('dry-run');
  const shouldArchive = hasFlag('archive');
  const shouldWipe = hasFlag('wipe-live');
  const shouldReset = hasFlag('reset');
  if (!shouldArchive && !shouldWipe && !shouldReset) {
    throw new Error('rescue-rewrite needs at least one of --archive, --wipe-live, or --reset');
  }

  const { project, novel } = await loadProject(projectId);
  const tableValues = new Map<'novel_id' | 'project_id', string>([
    ['novel_id', novel.id],
    ['project_id', project.id],
  ]);
  const beforeCounts: Record<string, number> = {};
  const archiveTables: Record<string, unknown[]> = {};

  for (const scoped of RESCUE_TABLES) {
    const value = tableValues.get(scoped.column);
    if (!value) throw new Error(`Missing ${scoped.column} value for ${scoped.table}`);
    beforeCounts[scoped.table] = await countScopedRows(scoped.table, scoped.column, value);
    if (shouldArchive) {
      archiveTables[scoped.table] = await fetchScopedRows(scoped.table, scoped.column, value);
    }
  }

  let archivePath: string | null = null;
  if (shouldArchive) {
    archivePath = path.join(archiveRoot(), `${slugify(novel.title)}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    writeFileSync(archivePath, safeJson({
      archivedAt: new Date().toISOString(),
      dbMode: DB_MODE,
      reason: 'rescue-rewrite-before-live-wipe',
      project,
      novel,
      counts: beforeCounts,
      tables: archiveTables,
    }), 'utf-8');
  }

  const bible = withSongXuyenRewriteBible(project);
  console.log(`Rescue rewrite ${dryRun ? '(DRY RUN)' : '(APPLY)'} project=${project.id} title=${novel.title}`);
  console.log(`archive=${archivePath || 'no'} wipe_live=${shouldWipe} reset=${shouldReset}`);
  console.log(`before_counts=${JSON.stringify(beforeCounts)}`);

  if (!dryRun && shouldWipe) {
    for (const scoped of RESCUE_TABLES) {
      const value = tableValues.get(scoped.column);
      if (!value) throw new Error(`Missing ${scoped.column} value for ${scoped.table}`);
      await deleteScopedRows(scoped.table, scoped.column, value);
    }
  }

  if (!dryRun && shouldReset) {
    const resetHistory = [
      ...((project.style_directives?.focus_rewrite_history as unknown[] | undefined) || []),
      {
        at: new Date().toISOString(),
        action: 'archive_wipe_reset',
        archivePath,
        beforeCounts,
        reason: 'risk-heavy live draft failed Song Xuyen payoff contract',
      },
    ];
    const { error: resetError } = await db.from('ai_story_projects').update({
      current_chapter: 0,
      status: 'paused',
      ai_model: 'codex_automation',
      world_description: bible.worldDescription,
      story_outline: bible.storyOutline,
      master_outline: bible.masterOutline,
      style_directives: {
        ...bible.styleDirectives,
        focus_rewrite_history: resetHistory,
      },
      updated_at: new Date().toISOString(),
    }).eq('id', project.id);
    if (resetError) throw new Error(`Failed to reset project: ${resetError.message}`);
  }

  const afterCounts: Record<string, number> = {};
  for (const scoped of RESCUE_TABLES) {
    const value = tableValues.get(scoped.column);
    if (!value) throw new Error(`Missing ${scoped.column} value for ${scoped.table}`);
    afterCounts[scoped.table] = await countScopedRows(scoped.table, scoped.column, value);
  }
  const { project: afterProject } = await loadProject(project.id);
  console.log(`after_counts=${JSON.stringify(afterCounts)}`);
  console.log(`current_chapter=${afterProject.current_chapter || 0} status=${afterProject.status} focus_rescue_status=${afterProject.style_directives?.focus_rescue_status || 'none'}`);
  if (archivePath) console.log(`archive_path=${archivePath}`);
}

async function findCodexProjectNeedingCover(focusKey?: string): Promise<{ project: ProjectRow; novel: NovelRow } | null> {
  let query = db
    .from('ai_story_projects')
    .select('id,novel_id,status,genre,current_chapter,total_planned_chapters,target_chapter_length,ai_model,main_character,world_description,story_outline,master_outline,style_directives,updated_at,novels!ai_story_projects_novel_id_fkey(id,title,description,genres,cover_url,cover_prompt)')
    .contains('style_directives', { codex_automation_pipeline: true })
    .in('status', ['paused', 'active'])
    .order('updated_at', { ascending: false })
    .limit(20);
  if (focusKey) query = query.contains('style_directives', { focus_key: focusKey });
  const { data, error } = await query;
  if (error) throw error;
  for (const row of data || []) {
    const novel = singleNovel((row as { novels?: unknown }).novels);
    if (novel && !novel.cover_url) return { project: row as ProjectRow, novel };
  }
  return null;
}

async function findCodexProjectForChapter(): Promise<{ project: ProjectRow; novel: NovelRow } | null> {
  const { data, error } = await db
    .from('ai_story_projects')
    .select('id,novel_id,status,genre,current_chapter,total_planned_chapters,target_chapter_length,ai_model,main_character,world_description,story_outline,master_outline,style_directives,updated_at,novels!ai_story_projects_novel_id_fkey(id,title,description,genres,cover_url,cover_prompt)')
    .contains('style_directives', { codex_automation_pipeline: true })
    .in('status', ['paused', 'active'])
    .order('updated_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  for (const row of data || []) {
    const project = row as ProjectRow;
    const current = project.current_chapter || 0;
    const total = project.total_planned_chapters || 1000;
    const novel = singleNovel((row as { novels?: unknown }).novels);
    if (novel && current < total) return { project, novel };
  }
  return null;
}

async function findProjectForCodexChapter(excludeProjectIds: Set<string> = new Set()): Promise<{ project: ProjectRow; novel: NovelRow } | null> {
  const statuses = parseStatusFilter();
  const { data, error } = await db
    .from('ai_story_projects')
    .select('id,novel_id,status,genre,current_chapter,total_planned_chapters,target_chapter_length,ai_model,main_character,world_description,story_outline,master_outline,style_directives,updated_at,novels!ai_story_projects_novel_id_fkey(id,title,description,genres,cover_url,cover_prompt)')
    .in('status', statuses)
    .order('updated_at', { ascending: true })
    .limit(80);
  if (error) throw error;

  for (const row of data || []) {
    const project = row as ProjectRow;
    if (excludeProjectIds.has(project.id)) continue;
    const current = project.current_chapter || 0;
    const total = project.total_planned_chapters || 1000;
    const novel = singleNovel((row as { novels?: unknown }).novels);
    if (!novel || current >= total) continue;
    if (!project.main_character || !project.world_description || !project.story_outline) continue;
    const blocker = await latestContinuityBlocker(project, novel);
    if (blocker) {
      console.log(`Skip "${novel.title}" for continuity repair: ${blocker}`);
      continue;
    }
    return { project, novel };
  }
  return null;
}

async function latestContinuityBlocker(project: ProjectRow, novel: NovelRow): Promise<string | null> {
  const current = project.current_chapter || 0;
  if (current <= 0) return null;

  const [summaryRes, charactersRes, chunksRes, metricsRes] = await Promise.all([
    db.from('chapter_summaries').select('chapter_number').eq('project_id', project.id).eq('chapter_number', current).maybeSingle(),
    db.from('character_states').select('character_name', { count: 'exact', head: false }).eq('project_id', project.id).eq('chapter_number', current),
    db.from('story_memory_chunks').select('id', { count: 'exact', head: false }).eq('project_id', project.id).eq('chapter_number', current),
    db.from('quality_metrics').select('meta').eq('project_id', project.id).eq('chapter_number', current).maybeSingle(),
  ]);

  const missing: string[] = [];
  if (!summaryRes.data) missing.push('chapter_summaries');
  if ((charactersRes.data?.length || 0) === 0) missing.push('character_states');
  if ((chunksRes.data?.length || 0) === 0) missing.push('story_memory_chunks');

  const meta = metricsRes.data?.meta as { blocked_next_chapter_reason?: string; continuity_health?: ContinuityHealthReport } | null | undefined;
  if (meta?.blocked_next_chapter_reason) return meta.blocked_next_chapter_reason;
  if (meta?.continuity_health?.verdict && meta.continuity_health.verdict !== 'pass') {
    return meta.continuity_health.blockedNextChapterReason || `latest continuity verdict=${meta.continuity_health.verdict}`;
  }
  if (missing.length > 0) return `latest chapter ${current} missing ${missing.join(', ')}`;
  void novel;
  return null;
}

function writeNewStoryFiles(runDir: string, genre = 'do-thi', focusKey?: string): CodexAutomationTask {
  const storyPath = path.join(runDir, 'story.json');
  const promptPath = path.join(runDir, 'prompt.md');
  const template = applyFocusPresetTemplate({
    title: '',
    genres: [genre],
    description: '',
    mainCharacter: '',
    worldDescription: '',
    coverPrompt: '',
    setupKernel: {
      readerFantasy: '',
      protagonistEngine: '',
      pleasureLoop: ['', '', '', ''],
      systemMechanic: { name: '', input: '', output: '', limit: '', reward: '' },
      mcSecret: { secret: '', outsideWorldKnowledge: '', revealRule: '', coverStory: '' },
      benefitLoop: { goal: '', action: '', benefit: '', cadence: '' },
      interventionRule: '',
      phase1Playground: { locations: [], cast: [], resources: [], localAntagonists: [], repeatableSceneTypes: [] },
      socialReactor: { witnesses: [], reactionModes: [], reportBackCadence: '' },
      noveltyLadder: [],
      controlRules: { payoffCadence: '', attentionGradient: '', openThreadsPerArc: 3, closeThreadsPerArc: 2 },
      patternCards: [],
    },
    masterOutline: {},
    storyOutline: {},
    arcPlan: [],
    totalPlannedChapters: 1000,
  }, focusKey);
  const preset = getFocusPreset(focusKey);
  writeFileSync(storyPath, safeJson(template), 'utf-8');
  writeFileSync(promptPath, buildNewStoryPrompt((preset?.primaryGenre || genre), runDir, focusKey), 'utf-8');
  return {
    type: 'new_story',
    runDir,
    status: 'prepared',
    promptPath,
    inputPath: storyPath,
    dryRunCommand: `npm run codex:automation -- apply-new-story --run-dir=${runDir}${focusKey ? ` --focus-key=${focusKey}` : ''}`,
    applyCommand: `npm run codex:automation -- apply-new-story --run-dir=${runDir}${focusKey ? ` --focus-key=${focusKey}` : ''} --apply`,
  };
}

function buildNewStoryPrompt(genre: string, runDir: string, focusKey?: string): string {
  const preset = getFocusPreset(focusKey);
  const genreKnowledgeContext = buildGenreKnowledgeContext(genre as GenreType, preset?.subGenres || []);
  const focusPresetContext = buildFocusPresetContext(focusKey);
  return [
    '# Codex Automation: tạo truyện mới',
    '',
    'Điền file `story.json` trong thư mục này. Không gọi DeepSeek/Gemini/text API ngoài.',
    '',
    genreKnowledgeContext,
    focusPresetContext ? ['', focusPresetContext].join('\n') : '',
    '',
    'Yêu cầu:',
    `- Thể loại chính: ${genre}. ${preset ? `Bắt buộc subgenres: ${preset.subGenres.join(', ')}.` : 'Có thể thêm tối đa 3 subgenre hợp lý.'}`,
    `- BẮT BUỘC bám GENRE KNOWLEDGE CORE version ${GENRE_KNOWLEDGE_PACK_VERSION}: topic, setup, worldbuilding, MC archetype, opening engine, ladder dài hạn.`,
    preset ? `- BẮT BUỘC metadata focusKey="${preset.key}" trong story.json và setup bám preset Song Xuyên.` : '',
    '- Viết tiếng Việt, webnovel hiện đại, đọc cuốn ngay từ setup.',
    '- Phải có reader fantasy cụ thể, MC chủ động, benefit loop rõ, phase 1 playground đủ cảnh lặp.',
    '- Description là giới thiệu public 250-500 chữ, hấp dẫn nhưng không leak prompt.',
    '- World description là nội bộ 600-1800 chữ, đủ để viết 50 chương đầu không lạc.',
    '- Master outline có 8-12 arc lớn. Story outline phải chứa cast/state/worldRules/tone/antiTropes.',
    '- Arc plan tối thiểu 5 chapter brief đầu, mỗi brief có goal/conflict/payoff/hook.',
    '- Cover prompt bằng tiếng Anh, dành cho ảnh bìa 3:4, không dùng watermark ngoài title và Truyencity.com.',
    '',
    'Sau khi điền xong:',
    `npm run codex:automation -- apply-new-story --run-dir=${runDir}${focusKey ? ` --focus-key=${focusKey}` : ''}`,
    `npm run codex:automation -- apply-new-story --run-dir=${runDir}${focusKey ? ` --focus-key=${focusKey}` : ''} --apply`,
    '',
    'Lưu ý: command thật sẽ được in trong manifest; dùng đúng run-dir của task.',
  ].join('\n');
}

async function prepareNewStory(): Promise<void> {
  const focusKey = arg('focus-key');
  const preset = getFocusPreset(focusKey);
  if (focusKey && !preset) throw new Error(`Unsupported focus-key: ${focusKey}`);
  const genre = preset?.primaryGenre || arg('genre') || 'do-thi';
  const runDir = makeRunDir(`new-story-${slugify(focusKey || genre)}`);
  const task = writeNewStoryFiles(runDir, genre, focusKey);
  console.log(`Prepared new story task: ${runDir}`);
  console.log(`Prompt: ${task.promptPath}`);
  console.log(`Fill: ${task.inputPath}`);
  console.log(`Dry run: ${task.dryRunCommand}`);
  console.log(`Apply: ${task.applyCommand}`);
}

async function applyNewStory(): Promise<void> {
  const runDirArg = arg('run-dir');
  if (!runDirArg) throw new Error('apply-new-story requires --run-dir=<path>');
  const runDir = normalizeRunDir(runDirArg);
  const storyPath = path.join(runDir, 'story.json');
  if (!existsSync(storyPath)) throw new Error(`Missing ${storyPath}`);
  const apply = hasFlag('apply');
  const rawStory = JSON.parse(readFileSync(storyPath, 'utf-8'));
  const payload = parseStoryFactoryPayload(rawStory);
  const focusKey = arg('focus-key') || payload.focusKey;
  if (focusKey && !isFocusKey(focusKey)) throw new Error(`Unsupported focus-key: ${focusKey}`);
  const knowledgeReport = validateKnowledgeCoverage(payload);
  const focusReport = validateFocusPresetStorySetup(payload, focusKey);
  console.log(`Codex new story ${apply ? '(APPLY)' : '(DRY RUN)'}: ${payload.title}`);
  console.log(`genres=${payload.genres.join(',')} chapters=${payload.totalPlannedChapters}`);
  console.log(formatKnowledgeAlignmentReport(knowledgeReport));
  if (focusKey) console.log(formatFocusPresetReport(focusReport));
  if (knowledgeReport.verdict !== 'pass') {
    throw new Error(`Story setup failed genre knowledge alignment: ${knowledgeReport.verdict}`);
  }
  if (focusReport.verdict !== 'pass') {
    throw new Error(`Story setup failed focus preset alignment: ${focusReport.verdict}`);
  }
  if (!apply) {
    console.log('Dry run passed story factory + genre knowledge contracts. Add --apply to insert novel + project.');
    return;
  }

  const userId = await getSystemUserId();
  const author = await getOrCreateCodexAuthor();
  const novelId = randomUUID();
  const projectId = randomUUID();
  const primaryGenre = payload.genres[0] || 'do-thi';
  const now = new Date().toISOString();

  const novelRow = {
    id: novelId,
    title: payload.title,
    author: author.name || 'Truyện City',
    ai_author_id: author.id,
    description: payload.description,
    status: 'Đang ra',
    genres: Array.from(new Set([...payload.genres, ...(payload.subGenres || [])])),
    cover_prompt: payload.coverPrompt,
  };

  const storyOutline = {
    ...payload.storyOutline,
    setupKernel: payload.setupKernel,
    arcPlan: payload.arcPlan,
    codexAutomation: {
      provider: 'codex_automation',
      createdAt: now,
      runDir,
      focusKey: focusKey || null,
      genreKnowledge: {
        packVersion: knowledgeReport.packVersion,
        primaryGenre: knowledgeReport.genre,
        subGenres: knowledgeReport.subGenres,
        benchmarkFamilies: knowledgeReport.benchmarkFamilies,
        riskNotes: knowledgeReport.riskNotes,
        alignmentReport: knowledgeReport,
      },
    },
  };

  const projectRow = {
    id: projectId,
    user_id: userId,
    novel_id: novelId,
    genre: primaryGenre,
    main_character: payload.mainCharacter,
    world_description: payload.worldDescription,
    writing_style: 'webnovel_chinese',
    target_chapter_length: 2500,
    ai_model: 'codex_automation',
    temperature: 1.0,
    current_chapter: 0,
    total_planned_chapters: payload.totalPlannedChapters,
    status: 'paused',
    setup_stage: 'ready_to_write',
    setup_stage_attempts: 0,
    sub_genres: payload.subGenres || payload.genres.slice(1),
    mc_archetype: payload.mcArchetype || null,
    anti_tropes: payload.antiTropes || [],
    master_outline: payload.masterOutline,
    story_outline: storyOutline,
    style_directives: {
      disable_chapter_split: true,
      codex_automation_pipeline: true,
      codex_manual_pipeline: false,
      provider: 'codex_automation',
      run_dir: runDir,
      focus_key: focusKey || null,
      focus_preset_report: focusKey ? focusReport : null,
      genre_knowledge_pack_version: knowledgeReport.packVersion,
      genre_knowledge_primary: knowledgeReport.genre,
      genre_knowledge_benchmark_families: knowledgeReport.benchmarkFamilies,
      knowledge_alignment: knowledgeReport.verdict,
    },
    updated_at: now,
  };

  const { error: novelError } = await db.from('novels').insert(novelRow);
  if (novelError) throw novelError;
  const { error: projectError } = await db.from('ai_story_projects').insert(projectRow);
  if (projectError) {
    await db.from('novels').delete().eq('id', novelId);
    throw projectError;
  }
  console.log(`Inserted Codex story "${payload.title}" novel=${novelId} project=${projectId}. Project remains paused for QA.`);
}

function writeCoverFiles(runDir: string, project: ProjectRow, novel: NovelRow): CodexAutomationTask {
  const promptPath = path.join(runDir, 'prompt.md');
  const inputPath = path.join(runDir, 'cover.json');
  const coverPath = path.join(runDir, 'cover.png');
  const prompt = buildCleanCoverPrompt(novel, project);
  const input: CoverApplyInput = {
    novelId: novel.id,
    prompt,
    imagePath: coverPath,
    provider: 'codex_image_tool',
  };
  writeFileSync(inputPath, safeJson(input), 'utf-8');
  writeFileSync(promptPath, [
    '# Codex Automation: tạo ảnh bìa',
    '',
    `Truyện: ${novel.title}`,
    `Novel ID: ${novel.id}`,
    '',
    'Dùng Codex image tool để tạo một ảnh bìa 3:4 theo prompt trong `cover.json`.',
    'Lưu ảnh thành `cover.png` trong chính thư mục task này. Không gọi Gemini Image.',
    '',
    'Prompt:',
    '```text',
    prompt,
    '```',
  ].join('\n'), 'utf-8');
  return {
    type: 'cover',
    runDir,
    status: 'prepared',
    promptPath,
    inputPath,
    projectId: project.id,
    novelId: novel.id,
    novelTitle: novel.title,
    dryRunCommand: `npm run codex:automation -- apply-cover --run-dir=${runDir}`,
    applyCommand: `npm run codex:automation -- apply-cover --run-dir=${runDir} --apply`,
  };
}

function buildCleanCoverPrompt(novel: NovelRow, project: ProjectRow): string {
  const base = novel.cover_prompt || `Premium Vietnamese webnovel cover for "${novel.title}", genre ${(novel.genres || [project.genre || 'webnovel']).join(', ')}, 3:4 cover art, title text area, Truyencity.com small footer.`;
  const preset = getFocusPreset(project.style_directives?.focus_key as string | undefined);
  return [
    base,
    ...(preset ? ['', 'FOCUS PRESET COVER HINTS:', ...preset.coverPromptHints.map((hint) => `- ${hint}`)] : []),
    '',
    'STYLE OVERRIDE FOR CLEAN PREMIUM COVER:',
    '- Editorial-realistic, crisp, beautiful, modern commercial book cover.',
    '- Clean neutral white balance, natural skin tones, clear air, high dynamic range.',
    '- Use balanced cool-neutral shadows with only small controlled warm highlights.',
    '- Avoid yellow/orange/amber color cast, sepia tint, muddy shadows, greasy glow, over-saturated gold, smoky haze, blur, low contrast.',
    '- The image must look clear, fresh, realistic, sharp, and premium on mobile thumbnails.',
    '- Keep Vietnamese title text readable; no extra text except the title and Truyencity.com.',
  ].join('\n');
}

async function prepareCover(): Promise<void> {
  const novelId = arg('novel-id');
  const focusKey = arg('focus-key');
  let candidate: { project: ProjectRow; novel: NovelRow } | null = null;
  if (novelId) {
    const { data, error } = await db
      .from('ai_story_projects')
      .select('id,novel_id,status,genre,current_chapter,total_planned_chapters,target_chapter_length,ai_model,main_character,world_description,story_outline,master_outline,style_directives,updated_at,novels!ai_story_projects_novel_id_fkey(id,title,description,genres,cover_url,cover_prompt)')
      .eq('novel_id', novelId)
      .maybeSingle();
    if (error) throw error;
    const novel = singleNovel((data as { novels?: unknown } | null)?.novels);
    if (data && novel) candidate = { project: data as ProjectRow, novel };
  } else {
    candidate = await findCodexProjectNeedingCover(focusKey);
  }
  if (!candidate) throw new Error('No Codex automation novel needing cover found');
  const runDir = makeRunDir(`cover-${slugify(candidate.novel.title)}`);
  const task = writeCoverFiles(runDir, candidate.project, candidate.novel);
  console.log(`Prepared cover task: ${runDir}`);
  console.log(`Prompt: ${task.promptPath}`);
  console.log(`Create image file before apply: ${path.join(runDir, 'cover.png')}`);
  console.log(`Dry run: ${task.dryRunCommand}`);
  console.log(`Apply: ${task.applyCommand}`);
}

async function applyCover(): Promise<void> {
  const runDirArg = arg('run-dir');
  if (!runDirArg) throw new Error('apply-cover requires --run-dir=<path>');
  const runDir = normalizeRunDir(runDirArg);
  const inputPath = path.join(runDir, 'cover.json');
  if (!existsSync(inputPath)) throw new Error(`Missing ${inputPath}`);
  const apply = hasFlag('apply');
  const input = parseCoverApplyInput(JSON.parse(readFileSync(inputPath, 'utf-8')));
  const imagePath = path.resolve(runDir, input.imagePath);
  const fileInfo = assertCoverImageFile(imagePath);
  console.log(`Codex cover ${apply ? '(APPLY)' : '(DRY RUN)'} novel=${input.novelId} file=${imagePath} mime=${fileInfo.mimeType}`);
  if (!apply) {
    console.log('Dry run passed cover contract. Add --apply to upload and update novels.cover_url.');
    return;
  }

  const userId = await getSystemUserId();
  const buffer = readFileSync(imagePath);
  const fileName = `codex-${input.novelId}-${Date.now()}${path.extname(imagePath).toLowerCase()}`;
  const { error: uploadError } = await db.storage.from('covers').upload(fileName, buffer, {
    contentType: fileInfo.mimeType,
    cacheControl: '3600',
    upsert: true,
  });
  if (uploadError) throw uploadError;
  const { data: publicUrlData } = db.storage.from('covers').getPublicUrl(fileName);
  if (!publicUrlData?.publicUrl) throw new Error('Failed to get public URL for uploaded cover');
  const publicUrl = publicUrlData.publicUrl;

  const { error: novelError } = await db.from('novels').update({ cover_url: publicUrl }).eq('id', input.novelId);
  if (novelError) throw novelError;
  const { error: jobError } = await db.from('ai_image_jobs').insert({
    user_id: userId,
    novel_id: input.novelId,
    prompt: input.prompt,
    status: 'completed',
    result_url: publicUrl,
    metadata: {
      provider: 'codex_image_tool',
      run_dir: runDir,
      image_path: imagePath,
      file_name: fileName,
      size_bytes: fileInfo.sizeBytes,
    },
  });
  if (jobError) throw jobError;
  console.log(`Uploaded Codex cover and updated novel ${input.novelId}: ${publicUrl}`);
}

async function loadProject(projectId: string): Promise<{ project: ProjectRow; novel: NovelRow }> {
  const { data: project, error: projectError } = await db
    .from('ai_story_projects')
    .select('id,novel_id,status,genre,current_chapter,total_planned_chapters,target_chapter_length,ai_model,main_character,world_description,story_outline,master_outline,style_directives,updated_at')
    .eq('id', projectId)
    .maybeSingle();
  if (projectError) throw projectError;
  if (!project) throw new Error(`Project not found: ${projectId}`);

  const { data: novel, error: novelError } = await db
    .from('novels')
    .select('id,title,description,genres,cover_url,cover_prompt')
    .eq('id', project.novel_id)
    .maybeSingle();
  if (novelError) throw novelError;
  if (!novel) throw new Error(`Novel not found: ${project.novel_id}`);
  return { project: project as ProjectRow, novel: novel as NovelRow };
}

async function evaluateCompletionReadiness(project: ProjectRow, novel: NovelRow): Promise<CompletionReadinessReport> {
  const styleDirectives = project.style_directives || {};
  const forecastChapters = Number(styleDirectives.forecast_chapters || project.total_planned_chapters || 1000);
  const [metricsRes, threadsRes] = await Promise.all([
    db
      .from('quality_metrics')
      .select('chapter_number,overall_score,ending_hook_score,meta')
      .eq('project_id', project.id)
      .order('chapter_number', { ascending: false })
      .limit(20),
    db
      .from('plot_threads')
      .select('priority,status,target_payoff_chapter,payoff_description')
      .eq('project_id', project.id),
  ]);
  if (metricsRes.error) throw metricsRes.error;
  if (threadsRes.error) throw threadsRes.error;

  const metrics = (metricsRes.data || []) as Array<{
    chapter_number: number;
    overall_score: number | null;
    ending_hook_score: number | null;
    meta: Record<string, unknown> | null;
  }>;
  const latestMetric = metrics[0];
  const scores = metrics.map(metricScore100).filter((score): score is number => typeof score === 'number');
  const verdicts = metrics.map(metricQualityVerdict).filter(Boolean);
  const recentPassCount = verdicts.filter((verdict) => verdict === 'pass').length;
  const recentBlockCount = verdicts.filter((verdict) => verdict === 'block').length;
  const recentReviseCount = verdicts.filter((verdict) => verdict === 'revise').length;
  const recentAverageScore = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null;
  const recentPassRate = verdicts.length ? Number((recentPassCount / verdicts.length).toFixed(2)) : null;
  const windows = [metrics.slice(0, 5), metrics.slice(5, 10), metrics.slice(10, 15), metrics.slice(15, 20)].filter((window) => window.length >= 5);
  const recentEndingGreenWindows = windows.filter((window) =>
    window.every((metric) => (metric.ending_hook_score ?? 0) >= 7 && metricQualityVerdict(metric) === 'pass')
  ).length;

  const threads = (threadsRes.data || []) as Array<{
    status: string | null;
    priority: string | null;
    target_payoff_chapter: number | null;
    payoff_description: string | null;
  }>;
  const openThreads = threads.filter((thread) => thread.status !== 'resolved' && thread.status !== 'legacy');
  const openCriticalThreads = openThreads.filter((thread) => thread.priority === 'critical').length;
  const openMainThreads = openThreads.filter((thread) => thread.priority === 'main').length;
  const openSubThreads = openThreads.filter((thread) => thread.priority !== 'critical' && thread.priority !== 'main').length;
  const majorThreadsWithPayoffPlan = openThreads.filter((thread) =>
    (thread.priority === 'critical' || thread.priority === 'main') &&
    (thread.target_payoff_chapter || thread.payoff_description)
  ).length;

  void novel;
  return evaluateCompletionReadinessFacts({
    projectId: project.id,
    currentChapter: project.current_chapter || 0,
    forecastChapters,
    finaleMode: styleDirectives.focus_bulk_stage === 'finale' || styleDirectives.finale_mode === true,
    finalChapterClosed: styleDirectives.final_chapter_closed === true,
    latestContinuityVerdict: latestMetric ? metricContinuityVerdict(latestMetric) : null,
    latestMemoryOk: latestMetric ? ((latestMetric.meta?.health as { ok?: boolean } | undefined)?.ok ?? null) : null,
    latestQualityVerdict: latestMetric ? metricQualityVerdict(latestMetric) : null,
    recentPassRate,
    recentAverageScore,
    recentBlockCount,
    recentReviseCount,
    recentEndingGreenWindows,
    openCriticalThreads,
    openMainThreads,
    openSubThreads,
    majorThreadsWithPayoffPlan,
    unresolvedCliffhanger: styleDirectives.unresolved_cliffhanger === true,
  });
}

async function applyCompletionDirectives(
  project: ProjectRow,
  novel: NovelRow,
  report: CompletionReadinessReport,
  dryRun: boolean,
): Promise<ProjectRow> {
  const now = new Date().toISOString();
  let styleDirectives = appendForecastHistory(project.style_directives, report, now);
  styleDirectives = {
    ...styleDirectives,
    codex_focus_bulk: true,
    focus_bulk_last_readiness: report,
    focus_bulk_last_checked_at: now,
  };
  if (report.shouldEnterFinale) {
    styleDirectives = {
      ...styleDirectives,
      focus_bulk_stage: 'finale',
      finale_mode: true,
      finale_entered_at: (styleDirectives.finale_entered_at as string | undefined) || now,
    };
  }

  if (dryRun) return { ...project, style_directives: styleDirectives };

  const projectUpdate: Record<string, unknown> = {
    style_directives: styleDirectives,
    updated_at: now,
  };
  if (report.shouldExtendForecast && report.nextForecastChapters) {
    projectUpdate.total_planned_chapters = report.nextForecastChapters;
  }
  if (report.shouldMarkCompleted) {
    projectUpdate.status = 'completed';
    projectUpdate.setup_stage = 'completed';
  }
  const { data: updatedProject, error: projectError } = await db
    .from('ai_story_projects')
    .update(projectUpdate)
    .eq('id', project.id)
    .select('id,novel_id,status,genre,current_chapter,total_planned_chapters,target_chapter_length,ai_model,main_character,world_description,story_outline,master_outline,style_directives,updated_at')
    .maybeSingle();
  if (projectError) throw projectError;
  if (report.shouldMarkCompleted) {
    const { error: novelError } = await db.from('novels').update({ status: 'Hoàn thành' }).eq('id', novel.id);
    if (novelError) throw novelError;
  }
  return (updatedProject as ProjectRow | null) || { ...project, ...projectUpdate };
}

function buildChapterPrompt(meta: ChapterRunMeta, novel: NovelRow, project: ProjectRow, context: string): string {
  const finaleMode = project.style_directives?.focus_bulk_stage === 'finale' || project.style_directives?.finale_mode === true;
  const focusKey = project.style_directives?.focus_key as string | undefined;
  const focusPresetContext = buildFocusPresetContext(focusKey);
  const rescueStatus = project.style_directives?.focus_rescue_status;
  const rescue = project.style_directives?.focus_rescue as { reason?: string; new_supreme_contract?: unknown; openingRewriteDirection?: unknown } | undefined;
  const rewriteContract = project.style_directives?.song_xuyen_rewrite_contract || project.style_directives?.focus_rescue;
  return [
    '# Codex Automation: viết chương truyện',
    '',
    'Bạn là Codex Automation writer. Không gọi DeepSeek/Gemini/text API ngoài.',
    '',
    `Truyện: ${novel.title}`,
    `Chương: ${meta.chapterNumber}`,
    `Thể loại: ${project.genre || 'unknown'}`,
    `Nhân vật chính: ${meta.protagonistName}`,
    `Nguồn project: status=${meta.sourceProjectStatus}, ai_model=${meta.sourceAiModel || 'unknown'}.`,
    `Mục tiêu độ dài: ${meta.targetWords}-${Math.round(meta.targetWords * 1.2)} từ, tối thiểu ${meta.minWords} từ.`,
    '',
    'QUALITY CONTRACT:',
    '- Viết tiếng Việt thuần, chỉ nội dung chương.',
    '- Dòng đầu là tiêu đề dạng "# <tên chương>".',
    '- Một chương đầy đủ, không chia đôi, không meta-commentary, không nhắc prompt/model/API.',
    UNIVERSAL_SANG_VAN_DIRECTIVE,
    '- MC có lựa chọn chủ động, lợi ích cụ thể, payoff rõ.',
    '- Ít nhất 3 dòng thoại có action/reaction beat.',
    '- Có nội tâm, cảm giác thân thể/không gian, chi tiết cụ thể.',
    '- Kết chương có hook cụ thể, không cliffhanger rỗng.',
    '- Không leak marker context như [WORLD DESCRIPTION], [STORY KERNEL], [VOLUME CONTEXT].',
    '- Đây là drop-in replacement cho writer API cũ: giữ canon, arc, summaries, state và nhịp truyện từ context; chỉ thay người viết bằng Codex.',
    '- Nếu truyện cũ đang ở chương sâu, tiếp tục đúng mạch hiện tại, không reset premise, không đổi MC, không giới thiệu lại từ đầu.',
    finaleMode
      ? '- FOCUS BULK FINALE MODE: gom tuyến đã gieo, trả payoff có thứ tự, không mở đại tuyến mới trừ khi cần cho epilogue.'
      : '- FOCUS BULK CONTINUE MODE: tiếp tục mở rộng tuyến đang có, không ép kết chỉ vì chạm forecast chapter.',
    rescueStatus === 'needs_rewrite' || rescueStatus === 'rewriting'
      ? '- RESCUE REWRITE MODE: viết lại từ chương 1 theo contract mới; không tiếp tục nhịp procedural/risk-heavy của bản cũ.'
      : '',
    '',
    'CONTINUITY ARTIFACT BẮT BUỘC:',
    '- Sau khi viết `chapter.md`, điền file `continuity.json` trong cùng thư mục.',
    '- Artifact này thay cho semantic extraction API cũ; không gọi DeepSeek/Gemini.',
    '- Ghi đủ summary, openingSentence, mcState, cliffhanger, characters, timeline, itemEvents, plotThreads, relationships, economicLedger, factions.',
    '- Ghi readerPayoff: tradeDividend/progressionDelta/comfortOrSwaggerBeat/nextProfitHook để quality gate nhìn thấy chương này trả sảng gì cho độc giả.',
    '- characters BẮT BUỘC có MC và các nhân vật có tên xuất hiện trong chương.',
    '- itemEvents chỉ ghi vật phẩm/tài nguyên thật sự quan trọng; nếu dùng/mất item thì ledger phải có nguồn sở hữu.',
    '- plotThreads chỉ ghi promise dài hạn hoặc tuyến được đóng/mở rõ, không ghi beat nhỏ một chương.',
    focusKey === 'song-xuyen-trade'
      ? '- SONG XUYEN: mọi giao dịch/vận chuyển/bù trừ giá trị PHẢI ghi itemEvents + economicLedger + tradeLedger + worldStateDeltas; không để hàng hóa/tài nguyên xuất hiện không nguồn.'
      : '',
    focusKey === 'song-xuyen-trade'
      ? '- SONG XUYEN SẢNG PAYOFF: mỗi chương phải cho MC lãi rõ một thứ cụ thể (tiền/hàng/khách/quyền route/dữ liệu giá/uy tín faction/giấy phép/hợp đồng/đòn bẩy). Không viết chuỗi chương chỉ khổ, chỉ bị dí, chỉ dập cháy.'
      : '',
    focusKey === 'song-xuyen-trade'
      ? '- SONG XUYEN MODERN WEBNOVEL: nguy cơ chỉ là gia vị. Core chapter loop phải là: phát hiện chênh lệch -> thao tác logistics/thông tin -> ăn lợi ích -> bị thế giới phản ứng -> mở cơ hội kiếm lợi lớn hơn. Không viết kiểu ngược văn nơi main càng làm càng khổ mà không lãi.'
      : '',
    focusKey === 'sang-the-than-minh'
      ? '- SANG THE: mọi thay đổi về Thần Vực/tiểu thế giới, pháp tắc, sinh thái, chủng tộc/quyến thuộc, tín ngưỡng, tài nguyên và cấp bậc PHẢI ghi worldStateDeltas + factions/plotThreads + itemEvents/economicLedger nếu có tài nguyên; không nâng cấp thế giới vô nguồn.'
      : '',
    focusKey === 'thien-dao-thu-vien'
      ? '- THIEN DAO THU VIEN: khi khắc/công bố chương/sách hoặc có độc giả lĩnh ngộ, continuity.json PHẢI ghi tác phẩm đang viết, template ledger/xương sống nguyên tác, võ học/công pháp phát sinh, độc giả/faction phản ứng, danh vọng/điểm công nhận/quyền đăng và payoff cho MC.'
      : '',
    focusKey === 'thien-dao-thu-vien'
      ? '- THIEN DAO TAC GIA SẢNG PAYOFF: mỗi chương phải có dopamine loop Tác Gia: template Trái Đất -> bút danh ẩn danh khắc trong thức hải -> độc giả gọi trong đầu nhập tâm/lĩnh ngộ -> bảng xếp hạng/thư bình/Thiên Đạo công nhận -> Lâm Mặc có lợi ích cụ thể. Không biến thành thuần combat võ giả, không nộp giấy tờ vật lý, không điều tra tổ chức đen.'
      : '',
    focusPresetContext ? ['', focusPresetContext].join('\n') : '',
    rewriteContract
      ? [
          '',
          '[FOCUS RESCUE CONTRACT]',
          rescue?.reason ? `Reason: ${rescue.reason}` : '',
          JSON.stringify(rewriteContract, null, 2),
          '[/FOCUS RESCUE CONTRACT]',
        ].filter(Boolean).join('\n')
      : '',
    '',
    'continuity.json schema mẫu:',
    '```json',
    JSON.stringify({
      summary: '2-5 câu, có tên MC, nêu sự kiện và payoff chính của chương.',
      openingSentence: 'Câu mở đầu chương, nguyên văn hoặc gần nguyên văn.',
      mcState: 'Trạng thái cuối chương của MC: vị trí, mục tiêu, tài nguyên, quan hệ, vấn đề còn mở.',
      cliffhanger: 'Tình huống hoặc câu hỏi kéo chương sau.',
      readerPayoff: {
        tradeDividend: 'MC lãi cụ thể gì trong chương: tiền, hàng, khách, quyền route, dữ liệu giá, uy tín, giấy phép, hợp đồng, nguồn cung, đòn bẩy.',
        progressionDelta: 'MC mạnh lên/giàu lên/kiểm soát tốt hơn ở điểm nào, đo được ra sao.',
        comfortOrSwaggerBeat: 'Khoảnh khắc sảng/đã: chốt deal, người khác công nhận, main xử lý gọn, lợi thế hiện ra.',
        nextProfitHook: 'Cơ hội kiếm lợi kế tiếp, không chỉ nguy cơ kế tiếp.',
      },
      characters: [
        {
          characterName: meta.protagonistName,
          status: 'alive',
          powerLevel: null,
          powerRealmIndex: null,
          location: null,
          personalityQuirks: null,
          notes: 'Biến động trạng thái quan trọng trong chương.',
        },
      ],
      timeline: {
        inWorldDateText: null,
        daysElapsedSinceStart: null,
        season: null,
        mcAge: null,
        explicitInChapter: false,
        notes: null,
      },
      itemEvents: [],
      plotThreads: [],
      relationships: [],
      economicLedger: [],
      tradeLedger: [],
      worldStateDeltas: [],
      factions: [],
    }, null, 2),
    '```',
    '',
    'CONTEXT:',
    '```text',
    context,
    '```',
  ].join('\n');
}

async function writeChapterFiles(
  runDir: string,
  project: ProjectRow,
  novel: NovelRow,
  options: { focusKey?: string | null; lockToken?: string | null } = {},
): Promise<CodexAutomationTask> {
  const chapterNumber = numberArg('chapter', (project.current_chapter || 0) + 1);
  const targetWords = numberArg('target-words', Math.max(2200, project.target_chapter_length || 2400));
  const minWords = numberArg('min-words', Math.min(2000, Math.floor(targetWords * 0.82)));
  const contextPayload = await loadContext(project.id, novel.id, chapterNumber);
  const characters = contextPayload.knownCharacterNames.length > 0
    ? contextPayload.knownCharacterNames
    : [project.main_character || 'nhan vat chinh'];
  const arcNumber = Math.ceil(chapterNumber / 20);
  try {
    const [ragCtx, entityCtx, themeCtx, plotCtx, beatCtx, ruleCtx] = await Promise.all([
      retrieveRAGContext(
        project.id,
        chapterNumber,
        contextPayload.arcPlan?.slice(0, 300) || null,
        contextPayload.previousCliffhanger || null,
        project.main_character || 'nhan vat chinh',
      ).catch(() => null),
      retrieveEntityContext(project.id, chapterNumber, characters).catch(() => null),
      retrieveThemeContext(
        project.id,
        chapterNumber,
        contextPayload.arcPlan?.slice(0, 200) || null,
        contextPayload.synopsis?.slice(0, 200) || null,
      ).catch(() => null),
      buildPlotThreadContext(project.id, chapterNumber, characters, arcNumber).catch(() => null),
      buildBeatContext(project.id, chapterNumber, arcNumber).catch(() => null),
      buildRuleContext(
        project.id,
        chapterNumber,
        [
          contextPayload.previousCliffhanger || '',
          contextPayload.chapterBrief || '',
          (contextPayload.arcPlan || '').slice(0, 800),
        ].filter(Boolean).join('\n').slice(0, 2000),
        characters,
      ).catch(() => null),
    ]);
    const ragParts = [ragCtx, entityCtx, themeCtx].filter(Boolean) as string[];
    if (ragParts.length > 0) contextPayload.ragContext = smartTruncate(ragParts.join('\n\n'), 6000);
    if (plotCtx) contextPayload.plotThreads = plotCtx;
    if (beatCtx) contextPayload.beatGuidance = beatCtx;
    if (ruleCtx) contextPayload.worldRules = ruleCtx;
  } catch {
    // Non-fatal; base context is still enough for dry-run repair flows.
  }
  const context = assembleContext(contextPayload, chapterNumber);
  const meta: ChapterRunMeta = {
    projectId: project.id,
    novelId: novel.id,
    novelTitle: novel.title,
    genre: project.genre,
    chapterNumber,
    targetWords,
    minWords,
    protagonistName: project.main_character || 'nhan vat chinh',
    contextChars: context.length,
    preparedAt: new Date().toISOString(),
    sourceProjectStatus: project.status,
    sourceAiModel: project.ai_model || null,
    focusKey: options.focusKey || (project.style_directives?.focus_key as string | undefined) || null,
    lockToken: options.lockToken || null,
  };
  const metaPath = path.join(runDir, 'meta.json');
  const promptPath = path.join(runDir, 'prompt.md');
  const chapterPath = path.join(runDir, 'chapter.md');
  const continuityPath = path.join(runDir, 'continuity.json');
  writeFileSync(metaPath, safeJson(meta), 'utf-8');
  writeFileSync(path.join(runDir, 'context.txt'), context, 'utf-8');
  writeFileSync(chapterPath, `# ${novel.title} - Chương ${chapterNumber}\n\n`, 'utf-8');
  writeFileSync(continuityPath, safeJson({
    summary: '',
    openingSentence: '',
      mcState: '',
      cliffhanger: '',
      readerPayoff: {
        tradeDividend: null,
        progressionDelta: null,
        comfortOrSwaggerBeat: null,
        nextProfitHook: null,
      },
      characters: [{
      characterName: meta.protagonistName,
      status: 'alive',
      powerLevel: null,
      powerRealmIndex: null,
      location: null,
      personalityQuirks: null,
      notes: '',
    }],
    timeline: {
      inWorldDateText: null,
      daysElapsedSinceStart: null,
      season: null,
      mcAge: null,
      explicitInChapter: false,
      notes: null,
    },
    itemEvents: [],
    plotThreads: [],
    relationships: [],
    economicLedger: [],
    tradeLedger: [],
    worldStateDeltas: [],
    factions: [],
  }), 'utf-8');
  writeFileSync(promptPath, buildChapterPrompt(meta, novel, project, context), 'utf-8');
  return {
    type: 'chapter',
    runDir,
    status: 'prepared',
    promptPath,
    inputPath: chapterPath,
    projectId: project.id,
    novelId: novel.id,
    novelTitle: novel.title,
    dryRunCommand: `npm run codex:automation -- apply-chapter --run-dir=${runDir}`,
    applyCommand: `npm run codex:automation -- apply-chapter --run-dir=${runDir} --apply`,
  };
}

async function prepareChapter(): Promise<void> {
  const projectId = arg('project-id');
  const candidate = projectId ? await loadProject(projectId) : await findProjectForCodexChapter();
  if (!candidate) throw new Error('No project ready for Codex chapter writing found');
  const runDir = makeRunDir(`${slugify(candidate.novel.title)}-ch${(candidate.project.current_chapter || 0) + 1}`);
  const task = await writeChapterFiles(runDir, candidate.project, candidate.novel);
  console.log(`Prepared chapter task: ${runDir}`);
  console.log(`Prompt: ${task.promptPath}`);
  console.log(`Write: ${task.inputPath}`);
  console.log(`Fill continuity: ${path.join(runDir, 'continuity.json')}`);
  console.log(`Dry run: ${task.dryRunCommand}`);
  console.log(`Apply: ${task.applyCommand}`);
}

function printQualityReport(report: ChapterQualityReport): void {
  console.log(`quality_verdict=${report.verdict} score=${report.score}/100`);
  console.log([
    `metrics: words=${report.metrics.wordCount}`,
    `ratio=${report.metrics.wordRatio}`,
    `dialogue=${report.metrics.dialogueLines}`,
    `sensory=${report.metrics.sensoryHits}`,
    `inner=${report.metrics.innerHits}`,
    `agency=${report.metrics.agencyHits}`,
    `payoff=${report.metrics.payoffHits}`,
    `hook=${report.metrics.endingHook ? 'yes' : 'no'}`,
  ].join(' | '));
  for (const issue of report.issues) console.log(`- [${issue.severity}] ${issue.code}: ${issue.message}`);
  for (const fix of report.suggestedFixes) console.log(`fix: ${fix}`);
}

function printContinuityReport(report: ContinuityHealthReport): void {
  console.log(`continuity_verdict=${report.verdict}`);
  if (Object.keys(report.memoryRowsWritten).length > 0) {
    console.log(`memory_rows=${JSON.stringify(report.memoryRowsWritten)}`);
  }
  for (const issue of report.issues) console.log(`- [${issue.severity}] ${issue.code}: ${issue.message}`);
  if (report.blockedNextChapterReason) console.log(`blocked_next_chapter_reason=${report.blockedNextChapterReason}`);
}

async function applyChapter(): Promise<void> {
  const runDirArg = arg('run-dir');
  if (!runDirArg) throw new Error('apply-chapter requires --run-dir=<path>');
  const runDir = normalizeRunDir(runDirArg);
  const metaPath = path.join(runDir, 'meta.json');
  const chapterPath = path.join(runDir, 'chapter.md');
  const continuityPath = path.join(runDir, 'continuity.json');
  if (!existsSync(metaPath)) throw new Error(`Missing ${metaPath}`);
  if (!existsSync(chapterPath)) throw new Error(`Missing ${chapterPath}`);
  if (!existsSync(continuityPath)) throw new Error(`Missing ${continuityPath}. Codex apply now requires continuity.json.`);
  const apply = hasFlag('apply');
  const meta = JSON.parse(readFileSync(metaPath, 'utf-8')) as ChapterRunMeta;
  const { project, novel } = await loadProject(meta.projectId);
  const { title, content } = extractTitleAndContent(readFileSync(chapterPath, 'utf-8'));
  const continuityPayload = parseContinuityExtractionPayload(JSON.parse(readFileSync(continuityPath, 'utf-8')));
  const words = wordCount(content);
  const qualityReport = evaluateChapterQuality(content, {
    title,
    protagonistName: meta.protagonistName,
    targetWords: meta.targetWords,
    minWords: meta.minWords,
    genre: meta.genre,
    worldDescription: project.world_description,
  });
  const continuityContext = await loadContinuityEvaluationContext(
    db,
    meta.projectId,
    meta.chapterNumber,
    meta.protagonistName,
  );
  const continuityReport = evaluateContinuityExtraction(continuityPayload, continuityContext);
  const focusKey = project.style_directives?.focus_key as string | undefined;
  const focusChapterReport = validateFocusPresetChapterContent({
    chapterNumber: meta.chapterNumber,
    content,
    protagonistName: meta.protagonistName,
  }, focusKey);
  const focusContinuityReport = validateFocusPresetContinuity(continuityPayload, focusKey);

  console.log(`Codex automation chapter ${apply ? '(APPLY)' : '(DRY RUN)'}\nproject=${meta.projectId}\nnovel=${novel.title}\nchapter=${meta.chapterNumber}\ntitle=${title}\nwords=${words}`);
  printQualityReport(qualityReport);
  printContinuityReport(continuityReport);
  if (focusKey) {
    console.log(formatFocusPresetReport(focusChapterReport));
    console.log(formatFocusPresetReport(focusContinuityReport));
  }

  if (qualityReport.verdict !== 'pass') {
    console.error(`Quality contract failed with verdict=${qualityReport.verdict}. Chapter was NOT written to DB.`);
    process.exit(1);
  }
  if (continuityReport.verdict !== 'pass') {
    console.error(`Continuity contract failed with verdict=${continuityReport.verdict}. Chapter was NOT written to DB.`);
    process.exit(1);
  }
  if (focusContinuityReport.verdict !== 'pass') {
    console.error(`Focus continuity contract failed with verdict=${focusContinuityReport.verdict}. Chapter was NOT written to DB.`);
    process.exit(1);
  }
  if (focusChapterReport.verdict !== 'pass') {
    console.error(`Focus chapter content contract failed with verdict=${focusChapterReport.verdict}. Chapter was NOT written to DB.`);
    process.exit(1);
  }
  if (!apply) {
    console.log('Dry run passed quality + continuity contracts. Add --apply to write chapter, memory spine, quality_metrics, and current_chapter.');
    return;
  }

  const now = new Date().toISOString();
  const { error: chapterError } = await db.from('chapters').upsert({
    novel_id: meta.novelId,
    chapter_number: meta.chapterNumber,
    title,
    content,
    quality_score: score10(qualityReport),
  }, { onConflict: 'novel_id,chapter_number' });
  if (chapterError) throw chapterError;

  const memoryRowsWritten = await persistContinuityMemory({
    db,
    projectId: meta.projectId,
    novelId: meta.novelId,
    chapterNumber: meta.chapterNumber,
    title,
    content,
    protagonistName: meta.protagonistName,
    payload: continuityPayload,
  });
  const memoryHealth = await postWriteHealthCheck(meta.projectId, meta.chapterNumber);
  const appliedContinuityHealth: ContinuityHealthReport = {
    ...continuityReport,
    memoryRowsWritten,
    issues: [
      ...continuityReport.issues,
      ...memoryHealth.warnings.map((warning) => ({
        code: 'post_write_memory_missing',
        severity: 'major' as const,
        message: warning,
      })),
    ],
    verdict: memoryHealth.warnings.length > 0 ? 'revise' : continuityReport.verdict,
    blockedNextChapterReason: memoryHealth.warnings.length > 0
      ? memoryHealth.warnings.join('; ')
      : continuityReport.blockedNextChapterReason || null,
  };

  const { error: metricsError } = await db.from('quality_metrics').upsert({
    project_id: meta.projectId,
    novel_id: meta.novelId,
    chapter_number: meta.chapterNumber,
    overall_score: score10(qualityReport),
    dopamine_score: qualityReport.metrics.payoffHits >= 2 && qualityReport.metrics.agencyHits >= 2 ? 8 : 6,
    pacing_score: qualityReport.metrics.dialogueLines >= 3 && qualityReport.metrics.sensoryHits >= 5 ? 8 : 6,
    ending_hook_score: qualityReport.metrics.endingHook ? 8 : 5,
    word_count: words,
    word_ratio: Number((words / Math.max(1, meta.targetWords)).toFixed(2)),
    contradictions_critical: qualityReport.issues.filter((issue) => issue.severity === 'critical').length,
    contradictions_warning: 0,
    guardian_issues_critical: 0,
    guardian_issues_major: 0,
    guardian_issues_moderate: 0,
    rewrites_attempted: 0,
    auto_revised: false,
    context_size_chars: meta.contextChars,
    meta: {
      provider: 'codex_automation',
      score_scope: 'published_chapter',
      disable_chapter_split: true,
      run_dir: runDir,
      prepared_at: meta.preparedAt,
      applied_at: now,
      previous_project_status: project.status,
      previous_ai_model: project.ai_model || null,
      target_words: meta.targetWords,
      min_words: meta.minWords,
      quality_contract: qualityReport,
      continuity_health: appliedContinuityHealth,
      focus_chapter_content: focusKey ? focusChapterReport : null,
      focus_continuity: focusKey ? focusContinuityReport : null,
      memory_rows_written: memoryRowsWritten,
      blocked_next_chapter_reason: appliedContinuityHealth.blockedNextChapterReason || null,
      health: {
        ok: memoryHealth.warnings.length === 0,
        character_states: memoryHealth.characterStateCount,
        has_summary: memoryHealth.hasChapterSummary,
        rag_chunks: memoryHealth.ragChunkCount,
        warnings: memoryHealth.warnings,
      },
    },
  }, { onConflict: 'project_id,chapter_number' });
  if (metricsError) throw metricsError;

  const { error: projectError } = await db
    .from('ai_story_projects')
    .update({
      current_chapter: Math.max(project.current_chapter || 0, meta.chapterNumber),
      status: 'paused',
      style_directives: {
        ...(project.style_directives || {}),
        disable_chapter_split: true,
        codex_automation_pipeline: true,
        codex_writer_replacement: true,
        provider: 'codex_automation',
      },
      ai_model: 'codex_automation',
      updated_at: now,
    })
    .eq('id', meta.projectId);
  if (projectError) throw projectError;

  const { project: refreshedProject } = await loadProject(meta.projectId);
  console.log(`refreshed_current_chapter=${refreshedProject.current_chapter || 0}`);
  releaseFocusLock(meta.focusKey, meta.lockToken);
  console.log(`Applied Codex automation chapter ${meta.chapterNumber} to "${novel.title}".`);
}

function parseMode(): AutomationMode {
  const mode = arg('mode') || 'qa-slow';
  if (mode === 'qa-slow' || mode === 'production') return mode;
  throw new Error('Supported modes: --mode=qa-slow or --mode=production');
}

async function plan(): Promise<void> {
  const mode = parseMode();
  const bounds = getVietnamDayBounds();
  const runDir = makeRunDir(`plan-${bounds.vnDate}`);
  const quotas: AutomationQuotas = {
    maxNewStories: 1,
    maxCovers: 1,
    maxChapters: numberArg('max-chapters', mode === 'production' ? 2 : 1),
    newStoriesToday: await countCodexProjectsToday(bounds.startIso, bounds.endIso),
    coversToday: await countCodexCoversToday(bounds.startIso, bounds.endIso),
    chaptersToday: await countRowsToday('quality_metrics', bounds.startIso, bounds.endIso, 'codex_automation'),
  };
  const tasks: CodexAutomationTask[] = [];
  const plannedProjectIds = new Set<string>();

  if (quotas.newStoriesToday < quotas.maxNewStories) {
    const storyRunDir = path.join(runDir, 'new-story');
    mkdirSync(storyRunDir, { recursive: true });
    tasks.push(writeNewStoryFiles(storyRunDir, arg('genre') || 'do-thi'));
  }

  const remainingChapterSlots = Math.max(0, quotas.maxChapters - quotas.chaptersToday);
  for (let i = 0; i < remainingChapterSlots; i++) {
    const chapterCandidate = await findProjectForCodexChapter(plannedProjectIds);
    if (chapterCandidate) {
      plannedProjectIds.add(chapterCandidate.project.id);
      const chapterRunDir = path.join(runDir, `${slugify(chapterCandidate.novel.title)}-ch${(chapterCandidate.project.current_chapter || 0) + 1}`);
      mkdirSync(chapterRunDir, { recursive: true });
      tasks.push(await writeChapterFiles(chapterRunDir, chapterCandidate.project, chapterCandidate.novel));
    }
  }

  if (quotas.coversToday < quotas.maxCovers) {
    const coverCandidate = await findCodexProjectNeedingCover();
    if (coverCandidate) {
      const coverRunDir = path.join(runDir, `cover-${slugify(coverCandidate.novel.title)}`);
      mkdirSync(coverRunDir, { recursive: true });
      tasks.push(writeCoverFiles(coverRunDir, coverCandidate.project, coverCandidate.novel));
    }
  }

  const manifest: CodexAutomationManifest = {
    runId: path.basename(runDir),
    mode,
    vnDate: bounds.vnDate,
    createdAt: new Date().toISOString(),
    quotas,
    tasks,
  };
  const manifestPath = path.join(runDir, 'manifest.json');
  writeFileSync(manifestPath, safeJson(manifest), 'utf-8');
  console.log(`Codex automation plan: ${manifestPath}`);
  console.log(`tasks=${tasks.length} quotas=${JSON.stringify(quotas)}`);
  for (const task of tasks) {
    console.log(`- ${task.type}: ${task.runDir}`);
    if (task.promptPath) console.log(`  prompt=${task.promptPath}`);
    if (task.dryRunCommand) console.log(`  dry=${task.dryRunCommand}`);
    if (task.applyCommand) console.log(`  apply=${task.applyCommand}`);
  }
  if (tasks.length === 0) console.log('No task selected; QA-slow quotas are filled or no eligible Codex project exists.');
}

function printCompletionReadiness(report: CompletionReadinessReport): void {
  console.log(`completion_readiness=${report.verdict} current=${report.currentChapter} forecast=${report.forecastChapters}`);
  console.log(`metrics=${JSON.stringify(report.metrics)}`);
  if (report.shouldExtendForecast) console.log(`forecast_extend=${report.forecastChapters}->${report.nextForecastChapters}`);
  if (report.shouldEnterFinale) console.log('finale_mode=enter');
  if (report.shouldMarkCompleted) console.log('completion=mark_completed');
  for (const reason of report.reasons) console.log(`reason: ${reason}`);
  for (const blocker of report.blockers) console.log(`blocker: ${blocker}`);
}

async function focusBulk(): Promise<void> {
  const dryRun = hasFlag('dry-run') || !hasFlag('apply');
  const maxChapters = numberArg('max-chapters', 1);
  const stopMode = arg('stop') || 'ending-ready';
  const initial = await resolveFocusProject();
  const focusKey = arg('focus-key') || (initial.project.style_directives?.focus_key as string | undefined);
  const rewriteFromStart = hasFlag('rewrite-from-start');
  const runDir = makeRunDir(`focus-bulk-${slugify(initial.novel.title)}`);
  console.log(`focus_project=${initial.project.id} title=${initial.novel.title} current_chapter=${initial.project.current_chapter || 0}`);
  if (initial.project.style_directives?.focus_rescue_status === 'needs_rewrite' && !rewriteFromStart) {
    const reportPath = path.join(runDir, 'focus-report.json');
    writeFileSync(reportPath, safeJson({
      projectId: initial.project.id,
      novelId: initial.novel.id,
      title: initial.novel.title,
      blocked: true,
      reason: 'focus rescue requires rewrite from chapter 1 before continuing',
      rescue: initial.project.style_directives?.focus_rescue,
    }), 'utf-8');
    console.log(`Focus bulk blocked: focus_rescue_status=needs_rewrite report=${reportPath}`);
    console.log('Use: npm run codex:automation -- focus-bulk --focus-key=song-xuyen-trade --rewrite-from-start --max-chapters=1 --dry-run');
    return;
  }

  let lock: FocusRunLock | null = null;
  let lockTransferredToChapter = false;
  if (!dryRun && focusKey) {
    const lockResult = acquireFocusLock(focusKey, initial.project, initial.novel, runDir);
    if (!lockResult.acquired) {
      const reportPath = path.join(runDir, 'focus-report.json');
      writeFileSync(reportPath, safeJson({
        projectId: initial.project.id,
        novelId: initial.novel.id,
        title: initial.novel.title,
        skipped: true,
        reason: 'focus run already active',
        activeLock: lockResult.activeLock,
      }), 'utf-8');
      console.log(`skipped=focus_run_already_active focus_key=${focusKey} report=${reportPath}`);
      console.log(`active_lock=${JSON.stringify(lockResult.activeLock)}`);
      return;
    }
    lock = lockResult.lock;
    console.log(`focus_lock=acquired focus_key=${focusKey} token=${lock.token} expires_at=${lock.expiresAt}`);
  }

  try {
  const readiness = await evaluateCompletionReadiness(initial.project, initial.novel);
  printCompletionReadiness(readiness);

  if (readiness.verdict === 'repair') {
    const reportPath = path.join(runDir, 'focus-report.json');
    writeFileSync(reportPath, safeJson({ projectId: initial.project.id, novelId: initial.novel.id, stopMode, maxChapters, readiness }), 'utf-8');
    console.log(`Focus bulk blocked for repair. Report: ${reportPath}`);
    console.log(`Repair: npm run codex:automation -- audit-continuity --project-id=${initial.project.id} --recent=10`);
    if (lock) releaseFocusLock(focusKey, lock.token);
    process.exit(1);
  }

  const project = await applyCompletionDirectives(initial.project, initial.novel, readiness, dryRun);
  if (readiness.verdict === 'complete') {
    const reportPath = path.join(runDir, 'focus-report.json');
    writeFileSync(reportPath, safeJson({ projectId: project.id, novelId: initial.novel.id, stopMode, maxChapters, readiness, completed: !dryRun }), 'utf-8');
    console.log(`${dryRun ? 'Dry run would mark' : 'Marked'} "${initial.novel.title}" as completed. Report: ${reportPath}`);
    return;
  }

  if (stopMode === 'ending-ready' && readiness.verdict === 'enter_finale') {
    console.log('Story is ending-ready; focus-bulk will prepare the next chapter in finale mode.');
  }

  const currentChapter = project.current_chapter || 0;
  const isRewriteFirstChapter = rewriteFromStart && currentChapter === 0;
  const projectForChapter = isRewriteFirstChapter
    ? { ...project, current_chapter: 0, style_directives: { ...(project.style_directives || {}), focus_rescue_status: 'rewriting', focus_bulk_rewrite_from_start: true } }
    : project;
  const nextChapterNumber = currentChapter + 1;
  const chapterRunDir = path.join(runDir, `${slugify(initial.novel.title)}-ch${nextChapterNumber}`);
  mkdirSync(chapterRunDir, { recursive: true });
  const task = await writeChapterFiles(chapterRunDir, projectForChapter, initial.novel, {
    focusKey,
    lockToken: lock?.token || null,
  });
  if (lock) lockTransferredToChapter = true;
  const manifest: CodexAutomationManifest = {
    runId: path.basename(runDir),
    mode: 'focus-bulk',
    vnDate: getVietnamDayBounds().vnDate,
    createdAt: new Date().toISOString(),
    quotas: {
      maxNewStories: 0,
      maxCovers: 0,
      maxChapters,
      newStoriesToday: 0,
      coversToday: 0,
      chaptersToday: 0,
    },
    tasks: [task],
  };
  const report = {
    projectId: project.id,
    novelId: initial.novel.id,
    title: initial.novel.title,
    dryRun,
    dbMode: DB_MODE,
    focusKey: focusKey || null,
    lock: lock ? {
      token: lock.token,
      acquiredAt: lock.acquiredAt,
      expiresAt: lock.expiresAt,
    } : null,
    stopMode,
    maxChaptersRequested: maxChapters,
    rewriteFromStart,
    preparedSequentialTasks: 1,
    note: 'Focus bulk does not pre-generate multiple chapters from stale context. Rerun after apply to continue fast.',
    readiness,
    nextTask: task,
    auditEveryFive: ((project.current_chapter || 0) + 1) % 5 === 0,
  };
  const manifestPath = path.join(runDir, 'manifest.json');
  const reportPath = path.join(runDir, 'focus-report.json');
  writeFileSync(manifestPath, safeJson(manifest), 'utf-8');
  writeFileSync(reportPath, safeJson(report), 'utf-8');

  console.log(`Focus bulk ${dryRun ? '(DRY RUN)' : '(APPLY DIRECTIVES)'}: ${initial.novel.title}`);
  console.log(`Run dir: ${runDir}`);
  console.log(`Prepared next sequential chapter task: ${task.runDir}`);
  console.log(`Prompt: ${task.promptPath}`);
  console.log(`Write: ${task.inputPath}`);
  console.log(`Fill continuity: ${path.join(task.runDir, 'continuity.json')}`);
  console.log(`Dry run chapter: ${task.dryRunCommand}`);
  console.log(`Apply chapter: ${task.applyCommand}`);
  console.log(`Report: ${reportPath}`);
  if (report.auditEveryFive) {
    console.log(`After apply, run: npm run audit:stories -- --project-id=${project.id} --recent=5`);
    console.log(`After apply, run: npm run codex:automation -- audit-continuity --project-id=${project.id} --recent=10`);
  }
  } finally {
    if (lock && !lockTransferredToChapter) releaseFocusLock(focusKey, lock.token);
  }
}

async function loadAuditProjects(): Promise<Array<{ project: ProjectRow; novel: NovelRow }>> {
  const projectId = arg('project-id');
  if (projectId) {
    const loaded = await loadProject(projectId);
    return [loaded];
  }
  const statuses = parseStatusFilter();
  const limit = numberArg('limit', 6);
  const { data, error } = await db
    .from('ai_story_projects')
    .select('id,novel_id,status,genre,current_chapter,total_planned_chapters,target_chapter_length,ai_model,main_character,world_description,story_outline,master_outline,style_directives,updated_at,novels!ai_story_projects_novel_id_fkey(id,title,description,genres,cover_url,cover_prompt)')
    .in('status', statuses)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || [])
    .map((row: unknown) => {
      const novel = singleNovel((row as { novels?: unknown }).novels);
      return novel ? { project: row as ProjectRow, novel } : null;
    })
    .filter(Boolean) as Array<{ project: ProjectRow; novel: NovelRow }>;
}

async function auditContinuity(): Promise<void> {
  const recent = numberArg('recent', 10);
  const projects = await loadAuditProjects();
  console.log(`Codex continuity audit — projects=${projects.length} recent=${recent}`);
  for (const { project, novel } of projects) {
    const report = await auditContinuityWindow(db, project.id, novel.id, recent);
    console.log(`\n${novel.title}`);
    console.log(`  Project: ${project.id} | status=${project.status} | current=${project.current_chapter || 0} | verdict=${report.verdict}`);
    if (report.checkedChapters.length === 0) {
      console.log('  No chapters to audit.');
      continue;
    }
    console.log(`  Checked chapters: ${report.checkedChapters.join(', ')}`);
    if (Object.keys(report.missingByChapter).length === 0) {
      console.log('  Memory spine: OK');
    } else {
      for (const [chapter, missing] of Object.entries(report.missingByChapter)) {
        console.log(`  Ch.${chapter}: missing ${missing.join(', ')}`);
      }
    }
    for (const item of report.issues.slice(0, 8)) {
      console.log(`  - [${item.severity}] ${item.message}`);
    }
  }
}

async function repairContinuity(): Promise<void> {
  const projectId = arg('project-id');
  if (!projectId) throw new Error('repair-continuity requires --project-id=<id>');
  const { project, novel } = await loadProject(projectId);
  const from = numberArg('from', Math.max(1, project.current_chapter || 1));
  const to = numberArg('to', project.current_chapter || from);
  const apply = hasFlag('apply');
  const { data: chapters, error } = await db
    .from('chapters')
    .select('chapter_number,title,content')
    .eq('novel_id', novel.id)
    .gte('chapter_number', from)
    .lte('chapter_number', to)
    .order('chapter_number', { ascending: true });
  if (error) throw error;
  if (!chapters?.length) throw new Error(`No chapters found for ${novel.title} ch.${from}-${to}`);

  console.log(`Codex continuity repair ${apply ? '(APPLY)' : '(DRY RUN)'} — ${novel.title} ch.${from}-${to}`);
  for (const chapter of chapters) {
    const payload = buildHeuristicContinuityPayload(chapter.title, chapter.content, project.main_character || 'nhan vat chinh');
    const context = await loadContinuityEvaluationContext(db, project.id, chapter.chapter_number, project.main_character || 'nhan vat chinh');
    const continuity = evaluateContinuityExtraction(payload, context);
    const quality = evaluateChapterQuality(chapter.content, {
      title: chapter.title,
      protagonistName: project.main_character,
      targetWords: project.target_chapter_length,
      minWords: Math.min(2000, Math.floor((project.target_chapter_length || 2400) * 0.82)),
      genre: project.genre,
      worldDescription: project.world_description,
    });
    console.log(`  Ch.${chapter.chapter_number} "${chapter.title}": quality=${quality.verdict}/${quality.score} continuity=${continuity.verdict}`);
    if (continuity.verdict !== 'pass') {
      printContinuityReport(continuity);
      if (apply) throw new Error(`Refusing to repair Ch.${chapter.chapter_number}: continuity=${continuity.verdict}`);
      continue;
    }
    if (!apply) continue;

    const memoryRowsWritten = await persistContinuityMemory({
      db,
      projectId: project.id,
      novelId: novel.id,
      chapterNumber: chapter.chapter_number,
      title: chapter.title,
      content: chapter.content,
      protagonistName: project.main_character || 'nhan vat chinh',
      payload,
    });
    const memoryHealth = await postWriteHealthCheck(project.id, chapter.chapter_number);
    const appliedContinuityHealth: ContinuityHealthReport = {
      ...continuity,
      memoryRowsWritten,
      issues: [
        ...continuity.issues,
        ...memoryHealth.warnings.map((warning) => ({
          code: 'post_write_memory_missing',
          severity: 'major' as const,
          message: warning,
        })),
      ],
      verdict: memoryHealth.warnings.length > 0 ? 'revise' : continuity.verdict,
      blockedNextChapterReason: memoryHealth.warnings.length > 0 ? memoryHealth.warnings.join('; ') : null,
    };
    const { data: existingMetric } = await db
      .from('quality_metrics')
      .select('meta,overall_score,dopamine_score,pacing_score,ending_hook_score,word_count,word_ratio')
      .eq('project_id', project.id)
      .eq('chapter_number', chapter.chapter_number)
      .maybeSingle();
    const existingMeta = (existingMetric?.meta && typeof existingMetric.meta === 'object') ? existingMetric.meta : {};
    const { error: metricsError } = await db.from('quality_metrics').upsert({
      project_id: project.id,
      novel_id: novel.id,
      chapter_number: chapter.chapter_number,
      overall_score: existingMetric?.overall_score ?? score10(quality),
      dopamine_score: existingMetric?.dopamine_score ?? (quality.metrics.payoffHits >= 2 ? 8 : 6),
      pacing_score: existingMetric?.pacing_score ?? (quality.metrics.dialogueLines >= 3 ? 8 : 6),
      ending_hook_score: existingMetric?.ending_hook_score ?? (quality.metrics.endingHook ? 8 : 5),
      word_count: existingMetric?.word_count ?? quality.metrics.wordCount,
      word_ratio: existingMetric?.word_ratio ?? quality.metrics.wordRatio,
      contradictions_critical: quality.issues.filter((item) => item.severity === 'critical').length,
      contradictions_warning: quality.issues.filter((item) => item.severity !== 'critical').length,
      guardian_issues_critical: 0,
      guardian_issues_major: appliedContinuityHealth.verdict === 'revise' ? 1 : 0,
      guardian_issues_moderate: 0,
      rewrites_attempted: 0,
      auto_revised: false,
      meta: {
        ...existingMeta,
        provider: 'codex_automation',
        score_scope: 'published_chapter',
        continuity_repaired_at: new Date().toISOString(),
        continuity_health: appliedContinuityHealth,
        memory_rows_written: memoryRowsWritten,
        blocked_next_chapter_reason: appliedContinuityHealth.blockedNextChapterReason || null,
        health: {
          ok: memoryHealth.warnings.length === 0,
          character_states: memoryHealth.characterStateCount,
          has_summary: memoryHealth.hasChapterSummary,
          rag_chunks: memoryHealth.ragChunkCount,
          warnings: memoryHealth.warnings,
        },
      },
    }, { onConflict: 'project_id,chapter_number' });
    if (metricsError) throw metricsError;
    console.log(`    repaired memory rows=${JSON.stringify(memoryRowsWritten)}`);
  }
}

async function main(): Promise<void> {
  const cmd = command();
  if (cmd === 'plan') return plan();
  if (cmd === 'rescue-rewrite') return rescueRewrite();
  if (cmd === 'prepare-new-story') return prepareNewStory();
  if (cmd === 'apply-new-story') return applyNewStory();
  if (cmd === 'prepare-cover') return prepareCover();
  if (cmd === 'apply-cover') return applyCover();
  if (cmd === 'prepare-chapter') return prepareChapter();
  if (cmd === 'apply-chapter') return applyChapter();
  if (cmd === 'focus-bulk') return focusBulk();
  if (cmd === 'audit-continuity') return auditContinuity();
  return repairContinuity();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
