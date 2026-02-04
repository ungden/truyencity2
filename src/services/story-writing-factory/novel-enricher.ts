/**
 * Novel Enricher - Upgrade existing novels with rich content + covers
 *
 * For each novel, generates via Gemini:
 * - Full description (200-500 words): giới thiệu, tóm tắt, hook
 * - World system (hệ thống tu luyện / magic / setting)
 * - Main character profile
 * - Cover image via Gemini Image
 *
 * Also updates ai_story_projects with richer world_description
 */

import { AIProviderService } from '../ai-provider';
import { GeminiImageService } from '../factory/gemini-image';
import { getSupabase } from './supabase-helper';

const GENRE_LABELS: Record<string, string> = {
  'tien-hiep': 'Tiên Hiệp',
  'huyen-huyen': 'Huyền Huyễn',
  'do-thi': 'Đô Thị',
  'kiem-hiep': 'Kiếm Hiệp',
  'lich-su': 'Lịch Sử',
  'khoa-huyen': 'Khoa Huyễn',
  'vong-du': 'Võng Du',
  'dong-nhan': 'Đồng Nhân',
  'mat-the': 'Mạt Thế',
  'linh-di': 'Linh Dị',
  'quan-truong': 'Quan Trường',
  'di-gioi': 'Dị Giới',
};

// Map genres to cover style keys used by GeminiImageService
const GENRE_COVER_STYLE: Record<string, string> = {
  'tien-hiep': 'tien-hiep',
  'huyen-huyen': 'huyen-huyen',
  'do-thi': 'urban-modern',
  'kiem-hiep': 'action-adventure',
  'lich-su': 'historical',
  'khoa-huyen': 'sci-fi-apocalypse',
  'vong-du': 'system-litrpg',
  'dong-nhan': 'huyen-huyen',
  'mat-the': 'sci-fi-apocalypse',
  'linh-di': 'horror-mystery',
  'quan-truong': 'urban-modern',
  'di-gioi': 'huyen-huyen',
};

export interface EnrichResult {
  enriched: number;
  covers: number;
  errors: string[];
  durationMs: number;
}

interface NovelRow {
  id: string;
  title: string;
  description: string | null;
  genres: string[] | null;
  ai_author_id: string | null;
  cover_url: string | null;
}

interface EnrichedContent {
  description: string;
  worldSystem: string;
  mainCharacter: string;
  coverPrompt: string;
}

export class NovelEnricher {
  private ai: AIProviderService;
  private imageService: GeminiImageService;
  private supabase: ReturnType<typeof getSupabase>;

  constructor(geminiApiKey: string) {
    this.ai = new AIProviderService({ gemini: geminiApiKey });
    this.imageService = new GeminiImageService({ apiKey: geminiApiKey });
    this.supabase = getSupabase();
  }

  /**
   * Enrich novels that have short descriptions (< 100 chars)
   */
  async enrichDescriptions(limit: number = 20): Promise<EnrichResult> {
    const start = Date.now();
    const errors: string[] = [];
    let enriched = 0;

    // Find novels with short descriptions (premise only)
    const { data: novels, error } = await this.supabase
      .from('novels')
      .select('id, title, description, genres, ai_author_id, cover_url')
      .or('description.is.null,description.lt.150')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error || !novels?.length) {
      return { enriched: 0, covers: 0, errors: [error?.message || 'No novels to enrich'], durationMs: Date.now() - start };
    }

    console.log(`[Enricher] Found ${novels.length} novels to enrich`);

    // Process 5 at a time (Gemini rate limits)
    for (let i = 0; i < novels.length; i += 5) {
      const batch = novels.slice(i, i + 5);
      const results = await Promise.allSettled(
        batch.map(novel => this.enrichSingle(novel, errors))
      );

      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) enriched++;
      }

      console.log(`[Enricher] Progress: ${enriched}/${novels.length} enriched`);

      // Small delay between batches
      if (i + 5 < novels.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    return { enriched, covers: 0, errors, durationMs: Date.now() - start };
  }

  /**
   * Generate covers for novels without cover_url
   */
  async generateCovers(limit: number = 10): Promise<EnrichResult> {
    const start = Date.now();
    const errors: string[] = [];
    let covers = 0;

    const { data: novels, error } = await this.supabase
      .from('novels')
      .select('id, title, description, genres, cover_url')
      .is('cover_url', null)
      .not('description', 'is', null)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error || !novels?.length) {
      return { enriched: 0, covers: 0, errors: [error?.message || 'No novels need covers'], durationMs: Date.now() - start };
    }

    console.log(`[Enricher] Generating covers for ${novels.length} novels`);

    // 1 at a time — image gen is slow + expensive
    for (const novel of novels) {
      try {
        const genre = novel.genres?.[0] || 'tien-hiep';
        const coverStyle = GENRE_COVER_STYLE[genre] || 'huyen-huyen';
        const desc = (novel.description || novel.title).slice(0, 300);

        console.log(`[Enricher] Cover for: ${novel.title.slice(0, 40)}...`);

        const result = await this.imageService.generateCoverWithUpload(
          novel.title,
          coverStyle,
          desc,
          { bucket: 'covers', maxRetries: 2 }
        );

        if (result.success && result.data) {
          const { error: updateErr } = await this.supabase
            .from('novels')
            .update({ cover_url: result.data })
            .eq('id', novel.id);

          if (updateErr) {
            errors.push(`Update cover for ${novel.id.slice(0, 8)}: ${updateErr.message}`);
          } else {
            covers++;
            console.log(`[Enricher] Cover OK: ${novel.title.slice(0, 40)}`);
          }
        } else {
          errors.push(`Cover gen failed for ${novel.title.slice(0, 30)}: ${result.error}`);
        }

        // Delay between image gens
        await new Promise(r => setTimeout(r, 2000));
      } catch (err: any) {
        errors.push(`Cover exception ${novel.id.slice(0, 8)}: ${err.message}`);
      }
    }

    return { enriched: 0, covers, errors, durationMs: Date.now() - start };
  }

  /**
   * Enrich + cover in one call
   */
  async enrichAndCover(enrichLimit: number = 20, coverLimit: number = 10): Promise<EnrichResult> {
    const start = Date.now();

    // First enrich descriptions
    const enrichResult = await this.enrichDescriptions(enrichLimit);

    // Then generate covers
    const coverResult = await this.generateCovers(coverLimit);

    return {
      enriched: enrichResult.enriched,
      covers: coverResult.covers,
      errors: [...enrichResult.errors, ...coverResult.errors],
      durationMs: Date.now() - start,
    };
  }

  // ============================================================================
  // PRIVATE
  // ============================================================================

  private async enrichSingle(novel: NovelRow, errors: string[]): Promise<boolean> {
    const genre = novel.genres?.[0] || 'tien-hiep';
    const genreLabel = GENRE_LABELS[genre] || genre;

    try {
      const content = await this.generateRichContent(novel.title, genreLabel, novel.description || '');

      if (!content) {
        errors.push(`Gemini failed for ${novel.title.slice(0, 30)}`);
        return false;
      }

      // Update novel description
      const { error: novelErr } = await this.supabase
        .from('novels')
        .update({ description: content.description })
        .eq('id', novel.id);

      if (novelErr) {
        errors.push(`Update novel ${novel.id.slice(0, 8)}: ${novelErr.message}`);
        return false;
      }

      // Update ai_story_project with richer world_description
      const { error: projErr } = await this.supabase
        .from('ai_story_projects')
        .update({
          world_description: content.worldSystem,
          main_character: content.mainCharacter,
        })
        .eq('novel_id', novel.id);

      if (projErr) {
        errors.push(`Update project for ${novel.id.slice(0, 8)}: ${projErr.message}`);
      }

      return true;
    } catch (err: any) {
      errors.push(`Enrich exception ${novel.id.slice(0, 8)}: ${err.message}`);
      return false;
    }
  }

  private async generateRichContent(
    title: string,
    genreLabel: string,
    currentPremise: string
  ): Promise<EnrichedContent | null> {
    const prompt = `Bạn là tác giả webnovel chuyên nghiệp. Hãy tạo nội dung giới thiệu ĐẦY ĐỦ cho tiểu thuyết sau.

TIỂU THUYẾT: "${title}"
THỂ LOẠI: ${genreLabel}
Ý TƯỞNG GỐC: ${currentPremise}

Hãy viết JSON với 4 phần:

{
  "description": "Giới thiệu truyện 200-400 chữ. Bao gồm: bối cảnh thế giới, nhân vật chính, xung đột chính, điểm hấp dẫn. Viết hấp dẫn như mô tả trên trang đọc truyện, có hook câu đầu tiên. KHÔNG spoil kết truyện.",
  
  "worldSystem": "Mô tả chi tiết hệ thống thế giới 150-300 chữ. Tùy thể loại: hệ thống tu luyện (cấp bậc, linh khí, pháp bảo), magic system, hệ thống game, bối cảnh xã hội, quy tắc thế giới. Phải có ít nhất 5-7 cấp bậc/level nếu là truyện tu luyện.",
  
  "mainCharacter": "Hồ sơ nhân vật chính 100-200 chữ: tên, tuổi, xuất thân, tính cách, năng lực đặc biệt, mục tiêu, điểm yếu. Phải có chiều sâu.",
  
  "coverPrompt": "Mô tả cảnh bìa truyện bằng tiếng Anh, 2-3 câu: nhân vật chính đang làm gì, bối cảnh, mood, màu sắc chủ đạo. Dùng cho AI image generation."
}

CHỈ trả về JSON, không thêm text khác. Viết bằng tiếng Việt (trừ coverPrompt bằng tiếng Anh).`;

    try {
      const response = await this.ai.chat({
        provider: 'gemini',
        model: 'gemini-3-flash-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        maxTokens: 4096,
      });

      if (!response.success || !response.content) {
        console.error(`[Enricher] Gemini error: ${response.error}`);
        return null;
      }

      return this.parseEnrichedContent(response.content);
    } catch (err) {
      console.error('[Enricher] Gemini exception:', err);
      return null;
    }
  }

  private parseEnrichedContent(raw: string): EnrichedContent | null {
    try {
      // Extract JSON
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.description || parsed.description.length < 50) return null;

      return {
        description: String(parsed.description).trim(),
        worldSystem: String(parsed.worldSystem || '').trim(),
        mainCharacter: String(parsed.mainCharacter || '').trim(),
        coverPrompt: String(parsed.coverPrompt || '').trim(),
      };
    } catch {
      // Try repair truncated JSON
      try {
        let repaired = raw.trim();
        const lastBrace = repaired.lastIndexOf('"');
        if (lastBrace > 0) {
          repaired = repaired.substring(0, lastBrace + 1) + '}';
        }
        const jsonMatch = repaired.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;
        const parsed = JSON.parse(jsonMatch[0]);
        if (!parsed.description) return null;
        return {
          description: String(parsed.description).trim(),
          worldSystem: String(parsed.worldSystem || '').trim(),
          mainCharacter: String(parsed.mainCharacter || '').trim(),
          coverPrompt: String(parsed.coverPrompt || '').trim(),
        };
      } catch {
        return null;
      }
    }
  }
}

export function createNovelEnricher(geminiApiKey: string): NovelEnricher {
  return new NovelEnricher(geminiApiKey);
}
