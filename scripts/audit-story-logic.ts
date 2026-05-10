import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  buildCausalLogicHealth,
  evaluateCausalLogic,
} from '../src/services/story-engine/quality/causal-logic-check';

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

function stringArg(name: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=')[1];
}

function numberArg(name: string, fallback: number): number {
  const raw = stringArg(name);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function joinedNovelTitle(novels: unknown): string {
  if (Array.isArray(novels)) return String((novels[0] as { title?: string } | undefined)?.title || '');
  return String((novels as { title?: string } | null | undefined)?.title || '');
}

async function main(): Promise<void> {
  const projectId = stringArg('project-id');
  if (!projectId) throw new Error('Missing --project-id');
  const recent = numberArg('recent', 20);

  const { data: project, error: projectError } = await db
    .from('ai_story_projects')
    .select('id,novel_id,current_chapter,main_character,style_directives,novels!ai_story_projects_novel_id_fkey(title)')
    .eq('id', projectId)
    .maybeSingle();
  if (projectError) throw projectError;
  if (!project) throw new Error(`Project not found: ${projectId}`);

  const currentChapter = Number(project.current_chapter || 0);
  const fromChapter = Math.max(1, currentChapter - recent + 1);
  const { data: chapters, error: chaptersError } = await db
    .from('chapters')
    .select('chapter_number,title,content')
    .eq('novel_id', project.novel_id)
    .gte('chapter_number', fromChapter)
    .lte('chapter_number', currentChapter)
    .order('chapter_number', { ascending: true });
  if (chaptersError) throw chaptersError;

  const { data: arcRows, error: arcError } = await db
    .from('arc_plans')
    .select('start_chapter,end_chapter,plan_text,chapter_briefs')
    .eq('project_id', projectId)
    .lte('start_chapter', currentChapter)
    .gte('end_chapter', fromChapter)
    .order('start_chapter', { ascending: true });
  if (arcError) throw arcError;

  const { data: threadRows, error: threadError } = await db
    .from('plot_threads')
    .select('name,description,status,last_active_chapter')
    .eq('project_id', projectId)
    .not('status', 'in', '("resolved","legacy")')
    .order('importance', { ascending: false })
    .limit(12);
  if (threadError) throw threadError;

  const activeThreads = (threadRows || []).map((thread) => [
    thread.name,
    thread.description,
    thread.status,
    thread.last_active_chapter ? `last ch.${thread.last_active_chapter}` : '',
  ].filter(Boolean).join(': '));
  const focusKey = (project.style_directives as { focus_key?: string | null } | null)?.focus_key || null;

  let hard = 0;
  console.log(`logic_audit project=${projectId} title=${joinedNovelTitle(project.novels)} range=${fromChapter}-${currentChapter}`);
  for (const chapter of chapters || []) {
    const arc = (arcRows || []).find((row) => chapter.chapter_number >= row.start_chapter && chapter.chapter_number <= row.end_chapter);
    const currentBrief = Array.isArray(arc?.chapter_briefs)
      ? arc.chapter_briefs.find((brief) => brief.chapterNumber === chapter.chapter_number)
      : undefined;
    const issues = evaluateCausalLogic(chapter.content || '', {
      projectId,
      chapterNumber: chapter.chapter_number,
      protagonistName: project.main_character || undefined,
      focusKey,
      arcPlanText: arc?.plan_text || null,
      currentBrief: [
        currentBrief?.brief,
        currentBrief?.sceneDirection,
        currentBrief?.mcBenefit,
      ].filter(Boolean).join('\n'),
      activeThreads,
    });
    const health = buildCausalLogicHealth(issues);
    hard += health.hardIssueCount;
    console.log(`ch.${chapter.chapter_number} ${health.verdict} hard=${health.hardIssueCount} title="${chapter.title}"`);
    for (const issue of issues) {
      console.log(`  - ${issue.severity}/${issue.code}: ${issue.message}${issue.evidence ? ` | ${issue.evidence}` : ''}`);
    }
  }

  if (hard > 0) {
    console.error(`logic_audit verdict=block hard_issues=${hard}`);
    process.exit(1);
  }
  console.log('logic_audit verdict=pass');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
