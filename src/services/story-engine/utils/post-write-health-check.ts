/**
 * Post-Write Health Check (Phase 22 Stage 3)
 *
 * After a chapter is written, verify all expected memory rows exist:
 *  - character_states (combined extraction)
 *  - chapter_summaries (chapter summary)
 *  - story_memory_chunks (RAG chunks)
 *
 * Logs warnings + records to quality_metrics.meta if anything is missing.
 * Non-fatal — chapter still ships, but operator/dashboard sees the warning.
 *
 * Why this matters: many memory tasks are `.catch()`-swallowed. If they fail
 * silently, character_states/RAG drift accumulates. This audit surfaces the drift.
 */

import { getSupabase } from './supabase';

export interface HealthCheckResult {
  hasCharacterStates: boolean;
  hasChapterSummary: boolean;
  hasRAGChunks: boolean;
  characterStateCount: number;
  ragChunkCount: number;
  warnings: string[];
}

export async function postWriteHealthCheck(
  projectId: string,
  chapterNumber: number,
): Promise<HealthCheckResult> {
  const db = getSupabase();
  const warnings: string[] = [];

  const [statesRes, summaryRes, chunksRes] = await Promise.all([
    db.from('character_states')
      .select('character_name', { count: 'exact', head: false })
      .eq('project_id', projectId)
      .eq('chapter_number', chapterNumber),
    db.from('chapter_summaries')
      .select('chapter_number')
      .eq('project_id', projectId)
      .eq('chapter_number', chapterNumber)
      .maybeSingle(),
    db.from('story_memory_chunks')
      .select('id', { count: 'exact', head: false })
      .eq('project_id', projectId)
      .eq('chapter_number', chapterNumber),
  ]);

  const characterStateCount = (statesRes.data?.length) ?? 0;
  const hasChapterSummary = !!summaryRes.data;
  const ragChunkCount = (chunksRes.data?.length) ?? 0;
  const hasCharacterStates = characterStateCount > 0;
  const hasRAGChunks = ragChunkCount > 0;

  if (!hasCharacterStates) {
    warnings.push(`No character_states for ch.${chapterNumber} — character extraction may have failed silently`);
  }
  if (!hasChapterSummary) {
    warnings.push(`No chapter_summary for ch.${chapterNumber} — summary generation may have failed`);
  }
  if (!hasRAGChunks) {
    warnings.push(`No story_memory_chunks for ch.${chapterNumber} — RAG storage may have failed (long-range memory will have a gap)`);
  }

  if (warnings.length > 0) {
    console.warn(`[HealthCheck] Ch.${chapterNumber} memory drift:`, warnings.join('; '));
  } else if (process.env.DEBUG_HEALTH === '1') {
    console.log(`[HealthCheck] Ch.${chapterNumber} ✓ ${characterStateCount} chars, summary, ${ragChunkCount} chunks`);
  }

  return {
    hasCharacterStates,
    hasChapterSummary,
    hasRAGChunks,
    characterStateCount,
    ragChunkCount,
    warnings,
  };
}
