import 'dotenv/config';
import dotenv from 'dotenv';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.runtime' });
dotenv.config({ path: '.env.local' });

const apply = process.argv.includes('--apply');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Supabase server environment is missing.');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const projectTables = [
  'admin_review_queue', 'ai_writing_jobs', 'ai_writing_schedules', 'arc_pacing_blueprints', 'arc_plans',
  'battle_records', 'beat_usage', 'chapter_blueprints', 'chapter_summaries', 'character_arcs', 'character_bibles',
  'character_depth_profiles', 'character_knowledge', 'character_relationships', 'character_states', 'character_tracker',
  'character_voices', 'coherence_audits', 'consistency_issues', 'cost_tracking', 'economic_ledger', 'editor_reviews',
  'embedding_cache', 'enemy_scaling', 'factions', 'failed_memory_tasks', 'first_10_evaluations', 'foreshadowing_plans',
  'hierarchical_summaries', 'item_events', 'location_bibles', 'location_timeline', 'mc_power_states',
  'milestone_validations', 'motif_usage', 'planned_twists', 'plot_arcs', 'plot_threads', 'plot_twists',
  'power_progression', 'project_daily_quotas', 'qc_results', 'quality_metrics', 'quality_trends', 'rewrite_chain_jobs',
  'romance_progressions', 'story_arc_ledger_v3', 'story_benchmark_plans', 'story_blueprint_runs', 'story_cast_ledger',
  'story_cast_ledger_v3', 'story_chapter_attempts', 'story_cover_manifests_v3', 'story_embeddings',
  'story_fact_ledger_v3', 'story_factory_checkpoints', 'story_factory_commissions_v3', 'story_factory_jobs',
  'story_flagship_reviews', 'story_flagship_setup_runs', 'story_graph_edges', 'story_graph_nodes',
  'story_knowledge_ledger_v3', 'story_launch_packs_v3', 'story_memory_chunks', 'story_plan_attempts_v3',
  'story_portfolio_signatures_v3', 'story_promise_ledger', 'story_promise_ledger_v3', 'story_resource_ledger',
  'story_resource_ledger_v3', 'story_synopsis', 'story_themes', 'story_timeline', 'story_write_checkpoints',
  'story_write_runs', 'voice_anchors', 'voice_fingerprints', 'volume_summaries', 'world_constraints',
  'world_rules_index', 'world_state', 'writing_style_analytics',
];

const novelTables = [
  'admin_review_queue', 'ai_image_jobs', 'bookmarks', 'chapter_reads', 'comments', 'editor_reviews',
  'first_10_evaluations', 'notifications', 'novel_articles', 'novel_boosts', 'quality_trends', 'ratings',
  'reading_progress', 'reading_sessions', 'rewrite_chain_jobs', 'story_chapter_attempts', 'story_cover_manifests_v3',
];

const independentTables = [
  'story_benchmark_chapters', 'story_calibration_ballots_v3', 'story_calibration_campaigns_v3',
  'story_calibration_samples_v3', 'story_factory_calibrations', 'story_machine_judgments_v3',
  'story_setup_attempts_v3',
];

async function fetchAll(table: string, filter?: { column: string; values: string[] }): Promise<unknown[]> {
  const rows: unknown[] = [];
  for (let from = 0; ; from += 1_000) {
    let query = db.from(table).select('*').range(from, from + 999);
    if (filter) query = query.in(filter.column, filter.values);
    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 1_000) break;
  }
  return rows;
}

function line(table: string, row: unknown): string {
  return `${JSON.stringify({ table, row })}\n`;
}

async function ensurePrivateBucket(client: SupabaseClient): Promise<void> {
  const { data, error } = await client.storage.listBuckets();
  if (error) throw error;
  const existing = data.find(bucket => bucket.id === 'factory-audit');
  if (existing) {
    if (existing.public) throw new Error('factory-audit bucket exists but is public.');
    return;
  }
  const created = await client.storage.createBucket('factory-audit', {
    public: false,
    allowedMimeTypes: ['application/gzip', 'text/plain'],
    fileSizeLimit: 5 * 1024 * 1024,
  });
  if (created.error) throw created.error;
}

async function main(): Promise<void> {
  const projects = await fetchAll('ai_story_projects');
  const projectIds = projects.map(row => (row as { id: string }).id);
  const novelIds = projects.flatMap(row => (row as { novel_id?: string | null }).novel_id ? [(row as { novel_id: string }).novel_id] : []);
  const novels = novelIds.length ? await fetchAll('novels', { column: 'id', values: novelIds }) : [];
  const chapters = novelIds.length ? await fetchAll('chapters', { column: 'novel_id', values: novelIds }) : [];
  const chapterIds = chapters.map(row => (row as { id: string }).id);

  const chunks: string[] = [line('_meta', {
    format: 'truyencity-factory-audit-v1',
    createdAt: new Date().toISOString(),
    projectCount: projectIds.length,
    novelCount: novelIds.length,
    chapterCount: chapters.length,
  })];
  projects.forEach(row => chunks.push(line('ai_story_projects', row)));
  novels.forEach(row => chunks.push(line('novels', row)));
  chapters.forEach(row => chunks.push(line('chapters', row)));

  const captured = new Set(['ai_story_projects', 'novels', 'chapters']);
  for (const table of projectTables) {
    if (captured.has(table) || projectIds.length === 0) continue;
    const rows = await fetchAll(table, { column: 'project_id', values: projectIds });
    rows.forEach(row => chunks.push(line(table, row)));
    captured.add(table);
  }
  for (const table of novelTables) {
    if (captured.has(table) || novelIds.length === 0) continue;
    const rows = await fetchAll(table, { column: 'novel_id', values: novelIds });
    rows.forEach(row => chunks.push(line(table, row)));
    captured.add(table);
  }
  if (chapterIds.length) {
    const versions = await fetchAll('chapter_versions', { column: 'chapter_id', values: chapterIds });
    versions.forEach(row => chunks.push(line('chapter_versions', row)));
  }
  for (const table of independentTables) {
    const rows = await fetchAll(table);
    rows.forEach(row => chunks.push(line(table, row)));
  }

  const compressed = gzipSync(Buffer.from(chunks.join(''), 'utf8'), { level: 9 });
  const sha256 = createHash('sha256').update(compressed).digest('hex');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `truyencity-factory-audit-${stamp}.jsonl.gz`;
  const localPath = path.join('/tmp', fileName);
  writeFileSync(localPath, compressed);
  writeFileSync(`${localPath}.sha256`, `${sha256}  ${fileName}\n`);
  const summary = { dryRun: !apply, localPath, sha256, bytes: compressed.length, projects: projectIds.length, novels: novelIds.length, chapters: chapters.length };
  if (!apply) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  await ensurePrivateBucket(db);
  const remotePath = `exports/${fileName}`;
  const upload = await db.storage.from('factory-audit').upload(remotePath, compressed, {
    contentType: 'application/gzip', upsert: false,
  });
  if (upload.error) throw upload.error;
  const checksum = Buffer.from(`${sha256}  ${fileName}\n`);
  const checksumUpload = await db.storage.from('factory-audit').upload(`${remotePath}.sha256`, checksum, {
    contentType: 'text/plain', upsert: false,
  });
  if (checksumUpload.error) throw checksumUpload.error;
  const downloaded = await db.storage.from('factory-audit').download(remotePath);
  if (downloaded.error) throw downloaded.error;
  const downloadedHash = createHash('sha256').update(Buffer.from(await downloaded.data.arrayBuffer())).digest('hex');
  if (downloadedHash !== sha256) throw new Error(`Uploaded bundle checksum mismatch: ${downloadedHash} != ${sha256}`);
  const sidecar = await db.storage.from('factory-audit').download(`${remotePath}.sha256`);
  if (sidecar.error || !(await sidecar.data.text()).startsWith(sha256)) throw new Error('Uploaded checksum sidecar verification failed.');
  console.log(JSON.stringify({ ...summary, dryRun: false, remotePath, verified: true }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
