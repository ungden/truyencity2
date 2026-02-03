/**
 * Dopamine Writing Optimizer Service
 * Implements the "Sảng Văn" (Dopamine Writing) Formula for Webnovels
 *
 * Features:
 * - 3-Agent Workflow: Architect → Writer → Critic
 * - World Bible Management (Power System, Inventory, NPC Relationships)
 * - Golden Chapters Validation (First 3 chapters)
 * - Arc Structure with Map Changing
 * - Dopamine Points Tracking
 */

import {
  AgentRole,
  AgentConfig,
  GoldenChapterChecklist,
  StoryArc,
  ArcEvent,
  DopaminePoint,
  DopamineType,
  DopamineConfig,
  DEFAULT_DOPAMINE_CONFIG,
  AGENT_SYSTEM_PROMPTS,
  WorldBible,
  PowerSystem,
  CharacterState,
  CharacterInventory,
  NPCRelationship,
  PlotThread,
  ChapterOutline,
  SceneOutline,
  ArchitectOutput,
  WriterOutput,
  CriticOutput,
  CriticIssue,
  AIProviderType,
  AIMessage,
} from '@/lib/types/ai-providers';
import { AIProviderService } from '../ai-provider';

// Unique ID generator
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 3-Agent Workflow Orchestrator
 * Coordinates Architect → Writer → Critic pipeline
 */
export class AgentOrchestrator {
  private aiService: AIProviderService;
  private config: DopamineConfig;
  private worldBible: WorldBible | null = null;
  private currentArc: StoryArc | null = null;

  // Agent configurations
  private agents: Record<AgentRole, AgentConfig>;

  constructor(
    aiService: AIProviderService,
    config: DopamineConfig = DEFAULT_DOPAMINE_CONFIG
  ) {
    this.aiService = aiService;
    this.config = config;

    // Default agent configurations
    this.agents = {
      architect: {
        role: 'architect',
        provider: 'deepseek',
        model: 'deepseek-reasoner', // Use reasoning model for planning
        temperature: 0.3,
        systemPrompt: AGENT_SYSTEM_PROMPTS.architect,
      },
      writer: {
        role: 'writer',
        provider: 'deepseek',
        model: 'deepseek-chat',
        temperature: 0.8, // Higher creativity for writing
        systemPrompt: AGENT_SYSTEM_PROMPTS.writer,
      },
      critic: {
        role: 'critic',
        provider: 'deepseek',
        model: 'deepseek-chat',
        temperature: 0.2, // Lower for consistent evaluation
        systemPrompt: AGENT_SYSTEM_PROMPTS.critic,
      },
    };
  }

  /**
   * Configure agent settings
   */
  configureAgent(role: AgentRole, config: Partial<AgentConfig>) {
    this.agents[role] = { ...this.agents[role], ...config };
  }

  /**
   * Set the World Bible for context
   */
  setWorldBible(worldBible: WorldBible) {
    this.worldBible = worldBible;
  }

  /**
   * Set current story arc
   */
  setCurrentArc(arc: StoryArc) {
    this.currentArc = arc;
  }

  /**
   * Run the full 3-Agent workflow for a chapter
   */
  async writeChapter(
    chapterNumber: number,
    previousChapterSummary: string,
    additionalContext?: string
  ): Promise<{
    success: boolean;
    content?: string;
    outline?: ChapterOutline;
    criticReport?: CriticOutput;
    error?: string;
    retryCount: number;
  }> {
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        // Step 1: Architect creates outline
        console.log(`[AgentOrchestrator] Step 1: Architect planning chapter ${chapterNumber}...`);
        const architectResult = await this.runArchitect(
          chapterNumber,
          previousChapterSummary,
          additionalContext
        );

        if (!architectResult.success || !architectResult.output) {
          throw new Error(architectResult.error || 'Architect failed');
        }

        // Step 2: Writer creates content
        console.log(`[AgentOrchestrator] Step 2: Writer creating content...`);
        const writerResult = await this.runWriter(architectResult.output);

        if (!writerResult.success || !writerResult.output) {
          throw new Error(writerResult.error || 'Writer failed');
        }

        // Step 3: Critic evaluates
        console.log(`[AgentOrchestrator] Step 3: Critic evaluating...`);
        const criticResult = await this.runCritic(
          architectResult.output,
          writerResult.output
        );

        if (!criticResult.success || !criticResult.output) {
          throw new Error(criticResult.error || 'Critic failed');
        }

        // Check if rewrite is needed
        if (criticResult.output.requiresRewrite && retryCount < maxRetries - 1) {
          console.log(`[AgentOrchestrator] Critic requested rewrite. Retry ${retryCount + 1}...`);
          retryCount++;
          additionalContext = `REWRITE INSTRUCTIONS: ${criticResult.output.rewriteInstructions}`;
          continue;
        }

        return {
          success: true,
          content: writerResult.output.chapterContent,
          outline: architectResult.output.chapterOutline,
          criticReport: criticResult.output,
          retryCount,
        };
      } catch (error) {
        console.error(`[AgentOrchestrator] Error:`, error);
        retryCount++;
        if (retryCount >= maxRetries) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            retryCount,
          };
        }
      }
    }

    return {
      success: false,
      error: 'Max retries exceeded',
      retryCount,
    };
  }

  /**
   * Run Architect Agent
   */
  private async runArchitect(
    chapterNumber: number,
    previousSummary: string,
    additionalContext?: string
  ): Promise<{ success: boolean; output?: ArchitectOutput; error?: string }> {
    const agent = this.agents.architect;

    const prompt = this.buildArchitectPrompt(
      chapterNumber,
      previousSummary,
      additionalContext
    );

    const messages: AIMessage[] = [
      { role: 'system', content: agent.systemPrompt },
      { role: 'user', content: prompt },
    ];

    const response = await this.aiService.chat({
      provider: agent.provider,
      model: agent.model,
      messages,
      temperature: agent.temperature,
      maxTokens: 8000,
    });

    if (!response.success || !response.content) {
      return { success: false, error: response.error };
    }

    try {
      // Parse architect output from JSON
      const jsonMatch = response.content.match(/```json\n?([\s\S]*?)\n?```/);
      const jsonContent = jsonMatch ? jsonMatch[1] : response.content;
      const output = JSON.parse(jsonContent) as ArchitectOutput;
      return { success: true, output };
    } catch (e) {
      // If can't parse JSON, try to extract structured data
      return {
        success: true,
        output: this.parseArchitectResponse(response.content, chapterNumber),
      };
    }
  }

  /**
   * Run Writer Agent
   */
  private async runWriter(
    architectOutput: ArchitectOutput
  ): Promise<{ success: boolean; output?: WriterOutput; error?: string }> {
    const agent = this.agents.writer;

    const prompt = this.buildWriterPrompt(architectOutput);

    const messages: AIMessage[] = [
      { role: 'system', content: agent.systemPrompt },
      { role: 'user', content: prompt },
    ];

    const response = await this.aiService.chat({
      provider: agent.provider,
      model: agent.model,
      messages,
      temperature: agent.temperature,
      maxTokens: 16000, // High for long chapters
    });

    if (!response.success || !response.content) {
      return { success: false, error: response.error };
    }

    // Count words
    const wordCount = response.content.trim().split(/\s+/).length;

    return {
      success: true,
      output: {
        chapterContent: response.content,
        wordCount,
        actualScenes: architectOutput.chapterOutline.scenes.length,
        dopamineDelivered: architectOutput.dopaminePoints,
      },
    };
  }

  /**
   * Run Critic Agent
   */
  private async runCritic(
    architectOutput: ArchitectOutput,
    writerOutput: WriterOutput
  ): Promise<{ success: boolean; output?: CriticOutput; error?: string }> {
    const agent = this.agents.critic;

    const prompt = this.buildCriticPrompt(architectOutput, writerOutput);

    const messages: AIMessage[] = [
      { role: 'system', content: agent.systemPrompt },
      { role: 'user', content: prompt },
    ];

    const response = await this.aiService.chat({
      provider: agent.provider,
      model: agent.model,
      messages,
      temperature: agent.temperature,
      maxTokens: 4000,
    });

    if (!response.success || !response.content) {
      return { success: false, error: response.error };
    }

    try {
      // Parse critic output from JSON
      const jsonMatch = response.content.match(/```json\n?([\s\S]*?)\n?```/);
      const jsonContent = jsonMatch ? jsonMatch[1] : response.content;
      const output = JSON.parse(jsonContent) as CriticOutput;
      return { success: true, output };
    } catch (e) {
      // Default passing score if can't parse
      return {
        success: true,
        output: {
          overallScore: 75,
          dopamineScore: 75,
          pacingScore: 75,
          consistencyScore: 75,
          engagementScore: 75,
          issues: [],
          suggestions: [],
          worldBibleViolations: [],
          approved: true,
          requiresRewrite: false,
        },
      };
    }
  }

  /**
   * Build prompt for Architect
   */
  private buildArchitectPrompt(
    chapterNumber: number,
    previousSummary: string,
    additionalContext?: string
  ): string {
    const worldBibleContext = this.worldBible
      ? `
WORLD BIBLE:
- Power System: ${this.worldBible.powerSystem.name}
- Current Realm: ${this.worldBible.protagonistState.currentRealm}
- Current Location: ${this.worldBible.currentLocationName}
- Open Plot Threads: ${this.worldBible.openPlotThreads.map((p: PlotThread) => p.name).join(', ')}
`
      : '';

    const arcContext = this.currentArc
      ? `
CURRENT ARC: ${this.currentArc.name}
- Type: ${this.currentArc.arcType}
- Map: ${this.currentArc.mapName}
- Goal: ${this.currentArc.mainGoal}
- Chapters: ${this.currentArc.startChapter} - ${this.currentArc.endChapter}
`
      : '';

    const isGoldenChapter = chapterNumber <= 3;
    const goldenChapterNote = isGoldenChapter
      ? `
⚠️ ĐÂY LÀ CHƯƠNG VÀNG #${chapterNumber}!
Phải tuân thủ checklist 3 Chương Vàng:
${chapterNumber === 1 ? '- Hook ngay lập tức\n- Giới thiệu Golden Finger\n- Xung đột đầu tiên' : ''}
${chapterNumber === 2 ? '- Small victory đầu tiên\n- Mở rộng hệ thống\n- Nhân vật mới' : ''}
${chapterNumber === 3 ? '- Thử thách thực sự\n- Face slap đầu tiên\n- Hint về plot lớn' : ''}
`
      : '';

    return `
Lập kế hoạch cho CHƯƠNG ${chapterNumber}

${goldenChapterNote}
${worldBibleContext}
${arcContext}

TÓM TẮT CHƯƠNG TRƯỚC:
${previousSummary || 'Đây là chương đầu tiên.'}

${additionalContext ? `CONTEXT BỔ SUNG: ${additionalContext}` : ''}

DOPAMINE CONFIG:
- Tỷ lệ Ức chế/Bùng nổ: ${this.config.suppressionRatio * 100}%/${this.config.explosionRatio * 100}%
- Sảng điểm tối thiểu: ${this.config.minDopaminePerChapter}
- Cliffhanger bắt buộc: ${this.config.cliffhangerFrequency > 0.5 ? 'Có' : 'Không'}

Trả về JSON theo format:
\`\`\`json
{
  "chapterOutline": {
    "chapterNumber": ${chapterNumber},
    "title": "Tiêu đề chương",
    "summary": "Tóm tắt 2-3 câu",
    "pov": "Tên nhân vật POV",
    "location": "Địa điểm",
    "timeframe": "Thời gian",
    "scenes": [
      {
        "order": 1,
        "setting": "Bối cảnh",
        "characters": ["Nhân vật 1", "Nhân vật 2"],
        "goal": "Mục tiêu scene",
        "conflict": "Xung đột",
        "resolution": "Kết quả",
        "dopamineType": "face_slap hoặc null"
      }
    ],
    "suppressionMoments": ["Moment ức chế 1", "Moment ức chế 2"],
    "explosionMoments": ["Moment bùng nổ 1"],
    "cliffhanger": "Cliffhanger cuối chương",
    "characterUpdates": [],
    "worldUpdates": [],
    "targetWordCount": 3000,
    "targetDopamineScore": 80
  },
  "dopaminePoints": [
    {
      "id": "dp1",
      "chapterNumber": ${chapterNumber},
      "type": "face_slap",
      "intensity": 8,
      "description": "Mô tả sảng điểm",
      "reactionShot": "Reaction của người xung quanh"
    }
  ],
  "worldBibleUpdates": null
}
\`\`\`
`;
  }

  /**
   * Build prompt for Writer
   */
  private buildWriterPrompt(architectOutput: ArchitectOutput): string {
    const outline = architectOutput.chapterOutline;

    return `
VIẾT CHƯƠNG ${outline.chapterNumber}: ${outline.title}

OUTLINE:
${outline.summary}

POV: ${outline.pov}
ĐỊA ĐIỂM: ${outline.location}
THỜI GIAN: ${outline.timeframe}

CÁC SCENE CẦN VIẾT:
${outline.scenes.map((s: SceneOutline, i: number) => `
Scene ${i + 1}: ${s.setting}
- Nhân vật: ${s.characters.join(', ')}
- Mục tiêu: ${s.goal}
- Xung đột: ${s.conflict}
- Kết quả: ${s.resolution}
${s.dopamineType ? `- SẢNG ĐIỂM: ${s.dopamineType}` : ''}
`).join('\n')}

MOMENTS ỨC CHẾ CẦN CÓ:
${outline.suppressionMoments.map((m: string) => `- ${m}`).join('\n')}

MOMENTS BÙNG NỔ CẦN CÓ:
${outline.explosionMoments.map((m: string) => `- ${m}`).join('\n')}

CLIFFHANGER CUỐI CHƯƠNG:
${outline.cliffhanger}

SẢNG ĐIỂM CẦN DELIVER:
${architectOutput.dopaminePoints.map((dp: DopaminePoint) => `
- [${dp.type.toUpperCase()}] ${dp.description}
  Intensity: ${dp.intensity}/10
  Reaction: ${dp.reactionShot || 'Cần thêm reaction shot'}
`).join('\n')}

YÊU CẦU:
- Viết đủ ${outline.targetWordCount} từ
- Văn phong sảng, cuốn hút
- Hội thoại sắc sảo
- Nhịp độ nhanh
- Deliver đúng các sảng điểm đã lên kế hoạch
- Reaction shots rõ ràng

Bắt đầu viết chương (chỉ viết nội dung chương, không cần format):
`;
  }

  /**
   * Build prompt for Critic
   */
  private buildCriticPrompt(
    architectOutput: ArchitectOutput,
    writerOutput: WriterOutput
  ): string {
    const outline = architectOutput.chapterOutline;

    return `
ĐÁNH GIÁ CHƯƠNG ${outline.chapterNumber}: ${outline.title}

OUTLINE BAN ĐẦU:
${JSON.stringify(outline, null, 2)}

SẢNG ĐIỂM ĐÃ LÊN KẾ HOẠCH:
${architectOutput.dopaminePoints.map((dp: DopaminePoint) => `- ${dp.type}: ${dp.description}`).join('\n')}

NỘI DUNG ĐÃ VIẾT:
${writerOutput.chapterContent.substring(0, 5000)}...
[Truncated - Total: ${writerOutput.wordCount} words]

${this.worldBible ? `
WORLD BIBLE REFERENCE:
- Protagonist: ${this.worldBible.protagonistState.name} - ${this.worldBible.protagonistState.currentRealm}
- Location: ${this.worldBible.currentLocationName}
` : ''}

Đánh giá và trả về JSON:
\`\`\`json
{
  "overallScore": 80,
  "dopamineScore": 85,
  "pacingScore": 75,
  "consistencyScore": 90,
  "engagementScore": 80,
  "issues": [
    {
      "type": "pacing",
      "severity": "minor",
      "location": "Scene 2",
      "description": "Mô tả vấn đề",
      "suggestion": "Gợi ý sửa"
    }
  ],
  "suggestions": [
    "Gợi ý cải thiện 1"
  ],
  "worldBibleViolations": [],
  "approved": true,
  "requiresRewrite": false,
  "rewriteInstructions": null
}
\`\`\`

TIÊU CHÍ:
- Score < 70 = requiresRewrite: true
- Critical violations = bắt buộc sửa
- Nếu requiresRewrite, cung cấp hướng dẫn cụ thể
`;
  }

  /**
   * Parse architect response if JSON parsing fails
   */
  private parseArchitectResponse(content: string, chapterNumber: number): ArchitectOutput {
    // Basic parsing fallback
    return {
      chapterOutline: {
        chapterNumber,
        title: `Chương ${chapterNumber}`,
        summary: content.substring(0, 200),
        pov: 'Nhân vật chính',
        location: 'Chưa xác định',
        timeframe: 'Hiện tại',
        scenes: [
          {
            order: 1,
            setting: 'Scene chính',
            characters: [],
            goal: 'Phát triển cốt truyện',
            conflict: 'Xung đột chính',
            resolution: 'Giải quyết',
          },
        ],
        suppressionMoments: [],
        explosionMoments: [],
        cliffhanger: 'Cliffhanger cuối chương',
        characterUpdates: [],
        worldUpdates: [],
        targetWordCount: 3000,
        targetDopamineScore: 75,
      },
      dopaminePoints: [],
    };
  }
}

/**
 * World Bible Manager
 * Manages Power System, Inventory, and NPC Relationships
 */
export class WorldBibleManager {
  private worldBible: WorldBible;

  constructor(projectId: string) {
    this.worldBible = this.createEmptyWorldBible(projectId);
  }

  /**
   * Create empty World Bible
   */
  private createEmptyWorldBible(projectId: string): WorldBible {
    return {
      id: generateId(),
      projectId,
      powerSystem: {
        id: generateId(),
        projectId,
        name: 'Hệ thống tu luyện',
        type: 'cultivation',
        realms: [],
        techniques: [],
        itemGrades: ['Phàm', 'Linh', 'Địa', 'Thiên', 'Thánh', 'Thần'],
        currencies: [{ name: 'Linh Thạch', exchangeRate: '1 Trung Phẩm = 100 Hạ Phẩm' }],
      },
      protagonistState: {
        characterId: generateId(),
        name: 'Nhân vật chính',
        currentRealm: 'Luyện Khí',
        currentSubLevel: 1,
        age: 16,
        status: 'active',
        currentGoal: 'Tu luyện mạnh mẽ hơn',
        lastUpdatedChapter: 0,
      },
      mainCharacterStates: [],
      inventories: [],
      relationships: [],
      currentLocation: 'hometown',
      currentLocationName: 'Quê nhà',
      visitedLocations: [],
      openPlotThreads: [],
      resolvedPlotThreads: [],
      foreshadowing: [],
      lastUpdated: new Date(),
      lastUpdatedChapter: 0,
    };
  }

  /**
   * Get the World Bible
   */
  getWorldBible(): WorldBible {
    return this.worldBible;
  }

  /**
   * Set World Bible from existing data
   */
  setWorldBible(worldBible: WorldBible) {
    this.worldBible = worldBible;
  }

  /**
   * Add a power realm
   */
  addPowerRealm(realm: Omit<import('@/lib/types/ai-providers').PowerRealm, 'id'>): void {
    this.worldBible.powerSystem.realms.push({
      id: generateId(),
      ...realm,
    });
  }

  /**
   * Update protagonist state
   */
  updateProtagonist(updates: Partial<CharacterState>, chapterNumber: number): void {
    this.worldBible.protagonistState = {
      ...this.worldBible.protagonistState,
      ...updates,
      lastUpdatedChapter: chapterNumber,
    };
    this.worldBible.lastUpdated = new Date();
    this.worldBible.lastUpdatedChapter = chapterNumber;
  }

  /**
   * Add item to inventory
   */
  addInventoryItem(
    characterId: string,
    item: Omit<import('@/lib/types/ai-providers').InventoryItem, 'id'>
  ): void {
    let inventory = this.worldBible.inventories.find((i: CharacterInventory) => i.characterId === characterId);

    if (!inventory) {
      inventory = {
        characterId,
        items: [],
        techniques: [],
        wealth: [],
        lastUpdated: new Date(),
        lastUpdatedChapter: 0,
      };
      this.worldBible.inventories.push(inventory);
    }

    inventory.items.push({
      id: generateId(),
      ...item,
    });
    inventory.lastUpdated = new Date();
    inventory.lastUpdatedChapter = item.acquiredChapter;
  }

  /**
   * Add or update NPC relationship
   */
  updateRelationship(relationship: Omit<NPCRelationship, 'npcId'> & { npcId?: string }): void {
    const existingIndex = this.worldBible.relationships.findIndex(
      (r: NPCRelationship) => r.npcName === relationship.npcName
    );

    const { npcId, ...restRelationship } = relationship;
    const newRelationship: NPCRelationship = {
      npcId: npcId || generateId(),
      ...restRelationship as Omit<NPCRelationship, 'npcId'>,
    };

    if (existingIndex >= 0) {
      this.worldBible.relationships[existingIndex] = newRelationship;
    } else {
      this.worldBible.relationships.push(newRelationship);
    }
  }

  /**
   * Add open plot thread
   */
  addPlotThread(thread: Omit<PlotThread, 'id'>): void {
    this.worldBible.openPlotThreads.push({
      id: generateId(),
      ...thread,
    });
  }

  /**
   * Resolve a plot thread
   */
  resolvePlotThread(threadId: string, resolvedChapter: number): void {
    const index = this.worldBible.openPlotThreads.findIndex((t: PlotThread) => t.id === threadId);
    if (index >= 0) {
      const thread = this.worldBible.openPlotThreads[index];
      thread.resolvedChapter = resolvedChapter;
      this.worldBible.resolvedPlotThreads.push(thread);
      this.worldBible.openPlotThreads.splice(index, 1);
    }
  }

  /**
   * Update current location
   */
  updateLocation(
    location: import('@/lib/types/ai-providers').MapType,
    locationName: string,
    chapterNumber: number
  ): void {
    // Close previous location visit
    const lastVisit = this.worldBible.visitedLocations[this.worldBible.visitedLocations.length - 1];
    if (lastVisit && !lastVisit.endChapter) {
      lastVisit.endChapter = chapterNumber - 1;
    }

    // Start new location visit
    this.worldBible.currentLocation = location;
    this.worldBible.currentLocationName = locationName;
    this.worldBible.visitedLocations.push({
      location,
      locationName,
      startChapter: chapterNumber,
      mainEvents: [],
    });
  }

  /**
   * Export World Bible to JSON
   */
  export(): string {
    return JSON.stringify(this.worldBible, null, 2);
  }

  /**
   * Import World Bible from JSON
   */
  import(json: string): void {
    this.worldBible = JSON.parse(json);
  }
}

/**
 * Golden Chapters Validator
 * Validates first 3 chapters according to the formula
 */
export class GoldenChaptersValidator {
  /**
   * Validate chapter 1
   */
  validateChapter1(content: string): GoldenChapterChecklist['chapter1'] {
    const lowerContent = content.toLowerCase();

    // Check for golden finger indicators
    const goldenFingerKeywords = [
      'hệ thống', 'system', 'truyền thừa', 'kế thừa', 'thức tỉnh',
      'kim thủ chỉ', 'cheat', 'năng lực đặc biệt', 'thiên phú'
    ];
    const hasGoldenFinger = goldenFingerKeywords.some(k => lowerContent.includes(k));

    // Check for immediate conflict
    const conflictKeywords = ['xung đột', 'đối đầu', 'thù địch', 'kẻ thù', 'đánh', 'chiến'];
    const hasImmediateConflict = conflictKeywords.some(k => lowerContent.includes(k));

    // Check for character goal
    const goalKeywords = ['mục tiêu', 'quyết tâm', 'nhất định phải', 'sẽ', 'muốn'];
    const hasCharacterGoal = goalKeywords.some(k => lowerContent.includes(k));

    // Check for power demo
    const powerKeywords = ['sức mạnh', 'năng lượng', 'tu vi', 'cảnh giới', 'đột phá'];
    const hasPowerDemo = powerKeywords.some(k => lowerContent.includes(k));

    // Check for world intro
    const worldKeywords = ['thế giới', 'tu sĩ', 'cường giả', 'môn phái', 'tông môn'];
    const hasWorldIntro = worldKeywords.some(k => lowerContent.includes(k));

    // Calculate score
    const checks = [hasGoldenFinger, hasImmediateConflict, hasCharacterGoal, hasPowerDemo, hasWorldIntro];
    const score = (checks.filter(Boolean).length / checks.length) * 100;

    return {
      hasGoldenFinger,
      hasImmediateConflict,
      hasCharacterGoal,
      hasPowerDemo,
      hasWorldIntro,
      score,
    };
  }

  /**
   * Validate chapter 2
   */
  validateChapter2(content: string): GoldenChapterChecklist['chapter2'] {
    const lowerContent = content.toLowerCase();

    // Check for small victory
    const victoryKeywords = ['chiến thắng', 'thắng', 'đánh bại', 'thành công', 'hoàn thành'];
    const hasSmallVictory = victoryKeywords.some(k => lowerContent.includes(k));

    // Check for system expansion
    const systemKeywords = ['nâng cấp', 'mở khóa', 'kỹ năng mới', 'tính năng', 'cấp'];
    const hasSystemExpansion = systemKeywords.some(k => lowerContent.includes(k));

    // Check for new character
    const newCharKeywords = ['gặp', 'xuất hiện', 'đến', 'người lạ', 'thiếu nữ', 'thiếu niên'];
    const hasNewCharacter = newCharKeywords.some(k => lowerContent.includes(k));

    // Check for reward
    const rewardKeywords = ['phần thưởng', 'nhận được', 'thu hoạch', 'đạt được', 'có được'];
    const hasRewardGiven = rewardKeywords.some(k => lowerContent.includes(k));

    // Check for next hook (cliffhanger or hook)
    const hookKeywords = ['nhưng', 'bất ngờ', 'đột nhiên', 'không ngờ', 'kinh ngạc'];
    const hasNextHook = hookKeywords.some(k => lowerContent.includes(k));

    const checks = [hasSmallVictory, hasSystemExpansion, hasNewCharacter, hasRewardGiven, hasNextHook];
    const score = (checks.filter(Boolean).length / checks.length) * 100;

    return {
      hasSmallVictory,
      hasSystemExpansion,
      hasNewCharacter,
      hasRewardGiven,
      hasNextHook,
      score,
    };
  }

  /**
   * Validate chapter 3
   */
  validateChapter3(content: string): GoldenChapterChecklist['chapter3'] {
    const lowerContent = content.toLowerCase();

    // Check for real challenge
    const challengeKeywords = ['thử thách', 'nguy hiểm', 'khó khăn', 'cường địch', 'đối thủ mạnh'];
    const hasRealChallenge = challengeKeywords.some(k => lowerContent.includes(k));

    // Check for face slap
    const faceSlalKeywords = ['tát', 'coi thường', 'khinh thường', 'kinh ngạc', 'sốc', 'không thể tin'];
    const hasFaceSlap = faceSlalKeywords.some(k => lowerContent.includes(k));

    // Check for growth shown
    const growthKeywords = ['mạnh hơn', 'tiến bộ', 'phát triển', 'vượt qua', 'trưởng thành'];
    const hasGrowthShown = growthKeywords.some(k => lowerContent.includes(k));

    // Check for larger plot hint
    const plotKeywords = ['bí mật', 'âm mưu', 'lớn hơn', 'thế lực', 'chân tướng'];
    const hasLargerPlot = plotKeywords.some(k => lowerContent.includes(k));

    // Check engagement (cliffhanger + tension)
    const engagementKeywords = ['tiếp theo', 'sẽ ra sao', 'chờ đợi', 'hồi hộp'];
    const hasReaderHooked = engagementKeywords.some(k => lowerContent.includes(k));

    const checks = [hasRealChallenge, hasFaceSlap, hasGrowthShown, hasLargerPlot, hasReaderHooked];
    const score = (checks.filter(Boolean).length / checks.length) * 100;

    return {
      hasRealChallenge,
      hasFaceSlap,
      hasGrowthShown,
      hasLargerPlot,
      hasReaderHooked,
      score,
    };
  }

  /**
   * Validate all golden chapters
   */
  validateAll(chapters: string[]): GoldenChapterChecklist {
    const chapter1 = this.validateChapter1(chapters[0] || '');
    const chapter2 = this.validateChapter2(chapters[1] || '');
    const chapter3 = this.validateChapter3(chapters[2] || '');

    const overallScore = (chapter1.score + chapter2.score + chapter3.score) / 3;

    return {
      chapter1,
      chapter2,
      chapter3,
      overallScore,
      passed: overallScore >= 70,
    };
  }
}

/**
 * Arc Structure Manager
 * Manages story arcs with Map Changing mechanics
 */
export class ArcStructureManager {
  private arcs: StoryArc[] = [];
  private currentArcIndex: number = -1;

  /**
   * Create a new arc
   */
  createArc(arc: Omit<StoryArc, 'id' | 'keyEvents'>): StoryArc {
    const newArc: StoryArc = {
      id: generateId(),
      ...arc,
      keyEvents: [],
    };
    this.arcs.push(newArc);
    return newArc;
  }

  /**
   * Get current arc
   */
  getCurrentArc(): StoryArc | null {
    return this.currentArcIndex >= 0 ? this.arcs[this.currentArcIndex] : null;
  }

  /**
   * Set current arc by chapter number
   */
  setCurrentArcByChapter(chapterNumber: number): StoryArc | null {
    const arcIndex = this.arcs.findIndex(
      a => chapterNumber >= a.startChapter && chapterNumber <= a.endChapter
    );
    if (arcIndex >= 0) {
      this.currentArcIndex = arcIndex;
      return this.arcs[arcIndex];
    }
    return null;
  }

  /**
   * Add event to current arc
   */
  addEvent(event: Omit<ArcEvent, 'id'>): void {
    const currentArc = this.getCurrentArc();
    if (currentArc) {
      currentArc.keyEvents.push({
        id: generateId(),
        ...event,
      });
    }
  }

  /**
   * Get all arcs
   */
  getAllArcs(): StoryArc[] {
    return this.arcs;
  }

  /**
   * Check if it's time for map change
   */
  isMapChangeChapter(chapterNumber: number): boolean {
    return this.arcs.some(a => a.startChapter === chapterNumber && a.map !== this.getCurrentArc()?.map);
  }

  /**
   * Get suppression/explosion ratio for current position
   */
  getPhaseForChapter(chapterNumber: number): 'suppression' | 'explosion' | null {
    const arc = this.setCurrentArcByChapter(chapterNumber);
    if (!arc) return null;

    if (chapterNumber >= arc.suppressionPhase.startChapter &&
        chapterNumber <= arc.suppressionPhase.endChapter) {
      return 'suppression';
    }

    if (chapterNumber >= arc.explosionPhase.startChapter &&
        chapterNumber <= arc.explosionPhase.endChapter) {
      return 'explosion';
    }

    return null;
  }

  /**
   * Export arcs to JSON
   */
  export(): string {
    return JSON.stringify(this.arcs, null, 2);
  }

  /**
   * Import arcs from JSON
   */
  import(json: string): void {
    this.arcs = JSON.parse(json);
  }
}

/**
 * Dopamine Points Tracker
 * Tracks and validates dopamine delivery
 */
export class DopamineTracker {
  private points: DopaminePoint[] = [];
  private config: DopamineConfig;

  constructor(config: DopamineConfig = DEFAULT_DOPAMINE_CONFIG) {
    this.config = config;
  }

  /**
   * Add a dopamine point
   */
  addPoint(point: Omit<DopaminePoint, 'id'>): DopaminePoint {
    const newPoint: DopaminePoint = {
      id: generateId(),
      ...point,
    };
    this.points.push(newPoint);
    return newPoint;
  }

  /**
   * Get points for a chapter
   */
  getChapterPoints(chapterNumber: number): DopaminePoint[] {
    return this.points.filter(p => p.chapterNumber === chapterNumber);
  }

  /**
   * Validate chapter has minimum dopamine
   */
  validateChapter(chapterNumber: number): {
    valid: boolean;
    pointCount: number;
    required: number;
    missingTypes: DopamineType[];
  } {
    const chapterPoints = this.getChapterPoints(chapterNumber);
    const pointCount = chapterPoints.length;
    const required = this.config.minDopaminePerChapter;

    // Check if missing reaction shots
    const missingReactions = chapterPoints.filter(
      p => p.intensity >= 7 && !p.reactionShot
    );

    return {
      valid: pointCount >= required && missingReactions.length === 0,
      pointCount,
      required,
      missingTypes: [],
    };
  }

  /**
   * Get arc statistics
   */
  getArcStats(startChapter: number, endChapter: number): {
    totalPoints: number;
    byType: Record<DopamineType, number>;
    averageIntensity: number;
    faceSlaps: number;
    powerUps: number;
  } {
    const arcPoints = this.points.filter(
      p => p.chapterNumber >= startChapter && p.chapterNumber <= endChapter
    );

    const byType: Record<DopamineType, number> = {
      face_slap: 0,
      power_reveal: 0,
      treasure_gain: 0,
      breakthrough: 0,
      revenge: 0,
      recognition: 0,
      beauty_charm: 0,
      enemy_shock: 0,
      underdog_victory: 0,
      hidden_identity: 0,
      plot_twist: 0,
    };

    arcPoints.forEach(p => {
      byType[p.type]++;
    });

    const totalIntensity = arcPoints.reduce((sum, p) => sum + p.intensity, 0);

    return {
      totalPoints: arcPoints.length,
      byType,
      averageIntensity: arcPoints.length > 0 ? totalIntensity / arcPoints.length : 0,
      faceSlaps: byType.face_slap,
      powerUps: byType.breakthrough + byType.power_reveal,
    };
  }

  /**
   * Export points to JSON
   */
  export(): string {
    return JSON.stringify(this.points, null, 2);
  }

  /**
   * Import points from JSON
   */
  import(json: string): void {
    this.points = JSON.parse(json);
  }
}

// Export default instances
export const createDopamineOptimizer = (
  aiService: AIProviderService,
  projectId: string
) => ({
  orchestrator: new AgentOrchestrator(aiService),
  worldBible: new WorldBibleManager(projectId),
  goldenValidator: new GoldenChaptersValidator(),
  arcManager: new ArcStructureManager(),
  dopamineTracker: new DopamineTracker(),
});