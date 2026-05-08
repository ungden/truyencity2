import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

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

const APPLY = process.argv.includes('--apply');
const ACTIVE_ONLY = process.argv.includes('--active-only');
const LIMIT = Number(process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] || 500);

function wordCount(text: string | null | undefined): number {
  return (text || '').trim().split(/\s+/).filter(Boolean).length;
}

function estimatePublishedTarget(metric: any, splitParts: number): number | null {
  if (metric.meta?.published_target_words) return Number(metric.meta.published_target_words);
  if (metric.meta?.logical_target_words) return Math.round(Number(metric.meta.logical_target_words) / splitParts);
  if (metric.word_count && metric.word_ratio && Number(metric.word_ratio) > 0) {
    return Math.max(1, Math.round((Number(metric.word_count) / Number(metric.word_ratio)) / splitParts));
  }
  return null;
}

async function main(): Promise<void> {
  let projectQuery = db
    .from('ai_story_projects')
    .select('id,novel_id,status,current_chapter,target_chapter_length,style_directives,novels!ai_story_projects_novel_id_fkey(title)')
    .gt('current_chapter', 0)
    .order('updated_at', { ascending: false })
    .limit(LIMIT);

  if (ACTIVE_ONLY) projectQuery = projectQuery.eq('status', 'active');

  const { data: projects, error: projectError } = await projectQuery;
  if (projectError) throw projectError;

  let scanned = 0;
  let updated = 0;
  let skipped = 0;

  for (const project of projects || []) {
    const novel = Array.isArray(project.novels) ? project.novels[0] : project.novels;
    const { data: metrics, error: metricError } = await db
      .from('quality_metrics')
      .select('id,project_id,novel_id,chapter_number,word_count,word_ratio,meta')
      .eq('project_id', project.id)
      .order('chapter_number', { ascending: true });
    if (metricError) throw metricError;

    for (const metric of metrics || []) {
      scanned += 1;
      const splitParts = Number(metric.meta?.split_parts || metric.meta?.requested_split_parts || 1);
      const alreadyPublished = metric.meta?.published_word_count && metric.meta?.score_scope === 'logical_write';
      if (alreadyPublished) {
        skipped += 1;
        continue;
      }

      const { data: chapter, error: chapterError } = await db
        .from('chapters')
        .select('content,title')
        .eq('novel_id', project.novel_id)
        .eq('chapter_number', metric.chapter_number)
        .maybeSingle();
      if (chapterError) throw chapterError;
      if (!chapter?.content) {
        skipped += 1;
        continue;
      }

      const publishedWordCount = wordCount(chapter.content);
      const publishedTarget = estimatePublishedTarget(metric, Math.max(1, splitParts)) ||
        Math.round(Number(project.target_chapter_length || 2800) / Math.max(1, splitParts));
      const nextMeta = {
        ...(metric.meta || {}),
        score_scope: 'logical_write',
        logical_word_count: metric.meta?.logical_word_count ?? metric.word_count ?? null,
        published_word_count: publishedWordCount,
        published_target_words: publishedTarget,
        backfilled_published_metrics_at: new Date().toISOString(),
      };
      const nextWordRatio = Number((publishedWordCount / Math.max(1, publishedTarget)).toFixed(2));

      if (!APPLY) {
        console.log([
          `${novel?.title || project.novel_id} ch.${metric.chapter_number}`,
          `word_count ${metric.word_count} -> ${publishedWordCount}`,
          `ratio ${metric.word_ratio} -> ${nextWordRatio}`,
        ].join(' | '));
        updated += 1;
        continue;
      }

      const { error: updateError } = await db
        .from('quality_metrics')
        .update({
          word_count: publishedWordCount,
          word_ratio: nextWordRatio,
          meta: nextMeta,
        })
        .eq('id', metric.id);
      if (updateError) throw updateError;
      updated += 1;
    }
  }

  console.log(`${APPLY ? 'Applied' : 'Dry-run'} published quality metrics backfill: scanned=${scanned}, ${APPLY ? 'updated' : 'would_update'}=${updated}, skipped=${skipped}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
