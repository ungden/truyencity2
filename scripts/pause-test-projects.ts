import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });
import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
(async () => {
  // Find all test novels and pause their projects
  const { data: novels } = await s.from('novels').select('id,title,slug').like('slug', 'test-%');
  console.log(`Found ${novels?.length || 0} test novels:`);
  for (const n of novels || []) console.log(` - ${n.slug}: ${n.title}`);
  if (!novels || novels.length === 0) return;
  const novelIds = novels.map(n => n.id);
  const { data: projects } = await s.from('ai_story_projects').select('id,novel_id,status').in('novel_id', novelIds);
  console.log(`\n${projects?.length || 0} projects:`);
  for (const p of projects || []) console.log(` - ${p.id} status=${p.status}`);
  const { error } = await s.from('ai_story_projects').update({ status: 'paused' }).in('novel_id', novelIds);
  if (error) console.error('Update error:', error.message);
  else console.log(`\n✓ Paused all test projects`);
})();
