import { ContentSeeder } from '../src/services/story-writing-factory/content-seeder';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

async function run() {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    console.error('GEMINI_API_KEY missing');
    process.exit(1);
  }

  console.log('Starting to seed 200 novels in the background...');
  
  const seeder = new ContentSeeder(geminiKey);
  const config = {
    authorCount: 20,
    novelsPerAuthor: 10, // 20 * 10 = 200 novels
    activatePerAuthor: 5, // Activate 5 per author initially
    minChapters: 1000,
    maxChapters: 2000,
  };

  try {
    // Generate authors
    console.log('\n--- STEP 1: GENERATING AUTHORS ---');
    const authorsResult = await seeder.seedAuthorsOnly(config.authorCount);
    console.log(authorsResult);
    
    // Generate novels
    console.log('\n--- STEP 2: GENERATING NOVELS AND PROJECTS ---');
    const novelsResult = await seeder.seedNovelsOnly(config);
    console.log(novelsResult);
    
    // Activate some
    console.log('\n--- STEP 3: ACTIVATING PROJECTS ---');
    const activateResult = await seeder.activateOnly(config.activatePerAuthor);
    console.log(activateResult);
    
    console.log('\nDone seeding 200 new stories!');
    
  } catch (err) {
    console.error('Failed to seed:', err);
  }
}

run();
