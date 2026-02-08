import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  StoryAnalysis,
  StoryOutline,
  InspirationStep,
  PlotStructure,
  AnalyzedCharacter,
  SettingElements,
  ArcSummary,
  ArcOutline,
  ChapterOutline,
  GenerateOutlineInput,
} from '@/lib/types/story-inspiration';
import { getAIProviderService } from './ai-provider';
import { AIProviderType } from '@/lib/types/ai-providers';

const getSupabaseConfig = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables');
  }
  return { url, serviceRoleKey };
};

export class AIStoryInspiration {
  private jobId: string;
  private supabaseServiceRoleClient: SupabaseClient | null = null;
  private externalClient: SupabaseClient | null = null;
  
  // Configuration
  private provider: AIProviderType = 'gemini';
  private model: string = 'gemini-3-flash-preview';
  private temperature: number = 0.7;
  private apiKey?: string;

  constructor(jobId: string, client?: SupabaseClient) {
    this.jobId = jobId;
    this.externalClient = client || null;
  }

  // Configure AI settings dynamically
  configureAI(provider: AIProviderType, model: string, temperature?: number, apiKey?: string) {
    this.provider = provider;
    this.model = model;
    if (temperature !== undefined) this.temperature = temperature;
    if (apiKey) this.apiKey = apiKey;
  }

  private async getClient(): Promise<SupabaseClient> {
    if (this.externalClient) return this.externalClient;
    if (this.supabaseServiceRoleClient) return this.supabaseServiceRoleClient;

    const { url, serviceRoleKey } = getSupabaseConfig();
    this.supabaseServiceRoleClient = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    return this.supabaseServiceRoleClient;
  }

  private async updateProgress(
    status: string,
    step: InspirationStep,
    progress: number,
    message: string,
    error?: string | null,
    resultData?: Record<string, unknown>
  ) {
    const supabase = await this.getClient();
    await supabase
      .from('inspiration_jobs')
      .update({
        status,
        progress,
        step_message: message,
        error_message: error,
        result_data: resultData,
        updated_at: new Date().toISOString()
      })
      .eq('id', this.jobId);
  }

  private async checkIfStopped(): Promise<void> {
    const supabase = await this.getClient();
    const { data } = await supabase
      .from('inspiration_jobs')
      .select('status')
      .eq('id', this.jobId)
      .single();
    if (data?.status === 'stopped') {
      throw new Error('Job stopped by user.');
    }
  }

  private async callAI(systemPrompt: string, userPrompt: string): Promise<string> {
    // Use the unified AIProviderService
    const aiService = getAIProviderService();
    
    // Inject API key if provided specifically for this session
    // (Note: getAIProviderService already loads env keys, this overrides if needed)
    /* 
       Note: AIProviderService handles retries internally via its specific provider implementations
       if we were using the streaming method, but chat() is simple fetch. 
       We can wrap it here for extra safety if needed, but AIProviderService logic is robust enough.
    */

    const result = await aiService.chat({
      provider: this.provider,
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: this.temperature,
      maxTokens: 8000,
      apiKey: this.apiKey
    });

    if (!result.success || !result.content) {
      throw new Error(result.error || 'AI response was empty');
    }

    return result.content.trim();
  }

  private parseJSON<T>(text: string, fallback: T): T {
    try {
      // Try to find JSON block
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
                        text.match(/\{[\s\S]*\}/) ||
                        text.match(/\[[\s\S]*\]/);
      
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
      return JSON.parse(jsonStr);
    } catch (e) {
      console.warn(`[AIStoryInspiration] Failed to parse JSON:`, e);
      // Optional: Log the raw text for debugging
      // console.log('Raw text:', text);
    }
    return fallback;
  }

  // ============================================================================
  // STEP 1: ANALYZE SOURCE STORY
  // ============================================================================
  async analyzeSourceStory(sourceStoryId: string): Promise<StoryAnalysis | null> {
    try {
      const supabase = await this.getClient();

      await this.updateProgress('running', 'initializing', 5, 'Khởi tạo phân tích...');

      // Get source story
      const { data: source } = await supabase
        .from('source_stories')
        .select('*')
        .eq('id', sourceStoryId)
        .single();

      if (!source) throw new Error('Không tìm thấy truyện nguồn');

      await supabase
        .from('source_stories')
        .update({ analysis_status: 'analyzing' })
        .eq('id', sourceStoryId);

      await this.checkIfStopped();
      await this.updateProgress('running', 'reading_source', 10, 'Đọc nội dung truyện...');

      const content = source.content;
      // Truncate content if too long for context window (safe limit ~50k chars for high-end models, less for others)
      const maxChars = this.model.includes('128k') || this.model.includes('gemini') ? 100000 : 40000;
      const contentPreview = content.length > maxChars ? content.substring(0, maxChars) + '...' : content;

      // Step 1: Analyze plot structure
      await this.checkIfStopped();
      await this.updateProgress('running', 'analyzing_plot', 20, 'Phân tích cấu trúc cốt truyện...');
      const plotStructure = await this.analyzePlotStructure(contentPreview);

      // Step 2: Analyze characters
      await this.checkIfStopped();
      await this.updateProgress('running', 'analyzing_characters', 40, 'Phân tích nhân vật...');
      const characters = await this.analyzeCharacters(contentPreview);

      // Step 3: Analyze world building
      await this.checkIfStopped();
      await this.updateProgress('running', 'analyzing_world', 55, 'Phân tích thế giới quan...');
      const worldAnalysis = await this.analyzeWorldBuilding(contentPreview);

      // Step 4: Detect genre and themes
      await this.checkIfStopped();
      await this.updateProgress('running', 'generating_summary', 70, 'Tổng hợp và phát hiện thể loại...');
      const genreThemes = await this.detectGenreAndThemes(contentPreview, plotStructure);

      // Step 5: Generate full summary and arc breakdowns
      await this.checkIfStopped();
      await this.updateProgress('running', 'generating_summary', 85, 'Tạo tóm tắt tổng quan...');
      const summaries = await this.generateSummaries(contentPreview, plotStructure);

      // Save analysis
      await this.updateProgress('running', 'saving', 95, 'Lưu kết quả phân tích...');

      const analysisData = {
        source_story_id: sourceStoryId,
        detected_genre: genreThemes.detected_genre,
        sub_genres: genreThemes.sub_genres,
        plot_structure: plotStructure,
        characters: characters,
        main_character_traits: characters.find(c => c.role === 'protagonist')?.traits || [],
        world_type: worldAnalysis.world_type,
        power_system: worldAnalysis.power_system,
        setting_elements: worldAnalysis.setting_elements,
        main_hooks: genreThemes.main_hooks,
        themes: genreThemes.themes,
        conflict_types: genreThemes.conflict_types,
        pacing_style: genreThemes.pacing_style,
        chapter_structure: genreThemes.chapter_structure,
        full_plot_summary: summaries.full_summary,
        arc_summaries: summaries.arcs
      };

      const { data: savedAnalysis, error: saveError } = await supabase
        .from('story_analysis')
        .insert(analysisData)
        .select()
        .single();

      if (saveError) throw saveError;

      // Update source story status
      await supabase
        .from('source_stories')
        .update({ analysis_status: 'completed' })
        .eq('id', sourceStoryId);

      await this.updateProgress('completed', 'completed', 100, 'Phân tích hoàn tất!', null, { analysis_id: savedAnalysis.id });

      return savedAnalysis as StoryAnalysis;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra';
      console.error(`[InspirationJob ${this.jobId}] Analysis error:`, error);
      await this.updateProgress('failed', 'failed', 0, errorMessage, errorMessage);

      const supabase = await this.getClient();
      const { data: job } = await supabase
        .from('inspiration_jobs')
        .select('source_story_id')
        .eq('id', this.jobId)
        .single();
      if (job?.source_story_id) {
        await supabase
          .from('source_stories')
          .update({ analysis_status: 'failed' })
          .eq('id', job.source_story_id);
      }
      throw error;
    }
  }

  private async analyzePlotStructure(content: string): Promise<PlotStructure> {
    const prompt = `Phân tích cấu trúc cốt truyện của đoạn văn sau và trả về JSON với format:
{
  "exposition": "Mô tả phần mở đầu, giới thiệu nhân vật và thế giới",
  "inciting_incident": "Sự kiện khởi đầu câu chuyện chính",
  "rising_action": ["Sự kiện 1 leo thang", "Sự kiện 2 leo thang", ...],
  "climax": "Cao trào chính của truyện",
  "falling_action": ["Hậu quả 1", "Hậu quả 2", ...],
  "resolution": "Kết thúc câu chuyện"
}

Nội dung truyện:
${content.substring(0, 20000)}`;

    const result = await this.callAI(
      'Bạn là chuyên gia phân tích văn học, chuyên phân tích cấu trúc truyện. Trả lời bằng JSON thuần túy.',
      prompt
    );

    return this.parseJSON<PlotStructure>(result, {
      exposition: 'Chưa phân tích được',
      inciting_incident: 'Chưa phân tích được',
      rising_action: [],
      climax: 'Chưa phân tích được',
      falling_action: [],
      resolution: 'Chưa phân tích được'
    });
  }

  private async analyzeCharacters(content: string): Promise<AnalyzedCharacter[]> {
    const prompt = `Phân tích các nhân vật trong truyện sau và trả về JSON array:
[
  {
    "name": "Tên nhân vật",
    "role": "protagonist" | "antagonist" | "supporting" | "minor",
    "archetype": "Kiểu nhân vật (chosen one, mentor, rival, anti-hero, etc.)",
    "traits": ["tính cách 1", "tính cách 2"],
    "relationships": {"tên_nhân_vật_khác": "quan hệ"},
    "powerLevel": "Cấp độ sức mạnh nếu có",
    "motivation": "Động lực chính của nhân vật"
  }
]

Nội dung truyện:
${content.substring(0, 20000)}`;

    const result = await this.callAI(
      'Bạn là chuyên gia phân tích nhân vật văn học. Trả lời bằng JSON array thuần túy.',
      prompt
    );

    return this.parseJSON<AnalyzedCharacter[]>(result, []);
  }

  private async analyzeWorldBuilding(content: string): Promise<{
    world_type: string;
    power_system: string;
    setting_elements: SettingElements;
  }> {
    const prompt = `Phân tích thế giới quan và hệ thống sức mạnh trong truyện sau, trả về JSON:
{
  "world_type": "cultivation | fantasy | urban | scifi | historical | game",
  "power_system": "Mô tả hệ thống tu luyện/phép thuật/sức mạnh",
  "setting_elements": {
    "locations": [{"name": "Tên", "description": "Mô tả", "significance": "Ý nghĩa"}],
    "factions": [{"name": "Tên", "role": "Vai trò", "power": "Sức mạnh"}],
    "items": [{"name": "Tên", "power": "Công năng", "importance": "Quan trọng"}],
    "rules": ["Quy tắc thế giới 1", "Quy tắc 2"]
  }
}

Nội dung truyện:
${content.substring(0, 20000)}`;

    const result = await this.callAI(
      'Bạn là chuyên gia xây dựng thế giới truyện. Trả lời bằng JSON thuần túy.',
      prompt
    );

    return this.parseJSON(result, {
      world_type: 'fantasy',
      power_system: 'Chưa xác định',
      setting_elements: { locations: [], factions: [], items: [], rules: [] }
    });
  }

  private async detectGenreAndThemes(content: string, plot: PlotStructure): Promise<{
    detected_genre: string;
    sub_genres: string[];
    main_hooks: string[];
    themes: string[];
    conflict_types: string[];
    pacing_style: 'fast' | 'medium' | 'slow';
    chapter_structure: 'cliffhanger' | 'episodic' | 'arc-based';
  }> {
    const prompt = `Dựa vào nội dung và cấu trúc cốt truyện, phân tích và trả về JSON:
{
  "detected_genre": "tien-hiep | huyen-huyen | do-thi | khoa-huyen | lich-su | dong-nhan | vong-du",
  "sub_genres": ["sub-genre 1", "sub-genre 2"],
  "main_hooks": ["Điểm thu hút 1 của truyện", "Điểm thu hút 2"],
  "themes": ["Chủ đề 1", "Chủ đề 2"],
  "conflict_types": ["man vs man", "man vs nature", "man vs self", etc.],
  "pacing_style": "fast | medium | slow",
  "chapter_structure": "cliffhanger | episodic | arc-based"
}

Cấu trúc cốt truyện đã phân tích:
${JSON.stringify(plot, null, 2)}

Nội dung truyện:
${content.substring(0, 15000)}`;

    const result = await this.callAI(
      'Bạn là chuyên gia phân tích thể loại văn học. Trả lời bằng JSON thuần túy.',
      prompt
    );

    return this.parseJSON(result, {
      detected_genre: 'huyen-huyen',
      sub_genres: [],
      main_hooks: [],
      themes: [],
      conflict_types: [],
      pacing_style: 'medium' as const,
      chapter_structure: 'arc-based' as const
    });
  }

  private async generateSummaries(content: string, plot: PlotStructure): Promise<{
    full_summary: string;
    arcs: ArcSummary[];
  }> {
    const prompt = `Dựa vào nội dung và cấu trúc, tạo tóm tắt và chia arc. Trả về JSON:
{
  "full_summary": "Tóm tắt toàn bộ cốt truyện trong 200-500 từ",
  "arcs": [
    {
      "arc_number": 1,
      "title": "Tên arc",
      "summary": "Tóm tắt arc",
      "chapters_covered": "1-20",
      "tension_peak": "Cao trào của arc",
      "key_events": ["Sự kiện 1", "Sự kiện 2"]
    }
  ]
}

Cấu trúc:
${JSON.stringify(plot, null, 2)}

Nội dung:
${content.substring(0, 20000)}`;

    const result = await this.callAI(
      'Bạn là biên tập viên chuyên nghiệp. Trả lời bằng JSON thuần túy.',
      prompt
    );

    return this.parseJSON(result, {
      full_summary: 'Chưa tạo được tóm tắt',
      arcs: []
    });
  }

  // ============================================================================
  // STEP 2: GENERATE INSPIRED OUTLINE
  // ============================================================================
  async generateInspiredOutline(input: GenerateOutlineInput): Promise<StoryOutline | null> {
    try {
      const supabase = await this.getClient();

      await this.updateProgress('running', 'initializing', 5, 'Khởi tạo tạo outline...');

      // Get source analysis
      const { data: analysis } = await supabase
        .from('story_analysis')
        .select('*, source_stories(*)')
        .eq('id', input.source_analysis_id)
        .single();

      if (!analysis) throw new Error('Không tìm thấy phân tích nguồn');

      await this.checkIfStopped();
      await this.updateProgress('running', 'creating_outline', 15, 'Đang tạo ý tưởng mới...');

      // Step 1: Transform the plot
      await this.checkIfStopped();
      await this.updateProgress('running', 'transforming_plot', 25, 'Biến đổi cốt truyện...');
      const transformedPlot = await this.transformPlot(
        analysis,
        input.new_title,
        input.main_character_name,
        input.transformation_style || 'similar'
      );

      // Step 2: Plan arcs
      await this.checkIfStopped();
      await this.updateProgress('running', 'planning_arcs', 50, 'Lên kế hoạch các arc...');
      const arcOutlines = await this.planArcs(
        analysis,
        transformedPlot,
        input.total_chapters || 100
      );

      // Step 3: Plan chapters
      await this.checkIfStopped();
      await this.updateProgress('running', 'planning_chapters', 75, 'Lên kế hoạch từng chương...');
      const chapterOutlines = await this.planChapters(
        analysis,
        transformedPlot,
        arcOutlines,
        input.total_chapters || 100
      );

      // Save outline
      await this.updateProgress('running', 'saving', 90, 'Lưu outline...');

      const { data: job } = await supabase
        .from('inspiration_jobs')
        .select('user_id')
        .eq('id', this.jobId)
        .single();

      const outlineData = {
        user_id: job?.user_id,
        source_analysis_id: input.source_analysis_id,
        title: input.new_title,
        tagline: transformedPlot.tagline,
        genre: input.genre_override || analysis.detected_genre,
        main_character_name: input.main_character_name,
        main_character_description: input.main_character_description || transformedPlot.main_character_description,
        main_character_motivation: transformedPlot.main_character_motivation,
        world_description: transformedPlot.world_description,
        power_system: transformedPlot.power_system,
        unique_elements: transformedPlot.unique_elements,
        total_planned_chapters: input.total_chapters || 100,
        arc_outlines: arcOutlines,
        chapter_outlines: chapterOutlines,
        story_hooks: transformedPlot.story_hooks,
        main_conflicts: transformedPlot.main_conflicts,
        transformation_notes: transformedPlot.transformation_notes,
        status: 'draft'
      };

      const { data: savedOutline, error: saveError } = await supabase
        .from('story_outlines')
        .insert(outlineData)
        .select()
        .single();

      if (saveError) throw saveError;

      await this.updateProgress('completed', 'completed', 100, 'Tạo outline thành công!', null, { outline_id: savedOutline.id });

      return savedOutline as StoryOutline;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra';
      console.error(`[InspirationJob ${this.jobId}] Outline error:`, error);
      await this.updateProgress('failed', 'failed', 0, errorMessage, errorMessage);
      throw error;
    }
  }

  private async transformPlot(
    analysis: StoryAnalysis,
    newTitle: string,
    mainCharName: string,
    style: 'similar' | 'twist' | 'reimagine'
  ): Promise<{
    tagline: string;
    main_character_description: string;
    main_character_motivation: string;
    world_description: string;
    power_system: string;
    unique_elements: string[];
    story_hooks: string[];
    main_conflicts: string[];
    transformation_notes: string;
  }> {
    const styleInstructions = {
      similar: 'Giữ nguyên cấu trúc và yếu tố chính, chỉ thay đổi chi tiết và tên.',
      twist: 'Giữ cấu trúc nhưng đảo ngược một số yếu tố quan trọng (villain thành hero, etc.)',
      reimagine: 'Tái tưởng tượng hoàn toàn với thể loại/bối cảnh khác nhưng giữ theme.'
    };

    const prompt = `Dựa vào phân tích truyện gốc, tạo outline cho truyện mới "${newTitle}" với nhân vật chính "${mainCharName}".

Phong cách biến đổi: ${styleInstructions[style]}

Phân tích truyện gốc:
- Thể loại: ${analysis.detected_genre}
- Cốt truyện: ${analysis.full_plot_summary}
- Hooks: ${analysis.main_hooks?.join(', ')}
- Themes: ${analysis.themes?.join(', ')}
- Hệ sức mạnh: ${analysis.power_system}

Trả về JSON:
{
  "tagline": "Một dòng mô tả hấp dẫn",
  "main_character_description": "Mô tả nhân vật chính mới",
  "main_character_motivation": "Động lực của nhân vật chính",
  "world_description": "Mô tả thế giới mới (KHÁC với gốc)",
  "power_system": "Hệ sức mạnh mới (KHÁC với gốc)",
  "unique_elements": ["Yếu tố độc đáo 1", "Yếu tố 2"],
  "story_hooks": ["Hook 1", "Hook 2"],
  "main_conflicts": ["Xung đột 1", "Xung đột 2"],
  "transformation_notes": "Ghi chú về sự khác biệt với truyện gốc để đảm bảo không vi phạm bản quyền"
}`;

    const result = await this.callAI(
      'Bạn là nhà văn sáng tạo chuyên nghiệp. Tạo outline độc đáo inspired từ nguồn. Trả lời bằng JSON.',
      prompt
    );

    return this.parseJSON(result, {
      tagline: '',
      main_character_description: '',
      main_character_motivation: '',
      world_description: '',
      power_system: '',
      unique_elements: [],
      story_hooks: [],
      main_conflicts: [],
      transformation_notes: ''
    });
  }

  private async planArcs(
    analysis: StoryAnalysis,
    transformedPlot: any,
    totalChapters: number
  ): Promise<ArcOutline[]> {
    const numArcs = Math.ceil(totalChapters / 25); // ~25 chapters per arc

    const prompt = `Dựa vào thông tin, tạo ${numArcs} arc cho truyện ${totalChapters} chương.

Thông tin truyện mới:
${JSON.stringify(transformedPlot, null, 2)}

Tham khảo cấu trúc arc gốc:
${JSON.stringify(analysis.arc_summaries, null, 2)}

Trả về JSON array:
[
  {
    "arc_number": 1,
    "title": "Tên arc",
    "description": "Mô tả chi tiết arc",
    "start_chapter": 1,
    "end_chapter": 25,
    "key_events": ["Sự kiện 1", "Sự kiện 2", "Sự kiện 3"],
    "climax": "Cao trào của arc",
    "tension_level": 50
  }
]`;

    const result = await this.callAI(
      'Bạn là nhà biên kịch chuyên nghiệp. Lên kế hoạch arc chi tiết. Trả lời bằng JSON array.',
      prompt
    );

    return this.parseJSON<ArcOutline[]>(result, []);
  }

  private async planChapters(
    analysis: StoryAnalysis,
    transformedPlot: any,
    arcs: ArcOutline[],
    totalChapters: number
  ): Promise<ChapterOutline[]> {
    // Only plan first 20 chapters in detail, rest will be planned as needed
    const chaptersToDetail = Math.min(20, totalChapters);

    const prompt = `Tạo outline chi tiết cho ${chaptersToDetail} chương đầu tiên.

Thông tin truyện:
${JSON.stringify(transformedPlot, null, 2)}

Arc đầu tiên:
${JSON.stringify(arcs[0], null, 2)}

Trả về JSON array với ĐÚNG ${chaptersToDetail} chương:
[
  {
    "chapter_number": 1,
    "title": "Tiêu đề chương",
    "summary": "Tóm tắt nội dung chương (3-5 câu)",
    "key_points": ["Điểm chính 1", "Điểm chính 2"],
    "characters_involved": ["Nhân vật 1", "Nhân vật 2"],
    "estimated_words": 2500
  }
]`;

    const result = await this.callAI(
      'Bạn là nhà văn webnovel chuyên nghiệp. Lên kế hoạch chương chi tiết. Trả lời bằng JSON array.',
      prompt
    );

    return this.parseJSON<ChapterOutline[]>(result, []);
  }

  // ============================================================================
  // STEP 3: CREATE PROJECT FROM OUTLINE
  // ============================================================================
  async createProjectFromOutline(outlineId: string, userId: string, options: {
    writing_style?: string;
    ai_model?: string;
    temperature?: number;
    target_chapter_length?: number;
  } = {}): Promise<{ projectId: string; novelId: string } | null> {
    try {
      const supabase = await this.getClient();

      await this.updateProgress('running', 'initializing', 10, 'Tạo dự án từ outline...');

      // Get outline
      const { data: outline } = await supabase
        .from('story_outlines')
        .select('*')
        .eq('id', outlineId)
        .single();

      if (!outline) throw new Error('Không tìm thấy outline');

      await this.checkIfStopped();
      await this.updateProgress('running', 'saving', 30, 'Tạo novel mới...');

      // Create novel
      const { data: novel, error: novelError } = await supabase
        .from('novels')
        .insert({
          title: outline.title,
          description: outline.tagline || outline.world_description,
          genres: [outline.genre],
          owner_id: userId,
          status: 'ongoing'
        })
        .select()
        .single();

      if (novelError) throw novelError;

      await this.checkIfStopped();
      await this.updateProgress('running', 'saving', 60, 'Tạo AI project...');

      // Determine genre-specific fields
      const genreFields: Record<string, string | undefined> = {};
      switch (outline.genre) {
        case 'tien-hiep':
          genreFields.cultivation_system = outline.power_system;
          break;
        case 'huyen-huyen':
          genreFields.magic_system = outline.power_system;
          break;
        case 'vong-du':
          genreFields.game_system = outline.power_system;
          break;
      }

      // Create AI story project
      const { data: project, error: projectError } = await supabase
        .from('ai_story_projects')
        .insert({
          user_id: userId,
          novel_id: novel.id,
          genre: outline.genre,
          main_character: outline.main_character_name,
          world_description: outline.world_description,
          writing_style: options.writing_style || 'webnovel_chinese',
          target_chapter_length: options.target_chapter_length || 2500,
          ai_model: options.ai_model || 'gemini-3-flash-preview',
          temperature: options.temperature || 0.75,
          current_chapter: 0,
          total_planned_chapters: outline.total_planned_chapters,
          status: 'active',
          ...genreFields
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Update outline with project/novel links
      await supabase
        .from('story_outlines')
        .update({
          ai_project_id: project.id,
          novel_id: novel.id,
          status: 'writing'
        })
        .eq('id', outlineId);

      // Create initial arc in plot_arcs table if arc_outlines exist
      const arcOutlines = outline.arc_outlines as ArcOutline[];
      if (arcOutlines && arcOutlines.length > 0) {
        const firstArc = arcOutlines[0];
        await supabase.from('plot_arcs').insert({
          project_id: project.id,
          arc_number: 1,
          start_chapter: firstArc.start_chapter,
          end_chapter: firstArc.end_chapter,
          arc_title: firstArc.title,
          arc_description: firstArc.description,
          climax_chapter: Math.floor((firstArc.start_chapter + firstArc.end_chapter) / 2),
          climax_description: firstArc.climax,
          theme: 'introduction',
          status: 'in_progress'
        });
      }

      await this.updateProgress('completed', 'completed', 100, 'Tạo project thành công!', null, {
        project_id: project.id,
        novel_id: novel.id
      });

      return { projectId: project.id, novelId: novel.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra';
      console.error(`[InspirationJob ${this.jobId}] Create project error:`, error);
      await this.updateProgress('failed', 'failed', 0, errorMessage, errorMessage);
      throw error;
    }
  }
}