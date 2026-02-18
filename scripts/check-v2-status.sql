-- Story Engine v2 Production Status Check
-- Run in Supabase SQL Editor

-- ============================================================================
-- 1. RECENT CHAPTERS (last 20)
-- ============================================================================
SELECT 
  c.chapter_number,
  c.title,
  LENGTH(c.content) as content_length,
  (LENGTH(c.content) - LENGTH(REPLACE(c.content, ' ', '')) + 1) as word_count,
  c.created_at,
  p.main_character
FROM chapters c
JOIN novels n ON c.novel_id = n.id
JOIN ai_story_projects p ON p.novel_id = n.id
ORDER BY c.created_at DESC
LIMIT 20;

-- ============================================================================
-- 2. CHARACTER STATES (V2 INDICATOR - should have entries if V2 is running)
-- ============================================================================
SELECT 
  character_name,
  status,
  power_level,
  power_realm_index,
  chapter_number,
  created_at,
  project_id
FROM character_states
ORDER BY created_at DESC
LIMIT 30;

-- Count by project
SELECT 
  project_id,
  COUNT(*) as state_count,
  MAX(chapter_number) as latest_chapter,
  MAX(created_at) as last_created
FROM character_states
GROUP BY project_id
ORDER BY last_created DESC;

-- ============================================================================
-- 3. STORY MEMORY CHUNKS (V2 RAG - should have entries if V2 is running)
-- ============================================================================
SELECT 
  chapter_number,
  project_id,
  created_at
FROM story_memory_chunks
ORDER BY created_at DESC
LIMIT 20;

-- Count by project
SELECT 
  project_id,
  COUNT(*) as chunk_count,
  MAX(chapter_number) as latest_chapter
FROM story_memory_chunks
GROUP BY project_id
ORDER BY chunk_count DESC;

-- ============================================================================
-- 4. CHAPTER SUMMARIES (both V1 and V2 create these)
-- ============================================================================
SELECT 
  chapter_number,
  project_id,
  opening_sentence,
  mc_state,
  cliffhanger,
  created_at
FROM chapter_summaries
ORDER BY created_at DESC
LIMIT 15;

-- ============================================================================
-- 5. ARC PLANS
-- ============================================================================
SELECT 
  arc_number,
  start_chapter,
  end_chapter,
  arc_theme,
  project_id,
  created_at
FROM arc_plans
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- 6. STORY SYNOPSIS (with structured fields - V2 feature)
-- ============================================================================
SELECT 
  synopsis_text,
  mc_current_state,
  active_allies,
  active_enemies,
  open_threads,
  last_updated_chapter,
  project_id,
  last_updated
FROM story_synopsis
ORDER BY last_updated DESC
LIMIT 5;

-- ============================================================================
-- 7. ACTIVE PROJECTS STATUS
-- ============================================================================
SELECT 
  id,
  main_character,
  current_chapter,
  total_chapters,
  genre,
  created_at
FROM ai_story_projects
WHERE current_chapter > 0
ORDER BY current_chapter DESC
LIMIT 15;

-- ============================================================================
-- 8. V2 VERIFICATION QUERY
-- ============================================================================
-- If this returns results, V2 is running
SELECT 
  'V2 STATUS' as check_type,
  CASE 
    WHEN (SELECT COUNT(*) FROM character_states WHERE created_at > NOW() - INTERVAL '24 hours') > 0 
    THEN '✅ V2 RUNNING - Found recent character_states'
    ELSE '❌ V2 NOT DETECTED - No recent character_states'
  END as status
UNION ALL
SELECT 
  'RAG STATUS' as check_type,
  CASE 
    WHEN (SELECT COUNT(*) FROM story_memory_chunks WHERE created_at > NOW() - INTERVAL '24 hours') > 0 
    THEN '✅ V2 RAG WORKING - Found recent memory chunks'
    ELSE '❌ V2 RAG NOT DETECTED - No recent memory chunks'
  END as status;

-- ============================================================================
-- 9. CHAPTERS PER DAY (throughput)
-- ============================================================================
SELECT 
  DATE(created_at) as date,
  COUNT(*) as chapters_written,
  COUNT(DISTINCT novel_id) as unique_novels
FROM chapters
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ============================================================================
-- 10. CHECK FOR ERRORS (if any error logging table exists)
-- ============================================================================
-- Check recent writing jobs for failures
SELECT 
  project_id,
  chapter_number,
  status,
  error_message,
  created_at
FROM ai_writing_jobs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
