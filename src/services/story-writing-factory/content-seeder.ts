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

const PLATFORM_BLEND_RULE = 'Blend 50% Qidian + 30% Zongheng + 20% Faloo (BFALOO)';

const SOURCE_TOPIC_SEEDS: Record<string, string[]> = {
  'tien-hiep': [
    'tông môn suy tàn được vực dậy từ ngoại môn',
    'phàm nhân có ngọc giản cổ đế',
    'bí cảnh thượng cổ và tranh đoạt truyền thừa',
    'độ kiếp liên hoàn phản sát thiên kiêu',
    'phi thăng rồi phát hiện tiên giới là bẫy',
    'song tu chính tà, một thân hai đạo',
    'hồng hoang đại kiếp và tranh đoạt thánh vị',
    'mở tông môn từ ngoại môn phế vật',
    'linh điền nông trại đổi tài nguyên tu luyện',
    'mở tiệm net mô phỏng bí cảnh cho tu sĩ',
    'hải vực săn bảo, đoạt truyền thừa cổ tiên',
    'sơn lâm săn yêu thú đổi điểm cống hiến tông môn',
    // Wave 2: summoning, family, livestream, simulator, alchemy
    'triệu hoán viễn cổ thần thú từ trứng phế vật',
    'ký khế linh thú tiến hóa, đấu trường liên tông',
    'xây gia tộc tu tiên xuyên mười đời tích lũy',
    'livestream tu tiên cho phàm nhân, triệu viewer xem đột phá',
    'mô phỏng ngàn kiếp tu tiên rồi chọn đường tối ưu',
    'đan sư phế vật luyện ra thần đan chấn động tu tiên giới',
    'luyện khí sư mở tiệm pháp bảo, cường giả xếp hàng chờ',
  ],
  'huyen-huyen': [
    'học viện ma pháp + chiến tranh chủng tộc',
    'khế ước thú thần nhiều hệ',
    'khắc văn cấm thuật và lò rèn linh hồn',
    'đảo nổi bầu trời, hành trình săn di vật',
    'huyết mạch cổ thần thức tỉnh từng tầng',
    'pháp tắc nhân quả thao túng vận mệnh',
    'mở tiệm net ma pháp trong thành học viện',
    'trang trại ma dược và thương hội liên quốc',
    'thợ săn ma thú rừng sâu thành lãnh chủ',
    // Wave 2: summoning, lord, infinite, occult, necromancer, tower, academy
    'toàn dân ngự thú, MC triệu hoán được phế vật thực ra là thần thú',
    'triệu hoán vạn tộc binh chủng chinh phạt đại lục',
    'toàn dân nhận lãnh địa dị giới, MC lãnh địa SSS',
    'vào phó bản phim kinh dị sống sót, chết là chết thật',
    'quỷ mật thế giới quy tắc siêu nhiên, suy luận để sống',
    'tử linh pháp sư xây quân đoàn vong linh từ chiến trường cũ',
    'leo tháp vô tận mười ngàn tầng, đỉnh tháp thành thần',
    'phế vật vào học viện ma pháp đệ nhất, leo bảng xếp hạng',
  ],
  'do-thi': [
    'livestream nghèo thành đỉnh lưu',
    'thương chiến AI + dữ liệu độc quyền',
    'bảo tiêu đô thị và giới tài phiệt ngầm',
    'đạo diễn web-drama thành vua phòng vé',
    'shipper nghịch tập thành ông trùm logistics',
    'hệ thống nhiệm vụ trong môi trường công sở',
    'tận thế đô thị và mô hình khu an toàn',
    'mở vườn kinh doanh nông nghiệp công nghệ cao',
    'đi biển bắt hải sản và chuỗi cung ứng lạnh',
    'lên núi săn thú hợp pháp kết hợp livestream',
    'mở tiệm net cũ thành trung tâm esports',
    'võng du vào hiện thực, kỹ năng game dùng ngoài đời',
    // Wave 2: literary, face-slap, medical, antique, culinary, livestream, entertainment, horror, rich, disaster
    'xuyên đến thế giới không có Kim Dung, viết lại kiếm hiệp gây chấn động',
    'rể hờ ba năm bị nhục, lộ thân phận Long Vương cả gia tộc quỳ',
    'thần y đô thị chữa bệnh nan y, kết giao giới thượng lưu',
    'thiên nhãn nhìn thấu cổ vật, mua rẻ bán đắt thành ông trùm',
    'đầu bếp vỉa hè có bàn tay vàng, thi đấu ẩm thực quốc tế',
    'livestream câu cá biển sâu, kéo lên cá quý tiền tỷ',
    'trùng sinh thành diễn viên quần chúng, thành ảnh đế giải trí',
    'quy tắc quái đàm: tài xế cười thì xuống xe, suy luận để sống',
    'hệ thống thần hào: tiêu 10 tỷ trong 24 giờ, càng tiêu càng giàu',
    'biết trước động đất sắp xảy ra, tích trữ xây bunker sinh tồn',
  ],
  'khoa-huyen': [
    'tận thế bug hệ thống + thành phố bunker',
    'đội cơ giáp bảo vệ thuộc địa cuối cùng',
    'du hành sao cùng AI phản loạn',
    'dị biến gen tạo xã hội phân tầng mới',
    'khai hoang hành tinh bằng nano',
    'vòng lặp thời gian trước ngày diệt vong',
    'võng du thực hóa qua thiết bị thần kinh',
    'mở net-cafe VR thành trung tâm huấn luyện',
    'kinh doanh công nghệ lõi trong thời mạt thế',
    'đi biển săn tài nguyên ở đại dương độc hại',
    // Wave 2: insect, ice-age, wasteland, global-evolution, space
    'trùng tộc khổng lồ tấn công, chống lại trùng mẫu hoàng hậu',
    'kỷ băng hà -80 độ, di cư tìm vùng đất ấm cuối cùng',
    'phế thổ hậu hạt nhân, scavenger lặn phế tích tìm công nghệ',
    'toàn cầu tiến hóa bắt buộc, hệ thống xếp hạng thế giới',
    'toàn dân nhận phi thuyền, khai phá vũ trụ cạnh tranh hạm đội',
  ],
  'lich-su': [
    'hàn môn sĩ tử khuấy triều đình',
    'thương lộ tơ lụa và chiến tranh thuế',
    'nữ quân sư đảo chiều quốc vận',
    'thái y phá cục bằng y thuật',
    'xây thành biên cương từ con số 0',
    'tranh ngôi nhiều tầng mưu cục',
    'kinh doanh thương hội cổ đại từ chợ huyện',
    'đội tàu hải thương tranh cảng chiến lược',
    'thợ săn miền núi lập nghiệp biên cương',
    'xuyên thời gian mở tiệm net chiến cờ cho võ tướng',
    // Wave 2: summon generals, summon strategists, factory, infrastructure, military, doctor, food, tourism
    'triệu hoán Triệu Vân, Lữ Bố xây quân đoàn danh tướng',
    'triệu hoán Gia Cát Lượng, Phạm Lãi trị quốc kiến nghiệp',
    'kỹ sư xuyên về cổ đại mở nhà máy cách mạng công nghiệp',
    'xuyên không đắp đê trị thủy, xây đường nối biên cương',
    'đặc nhiệm xuyên về thời loạn cải cách quân sự bất bại',
    'bác sĩ xuyên không làm thần y triều đình cứu vạn dân',
    'đầu bếp xuyên về Đường triều, xào rau khiến kinh thành xếp hàng',
    'mở cổng thời gian dẫn du khách hiện đại về cổ đại du lịch',
  ],
  'dong-nhan': [
    'xuyên vào vai phản diện phụ',
    'AU đổi tuyến chính sử của tác phẩm gốc',
    'người ngoài cuộc phá timeline canon',
    'bản thể phụ tỉnh thức chống tác giả',
    'hệ thống nhiệm vụ trong thế giới IP gốc',
    'liên động đa vũ trụ fanfic',
    // Wave 2: summon characters, book transmigration, chat group, multiverse livestream
    'triệu hoán Naruto + Goku + Iron Man vào cùng đội chiến đấu',
    'xuyên vào tiểu thuyết sửa bug cốt truyện trước khi thế giới sụp',
    'nhóm chat xuyên vũ trụ: Tôn Ngộ Không trade đan dược với Batman',
    'livestream cuộc đời anh hùng/phản diện cho vạn giới comment',
  ],
  'vong-du': [
    'class ẩn sau khi bị kick khỏi top guild',
    'quốc chiến liên server + lãnh địa',
    'gacha summon phá meta mùa giải',
    'đội tuyển esports từ hạng bét lên vô địch',
    'thực tế ảo trộn thế giới thật',
    'nghề phụ crafting thành thần khí',
    'võng du vào hiện thực sau sự kiện đồng bộ máy chủ',
    'toàn dân chuyển chức, nghề ẩn mở khóa từ nhiệm vụ cấm',
    'kinh tế game thao túng chợ đấu giá liên server',
    'mở tiệm net chiến thuật và đào tạo tuyển thủ',
    // Wave 2: dungeon, NPC, global descent, simulator
    'phó bản xuất hiện khắp nơi, clear hoặc chết không có lựa chọn khác',
    'NPC thức tỉnh trong game, đối phó người chơi và phá vỡ hệ thống',
    'tháp 100 tầng giáng xuống mỗi thành phố, clear hoặc bị xóa',
    'mô phỏng ngàn lần chọn class tối ưu trước khi hành động thật',
  ],
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
}

export interface SeedResult {
  authors: number;
  novels: number;
  activated: number;
  coverJobs?: number;
  errors: string[];
  durationMs: number;
}

export interface DailySpawnResult {
  created: number;
  target: number;
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

interface GenreConfigEntry {
  requiredFields?: readonly string[];
  example?: string;
}

interface CoverlessNovelRow {
  id: string;
  title: string | null;
  description: string | null;
  genres: string[] | null;
  cover_prompt: string | null;
}

interface NovelInsertRow {
  id: string;
  title: string;
  author: string;
  ai_author_id: string;
  description: string;
  status: string;
  genres: string[];
  cover_prompt: string;
}

interface ProjectInsertRow {
  id: string;
  user_id: string | null;
  novel_id: string;
  genre: string;
  main_character: string;
  world_description: string;
  writing_style: string;
  target_chapter_length: number;
  ai_model: string;
  temperature: number;
  current_chapter: number;
  total_planned_chapters: number;
  status: string;
  [key: string]: string | number | null;
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

  private getGenreConfigEntry(genre: string): GenreConfigEntry | undefined {
    const configByGenre = GENRE_CONFIG as Record<string, GenreConfigEntry>;
    return configByGenre[genre];
  }

  private isObjectRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
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
    const authorIds = await this.seedAuthors(authorCount, errors);

    if (authorIds.length === 0) {
      return {
        authors: 0, novels: 0, activated: 0,
        errors: [...errors, 'Failed to create any authors'],
        durationMs: Date.now() - startTime,
      };
    }

    // Step 2: Generate novel ideas via Gemini
    const novelIdeas = await this.generateAllNovelIdeas(totalNovels, errors);

    // Step 3: Insert novels + ai_story_projects (paused)
    let totalInserted = 0;
    totalInserted = await this.seedNovels(
      authorIds, novelIdeas, novelsPerAuthor, minChapters, maxChapters, errors
    );

    // Step 4: Activate initial batch
    const activated = await this.activateInitialBatch(authorIds, activatePerAuthor, errors);

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
   * Daily spawn: create a small number of brand-new novels/projects.
   * Newly created projects start as active and are immediately scheduled for daily writing quota.
   */
  async spawnDailyNovels(targetCount: number = 20): Promise<DailySpawnResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    this.userId = await this.getSystemUserId();
    if (!this.userId) {
      return {
        created: 0,
        target: targetCount,
        errors: ['No user found in profiles table. Cannot create projects.'],
        durationMs: Date.now() - startTime,
      };
    }

    const { data: authors, error: authorError } = await this.supabase
      .from('ai_authors')
      .select('id, name')
      .eq('status', 'active');

    if (authorError || !authors || authors.length === 0) {
      return {
        created: 0,
        target: targetCount,
        errors: [`Failed to load authors: ${authorError?.message || 'No active authors'}`],
        durationMs: Date.now() - startTime,
      };
    }

    const authorIds = authors.map((a) => a.id);
    const authorNameMap = new Map(authors.map((a) => [a.id, a.name]));

    const { data: authorNovels } = await this.supabase
      .from('novels')
      .select('id, ai_author_id')
      .in('ai_author_id', authorIds);

    const novelIds = (authorNovels || []).map((n) => n.id);
    const novelAuthorMap = new Map((authorNovels || []).map((n) => [n.id, n.ai_author_id as string]));

    const { data: authorProjects } = novelIds.length > 0
      ? await this.supabase
          .from('ai_story_projects')
          .select('novel_id, status')
          .in('novel_id', novelIds)
      : { data: [] as Array<{ novel_id: string; status: string }> };

    const activeCountByAuthor = new Map<string, number>();
    for (const authorId of authorIds) {
      activeCountByAuthor.set(authorId, 0);
    }

    for (const project of authorProjects || []) {
      if (project.status !== 'active') continue;
      const authorId = novelAuthorMap.get(project.novel_id);
      if (!authorId) continue;
      activeCountByAuthor.set(authorId, (activeCountByAuthor.get(authorId) || 0) + 1);
    }

    const sortedAuthorIds = [...authorIds].sort(
      (a, b) => (activeCountByAuthor.get(a) || 0) - (activeCountByAuthor.get(b) || 0)
    );

    const selectedAuthorIds: string[] = [];
    for (let i = 0; i < targetCount; i++) {
      selectedAuthorIds.push(sortedAuthorIds[i % sortedAuthorIds.length]);
    }

    const assignedGenres = selectedAuthorIds.map((_, idx) => ALL_GENRES[idx % ALL_GENRES.length]);
    const genreCounts = new Map<string, number>();
    for (const genre of assignedGenres) {
      genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
    }

    const ideasByGenre = new Map<string, NovelIdea[]>();
    for (const [genre, count] of genreCounts.entries()) {
      try {
        const ideas = await this.generateNovelBatch(genre, count, Date.now() % 1000);
        ideasByGenre.set(genre, ideas);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        errors.push(`Generate ideas failed for ${genre}: ${message}. Using fallback templates.`);
        const fallbackIdeas = Array.from({ length: count }, (_, idx) => this.createFallbackIdea(genre, idx));
        ideasByGenre.set(genre, fallbackIdeas);
      }
    }

    const genreCursor = new Map<string, number>();
    for (const genre of genreCounts.keys()) {
      genreCursor.set(genre, 0);
    }

    const novelRows: NovelInsertRow[] = [];
    const projectRows: ProjectInsertRow[] = [];

    for (let i = 0; i < targetCount; i++) {
      const authorId = selectedAuthorIds[i];
      const genre = assignedGenres[i];
      const cursor = genreCursor.get(genre) || 0;
      const pool = ideasByGenre.get(genre) || [];
      const idea = pool[cursor] || this.createFallbackIdea(genre, i);
      genreCursor.set(genre, cursor + 1);

      const novelId = randomUUID();
      const projectId = randomUUID();
      const requiredKey = idea.requiredFieldKey || this.getGenreConfigEntry(genre)?.requiredFields?.[0];
      const requiredValue = idea.requiredFieldValue || this.getFallbackRequiredValue(genre, requiredKey);
      const safeTitle = `${idea.title} [${new Date().toISOString().slice(0, 10)}-${randomUUID().slice(0, 4)}]`;
      const formattedDescription = this.formatNovelDescription({
        ...idea,
        title: safeTitle,
        requiredFieldKey: requiredKey,
        requiredFieldValue: requiredValue,
      });

      novelRows.push({
        id: novelId,
        title: safeTitle,
        author: authorNameMap.get(authorId) || '',
        ai_author_id: authorId,
        description: formattedDescription,
        status: 'Đang ra',
        genres: [genre],
        cover_prompt: idea.coverPrompt || this.buildCoverPrompt(safeTitle, genre, formattedDescription),
      });

      const projectRow: ProjectInsertRow = {
        id: projectId,
        user_id: this.userId,
        novel_id: novelId,
        genre,
        main_character: idea.mainCharacter || this.randomMCName(),
        world_description: this.formatWorldDescription({
          ...idea,
          title: safeTitle,
          requiredFieldKey: requiredKey,
          requiredFieldValue: requiredValue,
        }),
        writing_style: 'webnovel_chinese',
        target_chapter_length: 2500,
        ai_model: 'gemini-3-flash-preview',
        temperature: 1.0,
        current_chapter: 0,
        total_planned_chapters: this.randomInt(1000, 2000),
        status: 'active',
      };

      if (requiredKey && requiredValue) {
        projectRow[requiredKey] = requiredValue;
      }

      projectRows.push(projectRow);
    }

    let created = 0;

    const { error: novelInsertError } = await this.supabase.from('novels').insert(novelRows);
    if (novelInsertError) {
      errors.push(`Insert daily novels failed: ${novelInsertError.message}`);
      return {
        created: 0,
        target: targetCount,
        errors,
        durationMs: Date.now() - startTime,
      };
    }

    const { error: projectInsertError } = await this.supabase.from('ai_story_projects').insert(projectRows);
    if (projectInsertError) {
      errors.push(`Insert daily projects failed: ${projectInsertError.message}`);
      await this.supabase.from('novels').delete().in('id', novelRows.map((n) => n.id));
      return {
        created: 0,
        target: targetCount,
        errors,
        durationMs: Date.now() - startTime,
      };
    }

    created = projectRows.length;

    return {
      created,
      target: targetCount,
      errors,
      durationMs: Date.now() - startTime,
    };
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

    // 2. Delete ai_story_projects scoped to AI novels (cascades 24+ child tables)
    for (const chunk of chunks) {
      const { error } = await this.supabase
        .from('ai_story_projects')
        .delete()
        .in('novel_id', chunk);
      if (error) errors.push(`Delete ai_story_projects chunk: ${error.message}`);
    }

    // 3. Delete chapters explicitly (FK behavior unknown — could be RESTRICT)
    for (const chunk of chunks) {
      const { error } = await this.supabase
        .from('chapters')
        .delete()
        .in('novel_id', chunk);
      if (error) errors.push(`Delete chapters chunk: ${error.message}`);
    }

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

    // 5. Delete novels (remaining CASCADE FKs: bookmarks, reading_progress, production_queue)
    const { error: novelErr } = await this.supabase
      .from('novels')
      .delete()
      .not('ai_author_id', 'is', null);
    if (novelErr) errors.push(`Delete novels: ${novelErr.message}`);

    // 6. Delete ai_authors (all — this table is only used by the seeder)
    const { error: authorErr } = await this.supabase
      .from('ai_authors')
      .delete()
      .gte('created_at', '1970-01-01');
    if (authorErr) errors.push(`Delete ai_authors: ${authorErr.message}`);

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
      // storage cleanup complete
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      errors.push(`Storage cleanup: ${message}`);
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

    const novelsToProcess = (novels ?? []) as CoverlessNovelRow[];

    for (const novel of novelsToProcess) {
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
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : String(e);
          errors.push(`Invoke cover job failed (${job.id.slice(0, 8)}): ${message}`);
        }

        enqueued++;

        // Rate limit: 3s delay between jobs (Gemini image gen is slow anyway)
        if (enqueued < novels.length) {
          await new Promise(r => setTimeout(r, 3000));
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        errors.push(`Enqueue cover exception: ${message}`);
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
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            errors.push(`FAILED: ${genre} batch at offset ${offset}: ${message}. No fallback.`);
          }
        }

        ideasByGenre.set(genre, ideas);
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
    const genreConfig = this.getGenreConfigEntry(genre);
    const requiredKey = genreConfig?.requiredFields?.[0];
    const requiredExample = requiredKey ? genreConfig?.example : '';

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
    const topicSeeds = this.pickTopicSeeds(genre, 5).map((item: string) => `- ${item}`).join('\n');

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

PLATFORM DNA (BẮT BUỘC):
- ${PLATFORM_BLEND_RULE}
- Qidian: worldbuilding lớn, progression chắc
- Zongheng: conflict nhanh, nhịp mở đầu mạnh
- Faloo/BFALOO: high-concept, payoff sớm, cực hook

FALOO STYLE MẪU (THAM KHẢO CẤU TRÚC):
- "Ta Ở X: Khai Cục Y"
- "Trọng Sinh X: Khai Cục Y"
- "Bảo Ta X, Ta Lại Y?"
- "Toàn Dân X: Bắt Đầu Từ Y"
- "Ta Tại X Có Một Y"

TOPIC SEEDS (mở rộng chủ đề, chọn 1-2 seed/truyện):
${topicSeeds}

NHỊP CỐT TRUYỆN (ƯU TIÊN SƯỚNG VĂN MAINSTREAM):
- Mỗi truyện phải có payoff sớm trong mở đầu, tránh dìm cảm xúc quá lâu.
- Không để nhân vật chính bị ngược liên tục nhiều chương trong setup.
- Giữ mâu thuẫn hợp lý nhưng tỷ trọng cảm giác thắng thế phải cao hơn cảm giác bế tắc.
- Tránh nội dung phản cảm/lowbrow; giữ chất lượng đại chúng lâu dài.

MẪU TÊN TRUYỆN - Học từ webnovels HOT nhất:
• [Số Lớn]+[Cảnh Giới]: Vạn Cổ Thần Đế, Cửu Tinh Bá Thể Quyết → Epicness
• [Động Từ]+[Vũ Trụ]: Thôn Phệ Tinh Không (360M views), Già Thiên (450M) → Power
• [Bí Ẩn]+Chi+[Chủ]: Quỷ Bí Chi Chủ (9.4★ highest rated) → Mystery Hook
• [Nhân Vật]+Truyện: Phàm Nhân Tu Tiên Truyện (#1 all-time, 500M views) → Relatable
• [Nghề]+Thần: Tu La Vũ Thần, Siêu Thần Cơ Giới Sư → Identity
Lưu ý: 2-6 chữ, gợi tò mò, Hán-Việt cho tu tiên/huyền huyễn
Không dùng tên generic kiểu "Tân Truyện", "Câu Chuyện Của...", "Hành Trình Của..."

Mỗi truyện tự tạo 5-8 title candidates nội bộ, chọn 1 title tốt nhất để xuất JSON.

GOLDEN FINGER (BẮT BUỘC cho mỗi truyện):
Nhân vật chính PHẢI có ít nhất 1 lợi thế đặc biệt rõ ràng, ví dụ:
- Hệ thống sign-in / gacha / nhiệm vụ
- Kiến thức từ kiếp trước / tiên tri
- Kho tàng cổ đại / không gian tu luyện riêng
- Thiên phú/thể chất đặc biệt / huyết mạch thần bí

HOOK TECHNIQUES cho Description (học từ top novels):

1. Mystery Hook (诡秘之主 9.4★):
"蒸汽与机械的浪潮中，谁能触及非凡？历史和黑暗的迷雾里，又是谁在耳语？"
→ Đặt câu hỏi bí ẩn ngay đầu, gợi tò mò

2. Epic Scale (完美世界 9.2★):
"一粒尘可填海，一根草斩尽日月星辰，弹指间天翻地覆。"
→ Mở đầu với quy mô vũ trụ, sức mạnh phi thường

3. Shocking Event (斗破苍穹 8.9★):
"少年萧炎，自幼天赋异禀，可一夜之间却沦为废人。"
→ Sự kiện sốc, từ đỉnh cao xuống vực thẳm

4. Relatable Underdog (凡人修仙传 9.3★):
"一个普通山村少年，偶然进入江湖小门派，成为记名弟子。他资质平庸..."
→ Nhân vật bình thường, dễ đồng cảm

5. Time/Rebirth (万古神帝 8.7★):
"八百年前被杀死，八百年后重新活过来，却发现..."
→ Khoảng cách thời gian lớn, tạo drama

✨ Description Structure (250-500 chữ):
Câu 1: Hook (mystery/epic/shock)
Câu 2-3: Bối cảnh thế giới + quy tắc
Câu 4-5: Nhân vật chính + xuất thân + golden finger
Câu 6-7: Xung đột chính + mục tiêu
Câu cuối: Teaser "Liệu anh ta có thể...?" (NO spoil kết cục)

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

  private validateNovelIdeas(parsed: unknown, requiredKey?: string): NovelIdea[] {
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is Record<string, unknown> => this.isObjectRecord(item) && !!item.title && !!item.premise)
      .map((item) => {
        const requiredValue = requiredKey && item[requiredKey] ? String(item[requiredKey]).trim() : undefined;

        return {
          title: String(item.title).trim(),
          premise: String(item.premise).trim(),
          mainCharacter: String(item.mainCharacter || this.randomMCName()).trim(),
          mainCharacterProfile: item.mainCharacterProfile ? String(item.mainCharacterProfile).trim() : undefined,
          description: item.description ? String(item.description).trim() : undefined,
          shortSynopsis: item.shortSynopsis ? String(item.shortSynopsis).trim() : undefined,
          worldDescription: item.worldDescription ? String(item.worldDescription).trim() : undefined,
          requiredFieldKey: requiredKey,
          requiredFieldValue: requiredValue,
          coverPrompt: item.coverPrompt ? String(item.coverPrompt).trim() : undefined,
        };
      });
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
      const novelRows: NovelInsertRow[] = [];
      const projectRows: ProjectInsertRow[] = [];

      for (let i = batch; i < batchEnd; i++) {
        const authorIdx = Math.floor(i / novelsPerAuthor);
        const authorId = authorIds[authorIdx];
        const { genre, idea } = allIdeas[i];

        const novelId = randomUUID();
        const projectId = randomUUID();
        const totalChapters = this.randomInt(minChapters, maxChapters);

        const requiredKey =
          idea.requiredFieldKey || this.getGenreConfigEntry(genre)?.requiredFields?.[0];
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

        const projectRow: ProjectInsertRow = {
          id: projectId,
          user_id: this.userId,
          novel_id: novelId,
          genre,
          main_character: idea.mainCharacter,
          world_description: this.formatWorldDescription(idea),
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
    }

    return totalActivated;
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Format the user-facing novel description.
   * Only includes the intro paragraph + short synopsis.
   * Metadata (characters, world, system) is stored in ai_story_projects, not shown to readers.
   */
  private formatNovelDescription(idea: NovelIdea): string {
    const blocks: string[] = [];

    const intro = (idea.description || idea.premise || '').trim();
    if (intro) blocks.push(intro);

    const shortSynopsis = (idea.shortSynopsis || '').trim();
    if (shortSynopsis && shortSynopsis !== intro) blocks.push(shortSynopsis);

    return blocks.filter(Boolean).join('\n\n');
  }

  /**
   * Build a rich world_description for ai_story_projects (internal, not shown to users).
   * Includes character profiles, world details, and genre-specific systems.
   */
  private formatWorldDescription(idea: NovelIdea): string {
    const blocks: string[] = [];

    const world = (idea.worldDescription || '').trim();
    if (world) blocks.push(world);

    const mcProfile = (idea.mainCharacterProfile || '').trim();
    if (mcProfile) blocks.push(`Nhân vật chính: ${idea.mainCharacter} — ${mcProfile}`);

    const systemKey = (idea.requiredFieldKey || '').trim();
    const systemVal = (idea.requiredFieldValue || '').trim();
    if (systemKey && systemVal) {
      const label = systemKey.replace(/_/g, ' ');
      blocks.push(`${label}: ${systemVal}`);
    }

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

  private pickTopicSeeds(genre: string, count: number): string[] {
    const pool = SOURCE_TOPIC_SEEDS[genre] || [];
    if (pool.length <= count) return pool;
    return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
  }

  private buildFallbackTitle(genre: string, seed: number): string {
    const prefixByGenre: Record<string, string[]> = {
      'tien-hiep': ['Vạn Cổ', 'Cửu Thiên', 'Nghịch Thiên', 'Đế Tôn'],
      'huyen-huyen': ['Quỷ Bí', 'Thần Vực', 'Huyền Môn', 'Vạn Linh'],
      'do-thi': ['Nghịch Tập', 'Đỉnh Lưu', 'Ẩn Long', 'Thương Vương'],
      'khoa-huyen': ['Mạt Nhật', 'Tinh Hải', 'Cơ Giáp', 'Dị Biến'],
      'lich-su': ['Loạn Thế', 'Quyền Thần', 'Đại Tần', 'Mưu Triều'],
      'dong-nhan': ['Xuyên Thư', 'Phản Diện', 'Canon Phá Cục', 'Đa Vũ Trụ'],
      'vong-du': ['Toàn Chức', 'Siêu Thần', 'Vô Hạn', 'Đăng Nhập'],
    };
    const suffixByGenre: Record<string, string[]> = {
      'tien-hiep': ['Thần Đế', 'Kiếm Chủ', 'Tiên Tôn', 'Bất Diệt'],
      'huyen-huyen': ['Chi Chủ', 'Ma Tôn', 'Thánh Vương', 'Cấm Điển'],
      'do-thi': ['Toàn Năng', 'Chiến Thần', 'Trùm Đô Thị', 'Siêu Cấp'],
      'khoa-huyen': ['Thủ Lĩnh', 'Khai Hoang', 'Sinh Tồn', 'Cơ Giới Sư'],
      'lich-su': ['Ký', 'Đại Nghiệp', 'Tranh Bá', 'Hưng Triều'],
      'dong-nhan': ['Nghịch Kịch Bản', 'Chi Lộ', 'Phản Công', 'Bẻ Canon'],
      'vong-du': ['Cao Thủ', 'Chí Tôn', 'Vương Giả', 'Truyền Thuyết'],
    };

    const prefixes = prefixByGenre[genre] || ['Chí Tôn'];
    const suffixes = suffixByGenre[genre] || ['Truyền Kỳ'];
    const prefix = prefixes[seed % prefixes.length];
    const suffix = suffixes[Math.floor(seed / Math.max(1, prefixes.length)) % suffixes.length];
    return `${prefix} ${suffix}`.trim();
  }

  private createFallbackIdea(genre: string, seed: number): NovelIdea {
    const mainCharacter = this.randomMCName();
    const title = this.buildFallbackTitle(genre, seed);
    const requiredFieldKey = this.getGenreConfigEntry(genre)?.requiredFields?.[0];
    const requiredFieldValue = this.getFallbackRequiredValue(genre, requiredFieldKey);

    return {
      title,
      premise: `${mainCharacter} vô tình bước vào một biến cố thay đổi vận mệnh và phải lớn mạnh để sinh tồn.`,
      mainCharacter,
      mainCharacterProfile: `${mainCharacter} là nhân vật kiên định, có mục tiêu rõ ràng và tiềm năng bứt phá khi gặp nghịch cảnh.`,
      description: `${mainCharacter} khởi đầu trong hoàn cảnh bất lợi nhưng dần khám phá quy luật ẩn giấu của thế giới. Chuỗi thử thách liên tục đẩy nhân vật tới giới hạn, buộc phải lựa chọn giữa an toàn và đột phá.`,
      shortSynopsis: `${mainCharacter} dùng ý chí và cơ duyên để vươn lên giữa thế giới đầy cạnh tranh.`,
      worldDescription: `Một thế giới phân tầng quyền lực, nơi kẻ mạnh định đoạt cục diện và mọi quyết định đều có cái giá tương xứng.`,
      requiredFieldKey,
      requiredFieldValue,
      coverPrompt: this.buildCoverPrompt(title, genre, `${mainCharacter} rises in a dangerous world with escalating conflict.`),
    };
  }

  private getFallbackRequiredValue(genre: string, requiredKey?: string): string {
    if (!requiredKey) return '';

    const example = this.getGenreConfigEntry(genre)?.example;
    if (example) return example;

    const fallbackByKey: Record<string, string> = {
      cultivation_system: 'Luyện Khí -> Trúc Cơ -> Kim Đan -> Nguyên Anh -> Hóa Thần -> Luyện Hư -> Hợp Thể',
      magic_system: 'Học Đồ -> Pháp Sư -> Đại Pháp Sư -> Ma Đạo Sư -> Hiền Giả -> Truyền Kỳ',
      game_system: 'Leveling, class progression, skill tree, guild wars, dungeon ranking',
      modern_setting: 'Đô thị hiện đại với cạnh tranh tài nguyên, truyền thông và thế lực ngầm',
      tech_level: 'Kỷ nguyên AI và công nghệ nano phổ cập trong đời sống',
      historical_period: 'Thời kỳ phong kiến loạn thế với tranh đoạt giữa các chư hầu',
      original_work: 'Thế giới gốc được mở rộng với tuyến nhân vật và nhánh sự kiện mới',
    };

    return fallbackByKey[requiredKey] || `Core ${requiredKey.replace(/_/g, ' ')}`;
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
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
