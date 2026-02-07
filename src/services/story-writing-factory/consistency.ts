/**
 * Story Writing Factory - Consistency Checker
 *
 * Checks for:
 * 1. Character trait consistency
 * 2. Power level consistency (no sudden jumps without explanation)
 * 3. Timeline issues
 * 4. World rule violations
 * 5. Dead character appearances
 * 6. Relationship consistency
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AIProviderService } from '../ai-provider';

// Lazy initialization to avoid build-time errors
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

// ============================================================================
// TYPES
// ============================================================================

export interface ConsistencyIssue {
  type: 'character_trait' | 'power_level' | 'timeline' | 'world_rule' | 'relationship' | 'dead_character' | 'location';
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  description: string;
  expectedState?: string;
  actualState?: string;
  conflictingChapters?: number[];
  affectedEntities?: string[];
  suggestion?: string;
}

export interface CharacterState {
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  staticTraits: Array<{ trait: string; establishedChapter: number }>;
  currentState: {
    cultivationLevel?: string;
    realm?: string;
    location?: string;
    health?: string;
    mood?: string;
  };
  relationships: Array<{
    target: string;
    type: 'ally' | 'enemy' | 'neutral' | 'family' | 'love_interest';
    affinity: number;
    sinceChapter: number;
  }>;
  status: 'alive' | 'dead' | 'missing' | 'unknown';
  firstAppearance: number;
  lastAppearance: number;
}

export interface ConsistencyReport {
  chapterNumber: number;
  issues: ConsistencyIssue[];
  hasCriticalIssues: boolean;
  overallScore: number; // 0-100
  suggestions: string[];
}

// ============================================================================
// CONSISTENCY CHECKER CLASS
// ============================================================================

export class ConsistencyChecker {
  private aiService: AIProviderService;
  private projectId: string;

  // In-memory cache for faster checks
  private characterCache: Map<string, CharacterState> = new Map();
  private worldRulesCache: string[] = [];
  private deadCharacters: Set<string> = new Set();

  constructor(projectId: string) {
    this.projectId = projectId;
    this.aiService = new AIProviderService();
  }

  private get supabase() {
    return getSupabase();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Load existing state from database
   */
  async initialize(): Promise<void> {
    // Load characters
    const { data: characters } = await this.supabase
      .from('character_tracker')
      .select('*')
      .eq('project_id', this.projectId);

    if (characters) {
      for (const char of characters) {
        this.characterCache.set(char.character_name, {
          name: char.character_name,
          role: char.role,
          staticTraits: char.static_traits || [],
          currentState: char.current_state || {},
          relationships: char.relationships || [],
          status: char.status,
          firstAppearance: char.first_appearance,
          lastAppearance: char.last_appearance || char.first_appearance,
        });

        if (char.status === 'dead') {
          this.deadCharacters.add(char.character_name);
        }
      }
    }

    // Load world rules
    const { data: worldData } = await this.supabase
      .from('world_state')
      .select('name, current_state')
      .eq('project_id', this.projectId)
      .eq('category', 'rule');

    if (worldData) {
      this.worldRulesCache = worldData.map(r => `${r.name}: ${JSON.stringify(r.current_state)}`);
    }
  }

  // ============================================================================
  // MAIN CHECK FUNCTION
  // ============================================================================

  /**
   * Check chapter content for consistency issues
   */
  async checkChapter(
    chapterNumber: number,
    content: string,
    metadata: {
      charactersInvolved: string[];
      locations: string[];
      powerEvents?: Array<{ character: string; fromLevel?: string; toLevel?: string }>;
      newCharacters?: Array<{ name: string; role: string }>;
    }
  ): Promise<ConsistencyReport> {
    const issues: ConsistencyIssue[] = [];

    // 1. Check for dead character appearances (sync)
    const deadIssues = this.checkDeadCharacters(chapterNumber, metadata.charactersInvolved, content);
    issues.push(...deadIssues);

    // 4. Check relationship consistency (sync)
    const relationshipIssues = this.checkRelationshipConsistency(content, metadata.charactersInvolved);
    issues.push(...relationshipIssues);

    // 2, 3, 5: Run async checks in parallel (power: DB, traits: DeepSeek AI, world: DeepSeek AI)
    const [powerIssues, traitIssues, worldIssues] = await Promise.all([
      metadata.powerEvents
        ? this.checkPowerConsistency(chapterNumber, metadata.powerEvents)
        : Promise.resolve([] as ConsistencyIssue[]),
      this.checkCharacterTraits(chapterNumber, content, metadata.charactersInvolved),
      this.checkWorldRules(content),
    ]);

    issues.push(...powerIssues, ...traitIssues, ...worldIssues);

    // Calculate overall score
    const severityWeights = { minor: 5, moderate: 15, major: 30, critical: 50 };
    const totalPenalty = issues.reduce((sum, issue) => sum + severityWeights[issue.severity], 0);
    const overallScore = Math.max(0, 100 - totalPenalty);

    // Generate suggestions
    const suggestions = this.generateSuggestions(issues);

    // Log issues to database
    await this.logIssues(chapterNumber, issues);

    return {
      chapterNumber,
      issues,
      hasCriticalIssues: issues.some(i => i.severity === 'critical'),
      overallScore,
      suggestions,
    };
  }

  // ============================================================================
  // SPECIFIC CHECKS
  // ============================================================================

  /**
   * Check if any dead characters appear in the content
   */
  private checkDeadCharacters(
    chapterNumber: number,
    characters: string[],
    content: string
  ): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    for (const name of characters) {
      if (this.deadCharacters.has(name)) {
        // Check if it's not a flashback or memory
        const flashbackWords = ['nhớ lại', 'hồi tưởng', 'trước đây', 'ngày xưa', 'từng', 'đã mất'];
        const isFlashback = flashbackWords.some(word => content.toLowerCase().includes(word));

        if (!isFlashback) {
          issues.push({
            type: 'dead_character',
            severity: 'critical',
            description: `Nhân vật "${name}" đã chết nhưng xuất hiện trong chương ${chapterNumber}`,
            expectedState: 'dead',
            actualState: 'appearing in scene',
            affectedEntities: [name],
            suggestion: `Kiểm tra lại xem ${name} có thực sự chết không, hoặc thêm giải thích (hồi sinh, ảo ảnh, flashback)`,
          });
        }
      }
    }

    return issues;
  }

  /**
   * Check power progression for impossible jumps
   */
  private async checkPowerConsistency(
    chapterNumber: number,
    powerEvents: Array<{ character: string; fromLevel?: string; toLevel?: string }>
  ): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    for (const event of powerEvents) {
      const charState = this.characterCache.get(event.character);

      if (charState && charState.currentState.cultivationLevel) {
        const currentLevel = charState.currentState.cultivationLevel;

        // Check if fromLevel matches current state
        if (event.fromLevel && event.fromLevel !== currentLevel) {
          issues.push({
            type: 'power_level',
            severity: 'major',
            description: `${event.character}: Cảnh giới trước khi đột phá không khớp (DB: ${currentLevel}, Chapter nói: ${event.fromLevel})`,
            expectedState: currentLevel,
            actualState: event.fromLevel,
            affectedEntities: [event.character],
            suggestion: `Sửa cảnh giới cho nhất quán hoặc thêm giải thích`,
          });
        }

        // Get recent power progression to check for impossible jumps
        const { data: recentProgression } = await this.supabase
          .from('power_progression')
          .select('*')
          .eq('project_id', this.projectId)
          .eq('character_name', event.character)
          .order('chapter_number', { ascending: false })
          .limit(5);

        if (recentProgression && recentProgression.length >= 2) {
          // Check if too many breakthroughs in short time
          const chaptersSpan = chapterNumber - recentProgression[recentProgression.length - 1].chapter_number;
          const breakthroughCount = recentProgression.length + 1;

          if (breakthroughCount > 3 && chaptersSpan < 20) {
            issues.push({
              type: 'power_level',
              severity: 'moderate',
              description: `${event.character}: Đột phá quá nhanh (${breakthroughCount} lần trong ${chaptersSpan} chương)`,
              suggestion: `Giảm tốc độ đột phá hoặc thêm time skip/explanation`,
            });
          }
        }
      }
    }

    return issues;
  }

  /**
   * Check character traits using AI
   */
  private async checkCharacterTraits(
    chapterNumber: number,
    content: string,
    characters: string[]
  ): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    // Get established traits for involved characters
    const relevantChars = characters
      .filter(name => this.characterCache.has(name))
      .slice(0, 3); // Limit to 3 characters to save API calls

    if (relevantChars.length === 0) return issues;

    const characterInfo = relevantChars.map(name => {
      const char = this.characterCache.get(name)!;
      return `${name}: ${char.staticTraits.map(t => t.trait).join(', ')}`;
    }).join('\n');

    try {
      const response = await this.aiService.chat({
        provider: 'openrouter',
        model: 'deepseek/deepseek-chat-v3-0324',
        messages: [
          {
            role: 'system',
            content: `Bạn là consistency checker cho truyện. Kiểm tra xem hành động nhân vật có mâu thuẫn với tính cách đã thiết lập không.
Trả về JSON: {"issues": [{"character": "tên", "issue": "mô tả", "severity": "minor|moderate|major"}]}
Nếu không có vấn đề, trả về: {"issues": []}`,
          },
          {
            role: 'user',
            content: `Tính cách đã thiết lập:
${characterInfo}

Nội dung chương ${chapterNumber}:
${content.substring(0, 3000)}

Có mâu thuẫn tính cách không?`,
          },
        ],
        temperature: 0.1,
        maxTokens: 500,
      });

      if (response.success && response.content) {
        try {
          const jsonMatch = response.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            for (const issue of result.issues || []) {
              issues.push({
                type: 'character_trait',
                severity: issue.severity || 'moderate',
                description: `${issue.character}: ${issue.issue}`,
                affectedEntities: [issue.character],
              });
            }
          }
        } catch (e) {
          // JSON parse error - ignore
        }
      }
    } catch (error) {
      console.error('AI trait check error:', error);
    }

    return issues;
  }

  /**
   * Check relationship consistency
   */
  private checkRelationshipConsistency(
    content: string,
    characters: string[]
  ): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];

    // Check for known enemy helping protagonist or ally attacking
    for (const name of characters) {
      const char = this.characterCache.get(name);
      if (!char) continue;

      for (const rel of char.relationships) {
        // Enemy helping without explanation
        if (rel.type === 'enemy' && rel.affinity < -50) {
          const helpWords = ['giúp đỡ', 'cứu', 'bảo vệ', 'hỗ trợ', 'hợp tác'];
          const hasHelping = helpWords.some(word =>
            content.toLowerCase().includes(`${name.toLowerCase()} ${word}`) ||
            content.toLowerCase().includes(`${word} ${rel.target.toLowerCase()}`)
          );

          if (hasHelping) {
            issues.push({
              type: 'relationship',
              severity: 'major',
              description: `${name} (kẻ thù) đang giúp đỡ mà không có giải thích`,
              affectedEntities: [name, rel.target],
              suggestion: 'Thêm giải thích tại sao kẻ thù lại giúp đỡ',
            });
          }
        }
      }
    }

    return issues;
  }

  /**
   * Check world rule violations
   */
  private async checkWorldRules(content: string): Promise<ConsistencyIssue[]> {
    if (this.worldRulesCache.length === 0) return [];

    const issues: ConsistencyIssue[] = [];

    // Use AI to check world rules
    try {
      const response = await this.aiService.chat({
        provider: 'openrouter',
        model: 'deepseek/deepseek-chat-v3-0324',
        messages: [
          {
            role: 'system',
            content: `Kiểm tra xem nội dung có vi phạm quy tắc thế giới đã thiết lập không.
Trả về JSON: {"violations": [{"rule": "quy tắc bị vi phạm", "description": "mô tả"}]}
Nếu không vi phạm: {"violations": []}`,
          },
          {
            role: 'user',
            content: `Quy tắc thế giới:
${this.worldRulesCache.slice(0, 10).join('\n')}

Nội dung:
${content.substring(0, 2000)}`,
          },
        ],
        temperature: 0.1,
        maxTokens: 500,
      });

      if (response.success && response.content) {
        try {
          const jsonMatch = response.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            for (const violation of result.violations || []) {
              issues.push({
                type: 'world_rule',
                severity: 'moderate',
                description: `Vi phạm: ${violation.rule} - ${violation.description}`,
              });
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    } catch (error) {
      console.error('World rule check error:', error);
    }

    return issues;
  }

  // ============================================================================
  // STATE UPDATES
  // ============================================================================

  /**
   * Update character state after chapter
   */
  async updateCharacterState(
    characterName: string,
    updates: Partial<CharacterState['currentState']>,
    chapterNumber: number
  ): Promise<void> {
    let char = this.characterCache.get(characterName);

    if (!char) {
      char = {
        name: characterName,
        role: 'minor',
        staticTraits: [],
        currentState: {},
        relationships: [],
        status: 'alive',
        firstAppearance: chapterNumber,
        lastAppearance: chapterNumber,
      };
    }

    // Update state
    char.currentState = { ...char.currentState, ...updates };
    char.lastAppearance = chapterNumber;

    this.characterCache.set(characterName, char);

    // Save to database
    await this.supabase
      .from('character_tracker')
      .upsert({
        project_id: this.projectId,
        character_name: characterName,
        role: char.role,
        static_traits: char.staticTraits,
        current_state: char.currentState,
        relationships: char.relationships,
        status: char.status,
        first_appearance: char.firstAppearance,
        last_appearance: char.lastAppearance,
      }, {
        onConflict: 'project_id,character_name',
      });
  }

  /**
   * Mark character as dead
   */
  async markCharacterDead(characterName: string, chapterNumber: number): Promise<void> {
    this.deadCharacters.add(characterName);

    const char = this.characterCache.get(characterName);
    if (char) {
      char.status = 'dead';
      char.lastAppearance = chapterNumber;
      this.characterCache.set(characterName, char);
    }

    await this.supabase
      .from('character_tracker')
      .update({ status: 'dead', last_appearance: chapterNumber })
      .eq('project_id', this.projectId)
      .eq('character_name', characterName);
  }

  /**
   * Add static trait to character
   */
  async addCharacterTrait(
    characterName: string,
    trait: string,
    chapterNumber: number
  ): Promise<void> {
    let char = this.characterCache.get(characterName);

    if (!char) {
      char = {
        name: characterName,
        role: 'minor',
        staticTraits: [],
        currentState: {},
        relationships: [],
        status: 'alive',
        firstAppearance: chapterNumber,
        lastAppearance: chapterNumber,
      };
    }

    // Check if trait already exists
    if (!char.staticTraits.some(t => t.trait === trait)) {
      char.staticTraits.push({ trait, establishedChapter: chapterNumber });
      this.characterCache.set(characterName, char);

      await this.supabase
        .from('character_tracker')
        .upsert({
          project_id: this.projectId,
          character_name: characterName,
          static_traits: char.staticTraits,
          first_appearance: char.firstAppearance,
        }, {
          onConflict: 'project_id,character_name',
        });
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Generate suggestions based on issues
   */
  private generateSuggestions(issues: ConsistencyIssue[]): string[] {
    const suggestions: string[] = [];

    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const majorCount = issues.filter(i => i.severity === 'major').length;

    if (criticalCount > 0) {
      suggestions.push('⚠️ Có vấn đề nghiêm trọng cần sửa trước khi publish');
    }

    if (majorCount > 2) {
      suggestions.push('Nên review lại logic của chương này');
    }

    // Add specific suggestions from issues
    for (const issue of issues) {
      if (issue.suggestion) {
        suggestions.push(issue.suggestion);
      }
    }

    return [...new Set(suggestions)]; // Remove duplicates
  }

  /**
   * Log issues to database
   */
  private async logIssues(chapterNumber: number, issues: ConsistencyIssue[]): Promise<void> {
    if (issues.length === 0) return;

    const rows = issues.map(issue => ({
      project_id: this.projectId,
      chapter_number: chapterNumber,
      issue_type: issue.type,
      severity: issue.severity,
      description: issue.description,
      expected_state: issue.expectedState,
      actual_state: issue.actualState,
      conflicting_chapters: issue.conflictingChapters,
      affected_entities: issue.affectedEntities,
      status: 'open',
    }));

    await this.supabase.from('consistency_issues').insert(rows);
  }

  /**
   * Get character state
   */
  getCharacterState(name: string): CharacterState | undefined {
    return this.characterCache.get(name);
  }

  /**
   * Get all tracked characters
   */
  getAllCharacters(): CharacterState[] {
    return Array.from(this.characterCache.values());
  }
}

// Export factory function
export function createConsistencyChecker(projectId: string): ConsistencyChecker {
  return new ConsistencyChecker(projectId);
}
