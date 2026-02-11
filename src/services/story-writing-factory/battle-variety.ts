/**
 * Battle Variety System
 *
 * Solves:
 * 1. All battles play out similarly
 * 2. Enemy power scaling validation
 * 3. Battle tactical variety
 * 4. Combat scene pacing
 */

import { randomUUID } from 'crypto';
import { getSupabase } from './supabase-helper';
import { logger } from '@/lib/security/logger';

// ============================================================================
// BATTLE TEMPLATES & PATTERNS
// ============================================================================

export type BattleType = 
  | 'duel' | 'group_fight' | 'ambush' | 'defense' | 'siege'
  | 'tournament' | 'assassination' | 'chase' | 'escape'
  | 'boss_fight' | 'minion_wave' | 'surprise_attack';

export type TacticalApproach = 
  | 'brute_force' | 'outsmart' | 'attrition' | 'hit_and_run'
  | 'environmental' | 'teamwork' | 'sacrifice_play' | 'bluff'
  | 'counter_attack' | 'overwhelming' | 'defensive' | 'trap';

export type BattleOutcome = 
  | 'clean_victory' | 'pyrrhic_victory' | 'narrow_escape'
  | 'strategic_retreat' | 'interrupted' | 'draw'
  | 'defeat_recovery' | 'total_defeat';

export type CombatElement =
  | 'skill_clash' | 'weapon_exchange' | 'formation_break'
  | 'power_reveal' | 'technique_counter' | 'environmental_use'
  | 'item_usage' | 'reinforcement_arrival' | 'betrayal'
  | 'breakthrough_during_battle' | 'hidden_card' | 'sacrifice'
  | 'teamwork' | 'trap' | 'overwhelming';

// Battle templates with variety requirements
export const BATTLE_TEMPLATES: Record<BattleType, {
  description: string;
  minElements: number;
  suggestedElements: CombatElement[];
  suggestedApproaches: TacticalApproach[];
  typicalLength: { min: number; max: number }; // in words
}> = {
  duel: {
    description: 'Đấu tay đôi, thường formal với rules',
    minElements: 3,
    suggestedElements: ['skill_clash', 'technique_counter', 'power_reveal', 'hidden_card'],
    suggestedApproaches: ['brute_force', 'outsmart', 'counter_attack'],
    typicalLength: { min: 1500, max: 3000 },
  },
  group_fight: {
    description: 'Chiến đấu nhóm, cần coordination',
    minElements: 4,
    suggestedElements: ['formation_break', 'teamwork', 'reinforcement_arrival', 'environmental_use'],
    suggestedApproaches: ['teamwork', 'overwhelming', 'defensive'],
    typicalLength: { min: 2000, max: 4000 },
  },
  ambush: {
    description: 'Tấn công bất ngờ, cần element of surprise',
    minElements: 3,
    suggestedElements: ['environmental_use', 'item_usage', 'power_reveal'],
    suggestedApproaches: ['hit_and_run', 'trap', 'overwhelming'],
    typicalLength: { min: 1000, max: 2500 },
  },
  boss_fight: {
    description: 'Đánh boss, epic và high-stakes',
    minElements: 5,
    suggestedElements: ['skill_clash', 'power_reveal', 'breakthrough_during_battle', 'hidden_card', 'sacrifice'],
    suggestedApproaches: ['attrition', 'sacrifice_play', 'teamwork'],
    typicalLength: { min: 3000, max: 6000 },
  },
  chase: {
    description: 'Truy đuổi, focus on movement và obstacles',
    minElements: 3,
    suggestedElements: ['environmental_use', 'item_usage', 'trap'],
    suggestedApproaches: ['hit_and_run', 'bluff', 'environmental'],
    typicalLength: { min: 1500, max: 3000 },
  },
  escape: {
    description: 'Thoát thân, MC phải run/survive',
    minElements: 3,
    suggestedElements: ['environmental_use', 'hidden_card', 'sacrifice'],
    suggestedApproaches: ['defensive', 'bluff', 'environmental'],
    typicalLength: { min: 1000, max: 2500 },
  },
  tournament: {
    description: 'Thi đấu formal, nhiều matches liên tiếp',
    minElements: 3,
    suggestedElements: ['skill_clash', 'technique_counter', 'power_reveal'],
    suggestedApproaches: ['outsmart', 'brute_force', 'counter_attack'],
    typicalLength: { min: 2000, max: 4000 },
  },
  siege: {
    description: 'Công thành/phòng thủ quy mô lớn',
    minElements: 5,
    suggestedElements: ['formation_break', 'environmental_use', 'reinforcement_arrival', 'sacrifice', 'betrayal'],
    suggestedApproaches: ['attrition', 'overwhelming', 'defensive'],
    typicalLength: { min: 4000, max: 8000 },
  },
  assassination: {
    description: 'Ám sát, stealth focus',
    minElements: 2,
    suggestedElements: ['hidden_card', 'item_usage', 'betrayal'],
    suggestedApproaches: ['trap', 'hit_and_run'],
    typicalLength: { min: 800, max: 2000 },
  },
  defense: {
    description: 'Phòng thủ vị trí/người',
    minElements: 4,
    suggestedElements: ['formation_break', 'environmental_use', 'reinforcement_arrival', 'sacrifice'],
    suggestedApproaches: ['defensive', 'attrition', 'trap'],
    typicalLength: { min: 2000, max: 4000 },
  },
  surprise_attack: {
    description: 'Bị tấn công bất ngờ',
    minElements: 3,
    suggestedElements: ['power_reveal', 'hidden_card', 'environmental_use'],
    suggestedApproaches: ['counter_attack', 'defensive', 'bluff'],
    typicalLength: { min: 1000, max: 2500 },
  },
  minion_wave: {
    description: 'Đánh hàng loạt kẻ yếu',
    minElements: 2,
    suggestedElements: ['skill_clash', 'power_reveal', 'overwhelming'],
    suggestedApproaches: ['overwhelming', 'brute_force'],
    typicalLength: { min: 500, max: 1500 },
  },
};

// ============================================================================
// TYPES
// ============================================================================

export interface BattleRecord {
  id: string;
  projectId: string;
  chapterNumber: number;
  
  // Battle details
  battleType: BattleType;
  tacticalApproach: TacticalApproach;
  outcome: BattleOutcome;
  
  // Participants
  protagonistPowerLevel: string;
  enemyPowerLevel: string;
  enemyType: string; // e.g., "young master", "demon beast", "assassin"
  
  // Elements used
  elementsUsed: CombatElement[];
  
  // Pacing
  wordCount: number;
  duration: 'brief' | 'medium' | 'extended'; // In-story duration
  
  // Quality
  varietyScore: number; // 0-100
  issues: string[];
}

export interface EnemyScaling {
  projectId: string;
  chapterNumber: number;
  enemyName: string;
  enemyPowerLevel: string;
  protagonistPowerLevel: string;
  powerGap: number; // -10 to +10 (negative = weaker, positive = stronger)
  outcomeLogic: string; // Why the outcome made sense
}

export interface BattleVarietyReport {
  totalBattles: number;
  typeDistribution: Record<BattleType, number>;
  approachDistribution: Record<TacticalApproach, number>;
  outcomeDistribution: Record<BattleOutcome, number>;
  overusedTypes: BattleType[];
  underusedElements: CombatElement[];
  avgVarietyScore: number;
  recommendations: string[];
}

// ============================================================================
// BATTLE VARIETY TRACKER
// ============================================================================

export class BattleVarietyTracker {
  private projectId: string;
  private battles: BattleRecord[] = [];
  private enemyScaling: EnemyScaling[] = [];
  
  constructor(projectId: string) {
    this.projectId = projectId;
  }
  
  private get supabase() {
    return getSupabase();
  }
  
  /**
   * Initialize from database
   */
  async initialize(): Promise<void> {
    const { data: battles, error: battlesError } = await this.supabase
      .from('battle_records')
      .select('*')
      .eq('project_id', this.projectId)
      .order('chapter_number', { ascending: true });
    
    if (battlesError) {
      logger.debug('BattleVarietyTracker battle_records load failed (non-fatal)', {
        projectId: this.projectId,
        error: battlesError.message,
      });
    }
    if (battles) {
      this.battles = battles.map(b => ({
        id: b.id,
        projectId: b.project_id,
        chapterNumber: b.chapter_number,
        battleType: b.battle_type,
        tacticalApproach: b.tactical_approach,
        outcome: b.outcome,
        protagonistPowerLevel: b.protagonist_power_level,
        enemyPowerLevel: b.enemy_power_level,
        enemyType: b.enemy_type,
        elementsUsed: b.elements_used || [],
        wordCount: b.word_count,
        duration: b.duration,
        varietyScore: b.variety_score,
        issues: b.issues || [],
      }));
    }
    
    const { data: scaling, error: scalingError } = await this.supabase
      .from('enemy_scaling')
      .select('*')
      .eq('project_id', this.projectId);
    
    if (scalingError) {
      logger.debug('BattleVarietyTracker enemy_scaling load failed (non-fatal)', {
        projectId: this.projectId,
        error: scalingError.message,
      });
    }
    if (scaling) {
      this.enemyScaling = scaling;
    }
  }
  
  /**
   * Analyze battle for variety
   */
  analyzeBattle(
    battleType: BattleType,
    approach: TacticalApproach,
    elements: CombatElement[],
    chapterNumber: number
  ): { varietyScore: number; issues: string[]; suggestions: string[] } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let varietyScore = 70; // Base score
    
    // Get recent battles for comparison
    const recentBattles = this.battles
      .filter(b => b.chapterNumber >= chapterNumber - 30)
      .slice(-10);
    
    // Check battle type cooldown
    const sameTypeRecent = recentBattles.filter(b => b.battleType === battleType).length;
    if (sameTypeRecent >= 2) {
      varietyScore -= 15;
      issues.push(`"${battleType}" battle đã dùng ${sameTypeRecent} lần trong 30 chương gần đây`);
      
      // Suggest alternatives
      const unusedTypes = Object.keys(BATTLE_TEMPLATES).filter(t => 
        !recentBattles.some(b => b.battleType === t)
      ) as BattleType[];
      
      if (unusedTypes.length > 0) {
        suggestions.push(`Thử dùng: ${unusedTypes.slice(0, 3).join(', ')}`);
      }
    }
    
    // Check tactical approach cooldown
    const sameApproachRecent = recentBattles.filter(b => b.tacticalApproach === approach).length;
    if (sameApproachRecent >= 3) {
      varietyScore -= 10;
      issues.push(`Tactical approach "${approach}" quá lặp lại`);
      
      const template = BATTLE_TEMPLATES[battleType];
      const unusedApproaches = template.suggestedApproaches.filter(a =>
        !recentBattles.some(b => b.tacticalApproach === a)
      );
      if (unusedApproaches.length > 0) {
        suggestions.push(`Thử approach: ${unusedApproaches.join(', ')}`);
      }
    }
    
    // Check element variety
    const template = BATTLE_TEMPLATES[battleType];
    if (elements.length < template.minElements) {
      varietyScore -= 10;
      issues.push(`Thiếu combat elements (có ${elements.length}, cần ${template.minElements})`);
      
      const unusedElements = template.suggestedElements.filter(e => !elements.includes(e));
      if (unusedElements.length > 0) {
        suggestions.push(`Thêm: ${unusedElements.slice(0, 3).join(', ')}`);
      }
    }
    
    // Check for stale element combinations
    const elementSet = new Set(elements);
    for (const recentBattle of recentBattles.slice(-3)) {
      const recentSet = new Set(recentBattle.elementsUsed);
      const overlap = [...elementSet].filter(e => recentSet.has(e)).length;
      if (overlap >= 3 && elementSet.size <= 4) {
        varietyScore -= 5;
        issues.push('Combat elements quá giống battles gần đây');
        break;
      }
    }
    
    // Bonus for using rarely-used elements
    const allUsedElements = recentBattles.flatMap(b => b.elementsUsed);
    const rareElements = elements.filter(e => 
      allUsedElements.filter(ae => ae === e).length <= 1
    );
    if (rareElements.length >= 2) {
      varietyScore += 10;
      suggestions.push(`Tốt! Dùng rare elements: ${rareElements.join(', ')}`);
    }
    
    return {
      varietyScore: Math.max(0, Math.min(100, varietyScore)),
      issues,
      suggestions,
    };
  }
  
  /**
   * Validate enemy power scaling
   */
  validateEnemyScaling(
    protagonistLevel: string,
    enemyLevel: string,
    outcome: BattleOutcome,
    chapterNumber: number,
    totalChapters: number = 2000
  ): { valid: boolean; issues: string[]; suggestions: string[] } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    // Parse power levels (assumes format like "Kim Đan 3" or "Luyện Khí 9")
    const protLevel = this.parsePowerLevel(protagonistLevel);
    const enemyLvl = this.parsePowerLevel(enemyLevel);
    
    const powerGap = enemyLvl - protLevel;
    
    // Check if outcome makes sense with power gap
    if (powerGap > 3 && ['clean_victory', 'pyrrhic_victory'].includes(outcome)) {
      issues.push(`Enemy mạnh hơn ${powerGap} levels nhưng thua dễ dàng - không hợp lý`);
      suggestions.push('Thêm giải thích: item đặc biệt, weakness của enemy, external help');
    }
    
    if (powerGap < -2 && ['defeat_recovery', 'total_defeat'].includes(outcome)) {
      issues.push(`MC mạnh hơn nhiều nhưng vẫn thua - cần giải thích`);
      suggestions.push('Thêm: enemy có hidden power, MC bị hạn chế, bị phản bội');
    }
    
    // Check enemy scaling over story
    const progress = chapterNumber / totalChapters;
    const recentScaling = this.enemyScaling
      .filter(s => s.chapterNumber >= chapterNumber - 50)
      .slice(-10);
    
    // Check for power creep issues
    if (recentScaling.length >= 5) {
      const avgGap = recentScaling.reduce((sum, s) => sum + s.powerGap, 0) / recentScaling.length;
      
      if (avgGap < -1 && progress < 0.8) {
        issues.push('Enemy quá yếu so với MC trong nhiều trận gần đây');
        suggestions.push('Tăng power level của enemy, hoặc introduce new threat tier');
      }
      
      if (avgGap > 2) {
        issues.push('Enemy liên tục quá mạnh - MC không có thời gian nghỉ');
        suggestions.push('Thêm một số trận dễ hơn để pacing tốt hơn');
      }
    }
    
    // Check if MC always wins same power gap
    const similarGapBattles = this.battles.filter(b => {
      const bProtLevel = this.parsePowerLevel(b.protagonistPowerLevel);
      const bEnemyLevel = this.parsePowerLevel(b.enemyPowerLevel);
      return Math.abs((bEnemyLevel - bProtLevel) - powerGap) <= 1;
    });
    
    if (similarGapBattles.length >= 3) {
      const alwaysWin = similarGapBattles.every(b => 
        ['clean_victory', 'pyrrhic_victory'].includes(b.outcome)
      );
      if (alwaysWin) {
        issues.push('MC luôn thắng enemy với power gap tương tự - predictable');
        suggestions.push('Cho MC thua hoặc khó khăn hơn để tạo tension');
      }
    }
    
    return {
      valid: issues.length === 0,
      issues,
      suggestions,
    };
  }
  
  /**
   * Parse power level string to numeric value
   */
  private parsePowerLevel(level: string): number {
    const realmValues: Record<string, number> = {
      'luyện khí': 10,
      'trúc cơ': 20,
      'kim đan': 30,
      'nguyên anh': 40,
      'hóa thần': 50,
      'luyện hư': 60,
      'hợp thể': 70,
      'đại thừa': 80,
      'độ kiếp': 90,
    };
    
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
   * Record a battle
   */
  async recordBattle(battle: Omit<BattleRecord, 'id' | 'projectId'>): Promise<void> {
    const record: BattleRecord = {
      ...battle,
      id: randomUUID(),
      projectId: this.projectId,
    };
    
    this.battles.push(record);
    
    // Record enemy scaling
    this.enemyScaling.push({
      projectId: this.projectId,
      chapterNumber: battle.chapterNumber,
      enemyName: battle.enemyType,
      enemyPowerLevel: battle.enemyPowerLevel,
      protagonistPowerLevel: battle.protagonistPowerLevel,
      powerGap: this.parsePowerLevel(battle.enemyPowerLevel) - this.parsePowerLevel(battle.protagonistPowerLevel),
      outcomeLogic: `${battle.outcome} via ${battle.tacticalApproach}`,
    });
    
    // Save to database
    const { error: insertError } = await this.supabase.from('battle_records').insert({
      id: record.id,
      project_id: record.projectId,
      chapter_number: record.chapterNumber,
      battle_type: record.battleType,
      tactical_approach: record.tacticalApproach,
      outcome: record.outcome,
      protagonist_power_level: record.protagonistPowerLevel,
      enemy_power_level: record.enemyPowerLevel,
      enemy_type: record.enemyType,
      elements_used: record.elementsUsed,
      word_count: record.wordCount,
      duration: record.duration,
      variety_score: record.varietyScore,
      issues: record.issues,
    });
    if (insertError) {
      logger.debug('battle_records insert failed (non-fatal)', {
        projectId: this.projectId,
        chapterNumber: battle.chapterNumber,
        operation: 'recordBattle',
        error: insertError.message,
      });
    }
  }
  
  /**
   * Get variety report
   */
  getVarietyReport(): BattleVarietyReport {
    const typeDistribution = {} as Record<BattleType, number>;
    const approachDistribution = {} as Record<TacticalApproach, number>;
    const outcomeDistribution = {} as Record<BattleOutcome, number>;
    
    for (const battle of this.battles) {
      typeDistribution[battle.battleType] = (typeDistribution[battle.battleType] || 0) + 1;
      approachDistribution[battle.tacticalApproach] = (approachDistribution[battle.tacticalApproach] || 0) + 1;
      outcomeDistribution[battle.outcome] = (outcomeDistribution[battle.outcome] || 0) + 1;
    }
    
    // Find overused types (>30% of battles)
    const totalBattles = this.battles.length;
    const overusedTypes = Object.entries(typeDistribution)
      .filter(([_, count]) => count / totalBattles > 0.3)
      .map(([type]) => type as BattleType);
    
    // Find underused elements
    const allUsedElements = this.battles.flatMap(b => b.elementsUsed);
    const allPossibleElements: CombatElement[] = [
      'skill_clash', 'weapon_exchange', 'formation_break', 'power_reveal',
      'technique_counter', 'environmental_use', 'item_usage',
      'reinforcement_arrival', 'betrayal', 'breakthrough_during_battle',
      'hidden_card', 'sacrifice', 'teamwork', 'trap', 'overwhelming',
    ];
    const underusedElements = allPossibleElements.filter(e =>
      allUsedElements.filter(ae => ae === e).length < totalBattles * 0.1
    );
    
    // Calculate average variety score
    const avgVarietyScore = this.battles.length > 0
      ? this.battles.reduce((sum, b) => sum + b.varietyScore, 0) / this.battles.length
      : 70;
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (overusedTypes.length > 0) {
      recommendations.push(`Giảm sử dụng: ${overusedTypes.join(', ')}`);
    }
    
    if (underusedElements.length > 3) {
      recommendations.push(`Thử dùng: ${underusedElements.slice(0, 4).join(', ')}`);
    }
    
    const mcWinRate = this.battles.filter(b => 
      ['clean_victory', 'pyrrhic_victory'].includes(b.outcome)
    ).length / Math.max(1, totalBattles);
    
    if (mcWinRate > 0.8) {
      recommendations.push('MC thắng quá nhiều (>80%). Thêm defeats/struggles.');
    } else if (mcWinRate < 0.5) {
      recommendations.push('MC thua nhiều. Cân nhắc power-up hoặc tactical victories.');
    }
    
    return {
      totalBattles,
      typeDistribution,
      approachDistribution,
      outcomeDistribution,
      overusedTypes,
      underusedElements,
      avgVarietyScore: Math.round(avgVarietyScore),
      recommendations,
    };
  }
  
  /**
   * Build context for battle planning
   */
  buildBattleContext(battleType: BattleType, chapterNumber: number): string {
    const template = BATTLE_TEMPLATES[battleType];
    const analysis = this.analyzeBattle(
      battleType,
      template.suggestedApproaches[0],
      [],
      chapterNumber
    );
    
    const recentBattles = this.battles.slice(-5);
    
    const lines = [
      `## Battle Planning: ${battleType}`,
      `**Template:** ${template.description}`,
      `**Min elements needed:** ${template.minElements}`,
      `**Suggested elements:** ${template.suggestedElements.join(', ')}`,
      `**Suggested approaches:** ${template.suggestedApproaches.join(', ')}`,
      `**Word count range:** ${template.typicalLength.min}-${template.typicalLength.max}`,
      '',
      '## Recent battles:',
    ];
    
    for (const battle of recentBattles) {
      lines.push(`- Ch${battle.chapterNumber}: ${battle.battleType} (${battle.tacticalApproach}) → ${battle.outcome}`);
    }
    
    if (analysis.issues.length > 0) {
      lines.push('\n## Warnings:');
      for (const issue of analysis.issues) {
        lines.push(`- ${issue}`);
      }
    }
    
    if (analysis.suggestions.length > 0) {
      lines.push('\n## Suggestions:');
      for (const suggestion of analysis.suggestions) {
        lines.push(`- ${suggestion}`);
      }
    }
    
    return lines.join('\n');
  }
}

export function createBattleVarietyTracker(projectId: string): BattleVarietyTracker {
  return new BattleVarietyTracker(projectId);
}
