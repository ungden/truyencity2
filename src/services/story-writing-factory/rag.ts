/**
 * Story Writing Factory - RAG (Retrieval Augmented Generation)
 *
 * Handles:
 * 1. Creating embeddings for chapter content
 * 2. Storing in vector database
 * 3. Semantic search for relevant context
 * 4. Building optimized context for chapter writing
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization to avoid build-time errors
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

// ============================================================================
// TYPES
// ============================================================================

export interface EmbeddingContent {
  projectId: string;
  chapterNumber: number;
  contentType: 'chapter_summary' | 'key_event' | 'character_moment' | 'world_detail' | 'dialogue';
  content: string;
  charactersInvolved?: string[];
  location?: string;
  importance?: number;
}

export interface SearchResult {
  id: string;
  chapterNumber: number;
  contentType: string;
  content: string;
  charactersInvolved: string[];
  location: string;
  importance: number;
  similarity: number;
}

export interface RAGContext {
  relevantEvents: SearchResult[];
  characterContext: SearchResult[];
  worldContext: SearchResult[];
  recentSummaries: string[];
  totalTokensEstimate: number;
}

// ============================================================================
// RAG SERVICE CLASS
// ============================================================================

export class RAGService {
  private embeddingModel: string;
  private maxContextTokens: number;

  constructor(options?: {
    embeddingModel?: string;
    maxContextTokens?: number;
  }) {
    this.embeddingModel = options?.embeddingModel || 'text-embedding-ada-002';
    this.maxContextTokens = options?.maxContextTokens || 4000;
  }

  private get supabase() {
    return getSupabase();
  }

  // ============================================================================
  // EMBEDDING GENERATION
  // ============================================================================

  /**
   * Generate embedding for text using OpenAI or compatible API
   */
  async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      // Use Supabase Edge Function for embedding generation
      const { data, error } = await this.supabase.functions.invoke('generate-embedding', {
        body: { text, model: this.embeddingModel },
      });

      if (error) {
        console.error('Embedding generation error:', error);
        // Fallback: try direct OpenRouter call
        return this.generateEmbeddingFallback(text);
      }

      return data?.embedding || null;
    } catch (error) {
      console.error('Embedding error:', error);
      return this.generateEmbeddingFallback(text);
    }
  }

  /**
   * Fallback embedding generation — returns null (no external provider needed).
   * Primary path uses Supabase Edge Function; if that fails, embeddings are skipped.
   */
  private async generateEmbeddingFallback(_text: string): Promise<number[] | null> {
    console.warn('[RAGService] Embedding fallback: no external provider configured, skipping.');
    return null;
  }

  // ============================================================================
  // CONTENT INDEXING
  // ============================================================================

  /**
   * Index chapter content into the vector database
   */
  async indexChapterContent(
    projectId: string,
    chapterNumber: number,
    content: {
      summary: string;
      keyEvents: string[];
      characterMoments: Array<{ character: string; moment: string }>;
      worldDetails: string[];
      importantDialogues: string[];
    }
  ): Promise<{ success: boolean; indexed: number; errors: string[] }> {
    const results = { success: true, indexed: 0, errors: [] as string[] };

    // Index summary
    if (content.summary) {
      const result = await this.indexContent({
        projectId,
        chapterNumber,
        contentType: 'chapter_summary',
        content: content.summary,
        importance: 8,
      });
      if (result) results.indexed++;
      else results.errors.push('Failed to index summary');
    }

    // Index key events
    for (const event of content.keyEvents) {
      const result = await this.indexContent({
        projectId,
        chapterNumber,
        contentType: 'key_event',
        content: event,
        importance: 7,
      });
      if (result) results.indexed++;
      else results.errors.push(`Failed to index event: ${event.substring(0, 50)}`);
    }

    // Index character moments
    for (const moment of content.characterMoments) {
      const result = await this.indexContent({
        projectId,
        chapterNumber,
        contentType: 'character_moment',
        content: moment.moment,
        charactersInvolved: [moment.character],
        importance: 6,
      });
      if (result) results.indexed++;
    }

    // Index world details
    for (const detail of content.worldDetails) {
      const result = await this.indexContent({
        projectId,
        chapterNumber,
        contentType: 'world_detail',
        content: detail,
        importance: 5,
      });
      if (result) results.indexed++;
    }

    // Index dialogues
    for (const dialogue of content.importantDialogues) {
      const result = await this.indexContent({
        projectId,
        chapterNumber,
        contentType: 'dialogue',
        content: dialogue,
        importance: 4,
      });
      if (result) results.indexed++;
    }

    results.success = results.errors.length === 0;
    return results;
  }

  /**
   * Index a single piece of content
   */
  async indexContent(content: EmbeddingContent): Promise<boolean> {
    try {
      const embedding = await this.generateEmbedding(content.content);

      const { error } = await this.supabase
        .from('story_embeddings')
        .insert({
          project_id: content.projectId,
          chapter_number: content.chapterNumber,
          content_type: content.contentType,
          content: content.content,
          characters_involved: content.charactersInvolved || [],
          location: content.location,
          importance: content.importance || 5,
          embedding,
        });

      if (error) {
        console.error('Index content error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Index error:', error);
      return false;
    }
  }

  // ============================================================================
  // CONTEXT RETRIEVAL
  // ============================================================================

  /**
   * Build context for writing a new chapter using RAG
   */
  async buildChapterContext(
    projectId: string,
    chapterNumber: number,
    query: {
      arcDescription?: string;
      chapterGoal?: string;
      charactersInvolved?: string[];
    }
  ): Promise<RAGContext> {
    const context: RAGContext = {
      relevantEvents: [],
      characterContext: [],
      worldContext: [],
      recentSummaries: [],
      totalTokensEstimate: 0,
    };

    // 1. Get recent chapter summaries (last 5 chapters)
    const recentStart = Math.max(1, chapterNumber - 5);
    const { data: recentChapters } = await this.supabase
      .from('story_embeddings')
      .select('chapter_number, content')
      .eq('project_id', projectId)
      .eq('content_type', 'chapter_summary')
      .gte('chapter_number', recentStart)
      .lt('chapter_number', chapterNumber)
      .order('chapter_number', { ascending: true });

    if (recentChapters) {
      context.recentSummaries = recentChapters.map(
        c => `Chương ${c.chapter_number}: ${c.content}`
      );
    }

    // 2. Search for relevant events based on arc/chapter description
    if (query.arcDescription || query.chapterGoal) {
      const searchQuery = `${query.arcDescription || ''} ${query.chapterGoal || ''}`.trim();
      const relevantResults = await this.searchContent(
        projectId,
        searchQuery,
        {
          contentTypes: ['key_event', 'chapter_summary'],
          maxChapter: chapterNumber - 1,
          limit: 10,
        }
      );
      context.relevantEvents = relevantResults;
    }

    // 3. Get character context for involved characters
    if (query.charactersInvolved && query.charactersInvolved.length > 0) {
      for (const character of query.charactersInvolved.slice(0, 3)) {
        const characterResults = await this.searchContent(
          projectId,
          `${character} hành động tính cách phát triển`,
          {
            contentTypes: ['character_moment'],
            maxChapter: chapterNumber - 1,
            limit: 5,
          }
        );
        context.characterContext.push(...characterResults);
      }
    }

    // 4. Get world context
    const worldResults = await this.searchContent(
      projectId,
      'thế giới quy tắc địa điểm môn phái',
      {
        contentTypes: ['world_detail'],
        maxChapter: chapterNumber - 1,
        limit: 5,
      }
    );
    context.worldContext = worldResults;

    // Estimate total tokens
    const allContent = [
      ...context.recentSummaries,
      ...context.relevantEvents.map(r => r.content),
      ...context.characterContext.map(r => r.content),
      ...context.worldContext.map(r => r.content),
    ];
    context.totalTokensEstimate = Math.ceil(allContent.join(' ').length / 4);

    return context;
  }

  /**
   * Search for relevant content using vector similarity
   */
  async searchContent(
    projectId: string,
    query: string,
    options?: {
      contentTypes?: string[];
      maxChapter?: number;
      limit?: number;
      minSimilarity?: number;
    }
  ): Promise<SearchResult[]> {
    const limit = options?.limit || 10;
    const minSimilarity = options?.minSimilarity || 0.5;

    // Generate embedding for query
    const queryEmbedding = await this.generateEmbedding(query);
    if (!queryEmbedding) {
      console.error('Failed to generate query embedding');
      return [];
    }

    try {
      // Use the RPC function for vector search
      const { data, error } = await this.supabase.rpc('search_story_context', {
        p_project_id: projectId,
        p_query_embedding: queryEmbedding,
        p_limit: limit,
        p_content_types: options?.contentTypes || null,
        p_max_chapter: options?.maxChapter || null,
      });

      if (error) {
        console.error('Search error:', error);
        return [];
      }

      // Filter by minimum similarity
      return (data || [])
        .filter((r: any) => r.similarity >= minSimilarity)
        .map((r: any) => ({
          id: r.id,
          chapterNumber: r.chapter_number,
          contentType: r.content_type,
          content: r.content,
          charactersInvolved: r.characters_involved || [],
          location: r.location || '',
          importance: r.importance,
          similarity: r.similarity,
        }));
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  // ============================================================================
  // CONTEXT FORMATTING
  // ============================================================================

  /**
   * Format RAG context into a string for the writing prompt
   */
  formatContextForPrompt(context: RAGContext, maxTokens?: number): string {
    const maxLen = maxTokens || this.maxContextTokens;
    const parts: string[] = [];
    let currentLength = 0;

    // Add recent summaries first (most important)
    if (context.recentSummaries.length > 0) {
      const summaries = `## Các chương gần đây:\n${context.recentSummaries.join('\n\n')}`;
      if (currentLength + summaries.length / 4 < maxLen) {
        parts.push(summaries);
        currentLength += summaries.length / 4;
      }
    }

    // Add relevant events
    if (context.relevantEvents.length > 0 && currentLength < maxLen * 0.7) {
      const events = context.relevantEvents
        .slice(0, 5)
        .map(e => `- (Ch.${e.chapterNumber}) ${e.content}`)
        .join('\n');
      const section = `## Sự kiện liên quan:\n${events}`;
      if (currentLength + section.length / 4 < maxLen) {
        parts.push(section);
        currentLength += section.length / 4;
      }
    }

    // Add character context
    if (context.characterContext.length > 0 && currentLength < maxLen * 0.85) {
      const charContext = context.characterContext
        .slice(0, 3)
        .map(c => `- ${c.charactersInvolved.join(', ')}: ${c.content}`)
        .join('\n');
      const section = `## Thông tin nhân vật:\n${charContext}`;
      if (currentLength + section.length / 4 < maxLen) {
        parts.push(section);
        currentLength += section.length / 4;
      }
    }

    // Add world context
    if (context.worldContext.length > 0 && currentLength < maxLen * 0.95) {
      const world = context.worldContext
        .slice(0, 3)
        .map(w => `- ${w.content}`)
        .join('\n');
      const section = `## Chi tiết thế giới:\n${world}`;
      if (currentLength + section.length / 4 < maxLen) {
        parts.push(section);
      }
    }

    return parts.join('\n\n');
  }
}

// ============================================================================
// CONTENT EXTRACTOR - Extract indexable content from chapters
// ============================================================================

export class ContentExtractor {
  /**
   * Extract key content from a chapter for indexing
   */
  static extractFromChapter(
    chapterNumber: number,
    title: string,
    content: string,
    protagonistName: string
  ): {
    summary: string;
    keyEvents: string[];
    characterMoments: Array<{ character: string; moment: string }>;
    worldDetails: string[];
    importantDialogues: string[];
  } {
    // Simple extraction - in production, use AI for better extraction
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);

    // Extract summary (first paragraph or ~500 chars)
    const summary = `${title}: ${content.substring(0, 500)}...`;

    // Extract key events (sentences with action words)
    const actionWords = ['đột phá', 'chiến đấu', 'phát hiện', 'gặp', 'nhận được', 'bị', 'trở thành', 'giết', 'cứu', 'thua', 'thắng'];
    const keyEvents = sentences
      .filter(s => actionWords.some(w => s.toLowerCase().includes(w)))
      .slice(0, 5);

    // Extract character moments (sentences mentioning protagonist)
    const characterMoments = sentences
      .filter(s => s.includes(protagonistName))
      .slice(0, 3)
      .map(moment => ({ character: protagonistName, moment }));

    // Extract world details (sentences with location/cultivation words)
    const worldWords = ['tu luyện', 'cảnh giới', 'môn phái', 'tông môn', 'thành phố', 'đại lục', 'bí cảnh', 'linh khí'];
    const worldDetails = sentences
      .filter(s => worldWords.some(w => s.toLowerCase().includes(w)))
      .slice(0, 3);

    // Extract important dialogues
    const dialoguePattern = /"([^"]+)"/g;
    const dialogues: string[] = [];
    let match;
    while ((match = dialoguePattern.exec(content)) !== null) {
      if (match[1].length > 30) {
        dialogues.push(match[1]);
      }
    }

    return {
      summary,
      keyEvents,
      characterMoments,
      worldDetails,
      importantDialogues: dialogues.slice(0, 3),
    };
  }
}

// Export singleton
export const ragService = new RAGService();
