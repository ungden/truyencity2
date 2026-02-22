/**
 * V2 Full Reset Script
 * 
 * Xóa toàn bộ chapters + memory data + reset 280 projects về ch=0
 * để V2 Engine viết lại từ đầu theo hệ thống mới.
 * 
 * GIỮ LẠI: master_outline, story_outline (đã gen sẵn)
 * XÓA: chapters, chapter_summaries, arc_plans, character_states,
 *       plot_threads, story_synopsis, beat_usage, world_rules_index,
 *       story_memory_chunks, story_bible (sẽ tự gen lại ở ch.3)
 * 
 * Usage: node scripts/v2-reset-all.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log('=== V2 FULL RESET ===');
  console.log('Started:', new Date().toISOString());
  console.log('');

  // Pre-check
  const { count: chaptersBefore } = await supabase.from('chapters').select('*', { count: 'exact', head: true });
  const { count: projectsBefore } = await supabase.from('ai_story_projects').select('*', { count: 'exact', head: true });
  console.log('BEFORE: ' + projectsBefore + ' projects, ' + chaptersBefore + ' chapters');
  console.log('');

  // Fetch all projects
  const { data: projects, error } = await supabase.from('ai_story_projects').select('id, novel_id');
  if (error) {
    console.error('Error fetching projects:', error.message);
    process.exit(1);
  }

  console.log('Found ' + projects.length + ' projects. Resetting ALL to ch=0...');
  console.log('');

  const projectIds = projects.map(p => p.id);
  const novelIds = [...new Set(projects.map(p => p.novel_id).filter(Boolean))];
  const batchSize = 100;

  for (let i = 0; i < projectIds.length; i += batchSize) {
    const pBatch = projectIds.slice(i, i + batchSize);
    const nBatch = novelIds.slice(i, Math.min(i + batchSize, novelIds.length));
    const batchEnd = Math.min(i + batchSize, projectIds.length);

    console.log('Batch ' + (i + 1) + '-' + batchEnd + '...');

    // 1. Delete chapters
    if (nBatch.length > 0) {
      const { error: e1 } = await supabase.from('chapters').delete().in('novel_id', nBatch);
      if (e1) console.error('  chapters delete error:', e1.message);
    }

    // 2. Delete V1 + V2 memory data
    const tables = [
      'chapter_summaries',
      'arc_plans', 
      'character_states',
      'plot_threads',
      'story_synopsis',
      'beat_usage',
      'world_rules_index',
      'story_memory_chunks',
    ];

    for (const table of tables) {
      const { error: eT } = await supabase.from(table).delete().in('project_id', pBatch);
      if (eT) console.error('  ' + table + ' delete error:', eT.message);
    }

    // 3. Also delete world_constraints (runtime extracted)
    const { error: eWC } = await supabase.from('world_constraints').delete().in('project_id', pBatch);
    if (eWC && !eWC.message.includes('does not exist')) {
      console.error('  world_constraints delete error:', eWC.message);
    }

    // 4. Reset projects: ch=0, clear story_bible (will regen at ch.3)
    // KEEP: master_outline, story_outline
    const { error: eP } = await supabase
      .from('ai_story_projects')
      .update({
        current_chapter: 0,
        status: 'active',
        story_bible: null,
      })
      .in('id', pBatch);
    if (eP) console.error('  project reset error:', eP.message);

    // 5. Reset novel chapter counts
    if (nBatch.length > 0) {
      const { error: eN } = await supabase
        .from('novels')
        .update({ total_chapters: 0, chapter_count: 0 })
        .in('id', nBatch);
      if (eN) console.error('  novel reset error:', eN.message);
    }
  }

  console.log('');

  // Post-check
  const { count: chaptersAfter } = await supabase.from('chapters').select('*', { count: 'exact', head: true });
  const { count: summariesAfter } = await supabase.from('chapter_summaries').select('*', { count: 'exact', head: true });
  const { count: charsAfter } = await supabase.from('character_states').select('*', { count: 'exact', head: true });
  const { count: chunksAfter } = await supabase.from('story_memory_chunks').select('*', { count: 'exact', head: true });
  const { count: rulesAfter } = await supabase.from('world_rules_index').select('*', { count: 'exact', head: true });
  const { count: bibleCount } = await supabase
    .from('ai_story_projects')
    .select('*', { count: 'exact', head: true })
    .not('story_bible', 'is', null)
    .neq('story_bible', '');
  const { count: masterCount } = await supabase
    .from('ai_story_projects')
    .select('*', { count: 'exact', head: true })
    .not('master_outline', 'is', null);
  const { count: outlineCount } = await supabase
    .from('ai_story_projects')
    .select('*', { count: 'exact', head: true })
    .not('story_outline', 'is', null);
  const { count: activeCount } = await supabase
    .from('ai_story_projects')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .eq('current_chapter', 0);

  console.log('AFTER RESET:');
  console.log('  chapters:           ' + chaptersAfter + (chaptersAfter === 0 ? ' ✓' : ' ✗'));
  console.log('  chapter_summaries:  ' + summariesAfter + (summariesAfter === 0 ? ' ✓' : ' ✗'));
  console.log('  character_states:   ' + charsAfter + (charsAfter === 0 ? ' ✓' : ' ✗'));
  console.log('  story_memory_chunks:' + (chunksAfter || 0) + ((chunksAfter || 0) === 0 ? ' ✓' : ' ✗'));
  console.log('  world_rules_index:  ' + (rulesAfter || 0) + ((rulesAfter || 0) === 0 ? ' ✓' : ' ✗'));
  console.log('  story_bible:        ' + bibleCount + (bibleCount === 0 ? ' ✓ (will regen at ch.3)' : ' ✗'));
  console.log('  master_outline:     ' + masterCount + '/' + projectsBefore + (masterCount == projectsBefore ? ' ✓ KEPT' : ' ✗'));
  console.log('  story_outline:      ' + outlineCount + '/' + projectsBefore + (outlineCount == projectsBefore ? ' ✓ KEPT' : ' ✗'));
  console.log('  projects at ch=0:   ' + activeCount + '/' + projectsBefore + (activeCount == projectsBefore ? ' ✓ ALL RESET' : ' ✗'));
  console.log('');
  console.log('Done:', new Date().toISOString());
  console.log('V2 Engine cron sẽ bắt đầu viết từ chương 1 cho tất cả 280 bộ!');
}

run().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
