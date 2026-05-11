import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});
async function main() {
  const { data: projects } = await db
    .from('ai_story_projects')
    .select('novel_id, novels!ai_story_projects_novel_id_fkey(id, title, cover_url, created_at)')
    .eq('pause_reason', process.env.PAUSE_REASON!);
  if (!projects) return;
  const rows = projects.map((p: { novels: { id: string; title: string; cover_url: string | null; created_at: string } | { id: string; title: string; cover_url: string | null; created_at: string }[] }) => {
    const n = Array.isArray(p.novels) ? p.novels[0] : p.novels;
    return n;
  }).filter((n) => n && !n.cover_url).sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const n of rows) console.log(`${n.id}|${n.title}`);
}
main().catch(console.error);
