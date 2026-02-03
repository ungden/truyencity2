/**
 * Author Manager Service for Story Factory
 * Manages AI author profiles and assignments
 */

import { createClient } from '@supabase/supabase-js';
import {
  AIAuthorProfile,
  FactoryGenre,
  ServiceResult,
  AuthorStatus,
} from './types';

export class AuthorManagerService {
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor(options?: { supabaseUrl?: string; supabaseKey?: string }) {
    this.supabaseUrl = options?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    this.supabaseKey = options?.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  }

  private getSupabase() {
    return createClient(this.supabaseUrl, this.supabaseKey);
  }

  /**
   * Get all active authors
   */
  async getActiveAuthors(): Promise<ServiceResult<AIAuthorProfile[]>> {
    const supabase = this.getSupabase();

    const { data, error } = await supabase
      .from('ai_author_profiles')
      .select('*')
      .eq('status', 'active')
      .order('total_stories', { ascending: true });

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_SELECT_ERROR',
      };
    }

    return {
      success: true,
      data: data as AIAuthorProfile[],
    };
  }

  /**
   * Get author by ID
   */
  async getAuthor(authorId: string): Promise<ServiceResult<AIAuthorProfile>> {
    const supabase = this.getSupabase();

    const { data, error } = await supabase
      .from('ai_author_profiles')
      .select('*')
      .eq('id', authorId)
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_SELECT_ERROR',
      };
    }

    return {
      success: true,
      data: data as AIAuthorProfile,
    };
  }

  /**
   * Find best author for a genre
   * Uses database function get_available_author if available
   */
  async findAuthorForGenre(genre: FactoryGenre): Promise<ServiceResult<AIAuthorProfile>> {
    const supabase = this.getSupabase();

    // Try using the database function first
    const { data: authorId, error: funcError } = await supabase.rpc('get_available_author', {
      p_genre: genre,
    });

    if (!funcError && authorId) {
      return this.getAuthor(authorId);
    }

    // Fallback: Manual selection
    // Priority: primary_genres > secondary_genres > any active author
    const { data: authors, error } = await supabase
      .from('ai_author_profiles')
      .select('*')
      .eq('status', 'active')
      .order('total_stories', { ascending: true });

    if (error || !authors?.length) {
      return {
        success: false,
        error: 'No active authors available',
        errorCode: 'NO_AUTHORS',
      };
    }

    // Find author with primary genre match
    let selected = authors.find(
      (a: AIAuthorProfile) =>
        a.primary_genres.includes(genre) && !a.avoid_genres.includes(genre)
    );

    // Try secondary genres
    if (!selected) {
      selected = authors.find(
        (a: AIAuthorProfile) =>
          a.secondary_genres.includes(genre) && !a.avoid_genres.includes(genre)
      );
    }

    // Fallback to any author not avoiding this genre
    if (!selected) {
      selected = authors.find((a: AIAuthorProfile) => !a.avoid_genres.includes(genre));
    }

    // Last resort: any active author
    if (!selected) {
      selected = authors[0];
    }

    return {
      success: true,
      data: selected as AIAuthorProfile,
    };
  }

  /**
   * Get authors by genre
   */
  async getAuthorsByGenre(genre: FactoryGenre): Promise<ServiceResult<AIAuthorProfile[]>> {
    const supabase = this.getSupabase();

    const { data, error } = await supabase
      .from('ai_author_profiles')
      .select('*')
      .eq('status', 'active');

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_SELECT_ERROR',
      };
    }

    // Filter authors who can write this genre
    const filtered = (data as AIAuthorProfile[]).filter(
      (a) =>
        (a.primary_genres.includes(genre) || a.secondary_genres.includes(genre)) &&
        !a.avoid_genres.includes(genre)
    );

    // Sort by relevance (primary genre match first, then by story count)
    filtered.sort((a, b) => {
      const aIsPrimary = a.primary_genres.includes(genre) ? 0 : 1;
      const bIsPrimary = b.primary_genres.includes(genre) ? 0 : 1;
      if (aIsPrimary !== bIsPrimary) return aIsPrimary - bIsPrimary;
      return a.total_stories - b.total_stories;
    });

    return {
      success: true,
      data: filtered,
    };
  }

  /**
   * Update author stats after chapter written
   */
  async updateAuthorStats(
    authorId: string,
    qualityScore: number
  ): Promise<ServiceResult<void>> {
    const supabase = this.getSupabase();

    // Use database function if available
    const { error: funcError } = await supabase.rpc('update_author_stats', {
      p_author_id: authorId,
      p_quality_score: qualityScore,
    });

    if (!funcError) {
      return { success: true };
    }

    // Fallback: Manual update
    const { data: author, error: fetchError } = await supabase
      .from('ai_author_profiles')
      .select('total_chapters, avg_quality_score')
      .eq('id', authorId)
      .single();

    if (fetchError) {
      return {
        success: false,
        error: fetchError.message,
        errorCode: 'DB_SELECT_ERROR',
      };
    }

    const newTotalChapters = (author.total_chapters || 0) + 1;
    const currentAvg = author.avg_quality_score || qualityScore;
    const newAvg =
      (currentAvg * (author.total_chapters || 0) + qualityScore) / newTotalChapters;

    const { error: updateError } = await supabase
      .from('ai_author_profiles')
      .update({
        total_chapters: newTotalChapters,
        avg_quality_score: newAvg,
      })
      .eq('id', authorId);

    if (updateError) {
      return {
        success: false,
        error: updateError.message,
        errorCode: 'DB_UPDATE_ERROR',
      };
    }

    return { success: true };
  }

  /**
   * Increment author's story count
   */
  async incrementStoryCount(authorId: string): Promise<ServiceResult<void>> {
    const supabase = this.getSupabase();

    const { error } = await supabase.rpc('increment', {
      row_id: authorId,
      table_name: 'ai_author_profiles',
      column_name: 'total_stories',
    });

    if (error) {
      // Fallback manual update
      const { data: author } = await supabase
        .from('ai_author_profiles')
        .select('total_stories')
        .eq('id', authorId)
        .single();

      await supabase
        .from('ai_author_profiles')
        .update({ total_stories: (author?.total_stories || 0) + 1 })
        .eq('id', authorId);
    }

    return { success: true };
  }

  /**
   * Create a new author profile
   */
  async createAuthor(
    profile: Omit<AIAuthorProfile, 'id' | 'created_at' | 'updated_at' | 'total_stories' | 'total_chapters' | 'avg_quality_score'>
  ): Promise<ServiceResult<AIAuthorProfile>> {
    const supabase = this.getSupabase();

    const { data, error } = await supabase
      .from('ai_author_profiles')
      .insert({
        ...profile,
        total_stories: 0,
        total_chapters: 0,
        avg_quality_score: 0,
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_INSERT_ERROR',
      };
    }

    return {
      success: true,
      data: data as AIAuthorProfile,
    };
  }

  /**
   * Update author profile
   */
  async updateAuthor(
    authorId: string,
    updates: Partial<AIAuthorProfile>
  ): Promise<ServiceResult<AIAuthorProfile>> {
    const supabase = this.getSupabase();

    const { data, error } = await supabase
      .from('ai_author_profiles')
      .update(updates)
      .eq('id', authorId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_UPDATE_ERROR',
      };
    }

    return {
      success: true,
      data: data as AIAuthorProfile,
    };
  }

  /**
   * Change author status
   */
  async setAuthorStatus(
    authorId: string,
    status: AuthorStatus
  ): Promise<ServiceResult<void>> {
    const supabase = this.getSupabase();

    const { error } = await supabase
      .from('ai_author_profiles')
      .update({ status })
      .eq('id', authorId);

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_UPDATE_ERROR',
      };
    }

    return { success: true };
  }

  /**
   * Get author leaderboard
   */
  async getLeaderboard(
    metric: 'stories' | 'chapters' | 'quality' = 'chapters',
    limit: number = 10
  ): Promise<ServiceResult<AIAuthorProfile[]>> {
    const supabase = this.getSupabase();

    const orderColumn =
      metric === 'stories'
        ? 'total_stories'
        : metric === 'quality'
          ? 'avg_quality_score'
          : 'total_chapters';

    const { data, error } = await supabase
      .from('ai_author_profiles')
      .select('*')
      .eq('status', 'active')
      .order(orderColumn, { ascending: false })
      .limit(limit);

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_SELECT_ERROR',
      };
    }

    return {
      success: true,
      data: data as AIAuthorProfile[],
    };
  }

  /**
   * Get author statistics summary
   */
  async getAuthorStats(): Promise<
    ServiceResult<{
      total: number;
      active: number;
      totalStories: number;
      totalChapters: number;
      avgQuality: number;
    }>
  > {
    const supabase = this.getSupabase();

    const { data, error } = await supabase.from('ai_author_profiles').select('*');

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_SELECT_ERROR',
      };
    }

    const authors = data as AIAuthorProfile[];
    const active = authors.filter((a) => a.status === 'active');

    const totalStories = authors.reduce((sum, a) => sum + a.total_stories, 0);
    const totalChapters = authors.reduce((sum, a) => sum + a.total_chapters, 0);
    const qualityScores = authors.filter((a) => a.avg_quality_score > 0);
    const avgQuality =
      qualityScores.length > 0
        ? qualityScores.reduce((sum, a) => sum + a.avg_quality_score, 0) / qualityScores.length
        : 0;

    return {
      success: true,
      data: {
        total: authors.length,
        active: active.length,
        totalStories,
        totalChapters,
        avgQuality: Math.round(avgQuality * 100) / 100,
      },
    };
  }

  /**
   * Balance workload across authors
   * Returns authors sorted by lowest workload
   */
  async getBalancedAuthors(genre: FactoryGenre): Promise<ServiceResult<AIAuthorProfile[]>> {
    const authorsResult = await this.getAuthorsByGenre(genre);

    if (!authorsResult.success || !authorsResult.data) {
      return authorsResult;
    }

    // Sort by total stories (ascending) to balance workload
    const balanced = [...authorsResult.data].sort((a, b) => a.total_stories - b.total_stories);

    return {
      success: true,
      data: balanced,
    };
  }
}

// Singleton instance
let authorManagerInstance: AuthorManagerService | null = null;

export function getAuthorManagerService(): AuthorManagerService {
  if (!authorManagerInstance) {
    authorManagerInstance = new AuthorManagerService();
  }
  return authorManagerInstance;
}

export function createAuthorManagerService(options?: {
  supabaseUrl?: string;
  supabaseKey?: string;
}): AuthorManagerService {
  return new AuthorManagerService(options);
}
