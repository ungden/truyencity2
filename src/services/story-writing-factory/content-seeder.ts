/**
 * Content Seeder - Seed platform with AI authors and novels at scale
 *
 * Generates:
 * - 200 AI authors with unique pen names and personas
 * - 4000 novels (20 per author) across 12 genres
 * - Activates 1000 novels initially (5 per author)
 *
 * Uses template-based generation (no AI calls for authors)
 * Uses Gemini batch calls for novel titles/premises (~80 calls total)
 */

import { randomUUID } from 'crypto';
import { generateQuickAuthor } from './author-generator';
import { getSupabase } from './supabase-helper';
import { AIProviderService } from '../ai-provider';
import { GenreType } from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

const ALL_GENRES: GenreType[] = [
  'tien-hiep', 'huyen-huyen', 'do-thi', 'kiem-hiep',
  'lich-su', 'khoa-huyen', 'vong-du', 'dong-nhan',
  'mat-the', 'linh-di', 'quan-truong', 'di-gioi',
];

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
  useGemini: boolean;
}

export interface SeedResult {
  authors: number;
  novels: number;
  activated: number;
  errors: string[];
  durationMs: number;
}

interface NovelIdea {
  title: string;
  premise: string;
  mainCharacter: string;
  description?: string;     // rich 200-400 word description
  worldSystem?: string;     // cultivation/magic system details
  coverPrompt?: string;     // English cover scene prompt
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
    const { data: existing } = await this.supabase.from('ai_authors').select('count');
    const existingCount = existing?.[0]?.count || 0;
    if (existingCount >= count) {
      return { authors: existingCount, novels: 0, activated: 0, errors: [`Already have ${existingCount} authors, skipping`], durationMs: Date.now() - startTime };
    }

    const needed = count - existingCount;
    console.log(`[Seeder] Step 1: Have ${existingCount}, need ${needed} more authors`);
    const authorIds = await this.seedAuthors(needed, errors);

    return { authors: existingCount + authorIds.length, novels: 0, activated: 0, errors, durationMs: Date.now() - startTime };
  }

  /**
   * Step 2 only: Generate novels for existing authors. Uses fallback templates if useGemini=false.
   */
  async seedNovelsOnly(config: Partial<SeedConfig> = {}): Promise<SeedResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const { novelsPerAuthor = 20, minChapters = 1000, maxChapters = 2000, useGemini = true } = config;

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
    const { data: novelCount } = await this.supabase.from('novels').select('count');
    const existingNovels = novelCount?.[0]?.count || 0;
    const targetNovels = authorIds.length * novelsPerAuthor;
    if (existingNovels >= targetNovels) {
      return { authors: authorIds.length, novels: existingNovels, activated: 0, errors: [`Already have ${existingNovels} novels`], durationMs: Date.now() - startTime };
    }

    console.log(`[Seeder] Step 2: ${authorIds.length} authors, generating ${targetNovels} novels (useGemini=${useGemini})`);

    let novelIdeas: Map<string, NovelIdea[]>;
    if (useGemini) {
      novelIdeas = await this.generateAllNovelIdeas(targetNovels, errors);
    } else {
      // Fallback only — fast, no AI calls
      novelIdeas = new Map();
      const perGenre = Math.ceil(targetNovels / ALL_GENRES.length);
      for (const genre of ALL_GENRES) {
        const ideas: NovelIdea[] = [];
        for (let i = 0; i < perGenre; i++) {
          ideas.push(this.generateFallbackNovel(genre, i));
        }
        novelIdeas.set(genre, ideas);
      }
    }

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
        // Append short hash to ensure unique name
        const uniqueName = `${author.name} ${id.slice(0, 4)}`;

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
    const batchSize = 50; // 50 novels per Gemini call

    // Process genres in parallel (4 at a time to respect rate limits)
    const genreChunks = this.chunkArray(ALL_GENRES, 4);

    for (const genreChunk of genreChunks) {
      const promises = genreChunk.map(async (genre) => {
        const ideas: NovelIdea[] = [];

        for (let offset = 0; offset < novelsPerGenre; offset += batchSize) {
          const count = Math.min(batchSize, novelsPerGenre - offset);
          const batch = await this.generateNovelBatch(genre, count, offset);

          if (batch.length > 0) {
            ideas.push(...batch);
          } else {
            errors.push(`Failed to generate novels for ${genre} batch at offset ${offset}`);
            // Generate fallback ideas
            for (let j = 0; j < count; j++) {
              ideas.push(this.generateFallbackNovel(genre, offset + j));
            }
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

    const prompt = `Bạn là tác giả webnovel chuyên nghiệp. Hãy tạo ${count} tiểu thuyết thể loại ${genreLabel} với NỘI DUNG ĐẦY ĐỦ.

Mỗi tiểu thuyết cần:
1. "title": Tên truyện (hấp dẫn, kiểu webnovel, 2-8 chữ)
2. "premise": Hook 1-2 câu ngắn gọn
3. "mainCharacter": Tên nhân vật chính (Trung/Việt, 2-3 chữ)
4. "description": Giới thiệu truyện 200-400 chữ tiếng Việt. Bao gồm: bối cảnh thế giới, nhân vật chính (xuất thân, tính cách, năng lực), xung đột chính, điểm hấp dẫn. Câu đầu phải HOOK. KHÔNG spoil kết.
5. "worldSystem": Mô tả hệ thống thế giới 100-200 chữ. Nếu tu luyện: liệt kê 7+ cấp bậc. Nếu game: level system. Nếu đô thị: hệ thống xã hội/quyền lực. Phải chi tiết, cụ thể.
6. "coverPrompt": 2-3 câu tiếng ANH mô tả cảnh bìa: nhân vật đang làm gì, bối cảnh, mood, màu sắc.

Trả về JSON array:
[{"title":"...","premise":"...","mainCharacter":"...","description":"...","worldSystem":"...","coverPrompt":"..."},...]

CHÚ Ý:
- Mỗi truyện PHẢI có description dài 200+ chữ, worldSystem 100+ chữ
- Ý tưởng ĐỘC ĐÁO, không lặp lại
- Batch ${Math.floor(offset / count) + 1}: sáng tạo theo hướng khác batch trước
- CHỈ trả về JSON array, không thêm text khác`;

    try {
      const response = await this.aiService.chat({
        provider: 'gemini',
        model: 'gemini-3-flash-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 1.0,
        maxTokens: 8192,
      });

      if (!response.success || !response.content) {
        console.error(`[Seeder] Gemini failed for ${genre}: ${response.error}`);
        return [];
      }

      // Parse JSON from response
      return this.parseNovelIdeas(response.content, count);
    } catch (error) {
      console.error(`[Seeder] Gemini error for ${genre}:`, error);
      return [];
    }
  }

  /**
   * Parse JSON array of novel ideas from Gemini response
   */
  private parseNovelIdeas(content: string, expectedCount: number): NovelIdea[] {
    try {
      // Extract JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        // Try to repair truncated JSON
        const repaired = this.repairTruncatedJSON(content);
        const repairedMatch = repaired.match(/\[[\s\S]*\]/);
        if (!repairedMatch) return [];
        const parsed = JSON.parse(repairedMatch[0]);
        return this.validateNovelIdeas(parsed);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return this.validateNovelIdeas(parsed);
    } catch (error) {
      console.error('[Seeder] JSON parse error:', error);
      return [];
    }
  }

  private validateNovelIdeas(parsed: unknown[]): NovelIdea[] {
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item: any) => item.title && item.premise)
      .map((item: any) => ({
        title: String(item.title).trim(),
        premise: String(item.premise).trim(),
        mainCharacter: String(item.mainCharacter || this.randomMCName()).trim(),
        description: item.description ? String(item.description).trim() : undefined,
        worldSystem: item.worldSystem ? String(item.worldSystem).trim() : undefined,
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

  /**
   * Generate a fallback novel idea (no AI)
   */
  private generateFallbackNovel(genre: string, index: number): NovelIdea {
    const genreLabel = GENRE_LABELS[genre] || genre;
    const mc = this.randomMCName();
    // Use UUID suffix to guarantee unique titles
    const uid = randomUUID().slice(0, 6);

    const templates = [
      { title: `${mc} ${genreLabel} Ký`, premise: `${mc} bước vào con đường ${genreLabel.toLowerCase()}, từ kẻ vô danh trở thành tuyệt thế cường giả.` },
      { title: `Thiên Đạo ${genreLabel}: ${mc}`, premise: `Trong thế giới ${genreLabel.toLowerCase()}, ${mc} phát hiện bí mật kinh thiên, bắt đầu hành trình nghịch thiên.` },
      { title: `${genreLabel} Chi Vương: ${mc}`, premise: `${mc} mang theo ký ức tiền kiếp, quyết tâm đứng trên đỉnh thế giới ${genreLabel.toLowerCase()}.` },
      { title: `Vô Thượng ${genreLabel}: ${mc}`, premise: `Cả thế giới đều nói ${mc} là phế vật, nhưng hắn lại có bí mật mà không ai biết.` },
      { title: `${mc} Truyền Kỳ`, premise: `Câu chuyện về ${mc} - từ thiếu niên bình thường đến bá chủ ${genreLabel.toLowerCase()}.` },
    ];

    const template = templates[index % templates.length];
    return {
      title: `${template.title} [${uid}]`,
      premise: template.premise,
      mainCharacter: mc,
    };
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

        const idea = ideas[ideaIdx] || this.generateFallbackNovel(genre, ideaIdx);
        genreIterators.set(genre, ideaIdx + 1);

        allIdeas.push({ genre, idea });
      }
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

        novelRows.push({
          id: novelId,
          title: idea.title,
          author: '', // Will be filled separately via updateNovelAuthorNames
          ai_author_id: authorId,
          description: idea.description || idea.premise,
          status: 'Đang ra',
          genres: [genre],
        });

        projectRows.push({
          id: projectId,
          user_id: this.userId,
          novel_id: novelId,
          genre,
          main_character: idea.mainCharacter,
          world_description: idea.worldSystem || idea.premise,
          writing_style: 'webnovel_chinese',
          target_chapter_length: 2500,
          ai_model: 'gemini-3-flash-preview',
          temperature: 1.0,
          current_chapter: 0,
          total_planned_chapters: totalChapters,
          status: 'paused', // Start paused, activate later
        });
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
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createContentSeeder(geminiApiKey: string): ContentSeeder {
  return new ContentSeeder(geminiApiKey);
}
