import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig({ path: '.env.runtime', quiet: true });
dotenvConfig({ path: '.env.local', quiet: true, override: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Missing Supabase service credentials.');

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const apply = process.argv.includes('--apply');
const restorePath = process.argv.find(arg => arg.startsWith('--restore='))?.slice('--restore='.length);
const archiveTimestamp = new Date().toISOString();
const archiveReason = `legacy_archived_rebuild_${archiveTimestamp.slice(0, 10)}`;

interface ProjectSnapshot {
  id: string;
  novel_id: string | null;
  status: string | null;
  pause_reason: string | null;
  paused_at: string | null;
  current_chapter: number | null;
  style_directives: Record<string, unknown> | null;
}

interface NovelSnapshot {
  id: string;
  hidden: boolean;
}

interface ArchiveSnapshot {
  version: 1;
  archivedAt: string;
  archiveReason: string;
  projects: ProjectSnapshot[];
  novels: NovelSnapshot[];
  protectedFlagshipProjectIds: string[];
  protectedFlagshipNovelIds: string[];
}

async function pageAllProjects(client: SupabaseClient): Promise<ProjectSnapshot[]> {
  const rows: ProjectSnapshot[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from('ai_story_projects')
      .select('id,novel_id,status,pause_reason,paused_at,current_chapter,style_directives')
      .order('id')
      .range(offset, offset + 999);
    if (error) throw new Error(`Project snapshot failed: ${error.message}`);
    rows.push(...((data || []) as ProjectSnapshot[]));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

async function fetchNovels(client: SupabaseClient, ids: string[]): Promise<NovelSnapshot[]> {
  const rows: NovelSnapshot[] = [];
  for (let index = 0; index < ids.length; index += 200) {
    const { data, error } = await client.from('novels').select('id,hidden').in('id', ids.slice(index, index + 200));
    if (error) throw new Error(`Novel snapshot failed: ${error.message}`);
    rows.push(...((data || []) as NovelSnapshot[]));
  }
  return rows;
}

async function updateChunks(table: string, ids: string[], values: Record<string, unknown>): Promise<void> {
  for (let index = 0; index < ids.length; index += 200) {
    const batch = ids.slice(index, index + 200);
    const { error } = await db.from(table).update(values).in('id', batch);
    if (error) throw new Error(`${table} update failed at ${index}-${index + batch.length}: ${error.message}`);
  }
}

function snapshotFile(snapshot: ArchiveSnapshot): string {
  const directory = path.join(process.cwd(), 'backups', 'legacy-archive');
  mkdirSync(directory, { recursive: true });
  const filename = `legacy-archive-${snapshot.archivedAt.replace(/[:.]/g, '-')}.json`;
  const destination = path.join(directory, filename);
  writeFileSync(destination, JSON.stringify(snapshot, null, 2), { encoding: 'utf8', mode: 0o600 });
  return destination;
}

async function restore(snapshotPath: string): Promise<void> {
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8')) as ArchiveSnapshot;
  if (snapshot.version !== 1) throw new Error('Unsupported archive snapshot version.');

  const projectGroups = new Map<string, { values: Record<string, unknown>; ids: string[] }>();
  for (const project of snapshot.projects) {
    const values = { status: project.status, pause_reason: project.pause_reason, paused_at: project.paused_at, updated_at: new Date().toISOString() };
    const groupKey = JSON.stringify(values);
    const group = projectGroups.get(groupKey) || { values: values as Record<string, unknown>, ids: [] as string[] };
    group.ids.push(project.id);
    projectGroups.set(groupKey, group);
  }
  for (const group of projectGroups.values()) await updateChunks('ai_story_projects', group.ids, group.values);

  await updateChunks('novels', snapshot.novels.filter(novel => novel.hidden).map(novel => novel.id), { hidden: true });
  await updateChunks('novels', snapshot.novels.filter(novel => !novel.hidden).map(novel => novel.id), { hidden: false });
  console.log(JSON.stringify({ restored: true, projects: snapshot.projects.length, novels: snapshot.novels.length, snapshotPath }, null, 2));
}

async function archive(): Promise<void> {
  const projects = await pageAllProjects(db);
  const flagship = projects.filter(project => project.style_directives?.pipeline_version === 'flagship_v2');
  const legacy = projects.filter(project => project.style_directives?.pipeline_version !== 'flagship_v2');
  const protectedNovelIds = new Set(flagship.map(project => project.novel_id).filter((id): id is string => Boolean(id)));
  const legacyNovelIds = [...new Set(
    legacy.map(project => project.novel_id)
      .filter((id): id is string => Boolean(id))
      .filter(id => !protectedNovelIds.has(id)),
  )];
  const novels = await fetchNovels(db, legacyNovelIds);
  const visibleLegacy = novels.filter(novel => !novel.hidden);
  const withChapters = legacy.filter(project => Number(project.current_chapter || 0) > 0);

  const report = {
    mode: apply ? 'apply' : 'dry-run',
    totalProjects: projects.length,
    legacyProjects: legacy.length,
    legacyProjectsWithChapters: withChapters.length,
    protectedFlagshipProjects: flagship.length,
    legacyNovels: novels.length,
    visibleLegacyNovels: visibleLegacy.length,
    archiveReason,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!apply) return;

  const snapshot: ArchiveSnapshot = {
    version: 1,
    archivedAt: archiveTimestamp,
    archiveReason,
    projects: legacy,
    novels,
    protectedFlagshipProjectIds: flagship.map(project => project.id),
    protectedFlagshipNovelIds: [...protectedNovelIds],
  };
  const backupPath = snapshotFile(snapshot);

  await updateChunks('ai_story_projects', legacy.map(project => project.id), {
    status: 'paused',
    pause_reason: archiveReason,
    paused_at: archiveTimestamp,
    updated_at: archiveTimestamp,
  });
  await updateChunks('novels', legacyNovelIds, { hidden: true, updated_at: archiveTimestamp });

  const verifiedProjects = await pageAllProjects(db);
  const leakedLegacy = verifiedProjects.filter(project =>
    project.style_directives?.pipeline_version !== 'flagship_v2'
      && (project.status !== 'paused' || project.pause_reason !== archiveReason),
  );
  const verifiedNovels = await fetchNovels(db, legacyNovelIds);
  const visibleAfter = verifiedNovels.filter(novel => !novel.hidden);
  if (leakedLegacy.length || visibleAfter.length) {
    throw new Error(`Archive verification failed: projects=${leakedLegacy.length}, visibleNovels=${visibleAfter.length}. Restore with --restore=${backupPath}`);
  }

  console.log(JSON.stringify({ archived: true, projects: legacy.length, novelsHidden: verifiedNovels.length, protectedFlagshipProjects: flagship.length, backupPath }, null, 2));
}

(restorePath ? restore(restorePath) : archive()).catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
