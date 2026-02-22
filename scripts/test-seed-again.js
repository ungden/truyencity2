const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("Checking project history...");
  const { data: projects, error } = await supabase.from('ai_story_projects').select('id, created_at').order('created_at', { ascending: false }).limit(5);
  
  if (error) {
    console.error(error);
  } else {
    console.log(projects);
  }
}

run();
