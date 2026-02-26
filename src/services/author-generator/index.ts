/**
 * AI Author Generator - Creates realistic virtual author profiles
 *
 * Extracted from story-writing-factory/author-generator.ts (Phase 11 migration).
 *
 * Generates:
 * - Vietnamese pen names (bút danh)
 * - Author bios and writing style descriptions
 * - AI persona prompts for consistent writing
 * - Specialized genres based on preferences
 */

import { AIProviderService } from '../ai-provider';
import { AIProviderType } from '@/lib/types/ai-providers';

/** Genre slugs used across the platform */
export type GenreType =
  | 'tien-hiep' | 'huyen-huyen' | 'do-thi' | 'kiem-hiep'
  | 'lich-su' | 'khoa-huyen' | 'vong-du' | 'dong-nhan'
  | 'mat-the' | 'linh-di' | 'quan-truong' | 'di-gioi'
  | 'ngon-tinh';

export interface GeneratedAuthor {
  name: string;
  bio: string;
  writing_style_description: string;
  ai_prompt_persona: string;
  specialized_genres: string[];
  avatar_prompt: string; // For generating avatar with image AI
}

export interface AuthorGenerationConfig {
  genre?: GenreType | string;
  style?: 'traditional' | 'modern' | 'mixed';
  gender?: 'male' | 'female' | 'neutral';
  age_group?: 'young' | 'middle' | 'senior';
  specialty_count?: number;
}

// Vietnamese pen name components for realistic author names
const PEN_NAME_COMPONENTS = {
  prefixes: {
    traditional: ['Thiên', 'Vân', 'Phong', 'Long', 'Huyền', 'Cố', 'Mặc', 'Thanh', 'Bạch', 'Hắc'],
    modern: ['Tiểu', 'Đại', 'Nhất', 'Vô', 'Thiếu', 'Lão', 'Cuồng', 'Cô', 'Lãnh', 'Ngạo'],
    female: ['Tuyết', 'Nguyệt', 'Hoa', 'Vân', 'Phượng', 'Linh', 'Nhi', 'Yên', 'Mộng', 'Băng'],
    male: ['Kiếm', 'Đao', 'Long', 'Hổ', 'Phong', 'Lôi', 'Vũ', 'Thiên', 'Địa', 'Chiến'],
  },
  suffixes: {
    traditional: ['Tử', 'Sinh', 'Khách', 'Nhân', 'Lão', 'Tiên', 'Hiệp', 'Ma', 'Đế', 'Thần'],
    modern: ['Gia', 'Thủ', 'Sư', 'Chủ', 'Vương', 'Đạo', 'Kiếm', 'Tâm', 'Ý', 'Mộng'],
    descriptive: ['Cuồng', 'Ngạo', 'Lãnh', 'Hàn', 'Nhiệt', 'Tĩnh', 'Động', 'Minh', 'Ám', 'Tuyệt'],
  },
  middle: ['Chi', 'Vô', 'Bất', 'Phi', 'Dạ', 'Vân', 'Phong', 'Vũ', 'Tiêu', 'Diệp'],
};

// Writing style archetypes
const WRITING_STYLE_ARCHETYPES = {
  epic: {
    description: 'Hùng tráng, mạnh mẽ, tập trung vào cảnh chiến đấu hoành tráng và sự phát triển sức mạnh',
    traits: ['miêu tả chi tiết cảnh chiến đấu', 'nhịp văn nhanh', 'nhiều cao trào'],
  },
  poetic: {
    description: 'Trữ tình, bay bổng, chú trọng vào cảm xúc và miêu tả cảnh quan',
    traits: ['văn phong thi vị', 'nhiều hình ảnh thiên nhiên', 'câu văn nhịp nhàng'],
  },
  comedic: {
    description: 'Hài hước, dí dỏm, thường xuyên có những tình huống bất ngờ vui nhộn',
    traits: ['đối thoại hài hước', 'tình huống bất ngờ', 'nhân vật có tính cách đặc sắc'],
  },
  dark: {
    description: 'Trầm lắng, u tối, khám phá chiều sâu tâm lý và mặt tối của nhân vật',
    traits: ['bầu không khí căng thẳng', 'nhân vật phức tạp', 'plot twist bất ngờ'],
  },
  romantic: {
    description: 'Lãng mạn, ngọt ngào, tập trung vào mối quan hệ và cảm xúc giữa các nhân vật',
    traits: ['miêu tả cảm xúc sâu sắc', 'nhiều khoảnh khắc lãng mạn', 'phát triển tình cảm tự nhiên'],
  },
  tactical: {
    description: 'Chiến thuật, logic, chú trọng vào mưu kế và tính toán',
    traits: ['cốt truyện logic chặt chẽ', 'nhân vật thông minh', 'nhiều âm mưu phức tạp'],
  },
};

// Genre-specific specializations
const GENRE_SPECIALIZATIONS: Record<string, string[]> = {
  'tien-hiep': ['tu tiên', 'kiếm tiên', 'thần tiên', 'ma đạo', 'linh thú'],
  'huyen-huyen': ['huyền huyễn', 'dị giới', 'võ hồn', 'đấu khí', 'huyết mạch'],
  'do-thi': ['đô thị', 'siêu năng', 'trọng sinh', 'hệ thống', 'thương chiến'],
  'kiem-hiep': ['kiếm hiệp', 'võ hiệp', 'giang hồ', 'môn phái', 'cao thủ'],
  'xuyen-khong': ['xuyên không', 'trọng sinh', 'hệ thống', 'cổ đại', 'hiện đại'],
  'game': ['game', 'thực tế ảo', 'linh hồn nhập', 'phó bản', 'nâng cấp'],
  'khoa-huyen': ['khoa huyễn', 'vũ trụ', 'mạt thế', 'tiến hóa', 'cơ giáp'],
};

export class AuthorGenerator {
  private provider: AIProviderType;
  private model: string;
  private aiService: AIProviderService;

  constructor(provider: AIProviderType = 'gemini', model: string = 'gemini-3-flash-preview') {
    this.provider = provider;
    this.model = model;
    this.aiService = new AIProviderService({
      gemini: process.env.GEMINI_API_KEY,
    });
  }

  /**
   * Generate a complete author profile
   */
  async generateAuthor(config: AuthorGenerationConfig = {}): Promise<GeneratedAuthor> {
    const {
      genre = 'tien-hiep',
      style = 'mixed',
      gender = 'neutral',
      age_group = 'middle',
      specialty_count = 2,
    } = config;

    // Generate pen name
    const penName = this.generatePenName(style, gender);

    // Select writing style archetype
    const archetypeKey = this.selectArchetype(genre);
    const archetype = WRITING_STYLE_ARCHETYPES[archetypeKey as keyof typeof WRITING_STYLE_ARCHETYPES];

    // Get specialized genres
    const specializedGenres = this.selectSpecializedGenres(genre, specialty_count);

    // Generate detailed profile using AI
    const profile = await this.generateDetailedProfile(penName, {
      genre,
      archetype,
      archetypeKey,
      gender,
      age_group,
      specializedGenres,
    });

    return {
      name: penName,
      bio: profile.bio,
      writing_style_description: profile.writing_style,
      ai_prompt_persona: profile.persona,
      specialized_genres: specializedGenres,
      avatar_prompt: profile.avatar_prompt,
    };
  }

  /**
   * Generate a Vietnamese pen name
   */
  private generatePenName(
    style: 'traditional' | 'modern' | 'mixed',
    gender: 'male' | 'female' | 'neutral'
  ): string {
    const components = PEN_NAME_COMPONENTS;

    // Select prefix pool based on style and gender
    let prefixPool: string[] = [];
    if (style === 'traditional') {
      prefixPool = [...components.prefixes.traditional];
    } else if (style === 'modern') {
      prefixPool = [...components.prefixes.modern];
    } else {
      prefixPool = [...components.prefixes.traditional, ...components.prefixes.modern];
    }

    if (gender === 'female') {
      prefixPool = [...prefixPool, ...components.prefixes.female];
    } else if (gender === 'male') {
      prefixPool = [...prefixPool, ...components.prefixes.male];
    }

    // Select suffix pool
    let suffixPool: string[] = [];
    if (style === 'traditional') {
      suffixPool = [...components.suffixes.traditional];
    } else {
      suffixPool = [...components.suffixes.traditional, ...components.suffixes.modern];
    }

    // Randomly construct name (2 or 3 parts)
    const prefix = prefixPool[Math.floor(Math.random() * prefixPool.length)];
    const useMidpart = Math.random() > 0.5;
    const suffix = suffixPool[Math.floor(Math.random() * suffixPool.length)];

    if (useMidpart) {
      const middle = components.middle[Math.floor(Math.random() * components.middle.length)];
      return `${prefix} ${middle} ${suffix}`;
    }

    return `${prefix} ${suffix}`;
  }

  /**
   * Select archetype based on genre
   */
  private selectArchetype(genre: string): string {
    const genreArchetypes: Record<string, string[]> = {
      'tien-hiep': ['epic', 'poetic', 'tactical'],
      'huyen-huyen': ['epic', 'dark', 'tactical'],
      'do-thi': ['tactical', 'comedic', 'romantic'],
      'kiem-hiep': ['epic', 'poetic', 'dark'],
      'xuyen-khong': ['comedic', 'tactical', 'romantic'],
      'game': ['comedic', 'tactical', 'epic'],
      'khoa-huyen': ['dark', 'tactical', 'epic'],
    };

    const archetypes = genreArchetypes[genre] || Object.keys(WRITING_STYLE_ARCHETYPES);
    return archetypes[Math.floor(Math.random() * archetypes.length)];
  }

  /**
   * Select specialized genres for the author
   */
  private selectSpecializedGenres(mainGenre: string, count: number): string[] {
    const allGenres = Object.keys(GENRE_SPECIALIZATIONS);

    // Always include main genre
    const selected = [mainGenre];

    // Add related genres
    const otherGenres = allGenres.filter(g => g !== mainGenre);
    while (selected.length < count && otherGenres.length > 0) {
      const idx = Math.floor(Math.random() * otherGenres.length);
      selected.push(otherGenres.splice(idx, 1)[0]);
    }

    return selected;
  }

  /**
   * Generate detailed author profile using AI
   */
  private async generateDetailedProfile(
    penName: string,
    context: {
      genre: string;
      archetype: typeof WRITING_STYLE_ARCHETYPES[keyof typeof WRITING_STYLE_ARCHETYPES];
      archetypeKey: string;
      gender: 'male' | 'female' | 'neutral';
      age_group: 'young' | 'middle' | 'senior';
      specializedGenres: string[];
    }
  ): Promise<{
    bio: string;
    writing_style: string;
    persona: string;
    avatar_prompt: string;
  }> {
    const genderText = context.gender === 'female' ? 'nữ' : context.gender === 'male' ? 'nam' : '';
    const ageText = context.age_group === 'young' ? 'trẻ' : context.age_group === 'senior' ? 'cao tuổi' : 'trung niên';

    const prompt = `Bạn là chuyên gia tạo hồ sơ tác giả webnovel. Hãy tạo hồ sơ chi tiết cho tác giả với các thông tin sau:

Bút danh: ${penName}
Thể loại chuyên môn: ${context.specializedGenres.join(', ')}
Phong cách viết: ${context.archetype.description}
Đặc điểm: ${context.archetype.traits.join(', ')}
Giới tính (nếu có): ${genderText}
Độ tuổi: ${ageText}

Hãy trả về JSON với format:
{
  "bio": "Tiểu sử ngắn 2-3 câu, phong cách bí ẩn như tác giả webnovel thực sự",
  "writing_style": "Mô tả văn phong 2-3 câu, cụ thể và đặc trưng",
  "persona": "Prompt nhập vai 3-4 câu để AI viết với phong cách này",
  "avatar_prompt": "Prompt tiếng Anh để tạo avatar với AI (phong cách anime/illustration)"
}

Chú ý:
- Bio phải bí ẩn, không tiết lộ quá nhiều
- Writing style phải cụ thể, có thể phân biệt với tác giả khác
- Persona phải chi tiết để AI có thể nhập vai chính xác
- Avatar prompt phải tạo ra hình ảnh phù hợp với tính cách tác giả`;

    try {
      const response = await this.aiService.chat({
        provider: this.provider,
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        maxTokens: 1000,
      });

      if (!response.success || !response.content) {
        throw new Error(response.error || 'No response from AI');
      }

      // Extract JSON from response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        bio: parsed.bio || this.generateFallbackBio(penName, context),
        writing_style: parsed.writing_style || context.archetype.description,
        persona: parsed.persona || this.generateFallbackPersona(penName, context),
        avatar_prompt: parsed.avatar_prompt || this.generateFallbackAvatarPrompt(context),
      };
    } catch (error) {
      console.error('AI profile generation failed, using fallback:', error);
      return {
        bio: this.generateFallbackBio(penName, context),
        writing_style: context.archetype.description,
        persona: this.generateFallbackPersona(penName, context),
        avatar_prompt: this.generateFallbackAvatarPrompt(context),
      };
    }
  }

  /**
   * Fallback bio generation
   */
  private generateFallbackBio(penName: string, context: { specializedGenres: string[] }): string {
    const bios = [
      `${penName} là một cây bút bí ẩn chuyên viết ${context.specializedGenres[0]}. Không ai biết danh tính thật của tác giả.`,
      `Tác giả ${penName} nổi tiếng với những tác phẩm ${context.specializedGenres[0]} đầy cuốn hút. Phong cách viết độc đáo và khó đoán.`,
      `${penName} - cái tên quen thuộc trong giới ${context.specializedGenres[0]}. Mỗi tác phẩm đều mang dấu ấn riêng biệt.`,
    ];
    return bios[Math.floor(Math.random() * bios.length)];
  }

  /**
   * Fallback persona generation
   */
  private generateFallbackPersona(
    penName: string,
    context: { archetype: typeof WRITING_STYLE_ARCHETYPES[keyof typeof WRITING_STYLE_ARCHETYPES]; specializedGenres: string[] }
  ): string {
    return `Bạn là ${penName}, một tác giả webnovel chuyên nghiệp. Văn phong của bạn ${context.archetype.description.toLowerCase()}. Khi viết, bạn luôn chú trọng ${context.archetype.traits.join(' và ')}. Thể loại sở trường của bạn là ${context.specializedGenres.join(', ')}.`;
  }

  /**
   * Fallback avatar prompt generation
   */
  private generateFallbackAvatarPrompt(context: { gender: string; age_group: string }): string {
    const genderText = context.gender === 'female' ? 'female' : context.gender === 'male' ? 'male' : '';
    const ageText = context.age_group === 'young' ? 'young' : context.age_group === 'senior' ? 'elderly' : 'middle-aged';

    return `Anime-style portrait of a ${ageText} ${genderText} Asian writer, mysterious aura, traditional chinese aesthetic, dramatic lighting, detailed illustration, artstation quality`;
  }

  /**
   * Generate multiple authors for variety
   */
  async generateAuthorPool(count: number, genres: string[]): Promise<GeneratedAuthor[]> {
    const authors: GeneratedAuthor[] = [];
    const styles: Array<'traditional' | 'modern' | 'mixed'> = ['traditional', 'modern', 'mixed'];
    const genders: Array<'male' | 'female' | 'neutral'> = ['male', 'female', 'neutral'];
    const ages: Array<'young' | 'middle' | 'senior'> = ['young', 'middle', 'senior'];

    for (let i = 0; i < count; i++) {
      const genre = genres[i % genres.length];
      const style = styles[Math.floor(Math.random() * styles.length)];
      const gender = genders[Math.floor(Math.random() * genders.length)];
      const age_group = ages[Math.floor(Math.random() * ages.length)];

      const author = await this.generateAuthor({
        genre,
        style,
        gender,
        age_group,
        specialty_count: 2 + Math.floor(Math.random() * 2), // 2-3 specialties
      });

      authors.push(author);
    }

    return authors;
  }
}

/**
 * Quick author generation without AI (for faster operations)
 */
export function generateQuickAuthor(genre: string): Omit<GeneratedAuthor, 'avatar_prompt'> {
  const generator = new AuthorGenerator();
  const style = ['traditional', 'modern', 'mixed'][Math.floor(Math.random() * 3)] as 'traditional' | 'modern' | 'mixed';
  const gender = ['male', 'female', 'neutral'][Math.floor(Math.random() * 3)] as 'male' | 'female' | 'neutral';

  const name = (generator as any).generatePenName(style, gender);
  const archetypeKey = (generator as any).selectArchetype(genre);
  const archetype = WRITING_STYLE_ARCHETYPES[archetypeKey as keyof typeof WRITING_STYLE_ARCHETYPES];
  const specializedGenres = (generator as any).selectSpecializedGenres(genre, 2);

  return {
    name,
    bio: `${name} là một cây bút bí ẩn chuyên viết ${genre}. Không ai biết danh tính thật của tác giả.`,
    writing_style_description: archetype.description,
    ai_prompt_persona: `Bạn là ${name}, một tác giả webnovel chuyên nghiệp. Văn phong của bạn ${archetype.description.toLowerCase()}. Khi viết, bạn luôn chú trọng ${archetype.traits.join(' và ')}. Thể loại sở trường của bạn là ${specializedGenres.join(', ')}.`,
    specialized_genres: specializedGenres,
  };
}

export function createAuthorGenerator(
  provider: AIProviderType = 'gemini',
  model: string = 'gemini-3-flash-preview'
): AuthorGenerator {
  return new AuthorGenerator(provider, model);
}
