/**
 * Migrate active projects from gemini-3-flash-preview to deepseek-v4-flash.
 * Run once, idempotent.
 *
 * Usage: npx tsx scripts/migrate-to-deepseek.ts [--dry-run]
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });
import { createClient } from '@supabase/supabase-js';

const dryRun = process.argv.includes('--dry-run');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

(async () => {
  // Count current state
  const { count: totalGemini } = await s.from('ai_story_projects')
    .select('*', { count: 'exact', head: true })
    .eq('ai_model', 'gemini-3-flash-preview');

  const { count: totalActiveGemini } = await s.from('ai_story_projects')
    .select('*', { count: 'exact', head: true })
    .eq('ai_model', 'gemini-3-flash-preview')
    .eq('status', 'active');

  console.log(`Total projects on gemini-3-flash-preview: ${totalGemini}`);
  console.log(`  └─ Active: ${totalActiveGemini}`);
  console.log(`  └─ Other status (paused/done/etc): ${(totalGemini || 0) - (totalActiveGemini || 0)}`);

  if (dryRun) {
    console.log(`\n[DRY RUN] Would update ${totalActiveGemini} active projects to deepseek-v4-flash`);
    return;
  }

  // Update only active projects (don't touch paused / completed / draft)
  const { count: updated, error } = await s.from('ai_story_projects')
    .update({ ai_model: 'deepseek-v4-flash' }, { count: 'exact' })
    .eq('ai_model', 'gemini-3-flash-preview')
    .eq('status', 'active');

  if (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  }

  console.log(`\n✓ Migrated ${updated} active projects: gemini-3-flash-preview → deepseek-v4-flash`);

  // Verify
  const { count: remaining } = await s.from('ai_story_projects')
    .select('*', { count: 'exact', head: true })
    .eq('ai_model', 'gemini-3-flash-preview')
    .eq('status', 'active');
  console.log(`Remaining active on gemini-3-flash-preview: ${remaining}`);
})();
