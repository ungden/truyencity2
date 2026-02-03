/**
 * Blueprint Factory Service for Story Factory
 * Generates detailed story blueprints from ideas using Gemini AI
 */

import { createClient } from '@supabase/supabase-js';
import { GeminiClient, getGeminiClient } from './gemini-client';
import { GeminiImageService, getGeminiImageService } from './gemini-image';
import {
  StoryIdea,
  StoryBlueprint,
  AIAuthorProfile,
  BlueprintGenerationInput,
  ServiceResult,
  BatchResult,
  FactoryGenre,
  ArcOutline,
  PlotPoint,
  PlannedTwist,
  CharacterInfo,
  CharacterRelationship,
  PowerSystemConfig,
  LocationInfo,
  FactionInfo,
} from './types';

export class BlueprintFactoryService {
  private gemini: GeminiClient;
  private imageService: GeminiImageService;
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor(options?: {
    geminiClient?: GeminiClient;
    imageService?: GeminiImageService;
    supabaseUrl?: string;
    supabaseKey?: string;
  }) {
    this.gemini = options?.geminiClient || getGeminiClient();
    this.imageService = options?.imageService || getGeminiImageService();
    this.supabaseUrl = options?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    this.supabaseKey = options?.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  }

  private getSupabase() {
    return createClient(this.supabaseUrl, this.supabaseKey);
  }

  /**
   * Generate a complete story blueprint from an idea
   */
  async generateBlueprint(input: BlueprintGenerationInput): Promise<ServiceResult<StoryBlueprint>> {
    const { idea, author, target_chapters } = input;

    try {
      // Step 1: Generate world building
      const worldResult = await this.generateWorldBuilding(idea, author);
      if (!worldResult.success || !worldResult.data) {
        return { success: false, error: worldResult.error, errorCode: worldResult.errorCode };
      }

      // Step 2: Generate characters
      const charactersResult = await this.generateCharacters(idea, author, worldResult.data);
      if (!charactersResult.success || !charactersResult.data) {
        return { success: false, error: charactersResult.error, errorCode: charactersResult.errorCode };
      }

      // Step 3: Generate plot structure
      const plotResult = await this.generatePlotStructure(
        idea,
        author,
        worldResult.data,
        charactersResult.data,
        target_chapters
      );
      if (!plotResult.success || !plotResult.data) {
        return { success: false, error: plotResult.error, errorCode: plotResult.errorCode };
      }

      // Step 4: Generate synopses
      const synopsisResult = await this.generateSynopsis(
        idea,
        worldResult.data,
        charactersResult.data,
        plotResult.data
      );
      if (!synopsisResult.success || !synopsisResult.data) {
        return { success: false, error: synopsisResult.error, errorCode: synopsisResult.errorCode };
      }

      // Step 5: Generate cover prompt
      const coverPrompt = this.generateCoverPrompt(
        idea,
        worldResult.data,
        charactersResult.data.protagonist
      );

      // Combine all parts into blueprint
      const blueprint: Omit<StoryBlueprint, 'id' | 'created_at' | 'updated_at'> = {
        idea_id: idea.id,
        author_id: author.id,
        title: idea.title,
        genre: idea.genre,
        sub_genre: idea.sub_genre,

        // Synopsis
        short_synopsis: synopsisResult.data.short_synopsis,
        full_synopsis: synopsisResult.data.full_synopsis,

        // World Bible
        world_name: worldResult.data.world_name,
        world_description: worldResult.data.world_description,
        world_history: worldResult.data.world_history,
        power_system: worldResult.data.power_system,
        locations: worldResult.data.locations,
        factions: worldResult.data.factions,
        world_rules: worldResult.data.world_rules,

        // Characters
        protagonist: charactersResult.data.protagonist,
        antagonists: charactersResult.data.antagonists,
        supporting_characters: charactersResult.data.supporting_characters,
        character_relationships: charactersResult.data.character_relationships,

        // Plot
        total_planned_chapters: target_chapters,
        arc_outlines: plotResult.data.arc_outlines,
        major_plot_points: plotResult.data.major_plot_points,
        planned_twists: plotResult.data.planned_twists,
        ending_type: plotResult.data.ending_type,

        // Cover
        cover_prompt: coverPrompt,
        cover_url: null,

        // Metadata
        status: 'generated',
        quality_score: null,
        generation_tokens: null,
      };

      return {
        success: true,
        data: blueprint as StoryBlueprint,
      };
    } catch (error) {
      console.error('[BlueprintFactoryService] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'BLUEPRINT_GENERATION_ERROR',
      };
    }
  }

  /**
   * Generate world building elements
   */
  private async generateWorldBuilding(
    idea: StoryIdea,
    author: AIAuthorProfile
  ): Promise<ServiceResult<WorldBuildingResult>> {
    const prompt = this.buildWorldBuildingPrompt(idea, author);

    const result = await this.gemini.generateJSON<WorldBuildingResult>(prompt, {
      temperature: 0.8,
      maxOutputTokens: 4096,
      systemInstruction: author.persona_prompt,
    });

    return result;
  }

  /**
   * Generate characters
   */
  private async generateCharacters(
    idea: StoryIdea,
    author: AIAuthorProfile,
    world: WorldBuildingResult
  ): Promise<ServiceResult<CharactersResult>> {
    const prompt = this.buildCharactersPrompt(idea, author, world);

    const result = await this.gemini.generateJSON<CharactersResult>(prompt, {
      temperature: 0.8,
      maxOutputTokens: 4096,
      systemInstruction: author.persona_prompt,
    });

    return result;
  }

  /**
   * Generate plot structure with arcs
   */
  private async generatePlotStructure(
    idea: StoryIdea,
    author: AIAuthorProfile,
    world: WorldBuildingResult,
    characters: CharactersResult,
    totalChapters: number
  ): Promise<ServiceResult<PlotStructureResult>> {
    const prompt = this.buildPlotPrompt(idea, author, world, characters, totalChapters);

    const result = await this.gemini.generateJSON<PlotStructureResult>(prompt, {
      temperature: 0.7,
      maxOutputTokens: 8192,
      systemInstruction: author.persona_prompt,
    });

    return result;
  }

  /**
   * Generate synopses
   */
  private async generateSynopsis(
    idea: StoryIdea,
    world: WorldBuildingResult,
    characters: CharactersResult,
    plot: PlotStructureResult
  ): Promise<ServiceResult<SynopsisResult>> {
    const prompt = `Dựa trên thông tin sau, viết synopsis cho truyện:

TIÊU ĐỀ: ${idea.title}
THỂ LOẠI: ${idea.genre}
TIỀN ĐỀ: ${idea.premise}
THẾ GIỚI: ${world.world_name} - ${world.world_description}
NHÂN VẬT CHÍNH: ${characters.protagonist?.name} - ${characters.protagonist?.personality}
SỐ CHƯƠNG: ${plot.arc_outlines?.length || 0} arcs, kết thúc ${plot.ending_type}

OUTPUT JSON:
{
  "short_synopsis": "2-3 câu giới thiệu truyện hấp dẫn để hiển thị trên trang chủ",
  "full_synopsis": "5-10 câu mô tả chi tiết plot chính, không spoil kết thúc"
}`;

    return this.gemini.generateJSON<SynopsisResult>(prompt, {
      temperature: 0.7,
      maxOutputTokens: 1024,
    });
  }

  /**
   * Save blueprint to database
   */
  async saveBlueprint(
    blueprint: Omit<StoryBlueprint, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ServiceResult<StoryBlueprint>> {
    const supabase = this.getSupabase();

    const { data, error } = await supabase
      .from('story_blueprints')
      .insert(blueprint)
      .select()
      .single();

    if (error) {
      console.error('[BlueprintFactoryService] Save error:', error);
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_INSERT_ERROR',
      };
    }

    return {
      success: true,
      data: data as StoryBlueprint,
    };
  }

  /**
   * Generate and save blueprint
   */
  async generateAndSaveBlueprint(
    input: BlueprintGenerationInput
  ): Promise<ServiceResult<StoryBlueprint>> {
    const generateResult = await this.generateBlueprint(input);

    if (!generateResult.success || !generateResult.data) {
      return generateResult;
    }

    const saveResult = await this.saveBlueprint(generateResult.data);

    if (saveResult.success && saveResult.data) {
      // Mark idea as blueprint created
      const supabase = this.getSupabase();
      await supabase
        .from('story_ideas')
        .update({ status: 'blueprint_created' })
        .eq('id', input.idea.id);
    }

    return saveResult;
  }

  /**
   * Generate cover image for blueprint
   */
  async generateCover(blueprintId: string): Promise<ServiceResult<string>> {
    const supabase = this.getSupabase();

    // Get blueprint
    const { data: blueprint, error: fetchError } = await supabase
      .from('story_blueprints')
      .select('*')
      .eq('id', blueprintId)
      .single();

    if (fetchError || !blueprint) {
      return {
        success: false,
        error: 'Blueprint not found',
        errorCode: 'BLUEPRINT_NOT_FOUND',
      };
    }

    if (!blueprint.cover_prompt) {
      return {
        success: false,
        error: 'No cover prompt available',
        errorCode: 'NO_COVER_PROMPT',
      };
    }

    // Generate cover image
    const imageResult = await this.imageService.generateCoverWithRetry(
      blueprint.title,
      blueprint.genre,
      blueprint.cover_prompt,
      3
    );

    if (!imageResult.success || !imageResult.data?.images?.[0]) {
      return {
        success: false,
        error: imageResult.error || 'Failed to generate cover',
        errorCode: imageResult.errorCode || 'IMAGE_GENERATION_FAILED',
      };
    }

    // TODO: Upload to storage and get URL
    // For now, return base64 data URL
    const image = imageResult.data.images[0];
    const dataUrl = this.imageService.base64ToDataUrl(image.base64, image.mimeType);

    // Update blueprint with cover URL (placeholder)
    await supabase
      .from('story_blueprints')
      .update({
        cover_url: dataUrl.substring(0, 200) + '...', // Truncate for DB
        status: 'ready',
      })
      .eq('id', blueprintId);

    return {
      success: true,
      data: dataUrl,
    };
  }

  /**
   * Get blueprint by ID
   */
  async getBlueprint(blueprintId: string): Promise<ServiceResult<StoryBlueprint>> {
    const supabase = this.getSupabase();

    const { data, error } = await supabase
      .from('story_blueprints')
      .select('*')
      .eq('id', blueprintId)
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
      data: data as StoryBlueprint,
    };
  }

  /**
   * Get blueprints ready for production
   */
  async getReadyBlueprints(limit: number = 50): Promise<ServiceResult<StoryBlueprint[]>> {
    const supabase = this.getSupabase();

    const { data, error } = await supabase
      .from('story_blueprints')
      .select('*')
      .eq('status', 'ready')
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
      data: data as StoryBlueprint[],
    };
  }

  /**
   * Mark blueprint as in production
   */
  async markInProduction(blueprintId: string): Promise<ServiceResult<void>> {
    const supabase = this.getSupabase();

    const { error } = await supabase
      .from('story_blueprints')
      .update({ status: 'in_production' })
      .eq('id', blueprintId);

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
   * Batch generate blueprints from approved ideas
   */
  async batchGenerateBlueprints(
    ideas: StoryIdea[],
    authors: AIAuthorProfile[],
    targetChapters: number = 1500
  ): Promise<BatchResult<StoryBlueprint>> {
    const results: Array<{ item: StoryBlueprint; success: boolean; error?: string }> = [];
    let succeeded = 0;
    let failed = 0;

    for (const idea of ideas) {
      // Find suitable author for genre
      const author = this.findAuthorForGenre(authors, idea.genre);

      if (!author) {
        results.push({
          item: {} as StoryBlueprint,
          success: false,
          error: `No author available for genre: ${idea.genre}`,
        });
        failed++;
        continue;
      }

      const result = await this.generateAndSaveBlueprint({
        idea,
        author,
        target_chapters: targetChapters,
      });

      if (result.success && result.data) {
        results.push({ item: result.data, success: true });
        succeeded++;
      } else {
        results.push({
          item: {} as StoryBlueprint,
          success: false,
          error: result.error,
        });
        failed++;
      }

      // Delay between generations
      await this.delay(2000);
    }

    return {
      success: failed === 0,
      total: ideas.length,
      succeeded,
      failed,
      results,
    };
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private buildWorldBuildingPrompt(idea: StoryIdea, author: AIAuthorProfile): string {
    return `Với phong cách của ${author.pen_name}, xây dựng thế giới cho truyện:

THÔNG TIN TRUYỆN:
- Tiêu đề: ${idea.title}
- Thể loại: ${idea.genre}
- Tiền đề: ${idea.premise}
- Hệ thống sức mạnh: ${idea.power_system_type || 'Tự do sáng tạo'}
- Bối cảnh: ${idea.setting_type || 'Tự do sáng tạo'}

YÊU CẦU:
1. Tạo thế giới phù hợp thể loại ${idea.genre}
2. Hệ thống sức mạnh PHẢI rõ ràng, có cấp bậc cụ thể
3. Các địa điểm phải liên quan đến plot
4. Các thế lực/phe phái tạo xung đột

OUTPUT JSON:
{
  "world_name": "Tên thế giới/bối cảnh",
  "world_description": "Mô tả tổng quan thế giới (3-5 câu)",
  "world_history": "Lịch sử quan trọng ảnh hưởng đến plot (3-5 câu)",
  "power_system": {
    "name": "Tên hệ thống (Tu Tiên/Ma Pháp/Dị Năng/v.v.)",
    "levels": [
      {"name": "Cấp 1", "description": "Mô tả", "requirements": "Yêu cầu đột phá"},
      {"name": "Cấp 2", "description": "Mô tả", "requirements": "Yêu cầu"},
      {"name": "Cấp 3", "description": "Mô tả", "requirements": "Yêu cầu"},
      {"name": "Cấp 4", "description": "Mô tả", "requirements": "Yêu cầu"},
      {"name": "Cấp 5", "description": "Mô tả", "requirements": "Yêu cầu"}
    ],
    "rules": ["Quy tắc 1 của hệ thống", "Quy tắc 2"]
  },
  "locations": [
    {"name": "Địa điểm 1", "description": "Mô tả", "significance": "Tầm quan trọng với plot"},
    {"name": "Địa điểm 2", "description": "Mô tả", "significance": "Tầm quan trọng với plot"}
  ],
  "factions": [
    {"name": "Thế lực 1", "description": "Mô tả", "alignment": "Thiện/Ác/Trung lập", "key_members": ["Nhân vật A"]},
    {"name": "Thế lực 2", "description": "Mô tả", "alignment": "Thiện/Ác/Trung lập", "key_members": ["Nhân vật B"]}
  ],
  "world_rules": ["Quy tắc thế giới 1", "Quy tắc 2", "Quy tắc 3"]
}`;
  }

  private buildCharactersPrompt(
    idea: StoryIdea,
    author: AIAuthorProfile,
    world: WorldBuildingResult
  ): string {
    return `Với phong cách của ${author.pen_name}, tạo nhân vật cho truyện:

THÔNG TIN:
- Tiêu đề: ${idea.title}
- Thể loại: ${idea.genre}
- Tiền đề: ${idea.premise}
- Thế giới: ${world.world_name}
- Hệ thống sức mạnh: ${world.power_system?.name || 'N/A'}
- Kiểu nhân vật chính: ${idea.protagonist_archetype || 'Tự do'}
- Kiểu phản diện: ${idea.antagonist_type || 'Tự do'}

YÊU CẦU:
1. Nhân vật chính PHẢI có động lực rõ ràng và điểm yếu
2. Phản diện PHẢI có chiều sâu, không chỉ đơn thuần là ác
3. Các nhân vật phụ hỗ trợ plot và character development
4. Mối quan hệ giữa các nhân vật phải có tiềm năng phát triển

OUTPUT JSON:
{
  "protagonist": {
    "name": "Tên nhân vật chính (Hán-Việt hoặc Việt)",
    "age": 18,
    "gender": "Nam/Nữ",
    "personality": "Tính cách chi tiết (3-4 câu)",
    "appearance": "Ngoại hình đặc trưng",
    "background": "Lai lịch, quá khứ (3-4 câu)",
    "goals": ["Mục tiêu ngắn hạn", "Mục tiêu dài hạn"],
    "abilities": ["Năng lực ban đầu", "Tiềm năng"],
    "weaknesses": ["Điểm yếu 1", "Điểm yếu 2"]
  },
  "antagonists": [
    {
      "name": "Tên phản diện chính",
      "age": null,
      "gender": "Nam/Nữ",
      "personality": "Tính cách",
      "appearance": "Ngoại hình",
      "background": "Lai lịch, động cơ",
      "goals": ["Mục tiêu"],
      "abilities": ["Năng lực"],
      "weaknesses": ["Điểm yếu"]
    }
  ],
  "supporting_characters": [
    {
      "name": "Nhân vật phụ 1",
      "age": null,
      "gender": "Nam/Nữ",
      "personality": "Tính cách",
      "appearance": "Ngoại hình",
      "background": "Lai lịch",
      "goals": ["Mục tiêu"],
      "abilities": ["Năng lực"],
      "weaknesses": ["Điểm yếu"]
    },
    {
      "name": "Nhân vật phụ 2",
      "age": null,
      "gender": "Nam/Nữ",
      "personality": "Tính cách",
      "appearance": "Ngoại hình",
      "background": "Lai lịch",
      "goals": ["Mục tiêu"],
      "abilities": ["Năng lực"],
      "weaknesses": ["Điểm yếu"]
    }
  ],
  "character_relationships": [
    {"char1": "Nhân vật A", "char2": "Nhân vật B", "relationship": "Mối quan hệ ban đầu", "evolution": "Sự phát triển qua truyện"}
  ]
}`;
  }

  private buildPlotPrompt(
    idea: StoryIdea,
    author: AIAuthorProfile,
    world: WorldBuildingResult,
    characters: CharactersResult,
    totalChapters: number
  ): string {
    const arcCount = Math.ceil(totalChapters / 200); // ~200 chapters per arc

    return `Với phong cách của ${author.pen_name}, lên kế hoạch plot cho truyện ${totalChapters} chương:

THÔNG TIN:
- Tiêu đề: ${idea.title}
- Thể loại: ${idea.genre}
- Tiền đề: ${idea.premise}
- Nhân vật chính: ${characters.protagonist?.name} - ${characters.protagonist?.personality}
- Phản diện: ${characters.antagonists?.[0]?.name || 'TBD'}
- Thế giới: ${world.world_name}
- Xung đột chính: ${idea.main_conflict || 'TBD'}

YÊU CẦU:
1. Chia thành ${arcCount} arcs, mỗi arc ~200 chương
2. Mỗi arc có climax và resolution riêng
3. Các plot points phải tạo dopamine cho độc giả
4. Các twist phải có foreshadowing
5. Kết thúc phù hợp với tone của truyện

CÔNG THỨC DOPAMINE (ức chế trước, bùng nổ sau):
- 70% chương: build-up, suppression (bị ức hiếp, thua cuộc, tích lũy)
- 30% chương: payoff, explosion (faceslap, chiến thắng, loot)

OUTPUT JSON:
{
  "arc_outlines": [
    {
      "arc_number": 1,
      "title": "Tên Arc 1",
      "start_chapter": 1,
      "end_chapter": 200,
      "summary": "Tóm tắt arc (3-5 câu)",
      "tension_curve": "rising/falling/climax/resolution",
      "climax_chapter": 180,
      "key_events": ["Sự kiện 1", "Sự kiện 2", "Sự kiện 3"]
    }
  ],
  "major_plot_points": [
    {"chapter": 1, "event": "Hook - sự kiện mở đầu cuốn hút", "impact": "Tác động đến câu chuyện"},
    {"chapter": 50, "event": "First major victory", "impact": "Độc giả hài lòng"},
    {"chapter": 100, "event": "Major setback", "impact": "Tăng stakes"}
  ],
  "planned_twists": [
    {
      "target_chapter": 150,
      "twist_type": "identity reveal/betrayal/power awakening/etc",
      "description": "Mô tả twist",
      "foreshadowing_start": 50
    }
  ],
  "ending_type": "happy/bittersweet/tragic/open"
}`;
  }

  private generateCoverPrompt(
    idea: StoryIdea,
    world: WorldBuildingResult,
    protagonist: CharacterInfo | null
  ): string {
    const setting = world.world_description || idea.setting_type || 'fantasy world';
    const character = protagonist
      ? `${protagonist.appearance}, ${protagonist.personality?.split('.')[0]}`
      : 'mysterious protagonist';

    return `A powerful ${character} in ${setting}. ${idea.hook || idea.premise}`;
  }

  private findAuthorForGenre(
    authors: AIAuthorProfile[],
    genre: FactoryGenre
  ): AIAuthorProfile | null {
    // First try to find author with primary genre match
    const primary = authors.find(
      (a) => a.status === 'active' && a.primary_genres.includes(genre)
    );
    if (primary) return primary;

    // Then try secondary genres
    const secondary = authors.find(
      (a) => a.status === 'active' && a.secondary_genres.includes(genre)
    );
    if (secondary) return secondary;

    // Fallback to any active author not avoiding this genre
    return (
      authors.find(
        (a) => a.status === 'active' && !a.avoid_genres.includes(genre)
      ) || null
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Result types for internal use
interface WorldBuildingResult {
  world_name: string;
  world_description: string;
  world_history: string;
  power_system: PowerSystemConfig | null;
  locations: LocationInfo[];
  factions: FactionInfo[];
  world_rules: string[];
}

interface CharactersResult {
  protagonist: CharacterInfo | null;
  antagonists: CharacterInfo[];
  supporting_characters: CharacterInfo[];
  character_relationships: CharacterRelationship[];
}

interface PlotStructureResult {
  arc_outlines: ArcOutline[];
  major_plot_points: PlotPoint[];
  planned_twists: PlannedTwist[];
  ending_type: 'happy' | 'bittersweet' | 'tragic' | 'open';
}

interface SynopsisResult {
  short_synopsis: string;
  full_synopsis: string;
}

// Singleton instance
let blueprintFactoryInstance: BlueprintFactoryService | null = null;

export function getBlueprintFactoryService(): BlueprintFactoryService {
  if (!blueprintFactoryInstance) {
    blueprintFactoryInstance = new BlueprintFactoryService();
  }
  return blueprintFactoryInstance;
}

export function createBlueprintFactoryService(options?: {
  geminiClient?: GeminiClient;
  imageService?: GeminiImageService;
  supabaseUrl?: string;
  supabaseKey?: string;
}): BlueprintFactoryService {
  return new BlueprintFactoryService(options);
}
