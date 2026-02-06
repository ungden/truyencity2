/**
 * Idea Bank Service for Story Factory
 * Generates and manages story ideas using Gemini AI
 */

import { createClient } from '@supabase/supabase-js';
import { GeminiClient, getGeminiClient } from './gemini-client';
import {
  FactoryGenre,
  StoryIdea,
  IdeaGenerationPrompt,
  ServiceResult,
  BatchResult,
  DEFAULT_GENRE_DISTRIBUTION,
  TargetAudience,
  ContentRating,
} from './types';

// Tropes by genre for variety
const GENRE_TROPES: Record<FactoryGenre, string[]> = {
  'system-litrpg': [
    'sign-in system',
    'daily rewards',
    'tower climbing',
    'dungeon exploration',
    'monster hunting',
    'skill awakening',
    'class evolution',
    'inventory system',
    'stat growth',
    'quest completion',
    'achievement hunting',
    'leaderboard competition',
  ],
  'urban-modern': [
    'rich CEO',
    'hidden identity',
    'business warfare',
    'real estate empire',
    'entertainment industry',
    'medical genius',
    'return of the king',
    'school campus',
    'office romance',
    'family drama',
    'inheritance battle',
    'undercover billionaire',
  ],
  romance: [
    'enemies to lovers',
    'fake relationship',
    'second chance',
    'arranged marriage',
    'childhood friends',
    'forbidden love',
    'slow burn',
    'love triangle',
    'celebrity romance',
    'boss/employee',
    'secret identity',
    'healing journey',
  ],
  'huyen-huyen': [
    'beast taming',
    'magic academy',
    'dimensional travel',
    'artifact crafting',
    'elemental mastery',
    'bloodline awakening',
    'space manipulation',
    'time reversal',
    'soul cultivation',
    'divine inheritance',
    'demon transformation',
    'world creation',
  ],
  'action-adventure': [
    'treasure hunting',
    'martial arts tournament',
    'assassin organization',
    'military special forces',
    'bounty hunter',
    'survival game',
    'revenge quest',
    'prison escape',
    'gang warfare',
    'international spy',
    'mercenary life',
    'underground fighting',
  ],
  historical: [
    'palace intrigue',
    'war general',
    'merchant empire',
    'spy network',
    'rebellion leader',
    'imperial examination',
    'harem politics',
    'throne succession',
    'border defense',
    'diplomatic mission',
    'secret society',
    'cultural revolution',
  ],
  'tien-hiep': [
    'pill refinement',
    'sword cultivation',
    'sect politics',
    'heavenly tribulation',
    'ancient inheritance',
    'dual cultivation',
    'body refinement',
    'formation master',
    'ascending to immortality',
    'reincarnation',
    'divine treasure',
    'supreme bloodline',
  ],
  'sci-fi-apocalypse': [
    'zombie survival',
    'alien invasion',
    'post-nuclear',
    'AI uprising',
    'space exploration',
    'time travel',
    'genetic mutation',
    'virtual reality',
    'climate disaster',
    'pandemic survival',
    'mech pilot',
    'colony ship',
  ],
  'horror-mystery': [
    'haunted location',
    'serial killer',
    'supernatural entity',
    'cursed object',
    'psychological thriller',
    'cult investigation',
    'urban legend',
    'paranormal detective',
    'trapped scenario',
    'unreliable narrator',
    'cosmic horror',
    'ghost story',
  ],
};

// Protagonist archetypes
const PROTAGONIST_ARCHETYPES = [
  'humble origin rising star',
  'fallen genius returning',
  'reincarnated ancient master',
  'system chosen one',
  'lucky pervert protagonist',
  'cold calculating strategist',
  'hot-blooded fighter',
  'hidden identity master',
  'underdog with golden finger',
  'transmigrator with knowledge',
  'awakened bloodline heir',
  'ordinary person with extraordinary luck',
];

// Antagonist types
const ANTAGONIST_TYPES = [
  'arrogant young master',
  'scheming elder',
  'jealous rival',
  'corrupt official',
  'ancient evil awakening',
  'hidden mastermind',
  'fallen hero',
  'demonic cultivator',
  'corporate villain',
  'family enemy',
  'world-destroying force',
  'inner demon',
];

export class IdeaBankService {
  private gemini: GeminiClient;
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor(options?: { geminiClient?: GeminiClient; supabaseUrl?: string; supabaseKey?: string }) {
    this.gemini = options?.geminiClient || getGeminiClient();
    this.supabaseUrl = options?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    this.supabaseKey = options?.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  }

  private getSupabase() {
    return createClient(this.supabaseUrl, this.supabaseKey);
  }

  /**
   * Generate a single story idea for a genre
   */
  async generateIdea(input: IdeaGenerationPrompt): Promise<ServiceResult<StoryIdea>> {
    const { genre, avoid_similar_to, target_audience, include_tropes, exclude_tropes } = input;

    // Get random tropes for variety
    const genreTropes = GENRE_TROPES[genre] || [];
    const selectedTropes = this.selectRandomItems(genreTropes, 3);
    const protagonist = this.selectRandomItems(PROTAGONIST_ARCHETYPES, 1)[0];
    const antagonist = this.selectRandomItems(ANTAGONIST_TYPES, 1)[0];

    const prompt = this.buildIdeaPrompt({
      genre,
      tropes: include_tropes || selectedTropes,
      excludeTropes: exclude_tropes,
      protagonist,
      antagonist,
      targetAudience: target_audience || 'general',
      avoidSimilar: avoid_similar_to,
    });

    const result = await this.gemini.generateJSON<GeneratedIdea>(prompt, {
      temperature: 0.9, // High creativity
      maxOutputTokens: 2048,
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Failed to generate idea',
        errorCode: result.errorCode,
      };
    }

    const generated = result.data;

    // Create StoryIdea object
    const idea: Omit<StoryIdea, 'id' | 'created_at'> = {
      genre,
      sub_genre: generated.sub_genre || null,
      title: generated.title,
      premise: generated.premise,
      hook: generated.hook,
      usp: generated.usp,
      protagonist_archetype: generated.protagonist_archetype || protagonist,
      antagonist_type: generated.antagonist_type || antagonist,
      setting_type: generated.setting_type || null,
      power_system_type: generated.power_system_type || null,
      main_conflict: generated.main_conflict || null,
      estimated_chapters: generated.estimated_chapters || 1500,
      target_audience: (target_audience || 'general') as TargetAudience,
      content_rating: (generated.content_rating || 'teen') as ContentRating,
      tags: generated.tags || [],
      tropes: generated.tropes || selectedTropes,
      status: 'generated',
      priority: 0,
      rejection_reason: null,
      approved_at: null,
      production_started_at: null,
    };

    return {
      success: true,
      data: idea as StoryIdea,
    };
  }

  /**
   * Generate multiple ideas based on genre distribution
   */
  async generateIdeasBatch(
    count: number,
    genreDistribution?: Record<FactoryGenre, number>
  ): Promise<BatchResult<StoryIdea>> {
    const distribution = genreDistribution || DEFAULT_GENRE_DISTRIBUTION;
    const results: Array<{ item: StoryIdea; success: boolean; error?: string }> = [];

    // Calculate how many ideas per genre
    const genreCounts = this.calculateGenreCounts(count, distribution);

    let succeeded = 0;
    let failed = 0;

    for (const [genre, genreCount] of Object.entries(genreCounts)) {
      for (let i = 0; i < genreCount; i++) {
        const result = await this.generateIdea({
          genre: genre as FactoryGenre,
        });

        if (result.success && result.data) {
          results.push({ item: result.data, success: true });
          succeeded++;
        } else {
          results.push({
            item: {} as StoryIdea,
            success: false,
            error: result.error,
          });
          failed++;
        }

        // Small delay to avoid rate limiting
        await this.delay(500);
      }
    }

    return {
      success: failed === 0,
      total: count,
      succeeded,
      failed,
      results,
    };
  }

  /**
   * Save idea to database
   */
  async saveIdea(idea: Omit<StoryIdea, 'id' | 'created_at'>): Promise<ServiceResult<StoryIdea>> {
    const supabase = this.getSupabase();

    const { data, error } = await supabase.from('story_ideas').insert(idea).select().single();

    if (error) {
      console.error('[IdeaBankService] Save error:', error);
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_INSERT_ERROR',
      };
    }

    return {
      success: true,
      data: data as StoryIdea,
    };
  }

  /**
   * Generate and save ideas
   */
  async generateAndSaveIdeas(
    count: number,
    genreDistribution?: Record<FactoryGenre, number>
  ): Promise<BatchResult<StoryIdea>> {
    const batchResult = await this.generateIdeasBatch(count, genreDistribution);

    const savedResults: Array<{ item: StoryIdea; success: boolean; error?: string }> = [];
    let savedCount = 0;
    let failedCount = 0;

    for (const result of batchResult.results) {
      if (result.success && result.item) {
        const saveResult = await this.saveIdea(result.item);
        if (saveResult.success && saveResult.data) {
          savedResults.push({ item: saveResult.data, success: true });
          savedCount++;
        } else {
          savedResults.push({ item: result.item, success: false, error: saveResult.error });
          failedCount++;
        }
      } else {
        savedResults.push(result);
        failedCount++;
      }
    }

    return {
      success: failedCount === 0,
      total: count,
      succeeded: savedCount,
      failed: failedCount,
      results: savedResults,
    };
  }

  /**
   * Get pending ideas from database
   */
  async getPendingIdeas(limit: number = 100): Promise<ServiceResult<StoryIdea[]>> {
    const supabase = this.getSupabase();

    const { data, error } = await supabase
      .from('story_ideas')
      .select('*')
      .eq('status', 'generated')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
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
      data: data as StoryIdea[],
    };
  }

  /**
   * Get approved ideas ready for blueprint creation
   */
  async getApprovedIdeas(limit: number = 50): Promise<ServiceResult<StoryIdea[]>> {
    const supabase = this.getSupabase();

    const { data, error } = await supabase
      .from('story_ideas')
      .select('*')
      .eq('status', 'approved')
      .order('priority', { ascending: false })
      .order('approved_at', { ascending: true })
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
      data: data as StoryIdea[],
    };
  }

  /**
   * Approve an idea
   */
  async approveIdea(ideaId: string): Promise<ServiceResult<StoryIdea>> {
    const supabase = this.getSupabase();

    const { data, error } = await supabase
      .from('story_ideas')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .eq('id', ideaId)
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
      data: data as StoryIdea,
    };
  }

  /**
   * Auto-approve all pending ideas (for automated mode)
   */
  async autoApproveIdeas(limit: number = 100): Promise<ServiceResult<number>> {
    const supabase = this.getSupabase();

    // Fix: .limit() on .update() doesn't actually limit rows updated in PostgREST.
    // Instead: SELECT IDs first with limit, then UPDATE by IDs.
    const { data: idsToApprove, error: selectError } = await supabase
      .from('story_ideas')
      .select('id')
      .eq('status', 'generated')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (selectError) {
      return {
        success: false,
        error: selectError.message,
        errorCode: 'DB_SELECT_ERROR',
      };
    }

    if (!idsToApprove || idsToApprove.length === 0) {
      return { success: true, data: 0 };
    }

    const ids = idsToApprove.map(r => r.id);

    const { data, error } = await supabase
      .from('story_ideas')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .in('id', ids)
      .select('id');

    if (error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_UPDATE_ERROR',
      };
    }

    return {
      success: true,
      data: data?.length || 0,
    };
  }

  /**
   * Reject an idea
   */
  async rejectIdea(ideaId: string, reason: string): Promise<ServiceResult<void>> {
    const supabase = this.getSupabase();

    const { error } = await supabase
      .from('story_ideas')
      .update({
        status: 'rejected',
        rejection_reason: reason,
      })
      .eq('id', ideaId);

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
   * Mark idea as blueprint created
   */
  async markBlueprintCreated(ideaId: string): Promise<ServiceResult<void>> {
    const supabase = this.getSupabase();

    const { error } = await supabase
      .from('story_ideas')
      .update({ status: 'blueprint_created' })
      .eq('id', ideaId);

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
   * Get idea counts by status
   */
  async getIdeaCounts(): Promise<
    ServiceResult<Record<string, number>>
  > {
    const supabase = this.getSupabase();

    const [generated, approved, rejected, blueprint_created] = await Promise.all([
      supabase.from('story_ideas').select('*', { count: 'exact', head: true }).eq('status', 'generated'),
      supabase.from('story_ideas').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('story_ideas').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
      supabase.from('story_ideas').select('*', { count: 'exact', head: true }).eq('status', 'blueprint_created'),
    ]);

    const firstError = [generated, approved, rejected, blueprint_created].find(r => r.error);
    if (firstError?.error) {
      return {
        success: false,
        error: firstError.error.message,
        errorCode: 'DB_COUNT_ERROR',
      };
    }

    return {
      success: true,
      data: {
        generated: generated.count || 0,
        approved: approved.count || 0,
        rejected: rejected.count || 0,
        blueprint_created: blueprint_created.count || 0,
      },
    };
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private buildIdeaPrompt(params: {
    genre: FactoryGenre;
    tropes: string[];
    excludeTropes?: string[];
    protagonist: string;
    antagonist: string;
    targetAudience: string;
    avoidSimilar?: string[];
  }): string {
    const genreDescriptions: Record<FactoryGenre, string> = {
      'system-litrpg': 'LitRPG/System truyện có hệ thống game, level up, skill, quest',
      'urban-modern': 'Đô thị hiện đại, có thể kết hợp dị năng hoặc kinh doanh',
      romance: 'Ngôn tình, tình yêu là trọng tâm',
      'huyen-huyen': 'Huyền huyễn, thế giới fantasy với phép thuật',
      'action-adventure': 'Hành động phiêu lưu, chiến đấu kịch tính',
      historical: 'Lịch sử cổ đại, cung đấu, quân sự',
      'tien-hiep': 'Tiên hiệp tu chân, hệ thống cảnh giới tu luyện',
      'sci-fi-apocalypse': 'Khoa huyễn, tận thế, sinh tồn',
      'horror-mystery': 'Kinh dị, bí ẩn, trinh thám',
    };

    return `Bạn là chuyên gia sáng tạo ý tưởng webnovel tiếng Việt. Tạo một ý tưởng truyện mới và độc đáo.

THÔNG TIN:
- Thể loại: ${params.genre} (${genreDescriptions[params.genre]})
- Tropes cần có: ${params.tropes.join(', ')}
${params.excludeTropes ? `- Tránh tropes: ${params.excludeTropes.join(', ')}` : ''}
- Kiểu nhân vật chính: ${params.protagonist}
- Kiểu phản diện: ${params.antagonist}
- Đối tượng: ${params.targetAudience}
${params.avoidSimilar ? `- Tránh giống: ${params.avoidSimilar.join(', ')}` : ''}

YÊU CẦU:
1. Tên truyện PHẢI hấp dẫn, có thể dùng tiếng Hán-Việt hoặc tiếng Việt hiện đại
2. Premise (tiền đề) phải rõ ràng, cho thấy xung đột chính
3. Hook (mở đầu) phải cuốn hút ngay từ chương 1
4. USP (điểm độc đáo) - điều gì làm truyện này khác biệt?
5. Tags và tropes phải phù hợp thể loại

OUTPUT JSON (chỉ JSON, không markdown):
{
  "title": "Tên truyện hấp dẫn",
  "sub_genre": "phân nhánh thể loại nếu có",
  "premise": "Mô tả ngắn gọn tiền đề truyện (2-3 câu)",
  "hook": "Mô tả mở đầu cuốn hút (sự kiện chương 1-3)",
  "usp": "Điểm độc đáo của truyện này",
  "protagonist_archetype": "Kiểu nhân vật chính",
  "antagonist_type": "Kiểu phản diện",
  "setting_type": "Bối cảnh (thế giới tu tiên, đô thị hiện đại, v.v.)",
  "power_system_type": "Hệ thống sức mạnh nếu có",
  "main_conflict": "Xung đột chính của truyện",
  "estimated_chapters": 1500,
  "content_rating": "teen",
  "tags": ["tag1", "tag2", "tag3"],
  "tropes": ["trope1", "trope2", "trope3"]
}`;
  }

  private calculateGenreCounts(
    total: number,
    distribution: Record<FactoryGenre, number>
  ): Record<FactoryGenre, number> {
    const counts: Record<FactoryGenre, number> = {} as Record<FactoryGenre, number>;
    let remaining = total;
    const genres = Object.keys(distribution) as FactoryGenre[];

    // Calculate proportional counts
    for (let i = 0; i < genres.length; i++) {
      const genre = genres[i];
      const percentage = distribution[genre];

      if (i === genres.length - 1) {
        // Last genre gets remaining
        counts[genre] = remaining;
      } else {
        const count = Math.round((total * percentage) / 100);
        counts[genre] = count;
        remaining -= count;
      }
    }

    return counts;
  }

  private selectRandomItems<T>(items: T[], count: number): T[] {
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, items.length));
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Type for AI-generated idea response
interface GeneratedIdea {
  title: string;
  sub_genre?: string;
  premise: string;
  hook: string;
  usp: string;
  protagonist_archetype?: string;
  antagonist_type?: string;
  setting_type?: string;
  power_system_type?: string;
  main_conflict?: string;
  estimated_chapters?: number;
  content_rating?: string;
  tags?: string[];
  tropes?: string[];
}

// Singleton instance
let ideaBankInstance: IdeaBankService | null = null;

export function getIdeaBankService(): IdeaBankService {
  if (!ideaBankInstance) {
    ideaBankInstance = new IdeaBankService();
  }
  return ideaBankInstance;
}

export function createIdeaBankService(options?: {
  geminiClient?: GeminiClient;
  supabaseUrl?: string;
  supabaseKey?: string;
}): IdeaBankService {
  return new IdeaBankService(options);
}
