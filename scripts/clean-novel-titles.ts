/**
 * Clean up novel titles - remove [YYYY-MM-DD-xxxx] suffix
 * 
 * Run: npx ts-node scripts/clean-novel-titles.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jxhpejyowuihvjpqwarm.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHBlanlvd3VpaHZqcHF3YXJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjU5MjU3NiwiZXhwIjoyMDcyMTY4NTc2fQ.Xcc1Izxn1e2U2SBTb09Mhis9KJ1QV0OelQK4QyHHNqY';

const db = createClient(supabaseUrl, supabaseKey);

// Pattern: [2026-02-15-xxxx] or similar
const SUFFIX_PATTERN = /\s*\[\d{4}-\d{2}-\d{2}-[a-f0-9]{4}\]$/;

async function main() {
  console.log('='.repeat(60));
  console.log('Clean Novel Titles');
  console.log('='.repeat(60));
  console.log('');

  // 1. Get all novels with suffix
  const { data: novels, error: novelError } = await db
    .from('novels')
    .select('id, title');

  if (novelError) {
    console.error('Error fetching novels:', novelError);
    process.exit(1);
  }

  const toClean = (novels || []).filter(n => SUFFIX_PATTERN.test(n.title));
  console.log(`Found ${toClean.length} novels to clean`);

  if (toClean.length === 0) {
    console.log('No novels to clean!');
    return;
  }

  console.log('');
  console.log('Sample titles to clean:');
  toClean.slice(0, 5).forEach(n => {
    const cleanTitle = n.title.replace(SUFFIX_PATTERN, '');
    console.log(`  "${n.title}" → "${cleanTitle}"`);
  });
  console.log('');

  // 2. Update novels
  let updated = 0;
  let failed = 0;

  for (const novel of toClean) {
    const cleanTitle = novel.title.replace(SUFFIX_PATTERN, '');
    
    const { error } = await db
      .from('novels')
      .update({ title: cleanTitle })
      .eq('id', novel.id);

    if (error) {
      console.error(`Failed to update novel ${novel.id}:`, error.message);
      failed++;
    } else {
      updated++;
      if (updated % 10 === 0) {
        console.log(`Progress: ${updated}/${toClean.length}`);
      }
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('NOVELS RESULT:');
  console.log(`  Updated: ${updated}`);
  console.log(`  Failed: ${failed}`);
  console.log('');

  // 3. Also clean ai_story_projects if they have the same pattern
  const { data: projects, error: projError } = await db
    .from('ai_story_projects')
    .select('id, story_title');

  if (projError) {
    console.error('Error fetching projects:', projError);
  } else {
    const projToClean = (projects || []).filter(p => p.story_title && SUFFIX_PATTERN.test(p.story_title));
    console.log(`Found ${projToClean.length} projects to clean`);

    let projUpdated = 0;
    for (const proj of projToClean) {
      const cleanTitle = proj.story_title!.replace(SUFFIX_PATTERN, '');
      
      const { error } = await db
        .from('ai_story_projects')
        .update({ story_title: cleanTitle })
        .eq('id', proj.id);

      if (!error) projUpdated++;
    }
    console.log(`Projects updated: ${projUpdated}`);
  }

  console.log('');
  console.log('✅ Done!');
}

main().catch(console.error);
