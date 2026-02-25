/**
 * Story Engine v2 — RAG Store
 *
 * Handles: chunk storage, embedding, and vector retrieval for long-range memory.
 * Replaces v1 rag-retriever.ts (452 lines) + parts of context-generators.ts.
 *
 * All operations are non-fatal — errors are swallowed so chapter writing continues.
 */

import { getSupabase } from '../utils/supabase';
import { embedTexts } from '../utils/gemini';

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_CHUNKS = 8;
const SIMILARITY_THRESHOLD = 0.65;
const MAX_RAG_CHARS = 6000;
const CHUNK_TARGET_WORDS = 400;
const CHUNK_MAX_CHARS = 2000;
const PARAGRAPH_MIN_CHARS = 50;

// ── Types ────────────────────────────────────────────────────────────────────

type ChunkType = 'key_event' | 'scene' | 'character_event' | 'plot_point' | 'world_detail';

interface MatchedChunk {
  id: string;
  chapter_number: number;
  chunk_type: string;
  content: string;
  similarity: number;
}

// ── Chunk Detection (Vietnamese keyword patterns) ────────────────────────────

const CHUNK_PATTERNS: Array<{ type: ChunkType; re: RegExp }> = [
  { type: 'character_event', re: /(?:đột phá|tu luyện|cảnh giới|đan dược|luyện thể|đan điền|ngưng tụ|hóa thần)/i },
  { type: 'plot_point',      re: /(?:bí mật|phát hiện|tiết lộ|chân tướng|âm mưu|kế hoạch|thân thế)/i },
  { type: 'scene',           re: /(?:chiến đấu|giao chiến|tấn công|phòng thủ|kiếm thuật|quyền cước|trận pháp)/i },
  { type: 'world_detail',    re: /(?:tông môn|thành phố|đại lục|vương quốc|miền|khu vực|biên giới)/i },
];

function detectChunkType(text: string): ChunkType {
  for (const { type, re } of CHUNK_PATTERNS) {
    if (re.test(text)) return type;
  }
  return 'scene';
}

// ── Public: Chunk + Store a Chapter ──────────────────────────────────────────

/**
 * Split chapter content into semantic chunks and store in story_memory_chunks.
 * Then embed all un-embedded chunks for this chapter.
 * Non-fatal: errors are caught and logged.
 */
export async function chunkAndStoreChapter(
  projectId: string,
  chapterNumber: number,
  content: string,
  title: string,
  summary: string,
  characters: string[],
): Promise<void> {
  try {
    const db = getSupabase();

    // 1. Always store the summary as a key_event chunk
    const rows: Array<Record<string, unknown>> = [{
      project_id: projectId,
      chapter_number: chapterNumber,
      chunk_type: 'key_event' as ChunkType,
      content: `Ch.${chapterNumber} "${title}": ${summary}`.slice(0, CHUNK_MAX_CHARS),
      metadata: { characters, title },
    }];

    // 2. Split content into paragraph groups (~400 words each)
    const paragraphs = content
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length >= PARAGRAPH_MIN_CHARS);

    let buffer = '';
    let wordCount = 0;

    for (const para of paragraphs) {
      buffer += (buffer ? '\n\n' : '') + para;
      wordCount += para.split(/\s+/).length;

      if (wordCount >= CHUNK_TARGET_WORDS) {
        const chunkText = buffer.slice(0, CHUNK_MAX_CHARS);
        const chunkChars = characters.filter(c => chunkText.includes(c));

        rows.push({
          project_id: projectId,
          chapter_number: chapterNumber,
          chunk_type: detectChunkType(chunkText),
          content: chunkText,
          metadata: { characters: chunkChars, chunk_index: rows.length },
        });

        buffer = '';
        wordCount = 0;
      }
    }

    // Flush remaining buffer
    if (buffer.length >= PARAGRAPH_MIN_CHARS) {
      rows.push({
        project_id: projectId,
        chapter_number: chapterNumber,
        chunk_type: detectChunkType(buffer),
        content: buffer.slice(0, CHUNK_MAX_CHARS),
        metadata: { characters: characters.filter(c => buffer.includes(c)), chunk_index: rows.length },
      });
    }

    // 3. Batch insert chunks
    await db.from('story_memory_chunks').insert(rows);

    // 4. Embed all un-embedded chunks for this chapter
    await embedChapterChunks(projectId, chapterNumber);
  } catch {
    // Non-fatal
  }
}

// ── Embed un-embedded chunks ─────────────────────────────────────────────────

async function embedChapterChunks(projectId: string, chapterNumber: number): Promise<void> {
  try {
    const db = getSupabase();

    const { data: chunks } = await db
      .from('story_memory_chunks')
      .select('id, content')
      .eq('project_id', projectId)
      .eq('chapter_number', chapterNumber)
      .is('embedding', null)
      .order('created_at', { ascending: true });

    if (!chunks || chunks.length === 0) return;

    const embeddings = await embedTexts(
      chunks.map(c => c.content),
      'RETRIEVAL_DOCUMENT',
    );

    // Batch update embeddings using Promise.all instead of sequential N+1 queries
    const updatePromises = chunks
      .map((chunk, i) => {
        const emb = embeddings[i];
        if (!emb) return null;
        return db
          .from('story_memory_chunks')
          .update({ embedding: JSON.stringify(emb) })
          .eq('id', chunk.id);
      })
      .filter(Boolean);

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }
  } catch {
    // Non-fatal
  }
}

// ── Public: Retrieve RAG Context ─────────────────────────────────────────────

/**
 * Retrieve semantically relevant past events for a chapter being written.
 * Returns null if any step fails or not enough history.
 */
export async function retrieveRAGContext(
  projectId: string,
  chapterNumber: number,
  arcPlanSummary: string | null,
  lastCliffhanger: string | null,
  protagonistName: string,
): Promise<string | null> {
  try {
    // Skip for early chapters (not enough history)
    if (chapterNumber <= 5) return null;

    // Build semantic query
    const parts: string[] = [];
    if (lastCliffhanger) parts.push(`Tiếp tục từ: ${lastCliffhanger.slice(0, 500)}`);
    if (arcPlanSummary) parts.push(`Arc hiện tại: ${arcPlanSummary.slice(0, 500)}`);
    parts.push(`Nhân vật chính: ${protagonistName}`);
    parts.push(`Chương hiện tại: ${chapterNumber}`);
    const query = parts.join('\n');

    // Embed with RETRIEVAL_QUERY
    const [queryEmbedding] = await embedTexts([query], 'RETRIEVAL_QUERY');
    if (!queryEmbedding) return null;

    // Vector search via RPC
    const db = getSupabase();
    const { data: chunks, error } = await db.rpc('match_story_chunks', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_project_id: projectId,
      match_threshold: SIMILARITY_THRESHOLD,
      match_count: MAX_CHUNKS,
    });

    if (error || !chunks || chunks.length === 0) return null;

    // Filter out recent chapters (already in Layer 3 context)
    const recentCutoff = Math.max(1, chapterNumber - 5);
    const relevant = (chunks as MatchedChunk[]).filter(c => c.chapter_number < recentCutoff);
    if (relevant.length === 0) return null;

    // Format
    return formatRAGContext(relevant, chapterNumber);
  } catch {
    return null;
  }
}

// ── Format RAG chunks into prompt string ─────────────────────────────────────

function formatRAGContext(chunks: MatchedChunk[], currentChapter: number): string {
  const sorted = [...chunks].sort((a, b) => b.similarity - a.similarity);

  const typeLabels: Record<string, string> = {
    key_event: 'Sự kiện quan trọng',
    plot_point: 'Điểm nút cốt truyện',
    character_event: 'Sự kiện nhân vật',
    scene: 'Cảnh quan trọng',
    world_detail: 'Chi tiết thế giới',
  };

  const typeOrder = ['key_event', 'plot_point', 'character_event', 'scene', 'world_detail'];

  // Group by type
  const byType: Record<string, MatchedChunk[]> = {};
  for (const chunk of sorted) {
    (byType[chunk.chunk_type] ??= []).push(chunk);
  }

  const lines: string[] = [];
  let totalChars = 0;

  for (const type of typeOrder) {
    for (const chunk of byType[type] || []) {
      if (totalChars >= MAX_RAG_CHARS) break;
      const label = typeLabels[type] || type;
      const ago = currentChapter - chunk.chapter_number;
      const line = `[Ch.${chunk.chapter_number}, ${ago} chương trước] (${label}) ${chunk.content.slice(0, 800)}`;
      if (totalChars + line.length > MAX_RAG_CHARS) break;
      lines.push(line);
      totalChars += line.length;
    }
  }

  if (lines.length === 0) return '';
  return `Các sự kiện liên quan từ quá khứ xa (trước 5 chương gần nhất):\n${lines.join('\n\n')}`;
}
