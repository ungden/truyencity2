/**
 * Audit setup quality for AI story projects.
 *
 * Default mode is read-only:
 *   npx tsx scripts/audit-setup-quality.ts
 *
 * Repair mode:
 *   npx tsx scripts/audit-setup-quality.ts --apply
 *
 * Repair policy:
 *   - current_chapter = 0: reset to setup_stage=idea and clear generated setup
 *     artifacts so the state machine can regenerate from title/genre.
 *   - current_chapter > 0: pause for manual review; never rewrite published canon.
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  formatSetupGateIssues,
  validateSetupCanon,
} from '@/services/story-engine/plan/setup-quality-gate';

dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });

const APPLY = process.argv.includes('--apply');
const LIMIT = Number(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || 500);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const db = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface ProjectRow {
  id: string;
  novel_id: string;
  genre: string | null;
  main_character: string | null;
  world_description: string | null;
  master_outline: unknown;
  story_outline: unknown;
  current_chapter: number | null;
  status: string | null;
  setup_stage: string | null;
  setup_stage_error: string | null;
  novels?: { title?: string | null } | { title?: string | null }[] | null;
}

function titleOf(row: ProjectRow): string {
  const novel = Array.isArray(row.novels) ? row.novels[0] : row.novels;
  return novel?.title || '(untitled)';
}

function isStuck(row: ProjectRow): boolean {
  return !!row.setup_stage_error
    || ['world', 'character', 'description', 'master_outline', 'story_outline', 'arc_plan']
      .includes(row.setup_stage || '');
}

async function resetUnwritten(row: ProjectRow): Promise<void> {
  const { error: arcErr } = await db.from('arc_plans').delete().eq('project_id', row.id);
  if (arcErr) throw arcErr;

  const { error } = await db.from('ai_story_projects').update({
    status: 'paused',
    pause_reason: 'setup quality audit reset before chapter 1',
    world_description: null,
    main_character: null,
    master_outline: null,
    story_outline: null,
    story_bible: null,
    setup_stage: 'idea',
    setup_stage_attempts: 0,
    setup_stage_error: null,
    setup_stage_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', row.id);
  if (error) throw error;
}

async function pausePublished(row: ProjectRow, reason: string): Promise<void> {
  const { error } = await db.from('ai_story_projects').update({
    status: 'paused',
    pause_reason: `setup quality audit: ${reason}`.slice(0, 500),
    paused_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', row.id);
  if (error) throw error;
}

async function main(): Promise<void> {
  const { data, error } = await db
    .from('ai_story_projects')
    .select('id,novel_id,genre,main_character,world_description,master_outline,story_outline,current_chapter,status,setup_stage,setup_stage_error,novels!ai_story_projects_novel_id_fkey(title)')
    .order('created_at', { ascending: false })
    .limit(LIMIT);

  if (error) throw error;

  const rows = (data || []) as ProjectRow[];
  const findings: Array<{ row: ProjectRow; reason: string }> = [];

  for (const row of rows) {
    const stage = row.setup_stage || 'idea';
    const shouldGate = stage !== 'idea' || !!row.world_description || !!row.main_character || !!row.story_outline || !!row.master_outline;
    const gate = shouldGate
      ? validateSetupCanon({
          worldDescription: row.world_description,
          mainCharacter: row.main_character,
          storyOutline: row.story_outline,
          masterOutline: row.master_outline,
          requireStoryOutline: stage === 'ready_to_write' || stage === 'writing',
          requireMasterOutline: stage === 'ready_to_write' || stage === 'writing',
        })
      : { passed: true, issues: [] };

    const missingArcForReady = (stage === 'ready_to_write' || stage === 'writing')
      && !row.story_outline;

    if (!gate.passed || isStuck(row) || missingArcForReady) {
      const reason = [
        !gate.passed ? formatSetupGateIssues(gate) : '',
        isStuck(row) ? `stuck/error stage=${row.setup_stage || '(null)'} err=${row.setup_stage_error || '(none)'}` : '',
        missingArcForReady ? 'ready/writing project missing story outline' : '',
      ].filter(Boolean).join(' | ');
      findings.push({ row, reason });
    }
  }

  console.log(`Setup quality audit ${APPLY ? '(APPLY)' : '(read-only)'}`);
  console.log(`Scanned: ${rows.length}`);
  console.log(`Findings: ${findings.length}`);

  let reset = 0;
  let paused = 0;
  for (const { row, reason } of findings) {
    const chapters = row.current_chapter || 0;
    console.log([
      `- ${row.id}`,
      `title="${titleOf(row)}"`,
      `genre=${row.genre || '(null)'}`,
      `ch=${chapters}`,
      `status=${row.status || '(null)'}`,
      `setup_stage=${row.setup_stage || '(null)'}`,
      `mc="${row.main_character || ''}"`,
      `reason=${reason}`,
    ].join(' | '));

    if (!APPLY) continue;

    if (chapters === 0) {
      await resetUnwritten(row);
      reset += 1;
    } else {
      await pausePublished(row, reason);
      paused += 1;
    }
  }

  if (APPLY) {
    console.log(`Applied repair: reset=${reset}, paused_for_manual_review=${paused}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
