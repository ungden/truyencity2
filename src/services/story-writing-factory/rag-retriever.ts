/**
 * RAG Retriever - Embedding + Vector Search for Continuous Story Memory
 *
 * Two responsibilities:
 * 1. embedText() — calls Gemini gemini-embedding-001 REST API to produce 3072-dim vectors
 * 2. retrieveRAGContext() — embeds a query, searches story_memory_chunks via
 *    match_story_chunks() RPC, and formats results into a prompt-ready string
 *
 * Design decisions:
 * - Direct fetch() to Gemini REST API (no SDK) — consistent with existing codebase
 * - Batch embedding support (up to 100 texts per request) for post-write chunking
 * - Token budget: RAG section capped at ~2,000 tokens to stay within 27K total
 * - Non-fatal: all errors are swallowed and logged; chapter writing continues without RAG
 */

import { getSupabase } from './supabase-helper';
import { logger } from '@/lib/security/logger';

// ============================================================================
// CONSTANTS
// ============================================================================

const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const EMBEDDING_DIMENSION = 768;
const OUTPUT_DIMENSIONALITY = 768; // Truncate 3072 -> 768 to keep DB column compatible

/** Max chunks to retrieve per query */
const MAX_CHUNKS = 8;
/** Minimum cosine similarity threshold */
const SIMILARITY_THRESHOLD = 0.65;
/** Max characters for the formatted RAG context string (~2,000 tokens) */
const MAX_RAG_CHARS = 6000;
/** Max retries for embedding API calls */
const MAX_RETRIES = 2;
/** Retry delays in ms */
const RETRY_DELAYS = [1000, 3000];

// ============================================================================
// TYPES
// ============================================================================

interface MatchedChunk {
  id: string;
  project_id: string;
  chapter_number: number;
  chunk_type: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

// ============================================================================
// EMBEDDING
// ============================================================================

/**
 * Generate embedding for a single text using Gemini gemini-embedding-001.
 * Returns a 768-dim float array, or null on failure.
 */
export async function embedText(text: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.debug('GEMINI_API_KEY not set — skipping embedding');
    return null;
  }

  // Truncate extremely long texts (embedding model has 2048 token limit)
  const truncated = text.slice(0, 8000);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt - 1] || 3000));
      }

      const response = await fetch(
        `${GEMINI_API_BASE}/models/${GEMINI_EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: `models/${GEMINI_EMBEDDING_MODEL}`,
            content: {
              parts: [{ text: truncated }],
            },
            taskType: 'RETRIEVAL_DOCUMENT',
            outputDimensionality: OUTPUT_DIMENSIONALITY,
          }),
          signal: AbortSignal.timeout(15000), // 15s timeout
        },
      );

      if (response.status === 429 || response.status === 503) {
        logger.debug(`Embedding API ${response.status}, retry ${attempt + 1}/${MAX_RETRIES}`);
        continue;
      }

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        logger.debug('Embedding API error', { status: response.status, body: errBody.slice(0, 200) });
        return null;
      }

      const data = await response.json();
      const values = data?.embedding?.values;

      if (!Array.isArray(values) || values.length !== EMBEDDING_DIMENSION) {
        logger.debug('Unexpected embedding shape', { length: values?.length });
        return null;
      }

      return values;
    } catch (e) {
      if (attempt >= MAX_RETRIES) {
        logger.debug('Embedding failed after retries', { error: e instanceof Error ? e.message : String(e) });
        return null;
      }
    }
  }
  return null;
}

/**
 * Generate embeddings for multiple texts in batch.
 * Gemini batchEmbedContents supports up to 100 texts.
 * Returns an array of embeddings (null for failed ones).
 */
export async function embedBatch(texts: string[]): Promise<(number[] | null)[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || texts.length === 0) {
    return texts.map(() => null);
  }

  // Gemini batch limit is 100 requests per call
  const BATCH_SIZE = 100;
  const results: (number[] | null)[] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    try {
      const requests = batch.map(text => ({
        model: `models/${GEMINI_EMBEDDING_MODEL}`,
        content: {
          parts: [{ text: text.slice(0, 8000) }],
        },
        taskType: 'RETRIEVAL_DOCUMENT',
        outputDimensionality: OUTPUT_DIMENSIONALITY,
      }));

      const response = await fetch(
        `${GEMINI_API_BASE}/models/${GEMINI_EMBEDDING_MODEL}:batchEmbedContents?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests }),
          signal: AbortSignal.timeout(30000), // 30s for batch
        },
      );

      if (!response.ok) {
        // Fall back to individual embedding for this batch
        logger.debug('Batch embedding failed, falling back to individual', { status: response.status });
        for (const text of batch) {
          results.push(await embedText(text));
        }
        continue;
      }

      const data = await response.json();
      const embeddings = data?.embeddings;

      if (!Array.isArray(embeddings)) {
        for (const text of batch) {
          results.push(await embedText(text));
        }
        continue;
      }

      for (let j = 0; j < batch.length; j++) {
        const values = embeddings[j]?.values;
        results.push(
          Array.isArray(values) && values.length === EMBEDDING_DIMENSION ? values : null,
        );
      }
    } catch (e) {
      logger.debug('Batch embedding error', { error: e instanceof Error ? e.message : String(e) });
      // Fall back to individual calls
      for (const text of batch) {
        results.push(await embedText(text));
      }
    }
  }

  return results;
}

// ============================================================================
// EMBED + UPDATE STORED CHUNKS
// ============================================================================

/**
 * Embed all un-embedded chunks for a given project+chapter.
 * Called as a post-write step after chunkAndStoreChapter().
 *
 * Strategy: load all chunks for this chapter that have NULL embedding,
 * batch-embed them, then update each row.
 */
export async function embedChapterChunks(
  projectId: string,
  chapterNumber: number,
): Promise<number> {
  try {
    const supabase = getSupabase();

    // Load un-embedded chunks for this chapter
    const { data: chunks, error } = await supabase
      .from('story_memory_chunks')
      .select('id, content')
      .eq('project_id', projectId)
      .eq('chapter_number', chapterNumber)
      .is('embedding', null)
      .order('created_at', { ascending: true });

    if (error || !chunks || chunks.length === 0) {
      return 0;
    }

    // Batch embed
    const texts = chunks.map(c => c.content);
    const embeddings = await embedBatch(texts);

    // Update each chunk with its embedding
    let updated = 0;
    for (let i = 0; i < chunks.length; i++) {
      const embedding = embeddings[i];
      if (!embedding) continue;

      const { error: updateError } = await supabase
        .from('story_memory_chunks')
        .update({ embedding: JSON.stringify(embedding) })
        .eq('id', chunks[i].id);

      if (!updateError) updated++;
    }

    if (updated > 0) {
      logger.debug('Embedded chapter chunks', { projectId, chapterNumber, total: chunks.length, embedded: updated });
    }
    return updated;
  } catch (e) {
    logger.debug('embedChapterChunks failed (non-fatal)', {
      projectId, chapterNumber,
      error: e instanceof Error ? e.message : String(e),
    });
    return 0;
  }
}

// ============================================================================
// RAG RETRIEVAL
// ============================================================================

/**
 * Build a RAG query from the current chapter context.
 * Combines: arc plan summary + last chapter cliffhanger + character names.
 * This produces a semantically rich query that finds relevant past events.
 */
function buildRAGQuery(
  arcPlanSummary: string | null,
  lastCliffhanger: string | null,
  protagonistName: string,
  chapterNumber: number,
): string {
  const parts: string[] = [];

  if (lastCliffhanger) {
    parts.push(`Tiếp tục từ: ${lastCliffhanger.slice(0, 500)}`);
  }
  if (arcPlanSummary) {
    parts.push(`Arc hiện tại: ${arcPlanSummary.slice(0, 500)}`);
  }
  parts.push(`Nhân vật chính: ${protagonistName}`);
  parts.push(`Chương hiện tại: ${chapterNumber}`);

  return parts.join('\n');
}

/**
 * Retrieve relevant RAG context for a chapter being written.
 *
 * Flow:
 * 1. Build a semantic query from arc plan + cliffhanger
 * 2. Embed the query with Gemini (taskType: RETRIEVAL_QUERY)
 * 3. Call match_story_chunks() RPC for vector similarity search
 * 4. Format top results into a prompt-ready string
 *
 * Returns null if any step fails (non-fatal).
 */
export async function retrieveRAGContext(
  projectId: string,
  chapterNumber: number,
  arcPlanSummary: string | null,
  lastCliffhanger: string | null,
  protagonistName: string,
): Promise<string | null> {
  try {
    // Skip RAG for very early chapters (not enough history)
    if (chapterNumber <= 5) {
      return null;
    }

    const query = buildRAGQuery(arcPlanSummary, lastCliffhanger, protagonistName, chapterNumber);

    // Embed the query (using RETRIEVAL_QUERY task type for better search)
    const queryEmbedding = await embedQuery(query);
    if (!queryEmbedding) {
      return null;
    }

    const supabase = getSupabase();

    // Call the match_story_chunks RPC
    const { data: chunks, error } = await supabase.rpc('match_story_chunks', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_project_id: projectId,
      match_threshold: SIMILARITY_THRESHOLD,
      match_count: MAX_CHUNKS,
    });

    if (error) {
      logger.debug('match_story_chunks RPC failed', { error: error.message });
      return null;
    }

    if (!chunks || chunks.length === 0) {
      return null;
    }

    // Filter out chunks from recent chapters (already in Layer 3 context)
    const recentCutoff = Math.max(1, chapterNumber - 5);
    const relevantChunks = (chunks as MatchedChunk[]).filter(
      c => c.chapter_number < recentCutoff,
    );

    if (relevantChunks.length === 0) {
      return null;
    }

    // Format into prompt-ready string
    return formatRAGContext(relevantChunks, chapterNumber);
  } catch (e) {
    logger.debug('retrieveRAGContext failed (non-fatal)', {
      projectId,
      chapterNumber,
      error: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}

/**
 * Embed a query string (uses RETRIEVAL_QUERY task type for asymmetric search).
 */
async function embedQuery(text: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/models/${GEMINI_EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${GEMINI_EMBEDDING_MODEL}`,
          content: {
            parts: [{ text: text.slice(0, 8000) }],
          },
          taskType: 'RETRIEVAL_QUERY',
          outputDimensionality: OUTPUT_DIMENSIONALITY,
        }),
        signal: AbortSignal.timeout(15000),
      },
    );

    if (!response.ok) return null;

    const data = await response.json();
    const values = data?.embedding?.values;

    return Array.isArray(values) && values.length === EMBEDDING_DIMENSION ? values : null;
  } catch {
    return null;
  }
}

/**
 * Format matched chunks into a prompt-ready context string.
 * Groups by chunk type and respects MAX_RAG_CHARS budget.
 */
function formatRAGContext(chunks: MatchedChunk[], currentChapter: number): string {
  // Sort by relevance (similarity descending)
  const sorted = [...chunks].sort((a, b) => b.similarity - a.similarity);

  const sections: string[] = [];
  let totalChars = 0;

  // Group chunks by type for organized display
  const byType: Record<string, MatchedChunk[]> = {};
  for (const chunk of sorted) {
    const type = chunk.chunk_type;
    if (!byType[type]) byType[type] = [];
    byType[type].push(chunk);
  }

  // Type display names (Vietnamese)
  const typeLabels: Record<string, string> = {
    key_event: 'Sự kiện quan trọng',
    plot_point: 'Điểm nút cốt truyện',
    character_event: 'Sự kiện nhân vật',
    scene: 'Cảnh quan trọng',
    world_detail: 'Chi tiết thế giới',
  };

  // Priority order: key events first, then plot points, character events, scenes, world details
  const typeOrder = ['key_event', 'plot_point', 'character_event', 'scene', 'world_detail'];

  for (const type of typeOrder) {
    const typeChunks = byType[type];
    if (!typeChunks) continue;

    for (const chunk of typeChunks) {
      if (totalChars >= MAX_RAG_CHARS) break;

      const label = typeLabels[type] || type;
      const chaptersAgo = currentChapter - chunk.chapter_number;
      const line = `[Ch.${chunk.chapter_number}, ${chaptersAgo} chương trước] (${label}) ${chunk.content.slice(0, 800)}`;

      if (totalChars + line.length > MAX_RAG_CHARS) break;

      sections.push(line);
      totalChars += line.length;
    }
  }

  if (sections.length === 0) return '';

  return `Các sự kiện liên quan từ quá khứ xa (trước 5 chương gần nhất):\n${sections.join('\n\n')}`;
}
