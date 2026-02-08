/**
 * Story Factory - Công xưởng truyện AI quy mô lớn
 * Orchestrates việc viết hàng trăm đầu truyện cùng lúc
 */

import {
  StoryIdea,
  StoryBlueprint,
  ProductionBatch,
  ProductionJob,
  GenreType,
  StoryFactoryConfig,
  FactoryEvent,
  QualityReport
} from './types';
import { BlueprintGenerator } from './blueprint-generator';
import { ProductionPipeline, BatchManager, createProductionPipeline } from './production-pipeline';
import { GENRE_TEMPLATES, getGenreTemplate } from './genre-templates';

/**
 * Idea Generator - Tự động tạo ý tưởng truyện mới
 */
export class IdeaGenerator {
  private usedPremises: Set<string> = new Set();

  /**
   * Generate random story ideas based on genre
   */
  generateIdeas(genre: GenreType, count: number): StoryIdea[] {
    const template = getGenreTemplate(genre);
    const ideas: StoryIdea[] = [];

    const premises = this.getPremisesForGenre(genre);
    const hooks = this.getHooksForGenre(genre);
    const usps = this.getUSPsForGenre(genre);

    for (let i = 0; i < count; i++) {
      // Pick unique premise
      let premise = premises[Math.floor(Math.random() * premises.length)];
      let attempts = 0;
      while (this.usedPremises.has(premise) && attempts < 10) {
        premise = premises[Math.floor(Math.random() * premises.length)];
        attempts++;
      }
      this.usedPremises.add(premise);

      // Generate unique title
      const title = this.generateTitle(genre, premise);

      ideas.push({
        id: `idea_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
        title,
        premise,
        genre,
        subGenres: this.getRandomSubGenres(genre, 2),
        tags: this.getRandomTags(genre, 5),
        hooks: this.selectRandom(hooks, 3),
        targetAudience: genre === 'do-thi' ? 'male' : 'both',
        estimatedChapters: this.getEstimatedChapters(genre),
        uniqueSellingPoint: usps[Math.floor(Math.random() * usps.length)],
        createdAt: new Date(),
        usedCount: 0
      });
    }

    return ideas;
  }

  /**
   * Generate ideas by mixing genres
   */
  generateMashupIdeas(genreA: GenreType, genreB: GenreType, count: number): StoryIdea[] {
    const ideas: StoryIdea[] = [];

    for (let i = 0; i < count; i++) {
      const premise = this.createMashupPremise(genreA, genreB);
      const title = this.generateTitle(genreA, premise);

      ideas.push({
        id: `mashup_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
        title,
        premise,
        genre: genreA, // Primary genre
        subGenres: [genreB, ...this.getRandomSubGenres(genreA, 1)],
        tags: [...this.getRandomTags(genreA, 3), ...this.getRandomTags(genreB, 2)],
        hooks: this.getMashupHooks(genreA, genreB),
        targetAudience: 'both',
        estimatedChapters: 300,
        uniqueSellingPoint: `Kết hợp độc đáo giữa ${genreA} và ${genreB}`,
        createdAt: new Date(),
        usedCount: 0
      });
    }

    return ideas;
  }

  private getPremisesForGenre(genre: GenreType): string[] {
    const premises: Record<string, string[]> = {
      'tien-hiep': [
        'Thiên tài bị phế tu vi, nhờ bí bảo thượng cổ trọng tu, một đường nghịch thiên',
        'Kẻ yếu nhất tông môn thức tỉnh thể chất hỗn độn, bắt đầu con đường vô địch',
        'Trọng sinh về 1000 năm trước, mang theo ký ức tương lai và hệ thống tu luyện',
        'Phế vật gia tộc được lão quái truyền thừa, từ đó bước lên đỉnh phong tu tiên giới',
        'Xuyên không thành phế vật, có hệ thống điểm kinh nghiệm, tu luyện như chơi game',
        'Tu sĩ hiện đại xuyên về thượng cổ, dùng kiến thức tương lai thay đổi lịch sử tu tiên',
        'Thiên tài kiếm đạo tái sinh trong thân thể phế vật, một kiếm phá vạn pháp',
        'Được thần bí cổ thụ nhận làm đệ tử, lĩnh ngộ vạn đạo tự nhiên'
      ],
      'do-thi': [
        'Binh vương trở về thành phố, tất cả kẻ từng coi thường đều phải quỳ gối',
        'Rể ở nhà vợ bị khinh thường, thực ra là đại thiếu gia ẩn giấu thân phận',
        'Sinh viên nghèo giác tỉnh hệ thống tỷ phú, từ đây thay đổi cuộc đời',
        'Bác sĩ bình thường thực ra là thần y ẩn thế, y thuật trị bách bệnh',
        'Thanh niên bình thường được thừa kế gia sản ngàn tỷ và sứ mệnh bí mật',
        'Cựu đặc chủng trở về, từ nay không ai có thể bắt nạt người thân của hắn',
        'Cao thủ võ thuật ẩn thế bị lôi kéo vào cuộc chiến các thế lực ngầm',
        'Thiên tài công nghệ phát minh hệ thống AI, từ đây thay đổi thế giới'
      ],
      'huyen-huyen': [
        'Thiếu niên giác tỉnh huyết mạch thần long thượng cổ, bước vào thế giới cường giả',
        'Phế vật được thần bí đại năng truyền thừa, từ đây tu luyện một đường thuận lợi',
        'Xuyên không đến thế giới huyền huyễn với hệ thống tạo vật phẩm vô hạn',
        'Thiên tài sa đọa sau khi trọng sinh có thêm khả năng nhìn thấu vạn vật',
        'Kẻ bị coi là rác rưởi thực ra mang trong mình linh hồn thượng cổ đại năng',
        'Thanh niên bình thường có được tháp thần bí, bên trong chứa vô số bảo vật'
      ],
      'mat-the': [
        'Trọng sinh về 3 ngày trước ngày tận thế, chuẩn bị cho đại họa sắp đến',
        'Giác tỉnh năng lực đặc biệt khi thế giới thay đổi, trở thành một trong những người mạnh nhất',
        'Xây dựng căn cứ từ zero trong thế giới đầy zombie và dị biến',
        'Thủ lĩnh nhỏ mang theo ký ức 10 năm sau, biết trước mọi nguy hiểm'
      ],
      'vong-du': [
        'Người chơi bình thường phát hiện bug thần cấp, trở thành tồn tại vô địch trong game',
        'Game bỗng trở thành thực, người chơi rank 1 phải sinh tồn trong thế giới game',
        'Được tặng tài khoản GM bí mật, từ đây làm mưa làm gió trong thế giới ảo',
        'Thực ra game là thế giới thật, người chơi là những kẻ xuyên không'
      ]
    };
    return premises[genre] || premises['tien-hiep'];
  }

  private getHooksForGenre(genre: GenreType): string[] {
    const hooks: Record<string, string[]> = {
      'tien-hiep': [
        'Hệ thống điểm kinh nghiệm',
        'Thể chất đặc biệt',
        'Ký ức tiền kiếp',
        'Bảo vật thượng cổ',
        'Linh thú đồng hành',
        'Không gian riêng',
        'Lão quái trong nhẫn'
      ],
      'do-thi': [
        'Thân phận bí ẩn',
        'Sức mạnh ẩn giấu',
        'Hệ thống hỗ trợ',
        'Gia sản khổng lồ',
        'Mỹ nữ vây quanh',
        'Siêu năng lực',
        'Quan hệ sâu rộng'
      ],
      'huyen-huyen': [
        'Huyết mạch thượng cổ',
        'Hệ thống nâng cấp',
        'Vũ khí thần cấp',
        'Không gian tu luyện',
        'Thiên phú vô song',
        'Truyền thừa bí mật'
      ]
    };
    return hooks[genre] || hooks['tien-hiep'];
  }

  private getUSPsForGenre(genre: GenreType): string[] {
    const usps: Record<string, string[]> = {
      'tien-hiep': [
        'Hệ thống tu luyện độc đáo chưa từng có',
        'Phát triển nhân vật sâu sắc và logic',
        'World building chặt chẽ và phong phú',
        'Chiến đấu bùng nổ và chiến lược',
        'Romance tinh tế không sến'
      ],
      'do-thi': [
        'Face-slap cực sảng, liên tục dopamine',
        'Xây dựng đế chế từ tay trắng',
        'Hậu cung đa dạng tính cách',
        'Kết hợp thực tế và fantasy',
        'Cốt truyện cuốn không thể dừng'
      ],
      'huyen-huyen': [
        'World building hoành tráng',
        'Hệ thống sức mạnh cân bằng',
        'Plot twist bất ngờ',
        'Nhân vật phụ sống động',
        'Kết hợp nhiều yếu tố hấp dẫn'
      ]
    };
    return usps[genre] || usps['tien-hiep'];
  }

  private generateTitle(genre: GenreType, premise: string): string {
    const prefixes: Record<string, string[]> = {
      'tien-hiep': ['Vô Thượng', 'Đế Tôn', 'Thần Hoang', 'Vạn Cổ', 'Thiên Đạo', 'Hỗn Độn', 'Bất Diệt', 'Vĩnh Hằng'],
      'do-thi': ['Đỉnh Cấp', 'Chí Tôn', 'Vô Song', 'Đô Thị', 'Siêu Cấp', 'Cực Phẩm', 'Thiên Vương'],
      'huyen-huyen': ['Thần Hoang', 'Vạn Giới', 'Đại Chúa Tể', 'Tối Cường', 'Vô Địch', 'Bất Bại']
    };

    const suffixes: Record<string, string[]> = {
      'tien-hiep': ['Chi Tôn', 'Chí Tôn', 'Đại Đế', 'Tiên Đế', 'Thiên Tử', 'Đế Quân', 'Chúa Tể'],
      'do-thi': ['Hệ Thống', 'Thiếu Gia', 'Cuồng Long', 'Vương Giả', 'Chí Tôn', 'Đại Nhân Vật'],
      'huyen-huyen': ['Đại Đế', 'Thần Vương', 'Chí Tôn', 'Chúa Tể', 'Đế Tôn', 'Bá Chủ']
    };

    const pre = prefixes[genre] || prefixes['tien-hiep'];
    const suf = suffixes[genre] || suffixes['tien-hiep'];

    return `${pre[Math.floor(Math.random() * pre.length)]} ${suf[Math.floor(Math.random() * suf.length)]}`;
  }

  private getRandomSubGenres(genre: GenreType, count: number): string[] {
    const subGenres: Record<string, string[]> = {
      'tien-hiep': ['Kiếm tu', 'Đan tu', 'Ma đạo', 'Chính đạo', 'Thể tu', 'Trận pháp'],
      'do-thi': ['Hệ thống', 'Dị năng', 'Võ thuật', 'Thương chiến', 'Cổ võ', 'Siêu nhiên'],
      'huyen-huyen': ['Dị thú', 'Ma pháp', 'Đấu khí', 'Huyết mạch', 'Nguyên tố', 'Hỗn độn']
    };
    const available = subGenres[genre] || subGenres['tien-hiep'];
    return this.selectRandom(available, Math.min(count, available.length));
  }

  private getRandomTags(genre: GenreType, count: number): string[] {
    const tags: Record<string, string[]> = {
      'tien-hiep': ['Trọng sinh', 'Hệ thống', 'Xuyên không', 'Nghịch thiên', 'Vô địch', 'Hậu cung', 'Nhiệt huyết', 'Face-slap'],
      'do-thi': ['Sảng văn', 'Tát mặt', 'Đại thiếu gia', 'Hệ thống', 'Dị năng', 'Binh vương', 'Hậu cung', 'Thương chiến'],
      'huyen-huyen': ['Huyền huyễn', 'Đấu khí', 'Ma pháp', 'Dị thú', 'Đế vương', 'Nghịch thiên', 'Thiên tài', 'Bùng nổ']
    };
    const available = tags[genre] || tags['tien-hiep'];
    return this.selectRandom(available, Math.min(count, available.length));
  }

  private getEstimatedChapters(genre: GenreType): number {
    const ranges: Record<string, [number, number]> = {
      'tien-hiep': [500, 1000],
      'do-thi': [300, 600],
      'huyen-huyen': [400, 800],
      'mat-the': [300, 500],
      'vong-du': [300, 600]
    };
    const range = ranges[genre] || [300, 500];
    return range[0] + Math.floor(Math.random() * (range[1] - range[0]));
  }

  private createMashupPremise(genreA: GenreType, genreB: GenreType): string {
    const mashups: Record<string, string> = {
      'tien-hiep_do-thi': 'Tu tiên giả ẩn giấu trong đô thị hiện đại, một tay tu luyện một tay làm chủ thương trường',
      'huyen-huyen_vong-du': 'Thế giới game trở thành thực, hệ thống sức mạnh của game kết hợp với ma pháp thực sự',
      'do-thi_mat-the': 'Thế giới hiện đại bỗng xuất hiện thảm họa, tổng tài ẩn giấu thân phận dẫn dắt nhân loại sinh tồn'
    };
    const key = `${genreA}_${genreB}`;
    const reverseKey = `${genreB}_${genreA}`;
    return mashups[key] || mashups[reverseKey] || `Kết hợp độc đáo giữa ${genreA} và ${genreB}`;
  }

  private getMashupHooks(genreA: GenreType, genreB: GenreType): string[] {
    return [
      ...this.selectRandom(this.getHooksForGenre(genreA), 2),
      ...this.selectRandom(this.getHooksForGenre(genreB), 1)
    ];
  }

  private selectRandom<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
}

/**
 * Story Factory - Main Class
 */
export class StoryFactory {
  private config: StoryFactoryConfig;
  private ideaGenerator: IdeaGenerator;
  private blueprintGenerator: BlueprintGenerator;
  private pipeline: ProductionPipeline;
  private batchManager: BatchManager;
  private eventHandlers: Array<(event: FactoryEvent) => Promise<void>> = [];

  constructor(config?: Partial<StoryFactoryConfig>) {
    this.config = {
      primaryProvider: 'gemini',
      maxWorkers: 10,
      workerTimeout: 300000, // 5 minutes
      minQualityScore: 7,
      autoRewriteThreshold: 5,
      defaultChaptersPerDay: 3,
      batchSize: 10,
      autoPublish: false,
      publishingConfigs: [],
      ...config
    };

    this.ideaGenerator = new IdeaGenerator();
    this.blueprintGenerator = new BlueprintGenerator();
    this.pipeline = createProductionPipeline(this.config);
    this.batchManager = new BatchManager(this.pipeline);

    // Forward pipeline events
    this.pipeline.onEvent(async (event) => {
      for (const handler of this.eventHandlers) {
        await handler(event);
      }
    });
  }

  /**
   * Register event handler
   */
  onEvent(handler: (event: FactoryEvent) => Promise<void>): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Create a batch of stories with auto-generated ideas
   */
  async createBatch(options: {
    quantity: number;
    genres: GenreType[];
    targetChapters?: number;
    dailyChaptersPerStory?: number;
    name?: string;
  }): Promise<ProductionBatch> {
    const {
      quantity,
      genres,
      targetChapters = 200,
      dailyChaptersPerStory = 3,
      name = `Batch ${new Date().toISOString().split('T')[0]}`
    } = options;

    console.log(`Creating batch with ${quantity} stories across genres: ${genres.join(', ')}`);

    // Generate ideas
    const ideasPerGenre = Math.ceil(quantity / genres.length);
    const allIdeas: StoryIdea[] = [];

    for (const genre of genres) {
      const ideas = this.ideaGenerator.generateIdeas(genre, ideasPerGenre);
      allIdeas.push(...ideas);
    }

    // Trim to exact quantity
    const selectedIdeas = allIdeas.slice(0, quantity);

    // Generate blueprints
    console.log('Generating blueprints...');
    const blueprints: StoryBlueprint[] = [];
    for (const idea of selectedIdeas) {
      idea.estimatedChapters = targetChapters; // Override with target
      const blueprint = await this.blueprintGenerator.generateBlueprint(idea);
      blueprints.push(blueprint);
    }

    // Create batch
    console.log('Starting production...');
    const batch = await this.batchManager.createBatch(blueprints, name, dailyChaptersPerStory);

    await this.emitEvent({
      type: 'batch_created',
      batchId: batch.id,
      storyCount: blueprints.length
    });

    return batch;
  }

  /**
   * Create single story from custom idea
   */
  async createStory(idea: StoryIdea): Promise<ProductionJob> {
    const blueprint = await this.blueprintGenerator.generateBlueprint(idea);

    await this.emitEvent({
      type: 'blueprint_generated',
      blueprintId: blueprint.id,
      storyId: blueprint.id
    });

    const job = await this.pipeline.addStory(blueprint);
    this.pipeline.start();

    return job;
  }

  /**
   * Generate ideas without creating
   */
  generateIdeas(genre: GenreType, count: number): StoryIdea[] {
    return this.ideaGenerator.generateIdeas(genre, count);
  }

  /**
   * Generate mashup ideas
   */
  generateMashupIdeas(genreA: GenreType, genreB: GenreType, count: number): StoryIdea[] {
    return this.ideaGenerator.generateMashupIdeas(genreA, genreB, count);
  }

  /**
   * Create blueprint from idea
   */
  async createBlueprint(idea: StoryIdea): Promise<StoryBlueprint> {
    return this.blueprintGenerator.generateBlueprint(idea);
  }

  /**
   * Get factory dashboard data
   */
  getDashboard(): {
    totalStories: number;
    activeWorkers: number;
    idleWorkers: number;
    chaptersToday: number;
    qualityScore: number;
    queuedChapters: number;
    batches: ProductionBatch[];
    recentEvents: string[];
  } {
    const status = this.pipeline.getStatus();
    const jobs = this.pipeline.getAllJobs();

    // Calculate today's chapters
    const today = new Date().toDateString();
    const chaptersToday = jobs.reduce((sum, job) => {
      // In real impl, track by date
      return sum + job.currentChapter;
    }, 0);

    // Average quality
    const qualitySum = jobs.reduce((sum, job) => sum + job.averageQualityScore, 0);
    const qualityScore = jobs.length > 0 ? qualitySum / jobs.length : 0;

    return {
      totalStories: jobs.length,
      activeWorkers: status.workers.filter(w => w.status === 'working').length,
      idleWorkers: status.workers.filter(w => w.status === 'idle').length,
      chaptersToday,
      qualityScore: Math.round(qualityScore * 10) / 10,
      queuedChapters: status.queuedChapters,
      batches: this.batchManager.getAllBatches(),
      recentEvents: [] // Would be populated from event log
    };
  }

  /**
   * Get available genres
   */
  getAvailableGenres(): Array<{ id: GenreType; name: string; description: string }> {
    return Object.entries(GENRE_TEMPLATES).map(([id, template]) => ({
      id: id as GenreType,
      name: template.name,
      description: template.description
    }));
  }

  /**
   * Start production
   */
  start(): void {
    this.pipeline.start();
  }

  /**
   * Stop production
   */
  stop(): void {
    this.pipeline.stop();
  }

  /**
   * Get pipeline status
   */
  getStatus() {
    return this.pipeline.getStatus();
  }

  /**
   * Get all jobs
   */
  getAllJobs(): ProductionJob[] {
    return this.pipeline.getAllJobs();
  }

  /**
   * Get specific job
   */
  getJob(jobId: string): ProductionJob | undefined {
    return this.pipeline.getJob(jobId);
  }

  /**
   * Pause job
   */
  pauseJob(jobId: string): void {
    this.pipeline.pauseJob(jobId);
  }

  /**
   * Resume job
   */
  resumeJob(jobId: string): void {
    this.pipeline.resumeJob(jobId);
  }

  /**
   * Cancel job
   */
  cancelJob(jobId: string): void {
    this.pipeline.cancelJob(jobId);
  }

  private async emitEvent(event: FactoryEvent): Promise<void> {
    for (const handler of this.eventHandlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error('Event handler error:', error);
      }
    }
  }
}

// Export singleton factory creator
export function createStoryFactory(config?: Partial<StoryFactoryConfig>): StoryFactory {
  return new StoryFactory(config);
}

// Export default config
export const DEFAULT_FACTORY_CONFIG: StoryFactoryConfig = {
  primaryProvider: 'gemini',
  maxWorkers: 10,
  workerTimeout: 300000,
  minQualityScore: 7,
  autoRewriteThreshold: 5,
  defaultChaptersPerDay: 3,
  batchSize: 10,
  autoPublish: false,
  publishingConfigs: []
};
