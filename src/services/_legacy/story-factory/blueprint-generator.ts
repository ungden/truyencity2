/**
 * Blueprint Generator - Tự động tạo đề cương truyện hoàn chỉnh
 * Từ 1 ý tưởng đơn giản → đề cương chi tiết 100-500 chương
 */

import {
  StoryIdea,
  StoryBlueprint,
  GeneratedCharacter,
  GeneratedWorld,
  GeneratedPowerSystem,
  PlotOutline,
  GeneratedArc,
  PlannedTwist,
  WritingStyle,
  GenreType
} from './types';
import {
  getGenreTemplate,
  getRandomProtagonist,
  getRandomAntagonist,
  getPowerSystem,
  PROTAGONIST_TEMPLATES,
  ANTAGONIST_TEMPLATES
} from './genre-templates';

// Vietnamese name generators
const VIETNAMESE_SURNAMES = [
  'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng',
  'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'
];

const MALE_NAMES = [
  'Thiên', 'Long', 'Hào', 'Kiệt', 'Phong', 'Vũ', 'Quân', 'Minh', 'Hùng', 'Dũng',
  'Khang', 'Đức', 'Thắng', 'Tuấn', 'Tài', 'Bảo', 'Anh', 'Vinh', 'Hải', 'Nam'
];

const FEMALE_NAMES = [
  'Linh', 'Hương', 'Thảo', 'Ngọc', 'Hà', 'Lan', 'Mai', 'Xuân', 'Thu', 'Tuyết',
  'Uyên', 'Yến', 'Phượng', 'Nhung', 'Hạnh', 'Diễm', 'Quyên', 'Trâm', 'Thy', 'My'
];

// Chinese-style names for cultivation stories
const CULTIVATION_SURNAMES = [
  'Lâm', 'Trương', 'Lưu', 'Triệu', 'Chu', 'Tô', 'Mạc', 'Hứa', 'Tiêu', 'Diệp',
  'Lục', 'Cố', 'Tần', 'Hàn', 'Phùng', 'Đường', 'Tạ', 'Mộ Dung', 'Thượng Quan', 'Âu Dương'
];

const CULTIVATION_MALE_NAMES = [
  'Thiên', 'Vân', 'Phong', 'Hạo', 'Dạ', 'Hàn', 'Vũ', 'Long', 'Kiếm', 'Ngạo',
  'Tuyệt', 'Minh', 'Huyền', 'Linh', 'Khiêu', 'Mặc', 'Thần', 'Thánh', 'Thiên Kiêu', 'Lăng'
];

const CULTIVATION_FEMALE_NAMES = [
  'Tuyết', 'Nguyệt', 'Băng', 'Hàn', 'Dao', 'Lạc', 'Yên', 'Vân', 'Linh', 'Tiên',
  'Hồng', 'Ngọc', 'Lam', 'Thanh', 'Tịch', 'Nhan', 'Y', 'Kỳ', 'Mộng', 'Thiên Hương'
];

/**
 * Blueprint Generator Class
 */
export class BlueprintGenerator {
  private aiProvider: any; // Will be injected

  constructor(aiProvider?: any) {
    this.aiProvider = aiProvider;
  }

  /**
   * Generate a complete story blueprint from an idea
   */
  async generateBlueprint(idea: StoryIdea): Promise<StoryBlueprint> {
    const genre = idea.genre;
    const template = getGenreTemplate(genre);

    // Generate all components
    const protagonist = this.generateProtagonist(genre, idea);
    const antagonists = this.generateAntagonists(genre, idea, 3);
    const supportingCast = this.generateSupportingCast(genre, idea, 5);

    const worldSetting = this.generateWorld(genre, idea);
    const powerSystem = this.generatePowerSystem(genre, idea);

    const plotOutline = this.generatePlotOutline(idea, protagonist, antagonists);
    const arcs = this.generateArcs(idea, plotOutline, protagonist);
    const plannedTwists = this.generateTwists(idea, arcs);

    const writingStyle = this.determineWritingStyle(genre, idea);

    const blueprint: StoryBlueprint = {
      id: `blueprint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      status: 'draft',

      idea,
      genre,
      targetChapters: idea.estimatedChapters,

      protagonist,
      antagonists,
      supportingCast,

      worldSetting,
      powerSystem,

      plotOutline,
      arcs,
      plannedTwists,

      writingStyle,
      authorPersona: this.generateAuthorPersona(genre)
    };

    return blueprint;
  }

  /**
   * Generate protagonist based on genre and idea
   */
  private generateProtagonist(genre: GenreType, idea: StoryIdea): GeneratedCharacter {
    const template = getRandomProtagonist(genre);
    const isCultivation = ['tien-hiep', 'huyen-huyen', 'kiem-hiep'].includes(genre);

    const name = this.generateName('male', isCultivation);
    const age = this.getStartingAge(genre);

    // Generate background based on template
    let background = template.backgroundTemplates[0] || 'Xuất thân bình thường, mang trong mình tiềm năng đặc biệt';
    background = background.replace('{X}', String(Math.floor(Math.random() * 10) + 5));

    return {
      name,
      archetype: template.name,
      age,
      gender: 'male',
      appearance: this.generateAppearance('male', genre),
      personality: template.personalityTraits.join(', '),
      background,
      abilities: template.typicalAbilities,
      weaknesses: template.weaknesses,
      goals: this.generateGoals(template.motivationType),
      secrets: this.generateSecrets(genre),
      relationshipMap: {},
      growthPlan: this.generateGrowthPlan(idea.estimatedChapters, genre)
    };
  }

  /**
   * Generate antagonists
   */
  private generateAntagonists(genre: GenreType, idea: StoryIdea, count: number): GeneratedCharacter[] {
    const antagonists: GeneratedCharacter[] = [];
    const isCultivation = ['tien-hiep', 'huyen-huyen', 'kiem-hiep'].includes(genre);

    const threatLevels: Array<'minor' | 'arc_boss' | 'major' | 'final'> = ['minor', 'arc_boss', 'major'];

    for (let i = 0; i < count; i++) {
      const template = getRandomAntagonist(genre);
      const name = this.generateName('male', isCultivation);

      antagonists.push({
        name,
        archetype: template.name,
        age: 20 + Math.floor(Math.random() * 30),
        gender: 'male',
        appearance: this.generateAppearance('male', genre, 'antagonist'),
        personality: template.personalityTraits.join(', '),
        background: template.backgroundTemplates[0] || 'Xuất thân thế gia lớn',
        abilities: template.typicalAbilities,
        weaknesses: template.weaknesses,
        goals: ['Đánh bại/tiêu diệt nhân vật chính', 'Chiếm đoạt tài nguyên'],
        secrets: ['Có điểm yếu chí mạng'],
        relationshipMap: { 'protagonist': 'Kẻ thù' },
        growthPlan: []
      });
    }

    return antagonists;
  }

  /**
   * Generate supporting cast
   */
  private generateSupportingCast(genre: GenreType, idea: StoryIdea, count: number): GeneratedCharacter[] {
    const cast: GeneratedCharacter[] = [];
    const isCultivation = ['tien-hiep', 'huyen-huyen', 'kiem-hiep'].includes(genre);

    const roles = ['love_interest', 'mentor', 'sidekick', 'rival_friend', 'mysterious_ally'];

    for (let i = 0; i < count; i++) {
      const role = roles[i % roles.length];
      const gender = role === 'love_interest' ? 'female' : (Math.random() > 0.5 ? 'male' : 'female');
      const name = this.generateName(gender, isCultivation);

      cast.push({
        name,
        archetype: this.getRoleArchetype(role),
        age: 16 + Math.floor(Math.random() * 10),
        gender,
        appearance: this.generateAppearance(gender, genre, role),
        personality: this.getRolePersonality(role),
        background: this.getRoleBackground(role, genre),
        abilities: this.getRoleAbilities(role, genre),
        weaknesses: ['Liên quan đến nhân vật chính'],
        goals: this.getRoleGoals(role),
        secrets: [],
        relationshipMap: { 'protagonist': this.getRoleRelationship(role) },
        growthPlan: []
      });
    }

    return cast;
  }

  /**
   * Generate world setting
   */
  private generateWorld(genre: GenreType, idea: StoryIdea): GeneratedWorld {
    const template = getGenreTemplate(genre);
    const settingTemplate = template.settingTemplates[0];

    const worldNames: Record<GenreType, string[]> = {
      'tien-hiep': ['Huyền Thiên Đại Lục', 'Cửu Châu Thần Vực', 'Thái Huyền Giới', 'Vạn Giới'],
      'huyen-huyen': ['Thần Hoang Đại Lục', 'Hỗn Độn Thiên Giới', 'Vô Cực Thần Vực', 'Hồng Hoang'],
      'do-thi': ['Thành phố Hải Đông', 'Đế Đô', 'Kinh Thành', 'Hoa Thành'],
      'kiem-hiep': ['Trung Nguyên', 'Giang Hồ', 'Cửu Châu', 'Võ Lâm'],
      'dong-nhan': ['Thế giới fanfic'],
      'khoa-huyen': ['Liên Minh Tinh Hà', 'Hệ Mặt Trời Mới', 'Vũ Trụ Xa Xôi'],
      'lich-su': ['Đại Việt', 'Đại Minh', 'Đại Đường', 'Đại Tống'],
      'quan-truong': ['Thủ Đô', 'Tỉnh lỵ', 'Quận huyện'],
      'vong-du': ['Thế Giới Thần Vực Online', 'Huyền Ảo Kỷ Nguyên', 'Bất Diệt Chi Vương'],
      'di-gioi': ['Dị Giới', 'Nguyên Giới', 'Thần Giới'],
      'mat-the': ['Tân Kỷ Nguyên', 'Hậu Tận Thế', 'Địa Ngục Trần Gian'],
      'linh-di': ['Âm Dương Giới', 'U Minh', 'Nhân Gian']
    };

    const names = worldNames[genre] || ['Thế Giới'];
    const worldName = names[Math.floor(Math.random() * names.length)];

    return {
      name: worldName,
      type: settingTemplate?.type || 'realm',
      geography: this.generateGeography(genre),
      society: this.generateSociety(genre),
      politics: this.generatePolitics(genre),
      economy: this.generateEconomy(genre),
      culture: this.generateCulture(genre),
      conflicts: settingTemplate?.conflicts || ['Cạnh tranh tài nguyên', 'Chiến tranh thế lực'],
      secrets: this.generateWorldSecrets(genre),
      locations: this.generateLocations(genre, 5)
    };
  }

  /**
   * Generate power system
   */
  private generatePowerSystem(genre: GenreType, idea: StoryIdea): GeneratedPowerSystem {
    const template = getPowerSystem(genre);

    return {
      name: template.name,
      description: `Hệ thống ${template.type} với ${template.levels.length} cảnh giới`,
      levels: template.levels.map(l => ({
        name: l.name,
        requirements: l.breakthroughDifficulty === 'bottleneck'
          ? 'Cần cơ duyên đặc biệt và ngộ tính'
          : 'Tu luyện đủ thời gian và tài nguyên',
        abilities: l.typicalAbilities.join(', ')
      })),
      specializations: template.specializations,
      resources: template.resources,
      limitations: template.limitations,
      mcStartLevel: template.levels[0]?.name || 'Sơ cấp',
      mcEndLevel: template.levels[template.levels.length - 1]?.name || 'Đỉnh phong'
    };
  }

  /**
   * Generate plot outline
   */
  private generatePlotOutline(
    idea: StoryIdea,
    protagonist: GeneratedCharacter,
    antagonists: GeneratedCharacter[]
  ): PlotOutline {
    const mainAntagonist = antagonists.find(a => a.archetype.includes('Âm Mưu')) || antagonists[0];

    return {
      premise: idea.premise,
      incitingIncident: this.generateIncitingIncident(protagonist, idea.genre),
      majorConflicts: [
        `Xung đột với ${antagonists[0]?.name || 'kẻ thù'} - Arc đầu`,
        `Bí mật thân thế bị đe dọa`,
        `Đối đầu thế lực lớn hơn`,
        `Người thân gặp nguy`,
        `Đại chiến cuối cùng với ${mainAntagonist?.name || 'boss cuối'}`
      ],
      climax: `Trận chiến quyết định với ${mainAntagonist?.name || 'kẻ thù cuối cùng'}, ${protagonist.name} bộc lộ toàn bộ sức mạnh`,
      resolution: this.generateResolution(idea.genre),
      themes: idea.hooks || ['Trưởng thành', 'Sức mạnh', 'Công lý'],
      subplots: [
        {
          name: 'Romance',
          description: 'Phát triển tình cảm với nữ chính',
          startChapter: 10,
          endChapter: idea.estimatedChapters
        },
        {
          name: 'Thân phận bí ẩn',
          description: 'Dần dần hé lộ nguồn gốc của nhân vật chính',
          startChapter: 20,
          endChapter: Math.floor(idea.estimatedChapters * 0.7)
        },
        {
          name: 'Thu phục đồng đội',
          description: 'Xây dựng đội ngũ thân tín',
          startChapter: 30,
          endChapter: idea.estimatedChapters
        }
      ]
    };
  }

  /**
   * Generate story arcs
   */
  private generateArcs(
    idea: StoryIdea,
    plotOutline: PlotOutline,
    protagonist: GeneratedCharacter
  ): GeneratedArc[] {
    const totalChapters = idea.estimatedChapters;
    const arcs: GeneratedArc[] = [];

    // Standard arc structure
    const arcTemplates = [
      { name: 'Khởi Đầu', ratio: 0.1, focus: 'Setup và hook' },
      { name: 'Phát Triển Sơ Kỳ', ratio: 0.15, focus: 'Xây dựng nền tảng' },
      { name: 'Thử Thách Đầu', ratio: 0.15, focus: 'Đối đầu kẻ thù đầu tiên' },
      { name: 'Mở Rộng', ratio: 0.2, focus: 'Khám phá thế giới rộng hơn' },
      { name: 'Khủng Hoảng', ratio: 0.15, focus: 'Đối mặt thất bại/mất mát' },
      { name: 'Trỗi Dậy', ratio: 0.1, focus: 'Quay lại mạnh mẽ hơn' },
      { name: 'Cao Trào', ratio: 0.1, focus: 'Đối đầu cuối cùng' },
      { name: 'Kết Thúc', ratio: 0.05, focus: 'Giải quyết và kết thúc' }
    ];

    let currentChapter = 1;

    arcTemplates.forEach((template, index) => {
      const arcChapters = Math.max(10, Math.floor(totalChapters * template.ratio));
      const endChapter = Math.min(currentChapter + arcChapters - 1, totalChapters);

      arcs.push({
        number: index + 1,
        name: `${template.name}`,
        chapterRange: [currentChapter, endChapter],
        premise: `${protagonist.name} ${template.focus.toLowerCase()}`,
        mainConflict: this.generateArcConflict(template.name, idea.genre),
        setting: this.generateArcSetting(template.name, idea.genre),
        newCharacters: this.generateArcNewCharacters(template.name),
        powerUpEvents: this.generatePowerUpEvents(template.name, idea.genre),
        romanticDevelopment: index >= 2 ? this.generateRomanceProgress(index) : undefined,
        conclusion: this.generateArcConclusion(template.name),
        transitionToNext: index < arcTemplates.length - 1
          ? `Manh mối dẫn đến ${arcTemplates[index + 1].name}`
          : 'Kết thúc truyện'
      });

      currentChapter = endChapter + 1;
    });

    return arcs;
  }

  /**
   * Generate planned twists
   */
  private generateTwists(idea: StoryIdea, arcs: GeneratedArc[]): PlannedTwist[] {
    const twists: PlannedTwist[] = [];
    const totalChapters = idea.estimatedChapters;

    // Major twist types with timing
    const twistPlan = [
      { chapter: Math.floor(totalChapters * 0.15), type: 'revelation' as const, impact: 'major' as const },
      { chapter: Math.floor(totalChapters * 0.25), type: 'betrayal' as const, impact: 'major' as const },
      { chapter: Math.floor(totalChapters * 0.4), type: 'identity' as const, impact: 'game_changing' as const },
      { chapter: Math.floor(totalChapters * 0.5), type: 'death' as const, impact: 'major' as const },
      { chapter: Math.floor(totalChapters * 0.6), type: 'return' as const, impact: 'major' as const },
      { chapter: Math.floor(totalChapters * 0.75), type: 'revelation' as const, impact: 'game_changing' as const },
      { chapter: Math.floor(totalChapters * 0.9), type: 'power_up' as const, impact: 'game_changing' as const }
    ];

    twistPlan.forEach((plan, index) => {
      const foreshadowStart = Math.max(1, plan.chapter - 20);

      twists.push({
        chapter: plan.chapter,
        type: plan.type,
        description: this.generateTwistDescription(plan.type, idea.genre),
        foreshadowingChapters: [
          foreshadowStart,
          foreshadowStart + 5,
          foreshadowStart + 10,
          plan.chapter - 5
        ],
        impact: plan.impact
      });
    });

    return twists;
  }

  /**
   * Determine writing style based on genre and idea
   */
  private determineWritingStyle(genre: GenreType, idea: StoryIdea): WritingStyle {
    const template = getGenreTemplate(genre);

    const pacingMap: Record<string, WritingStyle['pacing']> = {
      'tien-hiep': 'fast',
      'do-thi': 'very_fast',
      'huyen-huyen': 'fast',
      'kiem-hiep': 'medium',
      'mat-the': 'fast',
      'linh-di': 'medium'
    };

    return {
      tone: template.toneKeywords,
      pacing: pacingMap[genre] || 'medium',
      dialogueStyle: genre === 'do-thi' ? 'casual' : 'dramatic',
      descriptionLevel: ['tien-hiep', 'huyen-huyen'].includes(genre) ? 'detailed' : 'moderate',
      actionSceneStyle: 'cinematic',
      humorLevel: genre === 'do-thi' ? 'moderate' : 'light'
    };
  }

  /**
   * Generate author persona for consistent voice
   */
  private generateAuthorPersona(genre: GenreType): string {
    const personas: Record<string, string> = {
      'tien-hiep': 'Một tác giả thâm niên trong giới tu tiên văn, văn phong cổ kính nhưng hiện đại, giỏi tạo cao trào và cliffhanger.',
      'do-thi': 'Tác giả chuyên viết sảng văn đô thị, văn phong nhanh gọn, hài hước nhưng không thiếu phần sâu sắc.',
      'huyen-huyen': 'Đại thần huyền huyễn với trí tưởng tượng phong phú, giỏi xây dựng thế giới và hệ thống sức mạnh độc đáo.',
      'kiem-hiep': 'Người kế thừa phong cách Kim Dung, văn phong trang nhã, cốt truyện đan xen phức tạp.',
      'mat-the': 'Chuyên gia thể loại sinh tồn, tạo không khí căng thẳng và kịch tính.',
      'linh-di': 'Bậc thầy kinh dị, thạo tâm lý nhân vật và tạo không khí rùng rợn.'
    };

    return personas[genre] || 'Một tác giả có kinh nghiệm, văn phong đa dạng và linh hoạt.';
  }

  // ==================== HELPER METHODS ====================

  private generateName(gender: 'male' | 'female', isCultivation: boolean): string {
    if (isCultivation) {
      const surname = CULTIVATION_SURNAMES[Math.floor(Math.random() * CULTIVATION_SURNAMES.length)];
      const names = gender === 'male' ? CULTIVATION_MALE_NAMES : CULTIVATION_FEMALE_NAMES;
      const name = names[Math.floor(Math.random() * names.length)];
      return `${surname} ${name}`;
    } else {
      const surname = VIETNAMESE_SURNAMES[Math.floor(Math.random() * VIETNAMESE_SURNAMES.length)];
      const names = gender === 'male' ? MALE_NAMES : FEMALE_NAMES;
      const name = names[Math.floor(Math.random() * names.length)];
      return `${surname} ${name}`;
    }
  }

  private getStartingAge(genre: GenreType): number {
    const ageRanges: Record<string, [number, number]> = {
      'tien-hiep': [14, 18],
      'huyen-huyen': [15, 20],
      'do-thi': [20, 28],
      'kiem-hiep': [16, 22],
      'mat-the': [18, 25],
      'vong-du': [18, 25]
    };
    const range = ageRanges[genre] || [18, 25];
    return range[0] + Math.floor(Math.random() * (range[1] - range[0]));
  }

  private generateAppearance(gender: 'male' | 'female', genre: GenreType, role?: string): string {
    if (gender === 'male') {
      if (role === 'antagonist') {
        return 'Diện mạo anh tuấn nhưng có nét âm trầm, ánh mắt sâu thẳm ẩn chứa dã tâm';
      }
      return 'Dung mạo tuấn tú, thân hình cao ráo, khí chất không phàm, ánh mắt sâu xa như ẩn chứa cả tinh không';
    } else {
      if (role === 'love_interest') {
        return 'Nhan sắc khuynh thành, da trắng như ngọc, đôi mắt trong như nước hồ thu, khí chất thoát tục';
      }
      return 'Dung mạo thanh lệ, khí chất thoát tục, có vẻ đẹp khiến người ta phải ngước nhìn';
    }
  }

  private generateGoals(motivation: string): string[] {
    const goals: Record<string, string[]> = {
      'revenge': ['Trả thù kẻ đã hại mình', 'Bảo vệ người thân', 'Đạt đến đỉnh phong'],
      'protection': ['Bảo vệ gia đình', 'Mạnh lên để không ai có thể uy hiếp', 'Xây dựng thế lực'],
      'power': ['Đạt đến cảnh giới tối cao', 'Vượt qua mọi giới hạn', 'Trở thành cường giả đỉnh phong'],
      'freedom': ['Thoát khỏi ràng buộc', 'Sống tự do theo ý mình', 'Không ai có thể kiểm soát'],
      'love': ['Bảo vệ người mình yêu', 'Có sức mạnh để ở bên người ấy', 'Xây dựng tương lai'],
      'justice': ['Trừng trị kẻ ác', 'Bảo vệ người yếu', 'Lập lại công lý']
    };
    return goals[motivation] || goals['power'];
  }

  private generateSecrets(genre: GenreType): string[] {
    return [
      'Ẩn giấu thân phận thực sự',
      'Có golden finger/hệ thống bí mật',
      'Liên quan đến sự kiện lớn trong quá khứ'
    ];
  }

  private generateGrowthPlan(totalChapters: number, genre: GenreType): { chapter: number; development: string }[] {
    const milestones = [
      { ratio: 0.1, development: 'Giác tỉnh/phát hiện tiềm năng' },
      { ratio: 0.2, development: 'Đạt được sức mạnh đầu tiên' },
      { ratio: 0.35, development: 'Vượt qua thử thách lớn, đột phá' },
      { ratio: 0.5, development: 'Trở thành cường giả tầm trung' },
      { ratio: 0.7, development: 'Tiến vào hàng ngũ đỉnh phong' },
      { ratio: 0.9, development: 'Đạt đến cảnh giới cực hạn' },
      { ratio: 1.0, development: 'Siêu việt, đạt đỉnh cao mới' }
    ];

    return milestones.map(m => ({
      chapter: Math.floor(totalChapters * m.ratio),
      development: m.development
    }));
  }

  private getRoleArchetype(role: string): string {
    const archetypes: Record<string, string> = {
      'love_interest': 'Nữ Chính - Thiên Kim Tiểu Thư/Nữ Hiệp',
      'mentor': 'Sư Phụ - Cao Nhân Ẩn Thế',
      'sidekick': 'Bằng Hữu - Trung Thành Huynh Đệ',
      'rival_friend': 'Tình Địch/Đối Thủ - Thiên Tài Đồng Trang Lứa',
      'mysterious_ally': 'Đồng Minh Bí Ẩn - Người Có Mục Đích Riêng'
    };
    return archetypes[role] || 'Nhân Vật Phụ';
  }

  private getRolePersonality(role: string): string {
    const personalities: Record<string, string> = {
      'love_interest': 'Thông minh, mạnh mẽ, có chủ kiến nhưng cũng có lúc dịu dàng',
      'mentor': 'Trầm mặc, thâm trầm, ẩn chứa sức mạnh khủng khiếp',
      'sidekick': 'Vui vẻ, trung thành, sẵn sàng hy sinh vì bạn',
      'rival_friend': 'Kiêu ngạo nhưng chính trực, cạnh tranh lành mạnh',
      'mysterious_ally': 'Bí ẩn, khó đoán, có agenda riêng'
    };
    return personalities[role] || 'Đa dạng';
  }

  private getRoleBackground(role: string, genre: GenreType): string {
    const backgrounds: Record<string, string> = {
      'love_interest': 'Xuất thân cao quý, có bối cảnh gia tộc/môn phái mạnh',
      'mentor': 'Cường giả ẩn thế, có quá khứ huy hoàng',
      'sidekick': 'Xuất thân bình thường, gặp MC khi khó khăn được giúp đỡ',
      'rival_friend': 'Thiên tài của thế lực khác, cạnh tranh với MC',
      'mysterious_ally': 'Bối cảnh bí ẩn, mục đích không rõ ràng'
    };
    return backgrounds[role] || 'Bình thường';
  }

  private getRoleAbilities(role: string, genre: GenreType): string[] {
    const abilities: Record<string, string[]> = {
      'love_interest': ['Tài năng đặc biệt', 'Xuất thân mang lại tài nguyên'],
      'mentor': ['Sức mạnh đỉnh phong', 'Tri thức uyên bác', 'Nhân mạch rộng'],
      'sidekick': ['Kỹ năng hỗ trợ', 'Thu thập thông tin', 'Trung thành tuyệt đối'],
      'rival_friend': ['Thiên phú cao', 'Cạnh tranh kích thích MC tiến bộ'],
      'mysterious_ally': ['Năng lực đặc biệt', 'Thông tin bí mật']
    };
    return abilities[role] || ['Hỗ trợ MC'];
  }

  private getRoleGoals(role: string): string[] {
    const goals: Record<string, string[]> = {
      'love_interest': ['Ở bên MC', 'Chứng minh bản thân', 'Bảo vệ gia tộc'],
      'mentor': ['Truyền thừa', 'Giải quyết ân oán cũ', 'Hướng dẫn MC'],
      'sidekick': ['Theo MC', 'Được MC công nhận', 'Trở nên mạnh hơn'],
      'rival_friend': ['Vượt qua MC', 'Đạt đến đỉnh phong', 'Được công nhận'],
      'mysterious_ally': ['Mục đích bí mật', 'Sử dụng MC', 'Đạt được điều gì đó']
    };
    return goals[role] || ['Hỗ trợ cốt truyện'];
  }

  private getRoleRelationship(role: string): string {
    const relationships: Record<string, string> = {
      'love_interest': 'Tình cảm lãng mạn, phát triển từ từ',
      'mentor': 'Sư đồ, kính trọng và tin tưởng',
      'sidekick': 'Huynh đệ, trung thành tuyệt đối',
      'rival_friend': 'Đối thủ nhưng tôn trọng lẫn nhau',
      'mysterious_ally': 'Hợp tác tạm thời, đề phòng lẫn nhau'
    };
    return relationships[role] || 'Bình thường';
  }

  private generateGeography(genre: GenreType): string {
    const geographies: Record<string, string> = {
      'tien-hiep': 'Đại lục bao la với 5 đại khu vực, mỗi khu vực có linh mạch và tông môn khác nhau. Có bí cảnh, di tích thượng cổ rải rác.',
      'huyen-huyen': 'Đại lục vô tận với nhiều vùng đất bí ẩn, có chỗ là hoang mạc, có nơi là rừng già, đầy nguy hiểm và cơ hội.',
      'do-thi': 'Thành phố hiện đại với các quận huyện, khu thương mại, khu dân cư cao cấp và bình dân, ngầm có thế giới ẩn.',
      'kiem-hiep': 'Trung Nguyên rộng lớn với các bang phái, môn phái nằm rải rác trên núi cao, thung lũng, thành trì.',
      'mat-the': 'Thành phố đổ nát sau thảm họa, vùng an toàn ít ỏi, ngoại vi là vùng nguy hiểm đầy quái vật.'
    };
    return geographies[genre] || 'Thế giới rộng lớn với nhiều vùng đất chưa được khám phá';
  }

  private generateSociety(genre: GenreType): string {
    const societies: Record<string, string> = {
      'tien-hiep': 'Xã hội tu tiên với tông môn, gia tộc, thế lực. Cường giả được tôn kính, yếu giả bị chèn ép. Luật rừng là quy tắc.',
      'huyen-huyen': 'Chế độ quân chủ kết hợp thế lực tu luyện. Đế quốc, vương quốc, gia tộc cổ đan xen tranh giành.',
      'do-thi': 'Xã hội hiện đại với tầng lớp rõ ràng. Giới thượng lưu nắm quyền lực, ngầm có các gia tộc và thế lực đặc biệt.',
      'kiem-hiep': 'Giang hồ với các bang phái, triều đình can thiệp nhưng không kiểm soát hoàn toàn võ lâm.'
    };
    return societies[genre] || 'Xã hội phân cấp rõ ràng, cường giả được tôn trọng';
  }

  private generatePolitics(genre: GenreType): string {
    return 'Các thế lực lớn cân bằng quyền lực, âm mưu đan xen, liên minh thay đổi theo lợi ích';
  }

  private generateEconomy(genre: GenreType): string {
    const economies: Record<string, string> = {
      'tien-hiep': 'Linh thạch là tiền tệ chính, đan dược và pháp bảo có giá trị cao. Đấu giá và trao đổi phổ biến.',
      'do-thi': 'Kinh tế thị trường, tiền bạc và quyền lực gắn liền, các tập đoàn gia tộc kiểm soát ngành công nghiệp.',
      'huyen-huyen': 'Tinh thạch, huyết tinh, tài nguyên từ dị thú là hàng hóa quan trọng.'
    };
    return economies[genre] || 'Kinh tế dựa trên tài nguyên và sức mạnh';
  }

  private generateCulture(genre: GenreType): string {
    const cultures: Record<string, string> = {
      'tien-hiep': 'Văn hóa tu tiên đề cao việc truy cầu trường sinh, tôn sư trọng đạo, nhưng cũng thực dụng và cạnh tranh.',
      'do-thi': 'Văn hóa hiện đại với yếu tố truyền thống, trọng tiền bạc và địa vị xã hội.',
      'kiem-hiep': 'Văn hóa hiệp nghĩa, trọng danh dự và lời hứa, ân oán phân minh.'
    };
    return cultures[genre] || 'Văn hóa đa dạng, tôn trọng sức mạnh và trí tuệ';
  }

  private generateWorldSecrets(genre: GenreType): string[] {
    return [
      'Bí mật về nguồn gốc thế giới',
      'Thế lực ẩn giấu đứng sau mọi thứ',
      'Di tích của văn minh cổ đại',
      'Liên quan đến thân phận MC'
    ];
  }

  private generateLocations(genre: GenreType, count: number): Array<{
    name: string;
    type: string;
    description: string;
    significance: string;
  }> {
    const locationTypes = ['Tông môn', 'Thành phố', 'Bí cảnh', 'Di tích', 'Rừng/Núi'];

    return locationTypes.slice(0, count).map((type, i) => ({
      name: `${type} ${i + 1}`,
      type,
      description: `Địa điểm quan trọng trong cốt truyện`,
      significance: `Arc ${i + 1} diễn ra tại đây`
    }));
  }

  private generateIncitingIncident(protagonist: GeneratedCharacter, genre: GenreType): string {
    const incidents: Record<string, string> = {
      'tien-hiep': `${protagonist.name} phát hiện ra thể chất đặc biệt/được hệ thống/gặp cao nhân, từ đó bắt đầu con đường tu tiên`,
      'do-thi': `Một sự kiện bất ngờ khiến ${protagonist.name} lộ thân phận thực sự/giác tỉnh năng lực`,
      'huyen-huyen': `${protagonist.name} trong lúc nguy hiểm đã giác tỉnh huyết mạch cổ xưa`,
      'mat-the': `Thảm họa ập đến, ${protagonist.name} phải sinh tồn và bảo vệ người thân`
    };
    return incidents[genre] || `Sự kiện thay đổi cuộc đời ${protagonist.name}`;
  }

  private generateResolution(genre: GenreType): string {
    const resolutions: Record<string, string> = {
      'tien-hiep': 'Đạt đến cảnh giới tối cao, giải quyết mọi ân oán, phi thăng hoặc trở thành tồn tại đỉnh phong',
      'do-thi': 'Đứng đầu thế giới, bảo vệ được người thân, xây dựng đế chế của riêng mình',
      'huyen-huyen': 'Siêu việt tất cả, trở thành huyền thoại của thế giới',
      'kiem-hiep': 'Trở thành võ lâm chí tôn, ân oán giang hồ đã xóa sạch, cùng người yêu ẩn cư'
    };
    return resolutions[genre] || 'Đạt được mục tiêu, sống cuộc sống mong muốn';
  }

  private generateArcConflict(arcName: string, genre: GenreType): string {
    const conflicts: Record<string, string> = {
      'Khởi Đầu': 'Đối đầu với kẻ thù đầu tiên trong phạm vi nhỏ',
      'Phát Triển Sơ Kỳ': 'Cạnh tranh tài nguyên và vị trí trong tổ chức',
      'Thử Thách Đầu': 'Đối mặt boss arc đầu tiên',
      'Mở Rộng': 'Xung đột với thế lực lớn hơn',
      'Khủng Hoảng': 'Thất bại lớn, mất mát quan trọng',
      'Trỗi Dậy': 'Lấy lại những gì đã mất, mạnh hơn trước',
      'Cao Trào': 'Đối đầu cuối cùng với big boss',
      'Kết Thúc': 'Giải quyết mọi vấn đề còn lại'
    };
    return conflicts[arcName] || 'Xung đột với thế lực đối địch';
  }

  private generateArcSetting(arcName: string, genre: GenreType): string {
    const settings: Record<string, string> = {
      'Khởi Đầu': 'Quê hương/tổ chức ban đầu',
      'Phát Triển Sơ Kỳ': 'Tông môn/công ty/tổ chức chính',
      'Thử Thách Đầu': 'Bí cảnh/địa điểm thử thách',
      'Mở Rộng': 'Vùng đất mới, phạm vi rộng hơn',
      'Khủng Hoảng': 'Địa điểm của thế lực đối địch',
      'Trỗi Dậy': 'Nơi MC rèn luyện và trở lại',
      'Cao Trào': 'Chiến trường quyết định',
      'Kết Thúc': 'Khắp nơi - tổng kết'
    };
    return settings[arcName] || 'Địa điểm mới';
  }

  private generateArcNewCharacters(arcName: string): string[] {
    const counts: Record<string, number> = {
      'Khởi Đầu': 3,
      'Phát Triển Sơ Kỳ': 4,
      'Thử Thách Đầu': 2,
      'Mở Rộng': 5,
      'Khủng Hoảng': 2,
      'Trỗi Dậy': 2,
      'Cao Trào': 1,
      'Kết Thúc': 0
    };
    const count = counts[arcName] || 2;
    return Array(count).fill(0).map((_, i) => `Nhân vật mới ${i + 1}`);
  }

  private generatePowerUpEvents(arcName: string, genre: GenreType): string[] {
    const events: Record<string, string[]> = {
      'Khởi Đầu': ['Giác tỉnh tiềm năng', 'Đột phá sơ cấp'],
      'Phát Triển Sơ Kỳ': ['Học được bí kíp', 'Đột phá tầng mới'],
      'Thử Thách Đầu': ['Thu hoạch từ bí cảnh', 'Đột phá trong chiến đấu'],
      'Mở Rộng': ['Lĩnh ngộ mới', 'Nâng cấp vũ khí'],
      'Khủng Hoảng': ['Giữ vững không lùi'],
      'Trỗi Dậy': ['Đột phá lớn', 'Lĩnh ngộ sâu sắc'],
      'Cao Trào': ['Bùng nổ sức mạnh cực hạn'],
      'Kết Thúc': ['Đạt đến đỉnh phong']
    };
    return events[arcName] || ['Nâng cấp sức mạnh'];
  }

  private generateRomanceProgress(arcIndex: number): string {
    const progress = [
      'Gặp gỡ, ấn tượng đầu',
      'Cùng nhau trải qua khó khăn',
      'Hiểu nhau hơn, tình cảm nảy nở',
      'Xác nhận quan hệ',
      'Thử thách tình cảm',
      'Vượt qua, gắn bó hơn',
      'Cùng nhau đối mặt cuối cùng',
      'Happy ending'
    ];
    return progress[arcIndex] || 'Phát triển tình cảm';
  }

  private generateArcConclusion(arcName: string): string {
    const conclusions: Record<string, string> = {
      'Khởi Đầu': 'MC chứng minh tiềm năng, bước vào con đường mới',
      'Phát Triển Sơ Kỳ': 'MC xác lập vị trí, chuẩn bị cho thử thách lớn',
      'Thử Thách Đầu': 'MC vượt qua thử thách, danh tiếng lan rộng',
      'Mở Rộng': 'MC mở rộng tầm ảnh hưởng, chuẩn bị đối đầu kẻ thù lớn',
      'Khủng Hoảng': 'MC thất bại nhưng tìm được cách trỗi dậy',
      'Trỗi Dậy': 'MC quay lại mạnh mẽ hơn bao giờ hết',
      'Cao Trào': 'MC đánh bại boss cuối, giải quyết xung đột chính',
      'Kết Thúc': 'Mọi thứ được giải quyết, MC đạt được mục tiêu'
    };
    return conclusions[arcName] || 'Kết thúc arc';
  }

  private generateTwistDescription(type: string, genre: GenreType): string {
    const twists: Record<string, string[]> = {
      'revelation': [
        'Hé lộ bí mật về thân phận MC',
        'Sự thật về thế giới được tiết lộ',
        'Kẻ thù thực sự lộ mặt'
      ],
      'betrayal': [
        'Người thân cận phản bội',
        'Đồng minh có mục đích khác',
        'Sư phụ/mentor có bí mật đen tối'
      ],
      'identity': [
        'MC là hậu nhân của nhân vật huyền thoại',
        'MC có huyết mạch đặc biệt',
        'Thân phận thực sự của MC được tiết lộ'
      ],
      'death': [
        'Một nhân vật quan trọng hy sinh',
        'Cái chết giả để lừa kẻ thù',
        'MC giả chết để tu luyện bí mật'
      ],
      'return': [
        'Nhân vật tưởng chết quay lại',
        'Kẻ thù cũ xuất hiện với sức mạnh mới',
        'Sư phụ/mentor quay lại giúp đỡ'
      ],
      'power_up': [
        'MC giác ngộ sức mạnh tiềm ẩn',
        'Đột phá bất ngờ trong lúc nguy cấp',
        'Thu được kế thừa cổ xưa'
      ]
    };
    const options = twists[type] || ['Twist bất ngờ'];
    return options[Math.floor(Math.random() * options.length)];
  }
}

// Export singleton instance
export const blueprintGenerator = new BlueprintGenerator();
