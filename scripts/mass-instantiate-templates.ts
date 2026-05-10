// Mass-instantiate master templates for reset projects.
//
// Phase C of mass-reset workflow: for each project paused with
// pause_reason='reset_for_re_blueprint_2026-05-10', pick a template by
// genre, generate vars from title via DeepSeek, instantiate, and sync
// to chapter_blueprints DB.
//
// Usage:
//   npx tsx scripts/mass-instantiate-templates.ts --dry-run [--limit=N] [--genre=X]
//   npx tsx scripts/mass-instantiate-templates.ts --apply [--limit=N] [--genre=X] [--concurrency=N]
//
// Flags:
//   --dry-run          (default) print what would happen, no writes
//   --apply            execute DeepSeek calls + DB writes
//   --limit=N          process at most N projects
//   --genre=X          filter to genre X only (vd: tien-hiep)
//   --concurrency=N    parallel projects (default 3)
//   --activate         set require_full_chapter_blueprint=true after sync
//   --skip-existing    skip projects that already have chapter_blueprints rows
//
// Output:
//   /tmp/mass-instantiate-<ts>.log — audit trail

import * as dotenv from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';

dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

import { pickTemplateForGenre, listSupportedGenres } from '../blueprints/_templates/registry';
import { instantiateTemplate } from '../src/services/story-engine/blueprint/template-instantiate';
import { generateVarsForTemplate } from '../src/services/story-engine/blueprint/var-generator';
import { syncBlueprintToDb } from '../src/services/story-engine/blueprint/sync';

const RESET_REASON_PREFIX = 'reset_for_re_blueprint';

const EXEMPT_IDS = new Set([
  '2bfd2a90-1e05-4d5f-a1e8-90f6ec2a6e1c',
  '533d8455-9c28-4b48-994f-ab7090329db4',
  'cf63c678-a0b5-4df2-ae1c-6cb20210f589',
]);

interface ProjectRow {
  id: string;
  novel_id: string;
  genre: string | null;
  pause_reason: string | null;
}

interface NovelRow {
  id: string;
  title: string;
  slug: string;
}

function arg(name: string): string | undefined {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split('=').slice(1).join('=') : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function loadResetProjects(db: SupabaseClient): Promise<Array<ProjectRow & { title: string; slug: string }>> {
  const all: ProjectRow[] = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await db
      .from('ai_story_projects')
      .select('id, novel_id, genre, pause_reason')
      .like('pause_reason', `${RESET_REASON_PREFIX}%`)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`load projects: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...(data as ProjectRow[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  // Join novel titles — chunked to avoid network failures on large IN clauses
  const novelIds = all.map((p) => p.novel_id).filter((x): x is string => !!x);
  const novelsMap = new Map<string, NovelRow>();
  const chunkSize = 100;
  for (let i = 0; i < novelIds.length; i += chunkSize) {
    const chunk = novelIds.slice(i, i + chunkSize);
    let lastErr: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { data, error } = await db
          .from('novels')
          .select('id, title, slug')
          .in('id', chunk);
        if (error) throw error;
        for (const n of data as NovelRow[]) novelsMap.set(n.id, n);
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        if (attempt < 3) await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }
    if (lastErr) throw new Error(`load novels chunk ${i}: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
  }

  return all
    .filter((p) => !EXEMPT_IDS.has(p.id))
    .map((p) => {
      const n = novelsMap.get(p.novel_id);
      return { ...p, title: n?.title || '(no title)', slug: n?.slug || '' };
    })
    .filter((p) => p.title !== '(no title)' && p.slug);
}

async function projectAlreadyHasBlueprint(db: SupabaseClient, projectId: string): Promise<boolean> {
  const { count, error } = await db
    .from('chapter_blueprints')
    .select('chapter_number', { count: 'exact', head: true })
    .eq('project_id', projectId);
  if (error) {
    console.warn(`[skip-check] ${projectId} error: ${error.message}`);
    return false;
  }
  return (count || 0) > 0;
}

interface ProcessResult {
  projectId: string;
  title: string;
  genre: string;
  templateId: string;
  ok: boolean;
  error?: string;
  vars?: Record<string, string>;
  arcsSynced?: number;
  briefsSynced?: number;
  coverageOk?: boolean;
}

async function processProject(
  db: SupabaseClient,
  project: ProjectRow & { title: string; slug: string },
  apply: boolean,
  activate: boolean,
): Promise<ProcessResult> {
  const result: ProcessResult = {
    projectId: project.id,
    title: project.title,
    genre: project.genre || '(no genre)',
    templateId: '(none)',
    ok: false,
  };

  const template = pickTemplateForGenre(project.genre || '', project.title);
  if (!template) {
    result.error = `no template for genre=${project.genre}`;
    return result;
  }
  result.templateId = template.templateId;

  if (!apply) {
    // Dry run — just report
    result.ok = true;
    return result;
  }

  // 1. Generate vars via DeepSeek
  let vars: Record<string, string>;
  try {
    const gen = await generateVarsForTemplate(template, { title: project.title, projectId: project.id });
    vars = gen.vars;
    result.vars = vars;
  } catch (e) {
    result.error = `var-gen: ${e instanceof Error ? e.message : String(e)}`;
    return result;
  }

  // 2. Instantiate template
  let blueprint;
  try {
    blueprint = instantiateTemplate(template, {
      novelId: project.novel_id,
      title: project.title,
      slug: project.slug,
      vars,
    });
  } catch (e) {
    result.error = `instantiate: ${e instanceof Error ? e.message : String(e)}`;
    return result;
  }

  // 3. Sync to DB
  try {
    const syncResult = await syncBlueprintToDb(db, project.id, blueprint, {
      activate,
      version: 1,
    });
    result.arcsSynced = syncResult.arcsSynced;
    result.briefsSynced = syncResult.briefsSynced;
    result.coverageOk = syncResult.coverageOk;
    result.ok = true;
  } catch (e) {
    result.error = `sync: ${e instanceof Error ? e.message : String(e)}`;
    return result;
  }

  return result;
}

async function main() {
  const apply = hasFlag('apply');
  const activate = hasFlag('activate');
  const skipExisting = hasFlag('skip-existing');
  const limit = arg('limit') ? Number(arg('limit')) : Infinity;
  const genreFilter = arg('genre');
  const concurrency = arg('concurrency') ? Number(arg('concurrency')) : 3;

  if (!apply && !hasFlag('dry-run')) {
    console.log('No --apply or --dry-run flag. Defaulting to --dry-run.');
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('Loading reset projects...');
  let projects = await loadResetProjects(db);
  console.log(`  loaded ${projects.length} reset projects (after exemption).`);

  if (genreFilter) {
    projects = projects.filter((p) => p.genre === genreFilter);
    console.log(`  filtered to genre=${genreFilter}: ${projects.length} projects.`);
  }

  // Sanity: drop projects with no template
  const supportedGenres = new Set(listSupportedGenres());
  const skipped = projects.filter((p) => !p.genre || !supportedGenres.has(p.genre));
  if (skipped.length > 0) {
    console.log(`  ${skipped.length} projects have no template (genre missing/unmapped) — will be skipped:`);
    for (const s of skipped.slice(0, 10)) {
      console.log(`    - ${s.id} title="${s.title.slice(0, 50)}" genre=${s.genre}`);
    }
  }
  projects = projects.filter((p) => p.genre && supportedGenres.has(p.genre));

  // Skip-existing
  if (skipExisting) {
    console.log('Checking skip-existing...');
    const filtered: typeof projects = [];
    for (const p of projects) {
      const has = await projectAlreadyHasBlueprint(db, p.id);
      if (!has) filtered.push(p);
    }
    console.log(`  ${projects.length - filtered.length} skipped (already have blueprints).`);
    projects = filtered;
  }

  // Apply limit
  if (Number.isFinite(limit)) projects = projects.slice(0, limit);

  console.log(`\nProcessing ${projects.length} projects (apply=${apply}, activate=${activate}, concurrency=${concurrency}).\n`);

  // Genre breakdown
  const byGenre = new Map<string, number>();
  for (const p of projects) byGenre.set(p.genre!, (byGenre.get(p.genre!) || 0) + 1);
  for (const [g, c] of [...byGenre.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${g.padEnd(20)} ${c}`);
  }
  console.log('');

  // Process with limited concurrency
  const results: ProcessResult[] = [];
  let idx = 0;
  async function worker() {
    while (idx < projects.length) {
      const myIdx = idx++;
      const p = projects[myIdx];
      try {
        const r = await processProject(db, p, apply, activate);
        results.push(r);
        const sym = r.ok ? '✓' : '✗';
        console.log(`[${myIdx + 1}/${projects.length}] ${sym} ${p.title.slice(0, 40).padEnd(40)} | ${r.templateId.padEnd(35)} | ${r.error || (r.briefsSynced ? `${r.briefsSynced} briefs` : 'dry')}`);
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        results.push({
          projectId: p.id,
          title: p.title,
          genre: p.genre || '',
          templateId: '(error)',
          ok: false,
          error: err,
        });
        console.log(`[${myIdx + 1}/${projects.length}] ✗ ${p.title.slice(0, 40).padEnd(40)} | UNEXPECTED ERROR: ${err}`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  // Summary
  const ok = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;
  console.log(`\n=== Summary ===`);
  console.log(`  total:    ${results.length}`);
  console.log(`  ok:       ${ok}`);
  console.log(`  failed:   ${fail}`);

  // Audit log
  mkdirSync('/tmp', { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const logPath = `/tmp/mass-instantiate-${ts}.log`;
  writeFileSync(logPath, JSON.stringify({ apply, activate, skipped: skipped.length, results }, null, 2));
  console.log(`  audit log: ${logPath}`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
