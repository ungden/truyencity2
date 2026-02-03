/**
 * Story Writing Factory - Memory & Context Management
 *
 * Giải quyết:
 * 1. Context Window Limitation - Hierarchical summarization
 * 2. Consistency Drift - Dynamic state tracking
 * 3. Anti-Repetition - Beat ledger
 * 4. Persistence - Save/Load state
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  WorldBible,
  ChapterSummary,
  DopamineType,
  GenreType,
} from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface HierarchicalMemory {
  // Level 1: Recent (last 3 chapters) - Full detail
  recentChapters: ChapterMemory[];

  // Level 2: Arc summaries - Condensed
  arcSummaries: ArcMemory[];

  // Level 3: Volume summaries - High-level
  volumeSummaries: VolumeSummary[];

  // Level 4: Story essence - Core facts only
  storyEssence: StoryEssence;
}

export interface ChapterMemory {
  chapterNumber: number;
  title: string;
  summary: string; // 100-150 words
  keyEvents: string[];
  charactersInvolved: string[];
  locationUsed: string;
  plotThreadsAdvanced: string[];
  emotionalBeat: string;
  cliffhanger: string;
  wordCount: number;
}

export interface ArcMemory {
  arcNumber: number;
  title: string;
  summary: string; // 200-300 words
  chaptersRange: [number, number];
  majorEvents: string[];
  characterDevelopment: Record<string, string>;
  powerProgression: string;
  resolvedPlots: string[];
  newPlots: string[];
}

export interface VolumeSummary {
  volumeNumber: number;
  arcsIncluded: number[];
  summary: string; // 100-150 words
  majorMilestones: string[];
}

export interface StoryEssence {
  title: string;
  genre: GenreType;
  premise: string;
  protagonistName: string;
  currentRealm: string;
  currentLocation: string;
  mainGoal: string;
  majorAllies: string[];
  majorEnemies: string[];
  unresolvedMysteries: string[];
}

// ============================================================================
// BEAT LEDGER - Anti-Repetition
// ============================================================================

export interface BeatLedger {
  // Track used plot beats to avoid repetition
  usedBeats: BeatEntry[];

  // Cooldown tracking
  beatCooldowns: Record<string, number>; // beatType -> lastUsedChapter

  // Dopamine tracking
  dopamineHistory: DopamineEntry[];
}

export interface BeatEntry {
  chapterNumber: number;
  beatType: string;
  description: string;
  characters: string[];
  canRepeatAfter: number; // Chapters until can use similar beat
}

export interface DopamineEntry {
  chapterNumber: number;
  type: DopamineType;
  intensity: number;
  description: string;
}

// Cooldowns for different beat types (in chapters)
export const BEAT_COOLDOWNS: Record<string, number> = {
  'face_slap': 3,           // Can face-slap again after 3 chapters
  'breakthrough': 15,       // Major power-up every 15 chapters
  'tournament_win': 30,     // Tournament victory every 30 chapters
  'major_treasure': 20,     // Big treasure find every 20 chapters
  'ally_betrayal': 50,      // Betrayal arc every 50 chapters
  'love_confession': 40,    // Romance beat every 40 chapters
  'family_reunion': 100,    // Family plot every 100 chapters
  'near_death': 25,         // Near-death experience every 25 chapters
  'secret_reveal': 20,      // Major revelation every 20 chapters
  'mentor_death': 100,      // Mentor death once per 100 chapters
};

// ============================================================================
// CHARACTER STATE MACHINE
// ============================================================================

export interface CharacterState {
  name: string;
  status: 'active' | 'absent' | 'dead' | 'unknown';
  currentLocation: string;
  lastSeenChapter: number;
  relationshipToProtagonist: string;
  knownSecrets: string[]; // What this character knows
  pendingActions: string[]; // What they're planning
  emotionalState: string;
  powerLevel: string;
}

export interface CharacterTracker {
  protagonist: CharacterState;
  allies: CharacterState[];
  enemies: CharacterState[];
  neutral: CharacterState[];
}

// ============================================================================
// FORESHADOWING TRACKER
// ============================================================================

export interface ForeshadowingItem {
  id: string;
  setupChapter: number;
  description: string;
  payoffDeadline: number; // Must resolve by this chapter
  status: 'pending' | 'paid_off' | 'abandoned';
  payoffChapter?: number;
  importance: 'major' | 'minor';
}

export interface ForeshadowingTracker {
  items: ForeshadowingItem[];

  // Get overdue items that need resolution
  getOverdue(currentChapter: number): ForeshadowingItem[];

  // Get items approaching deadline
  getApproaching(currentChapter: number, threshold: number): ForeshadowingItem[];
}

// ============================================================================
// MEMORY MANAGER CLASS
// ============================================================================

export class MemoryManager {
  private projectId: string;
  private savePath: string;

  private memory: HierarchicalMemory;
  private beatLedger: BeatLedger;
  private characterTracker: CharacterTracker;
  private foreshadowing: ForeshadowingItem[];
  private worldBible: WorldBible | null = null;

  constructor(projectId: string, savePath?: string) {
    this.projectId = projectId;
    this.savePath = savePath || path.join(process.cwd(), 'chapters', projectId);

    this.memory = this.createEmptyMemory();
    this.beatLedger = this.createEmptyBeatLedger();
    this.characterTracker = this.createEmptyCharacterTracker();
    this.foreshadowing = [];
  }

  // ============================================================================
  // CONTEXT BUILDING - Hierarchical
  // ============================================================================

  /**
   * Build optimized context for AI based on current chapter
   * Uses hierarchical memory to stay within token limits
   */
  buildContext(currentChapter: number, maxTokens: number = 2000): string {
    const parts: string[] = [];
    let estimatedTokens = 0;

    // Layer 1: Story Essence (always include) ~100 tokens
    parts.push(this.formatStoryEssence());
    estimatedTokens += 100;

    // Layer 2: Current Arc Summary ~150 tokens
    const currentArc = this.getCurrentArcSummary(currentChapter);
    if (currentArc) {
      parts.push(this.formatArcSummary(currentArc));
      estimatedTokens += 150;
    }

    // Layer 3: Recent Chapters (last 3) ~300 tokens
    const recent = this.memory.recentChapters.slice(-3);
    if (recent.length > 0) {
      parts.push(this.formatRecentChapters(recent));
      estimatedTokens += recent.length * 100;
    }

    // Layer 4: Active Characters ~200 tokens
    const activeChars = this.getActiveCharacters(currentChapter);
    if (activeChars.length > 0 && estimatedTokens < maxTokens - 200) {
      parts.push(this.formatActiveCharacters(activeChars));
      estimatedTokens += 200;
    }

    // Layer 5: Pending Foreshadowing ~100 tokens
    const pendingFS = this.getPendingForeshadowing(currentChapter);
    if (pendingFS.length > 0 && estimatedTokens < maxTokens - 100) {
      parts.push(this.formatForeshadowing(pendingFS));
      estimatedTokens += 100;
    }

    // Layer 6: Beat Restrictions ~50 tokens
    const restrictions = this.getBeatRestrictions(currentChapter);
    if (restrictions.length > 0 && estimatedTokens < maxTokens - 50) {
      parts.push(this.formatBeatRestrictions(restrictions));
    }

    return parts.join('\n\n---\n\n');
  }

  /**
   * Get a minimal context for cost-sensitive operations
   */
  buildMinimalContext(currentChapter: number): string {
    const essence = this.memory.storyEssence;
    const lastChapter = this.memory.recentChapters[this.memory.recentChapters.length - 1];

    return `STORY: ${essence.title}
PROTAGONIST: ${essence.protagonistName} (${essence.currentRealm})
LOCATION: ${essence.currentLocation}
GOAL: ${essence.mainGoal}
LAST CHAPTER: ${lastChapter?.summary || 'Chương đầu tiên'}`;
  }

  // ============================================================================
  // MEMORY UPDATES
  // ============================================================================

  /**
   * Add a completed chapter to memory
   */
  addChapter(chapter: ChapterMemory): void {
    // Add to recent
    this.memory.recentChapters.push(chapter);

    // Keep only last 5 in full detail
    if (this.memory.recentChapters.length > 5) {
      this.memory.recentChapters.shift();
    }

    // Update story essence
    this.updateStoryEssence(chapter);

    // Check if arc is complete, create arc summary
    this.checkAndSummarizeArc(chapter.chapterNumber);
  }

  /**
   * Record a beat usage
   */
  recordBeat(chapterNumber: number, beatType: string, description: string, characters: string[]): void {
    const cooldown = BEAT_COOLDOWNS[beatType] || 10;

    this.beatLedger.usedBeats.push({
      chapterNumber,
      beatType,
      description,
      characters,
      canRepeatAfter: chapterNumber + cooldown,
    });

    this.beatLedger.beatCooldowns[beatType] = chapterNumber;
  }

  /**
   * Record dopamine delivery
   */
  recordDopamine(chapterNumber: number, type: DopamineType, intensity: number, description: string): void {
    this.beatLedger.dopamineHistory.push({
      chapterNumber,
      type,
      intensity,
      description,
    });
  }

  /**
   * Add foreshadowing
   */
  addForeshadowing(setupChapter: number, description: string, payoffDeadline: number, importance: 'major' | 'minor' = 'minor'): string {
    const id = `fs_${Date.now()}`;
    this.foreshadowing.push({
      id,
      setupChapter,
      description,
      payoffDeadline,
      status: 'pending',
      importance,
    });
    return id;
  }

  /**
   * Pay off foreshadowing
   */
  payoffForeshadowing(id: string, chapter: number): void {
    const item = this.foreshadowing.find(f => f.id === id);
    if (item) {
      item.status = 'paid_off';
      item.payoffChapter = chapter;
    }
  }

  /**
   * Update character state
   */
  updateCharacter(name: string, updates: Partial<CharacterState>): void {
    const allChars = [
      this.characterTracker.protagonist,
      ...this.characterTracker.allies,
      ...this.characterTracker.enemies,
      ...this.characterTracker.neutral,
    ];

    const char = allChars.find(c => c.name === name);
    if (char) {
      Object.assign(char, updates);
    }
  }

  // ============================================================================
  // BEAT CHECKING
  // ============================================================================

  /**
   * Check if a beat type can be used
   */
  canUseBeat(beatType: string, currentChapter: number): boolean {
    const lastUsed = this.beatLedger.beatCooldowns[beatType];
    if (!lastUsed) return true;

    const cooldown = BEAT_COOLDOWNS[beatType] || 10;
    return currentChapter >= lastUsed + cooldown;
  }

  /**
   * Get available dopamine types for chapter
   */
  getAvailableDopamineTypes(currentChapter: number): DopamineType[] {
    const allTypes: DopamineType[] = [
      'face_slap', 'power_reveal', 'treasure_gain', 'breakthrough',
      'revenge', 'recognition', 'beauty_encounter', 'secret_identity',
    ];

    return allTypes.filter(type => this.canUseBeat(type, currentChapter));
  }

  /**
   * Get beat restrictions for context
   */
  getBeatRestrictions(currentChapter: number): string[] {
    const restrictions: string[] = [];

    for (const [beatType, lastUsed] of Object.entries(this.beatLedger.beatCooldowns)) {
      const cooldown = BEAT_COOLDOWNS[beatType] || 10;
      const canUseAt = lastUsed + cooldown;

      if (currentChapter < canUseAt) {
        restrictions.push(`KHÔNG dùng "${beatType}" (cooldown đến chương ${canUseAt})`);
      }
    }

    return restrictions;
  }

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  /**
   * Save all state to disk
   */
  async save(): Promise<void> {
    const state = {
      projectId: this.projectId,
      memory: this.memory,
      beatLedger: this.beatLedger,
      characterTracker: this.characterTracker,
      foreshadowing: this.foreshadowing,
      worldBible: this.worldBible,
      savedAt: Date.now(),
    };

    // Ensure directory exists
    if (!fs.existsSync(this.savePath)) {
      fs.mkdirSync(this.savePath, { recursive: true });
    }

    const filePath = path.join(this.savePath, 'memory.json');
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
  }

  /**
   * Load state from disk
   */
  async load(): Promise<boolean> {
    const filePath = path.join(this.savePath, 'memory.json');

    if (!fs.existsSync(filePath)) {
      return false;
    }

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      this.memory = data.memory;
      this.beatLedger = data.beatLedger;
      this.characterTracker = data.characterTracker;
      this.foreshadowing = data.foreshadowing;
      this.worldBible = data.worldBible;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Export chapter content to file
   */
  async saveChapter(chapterNumber: number, content: string, title: string): Promise<string> {
    if (!fs.existsSync(this.savePath)) {
      fs.mkdirSync(this.savePath, { recursive: true });
    }

    const fileName = `chapter_${String(chapterNumber).padStart(4, '0')}.txt`;
    const filePath = path.join(this.savePath, fileName);

    const fullContent = `Chương ${chapterNumber}: ${title}\n\n${content}`;
    fs.writeFileSync(filePath, fullContent);

    return filePath;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private createEmptyMemory(): HierarchicalMemory {
    return {
      recentChapters: [],
      arcSummaries: [],
      volumeSummaries: [],
      storyEssence: {
        title: '',
        genre: 'tien-hiep',
        premise: '',
        protagonistName: '',
        currentRealm: '',
        currentLocation: '',
        mainGoal: '',
        majorAllies: [],
        majorEnemies: [],
        unresolvedMysteries: [],
      },
    };
  }

  private createEmptyBeatLedger(): BeatLedger {
    return {
      usedBeats: [],
      beatCooldowns: {},
      dopamineHistory: [],
    };
  }

  private createEmptyCharacterTracker(): CharacterTracker {
    return {
      protagonist: {
        name: '',
        status: 'active',
        currentLocation: '',
        lastSeenChapter: 0,
        relationshipToProtagonist: 'self',
        knownSecrets: [],
        pendingActions: [],
        emotionalState: 'neutral',
        powerLevel: '',
      },
      allies: [],
      enemies: [],
      neutral: [],
    };
  }

  private updateStoryEssence(chapter: ChapterMemory): void {
    // Update location if changed
    if (chapter.locationUsed) {
      this.memory.storyEssence.currentLocation = chapter.locationUsed;
    }
  }

  private checkAndSummarizeArc(chapterNumber: number): void {
    // Check if we've completed an arc (every 20 chapters by default)
    const arcLength = 20;
    if (chapterNumber % arcLength === 0) {
      const arcNumber = Math.floor(chapterNumber / arcLength);
      const startChapter = (arcNumber - 1) * arcLength + 1;

      // Get chapters for this arc
      const arcChapters = this.memory.recentChapters.filter(
        c => c.chapterNumber >= startChapter && c.chapterNumber <= chapterNumber
      );

      if (arcChapters.length > 0) {
        const arcSummary: ArcMemory = {
          arcNumber,
          title: `Arc ${arcNumber}`,
          summary: arcChapters.map(c => c.summary).join(' '),
          chaptersRange: [startChapter, chapterNumber],
          majorEvents: arcChapters.flatMap(c => c.keyEvents).slice(0, 5),
          characterDevelopment: {},
          powerProgression: '',
          resolvedPlots: arcChapters.flatMap(c => c.plotThreadsAdvanced),
          newPlots: [],
        };

        this.memory.arcSummaries.push(arcSummary);
      }
    }
  }

  private getCurrentArcSummary(currentChapter: number): ArcMemory | null {
    const arcLength = 20;
    const currentArcNumber = Math.ceil(currentChapter / arcLength);

    // Return previous arc if available
    return this.memory.arcSummaries.find(a => a.arcNumber === currentArcNumber - 1) || null;
  }

  private getActiveCharacters(currentChapter: number): CharacterState[] {
    const recentThreshold = 5;
    const allChars = [
      this.characterTracker.protagonist,
      ...this.characterTracker.allies,
      ...this.characterTracker.enemies,
    ];

    return allChars.filter(
      c => c.status === 'active' && c.lastSeenChapter >= currentChapter - recentThreshold
    );
  }

  private getPendingForeshadowing(currentChapter: number): ForeshadowingItem[] {
    return this.foreshadowing.filter(f => {
      if (f.status !== 'pending') return false;
      // Include if approaching deadline or overdue
      return f.payoffDeadline <= currentChapter + 10;
    });
  }

  private formatStoryEssence(): string {
    const e = this.memory.storyEssence;
    return `📖 STORY ESSENCE
Title: ${e.title}
Genre: ${e.genre}
Protagonist: ${e.protagonistName} (${e.currentRealm})
Location: ${e.currentLocation}
Goal: ${e.mainGoal}
Allies: ${e.majorAllies.join(', ') || 'None'}
Enemies: ${e.majorEnemies.join(', ') || 'None'}`;
  }

  private formatArcSummary(arc: ArcMemory): string {
    return `📚 ARC ${arc.arcNumber}: ${arc.title}
Chapters: ${arc.chaptersRange[0]}-${arc.chaptersRange[1]}
Summary: ${arc.summary}
Major Events: ${arc.majorEvents.join('; ')}`;
  }

  private formatRecentChapters(chapters: ChapterMemory[]): string {
    const lines = chapters.map(c =>
      `Ch${c.chapterNumber}: ${c.title} - ${c.summary} [Cliffhanger: ${c.cliffhanger}]`
    );
    return `📝 RECENT CHAPTERS\n${lines.join('\n')}`;
  }

  private formatActiveCharacters(chars: CharacterState[]): string {
    const lines = chars.map(c =>
      `- ${c.name}: ${c.status} at ${c.currentLocation}, ${c.emotionalState}`
    );
    return `👥 ACTIVE CHARACTERS\n${lines.join('\n')}`;
  }

  private formatForeshadowing(items: ForeshadowingItem[]): string {
    const lines = items.map(f =>
      `- [${f.importance}] ${f.description} (setup Ch${f.setupChapter}, deadline Ch${f.payoffDeadline})`
    );
    return `🔮 PENDING FORESHADOWING\n${lines.join('\n')}`;
  }

  private formatBeatRestrictions(restrictions: string[]): string {
    return `⚠️ BEAT RESTRICTIONS\n${restrictions.join('\n')}`;
  }

  // ============================================================================
  // SETTERS
  // ============================================================================

  setWorldBible(bible: WorldBible): void {
    this.worldBible = bible;
    this.memory.storyEssence.title = bible.storyTitle;
    this.memory.storyEssence.protagonistName = bible.protagonist.name;
    this.memory.storyEssence.currentRealm = bible.protagonist.realm;
    this.characterTracker.protagonist.name = bible.protagonist.name;
    this.characterTracker.protagonist.powerLevel = bible.protagonist.realm;
  }

  setStoryEssence(essence: Partial<StoryEssence>): void {
    Object.assign(this.memory.storyEssence, essence);
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  getMemory(): HierarchicalMemory {
    return this.memory;
  }

  getBeatLedger(): BeatLedger {
    return this.beatLedger;
  }

  getCharacterTracker(): CharacterTracker {
    return this.characterTracker;
  }

  getForeshadowing(): ForeshadowingItem[] {
    return this.foreshadowing;
  }

  getLastChapterNumber(): number {
    const last = this.memory.recentChapters[this.memory.recentChapters.length - 1];
    return last?.chapterNumber || 0;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createMemoryManager(projectId: string, savePath?: string): MemoryManager {
  return new MemoryManager(projectId, savePath);
}
