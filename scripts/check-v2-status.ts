/**
 * Check Story Engine v2 Production Status
 * 
 * Run: npx ts-node scripts/check-v2-status.ts
 * 
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const db = createClient(supabaseUrl, supabaseKey);
const CLIFFHANGER_FILL_WARNING_THRESHOLD = 0.8;

async function main() {
  console.log('='.repeat(70));
  console.log('Story Engine v2 Production Status Check');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('='.repeat(70));
  console.log('');

  // 1. Check recent chapters
  console.log('📚 RECENT CHAPTERS (last 10):');
  console.log('-'.repeat(70));
  
  const { data: recentChapters, error: chError } = await db
    .from('chapters')
    .select('chapter_number, title, novel_id, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (chError) {
    console.error('Error fetching chapters:', chError);
  } else if (recentChapters && recentChapters.length > 0) {
    for (const ch of recentChapters) {
      const wordCount = await getWordCount(ch.novel_id, ch.chapter_number);
      console.log(`  Ch.${ch.chapter_number}: "${ch.title?.slice(0, 40)}..." | ${wordCount} words | ${ch.created_at}`);
    }
  } else {
    console.log('  No recent chapters found');
  }
  console.log('');

  // 2. Check character_states (V2 indicator)
  console.log('👤 CHARACTER STATES (V2 indicator - last 20):');
  console.log('-'.repeat(70));
  
  const { data: charStates, error: csError } = await db
    .from('character_states')
    .select('character_name, status, power_level, chapter_number, project_id, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (csError) {
    console.error('Error fetching character_states:', csError);
  } else if (charStates && charStates.length > 0) {
    console.log(`  Total entries: ${charStates.length}`);
    const byProject: Record<string, number> = {};
    for (const cs of charStates) {
      byProject[cs.project_id] = (byProject[cs.project_id] || 0) + 1;
    }
    console.log('  By project:');
    for (const [pid, count] of Object.entries(byProject)) {
      console.log(`    ${pid.slice(0, 8)}...: ${count} entries`);
    }
  } else {
    console.log('  ⚠️ No character_states found - V2 may not be running!');
  }
  console.log('');

  // 3. Check story_memory_chunks (V2 indicator)
  console.log('🧠 STORY MEMORY CHUNKS (V2 RAG - last 10):');
  console.log('-'.repeat(70));
  
  const { data: chunks, error: chunkError } = await db
    .from('story_memory_chunks')
    .select('chapter_number, project_id, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (chunkError) {
    console.error('Error fetching chunks:', chunkError);
  } else if (chunks && chunks.length > 0) {
    console.log(`  Total recent: ${chunks.length}`);
    const byProject: Record<string, number> = {};
    for (const c of chunks) {
      byProject[c.project_id] = (byProject[c.project_id] || 0) + 1;
    }
    console.log('  By project:');
    for (const [pid, count] of Object.entries(byProject)) {
      console.log(`    ${pid.slice(0, 8)}...: ${count} chunks`);
    }
  } else {
    console.log('  ⚠️ No story_memory_chunks found - V2 may not be running!');
  }
  console.log('');

  // 4. Check chapter_summaries (both V1 and V2)
  console.log('📝 CHAPTER SUMMARIES (last 10):');
  console.log('-'.repeat(70));
  
  const { data: summaries, error: sumError } = await db
    .from('chapter_summaries')
    .select('chapter_number, project_id, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (sumError) {
    console.error('Error fetching summaries:', sumError);
  } else if (summaries && summaries.length > 0) {
    console.log(`  Total recent: ${summaries.length}`);
  } else {
    console.log('  No summaries found');
  }
  console.log('');

  // 4b. Cliffhanger fill-rate (24h quality health check)
  console.log('🪝 CLIFFHANGER FILL-RATE (last 24h):');
  console.log('-'.repeat(70));

  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: summaries24h, error: cliffErr } = await db
    .from('chapter_summaries')
    .select('cliffhanger,created_at')
    .gte('created_at', sinceIso);

  if (cliffErr) {
    console.error('Error fetching 24h cliffhanger stats:', cliffErr);
  } else {
    const total24h = summaries24h?.length || 0;
    const filled24h = (summaries24h || []).filter((s: any) => (s.cliffhanger || '').trim().length > 0).length;
    const fillRate = total24h > 0 ? filled24h / total24h : 0;
    console.log(`  Total summaries 24h: ${total24h}`);
    console.log(`  Filled cliffhanger: ${filled24h}`);
    console.log(`  Fill rate: ${(fillRate * 100).toFixed(1)}%`);
    if (fillRate < CLIFFHANGER_FILL_WARNING_THRESHOLD) {
      console.log(`  ⚠️ WARNING: Fill rate dưới ${(CLIFFHANGER_FILL_WARNING_THRESHOLD * 100).toFixed(0)}%`);
    } else {
      console.log('  ✅ Fill rate đạt ngưỡng an toàn');
    }
  }
  console.log('');

  // 5. Check arc_plans
  console.log('📐 ARC PLANS (recent):');
  console.log('-'.repeat(70));
  
  const { data: arcs, error: arcError } = await db
    .from('arc_plans')
    .select('arc_number, start_chapter, end_chapter, project_id, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (arcError) {
    console.error('Error fetching arc_plans:', arcError);
  } else if (arcs && arcs.length > 0) {
    for (const arc of arcs) {
      console.log(`  Arc ${arc.arc_number}: Ch.${arc.start_chapter}-${arc.end_chapter} | ${arc.project_id?.slice(0, 8)}...`);
    }
  } else {
    console.log('  No recent arc plans');
  }
  console.log('');

  // 6. Check active projects
  console.log('📁 ACTIVE PROJECTS:');
  console.log('-'.repeat(70));
  
  const { data: projects, error: projError } = await db
    .from('ai_story_projects')
    .select('id, main_character, current_chapter, total_planned_chapters, created_at')
    .gt('current_chapter', 0)
    .order('current_chapter', { ascending: false })
    .limit(10);

  if (projError) {
    console.error('Error fetching projects:', projError);
  } else if (projects && projects.length > 0) {
    for (const p of projects) {
      console.log(`  ${p.main_character}: Ch.${p.current_chapter}/${p.total_planned_chapters} | ${p.id.slice(0, 8)}...`);
    }
  } else {
    console.log('  No active projects');
  }
  console.log('');

  // 7. Summary
  console.log('='.repeat(70));
  console.log('SUMMARY:');
  console.log('-'.repeat(70));
  
  const hasCharStates = charStates && charStates.length > 0;
  const hasChunks = chunks && chunks.length > 0;
  
  if (hasCharStates && hasChunks) {
    console.log('✅ V2 IS RUNNING - Found character_states and story_memory_chunks');
  } else if (hasCharStates || hasChunks) {
    console.log('⚠️ V2 PARTIALLY RUNNING - Only some V2 indicators found');
  } else {
    console.log('❌ V2 NOT DETECTED - No V2-specific data found');
    console.log('   Check: USE_STORY_ENGINE_V2=true environment variable');
  }
  console.log('');
}

async function getWordCount(novelId: string, chapterNumber: number): Promise<number> {
  try {
    const { data } = await db
      .from('chapters')
      .select('content')
      .eq('novel_id', novelId)
      .eq('chapter_number', chapterNumber)
      .single();
    
    if (data?.content) {
      return data.content.trim().split(/\s+/).filter(Boolean).length;
    }
    return 0;
  } catch {
    return 0;
  }
}

main().catch(console.error);
