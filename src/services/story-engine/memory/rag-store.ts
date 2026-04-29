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

// 2026-04-29 continuity overhaul: bumped retrieval breadth for long-novel coverage.
// Was MAX_CHUNKS=8 / threshold=0.55 / MAX_RAG_CHARS=6000 — too tight for 100+ chapter novels
// where critical events live 50-200+ chapters back. DeepSeek 1M context easily handles 10K chars.
const MAX_CHUNKS = 10;
const SIMILARITY_THRESHOLD = 0.5; // Lowered further: long-range queries have weaker keyword overlap
const MAX_RAG_CHARS = 8000;
const CHUNK_TARGET_WORDS = 400;
const CHUNK_MAX_CHARS = 2000;
const PARAGRAPH_MIN_CHARS = 50;

// Hybrid scoring weights (inspired by MemPalace approach)
const WEIGHT_VECTOR = 0.50;
const WEIGHT_KEYWORD = 0.30;
const WEIGHT_TEMPORAL = 0.20;

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
      chunks.map((c: { id: string; content: string }) => c.content),
      'RETRIEVAL_DOCUMENT',
    );

    // Batch update embeddings using Promise.all instead of sequential N+1 queries
    const updatePromises = chunks
      .map((chunk: { id: string; content: string }, i: number) => {
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

// ── Hybrid Scoring (MemPalace-inspired) ─────────────────────────────────────

/** Extract Vietnamese keywords from text for keyword overlap scoring */
function extractKeywords(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2);
  // Filter out common Vietnamese stop words
  const stopWords = new Set([
    'của', 'và', 'là', 'có', 'được', 'cho', 'với', 'trong', 'này',
    'đã', 'một', 'không', 'các', 'từ', 'cũng', 'như', 'nhưng', 'hay',
    'khi', 'đến', 'thì', 'nên', 'còn', 'để', 'mà', 'vào', 'ra', 'lên',
    'rồi', 'rất', 'hơn', 'nữa', 'bị', 'tại', 'về', 'qua', 'theo',
    'hắn', 'nàng', 'gã', 'lão', 'ngươi', 'ta', 'chàng', 'nó', 'cô',
    'sẽ', 'phải', 'đều', 'lại', 'vẫn', 'thế', 'đó', 'nào', 'đây',
    'ở', 'bởi', 'sau', 'trước', 'trên', 'dưới', 'giữa', 'nếu', 'thì',
  ]);
  return new Set(words.filter(w => !stopWords.has(w)));
}

/** Keyword overlap ratio between query keywords and chunk content */
function keywordOverlapScore(queryKeywords: Set<string>, chunkContent: string): number {
  if (queryKeywords.size === 0) return 0;
  const chunkLower = chunkContent.toLowerCase();
  let matches = 0;
  for (const keyword of queryKeywords) {
    if (chunkLower.includes(keyword)) matches++;
  }
  return matches / queryKeywords.size;
}

/**
 * Temporal relevance: balance between recency and distance.
 * Chunks moderately far away (10-50 chapters) get highest scores —
 * they represent long-range memory that's likely forgotten.
 * Very old chunks (100+ chapters) get a slight penalty.
 */
function temporalScore(chunkChapter: number, currentChapter: number): number {
  const distance = currentChapter - chunkChapter;
  if (distance <= 0) return 0;
  // Sweet spot: 10-50 chapters ago (recently forgotten)
  if (distance <= 50) return 1.0;
  // Gradual decay for older content
  if (distance <= 150) return 0.8;
  return 0.6;
}

/** Re-rank chunks using hybrid scoring: vector similarity + keyword overlap + temporal proximity */
function hybridRerank(
  chunks: MatchedChunk[],
  queryKeywords: Set<string>,
  currentChapter: number,
): MatchedChunk[] {
  const scored = chunks.map(chunk => {
    const kScore = keywordOverlapScore(queryKeywords, chunk.content);
    const tScore = temporalScore(chunk.chapter_number, currentChapter);
    const hybridScore =
      WEIGHT_VECTOR * chunk.similarity +
      WEIGHT_KEYWORD * kScore +
      WEIGHT_TEMPORAL * tScore;
    return { ...chunk, similarity: hybridScore };
  });
  return scored.sort((a, b) => b.similarity - a.similarity);
}

// ── Public: Retrieve RAG Context ─────────────────────────────────────────────

/**
 * Retrieve semantically relevant past events for a chapter being written.
 * Uses hybrid scoring (vector + keyword + temporal) for better recall.
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

    // Extract keywords for hybrid scoring
    const queryKeywords = extractKeywords(query);

    // Embed with RETRIEVAL_QUERY
    const [queryEmbedding] = await embedTexts([query], 'RETRIEVAL_QUERY');
    if (!queryEmbedding) return null;

    // Vector search via RPC — fetch more candidates for re-ranking
    // 2026-04-29: bumped pool from 2x → 3x to give re-ranker more candidates,
    // crucial when query has weak keyword overlap with old chapters.
    const db = getSupabase();
    const { data: chunks, error } = await db.rpc('match_story_chunks', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_project_id: projectId,
      match_threshold: SIMILARITY_THRESHOLD,
      match_count: MAX_CHUNKS * 3,
    });

    if (error || !chunks || chunks.length === 0) return null;

    // Filter out recent chapters (already in Layer 3 context)
    const recentCutoff = Math.max(1, chapterNumber - 5);
    const candidates = (chunks as MatchedChunk[]).filter(c => c.chapter_number < recentCutoff);
    if (candidates.length === 0) return null;

    // Hybrid re-rank and take top MAX_CHUNKS
    const reranked = hybridRerank(candidates, queryKeywords, chapterNumber);
    const topChunks = reranked.slice(0, MAX_CHUNKS);

    // Format
    return formatRAGContext(topChunks, chapterNumber);
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
      // 2026-04-29 continuity overhaul: leading "→ Ch.X" instead of "[Ch.X...]" because
      // downstream prompt assembly uses `\n\n[` as section terminator regex (Writer/Critic
      // lean-context extraction). Bracketed chunk separators were causing extraction to
      // truncate after the first chunk, dropping ~50% of RAG content.
      const line = `→ Ch.${chunk.chapter_number} (${ago} chương trước, ${label}): ${chunk.content.slice(0, 800)}`;
      if (totalChars + line.length > MAX_RAG_CHARS) break;
      lines.push(line);
      totalChars += line.length;
    }
  }

  if (lines.length === 0) return '';
  return `Các sự kiện liên quan từ quá khứ xa (trước 5 chương gần nhất):\n${lines.join('\n\n')}`;
}

// ── Dual-Level RAG (LightRAG-inspired) ──────────────────────────────────────

/**
 * Level 1: Entity-level retrieval — find all chunks mentioning specific characters.
 * Complements vector search by catching entity-specific events that might have
 * low embedding similarity but are critical for consistency.
 */
export async function retrieveEntityContext(
  projectId: string,
  chapterNumber: number,
  characterNames: string[],
): Promise<string | null> {
  try {
    if (chapterNumber <= 5 || characterNames.length === 0) return null;

    const db = getSupabase();
    const recentCutoff = Math.max(1, chapterNumber - 5);

    // 2026-04-29 continuity overhaul: removed 200-chapter floor. At ch.300+, the most
    // valuable references are often 100-250 chapters back (origin events, character introductions).
    // Order DESC + limit 80 already bounds work; the floor was causing entity amnesia past 200ch.
    const { data: chunks } = await db
      .from('story_memory_chunks')
      .select('chapter_number, chunk_type, content, metadata')
      .eq('project_id', projectId)
      .lt('chapter_number', recentCutoff)
      .in('chunk_type', ['key_event', 'character_event', 'plot_point'])
      .order('chapter_number', { ascending: false })
      .limit(80);

    if (!chunks || chunks.length === 0) return null;

    // Filter chunks that mention any of our characters in metadata or content
    const targetNames = new Set(characterNames.slice(0, 5));
    const matched: Array<{ chapter_number: number; chunk_type: string; content: string; relevance: number }> = [];

    for (const chunk of chunks) {
      let relevance = 0;
      const meta = chunk.metadata as { characters?: string[] } | null;

      // Check metadata.characters
      if (meta?.characters) {
        for (const char of meta.characters) {
          if (targetNames.has(char)) relevance += 2;
        }
      }

      // Check content mentions
      for (const name of targetNames) {
        if (chunk.content.includes(name)) relevance += 1;
      }

      if (relevance > 0) {
        matched.push({
          chapter_number: chunk.chapter_number,
          chunk_type: chunk.chunk_type,
          content: chunk.content,
          relevance,
        });
      }
    }

    if (matched.length === 0) return null;

    // Sort by relevance then recency, take top 4
    matched.sort((a, b) => b.relevance - a.relevance || b.chapter_number - a.chapter_number);
    const top = matched.slice(0, 4);

    const lines: string[] = [];
    let totalChars = 0;
    const MAX_ENTITY_CHARS = 2000;

    for (const chunk of top) {
      const ago = chapterNumber - chunk.chapter_number;
      // 2026-04-29: leading "→" instead of "[Ch...]" — see formatRAGContext comment.
      const line = `→ Ch.${chunk.chapter_number} (${ago} chương trước): ${chunk.content.slice(0, 500)}`;
      if (totalChars + line.length > MAX_ENTITY_CHARS) break;
      lines.push(line);
      totalChars += line.length;
    }

    if (lines.length === 0) return null;
    return `Sự kiện liên quan đến nhân vật chính:\n${lines.join('\n\n')}`;
  } catch {
    return null;
  }
}

/**
 * Level 2: Theme-level retrieval — find chunks matching narrative themes.
 * Uses chunk_type grouping to find thematic connections (betrayal, revenge,
 * power struggles) that vector search might miss.
 */
export async function retrieveThemeContext(
  projectId: string,
  chapterNumber: number,
  arcTheme: string | null,
  plotThreads: string | null,
): Promise<string | null> {
  try {
    if (chapterNumber <= 10 || (!arcTheme && !plotThreads)) return null;

    // Extract theme keywords from arc theme and active plot threads
    const themeText = [arcTheme, plotThreads].filter(Boolean).join(' ');
    const themeKeywords = extractKeywords(themeText);

    if (themeKeywords.size < 2) return null;

    const db = getSupabase();
    const recentCutoff = Math.max(1, chapterNumber - 5);

    // Get plot_point and key_event chunks from distant past
    const { data: chunks } = await db
      .from('story_memory_chunks')
      .select('chapter_number, chunk_type, content')
      .eq('project_id', projectId)
      .lt('chapter_number', recentCutoff)
      .in('chunk_type', ['plot_point', 'key_event'])
      .order('chapter_number', { ascending: false })
      .limit(80);

    if (!chunks || chunks.length === 0) return null;

    // Score by theme keyword overlap
    const scored = (chunks as Array<{ chapter_number: number; chunk_type: string; content: string }>)
      .map(chunk => ({
        ...chunk,
        score: keywordOverlapScore(themeKeywords, chunk.content),
      })).filter(c => c.score > 0.15); // At least 15% keyword overlap

    if (scored.length === 0) return null;

    scored.sort((a: { score: number }, b: { score: number }) => b.score - a.score);
    const top = scored.slice(0, 3);

    const lines: string[] = [];
    let totalChars = 0;
    const MAX_THEME_CHARS = 1500;

    for (const chunk of top) {
      const ago = chapterNumber - chunk.chapter_number;
      // 2026-04-29: leading "→" — see formatRAGContext comment.
      const line = `→ Ch.${chunk.chapter_number} (${ago} chương trước): ${chunk.content.slice(0, 500)}`;
      if (totalChars + line.length > MAX_THEME_CHARS) break;
      lines.push(line);
      totalChars += line.length;
    }

    if (lines.length === 0) return null;
    return `Tuyến truyện liên quan từ quá khứ:\n${lines.join('\n\n')}`;
  } catch {
    return null;
  }
}
