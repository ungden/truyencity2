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
import { promises as fsp } from 'fs';
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
    // Use /tmp on serverless (Vercel/Lambda) where cwd is read-only
    const baseDir = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
      ? '/tmp'
      : process.cwd();
    this.savePath = savePath || path.join(baseDir, 'chapters', projectId);

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
   * Save all state to disk (non-fatal on serverless where fs may be unavailable)
   */
  async save(): Promise<void> {
    try {
      const state = {
        projectId: this.projectId,
        memory: this.memory,
        beatLedger: this.beatLedger,
        characterTracker: this.characterTracker,
        foreshadowing: this.foreshadowing,
        worldBible: this.worldBible,
        savedAt: Date.now(),
      };

      await fsp.mkdir(this.savePath, { recursive: true });

      const filePath = path.join(this.savePath, 'memory.json');
      await fsp.writeFile(filePath, JSON.stringify(state, null, 2));
    } catch (err) {
      // Non-fatal: serverless environments may not support persistent fs
      console.warn(`[MemoryManager] save() failed (non-fatal): ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Load state from disk
   */
  async load(): Promise<boolean> {
    const filePath = path.join(this.savePath, 'memory.json');

    try {
      await fsp.access(filePath);
    } catch {
      return false;
    }

    try {
      const raw = await fsp.readFile(filePath, 'utf-8');
      const data = JSON.parse(raw);
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
   * Export chapter content to file (non-fatal on serverless)
   */
  async saveChapter(chapterNumber: number, content: string, title: string): Promise<string> {
    try {
      await fsp.mkdir(this.savePath, { recursive: true });

      const fileName = `chapter_${String(chapterNumber).padStart(4, '0')}.txt`;
      const filePath = path.join(this.savePath, fileName);

      const fullContent = `Chương ${chapterNumber}: ${title}\n\n${content}`;
      await fsp.writeFile(filePath, fullContent);

      return filePath;
    } catch (err) {
      // Non-fatal: chapter content is already saved to DB via callback
      console.warn(`[MemoryManager] saveChapter() failed (non-fatal): ${err instanceof Error ? err.message : String(err)}`);
      return '';
    }
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

  /**
   * Update Story Essence from chapter content and metadata.
   * Keeps the high-level story state current across 100+ chapters.
   */
  private updateStoryEssence(chapter: ChapterMemory): void {
    const essence = this.memory.storyEssence;

    // Update location if changed
    if (chapter.locationUsed) {
      essence.currentLocation = chapter.locationUsed;
    }

    // Detect realm/cultivation changes from key events
    const realmKeywords = ['đột phá', 'tiến nhập', 'cảnh giới', 'thăng cấp', 'đạt được', 'bước vào'];
    for (const event of chapter.keyEvents) {
      const eventLower = event.toLowerCase();

      // Detect realm change
      if (realmKeywords.some(k => eventLower.includes(k))) {
        // Extract the new realm from the event description
        const realmMatch = event.match(/(?:tiến nhập|đột phá|bước vào|đạt được)\s+(.+?)(?:\s*[,.]|$)/i);
        if (realmMatch) {
          essence.currentRealm = realmMatch[1].trim();
        }
      }
    }

    // Update allies/enemies from characters involved
    const protagonistName = essence.protagonistName || this.characterTracker.protagonist.name;
    for (const character of chapter.charactersInvolved) {
      if (character === protagonistName) continue;

      // Check if this character is already tracked
      const isAlly = essence.majorAllies?.includes(character);
      const isEnemy = essence.majorEnemies?.includes(character);

      // If character appears in events with positive connotation, add as ally
      const inPositiveEvent = chapter.keyEvents.some(e =>
        e.includes(character) && /đồng minh|giúp đỡ|cùng chiến|hợp tác|bằng hữu/.test(e)
      );
      const inNegativeEvent = chapter.keyEvents.some(e =>
        e.includes(character) && /kẻ thù|tấn công|phản bội|đánh|giết/.test(e)
      );

      if (inPositiveEvent && !isAlly) {
        if (!essence.majorAllies) essence.majorAllies = [];
        essence.majorAllies.push(character);
        // Remove from enemies if previously classified
        if (essence.majorEnemies) {
          essence.majorEnemies = essence.majorEnemies.filter(e => e !== character);
        }
      }
      if (inNegativeEvent && !isEnemy) {
        if (!essence.majorEnemies) essence.majorEnemies = [];
        essence.majorEnemies.push(character);
      }
    }

    // Keep lists manageable (max 10 each)
    if (essence.majorAllies && essence.majorAllies.length > 10) {
      essence.majorAllies = essence.majorAllies.slice(-10);
    }
    if (essence.majorEnemies && essence.majorEnemies.length > 10) {
      essence.majorEnemies = essence.majorEnemies.slice(-10);
    }

    // Track unresolved mysteries from cliffhangers
    if (chapter.cliffhanger && chapter.cliffhanger.length > 20) {
      if (!essence.unresolvedMysteries) essence.unresolvedMysteries = [];
      essence.unresolvedMysteries.push(`Ch.${chapter.chapterNumber}: ${chapter.cliffhanger.substring(0, 100)}`);
      // Keep last 5 mysteries
      if (essence.unresolvedMysteries.length > 5) {
        essence.unresolvedMysteries = essence.unresolvedMysteries.slice(-5);
      }
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
// SUMMARY QUALITY VALIDATION
// ============================================================================

export interface SummaryQualityReport {
  score: number; // 0-100
  issues: Array<{
    type: 'missing_characters' | 'missing_events' | 'too_short' | 'too_long' | 'missing_location' | 'missing_cliffhanger';
    severity: 'minor' | 'moderate' | 'major';
    description: string;
  }>;
  missingElements: string[];
  compressionRatio: number;
  isAcceptable: boolean;
}

/**
 * Validate summary quality against original content
 */
export function validateSummaryQuality(
  originalContent: string,
  summary: string,
  metadata: {
    expectedCharacters?: string[];
    expectedEvents?: string[];
    chapterNumber?: number;
  } = {}
): SummaryQualityReport {
  const issues: SummaryQualityReport['issues'] = [];
  const missingElements: string[] = [];
  let score = 100;

  // Calculate compression ratio
  const originalWords = originalContent.split(/\s+/).length;
  const summaryWords = summary.split(/\s+/).length;
  const compressionRatio = summaryWords / originalWords;

  // 1. Check summary length
  const idealMinWords = 50;
  const idealMaxWords = 200;

  if (summaryWords < idealMinWords) {
    issues.push({
      type: 'too_short',
      severity: summaryWords < 30 ? 'major' : 'moderate',
      description: `Summary quá ngắn (${summaryWords} từ, cần ít nhất ${idealMinWords})`,
    });
    score -= summaryWords < 30 ? 20 : 10;
  }

  if (summaryWords > idealMaxWords) {
    issues.push({
      type: 'too_long',
      severity: 'minor',
      description: `Summary quá dài (${summaryWords} từ, nên dưới ${idealMaxWords})`,
    });
    score -= 5;
  }

  // 2. Check for expected characters
  if (metadata.expectedCharacters && metadata.expectedCharacters.length > 0) {
    const summaryLower = summary.toLowerCase();
    const missingChars = metadata.expectedCharacters.filter(
      char => !summaryLower.includes(char.toLowerCase())
    );

    if (missingChars.length > 0) {
      const missingRatio = missingChars.length / metadata.expectedCharacters.length;
      issues.push({
        type: 'missing_characters',
        severity: missingRatio > 0.5 ? 'major' : 'moderate',
        description: `Thiếu nhân vật trong summary: ${missingChars.join(', ')}`,
      });
      missingElements.push(...missingChars.map(c => `Character: ${c}`));
      score -= missingRatio > 0.5 ? 15 : 8;
    }
  }

  // 3. Check for expected events
  if (metadata.expectedEvents && metadata.expectedEvents.length > 0) {
    const summaryLower = summary.toLowerCase();
    const missingEvents = metadata.expectedEvents.filter(
      event => !summaryLower.includes(event.toLowerCase().substring(0, 10))
    );

    if (missingEvents.length > 0) {
      const missingRatio = missingEvents.length / metadata.expectedEvents.length;
      issues.push({
        type: 'missing_events',
        severity: missingRatio > 0.5 ? 'major' : 'moderate',
        description: `Thiếu sự kiện quan trọng: ${missingEvents.length}/${metadata.expectedEvents.length}`,
      });
      missingElements.push(...missingEvents.map(e => `Event: ${e}`));
      score -= missingRatio > 0.5 ? 20 : 10;
    }
  }

  // 4. Check for location mention (from original)
  const locationPatterns = /tại\s+(\w+)|ở\s+(\w+)|trong\s+(\w+\s+\w*)|nơi\s+(\w+)/gi;
  const originalLocations = originalContent.match(locationPatterns);
  if (originalLocations && originalLocations.length > 0) {
    const hasLocation = locationPatterns.test(summary);
    if (!hasLocation) {
      issues.push({
        type: 'missing_location',
        severity: 'minor',
        description: 'Summary không đề cập địa điểm',
      });
      score -= 5;
    }
  }

  // 5. Check for cliffhanger/ending mention
  const cliffhangerKeywords = ['...', 'sẽ', 'liệu', 'chờ đợi', 'tiếp theo', 'sắp', 'chuẩn bị'];
  const originalEnd = originalContent.slice(-500);
  const hasOriginalCliffhanger = cliffhangerKeywords.some(kw => originalEnd.includes(kw));
  
  if (hasOriginalCliffhanger) {
    const summaryHasCliffhanger = cliffhangerKeywords.some(kw => summary.includes(kw));
    if (!summaryHasCliffhanger) {
      issues.push({
        type: 'missing_cliffhanger',
        severity: 'moderate',
        description: 'Summary không capture cliffhanger cuối chương',
      });
      score -= 10;
    }
  }

  // Calculate final score
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    issues,
    missingElements,
    compressionRatio: Math.round(compressionRatio * 1000) / 1000,
    isAcceptable: score >= 60 && !issues.some(i => i.severity === 'major'),
  };
}

/**
 * Auto-extract key elements from chapter content for summary validation
 */
export function extractKeyElements(content: string): {
  characters: string[];
  events: string[];
  locations: string[];
} {
  const characters: string[] = [];
  const events: string[] = [];
  const locations: string[] = [];

  // Extract character names (capitalized Vietnamese names pattern)
  const namePattern = /(?:^|[.!?]\s+)([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+(?:\s+[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]*)?)/g;
  const nameMatches = content.match(namePattern);
  if (nameMatches) {
    const uniqueNames = new Set(nameMatches.map(m => m.trim().replace(/^[.!?\s]+/, '')));
    characters.push(...Array.from(uniqueNames).slice(0, 10));
  }

  // Extract key events (action verbs with context)
  const eventPatterns = [
    /đột phá.*?(?:\.|!)/gi,
    /đánh bại.*?(?:\.|!)/gi,
    /phát hiện.*?(?:\.|!)/gi,
    /nhận được.*?(?:\.|!)/gi,
    /gặp.*?(?:\.|!)/gi,
    /bị.*?tấn công.*?(?:\.|!)/gi,
    /chiến đấu.*?(?:\.|!)/gi,
  ];

  for (const pattern of eventPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      events.push(...matches.slice(0, 2).map(m => m.trim().substring(0, 50)));
    }
  }

  // Extract locations
  const locationPattern = /(?:tại|ở|trong|đến)\s+([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]+)/gi;
  const locationMatches = content.match(locationPattern);
  if (locationMatches) {
    locations.push(...locationMatches.slice(0, 5));
  }

  return { characters, events, locations };
}

/**
 * Generate improved summary if original fails quality check
 */
export function generateBetterSummary(
  originalSummary: string,
  qualityReport: SummaryQualityReport,
  originalContent: string
): string {
  let improved = originalSummary;

  // Add missing elements
  if (qualityReport.missingElements.length > 0) {
    const additions: string[] = [];

    for (const element of qualityReport.missingElements) {
      if (element.startsWith('Character:')) {
        const charName = element.replace('Character: ', '');
        // Find context for character in original
        const charPattern = new RegExp(`[^.]*${charName}[^.]*\\.`, 'gi');
        const matches = originalContent.match(charPattern);
        if (matches && matches[0]) {
          additions.push(matches[0].trim().substring(0, 100));
        }
      }
    }

    if (additions.length > 0) {
      improved = improved + ' ' + additions.join(' ');
    }
  }

  // Trim if too long
  const words = improved.split(/\s+/);
  if (words.length > 200) {
    improved = words.slice(0, 180).join(' ') + '...';
  }

  return improved;
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createMemoryManager(projectId: string, savePath?: string): MemoryManager {
  return new MemoryManager(projectId, savePath);
}
