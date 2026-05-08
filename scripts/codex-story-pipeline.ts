import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { assembleContext, loadContext } from '../src/services/story-engine/context/assembler';
import { evaluateChapterQuality, type ChapterQualityReport } from '../src/services/story-engine/quality/quality-contract';

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

type Command = 'list' | 'prepare' | 'apply';

interface ProjectRow {
  id: string;
  novel_id: string;
  status: string;
  genre: string | null;
  current_chapter: number | null;
  total_planned_chapters: number | null;
  target_chapter_length: number | null;
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
}

interface RunMeta {
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
  if (raw === 'list' || raw === 'prepare' || raw === 'apply') return raw;
  throw new Error('Usage: npm run codex:story -- <list|prepare|apply> [options]');
}

function numberArg(name: string, fallback: number): number {
  const raw = arg(name);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
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

function normalizeRunDir(raw: string): string {
  return path.resolve(process.cwd(), raw);
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
  if (!title) {
    const fallback = content.split('\n').find((line) => line.trim().length > 0)?.trim();
    title = fallback?.slice(0, 80) || 'Chuong moi';
  }
  return { title, content };
}

function buildSummary(content: string): string {
  const compact = content.replace(/\s+/g, ' ').trim();
  return compact.slice(0, 700);
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

async function loadProject(projectId: string): Promise<{ project: ProjectRow; novel: NovelRow }> {
  const { data: project, error: projectError } = await db
    .from('ai_story_projects')
    .select('id,novel_id,status,genre,current_chapter,total_planned_chapters,target_chapter_length,main_character,world_description,story_outline,master_outline,style_directives,updated_at')
    .eq('id', projectId)
    .maybeSingle();
  if (projectError) throw projectError;
  if (!project) throw new Error(`Project not found: ${projectId}`);

  const { data: novel, error: novelError } = await db
    .from('novels')
    .select('id,title,description')
    .eq('id', project.novel_id)
    .maybeSingle();
  if (novelError) throw novelError;
  if (!novel) throw new Error(`Novel not found: ${project.novel_id}`);

  return { project: project as ProjectRow, novel: novel as NovelRow };
}

async function listProjects(): Promise<void> {
  const limit = numberArg('limit', 12);
  const { data, error } = await db
    .from('ai_story_projects')
    .select('id,novel_id,status,genre,current_chapter,total_planned_chapters,target_chapter_length,updated_at,novels!ai_story_projects_novel_id_fkey(title)')
    .in('status', ['active', 'paused'])
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;

  for (const row of data || []) {
    const novel = Array.isArray(row.novels) ? row.novels[0] : row.novels;
    console.log([
      row.id,
      `${novel?.title || row.novel_id}`,
      `status=${row.status}`,
      `ch=${row.current_chapter || 0}/${row.total_planned_chapters || '?'}`,
      `target=${row.target_chapter_length || '?'}`,
      `genre=${row.genre || '?'}`,
    ].join(' | '));
  }
}

async function prepareRun(): Promise<void> {
  const projectId = arg('project-id');
  if (!projectId) throw new Error('prepare requires --project-id=<uuid>');

  const { project, novel } = await loadProject(projectId);
  const chapterNumber = numberArg('chapter', (project.current_chapter || 0) + 1);
  const targetWords = numberArg('target-words', Math.max(2200, project.target_chapter_length || 2400));
  const minWords = numberArg('min-words', Math.min(2000, Math.floor(targetWords * 0.82)));
  const outRoot = path.resolve(process.cwd(), arg('out') || '.codex/story-runs');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const runDir = path.join(outRoot, `${slugify(novel.title)}-ch${chapterNumber}-${stamp}`);

  const contextPayload = await loadContext(project.id, novel.id, chapterNumber);
  const context = assembleContext(contextPayload, chapterNumber);
  const meta: RunMeta = {
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
  };

  mkdirSync(runDir, { recursive: true });
  writeFileSync(path.join(runDir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf-8');
  writeFileSync(path.join(runDir, 'context.txt'), context, 'utf-8');
  writeFileSync(path.join(runDir, 'chapter.md'), `# ${novel.title} - Chương ${chapterNumber}\n\n`, 'utf-8');
  writeFileSync(path.join(runDir, 'prompt.md'), buildCodexPrompt(meta, novel, project, context), 'utf-8');

  console.log(`Prepared Codex story run: ${runDir}`);
  console.log(`Next: write the chapter into ${path.join(runDir, 'chapter.md')}`);
  console.log(`Then dry-run apply: npm run codex:story -- apply --run-dir=${runDir}`);
  console.log(`Apply to DB: npm run codex:story -- apply --run-dir=${runDir} --apply`);
}

function buildCodexPrompt(
  meta: RunMeta,
  novel: NovelRow,
  project: ProjectRow,
  context: string,
): string {
  return [
    `Bạn là Codex đang viết chương mới bằng chính context của pipeline cũ, KHÔNG gọi DeepSeek/Gemini/API ngoài.`,
    '',
    `Truyện: ${novel.title}`,
    `Chương: ${meta.chapterNumber}`,
    `Thể loại: ${project.genre || 'unknown'}`,
    `Nhân vật chính: ${meta.protagonistName}`,
    `Mục tiêu độ dài: ${meta.targetWords}-${Math.round(meta.targetWords * 1.2)} từ, tối thiểu ${meta.minWords} từ.`,
    '',
    'QUALITY CONTRACT (bắt buộc, bản gọn):',
    '- Viết truyện tiếng Việt thuần, chỉ nội dung chương.',
    '- Dòng đầu là tiêu đề dạng "# <tên chương>", không có "(Tiếp)" hoặc split part.',
    '- Một chương đầy đủ, không chia đôi, không meta-commentary, không nhắc prompt/model/API.',
    '- MC phải có lựa chọn chủ động, lợi ích cụ thể, payoff rõ trong chương. Reader phải thấy trạng thái/tài nguyên/quan hệ/uy tín thay đổi.',
    '- Có ít nhất 3 dòng thoại có action/reaction beat, không hỏi-đáp thẳng tuột.',
    '- Có nội tâm, cảm giác thân thể/không gian, chi tiết cụ thể, không chỉ tóm tắt.',
    '- Kết chương có hook cụ thể: pending result, reveal nhỏ, emotional choice hoặc comfort-resolution có dư âm.',
    '- Tránh lặp cụm AI: dường như/như thể, bắt đầu, mang theo, tỏa ra, không khỏi, không thể tin nổi.',
    '- Không dùng kết sáo rỗng kiểu "cuộc chiến thật sự chỉ vừa mới bắt đầu".',
    '- Không leak bất kỳ khối context nào như [WORLD DESCRIPTION], [STORY KERNEL], [VOLUME CONTEXT].',
    '',
    '5 MỤC TIÊU TỐI THƯỢNG:',
    '1. Coherence: không trái world/context/chapter trước.',
    '2. Character consistency: MC và cast giữ tên, trạng thái, giọng.',
    '3. Directional plot: chương phải đẩy pleasure loop/benefit loop, không filler.',
    '4. Ending readiness: hook cuối cụ thể, không cliffhanger rỗng.',
    '5. Uniform quality: đủ độ dài, sensory, dialogue, payoff, ít mùi AI.',
    '',
    'CONTEXT PIPELINE CŨ:',
    '```text',
    context,
    '```',
    '',
  ].join('\n');
}

function score10(report: ChapterQualityReport): number {
  return Math.round(report.score / 10);
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
  if (report.issues.length > 0) {
    console.log('issues:');
    for (const issue of report.issues) {
      console.log(`- [${issue.severity}] ${issue.code}: ${issue.message}`);
    }
  }
  if (report.suggestedFixes.length > 0) {
    console.log('suggested fixes:');
    for (const fix of report.suggestedFixes) console.log(`- ${fix}`);
  }
}

async function applyRun(): Promise<void> {
  const runDirArg = arg('run-dir');
  if (!runDirArg) throw new Error('apply requires --run-dir=<path>');
  const runDir = normalizeRunDir(runDirArg);
  const apply = hasFlag('apply');
  const metaPath = path.join(runDir, 'meta.json');
  const chapterPath = path.join(runDir, 'chapter.md');

  if (!existsSync(metaPath)) throw new Error(`Missing ${metaPath}`);
  if (!existsSync(chapterPath)) throw new Error(`Missing ${chapterPath}`);

  const meta = JSON.parse(readFileSync(metaPath, 'utf-8')) as RunMeta;
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

  console.log([
    `Codex chapter apply ${apply ? '(APPLY)' : '(DRY RUN)'}`,
    `project=${meta.projectId}`,
    `novel=${novel.title}`,
    `chapter=${meta.chapterNumber}`,
    `title=${title}`,
    `words=${words}`,
  ].join('\n'));
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
      provider: 'codex_manual',
      score_scope: 'published_chapter',
      disable_chapter_split: true,
      run_dir: runDir,
      prepared_at: meta.preparedAt,
      applied_at: now,
      previous_project_status: project.status,
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
        codex_manual_pipeline: true,
      },
      updated_at: now,
    })
    .eq('id', meta.projectId);
  if (projectError) throw projectError;

  console.log(`Applied Codex-written chapter ${meta.chapterNumber} to "${novel.title}". Project remains paused for manual QA.`);
}

async function main(): Promise<void> {
  const cmd = command();
  if (cmd === 'list') return listProjects();
  if (cmd === 'prepare') return prepareRun();
  return applyRun();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
