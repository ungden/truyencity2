/**
 * Content Seeder - Seed platform with AI authors and novels at scale
 *
 * Generates:
 * - 200 AI authors with unique pen names and personas
 * - 4000 novels (20 per author) across all genres defined in GENRE_CONFIG
 * - Activates 1000 novels initially (5 per author)
 * - Enqueues cover generation jobs for novels missing covers
 *
 * Uses template-based generation (no AI calls for authors)
 * Uses Gemini batch calls for novel titles/premises/descriptions/systems
 * Genres are dynamically derived from GENRE_CONFIG to stay in sync with AI Writer
 */

import { randomUUID } from 'crypto';
import { generateQuickAuthor } from './author-generator';
import { getSupabase } from './supabase-helper';
import { AIProviderService } from '../ai-provider';
import { GenreType } from './types';
import { GENRE_CONFIG } from '@/lib/types/genre-config';

// ============================================================================
// CONSTANTS
// ============================================================================

// NOTE: Seed only genres that are supported by AI Writer (GENRE_CONFIG)
// so we can fill required system fields correctly.
const ALL_GENRES: GenreType[] = Object.keys(GENRE_CONFIG) as GenreType[];

const GENRE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(GENRE_CONFIG).map(([k, v]) => [k, v.name])
);

// Vietnamese main character name components
const MC_NAMES = {
  ho: ['Lâm', 'Trần', 'Lý', 'Vương', 'Triệu', 'Chu', 'Tống', 'Ngô', 'Hoàng', 'Tô',
       'Dương', 'Giang', 'Phương', 'Mạc', 'Hạ', 'Tần', 'Đường', 'Lưu', 'Bạch', 'Tiêu',
       'Diệp', 'Hàn', 'Tạ', 'Âu Dương', 'Nhan', 'Cố', 'Mộ Dung', 'Đoàn', 'Phùng', 'Lục'],
  ten: ['Phong', 'Vân', 'Thiên', 'Hạo', 'Nhạc', 'Minh', 'Dương', 'Hàn', 'Tiêu', 'Kiến',
        'Thần', 'Hải', 'Long', 'Hổ', 'Vũ', 'Chiến', 'Kiếm', 'Đạo', 'Linh', 'Ngọc',
        'An', 'Bình', 'Quân', 'Nghị', 'Tuấn', 'Anh', 'Đức', 'Hùng', 'Thắng', 'Cường'],
};

// ============================================================================
// TYPES
// ============================================================================

export interface SeedConfig {
  authorCount: number;
  novelsPerAuthor: number;
  activatePerAuthor: number;
  minChapters: number;
  maxChapters: number;
}

export interface SeedResult {
  authors: number;
  novels: number;
  activated: number;
  coverJobs?: number;
  errors: string[];
  durationMs: number;
}

interface NovelIdea {
  title: string;
  premise: string;
  mainCharacter: string; // name only
  mainCharacterProfile?: string;
  description?: string;        // rich intro 200-500 words
  shortSynopsis?: string;      // 2-3 sentences
  worldDescription?: string;   // world bible / setting
  requiredFieldKey?: string;   // e.g. cultivation_system
  requiredFieldValue?: string; // value for requiredFieldKey
  coverPrompt?: string;        // English prompt forcing title text
}

// ============================================================================
// CONTENT SEEDER CLASS
// ============================================================================

export class ContentSeeder {
  private aiService: AIProviderService;
  private supabase: ReturnType<typeof getSupabase>;
  private userId: string | null = null;

  constructor(geminiApiKey: string) {
    this.aiService = new AIProviderService({ gemini: geminiApiKey });
    this.supabase = getSupabase();
  }

  /**
   * Main entry: seed everything
   */
  async seed(config: Partial<SeedConfig> = {}): Promise<SeedResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    const {
      authorCount = 200,
      novelsPerAuthor = 20,
      activatePerAuthor = 5,
      minChapters = 1000,
      maxChapters = 2000,
    } = config;

    const totalNovels = authorCount * novelsPerAuthor;

    console.log(`[Seeder] Starting: ${authorCount} authors, ${totalNovels} novels`);

    // Step 0: Get a valid user_id for FK constraints
    this.userId = await this.getSystemUserId();
    if (!this.userId) {
      return {
        authors: 0, novels: 0, activated: 0,
        errors: ['No user found in profiles table. Cannot create projects (FK constraint).'],
        durationMs: Date.now() - startTime,
      };
    }

    // Step 1: Generate and insert authors
    console.log(`[Seeder] Step 1: Generating ${authorCount} authors...`);
    const authorIds = await this.seedAuthors(authorCount, errors);
    console.log(`[Seeder] Created ${authorIds.length} authors`);

    if (authorIds.length === 0) {
      return {
        authors: 0, novels: 0, activated: 0,
        errors: [...errors, 'Failed to create any authors'],
        durationMs: Date.now() - startTime,
      };
    }

    // Step 2: Generate novel ideas via Gemini
    console.log(`[Seeder] Step 2: Generating ${totalNovels} novel ideas via Gemini...`);
    const novelIdeas = await this.generateAllNovelIdeas(totalNovels, errors);
    console.log(`[Seeder] Generated ${novelIdeas.size} novel ideas across ${novelIdeas.size} genres`);

    // Step 3: Insert novels + ai_story_projects (paused)
    console.log(`[Seeder] Step 3: Inserting novels and projects...`);
    let totalInserted = 0;
    totalInserted = await this.seedNovels(
      authorIds, novelIdeas, novelsPerAuthor, minChapters, maxChapters, errors
    );
    console.log(`[Seeder] Inserted ${totalInserted} novels`);

    // Step 4: Activate initial batch
    console.log(`[Seeder] Step 4: Activating ${activatePerAuthor} novels per author...`);
    const activated = await this.activateInitialBatch(authorIds, activatePerAuthor, errors);
    console.log(`[Seeder] Activated ${activated} novels`);

    return {
      authors: authorIds.length,
      novels: totalInserted,
      activated,
      errors,
      durationMs: Date.now() - startTime,
    };
  }

  // ============================================================================
  // STEP-BY-STEP METHODS (for avoiding timeouts)
  // ============================================================================

  /**
   * Step 1 only: Generate authors. Skips if authors already exist.
   */
  async seedAuthorsOnly(count: number = 200): Promise<SeedResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    // Check existing
    const { count: existingCount, error: countErr } = await this.supabase
      .from('ai_authors')
      .select('*', { count: 'exact', head: true });
    if (countErr) {
      errors.push(`Count ai_authors failed: ${countErr.message}`);
    }
    const existingSafe = existingCount || 0;
    if (existingSafe >= count) {
      return { authors: existingSafe, novels: 0, activated: 0, errors: [`Already have ${existingSafe} authors, skipping`], durationMs: Date.now() - startTime };
    }

    const needed = count - existingSafe;
    console.log(`[Seeder] Step 1: Have ${existingSafe}, need ${needed} more authors`);
    const authorIds = await this.seedAuthors(needed, errors);

    return { authors: existingSafe + authorIds.length, novels: 0, activated: 0, errors, durationMs: Date.now() - startTime };
  }

  /**
   * Step 2 only: Generate novels for existing authors via Gemini.
   */
  async seedNovelsOnly(config: Partial<SeedConfig> = {}): Promise<SeedResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const { novelsPerAuthor = 20, minChapters = 1000, maxChapters = 2000 } = config;

    this.userId = await this.getSystemUserId();
    if (!this.userId) {
      return { authors: 0, novels: 0, activated: 0, errors: ['No user found in profiles table'], durationMs: Date.now() - startTime };
    }

    // Get all author IDs
    const { data: authors } = await this.supabase.from('ai_authors').select('id').eq('status', 'active');
    if (!authors || authors.length === 0) {
      return { authors: 0, novels: 0, activated: 0, errors: ['No authors found. Run step 1 first.'], durationMs: Date.now() - startTime };
    }
    const authorIds = authors.map(a => a.id);

    // Check how many novels already exist
    const { count: existingNovelsCount, error: novelsCountErr } = await this.supabase
      .from('novels')
      .select('*', { count: 'exact', head: true });
    if (novelsCountErr) {
      errors.push(`Count novels failed: ${novelsCountErr.message}`);
    }
    const existingNovels = existingNovelsCount || 0;
    const targetNovels = authorIds.length * novelsPerAuthor;
    if (existingNovels >= targetNovels) {
      return { authors: authorIds.length, novels: existingNovels, activated: 0, errors: [`Already have ${existingNovels} novels`], durationMs: Date.now() - startTime };
    }

    console.log(`[Seeder] Step 2: ${authorIds.length} authors, generating ${targetNovels} novels via Gemini`);

    const novelIdeas = await this.generateAllNovelIdeas(targetNovels, errors);

    const totalInserted = await this.seedNovels(authorIds, novelIdeas, novelsPerAuthor, minChapters, maxChapters, errors);

    return { authors: authorIds.length, novels: totalInserted, activated: 0, errors, durationMs: Date.now() - startTime };
  }

  /**
   * Step 3 only: Activate paused novels for existing authors.
   */
  async activateOnly(perAuthor: number = 5): Promise<SeedResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    const { data: authors } = await this.supabase.from('ai_authors').select('id').eq('status', 'active');
    if (!authors || authors.length === 0) {
      return { authors: 0, novels: 0, activated: 0, errors: ['No authors found'], durationMs: Date.now() - startTime };
    }
    const authorIds = authors.map(a => a.id);

    const activated = await this.activateInitialBatch(authorIds, perAuthor, errors);

    return { authors: authorIds.length, novels: 0, activated, errors, durationMs: Date.now() - startTime };
  }

  /**
   * Step clear: Delete ALL AI-seeded data in FK-safe order.
   * Only deletes data linked to AI-seeded novels (ai_author_id IS NOT NULL).
   * Also removes cover files from Supabase Storage.
   *
   * FK-safe deletion order (innermost children first):
   *   1. Collect AI-seeded novel IDs
   *   2. ai_image_jobs WHERE novel_id IN (...)
   *   3. ai_story_projects WHERE novel_id IN (...) — cascades 24+ child tables
   *   4. chapters WHERE novel_id IN (...) — FK behavior unknown, delete explicitly
   *   5. comments, reading_sessions, chapter_reads, notifications WHERE novel_id IN (...)
   *   6. novels WHERE ai_author_id IS NOT NULL — remaining CASCADE FKs handle bookmarks, reading_progress, etc.
   *   7. ai_authors (all)
   *   8. Storage: remove ai-* cover files
   */
  async clearAll(): Promise<SeedResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    // Step 0: Collect all AI-seeded novel IDs first
    const aiNovelIds: string[] = [];
    let offset = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await this.supabase
        .from('novels')
        .select('id')
        .not('ai_author_id', 'is', null)
        .range(offset, offset + pageSize - 1);
      if (error) {
        errors.push(`Fetch AI novel IDs: ${error.message}`);
        break;
      }
      if (!data || data.length === 0) break;
      aiNovelIds.push(...data.map(r => r.id));
      if (data.length < pageSize) break;
      offset += pageSize;
    }

    console.log(`[Seeder] Found ${aiNovelIds.length} AI-seeded novels to clear`);

    if (aiNovelIds.length === 0) {
      // Still clean up orphaned authors
      const { error: authorErr } = await this.supabase
        .from('ai_authors')
        .delete()
        .gte('created_at', '1970-01-01');
      if (authorErr) errors.push(`Delete ai_authors: ${authorErr.message}`);

      return { authors: 0, novels: 0, activated: 0, errors, durationMs: Date.now() - startTime };
    }

    // Process in chunks of 200 (Supabase .in() has limits)
    const chunks = this.chunkArray(aiNovelIds, 200);

    // 1. Delete ai_image_jobs scoped to AI novels
    for (const chunk of chunks) {
      const { error } = await this.supabase
        .from('ai_image_jobs')
        .delete()
        .in('novel_id', chunk);
      if (error) errors.push(`Delete ai_image_jobs chunk: ${error.message}`);
    }
    console.log(`[Seeder] Deleted ai_image_jobs for ${aiNovelIds.length} novels`);

    // 2. Delete ai_story_projects scoped to AI novels (cascades 24+ child tables)
    for (const chunk of chunks) {
      const { error } = await this.supabase
        .from('ai_story_projects')
        .delete()
        .in('novel_id', chunk);
      if (error) errors.push(`Delete ai_story_projects chunk: ${error.message}`);
    }
    console.log(`[Seeder] Deleted ai_story_projects for ${aiNovelIds.length} novels`);

    // 3. Delete chapters explicitly (FK behavior unknown — could be RESTRICT)
    for (const chunk of chunks) {
      const { error } = await this.supabase
        .from('chapters')
        .delete()
        .in('novel_id', chunk);
      if (error) errors.push(`Delete chapters chunk: ${error.message}`);
    }
    console.log(`[Seeder] Deleted chapters for ${aiNovelIds.length} novels`);

    // 4. Delete other tables with unknown FK behavior
    const otherTables = ['comments', 'reading_sessions', 'chapter_reads', 'notifications'] as const;
    for (const table of otherTables) {
      for (const chunk of chunks) {
        const { error } = await this.supabase
          .from(table)
          .delete()
          .in('novel_id', chunk);
        if (error) errors.push(`Delete ${table} chunk: ${error.message}`);
      }
    }
    console.log(`[Seeder] Deleted comments/reading_sessions/chapter_reads/notifications`);

    // 5. Delete novels (remaining CASCADE FKs: bookmarks, reading_progress, production_queue)
    const { error: novelErr } = await this.supabase
      .from('novels')
      .delete()
      .not('ai_author_id', 'is', null);
    if (novelErr) errors.push(`Delete novels: ${novelErr.message}`);
    else console.log(`[Seeder] Deleted ${aiNovelIds.length} AI-seeded novels`);

    // 6. Delete ai_authors (all — this table is only used by the seeder)
    const { error: authorErr } = await this.supabase
      .from('ai_authors')
      .delete()
      .gte('created_at', '1970-01-01');
    if (authorErr) errors.push(`Delete ai_authors: ${authorErr.message}`);
    else console.log(`[Seeder] Deleted ai_authors`);

    // 7. Clear cover files starting with "ai-" from Supabase Storage "covers" bucket
    //    Paginate to handle >1000 files
    try {
      let totalRemoved = 0;
      let hasMore = true;
      while (hasMore) {
        const { data: files, error: listErr } = await this.supabase.storage
          .from('covers')
          .list('', { limit: 1000 });
        if (listErr) {
          errors.push(`List covers bucket: ${listErr.message}`);
          break;
        }
        if (!files || files.length === 0) break;

        const aiFiles = files
          .filter(f => f.name.startsWith('ai-'))
          .map(f => f.name);

        if (aiFiles.length === 0) {
          hasMore = false;
          break;
        }

        const { error: rmErr } = await this.supabase.storage
          .from('covers')
          .remove(aiFiles);
        if (rmErr) {
          errors.push(`Remove cover files: ${rmErr.message}`);
          break;
        }
        totalRemoved += aiFiles.length;

        // If we found fewer ai- files than total files, no more ai- files to clean
        if (aiFiles.length < files.length) hasMore = false;
      }
      if (totalRemoved > 0) {
        console.log(`[Seeder] Removed ${totalRemoved} cover files from storage`);
      }
    } catch (e: any) {
      errors.push(`Storage cleanup: ${e?.message || String(e)}`);
    }

    return {
      authors: 0,
      novels: 0,
      activated: 0,
      errors,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Step covers: Enqueue cover generation jobs for novels missing cover_url.
   * Uses the existing ai_image_jobs + edge function pipeline.
   */
  async enqueueCoversOnly(limit: number = 20): Promise<SeedResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    this.userId = await this.getSystemUserId();
    if (!this.userId) {
      return { authors: 0, novels: 0, activated: 0, coverJobs: 0, errors: ['No user found in profiles table'], durationMs: Date.now() - startTime };
    }

    // Find novels without cover (include saved cover_prompt)
    const { data: novels, error: novelErr } = await this.supabase
      .from('novels')
      .select('id, title, description, genres, cover_url, cover_prompt')
      .is('cover_url', null)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (novelErr) {
      return { authors: 0, novels: 0, activated: 0, coverJobs: 0, errors: [novelErr.message], durationMs: Date.now() - startTime };
    }

    if (!novels || novels.length === 0) {
      return { authors: 0, novels: 0, activated: 0, coverJobs: 0, errors: ['No novels need covers'], durationMs: Date.now() - startTime };
    }

    let enqueued = 0;

    for (const novel of novels as any[]) {
      try {
        const genre = Array.isArray(novel.genres) && novel.genres.length > 0 ? novel.genres[0] : 'tien-hiep';
        const desc = String(novel.description || '').slice(0, 800);
        const title = String(novel.title || '');

        const prompt = novel.cover_prompt || this.buildCoverPrompt(title, genre, desc);

        const { data: job, error: jobError } = await this.supabase
          .from('ai_image_jobs')
          .insert({
            user_id: this.userId,
            novel_id: novel.id,
            prompt,
            status: 'pending',
          })
          .select('id')
          .single();

        if (jobError || !job?.id) {
          errors.push(`Create cover job failed (${String(novel.id).slice(0, 8)}): ${jobError?.message || 'unknown'}`);
          continue;
        }

        // Invoke edge function and AWAIT to avoid overwhelming Gemini API
        try {
          await this.supabase.functions
            .invoke('gemini-cover-generate', { body: { jobId: job.id, prompt } });
        } catch (e: any) {
          errors.push(`Invoke cover job failed (${job.id.slice(0, 8)}): ${e?.message || String(e)}`);
        }

        enqueued++;

        // Rate limit: 3s delay between jobs (Gemini image gen is slow anyway)
        if (enqueued < novels.length) {
          await new Promise(r => setTimeout(r, 3000));
        }
      } catch (e: any) {
        errors.push(`Enqueue cover exception: ${e?.message || String(e)}`);
      }
    }

    return {
      authors: 0,
      novels: 0,
      activated: 0,
      coverJobs: enqueued,
      errors,
      durationMs: Date.now() - startTime,
    };
  }

  // ============================================================================
  // STEP 0: GET SYSTEM USER
  // ============================================================================

  private async getSystemUserId(): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (error || !data?.length) {
      console.error('[Seeder] No user found in profiles:', error?.message);
      return null;
    }
    return data[0].id;
  }

  // ============================================================================
  // STEP 1: SEED AUTHORS
  // ============================================================================

  private async seedAuthors(count: number, errors: string[]): Promise<string[]> {
    const authorIds: string[] = [];
    const batchSize = 50; // Insert 50 at a time

    for (let batch = 0; batch < count; batch += batchSize) {
      const batchEnd = Math.min(batch + batchSize, count);
      const rows: Array<{
        id: string;
        name: string;
        bio: string;
        writing_style_description: string;
        ai_prompt_persona: string;
        specialized_genres: string[];
        status: string;
      }> = [];

      for (let i = batch; i < batchEnd; i++) {
        const genre = ALL_GENRES[i % ALL_GENRES.length];
        const author = generateQuickAuthor(genre);
        const id = randomUUID();
        // Use sequential number suffix for unique + natural-looking names
        const authorNum = i + 1;
        const uniqueName = `${author.name} ${this.toVietnameseOrdinal(authorNum)}`;

        rows.push({
          id,
          name: uniqueName,
          bio: author.bio,
          writing_style_description: author.writing_style_description,
          ai_prompt_persona: author.ai_prompt_persona,
          specialized_genres: author.specialized_genres,
          status: 'active',
        });

        authorIds.push(id);
      }

      const { error } = await this.supabase.from('ai_authors').insert(rows);
      if (error) {
        errors.push(`Author batch ${batch}-${batchEnd} failed: ${error.message}`);
        // Remove failed IDs
        authorIds.splice(authorIds.length - rows.length, rows.length);
      } else {
        console.log(`[Seeder] Authors ${batch + 1}-${batchEnd} inserted`);
      }
    }

    return authorIds;
  }

  // ============================================================================
  // STEP 2: GENERATE NOVEL IDEAS VIA GEMINI
  // ============================================================================

  private async generateAllNovelIdeas(
    totalNovels: number,
    errors: string[]
  ): Promise<Map<string, NovelIdea[]>> {
    const ideasByGenre = new Map<string, NovelIdea[]>();
    const novelsPerGenre = Math.ceil(totalNovels / ALL_GENRES.length);
    const batchSize = 20; // 20 novels per Gemini call (fits well within 60K token limit)

    // Process genres in parallel (4 at a time to respect rate limits)
    const genreChunks = this.chunkArray(ALL_GENRES, 4);

    for (const genreChunk of genreChunks) {
      const promises = genreChunk.map(async (genre) => {
        const ideas: NovelIdea[] = [];

        for (let offset = 0; offset < novelsPerGenre; offset += batchSize) {
          const count = Math.min(batchSize, novelsPerGenre - offset);
          try {
            const batch = await this.generateNovelBatch(genre, count, offset);
            ideas.push(...batch);
          } catch (e: any) {
            errors.push(`FAILED: ${genre} batch at offset ${offset}: ${e?.message || String(e)}. No fallback.`);
          }
        }

        ideasByGenre.set(genre, ideas);
        console.log(`[Seeder] Genre ${genre}: ${ideas.length} ideas`);
      });

      await Promise.all(promises);
    }

    return ideasByGenre;
  }

  /**
   * Generate a batch of novel titles + premises via Gemini
   */
  private async generateNovelBatch(
    genre: string,
    count: number,
    offset: number
  ): Promise<NovelIdea[]> {
    const genreLabel = GENRE_LABELS[genre] || genre;
    const requiredKey = (GENRE_CONFIG as any)[genre]?.requiredFields?.[0] as string | undefined;
    const requiredExample = requiredKey ? (GENRE_CONFIG as any)[genre]?.example : '';

    const requiredRulesByKey: Record<string, string> = {
      cultivation_system: 'Viết hệ thống tu luyện rõ ràng, ít nhất 7 cảnh giới theo thứ tự, mỗi cảnh giới có đặc trưng và điều kiện đột phá.',
      magic_system: 'Viết hệ thống phép thuật rõ ràng (nguyên tố/trường phái/cấp bậc), ít nhất 7 bậc hoặc 7 vòng tiến hoá sức mạnh.',
      game_system: 'Viết hệ thống game/VR: cấp độ, class, skill tree, nhiệm vụ, thưởng/phạt, UI trạng thái. Có luật rõ.',
      modern_setting: 'Viết bối cảnh đô thị hiện đại: thành phố/ngành nghề/chính trị-xã hội/quy tắc quyền lực. Cụ thể và có xung đột.',
      tech_level: 'Viết mức công nghệ tương lai: mốc công nghệ chủ đạo (AI, cơ giáp, du hành, nano, lượng tử...), mức độ phổ cập và hệ quả xã hội.',
      historical_period: 'Nêu rõ thời kỳ lịch sử (triều đại/niên đại), bối cảnh chính trị-xã hội, phong tục và mâu thuẫn thời đại.',
      original_work: 'Nêu rõ tác phẩm gốc (tên) và cách biến tấu/nhánh rẽ (AU) để tạo câu chuyện mới.',
    };
    const requiredRule = requiredKey ? (requiredRulesByKey[requiredKey] || 'Viết chi tiết, cụ thể, có cấu trúc rõ ràng.') : 'Viết chi tiết, cụ thể, có cấu trúc rõ ràng.';

    const prompt = `Bạn là tác giả webnovel chuyên nghiệp. Hãy tạo ${count} tiểu thuyết thể loại ${genreLabel} với NỘI DUNG ĐẦY ĐỦ.

Mỗi tiểu thuyết cần:
1. "title": Tên truyện (hấp dẫn, kiểu webnovel, 2-8 chữ)
2. "premise": Hook 1-2 câu ngắn gọn — PHẢI nêu rõ golden finger của nhân vật chính
3. "mainCharacter": Tên nhân vật chính (Trung/Việt, 2-3 chữ)
4. "mainCharacterProfile": Hồ sơ NV chính 120-220 chữ (tuổi/xuất thân/tính cách/năng lực/mục tiêu/điểm yếu)
5. "description": Giới thiệu truyện 250-500 chữ tiếng Việt. Bao gồm: bối cảnh thế giới, nhân vật chính, xung đột chính, điểm hấp dẫn. Câu đầu phải HOOK. KHÔNG spoil kết.
6. "shortSynopsis": Tóm tắt 2-3 câu (không spoil kết)
7. "worldDescription": Mô tả thế giới 120-220 chữ (địa danh, thế lực, quy tắc)
8. "${requiredKey || 'required_system'}": Trường BẮT BUỘC cho thể loại này. ${requiredRule} Ví dụ format: ${requiredExample}
9. "coverPrompt": Prompt tiếng Anh 3-5 câu để AI tạo ảnh bìa. BẮT BUỘC chứa: Title text must be exactly: "<TITLE>", At the bottom-center include small text: "Truyencity.com", No other text.

MẪU TÊN TRUYỆN HẤP DẪN (BẮT BUỘC theo 1 trong các pattern sau):
- "Trùng Sinh: [XX]" — cho truyện trùng sinh/xuyên không
- "Ta Tại [Bối Cảnh] [Hành Động OP]" — VD: "Ta Tại Thần Giới Vô Địch"
- "[Hệ Thống] + [Mục Tiêu]" — VD: "Hệ Thống Ký Danh: Ta Lên Cấp Mỗi Ngày"
- "[Danh Hiệu] + [Nhân Vật]" — VD: "Vạn Cổ Đệ Nhất Kiếm Thần"
- "[Hành Động] + [Kết Quả Sốc]" — VD: "Bắt Đầu Từ Việc Thu Phục Thần Thú"

GOLDEN FINGER (BẮT BUỘC cho mỗi truyện):
Nhân vật chính PHẢI có ít nhất 1 lợi thế đặc biệt rõ ràng, ví dụ:
- Hệ thống sign-in / gacha / nhiệm vụ
- Kiến thức từ kiếp trước / tiên tri
- Kho tàng cổ đại / không gian tu luyện riêng
- Thiên phú/thể chất đặc biệt / huyết mạch thần bí

Trả về JSON array:
[{"title":"...","premise":"...","mainCharacter":"...","mainCharacterProfile":"...","description":"...","shortSynopsis":"...","worldDescription":"...","${requiredKey || 'required_system'}":"...","coverPrompt":"..."},...]

CHÚ Ý:
- Mỗi truyện PHẢI có description dài 250+ chữ, có shortSynopsis + worldDescription + mainCharacterProfile
- Trường "${requiredKey || 'required_system'}" là BẮT BUỘC, không được để trống
- coverPrompt phải chứa: Title text must be exactly: "<TITLE>" và "At the bottom-center, include small text: Truyencity.com" và "No other text besides the title and Truyencity.com"
- Mỗi truyện phải có ý tưởng ĐỘC ĐÁO, KHÔNG lặp lại ý tưởng trong cùng batch
- CHỈ trả về JSON array, không thêm text khác`;

    try {
      const response = await this.aiService.chat({
        provider: 'gemini',
        model: 'gemini-3-flash-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        maxTokens: 60000,
      });

      if (!response.success || !response.content) {
        const errMsg = `Gemini failed for ${genre}: ${response.error || 'empty response'}`;
        console.error(`[Seeder] ${errMsg}`);
        throw new Error(errMsg);
      }

      // Parse JSON from response
      const ideas = this.parseNovelIdeas(response.content, count, requiredKey);
      if (ideas.length === 0) {
        throw new Error(`Gemini returned unparseable JSON for ${genre} (expected ${count} novels)`);
      }
      return ideas;
    } catch (error) {
      console.error(`[Seeder] Gemini error for ${genre}:`, error);
      throw error;
    }
  }

  /**
   * Parse JSON array of novel ideas from Gemini response
   */
  private parseNovelIdeas(content: string, expectedCount: number, requiredKey?: string): NovelIdea[] {
    try {
      // Extract JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        // Try to repair truncated JSON
        const repaired = this.repairTruncatedJSON(content);
        const repairedMatch = repaired.match(/\[[\s\S]*\]/);
        if (!repairedMatch) return [];
        const parsed = JSON.parse(repairedMatch[0]);
        return this.validateNovelIdeas(parsed, requiredKey);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return this.validateNovelIdeas(parsed, requiredKey);
    } catch (error) {
      console.error('[Seeder] JSON parse error:', error);
      return [];
    }
  }

  private validateNovelIdeas(parsed: unknown[], requiredKey?: string): NovelIdea[] {
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item: any) => item.title && item.premise)
      .map((item: any) => ({
        title: String(item.title).trim(),
        premise: String(item.premise).trim(),
        mainCharacter: String(item.mainCharacter || this.randomMCName()).trim(),
        mainCharacterProfile: item.mainCharacterProfile ? String(item.mainCharacterProfile).trim() : undefined,
        description: item.description ? String(item.description).trim() : undefined,
        shortSynopsis: item.shortSynopsis ? String(item.shortSynopsis).trim() : undefined,
        worldDescription: item.worldDescription ? String(item.worldDescription).trim() : undefined,
        requiredFieldKey: requiredKey,
        requiredFieldValue: requiredKey && item[requiredKey] ? String(item[requiredKey]).trim() : undefined,
        coverPrompt: item.coverPrompt ? String(item.coverPrompt).trim() : undefined,
      }));
  }

  /**
   * Repair truncated JSON (from Gemini cutting off)
   */
  private repairTruncatedJSON(content: string): string {
    let result = content.trim();

    // Remove trailing partial entries
    const lastCompleteObj = result.lastIndexOf('}');
    if (lastCompleteObj > 0) {
      result = result.substring(0, lastCompleteObj + 1);
    }

    // Close unclosed array
    const opens = (result.match(/\[/g) || []).length;
    const closes = (result.match(/\]/g) || []).length;
    for (let i = 0; i < opens - closes; i++) {
      result += ']';
    }

    return result;
  }

  // ============================================================================
  // STEP 3: INSERT NOVELS + PROJECTS
  // ============================================================================

  private async seedNovels(
    authorIds: string[],
    ideasByGenre: Map<string, NovelIdea[]>,
    novelsPerAuthor: number,
    minChapters: number,
    maxChapters: number,
    errors: string[]
  ): Promise<number> {
    let totalInserted = 0;
    const novelBatchSize = 50;
    const projectBatchSize = 50;

    // Flatten all ideas into a single pool, cycling genres
    const allIdeas: Array<{ genre: string; idea: NovelIdea }> = [];
    const genreIterators = new Map<string, number>();
    for (const genre of ALL_GENRES) {
      genreIterators.set(genre, 0);
    }

    // Distribute novels: each author gets novelsPerAuthor novels, spread across genres
    for (let authorIdx = 0; authorIdx < authorIds.length; authorIdx++) {
      for (let novelIdx = 0; novelIdx < novelsPerAuthor; novelIdx++) {
        const genreIdx = (authorIdx * novelsPerAuthor + novelIdx) % ALL_GENRES.length;
        const genre = ALL_GENRES[genreIdx];
        const ideas = ideasByGenre.get(genre) || [];
        const ideaIdx = genreIterators.get(genre) || 0;

        if (ideaIdx >= ideas.length) {
          errors.push(`FAILED: Not enough Gemini ideas for genre ${genre} (need index ${ideaIdx}, have ${ideas.length}). Skipping novel.`);
          genreIterators.set(genre, ideaIdx + 1);
          continue;
        }
        const idea = ideas[ideaIdx];
        genreIterators.set(genre, ideaIdx + 1);

        allIdeas.push({ genre, idea });
      }
    }

    // Dedup titles — DB has unique constraint on novels.title
    // If duplicate, append a short hash to make it unique
    const seenTitles = new Set<string>();
    for (const entry of allIdeas) {
      let title = entry.idea.title;
      while (seenTitles.has(title)) {
        title = `${entry.idea.title} [${randomUUID().slice(0, 4)}]`;
      }
      seenTitles.add(title);
      entry.idea.title = title;
    }

    // Insert in batches
    for (let batch = 0; batch < allIdeas.length; batch += novelBatchSize) {
      const batchEnd = Math.min(batch + novelBatchSize, allIdeas.length);
      const novelRows: any[] = [];
      const projectRows: any[] = [];

      for (let i = batch; i < batchEnd; i++) {
        const authorIdx = Math.floor(i / novelsPerAuthor);
        const authorId = authorIds[authorIdx];
        const { genre, idea } = allIdeas[i];

        const novelId = randomUUID();
        const projectId = randomUUID();
        const totalChapters = this.randomInt(minChapters, maxChapters);

        const requiredKey =
          idea.requiredFieldKey || ((GENRE_CONFIG as any)[genre]?.requiredFields?.[0] as string | undefined);
        const requiredValue = idea.requiredFieldValue;
        if (requiredKey && !requiredValue) {
          errors.push(`WARNING: Novel "${idea.title}" missing required field ${requiredKey}. Gemini did not provide it.`);
        }

        const formattedDescription = this.formatNovelDescription({
          ...idea,
          requiredFieldKey: requiredKey,
          requiredFieldValue: requiredValue,
        });

        novelRows.push({
          id: novelId,
          title: idea.title,
          author: '', // Will be filled separately via updateNovelAuthorNames
          ai_author_id: authorId,
          description: formattedDescription,
          status: 'Đang ra',
          genres: [genre],
          cover_prompt: idea.coverPrompt || this.buildCoverPrompt(idea.title, genre, formattedDescription),
        });

        const projectRow: any = {
          id: projectId,
          user_id: this.userId,
          novel_id: novelId,
          genre,
          main_character: idea.mainCharacter,
          world_description: idea.worldDescription || idea.description || idea.premise,
          writing_style: 'webnovel_chinese',
          target_chapter_length: 2500,
          ai_model: 'gemini-3-flash-preview',
          temperature: 1.0,
          current_chapter: 0,
          total_planned_chapters: totalChapters,
          status: 'paused', // Start paused, activate later
        };

        // Fill genre-required system field (AI Writer relies on this)
        if (requiredKey && requiredValue) {
          projectRow[requiredKey] = requiredValue;
        }

        projectRows.push(projectRow);
      }

      // Insert novels first (FK dependency)
      const { error: novelError } = await this.supabase.from('novels').insert(novelRows);
      if (novelError) {
        errors.push(`Novel batch ${batch}-${batchEnd} failed: ${novelError.message}`);
        continue;
      }

      // Then insert projects
      const { error: projectError } = await this.supabase.from('ai_story_projects').insert(projectRows);
      if (projectError) {
        errors.push(`Project batch ${batch}-${batchEnd} failed: ${projectError.message}`);
        // Clean up orphaned novels
        const novelIdsToClean = novelRows.map(n => n.id);
        await this.supabase.from('novels').delete().in('id', novelIdsToClean);
        continue;
      }

      totalInserted += novelRows.length;
      console.log(`[Seeder] Novels ${batch + 1}-${batchEnd} inserted (${totalInserted} total)`);
    }

    // Update author names on novels
    await this.updateNovelAuthorNames(authorIds, errors);

    return totalInserted;
  }

  /**
   * Set novels.author = ai_authors.name for display
   */
  private async updateNovelAuthorNames(authorIds: string[], errors: string[]): Promise<void> {
    // Batch update: get all authors, then update their novels
    for (let i = 0; i < authorIds.length; i += 50) {
      const batch = authorIds.slice(i, i + 50);

      const { data: authors } = await this.supabase
        .from('ai_authors')
        .select('id, name')
        .in('id', batch);

      if (!authors) continue;

      for (const author of authors) {
        const { error } = await this.supabase
          .from('novels')
          .update({ author: author.name })
          .eq('ai_author_id', author.id);

        if (error) {
          errors.push(`Update author name for ${author.id.slice(0, 8)} failed: ${error.message}`);
        }
      }
    }
  }

  // ============================================================================
  // STEP 4: ACTIVATE INITIAL BATCH
  // ============================================================================

  private async activateInitialBatch(
    authorIds: string[],
    perAuthor: number,
    errors: string[]
  ): Promise<number> {
    let totalActivated = 0;

    // Process in batches to avoid timeout
    for (let i = 0; i < authorIds.length; i += 20) {
      const authorBatch = authorIds.slice(i, i + 20);

      const promises = authorBatch.map(async (authorId) => {
        // Find paused projects linked to this author's novels
        const { data: novels } = await this.supabase
          .from('novels')
          .select('id')
          .eq('ai_author_id', authorId);

        if (!novels || novels.length === 0) return 0;

        const novelIds = novels.map(n => n.id);

        // Get paused projects for these novels, limit to perAuthor
        const { data: projects } = await this.supabase
          .from('ai_story_projects')
          .select('id')
          .in('novel_id', novelIds)
          .eq('status', 'paused')
          .limit(perAuthor);

        if (!projects || projects.length === 0) return 0;

        const projectIds = projects.map(p => p.id);

        const { error } = await this.supabase
          .from('ai_story_projects')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .in('id', projectIds);

        if (error) {
          errors.push(`Activate for author ${authorId.slice(0, 8)} failed: ${error.message}`);
          return 0;
        }

        return projectIds.length;
      });

      const results = await Promise.all(promises);
      totalActivated += results.reduce((sum, n) => sum + n, 0);
      console.log(`[Seeder] Activated batch ${i + 1}-${Math.min(i + 20, authorIds.length)}: ${totalActivated} total`);
    }

    return totalActivated;
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private formatNovelDescription(idea: NovelIdea): string {
    const blocks: string[] = [];

    const intro = (idea.description || idea.premise || '').trim();
    if (intro) blocks.push(intro);

    const shortSynopsis = (idea.shortSynopsis || '').trim();
    if (shortSynopsis) blocks.push(`TÓM TẮT\n${shortSynopsis}`);

    const mcProfile = (idea.mainCharacterProfile || '').trim();
    const mcLine = mcProfile ? `${idea.mainCharacter}: ${mcProfile}` : idea.mainCharacter;
    blocks.push(`NHÂN VẬT CHÍNH\n${mcLine}`);

    const world = (idea.worldDescription || '').trim();
    if (world) blocks.push(`THẾ GIỚI\n${world}`);

    const systemKey = (idea.requiredFieldKey || '').trim();
    const systemVal = (idea.requiredFieldValue || '').trim();
    if (systemKey && systemVal) {
      const label = systemKey.replace(/_/g, ' ').toUpperCase();
      blocks.push(`${label}\n${systemVal}`);
    }

    // Missing required field = Gemini didn't provide it. Leave empty — error is logged upstream.

    return blocks.filter(Boolean).join('\n\n');
  }

  private toVietnameseOrdinal(n: number): string {
    // Generate natural-looking Vietnamese pen name suffixes
    const suffixes = [
      'Nhất', 'Nhị', 'Tam', 'Tứ', 'Ngũ', 'Lục', 'Thất', 'Bát', 'Cửu', 'Thập',
      'Phong', 'Vân', 'Sơn', 'Hà', 'Nguyệt', 'Tinh', 'Hải', 'Thiên', 'Địa', 'Nhân',
      'Long', 'Hổ', 'Phượng', 'Quy', 'Lân', 'Hạc', 'Ưng', 'Bằng', 'Xà', 'Mã',
      'Xuân', 'Hạ', 'Thu', 'Đông', 'Mai', 'Lan', 'Cúc', 'Trúc', 'Tùng', 'Bách',
      'Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ', 'Thiết', 'Ngọc', 'Lôi', 'Băng', 'Viêm',
    ];
    if (n <= suffixes.length) {
      return suffixes[n - 1];
    }
    // Beyond 50: combine two suffixes
    const a = suffixes[(n - 1) % suffixes.length];
    const b = suffixes[Math.floor((n - 1) / suffixes.length) % suffixes.length];
    return `${a} ${b}`;
  }

  private randomMCName(): string {
    const ho = MC_NAMES.ho[Math.floor(Math.random() * MC_NAMES.ho.length)];
    const ten = MC_NAMES.ten[Math.floor(Math.random() * MC_NAMES.ten.length)];
    return `${ho} ${ten}`;
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
  }

  private chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  private buildCoverPrompt(title: string, genre: string, description: string): string {
    const genreName = GENRE_LABELS[genre] || genre;
    // Gemini 3 Pro Image Preview has advanced text rendering for Vietnamese titles.
    return [
      `A photo of a glossy, design-forward webnovel book cover.`,
      `Genre: ${genreName}.`,
      `Story description: ${description}`,
      `Title text must be exactly: "${title}". Place at the top-center in large bold serif font, high contrast, perfectly readable.`,
      `At the bottom-center, include small text: "Truyencity.com"`,
      `No other text besides the title and Truyencity.com.`,
      `Vertical 3:4 composition, cinematic lighting, high-detail illustration, premium publishing quality.`,
      `No watermark, no signature, no logos besides Truyencity.com.`,
    ].join(' ');
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createContentSeeder(geminiApiKey: string): ContentSeeder {
  return new ContentSeeder(geminiApiKey);
}
