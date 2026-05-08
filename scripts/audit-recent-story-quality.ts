import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { evaluateChapterQuality, evaluateWindowQuality } from '../src/services/story-engine/quality/quality-contract';

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

const DEFAULT_LIMIT = 4;
const DEFAULT_RECENT_WINDOW = 10;

const TARGETS = {
  minPublishedWords: 1800,
  idealPublishedWords: 2200,
  minInnerSignals: 2,
  minSensorySignals: 5,
  minDialogueLines: 3,
  maxWeakEndingRate: 0.35,
  maxShortChapterRate: 0.25,
  minOverallScore: 7,
  minHookScore: 7,
};

const innerSignals = [
  'thầm nghĩ', 'trong lòng', 'tâm trí', 'ký ức', 'nỗi sợ',
  'tự nhủ', 'nhận ra', 'không dám thừa nhận', 'hắn hiểu', 'cô hiểu',
];
const sensorySignals = [
  'mùi', 'tiếng', 'âm thanh', 'lạnh', 'nóng', 'đau', 'vị',
  'ánh sáng', 'bóng tối', 'gió', 'mưa', 'máu', 'khói',
];
const cliffSignals = [
  '?!', '!!!', 'liệu', 'không ngờ', 'bất ngờ', 'rốt cuộc',
  'sẽ ra sao', 'đứng sững', 'vang lên', 'cánh cửa', 'máu đông lại',
];
const genericEndingSignals = [
  'cuộc chiến thật sự chỉ vừa mới bắt đầu',
  'cuộc chiến vừa bắt đầu',
  'trò chơi thực sự mới bắt đầu',
  'đêm dài còn ở phía trước',
];

function argValue(name: string, fallback: number): number {
  const raw = process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=')[1];
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function statusArg(): string[] {
  const raw = process.argv.find((arg) => arg.startsWith('--status='))?.split('=')[1] || 'active,paused';
  const statuses = raw.split(',').map((item) => item.trim()).filter(Boolean);
  return statuses.length > 0 ? statuses : ['active', 'paused'];
}

function pct(part: number, total: number): string {
  return total ? `${Math.round((part / total) * 100)}%` : '0%';
}

async function main(): Promise<void> {
  const limit = argValue('limit', DEFAULT_LIMIT);
  const recentWindow = argValue('recent', DEFAULT_RECENT_WINDOW);
  const statuses = statusArg();

  const { data: projects, error: projectError } = await db
    .from('ai_story_projects')
    .select('id,novel_id,status,genre,current_chapter,target_chapter_length,style_directives,main_character,world_description,updated_at,novels!ai_story_projects_novel_id_fkey(title)')
    .in('status', statuses)
    .gt('current_chapter', 0)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (projectError) throw projectError;

  console.log(`Recent story quality audit — ${new Date().toISOString()}`);
  console.log(`Statuses: ${statuses.join(', ')}`);
  console.log(`Targets: published >=${TARGETS.minPublishedWords} words, ideal >=${TARGETS.idealPublishedWords}, hook weak rate <=${pct(TARGETS.maxWeakEndingRate, 1)}. Quality contract drives verdict.`);
  console.log('='.repeat(90));

  for (const project of projects || []) {
    const novel = Array.isArray(project.novels) ? project.novels[0] : project.novels;
    const title = novel?.title || project.novel_id;

    const { data: chapters, error: chapterError } = await db
      .from('chapters')
      .select('chapter_number,title,content,quality_score,created_at')
      .eq('novel_id', project.novel_id)
      .order('chapter_number', { ascending: true });
    if (chapterError) throw chapterError;

    const allChapters = chapters || [];
    const recent = allChapters.slice(-recentWindow);
    const reports = recent.map((chapter) => ({
      chapter,
      report: evaluateChapterQuality(chapter.content || '', {
        title: chapter.title,
        protagonistName: project.main_character,
        targetWords: project.target_chapter_length || TARGETS.idealPublishedWords,
        minWords: TARGETS.minPublishedWords,
        genre: project.genre,
        worldDescription: project.world_description,
      }),
    }));
    const windowReport = evaluateWindowQuality(
      project.id,
      recent.map((chapter) => ({
        chapterNumber: chapter.chapter_number,
        title: chapter.title,
        content: chapter.content || '',
      })),
      {
        protagonistName: project.main_character,
        targetWords: project.target_chapter_length || TARGETS.idealPublishedWords,
        minWords: TARGETS.minPublishedWords,
        genre: project.genre,
        worldDescription: project.world_description,
      },
    );
    const words = reports.map(({ report }) => report.metrics.wordCount);
    const shortCount = reports.filter(({ report }) => report.metrics.wordCount < TARGETS.minPublishedWords).length;
    const weakEndingCount = reports.filter(({ report }) => !report.metrics.endingHook).length;
    const genericEndingCount = reports.filter(({ report }) => report.metrics.genericEnding).length;
    const lowInnerCount = reports.filter(({ report }) => report.metrics.innerHits < TARGETS.minInnerSignals).length;
    const lowSensoryCount = reports.filter(({ report }) => report.metrics.sensoryHits < TARGETS.minSensorySignals).length;
    const lowDialogueCount = reports.filter(({ report }) => report.metrics.dialogueLines < TARGETS.minDialogueLines).length;

    const { data: metrics } = await db
      .from('quality_metrics')
      .select('chapter_number,overall_score,ending_hook_score,word_count,word_ratio,meta')
      .eq('project_id', project.id)
      .order('chapter_number', { ascending: false })
      .limit(recentWindow);

    const metricRows = metrics || [];
    const lowMetricScores = metricRows.filter((row) =>
      (row.overall_score != null && row.overall_score < TARGETS.minOverallScore) ||
      (row.ending_hook_score != null && row.ending_hook_score < TARGETS.minHookScore)
    ).length;
    const logicalMetricRows = metricRows.filter((row) => row.meta?.score_scope === 'logical_write' || row.meta?.logical_word_count).length;
    const legacyMetricRows = metricRows.filter((row) => !row.meta?.published_word_count && row.meta?.split_parts === 2).length;

    const failures: string[] = [];
    if (windowReport.trend.blockCount > 0) failures.push(`blocked chapters ${windowReport.trend.blockCount}/${recent.length}`);
    if (windowReport.trend.reviseCount > 0) failures.push(`revise chapters ${windowReport.trend.reviseCount}/${recent.length}`);
    if (shortCount / Math.max(recent.length, 1) > TARGETS.maxShortChapterRate) failures.push(`short chapters ${shortCount}/${recent.length}`);
    if (weakEndingCount / Math.max(recent.length, 1) > TARGETS.maxWeakEndingRate) failures.push(`weak endings ${weakEndingCount}/${recent.length}`);
    if (genericEndingCount > 1) failures.push(`generic endings ${genericEndingCount}/${recent.length}`);
    if (lowInnerCount / Math.max(recent.length, 1) > 0.5) failures.push(`low inner monologue ${lowInnerCount}/${recent.length}`);
    if (lowSensoryCount / Math.max(recent.length, 1) > 0.3) failures.push(`low sensory ${lowSensoryCount}/${recent.length}`);
    if (lowDialogueCount / Math.max(recent.length, 1) > 0.2) failures.push(`low dialogue ${lowDialogueCount}/${recent.length}`);
    if (lowMetricScores > 0) failures.push(`low metric scores ${lowMetricScores}/${metricRows.length}`);
    if (legacyMetricRows > 0) failures.push(`legacy split metrics ${legacyMetricRows}/${metricRows.length}`);

    const avgWords = words.length ? Math.round(words.reduce((sum, count) => sum + count, 0) / words.length) : 0;
    const minWords = words.length ? Math.min(...words) : 0;
    const maxWords = words.length ? Math.max(...words) : 0;
    const auditVerdict = windowReport.trend.blockCount > 0 ? 'pause' : windowReport.trend.reviseCount > 0 ? 'revise' : 'ship';

    console.log(`\n${title}`);
    console.log(`  Verdict: ${auditVerdict} — score=${windowReport.trend.averageScore}/100 passRate=${Math.round(windowReport.trend.passRate * 100)}%${failures.length ? ` — ${failures.join('; ')}` : ''}`);
    console.log(`  Project: ${project.id} | status=${project.status} | genre=${project.genre} | ch=${project.current_chapter} | splitDisabled=${project.style_directives?.disable_chapter_split === true} | codexManual=${project.style_directives?.codex_manual_pipeline === true}`);
    console.log(`  Goals: coherence=${windowReport.supremeGoals.coherence}, character=${windowReport.supremeGoals.character_consistency}, plot=${windowReport.supremeGoals.directional_plot}, ending=${windowReport.supremeGoals.ending_readiness}, uniform=${windowReport.supremeGoals.uniform_quality}`);
    console.log(`  Recent ${recent.length}: avg=${avgWords}, min=${minWords}, max=${maxWords}, short=${shortCount}/${recent.length}, weakEnding=${weakEndingCount}/${recent.length}, lowInner=${lowInnerCount}/${recent.length}`);
    console.log(`  Metrics: rows=${metricRows.length}, logicalTagged=${logicalMetricRows}, legacySplit=${legacyMetricRows}, lowScores=${lowMetricScores}`);
    console.log('  Latest chapters:');
    for (const { chapter, report } of reports.slice(-3)) {
      const issueSummary = report.issues.slice(0, 2).map((issue) => issue.code).join(', ') || 'ok';
      console.log(`    Ch.${chapter.chapter_number} "${chapter.title}" — ${report.verdict}, score=${report.score}, ${report.metrics.wordCount}w, hook=${report.metrics.endingHook ? 'yes' : 'no'}, inner=${report.metrics.innerHits}, dialogue=${report.metrics.dialogueLines}, issues=${issueSummary}`);
    }
    console.log(`  Next: ${windowReport.nextActions.join(' | ')}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
