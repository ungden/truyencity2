/**
 * Identify 10 most recent novels for rewrite. Read-only.
 * Usage: ./node_modules/.bin/tsx scripts/identify-recent-10.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

try {
  const envText = readFileSync('.env.local', 'utf-8');
  for (const line of envText.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) {
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[m[1]] = val;
    }
  }
} catch { /* ignore */ }

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

(async () => {
  const { data, error } = await supabase
    .from('ai_story_projects')
    .select('id,novel_id,genre,status,total_planned_chapters,current_chapter,created_at,novels!ai_story_projects_novel_id_fkey(title)')
    .in('status', ['active', 'paused'])
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log('10 novels gần nhất (active/paused):\n');
  console.log('| # | id | title | genre | status | current/total | created_at |');
  console.log('|---|---|---|---|---|---|---|');
  for (let i = 0; i < (data || []).length; i++) {
    const p = data![i] as unknown as { id: string; genre: string; status: string; total_planned_chapters: number; current_chapter: number; created_at: string; novels: { title: string } | null };
    const title = p.novels?.title || '<no title>';
    console.log(`| ${i + 1} | ${p.id} | ${title.slice(0, 40)} | ${p.genre} | ${p.status} | ${p.current_chapter}/${p.total_planned_chapters} | ${p.created_at?.slice(0, 19)} |`);
  }

  const ids = (data || []).map((p: { id: string }) => p.id);
  console.log(`\nProject IDs (comma-separated):\n${ids.join(',')}`);
})();
