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
    // Original 12
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
    // New 18
    'gacha summoning',
    'crafting system',
    'pet evolution',
    'guild building',
    'player vs player arena',
    'hidden class unlock',
    'skill fusion mechanics',
    'achievement shop',
    'daily login bonuses',
    'event dungeons',
    'world boss raids',
    'skill tree customization',
    'auto-battle system',
    'reincarnation prestige',
    'breakthrough bottleneck',
    'VIP privilege levels',
    'seasonal rankings',
    'cross-server competition',
  ],
  'urban-modern': [
    // Original 12
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
    // New 18
    'e-sports prodigy',
    'streaming celebrity',
    'app startup founder',
    'food critic empire',
    'fashion designer',
    'underground racing',
    'auction house',
    'bodyguard protection',
    'private detective',
    'social media influencer',
    'cryptocurrency trading',
    'talent agency',
    'nightclub owner',
    'martial arts school',
    'gym fitness coach',
    'esports team manager',
    'bar musician',
    'luxury car dealer',
  ],
  romance: [
    // Original 12
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
    // New 18
    'contract marriage',
    'forced proximity',
    'bodyguard romance',
    'teacher/student (adult)',
    'rival to lovers',
    'amnesia romance',
    'pregnancy surprise',
    'single parent romance',
    'age gap romance',
    'roommate romance',
    'workplace rivals',
    'online to offline',
    'time travel romance',
    'reincarnated lovers',
    'soul mates destiny',
    'love after divorce',
    'enemies with benefits',
    'matchmaking gone wrong',
  ],
  'huyen-huyen': [
    // Original 12
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
    // New 18
    'spirit fusion',
    'rune engraving',
    'summoning contracts',
    'curse breaking',
    'prophecy fulfillment',
    'parallel universe',
    'memory inheritance',
    'devouring evolution',
    'puppet mastery',
    'illusion domain',
    'karma manipulation',
    'fate defying',
    'void cultivation',
    'primordial chaos',
    'dragon ancestry',
    'phoenix rebirth',
    'titan bloodline',
    'ancient relic fusion',
  ],
  'action-adventure': [
    // Original 12
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
    // New 18
    'jungle expedition',
    'desert survival',
    'mountain climbing',
    'ocean exploration',
    'artifact retrieval',
    'rescue mission',
    'heist planning',
    'race against time',
    'wilderness tracking',
    'urban parkour',
    'demolition expert',
    'hostage negotiation',
    'weapons master',
    'tactical planning',
    'survival instructor',
    'extreme sports',
    'death-defying stunts',
    'vigilante justice',
  ],
  historical: [
    // Original 12
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
    // New 18
    'strategist advisor',
    'physician healing',
    'inventor innovation',
    'poet scholar',
    'warlord conquest',
    'eunuch power',
    'empress dowager',
    'princess marriage alliance',
    'courtier rivalry',
    'tax reform',
    'famine crisis',
    'plague outbreak',
    'foreign invasion',
    'naval warfare',
    'silk road trade',
    'monastery secrets',
    'noble family decline',
    'peasant uprising',
  ],
  'tien-hiep': [
    // Original 12
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
    // New 18
    'dao comprehension',
    'inner demon tribulation',
    'spirit root awakening',
    'immortal artifact forging',
    'buddhist enlightenment',
    'demonic path cultivation',
    'righteous sect alliance',
    'forbidden technique mastery',
    'celestial beast contract',
    'void traversal',
    'karma cleansing',
    'soul splitting',
    'mortal realm guardian',
    'immortal world ascension',
    'jade palace invitation',
    'heavenly dao defiance',
    'chaotic body physique',
    'primordial scripture',
  ],
  'sci-fi-apocalypse': [
    // Original 12
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
    // New 18
    'cyborg enhancement',
    'terraforming planets',
    'wormhole navigation',
    'quantum computing',
    'nano-tech healing',
    'bio-weapon threat',
    'android rebellion',
    'space station siege',
    'asteroid mining',
    'dimensional rift',
    'cryogenic awakening',
    'military exosuit',
    'interstellar war',
    'resource scarcity',
    'mutant evolution',
    'underground bunker',
    'radiation zones',
    'last human colony',
  ],
  'horror-mystery': [
    // Original 12
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
    // New 18
    'possession exorcism',
    'time loop horror',
    'doppelganger mystery',
    'memory manipulation',
    'reality distortion',
    'forbidden ritual',
    'ancient curse',
    'nightmare realm',
    'mind reading terror',
    'disappearing people',
    'isolated mansion',
    'dark family secret',
    'vengeful spirit',
    'eldritch abomination',
    'sanity erosion',
    'death game',
    'parallel dimension horror',
    'forbidden knowledge',
  ],
};

// Protagonist archetypes (30 total - expanded for diversity)
const PROTAGONIST_ARCHETYPES = [
  // Original 12
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
  
  // New 18 (added for variety)
  'body-swapped modern person',           // Hiện đại xuyên vào cổ đại
  'villain turned hero',                  // Phản diện hối cải
  'assassin seeking redemption',          // Sát thủ tẩy trắng
  'merchant building empire',             // Thương nhân xây đế chế
  'chef with god-tier cooking',           // Đầu bếp thần cấp
  'doctor saving worlds',                 // Bác sĩ cứu thế
  'librarian with forbidden knowledge',   // Thủ thư tri thức cấm
  'musician with soul power',             // Nhạc công linh hồn
  'crafter mastering artifacts',          // Thợ thủ công tạo thần khí
  'beast whisperer tamer',                // Người thuần thú
  'dungeon creator architect',            // Người tạo ngục tối
  'time loop survivor',                   // Người sống sót vòng lặp
  'cursed immortal',                      // Bất tử bị nguyền
  'necromancer with ethics',              // Pháp sư tử linh có đạo đức
  'AI in human body',                     // AI trong thân người
  'parallel world jumper',                // Người nhảy thế giới song song
  'dream architect manipulator',          // Kiến trúc sư giấc mơ
  'karma debt collector',                 // Người thao túng nhân quả
];

// Antagonist types (30 total - expanded for diversity)
const ANTAGONIST_TYPES = [
  // Original 12
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
  
  // New 18 (added for variety)
  'former ally betrayer',                 // Đồng minh phản bội
  'obsessed collector',                   // Kẻ sưu tập ám ảnh
  'cult leader prophet',                  // Giáo chủ tà giáo
  'rogue AI system',                      // AI nổi loạn
  'time paradox entity',                  // Thực thể nghịch lý thời gian
  'dimension invader',                    // Kẻ xâm lược chiều không gian
  'corrupted hero mirror',                // Anh hùng sa đọa (mirror của MC)
  'vengeful ghost spirit',                // Oan hồn báo thù
  'greedy merchant guild',                // Hội thương nhân tham lam
  'mad scientist experimenter',           // Nhà khoa học điên
  'parasite entity',                      // Thực thể ký sinh
  'false prophet manipulator',            // Tiên tri giả
  'puppeteer noble',                      // Quý tộc điều khiển bù nhìn
  'plague spreader fanatic',              // Kẻ phát tán dịch bệnh
  'reality warper',                       // Người bẻ cong thực tại
  'hive mind collective',                 // Ý thức tập thể
  'doppelganger clone',                   // Bản sao của MC
  'fate manipulator weaver',              // Kẻ thao túng vận mệnh
];

const PLATFORM_TITLE_DNA = {
  qidian: 'scale lớn, cảnh giới mạnh, power fantasy rõ ràng',
  zongheng: 'xung đột nhanh, vào việc sớm, motif sắc gọn',
  faloo: 'nhịp cực nhanh, high-concept + golden finger rõ ngay premise + payoff sớm',
};

const FALOO_TITLE_PATTERNS = [
  '人在X：开局Y -> "Ta Ở X: Khai Cục Y"',
  '重生X：开局Y -> "Trọng Sinh X: Khai Cục Y"',
  '让你X，你却Y？ -> "Bảo X, Ngươi Lại Y?"',
  '全民X：从Y开始 -> "Toàn Dân X: Bắt Đầu Từ Y"',
  '我在X有座Y -> "Ta Tại X Có Một Y"',
];

const PLATFORM_TOPIC_POOLS: Record<FactoryGenre, string[]> = {
  'system-litrpg': [
    'đăng nhập vô hạn + mở kho kỹ năng',
    'phó bản quốc chiến liên server',
    'mở lãnh địa, xây quân đoàn NPC',
    'thức tỉnh class ẩn sau khi bị kick guild',
    'game thực tế ảo trộn thế giới thật',
    'hệ thống đổi nghề theo boss bị săn',
    'võng du hòa vào hiện thực sau bản vá tận thế',
    'toàn dân chuyển chức, nghề ẩn mở khóa từ nhiệm vụ cấm',
    'mở tiệm net chiến thuật huấn luyện người chơi top server',
    'kinh tế game thao túng chợ đấu giá liên server',
    'săn boss biển sâu đổi thần trang',
  ],
  'urban-modern': [
    'streamer nghèo thành ông trùm truyền thông',
    'thương chiến AI + data monopoly',
    'phá án đô thị bằng năng lực đọc vi biểu cảm',
    'đạo diễn web drama thành vua phòng vé',
    'từ shipper thành chủ chuỗi logistics',
    'giới tài phiệt đấu ngầm bằng quỹ đầu tư',
    'mở vườn nông nghiệp công nghệ cao và đế chế thực phẩm',
    'đi biển bắt hải sản thành ông trùm chuỗi đông lạnh',
    'lên núi săn thú hợp pháp kết hợp livestream sinh tồn',
    'mở tiệm net cũ nát thành trung tâm esports quốc dân',
    'tận thế đô thị: vận hành khu an toàn như công ty',
    'kinh doanh nhượng quyền từ một cửa hàng ven đường',
  ],
  romance: [
    'hợp đồng hôn nhân + đấu trí gia tộc',
    'trùng sinh trả thù rồi rơi vào tình yêu',
    'cặp oan gia làm nội dung viral cùng nhau',
    'tổng tài giả nghèo và bác sĩ thiên tài',
    'cứu rỗi hai chiều sau ly hôn',
    'tình yêu xuyên sách với cơ chế nhiệm vụ',
  ],
  'huyen-huyen': [
    'huyết mạch cổ thần thức tỉnh tầng tầng',
    'học viện ma pháp + chiến tranh chủng tộc',
    'khắc văn cấm thuật + rèn hồn binh',
    'đảo nổi bầu trời và hành trình săn relic',
    'khế ước thú thần nhiều hệ',
    'điều khiển vận mệnh bằng nhân quả thuật',
    'mở tiệm net ma pháp mô phỏng chiến trường cổ thần',
    'trang trại ma dược và thương hội xuyên đế quốc',
    'thợ săn ma thú rừng sâu xây đội săn cấp quốc gia',
  ],
  'action-adventure': [
    'đột kích tàn tích cổ + tranh đoạt bản đồ',
    'đội đặc nhiệm phản khủng toàn cầu',
    'siêu trộm lập tổ đội heist',
    'đấu trường ngầm sinh tồn có livestream',
    'truy sát qua sa mạc và hải cảng',
    'chiến dịch giải cứu con tin cấp quốc gia',
  ],
  historical: [
    'hàn môn sĩ tử khuấy triều đình',
    'thương lộ tơ lụa và chiến tranh thuế',
    'nữ quân sư đảo chiều quốc vận',
    'xây thành phòng thủ biên cương từ con số 0',
    'thái y dùng y thuật phá cục chính trị',
    'tranh ngôi kèm mưu cục nhiều tầng',
    'kinh doanh thương hội từ chợ huyện đến kinh thành',
    'đi biển mở tuyến hải thương và cảng tự trị',
    'thợ săn miền núi gây dựng thế lực biên cương',
    'xuyên thời gian mở tiệm net chiến cờ cho võ tướng',
  ],
  'tien-hiep': [
    'phàm nhân mang ngọc giản cổ đế',
    'tông môn suy tàn được vực dậy bằng luyện đan',
    'bí cảnh thượng cổ + tranh đoạt truyền thừa',
    'độ kiếp liên hoàn và phản sát thiên kiêu',
    'song tu chính tà, một thân hai đạo',
    'từ hạ giới phi thăng rồi nghịch phạt tiên đình',
    'hồng hoang cổ vực, tranh thánh vị trước đại kiếp',
    'mở tông môn từ một đệ tử ngoại môn bị ruồng bỏ',
    'linh điền nông trại, trồng tiên dược để đổi cảnh giới',
    'đi biển săn yêu thú, cướp cơ duyên hải đảo',
    'mở tiệm net mô phỏng bí cảnh cho tu sĩ đột phá',
  ],
  'sci-fi-apocalypse': [
    'tận thế bug hệ thống + city bunker',
    'đội cơ giáp bảo vệ thuộc địa cuối cùng',
    'du hành sao với trí tuệ nhân tạo phản loạn',
    'dị biến gen khiến xã hội phân tầng mới',
    'khai hoang hành tinh bằng công nghệ nano',
    'vòng lặp thời gian trước ngày diệt vong',
    'võng du thực tế hóa qua thiết bị thần kinh toàn dân',
    'mở net-cafe VR thành trung tâm huấn luyện chiến binh',
    'kinh doanh công nghệ lõi giữa thời đại mạt thế',
    'đi biển săn tài nguyên trong đại dương ô nhiễm',
  ],
  'horror-mystery': [
    'thị trấn mất tích theo chu kỳ 13 ngày',
    'điều tra giáo phái với nghi thức cấm',
    'nhà trọ dị không gian và luật sống sót',
    'phòng chat đêm dự báo án mạng',
    'thám tử tâm linh truy vết ký ức giả',
    'bản sao doppelganger thay người thân',
  ],
};

const TITLE_POWER_WORDS = [
  'vạn', 'cửu', 'thập', 'thiên', 'thần', 'đế', 'thánh', 'chủ',
  'ma', 'kiếm', 'đạo', 'bá', 'vương', 'phá', 'nghịch', 'tuyệt',
  'vô', 'huyết', 'long', 'tu', 'kiếp', 'hệ thống', 'siêu', 'chí tôn',
];

const TITLE_WEAK_PATTERNS = [
  'tân truyện',
  'câu chuyện của',
  'hành trình của',
  'truyện về',
  'một ngày nọ',
];

export class IdeaBankService {
  private gemini: GeminiClient;
  private supabaseUrl: string;
  private supabaseKey: string;
  private qualityValidator?: import('./idea-quality-validator').IdeaQualityValidator;
  private uniquenessChecker?: import('./idea-uniqueness-checker').IdeaUniquenessChecker;

  constructor(options?: { 
    geminiClient?: GeminiClient; 
    supabaseUrl?: string; 
    supabaseKey?: string;
    enableQualityCheck?: boolean;
    enableUniquenessCheck?: boolean;
  }) {
    this.gemini = options?.geminiClient || getGeminiClient();
    this.supabaseUrl = options?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    this.supabaseKey = options?.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    // Initialize validators if enabled (default: true)
    if (options?.enableQualityCheck !== false) {
      import('./idea-quality-validator').then(module => {
        this.qualityValidator = new module.IdeaQualityValidator({
          geminiClient: this.gemini,
          threshold: 7.0,
        });
      });
    }
    
    if (options?.enableUniquenessCheck !== false) {
      import('./idea-uniqueness-checker').then(module => {
        this.uniquenessChecker = new module.IdeaUniquenessChecker({
          geminiClient: this.gemini,
          supabaseUrl: this.supabaseUrl,
          supabaseKey: this.supabaseKey,
          threshold: 0.85,
        });
      });
    }
  }

  private getSupabase() {
    return createClient(this.supabaseUrl, this.supabaseKey);
  }

  /**
   * Generate a single story idea for a genre
   */
  async generateIdea(input: IdeaGenerationPrompt): Promise<ServiceResult<StoryIdea>> {
    const { genre, avoid_similar_to, target_audience, include_tropes, exclude_tropes, special_instructions } = input;

    // Get random tropes for variety
    const genreTropes = GENRE_TROPES[genre] || [];
    const selectedTropes = this.selectRandomItems(genreTropes, 3);
    const protagonist = this.selectRandomItems(PROTAGONIST_ARCHETYPES, 1)[0];
    const antagonist = this.selectRandomItems(ANTAGONIST_TYPES, 1)[0];

    // Dedup: fetch existing titles for this genre to avoid repetition
    let existingTitles = avoid_similar_to || [];
    if (existingTitles.length === 0) {
      try {
        const supabase = this.getSupabase();
        const { data: existingNovels } = await supabase
          .from('novels')
          .select('title')
          .eq('genre', genre)
          .order('created_at', { ascending: false })
          .limit(20);
        if (existingNovels && existingNovels.length > 0) {
          existingTitles = existingNovels.map(n => n.title);
        }
      } catch {
        // Non-fatal: dedup is best-effort
      }
    }

    const prompt = this.buildIdeaPrompt({
      genre,
      tropes: include_tropes || selectedTropes,
      excludeTropes: exclude_tropes,
      protagonist,
      antagonist,
      targetAudience: target_audience || 'general',
      avoidSimilar: existingTitles.length > 0 ? existingTitles : undefined,
      specialInstructions: special_instructions,
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
    const normalizedTitle = this.normalizeTitle(generated.title);
    const title = this.upgradeTitleIfWeak(normalizedTitle, genre, include_tropes || selectedTropes);

    // Create StoryIdea object
    const idea: Omit<StoryIdea, 'id' | 'created_at'> = {
      genre,
      sub_genre: generated.sub_genre || null,
      title,
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
   * Generate a quality, unique story idea with auto-regeneration
   * This is the recommended method to use instead of generateIdea()
   * 
   * @param input - Idea generation parameters
   * @param options - Quality threshold and retry settings
   * @returns Story idea with quality_score field
   */
  async generateQualityUniqueIdea(
    input: IdeaGenerationPrompt,
    options?: {
      minQualityThreshold?: number;
      maxRetries?: number;
    }
  ): Promise<ServiceResult<StoryIdea & { quality_score: number }>> {
    const threshold = options?.minQualityThreshold || 7.0;
    const maxRetries = options?.maxRetries || 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // 1. Generate idea using existing method
      const result = await this.generateIdea(input);
      if (!result.success || !result.data) {
        console.log(`Attempt ${attempt}: Generation failed - ${result.error}`);
        continue;
      }

      const idea = result.data;

      // 2. Validate quality (if validator enabled)
      if (this.qualityValidator) {
        const quality = await this.qualityValidator.validate(idea);
        
        if (!quality.pass) {
          console.log(
            `Attempt ${attempt}: Quality too low (${quality.overall.toFixed(1)}/10). ` +
            `Issues: ${quality.issues.join(', ')}`
          );
          
          // Add feedback for next attempt
          const feedback = quality.suggestions.slice(0, 2).join('. '); // Top 2 suggestions
          input.special_instructions = feedback;
          continue;
        }

        // 3. Check uniqueness (if checker enabled)
        if (this.uniquenessChecker) {
          const uniqueness = await this.uniquenessChecker.checkUniqueness(idea, idea.genre);
          
          if (!uniqueness.unique) {
            console.log(
              `Attempt ${attempt}: Too similar to "${uniqueness.most_similar?.title}" ` +
              `(${((uniqueness.similarity_score || 0) * 100).toFixed(0)}% similar)`
            );
            
            // Avoid this title in next attempt
            input.avoid_similar_to = [
              ...(input.avoid_similar_to || []),
              uniqueness.most_similar?.title || '',
            ];
            continue;
          }
        }

        // Both quality and uniqueness passed!
        console.log(
          `✓ Attempt ${attempt}: Success! Quality: ${quality.overall.toFixed(1)}/10`
        );
        return {
          success: true,
          data: {
            ...idea,
            quality_score: quality.overall,
          },
        };
      }

      // If validators disabled, just return
      return {
        success: true,
        data: {
          ...idea,
          quality_score: 7.0, // Default if no validation
        },
      };
    }

    // Failed after max retries
    return {
      success: false,
      error: `Failed to generate quality unique idea after ${maxRetries} attempts`,
      errorCode: 'MAX_RETRIES_EXCEEDED',
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
        const result = await this.generateQualityUniqueIdea(
          {
            genre: genre as FactoryGenre,
          },
          {
            minQualityThreshold: 7.0,
            maxRetries: 3,
          }
        );

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
    specialInstructions?: string;
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

    const topicSeeds = this.selectRandomItems(PLATFORM_TOPIC_POOLS[params.genre] || [], 4);
    const platformDNA = [
      `- Qidian DNA: ${PLATFORM_TITLE_DNA.qidian}`,
      `- Zongheng DNA: ${PLATFORM_TITLE_DNA.zongheng}`,
      `- Faloo DNA: ${PLATFORM_TITLE_DNA.faloo}`,
    ].join('\n');
    const falooPatterns = FALOO_TITLE_PATTERNS.map((p) => `- ${p}`).join('\n');

    return `Bạn là chuyên gia sáng tạo ý tưởng webnovel tiếng Việt. Tạo một ý tưởng truyện mới và độc đáo.

THÔNG TIN:
- Thể loại: ${params.genre} (${genreDescriptions[params.genre]})
- Tropes cần có: ${params.tropes.join(', ')}
${params.excludeTropes ? `- Tránh tropes: ${params.excludeTropes.join(', ')}` : ''}
- Kiểu nhân vật chính: ${params.protagonist}
- Kiểu phản diện: ${params.antagonist}
- Đối tượng: ${params.targetAudience}
${params.avoidSimilar ? `- TRÁNH GIỐNG các truyện đã có: ${params.avoidSimilar.join(', ')}` : ''}
${params.specialInstructions ? `- CẢI THIỆN BẮT BUỘC: ${params.specialInstructions}` : ''}

PLATFORM BLEND (BẮT BUỘC ÁP DỤNG):
${platformDNA}
- Trộn theo tỉ lệ 50% Qidian + 30% Zongheng + 20% Faloo.
- KHÔNG copy tên truyện có thật; chỉ học nhịp, độ kích thích và cấu trúc hook.

FALOO TITLE PATTERNS (THAM KHẢO CẤU TRÚC):
${falooPatterns}

STYLE ƯU TIÊN (SƯỚNG VĂN MAINSTREAM):
- Nhịp nhanh: vào xung đột trong 1-2 đoạn đầu.
- Golden finger xuất hiện rõ ngay premise.
- Ít đau khổ kéo dài: KHÔNG để MC bị đè liên tiếp quá lâu.
- Mỗi 1-2 chương dự kiến phải có 1 payoff nhỏ (thu hoạch, tát mặt, tăng cấp, kiếm lợi).
- Vẫn giữ hợp lý nhân quả, không vô não; tránh gây phản cảm lowbrow.

TOPIC SEEDS (ưu tiên chọn 1-2 để phối):
- ${topicSeeds.join('\n- ')}

MẪU TÊN TRUYỆN HẤP DẪN - Học từ top webnovels Trung Quốc:

PATTERN 1: [Số Lớn] + [Cảnh Giới/Danh Hiệu] (Rating: 9.1★, Epicness + Time Span)
- 万古神帝 (Vạn Cổ Thần Đế) - 300M views, 8.7★
- 九星霸体诀 (Cửu Tinh Bá Thể Quyết) - 280M views, 8.8★
- 十方武圣 (Thập Phương Vũ Thánh) - 170M views, 8.9★
→ Dùng: Vạn/Thiên/Cửu/Thập + Cổ/Giới/Phương + Thần/Đế/Thánh/Tôn

PATTERN 2: [Động Từ Mạnh] + [Vật Thể Vũ Trụ] (Rating: 9.1★, Power + Ambition)
- 吞噬星空 (Thôn Phệ Tinh Không) - 360M views, 9.0★
- 遮天 (Già Thiên) - 450M views, 9.1★
- 斗破苍穹 (Đấu Phá Thương Khiêng) - 380M views, 8.9★
→ Dùng: Thôn Phệ/Trấn Áp/Lược Đoạt/Đấu Phá/Già + Tinh Không/Thiên/Thương Khiêng

PATTERN 3: [Cảnh Giới] ngắn 2-3 chữ (Rating: 8.8★, Direct + Memorable)
- 元尊 (Nguyên Tôn) - 270M views, 8.6★
- 圣墟 (Thánh Hư) - 240M views, 8.5★
→ Dùng: Đơn giản, súc tích, có chứa Thánh/Tôn/Đế/Tiên

PATTERN 4: [Từ Bí Ẩn] + 之 + [Chủ/Vương] (Rating: 9.4★, Mystery + Curiosity)
- 诡秘之主 (Quỷ Bí Chi Chủ) - 340M views, 9.4★
→ Dùng: Quỷ Bí/Cấm Kỵ/Ẩn Mật + Chi + Chủ/Vương

PATTERN 5: [Hệ Thống] + Feature (LitRPG)
- 超神机械师 (Siêu Thần Cơ Giới Sư) - 190M views, 9.0★
- 全职高手 (Toàn Chức Cao Thủ) - 320M views, 9.1★
→ Dùng: Ký Danh/Siêu Thần/Toàn Chức + Feature

PATTERN 6: [Thế Giới/Địa Điểm] + Ký/Truyện (World-building)
- 完美世界 (Hoàn Mỹ Thế Giới) - 420M views, 9.2★
- 牧神记 (Mục Thần Ký) - 250M views, 9.2★

PATTERN 7: [Nghề Nghiệp/Vai Trò] + Thần/Thánh (Rating: 8.9★)
- 修罗武神 (Tu La Vũ Thần) - 220M views, 8.4★
- 武炼巅峰 (Vũ Luyện Đỉnh Phong) - 210M views, 8.3★

PATTERN 8: [Nhân Vật] + Câu Chuyện (Character-focused)
- 凡人修仙传 (Phàm Nhân Tu Tiên Truyện) - 500M views, 9.3★ [#1 ALL-TIME]
- 我师兄实在太稳健了 (Sư Huynh Ta Thực Tại Quá Ổn Định) - 230M views, 9.3★

PATTERN 9: Unique/Urban Modern
- 大王饶命 (Đại Vương Nhiêu Mệnh) - 260M views, 9.0★
- 夜的命名术 (Dạ Đích Mệnh Danh Thuật) - 180M views, 9.2★

✨ LƯU Ý: 
- Tên ngắn (2-6 chữ) > Tên dài
- Dùng Hán-Việt cho tien-hiep/huyen-huyen (威严 + 古典)
- Dùng Việt thuần cho urban/romance (dễ nhớ + gần gũi)
- Phải gợi tò mò: "Vạn Cổ" = bao lâu? "Thôn Phệ" = ăn gì? "Quỷ Bí" = gì vậy?
- Tránh tên generic kiểu "Tân Truyện", "Câu Chuyện Của...", "Hành Trình Của...".
- Tên phải tạo cảm giác high-stakes hoặc bí ẩn ngay khi đọc.
- Tạo nội bộ 5-8 title candidates rồi chọn 1 title mạnh nhất để xuất JSON.

GOLDEN FINGER (BẮT BUỘC):
Nhân vật chính PHẢI có ít nhất 1 "golden finger" (lợi thế đặc biệt) rõ ràng:
- Hệ thống sign-in (điểm danh hàng ngày nhận thưởng)
- Kiến thức từ kiếp trước / tương lai
- Hệ thống gacha / rút thưởng
- Kho tàng cổ đại / di sản bí ẩn
- Không gian tu luyện riêng (time dilation)
- Thiên phú đặc biệt (mắt thần, thể chất đặc biệt)
- Hệ thống nhiệm vụ / thành tựu
→ Golden finger phải xuất hiện rõ ràng trong premise và hook!

PREMISE & HOOK EXAMPLES - Học từ top CN webnovels (chỉ tham khảo cấu trúc, KHÔNG copy):

1. UNDERDOG (凡人修仙传 9.3★, 500M views)
   Premise: "Thiếu niên làng nghèo tư chất tầm thường vô tình gia nhập tiểu môn phái tu tiên. 
   Không có thiên phú, chỉ nhờ cẩn thận + chăm chỉ mà từng bước vươn lên."
   Hook: "Làng Thanh Ngưu, thiếu niên được chọn vào thử nghiệm môn phái. Đêm đầu tiên, 
   cậu uống nhầm chai dược dịch bí ẩn..."
   Why it works: Relatable + clear progression + mystery element

2. REBIRTH (万古神帝 8.7★, 300M views)
   Premise: "800 năm trước bị fiancée giết hại, 800 năm sau tỉnh lại. Người giết anh đã 
   thành nữ hoàng thống nhất thiên hạ."
   Hook: "Ngọn kiếm xuyên qua ngực. Anh nhìn khuôn mặt quen thuộc đang cầm kiếm: 
   'Công chúa... vì sao...?'"
   Why it works: Time gap + betrayal + power imbalance = strong motivation

3. COMEDY SYSTEM (大王饶命 9.0★, 260M views)
   Premise: "Thời đại linh khí phục hồi, phát hiện mình có hệ thống thu thập cảm xúc tiêu 
   cực của người khác để rút thưởng."
   Hook: "Kỳ thi giác tỉnh, xếp hạng F. Người khác chế giễu. Hệ thống: 'Cảm xúc tiêu cực +99!'"
   Why it works: Unique system + comedy + clear mechanic

✨ STRUCTURE TO FOLLOW:
- Premise = Situation (1 câu) + Golden Finger (1 câu) + Goal (1 câu)  
- Hook = Visual scene + Immediate problem + Curiosity gap
- KHÔNG spoil ending, chỉ tease hành trình

YÊU CẦU:
1. Tên truyện PHẢI hấp dẫn, gợi tò mò, đúng pattern trên
2. Premise phải rõ ràng xung đột chính + golden finger
3. Hook phải cuốn hút ngay từ chương 1 — có sự kiện sốc hoặc bất ngờ
4. USP — điều gì khác biệt so với hàng nghìn truyện cùng thể loại?
5. Tags và tropes phù hợp thể loại

OUTPUT JSON (chỉ JSON, không markdown):
{
  "title": "Tên truyện hấp dẫn (theo pattern trên)",
  "sub_genre": "phân nhánh thể loại nếu có",
  "premise": "Mô tả tiền đề + golden finger rõ ràng (2-3 câu)",
  "hook": "Mô tả mở đầu cuốn hút với sự kiện sốc (chương 1-3)",
  "usp": "Điểm độc đáo - tại sao reader nên đọc truyện này?",
  "protagonist_archetype": "Kiểu nhân vật chính",
  "antagonist_type": "Kiểu phản diện",
  "setting_type": "Bối cảnh (thế giới tu tiên, đô thị hiện đại, v.v.)",
  "power_system_type": "Hệ thống sức mạnh / golden finger",
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

  private normalizeTitle(rawTitle: string): string {
    return (rawTitle || '')
      .trim()
      .replace(/^['"“”‘’\s]+|['"“”‘’\s]+$/g, '')
      .replace(/\s+/g, ' ');
  }

  private scoreTitle(title: string): number {
    if (!title) return 0;
    const cleaned = title.toLowerCase();
    const words = cleaned.split(/\s+/).filter(Boolean);
    let score = 0;

    if (words.length >= 2 && words.length <= 7) score += 3;
    else if (words.length <= 10) score += 1;

    if (TITLE_POWER_WORDS.some((kw) => cleaned.includes(kw))) score += 2;
    if (/[?!]|chi\s+chủ|hệ\s+thống|vạn|cửu|thập|thôn\s+phệ|quỷ\s+bí/i.test(title)) score += 2;
    if (/[：:]/.test(title)) score += 1;
    if (/khai cục|bắt đầu|trọng sinh|toàn dân|ta tại/i.test(cleaned)) score += 1;

    if (TITLE_WEAK_PATTERNS.some((p) => cleaned.includes(p))) score -= 4;
    if (/^[a-z0-9\s-]+$/i.test(title) && !/[A-ZÀ-Ỹ]/.test(title)) score -= 1;

    return Math.max(0, Math.min(10, score));
  }

  private upgradeTitleIfWeak(title: string, genre: FactoryGenre, tropes: string[]): string {
    if (this.scoreTitle(title) >= 6) return title;

    const trope = (tropes[0] || '').split(' ')[0] || 'Hệ Thống';
    const replacements: Record<FactoryGenre, string[]> = {
      'system-litrpg': ['Siêu Thần', 'Toàn Chức', 'Ký Danh', 'Vô Hạn'],
      'urban-modern': ['Đỉnh Lưu', 'Thương Vương', 'Ẩn Long', 'Nghịch Tập'],
      romance: ['Cưng Chiều', 'Nghịch Tập Tình Yêu', 'Hôn Ước', 'Tái Ngộ'],
      'huyen-huyen': ['Quỷ Bí', 'Thần Vực', 'Huyền Môn', 'Vạn Linh'],
      'action-adventure': ['Sinh Tử Cục', 'Truy Sát', 'Đại Chiến', 'Tử Đấu'],
      historical: ['Quyền Thần', 'Loạn Thế', 'Đại Tần', 'Mưu Triều'],
      'tien-hiep': ['Vạn Cổ', 'Cửu Thiên', 'Đế Tôn', 'Nghịch Thiên'],
      'sci-fi-apocalypse': ['Mạt Nhật', 'Tinh Hải', 'Cơ Giáp', 'Dị Biến'],
      'horror-mystery': ['Quỷ Dị', 'Cấm Kỵ', 'Dạ Hành', 'Án Mệnh'],
    };

    const pool = replacements[genre] || ['Chí Tôn'];
    const prefix = this.selectRandomItems(pool, 1)[0];
    const suffix = trope.charAt(0).toUpperCase() + trope.slice(1);
    const patternByGenre: Record<FactoryGenre, string[]> = {
      'system-litrpg': [`Toàn Dân Chuyển Chức: ${prefix} ${suffix}`, `Ta Tại Game: Khai Cục ${prefix}`],
      'urban-modern': [`Trọng Sinh Đô Thị: Khai Cục ${prefix}`, `Bảo Ta Khởi Nghiệp, Ta Lại ${prefix}?`],
      romance: [`Trọng Sinh Tình Trường: Khai Cục ${prefix}`, `Ta Tại Hào Môn: ${prefix} ${suffix}`],
      'huyen-huyen': [`Ta Tại Huyền Huyễn: Khai Cục ${prefix}`, `${prefix} Chi Chủ`],
      'action-adventure': [`Ta Tại Tử Cục: Khai Cục ${prefix}`, `${prefix} Sinh Tử Cục`],
      historical: [`Trọng Sinh Loạn Thế: Khai Cục ${prefix}`, `Ta Tại Cổ Đại: ${prefix} ${suffix}`],
      'tien-hiep': [`Ta Tại Tiên Hiệp: Khai Cục ${prefix}`, `${prefix} ${suffix}`],
      'sci-fi-apocalypse': [`Tận Thế Giáng Lâm: Khai Cục ${prefix}`, `Ta Tại Mạt Thế: ${prefix} ${suffix}`],
      'horror-mystery': [`Ta Tại Quỷ Vực: Khai Cục ${prefix}`, `${prefix} Án Mệnh`],
    };

    const candidates = patternByGenre[genre] || [`${prefix} ${suffix}`];
    return this.selectRandomItems(candidates, 1)[0].trim();
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
