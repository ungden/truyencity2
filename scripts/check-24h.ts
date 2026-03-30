import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check24h() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  console.log('--- System Check (Last 24h) ---');

  // 1. Chapters generated
  const { count: chaptersCount, error: chError } = await supabase
    .from('chapters')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', twentyFourHoursAgo);
  
  if (chError) console.error('Error fetching chapters:', chError.message);
  else console.log(`📖 New Chapters Generated: ${chaptersCount}`);

  // 2. Novels created
  const { count: novelsCount, error: novError } = await supabase
    .from('novels')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', twentyFourHoursAgo);
    
  if (novError) console.error('Error fetching novels:', novError.message);
  else console.log(`📚 New Novels Created: ${novelsCount}`);

  // 3. Health Checks
  const { data: healthData, error: healthError } = await supabase
    .from('health_checks')
    .select('status, score, created_at')
    .gte('created_at', twentyFourHoursAgo)
    .order('created_at', { ascending: false });

  if (healthError && healthError.code !== '42P01') {
    // Ignore table not found if it doesn't exist yet
    console.error('Error fetching health checks:', healthError.message);
  } else if (healthData) {
    const passed = healthData.filter(h => h.status === 'pass').length;
    const failed = healthData.filter(h => h.status !== 'pass').length;
    console.log(`\n🏥 Health Checks: ${healthData.length} total (${passed} passed, ${failed} failed)`);
    if (failed > 0) {
      console.log('Recent failed health checks:', healthData.filter(h => h.status !== 'pass').slice(0, 3));
    }
    if (healthData.length > 0) {
      console.log(`Latest Health Score: ${healthData[0].score}/100 at ${new Date(healthData[0].created_at).toLocaleString()}`);
    }
  }

  // 4. Any chapter generation errors/warnings (if there's a log table)
  // Check if we have a table for logs or just look at story_generation_queue/cron runs
  
  // Checking active projects in story engine
  const { data: activeProjects, error: actError } = await supabase
    .from('novels')
    .select('id, title, status')
    .eq('status', 'writing');
    
  if (actError) console.error('Error fetching active projects:', actError.message);
  else console.log(`\n⚙️ Active Projects (Status: writing): ${activeProjects?.length || 0}`);

}

check24h().catch(console.error);
