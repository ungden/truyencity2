import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { classifyLegacyProject } from '../src/services/story-engine/flagship/legacy-classifier';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Missing Supabase runtime credentials.');
const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

function numberArg(name: string, fallback: number): number {
  const raw = process.argv.find(value => value.startsWith(`--${name}=`))?.split('=')[1];
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function fetchPages(table: string, columns: string, limit: number): Promise<any[]> {
  const rows: any[] = [];
  for (let start = 0; start < limit; start += 1000) {
    const { data, error } = await db.from(table).select(columns).range(start, Math.min(start + 999, limit - 1));
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

async function main(): Promise<void> {
  const limit = numberArg('limit', 5000);
  const [projects, metrics] = await Promise.all([
    fetchPages('ai_story_projects', 'id,novel_id,current_chapter,story_outline,master_outline,power_system_canon,worldbuilding_canon,style_directives,novels!ai_story_projects_novel_id_fkey(title)', limit),
    fetchPages('quality_metrics', 'project_id,chapter_number,overall_score,contradictions_critical,guardian_issues_critical', 50_000),
  ]);
  const metricsByProject = new Map<string, any[]>();
  for (const metric of metrics) {
    const list = metricsByProject.get(metric.project_id) || [];
    list.push(metric);
    metricsByProject.set(metric.project_id, list);
  }

  const results = projects
    .filter(project => Number(project.current_chapter || 0) > 0)
    .map(project => {
      const recent = (metricsByProject.get(project.id) || [])
        .sort((a, b) => b.chapter_number - a.chapter_number)
        .slice(0, 10);
      const scores = recent.map(metric => Number(metric.overall_score || 0));
      const average = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
      const passRate = scores.length ? scores.filter(score => score >= 7).length / scores.length : 0;
      const critical = recent.reduce((sum, metric) => sum + Number(metric.contradictions_critical || 0) + Number(metric.guardian_issues_critical || 0), 0);
      const classified = classifyLegacyProject({
        currentChapter: Number(project.current_chapter || 0),
        recentPassRate: passRate,
        averageQualityScore: average * 10,
        criticalContinuityCount: critical,
        setupV2Ready: !!project.story_outline?.setupKernel &&
          Array.isArray(project.master_outline?.volumes) && project.master_outline.volumes.length > 0 &&
          !!project.power_system_canon && !!project.worldbuilding_canon &&
          project.style_directives?.foundation_review_latest?.passed === true,
      });
      const novel = Array.isArray(project.novels) ? project.novels[0] : project.novels;
      return { projectId: project.id, title: novel?.title || project.novel_id, currentChapter: project.current_chapter, ...classified };
    });

  const counts = Object.fromEntries(['continue_candidate', 'rewrite_from_ch1', 'archive'].map(disposition => [
    disposition, results.filter(result => result.disposition === disposition).length,
  ]));
  const details = process.argv.includes('--details') ? results : undefined;
  console.log(JSON.stringify({ readOnly: true, scanned: projects.length, written: results.length, counts, projects: details }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
