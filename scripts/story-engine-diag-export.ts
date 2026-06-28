import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.runtime' });
dotenv.config({ path: '.env.local' });

type JsonRow = Record<string, unknown>;

const projectId = process.argv[2];
const limit = Number.parseInt(process.argv[3] || '20', 10);

if (!projectId) {
  console.error('Usage: node --import tsx scripts/story-engine-diag-export.ts <project_id> [limit]');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  const [project, runs, metrics, failures, reviews, quotas, cast] = await Promise.all([
    db.from('ai_story_projects')
      .select('id,novel_id,status,current_chapter,total_planned_chapters,setup_stage,pause_reason,style_directives,updated_at')
      .eq('id', projectId)
      .maybeSingle(),
    db.from('story_write_runs')
      .select('id,started_chapter,last_chapter_number,status,model,target_word_count,context_size_chars,quality_score,error_message,started_at,finished_at,updated_at')
      .eq('project_id', projectId)
      .order('started_at', { ascending: false })
      .limit(limit),
    db.from('quality_metrics')
      .select('chapter_number,overall_score,dopamine_score,pacing_score,ending_hook_score,word_count,word_ratio,contradictions_critical,contradictions_warning,guardian_issues_critical,guardian_issues_major,meta,created_at')
      .eq('project_id', projectId)
      .order('chapter_number', { ascending: false })
      .limit(limit),
    db.from('failed_memory_tasks')
      .select('chapter_number,task_name,error_message,attempts,status,next_retry_at,created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit),
    db.from('admin_review_queue')
      .select('chapter_number,reason,severity,status,detail,created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit),
    db.from('project_daily_quotas')
      .select('vn_date,target_chapters,written_chapters,status,retry_count,last_error,next_due_at,updated_at')
      .eq('project_id', projectId)
      .order('vn_date', { ascending: false })
      .limit(7),
    db.from('story_cast_ledger')
      .select('character_name,brief_role,first_seen_chapter,last_seen_chapter,appearance_count,status,last_known_location')
      .eq('project_id', projectId)
      .order('last_seen_chapter', { ascending: false })
      .limit(80),
  ]);

  if (project.error) throw project.error;

  const runIds = (runs.data || []).map((r: JsonRow) => r.id).filter(Boolean) as string[];
  const checkpoints = runIds.length > 0
    ? await db.from('story_write_checkpoints')
        .select('run_id,chapter_number,step,status,artifact_ref,digest,meta,created_at')
        .in('run_id', runIds)
        .order('created_at', { ascending: true })
    : { data: [], error: null };
  if (checkpoints.error) throw checkpoints.error;

  const report = {
    exported_at: new Date().toISOString(),
    project: redactProject(project.data as JsonRow | null),
    write_runs: runs.data || [],
    checkpoints: checkpoints.data || [],
    quality_metrics: (metrics.data || []).map(stripUnsafeMeta),
    failed_memory_tasks: failures.data || [],
    admin_review_queue: reviews.data || [],
    daily_quotas: quotas.data || [],
    cast_ledger: cast.data || [],
    note: 'No chapter prose/content is included in this diagnostic export.',
  };

  console.log(JSON.stringify(report, null, 2));
}

function redactProject(row: JsonRow | null): JsonRow | null {
  if (!row) return null;
  const style = row.style_directives as JsonRow | null;
  return {
    ...row,
    style_directives: style ? {
      production_enabled: style.production_enabled,
      production_daily_chapter_quota: style.production_daily_chapter_quota,
      quality_hold: style.quality_hold,
      story_rules: style.story_rules,
    } : null,
  };
}

function stripUnsafeMeta(row: JsonRow): JsonRow {
  const meta = (row.meta || {}) as JsonRow;
  return {
    ...row,
    meta: {
      arc_number: meta.arc_number,
      ai_write_count: meta.ai_write_count,
      context_loading_summary: meta.context_loading_summary,
      context_loader_failures: meta.context_loader_failures,
      context_trim_tiers: meta.context_trim_tiers,
      rule_violations: meta.rule_violations,
      style_habits: meta.style_habits,
      write_run_id: meta.write_run_id,
      recovery_flags: meta.recovery_flags,
      health: meta.health,
    },
  };
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
