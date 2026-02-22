const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials");
    return;
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("Fetching all projects...");
  const { data: projects, error } = await supabase.from('ai_story_projects').select('id, novel_id');
  
  if (error) {
    console.error("Error fetching projects:", error);
    return;
  }
  
  console.log(`Found ${projects.length} projects. Resetting them all to Chapter 0...`);
  
  // Create arrays of IDs
  const projectIds = projects.map(p => p.id);
  const novelIds = projects.map(p => p.novel_id);
  
  // We need to do this in batches if there are too many, but let's try direct delete if PostgREST allows it.
  // Actually, we should just run a raw SQL query or use the supabase JS client to delete in batches.
  const batchSize = 100;
  for (let i = 0; i < projectIds.length; i += batchSize) {
    const pBatch = projectIds.slice(i, i + batchSize);
    const nBatch = novelIds.slice(i, i + batchSize);
    
    console.log(`Processing batch ${i} to ${i + pBatch.length}...`);
    
    // Delete chapters
    await supabase.from('chapters').delete().in('novel_id', nBatch);
    
    // Delete memory
    await supabase.from('chapter_summaries').delete().in('project_id', pBatch);
    await supabase.from('arc_plans').delete().in('project_id', pBatch);
    await supabase.from('character_states').delete().in('project_id', pBatch);
    await supabase.from('plot_threads').delete().in('project_id', pBatch);
    await supabase.from('story_synopsis').delete().in('project_id', pBatch);
    
    // Reset project
    await supabase.from('ai_story_projects')
      .update({ current_chapter: 0, status: 'active' })
      .in('id', pBatch);
      
    // Update novel total_chapters
    await supabase.from('novels')
      .update({ total_chapters: 0 })
      .in('id', nBatch);
  }
  
  console.log("All projects reset successfully. The AI Writer cron will now start writing them from Chapter 1 using the V2 Engine!");
}

run();
