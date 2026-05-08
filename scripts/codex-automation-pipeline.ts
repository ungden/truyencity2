import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import {
  assertCoverImageFile,
  parseCoverApplyInput,
  parseStoryFactoryPayload,
  type CodexAutomationManifest,
  type CodexAutomationTask,
  type CoverApplyInput,
  type StoryFactoryPayload,
} from '../src/services/story-engine/codex-automation/contract';
import { assembleContext, loadContext } from '../src/services/story-engine/context/assembler';
import { evaluateChapterQuality, type ChapterQualityReport } from '../src/services/story-engine/quality/quality-contract';
import { getVietnamDayBounds } from '../src/lib/utils/vietnam-time';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const db = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Command =
  | 'plan'
  | 'prepare-new-story'
  | 'apply-new-story'
  | 'prepare-cover'
  | 'apply-cover'
  | 'prepare-chapter'
  | 'apply-chapter';

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
  const commands: Command[] = ['plan', 'prepare-new-story', 'apply-new-story', 'prepare-cover', 'apply-cover', 'prepare-chapter', 'apply-chapter'];
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
  return path.resolve(process.cwd(), arg('out') || '.codex/automation-runs');
}

function makeRunDir(label: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const runDir = path.join(outputRoot(), `${label}-${stamp}`);
  mkdirSync(runDir, { recursive: true });
  return runDir;
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

function buildSummary(content: string): string {
  return content.replace(/\s+/g, ' ').trim().slice(0, 700);
}

function firstSentence(content: string): string {
  const compact = content.replace(/\s+/g, ' ').trim();
  const match = compact.match(/^(.{40,220}?[.!?。！？])/);
  return (match?.[1] || compact.slice(0, 180)).trim();
}

function lastParagraph(content: string): string {
  const paragraphs = content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (paragraphs.at(-1) || content.slice(-500)).slice(0, 700);
}

function score10(report: ChapterQualityReport): number {
  return Math.round(report.score / 10);
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

async function findCodexProjectNeedingCover(): Promise<{ project: ProjectRow; novel: NovelRow } | null> {
  const { data, error } = await db
    .from('ai_story_projects')
    .select('id,novel_id,status,genre,current_chapter,total_planned_chapters,target_chapter_length,ai_model,main_character,world_description,story_outline,master_outline,style_directives,updated_at,novels!ai_story_projects_novel_id_fkey(id,title,description,genres,cover_url,cover_prompt)')
    .contains('style_directives', { codex_automation_pipeline: true })
    .in('status', ['paused', 'active'])
    .order('updated_at', { ascending: false })
    .limit(20);
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
    return { project, novel };
  }
  return null;
}

function writeNewStoryFiles(runDir: string, genre = 'do-thi'): CodexAutomationTask {
  const storyPath = path.join(runDir, 'story.json');
  const promptPath = path.join(runDir, 'prompt.md');
  const template = {
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
      mcSecret: { secret: '', outsideWorldKnowledge: '', revealRule: '' },
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
  };
  writeFileSync(storyPath, safeJson(template), 'utf-8');
  writeFileSync(promptPath, buildNewStoryPrompt(genre, runDir), 'utf-8');
  return {
    type: 'new_story',
    runDir,
    status: 'prepared',
    promptPath,
    inputPath: storyPath,
    dryRunCommand: `npm run codex:automation -- apply-new-story --run-dir=${runDir}`,
    applyCommand: `npm run codex:automation -- apply-new-story --run-dir=${runDir} --apply`,
  };
}

function buildNewStoryPrompt(genre: string, runDir: string): string {
  return [
    '# Codex Automation: tạo truyện mới',
    '',
    'Điền file `story.json` trong thư mục này. Không gọi DeepSeek/Gemini/text API ngoài.',
    '',
    'Yêu cầu:',
    `- Thể loại chính: ${genre}. Có thể thêm tối đa 3 subgenre hợp lý.`,
    '- Viết tiếng Việt, webnovel hiện đại, đọc cuốn ngay từ setup.',
    '- Phải có reader fantasy cụ thể, MC chủ động, benefit loop rõ, phase 1 playground đủ cảnh lặp.',
    '- Description là giới thiệu public 250-500 chữ, hấp dẫn nhưng không leak prompt.',
    '- World description là nội bộ 600-1800 chữ, đủ để viết 50 chương đầu không lạc.',
    '- Master outline có 8-12 arc lớn. Story outline phải chứa cast/state/worldRules/tone/antiTropes.',
    '- Arc plan tối thiểu 5 chapter brief đầu, mỗi brief có goal/conflict/payoff/hook.',
    '- Cover prompt bằng tiếng Anh, dành cho ảnh bìa 3:4, không dùng watermark ngoài title và Truyencity.com.',
    '',
    'Sau khi điền xong:',
    `npm run codex:automation -- apply-new-story --run-dir=${runDir}`,
    `npm run codex:automation -- apply-new-story --run-dir=${runDir} --apply`,
    '',
    'Lưu ý: command thật sẽ được in trong manifest; dùng đúng run-dir của task.',
  ].join('\n');
}

async function prepareNewStory(): Promise<void> {
  const runDir = makeRunDir(`new-story-${slugify(arg('genre') || 'do-thi')}`);
  const task = writeNewStoryFiles(runDir, arg('genre') || 'do-thi');
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
  const payload = parseStoryFactoryPayload(JSON.parse(readFileSync(storyPath, 'utf-8')));
  console.log(`Codex new story ${apply ? '(APPLY)' : '(DRY RUN)'}: ${payload.title}`);
  console.log(`genres=${payload.genres.join(',')} chapters=${payload.totalPlannedChapters}`);
  if (!apply) {
    console.log('Dry run passed story factory contract. Add --apply to insert novel + project.');
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
  return [
    base,
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
    candidate = await findCodexProjectNeedingCover();
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

function buildChapterPrompt(meta: ChapterRunMeta, novel: NovelRow, project: ProjectRow, context: string): string {
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
    '- MC có lựa chọn chủ động, lợi ích cụ thể, payoff rõ.',
    '- Ít nhất 3 dòng thoại có action/reaction beat.',
    '- Có nội tâm, cảm giác thân thể/không gian, chi tiết cụ thể.',
    '- Kết chương có hook cụ thể, không cliffhanger rỗng.',
    '- Không leak marker context như [WORLD DESCRIPTION], [STORY KERNEL], [VOLUME CONTEXT].',
    '- Đây là drop-in replacement cho writer API cũ: giữ canon, arc, summaries, state và nhịp truyện từ context; chỉ thay người viết bằng Codex.',
    '- Nếu truyện cũ đang ở chương sâu, tiếp tục đúng mạch hiện tại, không reset premise, không đổi MC, không giới thiệu lại từ đầu.',
    '',
    'CONTEXT:',
    '```text',
    context,
    '```',
  ].join('\n');
}

async function writeChapterFiles(runDir: string, project: ProjectRow, novel: NovelRow): Promise<CodexAutomationTask> {
  const chapterNumber = numberArg('chapter', (project.current_chapter || 0) + 1);
  const targetWords = numberArg('target-words', Math.max(2200, project.target_chapter_length || 2400));
  const minWords = numberArg('min-words', Math.min(2000, Math.floor(targetWords * 0.82)));
  const contextPayload = await loadContext(project.id, novel.id, chapterNumber);
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
  };
  const metaPath = path.join(runDir, 'meta.json');
  const promptPath = path.join(runDir, 'prompt.md');
  const chapterPath = path.join(runDir, 'chapter.md');
  writeFileSync(metaPath, safeJson(meta), 'utf-8');
  writeFileSync(path.join(runDir, 'context.txt'), context, 'utf-8');
  writeFileSync(chapterPath, `# ${novel.title} - Chương ${chapterNumber}\n\n`, 'utf-8');
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

async function applyChapter(): Promise<void> {
  const runDirArg = arg('run-dir');
  if (!runDirArg) throw new Error('apply-chapter requires --run-dir=<path>');
  const runDir = normalizeRunDir(runDirArg);
  const metaPath = path.join(runDir, 'meta.json');
  const chapterPath = path.join(runDir, 'chapter.md');
  if (!existsSync(metaPath)) throw new Error(`Missing ${metaPath}`);
  if (!existsSync(chapterPath)) throw new Error(`Missing ${chapterPath}`);
  const apply = hasFlag('apply');
  const meta = JSON.parse(readFileSync(metaPath, 'utf-8')) as ChapterRunMeta;
  const { project, novel } = await loadProject(meta.projectId);
  const { title, content } = extractTitleAndContent(readFileSync(chapterPath, 'utf-8'));
  const words = wordCount(content);
  const qualityReport = evaluateChapterQuality(content, {
    title,
    protagonistName: meta.protagonistName,
    targetWords: meta.targetWords,
    minWords: meta.minWords,
    genre: meta.genre,
    worldDescription: project.world_description,
  });

  console.log(`Codex automation chapter ${apply ? '(APPLY)' : '(DRY RUN)'}\nproject=${meta.projectId}\nnovel=${novel.title}\nchapter=${meta.chapterNumber}\ntitle=${title}\nwords=${words}`);
  printQualityReport(qualityReport);

  if (qualityReport.verdict !== 'pass') {
    console.error(`Quality contract failed with verdict=${qualityReport.verdict}. Chapter was NOT written to DB.`);
    process.exit(1);
  }
  if (!apply) {
    console.log('Dry run passed quality contract. Add --apply to write chapter, summary, quality_metrics, and current_chapter.');
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

  const { error: summaryError } = await db.from('chapter_summaries').upsert({
    project_id: meta.projectId,
    chapter_number: meta.chapterNumber,
    title,
    summary: buildSummary(content),
    opening_sentence: firstSentence(content),
    mc_state: `${meta.protagonistName} đã tiến thêm một bước sau chương ${meta.chapterNumber}.`,
    cliffhanger: lastParagraph(content),
  }, { onConflict: 'project_id,chapter_number' });
  if (summaryError) throw summaryError;

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

  for (let i = 0; i < quotas.maxChapters; i++) {
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

async function main(): Promise<void> {
  const cmd = command();
  if (cmd === 'plan') return plan();
  if (cmd === 'prepare-new-story') return prepareNewStory();
  if (cmd === 'apply-new-story') return applyNewStory();
  if (cmd === 'prepare-cover') return prepareCover();
  if (cmd === 'apply-cover') return applyCover();
  if (cmd === 'prepare-chapter') return prepareChapter();
  return applyChapter();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
