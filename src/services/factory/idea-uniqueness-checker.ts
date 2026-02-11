/**
 * Idea Uniqueness Checker - Prevents duplicate/similar story ideas
 * 
 * Two-stage checking:
 * 1. Fast string matching (title collision, keyword overlap)
 * 2. AI-based semantic similarity (using Gemini)
 */

import { createClient } from '@supabase/supabase-js';
import type { StoryIdea, FactoryGenre } from './types';
import type { GeminiClient } from './gemini-client';
import { getGeminiClient } from './gemini-client';

export interface UniquenessResult {
  unique: boolean;
  similarity_score?: number; // 0-1 scale
  most_similar?: {
    id: string;
    title: string;
    premise: string;
    similarity: number;
    reason: string;
  };
}

export class IdeaUniquenessChecker {
  private gemini: GeminiClient;
  private supabaseUrl: string;
  private supabaseKey: string;
  private threshold: number;

  constructor(options?: {
    geminiClient?: GeminiClient;
    supabaseUrl?: string;
    supabaseKey?: string;
    threshold?: number;
  }) {
    this.gemini = options?.geminiClient || getGeminiClient();
    this.supabaseUrl = options?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    this.supabaseKey = options?.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    this.threshold = options?.threshold || 0.85;
  }

  private getSupabase() {
    return createClient(this.supabaseUrl, this.supabaseKey);
  }

  /**
   * Check if idea is unique (hybrid: string + AI comparison)
   */
  async checkUniqueness(newIdea: Partial<StoryIdea>, genre: FactoryGenre): Promise<UniquenessResult> {
    // Stage 1: Fast string-based checks (free, instant)
    const titleCollision = await this.checkTitleCollision(newIdea.title || '', genre);
    if (titleCollision) {
      return {
        unique: false,
        similarity_score: 1.0,
        most_similar: {
          id: 'exact-match',
          title: newIdea.title || '',
          premise: 'Exact title match',
          similarity: 1.0,
          reason: 'Title đã tồn tại trong database',
        },
      };
    }

    const keywordSimilarity = await this.checkPremiseKeywordOverlap(
      newIdea.premise || '',
      genre
    );
    if (keywordSimilarity.score > 0.9) {
      return {
        unique: false,
        similarity_score: keywordSimilarity.score,
        most_similar: {
          id: keywordSimilarity.idea_id,
          title: keywordSimilarity.title,
          premise: keywordSimilarity.premise,
          similarity: keywordSimilarity.score,
          reason: 'Premise có keyword overlap rất cao',
        },
      };
    }

    // Stage 2: AI-based semantic comparison (slower, more accurate)
    const aiSimilarity = await this.checkSemanticSimilarity(newIdea, genre);
    if (aiSimilarity.score > this.threshold) {
      return {
        unique: false,
        similarity_score: aiSimilarity.score,
        most_similar: {
          id: aiSimilarity.idea_id,
          title: aiSimilarity.title,
          premise: aiSimilarity.premise,
          similarity: aiSimilarity.score,
          reason: aiSimilarity.reason,
        },
      };
    }

    return { unique: true };
  }

  /**
   * Check for exact title collision
   */
  private async checkTitleCollision(title: string, genre: FactoryGenre): Promise<boolean> {
    const supabase = this.getSupabase();

    const { data, error } = await supabase
      .from('story_ideas')
      .select('id')
      .eq('genre', genre)
      .ilike('title', title) // Case-insensitive exact match
      .limit(1);

    if (error) {
      console.error('Title collision check failed:', error);
      return false;
    }

    return data && data.length > 0;
  }

  /**
   * Check premise keyword overlap (simple but fast)
   */
  private async checkPremiseKeywordOverlap(
    premise: string,
    genre: FactoryGenre
  ): Promise<{ score: number; idea_id: string; title: string; premise: string }> {
    const supabase = this.getSupabase();

    const { data: existing, error } = await supabase
      .from('story_ideas')
      .select('id, title, premise')
      .eq('genre', genre)
      .not('premise', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50); // Check last 50 ideas

    if (error || !existing || existing.length === 0) {
      return { score: 0, idea_id: '', title: '', premise: '' };
    }

    // Calculate keyword overlap using Jaccard similarity
    const newWords = new Set(
      premise
        .toLowerCase()
        .split(/\s+/)
        .filter((w: string) => w.length > 3) // Ignore short words
    );

    let maxSimilarity = 0;
    let mostSimilar = existing[0];

    for (const idea of existing) {
      const existingWords = new Set(
        (idea.premise || '')
          .toLowerCase()
          .split(/\s+/)
          .filter((w: string) => w.length > 3)
      );

      const intersection = [...newWords].filter((w) => existingWords.has(w)).length;
      const union = new Set([...newWords, ...existingWords]).size;
      const similarity = union > 0 ? intersection / union : 0;

      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        mostSimilar = idea;
      }
    }

    return {
      score: maxSimilarity,
      idea_id: mostSimilar.id,
      title: mostSimilar.title,
      premise: mostSimilar.premise || '',
    };
  }

  /**
   * Check semantic similarity using Gemini AI
   */
  private async checkSemanticSimilarity(
    newIdea: Partial<StoryIdea>,
    genre: FactoryGenre
  ): Promise<{ score: number; idea_id: string; title: string; premise: string; reason: string }> {
    const supabase = this.getSupabase();

    // Fetch recent ideas from same genre
    const { data: existing, error } = await supabase
      .from('story_ideas')
      .select('id, title, premise, hook')
      .eq('genre', genre)
      .not('premise', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20); // Check last 20 ideas (balance between accuracy and prompt length)

    if (error || !existing || existing.length === 0) {
      return { score: 0, idea_id: '', title: '', premise: '', reason: '' };
    }

    const prompt = `So sánh Ý TƯỞNG MỚI với các ý tưởng ĐÃ CÓ và đánh giá độ tương đồng (0.0-1.0):

Ý TƯỞNG MỚI:
Tên: ${newIdea.title}
Tiền đề: ${newIdea.premise}
Hook: ${newIdea.hook || 'Không có'}

Ý TƯỞNG ĐÃ CÓ:
${existing
  .map(
    (e, i) =>
      `${i + 1}. Tên: ${e.title}
   Tiền đề: ${e.premise}`
  )
  .join('\n\n')}

Với MỖI ý tưởng đã có, đánh giá độ tương đồng (0.0-1.0) dựa trên:
- Premise có cùng concept/setting/conflict không? (40% trọng số)
- Golden finger có giống nhau không? (30% trọng số)
- Protagonist archetype có giống không? (20% trọng số)
- Main goal/journey có giống không? (10% trọng số)

CHÚ Ý: 
- Chỉ coi là "tương đồng cao" nếu cả 4 yếu tố đều giống nhau
- Nếu chỉ giống 1-2 yếu tố thì score <= 0.5
- Title khác nhau không quan trọng, quan trọng là premise

OUTPUT JSON (chỉ JSON, không markdown):
{
  "comparisons": [
    {"index": 1, "score": 0.0-1.0, "reason": "Giải thích tại sao giống/khác..."},
    {"index": 2, "score": 0.0-1.0, "reason": "..."}
  ],
  "most_similar": {
    "index": 1-20,
    "score": 0.0-1.0,
    "reason": "Tóm tắt điểm giống nhất..."
  }
}`;

    try {
      const result = await this.gemini.chat(
        [{ role: 'user', parts: [{ text: prompt }] }],
        {
          temperature: 0.1, // Very low temp for consistent comparison
          maxOutputTokens: 2048,
        }
      );

      if (!result.success || !result.data) {
        console.error('Gemini comparison failed:', result.error);
        return { score: 0, idea_id: '', title: '', premise: '', reason: 'AI comparison failed' };
      }

      // Parse JSON response
      const responseText = result.data.content;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON in response:', responseText);
        return { score: 0, idea_id: '', title: '', premise: '', reason: 'Invalid AI response' };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const mostSimilar = parsed.most_similar;

      if (!mostSimilar || mostSimilar.index < 1 || mostSimilar.index > existing.length) {
        return { score: 0, idea_id: '', title: '', premise: '', reason: 'No similar idea found' };
      }

      const similarIdea = existing[mostSimilar.index - 1];

      return {
        score: Math.max(0, Math.min(1, mostSimilar.score || 0)),
        idea_id: similarIdea.id,
        title: similarIdea.title,
        premise: similarIdea.premise || '',
        reason: mostSimilar.reason || 'Tương đồng về premise và golden finger',
      };
    } catch (error) {
      console.error('Semantic similarity check failed:', error);
      return { score: 0, idea_id: '', title: '', premise: '', reason: 'Error during comparison' };
    }
  }
}
