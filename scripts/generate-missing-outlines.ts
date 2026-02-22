import { getSupabase } from '../src/services/story-engine/utils/supabase';
import { generateMasterOutline } from '../src/services/story-engine/pipeline/master-outline';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl!, supabaseKey!);
  
  console.log("Fetching projects without master_outline...");
  
  const { data: projects, error } = await supabase
    .from('ai_story_projects')
    .select('id, novel_id, genre, world_description, main_character, original_work, total_planned_chapters, novel:novels(title)')
    .is('master_outline', null);
    
  if (error) {
    console.error("Error fetching projects:", error);
    return;
  }
  
  console.log(`Found ${projects.length} projects without master outline. Generating...`);
  
  for (const p of projects) {
    const title = p.novel && Array.isArray(p.novel) ? p.novel[0]?.title : (p.novel as any)?.title || 'Unknown';
    const synopsis = p.world_description || `Truyện ${p.genre} về nhân vật chính ${p.main_character}. ${p.original_work || ''}`;
    
    console.log(`Generating Master Outline for: ${title}`);
    try {
      await generateMasterOutline(
        p.id,
        title,
        p.genre as any,
        synopsis,
        p.total_planned_chapters || 1000,
        { model: 'gemini-3-flash-preview', temperature: 0.7, maxTokens: 2048 }
      );
      console.log(`✅ Success for ${title}`);
    } catch (e) {
      console.error(`❌ Failed for ${title}:`, e);
    }
  }
  
  console.log("Finished generating missing master outlines!");
}

run();
