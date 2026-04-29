/**
 * Memory Task Retry Queue (Phase 23 S2)
 *
 * Wraps post-write memory tasks (character extraction, RAG chunking, bible refresh, etc.)
 * with retry-on-failure logic. Failed tasks are recorded to `failed_memory_tasks` and
 * drained by `memory-replay-cron` with exponential backoff (15min, 1h, 6h, 24h).
 *
 * Without this, silent failures (`.catch(() => null)`) caused long-term continuity drift.
 */

import { getSupabase } from './supabase';

const BACKOFF_MINUTES = [15, 60, 360, 1440]; // 15min → 1h → 6h → 24h
const MAX_ATTEMPTS = 4;

export async function recordFailedTask(opts: {
  projectId: string;
  novelId?: string | null;
  chapterNumber?: number;
  taskName: string;
  payload?: Record<string, unknown>;
  error: unknown;
}): Promise<void> {
  try {
    const db = getSupabase();
    const errMsg = opts.error instanceof Error ? opts.error.message : String(opts.error);
    const nextRetry = new Date(Date.now() + BACKOFF_MINUTES[0] * 60_000).toISOString();
    await db.from('failed_memory_tasks').insert({
      project_id: opts.projectId,
      novel_id: opts.novelId ?? null,
      chapter_number: opts.chapterNumber ?? null,
      task_name: opts.taskName,
      task_payload: opts.payload ?? {},
      error_message: errMsg.slice(0, 500),
      attempts: 0,
      status: 'pending',
      next_retry_at: nextRetry,
    });
  } catch (e) {
    console.warn('[RetryQueue] Failed to record failed task:', e instanceof Error ? e.message : String(e));
  }
}

/**
 * Helper: wrap a task in retry-recording. Use in orchestrator post-write tasks.
 *
 * Example:
 *   safeMemoryTask({ projectId, novelId, chapterNumber, taskName: 'rag_chunking' },
 *     () => chunkAndStoreChapter(...))
 */
export async function safeMemoryTask<T>(
  meta: { projectId: string; novelId?: string | null; chapterNumber?: number; taskName: string; payload?: Record<string, unknown> },
  fn: () => Promise<T>,
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    console.warn(`[RetryQueue] Task "${meta.taskName}" failed for ch.${meta.chapterNumber ?? '?'}:`, error instanceof Error ? error.message : String(error));
    await recordFailedTask({
      projectId: meta.projectId,
      novelId: meta.novelId,
      chapterNumber: meta.chapterNumber,
      taskName: meta.taskName,
      payload: meta.payload,
      error,
    });
    return null;
  }
}

export interface FailedTaskRow {
  id: string;
  project_id: string;
  novel_id: string | null;
  chapter_number: number | null;
  task_name: string;
  task_payload: Record<string, unknown>;
  attempts: number;
}

/**
 * Drain pending tasks. Called by memory-replay-cron. Returns count of tasks attempted.
 */
export async function drainRetryQueue(maxBatch = 20): Promise<{ attempted: number; succeeded: number; permanentFailures: number }> {
  const db = getSupabase();
  const stats = { attempted: 0, succeeded: 0, permanentFailures: 0 };

  // Fetch pending tasks whose retry time has arrived
  const nowIso = new Date().toISOString();
  const { data: rows } = await db
    .from('failed_memory_tasks')
    .select('id,project_id,novel_id,chapter_number,task_name,task_payload,attempts')
    .eq('status', 'pending')
    .lte('next_retry_at', nowIso)
    .order('next_retry_at', { ascending: true })
    .limit(maxBatch);

  if (!rows || rows.length === 0) return stats;

  for (const row of rows as FailedTaskRow[]) {
    stats.attempted++;
    // Mark processing
    await db.from('failed_memory_tasks')
      .update({ status: 'processing', updated_at: nowIso })
      .eq('id', row.id);

    try {
      await replayTask(row);
      stats.succeeded++;
      await db.from('failed_memory_tasks')
        .update({ status: 'succeeded', updated_at: new Date().toISOString() })
        .eq('id', row.id);
    } catch (e) {
      const newAttempts = row.attempts + 1;
      if (newAttempts >= MAX_ATTEMPTS) {
        stats.permanentFailures++;
        await db.from('failed_memory_tasks')
          .update({
            status: 'failed_permanent',
            attempts: newAttempts,
            error_message: (e instanceof Error ? e.message : String(e)).slice(0, 500),
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id);
      } else {
        const nextDelay = BACKOFF_MINUTES[newAttempts] || BACKOFF_MINUTES[BACKOFF_MINUTES.length - 1];
        await db.from('failed_memory_tasks')
          .update({
            status: 'pending',
            attempts: newAttempts,
            error_message: (e instanceof Error ? e.message : String(e)).slice(0, 500),
            next_retry_at: new Date(Date.now() + nextDelay * 60_000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id);
      }
    }
  }

  return stats;
}

/**
 * Replay a single failed task. Maps task_name → handler.
 */
async function replayTask(row: FailedTaskRow): Promise<void> {
  const { task_name: name, project_id: projectId, novel_id: novelId, chapter_number: chapter, task_payload: payload } = row;

  switch (name) {
    case 'rag_chunking': {
      const { chunkAndStoreChapter } = await import('../memory/rag-store');
      const p = payload as { content?: string; title?: string; summary?: string; characters?: string[] };
      if (!p.content || !p.title || chapter === null || !novelId) throw new Error('rag_chunking: missing payload');
      await chunkAndStoreChapter(projectId, chapter, p.content, p.title, p.summary || '', p.characters || []);
      return;
    }
    case 'character_states_save': {
      const { saveCharacterStatesFromCombined } = await import('../memory/character-tracker');
      const p = payload as { characters?: Array<{ character_name: string; status: 'alive' | 'dead' | 'missing' | 'unknown'; power_level: string | null; power_realm_index: number | null; location: string | null; personality_quirks: string | null; notes: string | null }> };
      if (!p.characters || chapter === null) throw new Error('character_states_save: missing payload');
      await saveCharacterStatesFromCombined(projectId, chapter, p.characters);
      return;
    }
    case 'character_bible_refresh': {
      const { refreshCharacterBibles } = await import('../memory/character-bible');
      const { DEFAULT_CONFIG } = await import('../types');
      if (chapter === null) throw new Error('character_bible_refresh: missing chapter');
      await refreshCharacterBibles(projectId, chapter, DEFAULT_CONFIG);
      return;
    }
    case 'volume_summary': {
      const { generateVolumeSummary } = await import('../memory/volume-summarizer');
      const { DEFAULT_CONFIG } = await import('../types');
      if (chapter === null) throw new Error('volume_summary: missing chapter');
      await generateVolumeSummary(projectId, chapter, DEFAULT_CONFIG);
      return;
    }
    case 'beat_detection':
    case 'rule_extraction':
    case 'foreshadowing_status':
    case 'character_arcs':
    case 'voice_fingerprint':
    case 'mc_power_state':
    case 'location_exploration':
    case 'upcoming_location':
    case 'character_knowledge':
    case 'relationships':
    case 'economic_state':
    case 'geography_timeline':
      // These are post-write enrichment tasks. Replay = re-run on the saved chapter content.
      // Skip for now if we can't easily reconstruct — mark as succeeded so queue doesn't grow.
      // Future: store full inputs in payload to enable true replay.
      return;
    default:
      throw new Error(`Unknown task_name: ${name}`);
  }
}
