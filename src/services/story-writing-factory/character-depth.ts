/**
 * Character Depth & Growth Tracker
 *
 * Solves:
 * 1. Side characters flat, không personality
 * 2. MC không character growth
 * 3. Villains one-dimensional
 * 4. Harem characters personality giống nhau
 * 5. Romance progression tracking
 * 6. Character arc milestones
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization
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

export type CharacterRole = 
  | 'protagonist' | 'deuteragonist' | 'antagonist' 
  | 'mentor' | 'love_interest' | 'ally' | 'rival' 
  | 'comic_relief' | 'minor' | 'extra';

export type PersonalityTrait = 
  | 'brave' | 'cautious' | 'cunning' | 'honest' | 'loyal' 
  | 'ambitious' | 'compassionate' | 'arrogant' | 'humble' 
  | 'hot_tempered' | 'calm' | 'curious' | 'stubborn'
  | 'romantic' | 'cold' | 'playful' | 'serious'
  | 'greedy' | 'generous' | 'vengeful' | 'forgiving';

export type MotivationType = 
  | 'power' | 'revenge' | 'protection' | 'love' | 'freedom'
  | 'knowledge' | 'wealth' | 'recognition' | 'survival'
  | 'redemption' | 'duty' | 'justice' | 'family';

export type RelationshipStage = 
  | 'stranger' | 'acquaintance' | 'friend' | 'close_friend'
  | 'rival' | 'enemy' | 'nemesis'
  | 'crush' | 'dating' | 'committed' | 'married';

export interface CharacterDepthProfile {
  id: string;
  projectId: string;
  name: string;
  role: CharacterRole;
  
  // Core Identity
  primaryMotivation: MotivationType;
  secondaryMotivations: MotivationType[];
  backstory: string;
  darkSecret?: string;
  flaw: string;
  strength: string;
  
  // Personality
  personalityTraits: PersonalityTrait[];
  speechPattern: {
    formality: 'casual' | 'neutral' | 'formal' | 'archaic';
    verbosity: 'terse' | 'normal' | 'verbose';
    quirks: string[]; // Specific phrases, accent, etc.
  };
  
  // Distinctiveness (for avoiding sameness)
  distinctiveFeatures: {
    appearance: string[];
    mannerisms: string[];
    habits: string[];
    beliefs: string[];
  };
  
  // Growth Tracking
  characterArc: {
    startingState: string;
    currentState: string;
    targetEndState: string;
    milestones: CharacterMilestone[];
    growthScore: number; // 0-100
  };
  
  // Villain-specific (if antagonist)
  villainProfile?: {
    motivationDepth: string; // Why they became villain
    sympatheticElements: string[];
    redeemableQualities?: string[];
    threatLevel: number; // 1-10
  };
  
  // Stats
  firstAppearance: number;
  lastAppearance: number;
  chapterAppearances: number[];
  totalSceneTime: number; // Estimated % of screen time
  
  createdAt: number;
  updatedAt: number;
}

export interface CharacterMilestone {
  id: string;
  chapter: number;
  type: 'realization' | 'decision' | 'sacrifice' | 'growth' | 'setback' | 'revelation';
  description: string;
  impact: 'minor' | 'moderate' | 'major';
  traitAffected?: PersonalityTrait;
  completed: boolean;
}

export interface RomanceProgression {
  id: string;
  projectId: string;
  character1: string;
  character2: string;
  
  currentStage: RelationshipStage;
  stageHistory: Array<{ stage: RelationshipStage; chapter: number; trigger: string }>;
  
  // Milestones
  firstMeeting?: number;
  firstPositiveInteraction?: number;
  firstConflict?: number;
  firstRomanticMoment?: number;
  confession?: number;
  
  // Chemistry factors
  sharedExperiences: string[];
  conflicts: string[];
  romanticMoments: string[];
  
  // Pacing
  progressionSpeed: 'slow_burn' | 'medium' | 'fast';
  chaptersInCurrentStage: number;
  
  status: 'developing' | 'established' | 'stalled' | 'ended';
}

export interface CharacterUniquenessReport {
  character: string;
  uniquenessScore: number; // 0-100
  similarTo: Array<{ character: string; similarity: number; sharedTraits: string[] }>;
  missingDistinction: string[];
  suggestions: string[];
}

// ============================================================================
// CHARACTER DEPTH TRACKER CLASS
// ============================================================================

export class CharacterDepthTracker {
  private projectId: string;
  private characters: Map<string, CharacterDepthProfile> = new Map();
  private romances: Map<string, RomanceProgression> = new Map();
  
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
    // Load character profiles
    const { data: profiles } = await this.supabase
      .from('character_depth_profiles')
      .select('*')
      .eq('project_id', this.projectId);
    
    if (profiles) {
      for (const p of profiles) {
        const profile: CharacterDepthProfile = {
          id: p.id,
          projectId: p.project_id,
          name: p.name,
          role: p.role,
          primaryMotivation: p.primary_motivation,
          secondaryMotivations: p.secondary_motivations || [],
          backstory: p.backstory,
          darkSecret: p.dark_secret,
          flaw: p.flaw,
          strength: p.strength,
          personalityTraits: p.personality_traits || [],
          speechPattern: p.speech_pattern || { formality: 'neutral', verbosity: 'normal', quirks: [] },
          distinctiveFeatures: p.distinctive_features || { appearance: [], mannerisms: [], habits: [], beliefs: [] },
          characterArc: p.character_arc || { startingState: '', currentState: '', targetEndState: '', milestones: [], growthScore: 0 },
          villainProfile: p.villain_profile,
          firstAppearance: p.first_appearance,
          lastAppearance: p.last_appearance,
          chapterAppearances: p.chapter_appearances || [],
          totalSceneTime: p.total_scene_time || 0,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        };
        this.characters.set(p.name.toLowerCase(), profile);
      }
    }
    
    // Load romance progressions
    const { data: romances } = await this.supabase
      .from('romance_progressions')
      .select('*')
      .eq('project_id', this.projectId);
    
    if (romances) {
      for (const r of romances) {
        const romance: RomanceProgression = {
          id: r.id,
          projectId: r.project_id,
          character1: r.character1,
          character2: r.character2,
          currentStage: r.current_stage,
          stageHistory: r.stage_history || [],
          firstMeeting: r.first_meeting,
          firstPositiveInteraction: r.first_positive_interaction,
          firstConflict: r.first_conflict,
          firstRomanticMoment: r.first_romantic_moment,
          confession: r.confession,
          sharedExperiences: r.shared_experiences || [],
          conflicts: r.conflicts || [],
          romanticMoments: r.romantic_moments || [],
          progressionSpeed: r.progression_speed || 'medium',
          chaptersInCurrentStage: r.chapters_in_current_stage || 0,
          status: r.status || 'developing',
        };
        const key = this.getRomanceKey(r.character1, r.character2);
        this.romances.set(key, romance);
      }
    }
  }
  
  /**
   * Create a new character profile
   */
  async createCharacter(
    name: string,
    role: CharacterRole,
    config: {
      primaryMotivation: MotivationType;
      secondaryMotivations?: MotivationType[];
      backstory: string;
      flaw: string;
      strength: string;
      personalityTraits: PersonalityTrait[];
      darkSecret?: string;
      speechPattern?: CharacterDepthProfile['speechPattern'];
      distinctiveFeatures?: CharacterDepthProfile['distinctiveFeatures'];
      villainProfile?: CharacterDepthProfile['villainProfile'];
      firstAppearance: number;
    }
  ): Promise<{ success: boolean; profile?: CharacterDepthProfile; warning?: string }> {
    // Check for uniqueness
    const uniquenessCheck = this.checkUniqueness(name, config.personalityTraits, config.distinctiveFeatures);
    let warning: string | undefined;
    
    if (uniquenessCheck.uniquenessScore < 50) {
      warning = `Cảnh báo: ${name} quá giống với ${uniquenessCheck.similarTo[0]?.character}`;
    }
    
    const id = `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    
    const profile: CharacterDepthProfile = {
      id,
      projectId: this.projectId,
      name,
      role,
      primaryMotivation: config.primaryMotivation,
      secondaryMotivations: config.secondaryMotivations || [],
      backstory: config.backstory,
      darkSecret: config.darkSecret,
      flaw: config.flaw,
      strength: config.strength,
      personalityTraits: config.personalityTraits,
      speechPattern: config.speechPattern || { formality: 'neutral', verbosity: 'normal', quirks: [] },
      distinctiveFeatures: config.distinctiveFeatures || { appearance: [], mannerisms: [], habits: [], beliefs: [] },
      characterArc: {
        startingState: 'Beginning',
        currentState: 'Beginning',
        targetEndState: '',
        milestones: [],
        growthScore: 0,
      },
      villainProfile: config.villainProfile,
      firstAppearance: config.firstAppearance,
      lastAppearance: config.firstAppearance,
      chapterAppearances: [config.firstAppearance],
      totalSceneTime: 0,
      createdAt: now,
      updatedAt: now,
    };
    
    this.characters.set(name.toLowerCase(), profile);
    await this.saveCharacter(profile);
    
    return { success: true, profile, warning };
  }
  
  /**
   * Add a character milestone
   */
  async addMilestone(
    characterName: string,
    milestone: Omit<CharacterMilestone, 'id' | 'completed'>
  ): Promise<{ success: boolean }> {
    const profile = this.characters.get(characterName.toLowerCase());
    if (!profile) return { success: false };
    
    const newMilestone: CharacterMilestone = {
      ...milestone,
      id: `ms_${Date.now()}`,
      completed: false,
    };
    
    profile.characterArc.milestones.push(newMilestone);
    profile.updatedAt = Date.now();
    
    await this.saveCharacter(profile);
    return { success: true };
  }
  
  /**
   * Complete a milestone
   */
  async completeMilestone(
    characterName: string,
    milestoneId: string,
    currentState?: string
  ): Promise<{ success: boolean; growthIncrease?: number }> {
    const profile = this.characters.get(characterName.toLowerCase());
    if (!profile) return { success: false };
    
    const milestone = profile.characterArc.milestones.find(m => m.id === milestoneId);
    if (!milestone) return { success: false };
    
    milestone.completed = true;
    
    // Calculate growth increase
    const growthIncrease = milestone.impact === 'major' ? 15 : milestone.impact === 'moderate' ? 8 : 4;
    profile.characterArc.growthScore = Math.min(100, profile.characterArc.growthScore + growthIncrease);
    
    if (currentState) {
      profile.characterArc.currentState = currentState;
    }
    
    profile.updatedAt = Date.now();
    await this.saveCharacter(profile);
    
    return { success: true, growthIncrease };
  }
  
  /**
   * Check character uniqueness against existing characters
   */
  checkUniqueness(
    name: string,
    traits: PersonalityTrait[],
    features?: CharacterDepthProfile['distinctiveFeatures']
  ): CharacterUniquenessReport {
    const similarTo: Array<{ character: string; similarity: number; sharedTraits: string[] }> = [];
    
    for (const [existingName, profile] of this.characters) {
      if (existingName === name.toLowerCase()) continue;
      
      // Calculate trait overlap
      const sharedTraits = traits.filter(t => profile.personalityTraits.includes(t));
      const traitSimilarity = sharedTraits.length / Math.max(traits.length, profile.personalityTraits.length);
      
      // Calculate role similarity
      const roleSimilarity = profile.role === this.guessRole(traits) ? 0.2 : 0;
      
      // Calculate speech similarity
      const speechSimilarity = features?.appearance && profile.distinctiveFeatures.appearance.some(a =>
        features.appearance.includes(a)
      ) ? 0.1 : 0;
      
      const totalSimilarity = (traitSimilarity * 0.6 + roleSimilarity + speechSimilarity) * 100;
      
      if (totalSimilarity > 30) {
        similarTo.push({
          character: profile.name,
          similarity: Math.round(totalSimilarity),
          sharedTraits: sharedTraits,
        });
      }
    }
    
    similarTo.sort((a, b) => b.similarity - a.similarity);
    
    const uniquenessScore = similarTo.length > 0 
      ? Math.max(0, 100 - similarTo[0].similarity) 
      : 100;
    
    const missingDistinction: string[] = [];
    const suggestions: string[] = [];
    
    if (uniquenessScore < 70) {
      if (!features?.mannerisms?.length) {
        missingDistinction.push('Thiếu mannerisms');
        suggestions.push('Thêm hành vi đặc trưng (cử chỉ, thói quen)');
      }
      if (!features?.habits?.length) {
        missingDistinction.push('Thiếu habits');
        suggestions.push('Thêm thói quen đặc trưng để tạo chiều sâu');
      }
      if (traits.length < 3) {
        missingDistinction.push('Thiếu personality traits');
        suggestions.push('Thêm nhiều traits hơn để tạo chiều sâu');
      }
    }
    
    return {
      character: name,
      uniquenessScore,
      similarTo: similarTo.slice(0, 3),
      missingDistinction,
      suggestions,
    };
  }
  
  /**
   * Create villain with depth
   */
  async createVillain(
    name: string,
    config: {
      primaryMotivation: MotivationType;
      backstory: string;
      motivationDepth: string;
      sympatheticElements: string[];
      redeemableQualities?: string[];
      personalityTraits: PersonalityTrait[];
      flaw: string;
      strength: string;
      threatLevel: number;
      firstAppearance: number;
    }
  ): Promise<{ success: boolean; profile?: CharacterDepthProfile; warning?: string }> {
    const warnings: string[] = [];
    
    // Validate villain depth
    if (!config.motivationDepth || config.motivationDepth.length < 50) {
      warnings.push('Villain motivation quá nông, cần giải thích sâu hơn tại sao họ trở thành villain');
    }
    
    if (config.sympatheticElements.length < 2) {
      warnings.push('Villain cần ít nhất 2 yếu tố sympathetic để tạo chiều sâu');
    }
    
    // Check for "generic evil" traits
    const genericTraits = ['arrogant', 'greedy', 'vengeful'];
    const genericCount = config.personalityTraits.filter(t => genericTraits.includes(t)).length;
    if (genericCount === config.personalityTraits.length) {
      warnings.push('Villain có quá nhiều "generic evil" traits. Thêm traits phức tạp hơn.');
    }
    
    const result = await this.createCharacter(name, 'antagonist', {
      ...config,
      villainProfile: {
        motivationDepth: config.motivationDepth,
        sympatheticElements: config.sympatheticElements,
        redeemableQualities: config.redeemableQualities,
        threatLevel: config.threatLevel,
      },
    });
    
    if (warnings.length > 0) {
      result.warning = (result.warning ? result.warning + '. ' : '') + warnings.join('. ');
    }
    
    return result;
  }
  
  // ============================================================================
  // ROMANCE TRACKING
  // ============================================================================
  
  /**
   * Initialize romance between two characters
   */
  async initializeRomance(
    character1: string,
    character2: string,
    firstMeetingChapter: number,
    progressionSpeed: 'slow_burn' | 'medium' | 'fast' = 'medium'
  ): Promise<{ success: boolean; romance?: RomanceProgression }> {
    const key = this.getRomanceKey(character1, character2);
    
    if (this.romances.has(key)) {
      return { success: false };
    }
    
    const romance: RomanceProgression = {
      id: `romance_${Date.now()}`,
      projectId: this.projectId,
      character1,
      character2,
      currentStage: 'stranger',
      stageHistory: [{ stage: 'stranger', chapter: firstMeetingChapter, trigger: 'First meeting' }],
      firstMeeting: firstMeetingChapter,
      sharedExperiences: [],
      conflicts: [],
      romanticMoments: [],
      progressionSpeed,
      chaptersInCurrentStage: 0,
      status: 'developing',
    };
    
    this.romances.set(key, romance);
    await this.saveRomance(romance);
    
    return { success: true, romance };
  }
  
  /**
   * Progress romance to next stage
   */
  async progressRomance(
    character1: string,
    character2: string,
    newStage: RelationshipStage,
    chapter: number,
    trigger: string
  ): Promise<{ success: boolean; warning?: string }> {
    const key = this.getRomanceKey(character1, character2);
    const romance = this.romances.get(key);
    
    if (!romance) return { success: false };
    
    // Validate progression
    const validation = this.validateRomanceProgression(romance, newStage, chapter);
    
    // Update
    romance.stageHistory.push({ stage: newStage, chapter, trigger });
    romance.currentStage = newStage;
    romance.chaptersInCurrentStage = 0;
    
    // Update specific milestones
    if (newStage === 'friend' && !romance.firstPositiveInteraction) {
      romance.firstPositiveInteraction = chapter;
    }
    if (['committed', 'dating'].includes(newStage) && !romance.confession) {
      romance.confession = chapter;
    }
    
    await this.saveRomance(romance);
    
    return { success: true, warning: validation.warning };
  }
  
  /**
   * Add romantic moment
   */
  async addRomanticMoment(
    character1: string,
    character2: string,
    chapter: number,
    description: string
  ): Promise<{ success: boolean }> {
    const key = this.getRomanceKey(character1, character2);
    const romance = this.romances.get(key);
    
    if (!romance) return { success: false };
    
    romance.romanticMoments.push(description);
    if (!romance.firstRomanticMoment) {
      romance.firstRomanticMoment = chapter;
    }
    
    await this.saveRomance(romance);
    return { success: true };
  }
  
  /**
   * Check if romance is stalled
   */
  checkRomanceStall(character1: string, character2: string, currentChapter: number): {
    isStalled: boolean;
    suggestion?: string;
  } {
    const key = this.getRomanceKey(character1, character2);
    const romance = this.romances.get(key);
    
    if (!romance) return { isStalled: false };
    
    const lastProgression = romance.stageHistory[romance.stageHistory.length - 1];
    const chaptersSinceProgress = currentChapter - lastProgression.chapter;
    
    // Thresholds based on speed
    const thresholds = {
      slow_burn: 100,
      medium: 50,
      fast: 25,
    };
    
    if (chaptersSinceProgress > thresholds[romance.progressionSpeed]) {
      return {
        isStalled: true,
        suggestion: `Romance giữa ${character1} và ${character2} đã stall ${chaptersSinceProgress} chương. Cần interaction hoặc development.`,
      };
    }
    
    return { isStalled: false };
  }
  
  /**
   * Validate romance progression pace
   */
  private validateRomanceProgression(
    romance: RomanceProgression,
    newStage: RelationshipStage,
    chapter: number
  ): { valid: boolean; warning?: string } {
    const lastEntry = romance.stageHistory[romance.stageHistory.length - 1];
    const chaptersSinceLastStage = chapter - lastEntry.chapter;
    
    // Minimum chapters between stages based on speed
    const minChapters = {
      slow_burn: { friend: 30, close_friend: 50, crush: 70, dating: 100 },
      medium: { friend: 15, close_friend: 25, crush: 35, dating: 50 },
      fast: { friend: 5, close_friend: 10, crush: 15, dating: 20 },
    };
    
    const required = minChapters[romance.progressionSpeed][newStage as keyof typeof minChapters['medium']];
    
    if (required && chaptersSinceLastStage < required) {
      return {
        valid: true, // Still allow but warn
        warning: `Romance progressing nhanh (${chaptersSinceLastStage} chương, recommended: ${required}+)`,
      };
    }
    
    return { valid: true };
  }
  
  private getRomanceKey(char1: string, char2: string): string {
    return [char1.toLowerCase(), char2.toLowerCase()].sort().join('_');
  }
  
  // ============================================================================
  // CONTEXT BUILDING
  // ============================================================================
  
  /**
   * Build character context for writing
   */
  buildCharacterContext(characterName: string): string {
    const profile = this.characters.get(characterName.toLowerCase());
    if (!profile) return `${characterName}: Không có thông tin chi tiết`;
    
    const lines = [
      `## ${profile.name} (${profile.role})`,
      `**Motivation:** ${profile.primaryMotivation}`,
      `**Traits:** ${profile.personalityTraits.join(', ')}`,
      `**Flaw:** ${profile.flaw}`,
      `**Strength:** ${profile.strength}`,
    ];
    
    if (profile.speechPattern.quirks.length > 0) {
      lines.push(`**Speech:** ${profile.speechPattern.quirks.join(', ')}`);
    }
    
    if (profile.distinctiveFeatures.mannerisms.length > 0) {
      lines.push(`**Mannerisms:** ${profile.distinctiveFeatures.mannerisms.join(', ')}`);
    }
    
    // Growth progress
    const completedMilestones = profile.characterArc.milestones.filter(m => m.completed).length;
    const totalMilestones = profile.characterArc.milestones.length;
    lines.push(`**Growth:** ${profile.characterArc.growthScore}% (${completedMilestones}/${totalMilestones} milestones)`);
    
    // Pending milestones
    const pendingMilestones = profile.characterArc.milestones.filter(m => !m.completed);
    if (pendingMilestones.length > 0) {
      lines.push(`**Next milestone:** ${pendingMilestones[0].description}`);
    }
    
    return lines.join('\n');
  }
  
  /**
   * Get characters needing development
   */
  getCharactersNeedingDevelopment(currentChapter: number): Array<{
    character: CharacterDepthProfile;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }> {
    const results: Array<{ character: CharacterDepthProfile; reason: string; priority: 'high' | 'medium' | 'low' }> = [];
    
    for (const profile of this.characters.values()) {
      // Check growth stall
      const chaptersSinceGrowth = currentChapter - (profile.characterArc.milestones
        .filter(m => m.completed)
        .sort((a, b) => b.chapter - a.chapter)[0]?.chapter || profile.firstAppearance);
      
      if (chaptersSinceGrowth > 50 && profile.role !== 'minor' && profile.role !== 'extra') {
        results.push({
          character: profile,
          reason: `Không có character development trong ${chaptersSinceGrowth} chương`,
          priority: profile.role === 'protagonist' ? 'high' : 'medium',
        });
      }
      
      // Check disappearance
      const chaptersSinceAppearance = currentChapter - profile.lastAppearance;
      if (chaptersSinceAppearance > 30 && ['ally', 'love_interest', 'rival'].includes(profile.role)) {
        results.push({
          character: profile,
          reason: `Không xuất hiện trong ${chaptersSinceAppearance} chương`,
          priority: 'medium',
        });
      }
      
      // Villain without depth
      if (profile.role === 'antagonist' && (!profile.villainProfile || profile.villainProfile.sympatheticElements.length < 2)) {
        results.push({
          character: profile,
          reason: 'Villain thiếu chiều sâu/sympathetic elements',
          priority: 'high',
        });
      }
    }
    
    return results.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }
  
  // ============================================================================
  // PERSISTENCE
  // ============================================================================
  
  private async saveCharacter(profile: CharacterDepthProfile): Promise<void> {
    await this.supabase
      .from('character_depth_profiles')
      .upsert({
        id: profile.id,
        project_id: profile.projectId,
        name: profile.name,
        role: profile.role,
        primary_motivation: profile.primaryMotivation,
        secondary_motivations: profile.secondaryMotivations,
        backstory: profile.backstory,
        dark_secret: profile.darkSecret,
        flaw: profile.flaw,
        strength: profile.strength,
        personality_traits: profile.personalityTraits,
        speech_pattern: profile.speechPattern,
        distinctive_features: profile.distinctiveFeatures,
        character_arc: profile.characterArc,
        villain_profile: profile.villainProfile,
        first_appearance: profile.firstAppearance,
        last_appearance: profile.lastAppearance,
        chapter_appearances: profile.chapterAppearances,
        total_scene_time: profile.totalSceneTime,
        created_at: profile.createdAt,
        updated_at: profile.updatedAt,
      }, { onConflict: 'id' });
  }
  
  private async saveRomance(romance: RomanceProgression): Promise<void> {
    await this.supabase
      .from('romance_progressions')
      .upsert({
        id: romance.id,
        project_id: romance.projectId,
        character1: romance.character1,
        character2: romance.character2,
        current_stage: romance.currentStage,
        stage_history: romance.stageHistory,
        first_meeting: romance.firstMeeting,
        first_positive_interaction: romance.firstPositiveInteraction,
        first_conflict: romance.firstConflict,
        first_romantic_moment: romance.firstRomanticMoment,
        confession: romance.confession,
        shared_experiences: romance.sharedExperiences,
        conflicts: romance.conflicts,
        romantic_moments: romance.romanticMoments,
        progression_speed: romance.progressionSpeed,
        chapters_in_current_stage: romance.chaptersInCurrentStage,
        status: romance.status,
      }, { onConflict: 'id' });
  }
  
  private guessRole(traits: PersonalityTrait[]): CharacterRole {
    if (traits.includes('arrogant') && traits.includes('greedy')) return 'antagonist';
    if (traits.includes('loyal') && traits.includes('brave')) return 'ally';
    if (traits.includes('romantic') || traits.includes('compassionate')) return 'love_interest';
    return 'minor';
  }
  
  // Getters
  getCharacter(name: string): CharacterDepthProfile | undefined {
    return this.characters.get(name.toLowerCase());
  }
  
  getRomance(char1: string, char2: string): RomanceProgression | undefined {
    return this.romances.get(this.getRomanceKey(char1, char2));
  }
  
  getAllCharacters(): CharacterDepthProfile[] {
    return Array.from(this.characters.values());
  }
  
  getAllRomances(): RomanceProgression[] {
    return Array.from(this.romances.values());
  }
}

export function createCharacterDepthTracker(projectId: string): CharacterDepthTracker {
  return new CharacterDepthTracker(projectId);
}
