/**
 * Story Writing Factory - Power Progression Tracker
 *
 * Tracks:
 * 1. Cultivation/power levels for all characters
 * 2. Breakthrough events and their causes
 * 3. Skill/ability acquisition
 * 4. Item acquisition
 * 5. Validates progression is logical
 */

import { PowerRealm } from './types';
import { getSupabase } from './supabase-helper';
import { logger } from '@/lib/security/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface PowerState {
  characterName: string;
  realm: string;
  level: number; // Sub-level within realm
  abilities: string[];
  items: Array<{
    name: string;
    type: string;
    grade: string;
    acquiredChapter: number;
  }>;
  totalBreakthroughs: number;
  lastBreakthroughChapter: number;
}

export interface ProgressionEvent {
  characterName: string;
  chapterNumber: number;
  eventType: 'breakthrough' | 'skill_learned' | 'item_acquired' | 'power_loss' | 'transformation';
  previousLevel?: string;
  newLevel?: string;
  previousRealm?: string;
  newRealm?: string;
  description: string;
  catalyst?: string;
  consequences?: string[];
}

export interface ProgressionValidation {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  suggestions: string[];
}

// ============================================================================
// DEFAULT POWER SYSTEMS
// ============================================================================

const CULTIVATION_REALMS: PowerRealm[] = [
  { name: 'Luyện Khí', rank: 1, subLevels: 9, description: 'Cảnh giới nhập môn', abilities: ['Ngự khí'], breakthroughDifficulty: 'easy' },
  { name: 'Trúc Cơ', rank: 2, subLevels: 3, description: 'Xây nền móng', abilities: ['Phi hành ngắn'], breakthroughDifficulty: 'medium' },
  { name: 'Kim Đan', rank: 3, subLevels: 3, description: 'Kết đan', abilities: ['Thần thức mạnh'], breakthroughDifficulty: 'hard' },
  { name: 'Nguyên Anh', rank: 4, subLevels: 3, description: 'Nguyên thần', abilities: ['Phân thân'], breakthroughDifficulty: 'hard' },
  { name: 'Hóa Thần', rank: 5, subLevels: 3, description: 'Thần hồn hợp nhất', abilities: ['Không gian di chuyển'], breakthroughDifficulty: 'bottleneck' },
  { name: 'Luyện Hư', rank: 6, subLevels: 3, description: 'Luyện hư hợp đạo', abilities: ['Quy tắc lĩnh ngộ'], breakthroughDifficulty: 'bottleneck' },
  { name: 'Hợp Thể', rank: 7, subLevels: 3, description: 'Thể đạo hợp nhất', abilities: ['Thiên địa uy năng'], breakthroughDifficulty: 'bottleneck' },
  { name: 'Đại Thừa', rank: 8, subLevels: 3, description: 'Chuẩn bị độ kiếp', abilities: ['Đại thần thông'], breakthroughDifficulty: 'bottleneck' },
  { name: 'Độ Kiếp', rank: 9, subLevels: 1, description: 'Vượt qua thiên kiếp', abilities: ['Bất tử'], breakthroughDifficulty: 'bottleneck' },
];

// ============================================================================
// POWER TRACKER CLASS
// ============================================================================

export class PowerTracker {
  private projectId: string;
  private powerSystem: PowerRealm[];

  // Cache
  private characterPowers: Map<string, PowerState> = new Map();
  private progressionHistory: Map<string, ProgressionEvent[]> = new Map();

  constructor(projectId: string, customPowerSystem?: PowerRealm[]) {
    this.projectId = projectId;
    this.powerSystem = customPowerSystem || CULTIVATION_REALMS;
  }

  private get supabase() {
    return getSupabase();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Load existing power states from database
   */
  async initialize(): Promise<void> {
    // Load character power states
    const { data: characters, error: charsError } = await this.supabase
      .from('character_tracker')
      .select('character_name, current_state')
      .eq('project_id', this.projectId);

    if (charsError) {
      logger.debug('PowerTracker character_tracker load failed (non-fatal)', {
        projectId: this.projectId,
        error: charsError.message,
      });
    }
    if (characters) {
      for (const char of characters) {
        const state = char.current_state || {};
        this.characterPowers.set(char.character_name, {
          characterName: char.character_name,
          realm: state.realm || state.cultivationLevel || this.powerSystem[0].name,
          level: state.level || 1,
          abilities: state.abilities || [],
          items: state.items || [],
          totalBreakthroughs: state.totalBreakthroughs || 0,
          lastBreakthroughChapter: state.lastBreakthroughChapter || 1,
        });
      }
    }

    // Load progression history
    const { data: progressions, error: progsError } = await this.supabase
      .from('power_progression')
      .select('*')
      .eq('project_id', this.projectId)
      .order('chapter_number', { ascending: true });

    if (progsError) {
      logger.debug('PowerTracker power_progression load failed (non-fatal)', {
        projectId: this.projectId,
        error: progsError.message,
      });
    }
    if (progressions) {
      for (const prog of progressions) {
        const charHistory = this.progressionHistory.get(prog.character_name) || [];
        charHistory.push({
          characterName: prog.character_name,
          chapterNumber: prog.chapter_number,
          eventType: prog.event_type,
          previousLevel: prog.previous_level,
          newLevel: prog.new_level,
          previousRealm: prog.previous_realm,
          newRealm: prog.new_realm,
          description: prog.description,
          catalyst: prog.catalyst,
          consequences: prog.consequences,
        });
        this.progressionHistory.set(prog.character_name, charHistory);
      }
    }
  }

  // ============================================================================
  // POWER STATE MANAGEMENT
  // ============================================================================

  /**
   * Get current power state for a character
   */
  getPowerState(characterName: string): PowerState | undefined {
    return this.characterPowers.get(characterName);
  }

  /**
   * Initialize power state for a new character
   */
  async initializeCharacter(
    characterName: string,
    initialRealm?: string,
    initialLevel?: number
  ): Promise<PowerState> {
    const realm = initialRealm || this.powerSystem[0].name;
    const level = initialLevel || 1;

    const state: PowerState = {
      characterName,
      realm,
      level,
      abilities: [],
      items: [],
      totalBreakthroughs: 0,
      lastBreakthroughChapter: 0,
    };

    this.characterPowers.set(characterName, state);

    // Save to database
    const { error } = await this.supabase
      .from('character_tracker')
      .upsert({
        project_id: this.projectId,
        character_name: characterName,
        current_state: {
          realm,
          level,
          abilities: [],
          items: [],
          totalBreakthroughs: 0,
        },
        first_appearance: 1,
      }, {
        onConflict: 'project_id,character_name',
      });
    if (error) {
      logger.debug('character_tracker upsert failed (non-fatal)', {
        projectId: this.projectId,
        characterName,
        operation: 'initializeCharacter',
        error: error.message,
      });
    }

    return state;
  }

  // ============================================================================
  // PROGRESSION VALIDATION
  // ============================================================================

  /**
   * Validate a proposed breakthrough
   */
  validateBreakthrough(
    characterName: string,
    targetRealm: string,
    targetLevel: number,
    currentChapter: number
  ): ProgressionValidation {
    const validation: ProgressionValidation = {
      isValid: true,
      warnings: [],
      errors: [],
      suggestions: [],
    };

    const currentState = this.characterPowers.get(characterName);

    if (!currentState) {
      validation.warnings.push(`Nhân vật ${characterName} chưa có power state - sẽ khởi tạo mới`);
      return validation;
    }

    const currentRealmIndex = this.powerSystem.findIndex(r => r.name === currentState.realm);
    const targetRealmIndex = this.powerSystem.findIndex(r => r.name === targetRealm);

    if (currentRealmIndex === -1 || targetRealmIndex === -1) {
      validation.errors.push('Cảnh giới không hợp lệ');
      validation.isValid = false;
      return validation;
    }

    // Check for impossible jumps (skipping realms)
    if (targetRealmIndex > currentRealmIndex + 1) {
      validation.errors.push(`Không thể nhảy từ ${currentState.realm} đến ${targetRealm} (bỏ qua ${targetRealmIndex - currentRealmIndex - 1} cảnh giới)`);
      validation.isValid = false;
    }

    // Check for too fast progression
    const chaptersSinceLastBreakthrough = currentChapter - currentState.lastBreakthroughChapter;
    if (chaptersSinceLastBreakthrough < 3) {
      validation.warnings.push(`Đột phá quá nhanh (chỉ ${chaptersSinceLastBreakthrough} chương từ lần trước)`);
      validation.suggestions.push('Thêm một vài chương tu luyện hoặc time-skip trước khi đột phá');
    }

    // Check for bottleneck realms
    const targetRealmInfo = this.powerSystem[targetRealmIndex];
    if (targetRealmInfo.breakthroughDifficulty === 'bottleneck') {
      validation.warnings.push(`${targetRealm} là bottleneck - cần nhiều tích lũy`);
      validation.suggestions.push('Thêm catalyst đặc biệt (linh dược, cơ duyên, thiên kiếp) để đột phá hợp lý');
    }

    // Check total breakthroughs pacing
    const avgChaptersPerBreakthrough = currentChapter / (currentState.totalBreakthroughs + 1);
    if (avgChaptersPerBreakthrough < 5) {
      validation.warnings.push('Tốc độ đột phá trung bình quá nhanh');
      validation.suggestions.push('Giảm tốc độ đột phá để truyện có chiều sâu hơn');
    }

    return validation;
  }

  /**
   * Validate skill learning
   */
  validateSkillLearning(
    characterName: string,
    skillName: string,
    currentChapter: number
  ): ProgressionValidation {
    const validation: ProgressionValidation = {
      isValid: true,
      warnings: [],
      errors: [],
      suggestions: [],
    };

    const state = this.characterPowers.get(characterName);

    if (state) {
      // Check for duplicate skill
      if (state.abilities.includes(skillName)) {
        validation.errors.push(`${characterName} đã có skill "${skillName}"`);
        validation.isValid = false;
      }

      // Check for too many skills learned recently
      const history = this.progressionHistory.get(characterName) || [];
      const recentSkills = history.filter(
        h => h.eventType === 'skill_learned' && currentChapter - h.chapterNumber < 10
      );

      if (recentSkills.length >= 3) {
        validation.warnings.push('Học quá nhiều skill trong thời gian ngắn');
        validation.suggestions.push('Cho nhân vật thời gian luyện tập/tiêu hóa skill cũ');
      }
    }

    return validation;
  }

  // ============================================================================
  // PROGRESSION RECORDING
  // ============================================================================

  /**
   * Record a breakthrough event
   */
  async recordBreakthrough(
    characterName: string,
    chapterNumber: number,
    newRealm: string,
    newLevel: number,
    catalyst?: string,
    consequences?: string[]
  ): Promise<{ success: boolean; warnings: string[] }> {
    const currentState = this.characterPowers.get(characterName) || await this.initializeCharacter(characterName);
    const warnings: string[] = [];

    // Validate first
    const validation = this.validateBreakthrough(characterName, newRealm, newLevel, chapterNumber);
    if (!validation.isValid) {
      return { success: false, warnings: validation.errors };
    }
    warnings.push(...validation.warnings);

    // Record the event
    const event: ProgressionEvent = {
      characterName,
      chapterNumber,
      eventType: 'breakthrough',
      previousRealm: currentState.realm,
      previousLevel: `${currentState.realm} ${currentState.level} tầng`,
      newRealm,
      newLevel: `${newRealm} ${newLevel} tầng`,
      description: `Đột phá từ ${currentState.realm} đến ${newRealm}`,
      catalyst,
      consequences,
    };

    // Update state
    currentState.realm = newRealm;
    currentState.level = newLevel;
    currentState.totalBreakthroughs++;
    currentState.lastBreakthroughChapter = chapterNumber;
    this.characterPowers.set(characterName, currentState);

    // Add to history
    const history = this.progressionHistory.get(characterName) || [];
    history.push(event);
    this.progressionHistory.set(characterName, history);

    // Save to database
    await this.saveProgression(event);
    await this.updateCharacterPowerState(characterName, currentState);

    return { success: true, warnings };
  }

  /**
   * Record skill learning
   */
  async recordSkillLearned(
    characterName: string,
    chapterNumber: number,
    skillName: string,
    description?: string
  ): Promise<{ success: boolean; warnings: string[] }> {
    const currentState = this.characterPowers.get(characterName) || await this.initializeCharacter(characterName);
    const warnings: string[] = [];

    // Validate
    const validation = this.validateSkillLearning(characterName, skillName, chapterNumber);
    if (!validation.isValid) {
      return { success: false, warnings: validation.errors };
    }
    warnings.push(...validation.warnings);

    // Record event
    const event: ProgressionEvent = {
      characterName,
      chapterNumber,
      eventType: 'skill_learned',
      description: description || `Học được: ${skillName}`,
    };

    // Update state
    currentState.abilities.push(skillName);
    this.characterPowers.set(characterName, currentState);

    // Add to history
    const history = this.progressionHistory.get(characterName) || [];
    history.push(event);
    this.progressionHistory.set(characterName, history);

    // Save
    await this.saveProgression(event);
    await this.updateCharacterPowerState(characterName, currentState);

    return { success: true, warnings };
  }

  /**
   * Record item acquisition
   */
  async recordItemAcquired(
    characterName: string,
    chapterNumber: number,
    item: { name: string; type: string; grade: string },
    description?: string
  ): Promise<{ success: boolean }> {
    const currentState = this.characterPowers.get(characterName) || await this.initializeCharacter(characterName);

    // Record event
    const event: ProgressionEvent = {
      characterName,
      chapterNumber,
      eventType: 'item_acquired',
      description: description || `Thu được: ${item.name} (${item.grade})`,
    };

    // Update state
    currentState.items.push({
      ...item,
      acquiredChapter: chapterNumber,
    });
    this.characterPowers.set(characterName, currentState);

    // Save
    await this.saveProgression(event);
    await this.updateCharacterPowerState(characterName, currentState);

    return { success: true };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Save progression event to database
   */
  private async saveProgression(event: ProgressionEvent): Promise<void> {
    const { error } = await this.supabase.from('power_progression').insert({
      project_id: this.projectId,
      character_name: event.characterName,
      chapter_number: event.chapterNumber,
      event_type: event.eventType,
      previous_level: event.previousLevel,
      new_level: event.newLevel,
      previous_realm: event.previousRealm,
      new_realm: event.newRealm,
      description: event.description,
      catalyst: event.catalyst,
      consequences: event.consequences,
    });
    if (error) {
      logger.debug('power_progression insert failed (non-fatal)', {
        projectId: this.projectId,
        characterName: event.characterName,
        chapterNumber: event.chapterNumber,
        operation: 'saveProgression',
        error: error.message,
      });
    }
  }

  /**
   * Update character power state in database
   */
  private async updateCharacterPowerState(name: string, state: PowerState): Promise<void> {
    const { error } = await this.supabase
      .from('character_tracker')
      .update({
        current_state: {
          realm: state.realm,
          level: state.level,
          abilities: state.abilities,
          items: state.items,
          totalBreakthroughs: state.totalBreakthroughs,
          lastBreakthroughChapter: state.lastBreakthroughChapter,
        },
      })
      .eq('project_id', this.projectId)
      .eq('character_name', name);
    if (error) {
      logger.debug('character_tracker update failed (non-fatal)', {
        projectId: this.projectId,
        characterName: name,
        operation: 'updateCharacterPowerState',
        error: error.message,
      });
    }
  }

  /**
   * Get power progression summary
   */
  getProgressionSummary(characterName: string): string {
    const state = this.characterPowers.get(characterName);
    if (!state) return `${characterName}: Chưa có thông tin`;

    return `${characterName}: ${state.realm} ${state.level} tầng
    - Tổng đột phá: ${state.totalBreakthroughs}
    - Kỹ năng: ${state.abilities.length}
    - Bảo vật: ${state.items.length}
    - Đột phá gần nhất: Chương ${state.lastBreakthroughChapter}`;
  }

  /**
   * Get all character power states
   */
  getAllPowerStates(): PowerState[] {
    return Array.from(this.characterPowers.values());
  }

  /**
   * Get the power system realms
   */
  getPowerSystem(): PowerRealm[] {
    return this.powerSystem;
  }

  /**
   * Get expected realm for a given chapter (for pacing guidance)
   */
  getExpectedRealm(chapterNumber: number, totalChapters: number): { realm: string; level: number } {
    const progress = chapterNumber / totalChapters;
    const realmIndex = Math.min(
      Math.floor(progress * this.powerSystem.length),
      this.powerSystem.length - 1
    );
    const realm = this.powerSystem[realmIndex];
    const level = Math.ceil((progress * this.powerSystem.length - realmIndex) * realm.subLevels) || 1;

    return { realm: realm.name, level };
  }

  // ============================================================================
  // ENEMY SCALING INTEGRATION (Sprint 2 Enhancement)
  // ============================================================================

  /**
   * Parse power level string to numeric value for comparison
   */
  parsePowerLevel(level: string): number {
    const realmValues: Record<string, number> = {};
    
    // Build realm values from power system
    for (let i = 0; i < this.powerSystem.length; i++) {
      const normalizedName = this.powerSystem[i].name.toLowerCase();
      realmValues[normalizedName] = (i + 1) * 10;
    }
    
    const lower = level.toLowerCase();
    let baseValue = 0;
    
    for (const [realm, value] of Object.entries(realmValues)) {
      if (lower.includes(realm)) {
        baseValue = value;
        break;
      }
    }
    
    // Extract sub-level if present
    const subLevelMatch = lower.match(/(\d+)/);
    const subLevel = subLevelMatch ? parseInt(subLevelMatch[1]) : 1;
    
    return baseValue + subLevel;
  }

  /**
   * Validate enemy power scaling against protagonist
   * Returns whether the battle outcome is logically consistent
   */
  validateEnemyScaling(
    protagonistName: string,
    enemyLevel: string,
    battleOutcome: 'clean_victory' | 'pyrrhic_victory' | 'narrow_escape' | 'strategic_retreat' | 'interrupted' | 'draw' | 'defeat_recovery' | 'total_defeat',
    chapterNumber: number,
    totalChapters: number = 2000
  ): {
    valid: boolean;
    powerGap: number;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    const protagonistState = this.characterPowers.get(protagonistName);
    if (!protagonistState) {
      return { valid: true, powerGap: 0, issues: ['Protagonist power state not found'], suggestions: [] };
    }
    
    const protLevel = this.parsePowerLevel(`${protagonistState.realm} ${protagonistState.level}`);
    const enemyLvl = this.parsePowerLevel(enemyLevel);
    const powerGap = enemyLvl - protLevel;
    
    // Check if outcome makes sense with power gap
    const easyWins = ['clean_victory', 'pyrrhic_victory'];
    const losses = ['defeat_recovery', 'total_defeat'];
    
    if (powerGap > 3 && easyWins.includes(battleOutcome)) {
      issues.push(`Enemy mạnh hơn ${powerGap} levels nhưng thua dễ dàng - không hợp lý`);
      suggestions.push('Thêm giải thích: item đặc biệt, weakness của enemy, external help');
    }
    
    if (powerGap < -2 && losses.includes(battleOutcome)) {
      issues.push(`MC mạnh hơn nhiều nhưng vẫn thua - cần giải thích`);
      suggestions.push('Thêm: enemy có hidden power, MC bị hạn chế, bị phản bội');
    }
    
    // Check pacing - is MC leveling too fast compared to enemies?
    const expectedRealm = this.getExpectedRealm(chapterNumber, totalChapters);
    const expectedLevel = this.parsePowerLevel(`${expectedRealm.realm} ${expectedRealm.level}`);
    
    if (protLevel > expectedLevel + 10) {
      issues.push(`MC đang mạnh hơn expected cho chapter ${chapterNumber}`);
      suggestions.push('Giảm tốc độ đột phá hoặc tăng độ khó của enemy');
    }
    
    if (protLevel < expectedLevel - 10) {
      issues.push(`MC đang yếu hơn expected cho chapter ${chapterNumber}`);
      suggestions.push('Cân nhắc power-up event hoặc time-skip');
    }
    
    return {
      valid: issues.length === 0,
      powerGap,
      issues,
      suggestions,
    };
  }

  /**
   * Get power comparison context for battle planning
   */
  getBattleContext(protagonistName: string, enemyLevel: string, chapterNumber: number): string {
    const protagonistState = this.characterPowers.get(protagonistName);
    if (!protagonistState) return 'Protagonist power state not found';
    
    const protLevel = this.parsePowerLevel(`${protagonistState.realm} ${protagonistState.level}`);
    const enemyLvl = this.parsePowerLevel(enemyLevel);
    const powerGap = enemyLvl - protLevel;
    
    const lines = [
      `## Battle Power Context`,
      `**MC:** ${protagonistState.realm} ${protagonistState.level} tầng (power: ${protLevel})`,
      `**Enemy:** ${enemyLevel} (power: ${enemyLvl})`,
      `**Power Gap:** ${powerGap > 0 ? '+' : ''}${powerGap} (${this.getPowerGapDescription(powerGap)})`,
      '',
      '### Expected Outcome:',
    ];
    
    if (powerGap <= -5) {
      lines.push('- MC nên thắng dễ dàng (clean_victory)');
      lines.push('- Hoặc có thể dùng để showcase power');
    } else if (powerGap <= -2) {
      lines.push('- MC có lợi thế, nên thắng');
      lines.push('- Có thể khó khăn nếu enemy có hidden cards');
    } else if (powerGap <= 2) {
      lines.push('- Trận đấu cân bằng');
      lines.push('- Outcome phụ thuộc vào tactics, items, support');
    } else if (powerGap <= 5) {
      lines.push('- Enemy mạnh hơn, MC cần edge');
      lines.push('- Reasonable outcomes: pyrrhic_victory, narrow_escape, strategic_retreat');
    } else {
      lines.push('- Enemy quá mạnh');
      lines.push('- MC cần miracle/trump card để thắng');
      lines.push('- Reasonable outcomes: escape, strategic_retreat, interrupted');
    }
    
    // Add MC's recent abilities/items that could affect battle
    if (protagonistState.abilities.length > 0) {
      lines.push('');
      lines.push(`### MC Abilities: ${protagonistState.abilities.slice(-5).join(', ')}`);
    }
    
    const recentItems = protagonistState.items.slice(-3);
    if (recentItems.length > 0) {
      lines.push(`### Recent Items: ${recentItems.map(i => `${i.name} (${i.grade})`).join(', ')}`);
    }
    
    return lines.join('\n');
  }

  private getPowerGapDescription(gap: number): string {
    if (gap <= -5) return 'MC overwhelmingly stronger';
    if (gap <= -2) return 'MC stronger';
    if (gap <= 2) return 'Even match';
    if (gap <= 5) return 'Enemy stronger';
    return 'Enemy much stronger';
  }
}

// Export factory function
export function createPowerTracker(projectId: string, customPowerSystem?: PowerRealm[]): PowerTracker {
  return new PowerTracker(projectId, customPowerSystem);
}
