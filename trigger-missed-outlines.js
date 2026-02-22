const { createClient } = require('@supabase/supabase-js');
const { generateMasterOutline } = require('./src/services/story-engine/pipeline/master-outline');
require('dotenv').config({ path: '.env.local' });

async function run() {
  // Let the fixing script finish its job, we will enqueue missing master outlines in the background too.
}
run();
