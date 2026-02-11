/**
 * Extended Memory System - Volume Summaries for Ultra-Long Stories
 * 
 * Adds 4-level hierarchy: Story → Volume (5 arcs/100 chapters) → Arc → Recent
 * Solves: Context drift in 1000+ chapter stories
 * 
 * Key Features:
 * 1. Automatic volume summary generation every 100 chapters
 * 2. Selective volume inclusion based on relevance
 * 3. Character arc tracking across volumes
 * 4. Plot thread resolution tracking
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/security/logger';

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

export interface VolumeSummary {
  id: string;
  projectId: string;
  volumeNumber: number;
  startChapter: number;
  endChapter: number;
  title: string;
  summary: string;
  majorMilestones: string[];
  arcsIncluded: number[];
  plotThreadsResolved: string[];
  plotThreadsIntroduced: string[];
  characterDevelopment: Record<string, CharacterVolumeArc>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CharacterVolumeArc {
  characterName: string;
  startState: string;
  endState: string;
  keyEvents: string[];
  relationshipsChanged: string[];
  powerProgression?: string;
}

export interface VolumeSelectionConfig {
  maxVolumesInContext: number;
  maxTokensPerVolume: number;
  relevanceThreshold: number;
  includeLatestVolume: boolean;
}

export interface VolumeSelectionResult {
  selectedVolumes: VolumeSummary[];
  characterArcs: CharacterVolumeArc[];
  relevantThreads: string[];
}

export interface MemoryContext4Level {
  storyLevel: string;           // ~100 tokens
  volumeLevel: string;          // ~200 tokens (selected volumes)
  arcLevel: string;             // ~150 tokens (current/previous arc)
  chapterLevel: string;         // ~300 tokens (recent 3 chapters)
  characterLevel: string;       // ~150 tokens (recaps + active)
  threadLevel: string;          // ~200 tokens (plot threads)
  totalTokens: number;
}

// ============================================================================
// VOLUME SUMMARY MANAGER CLASS
// ============================================================================

export class VolumeSummaryManager {
  private projectId: string;
  private volumes: Map<number, VolumeSummary> = new Map();
  private config: VolumeSelectionConfig;

  constructor(
    projectId: string,
    config: Partial<VolumeSelectionConfig> = {}
  ) {
    this.projectId = projectId;
    this.config = {
      maxVolumesInContext: 2,
      maxTokensPerVolume: 200,
      relevanceThreshold: 0.3,
      includeLatestVolume: true,
      ...config,
    };
  }

  /**
   * Initialize by loading volume summaries from database
   */
  async initialize(): Promise<void> {
    const supabase = getSupabase();
    
    const { data: volumes, error } = await supabase
      .from('volume_summaries')
      .select('*')
      .eq('project_id', this.projectId)
      .order('volume_number', { ascending: true });

    if (error) {
      logger.error('Failed to load volume summaries');
      return;
    }

    if (volumes) {
      for (const vol of volumes) {
        this.volumes.set(vol.volume_number, {
          id: vol.id,
          projectId: vol.project_id,
          volumeNumber: vol.volume_number,
          startChapter: vol.start_chapter,
          endChapter: vol.end_chapter,
          title: vol.title,
          summary: vol.summary,
          majorMilestones: vol.major_milestones || [],
          arcsIncluded: vol.arcs_included || [],
          plotThreadsResolved: vol.plot_threads_resolved || [],
          plotThreadsIntroduced: vol.plot_threads_introduced || [],
          characterDevelopment: vol.character_development || {},
          createdAt: new Date(vol.created_at),
          updatedAt: new Date(vol.updated_at),
        });
      }
    }

    logger.info(`Loaded ${this.volumes.size} volume summaries`);
  }

  /**
   * Generate a new volume summary when reaching chapter 100, 200, etc.
   */
  async generateVolumeSummary(
    volumeNumber: number,
    startChapter: number,
    endChapter: number,
    arcSummaries: any[],
    plotThreads: any[],
    characterTracker: any
  ): Promise<VolumeSummary> {
    const supabase = getSupabase();
    
    // Analyze arcs in this volume
    const title = await this.generateVolumeTitle(arcSummaries);
    const summary = await this.summarizeArcs(arcSummaries);
    const milestones = this.extractMilestones(arcSummaries);
    const charDevelopment = this.extractCharacterDevelopment(
      characterTracker,
      startChapter,
      endChapter
    );

    // Track plot threads
    const threadsResolved: string[] = [];
    const threadsIntroduced: string[] = [];
    
    for (const thread of plotThreads) {
      if (thread.resolvedChapter && 
          thread.resolvedChapter >= startChapter && 
          thread.resolvedChapter <= endChapter) {
        threadsResolved.push(thread.name);
      }
      if (thread.startChapter >= startChapter && thread.startChapter <= endChapter) {
        threadsIntroduced.push(thread.name);
      }
    }

    const volume: VolumeSummary = {
      id: `vol_${Date.now()}`,
      projectId: this.projectId,
      volumeNumber,
      startChapter,
      endChapter,
      title,
      summary,
      majorMilestones: milestones,
      arcsIncluded: arcSummaries.map(a => a.arcNumber),
      plotThreadsResolved: threadsResolved,
      plotThreadsIntroduced: threadsIntroduced,
      characterDevelopment: charDevelopment,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to database
    const { error } = await supabase.from('volume_summaries').insert({
      id: volume.id,
      project_id: volume.projectId,
      volume_number: volume.volumeNumber,
      start_chapter: volume.startChapter,
      end_chapter: volume.endChapter,
      title: volume.title,
      summary: volume.summary,
      major_milestones: volume.majorMilestones,
      arcs_included: volume.arcsIncluded,
      plot_threads_resolved: volume.plotThreadsResolved,
      plot_threads_introduced: volume.plotThreadsIntroduced,
      character_development: volume.characterDevelopment,
    });

    if (error) {
      logger.error('Failed to save volume summary');
      throw error;
    }

    this.volumes.set(volumeNumber, volume);
    logger.info(`Generated volume ${volumeNumber} summary: ${title}`);

    return volume;
  }

  /**
   * Select most relevant volumes for current chapter
   * 
   * Algorithm:
   * 1. Always include latest volume (if config says so)
   * 2. Include volumes with relevant plot threads
   * 3. Include volumes with character development for active characters
   * 4. Prioritize early volumes (setup) and recent volumes (continuity)
   */
  async selectVolumesForChapter(
    currentChapter: number,
    activePlotThreads: string[],
    activeCharacters: string[]
  ): Promise<VolumeSelectionResult> {
    const currentVolume = Math.ceil(currentChapter / 100);
    const selectedVolumes: VolumeSummary[] = [];
    const relevantCharacterArcs: CharacterVolumeArc[] = [];
    const relevantThreads: string[] = [];

    // Always include current volume
    const currentVol = this.volumes.get(currentVolume);
    if (currentVol && this.config.includeLatestVolume) {
      selectedVolumes.push(currentVol);
    }

    // Check other volumes for relevance
    for (const [volNum, volume] of this.volumes) {
      if (volNum === currentVolume) continue;
      if (selectedVolumes.length >= this.config.maxVolumesInContext) break;

      let relevanceScore = 0;

      // Factor 1: Plot thread relevance (40%)
      const threadOverlap = volume.plotThreadsIntroduced.filter(
        t => activePlotThreads.includes(t)
      ).length;
      relevanceScore += (threadOverlap / Math.max(1, activePlotThreads.length)) * 40;

      // Factor 2: Character relevance (30%)
      const charOverlap = Object.keys(volume.characterDevelopment).filter(
        c => activeCharacters.includes(c)
      ).length;
      relevanceScore += (charOverlap / Math.max(1, activeCharacters.length)) * 30;

      // Factor 3: Proximity to current volume (20%)
      const volumeDistance = Math.abs(volNum - currentVolume);
      relevanceScore += Math.max(0, 20 - volumeDistance * 2);

      // Factor 4: Importance (10%)
      if (volNum === 1) relevanceScore += 10; // First volume (setup)

      // Include if above threshold
      if (relevanceScore >= this.config.relevanceThreshold * 100) {
        selectedVolumes.push(volume);
        
        // Collect relevant character arcs
        for (const [charName, arc] of Object.entries(volume.characterDevelopment)) {
          if (activeCharacters.includes(charName)) {
            relevantCharacterArcs.push(arc);
          }
        }

        // Collect relevant threads
        relevantThreads.push(...volume.plotThreadsIntroduced.filter(
          t => activePlotThreads.includes(t)
        ));
      }
    }

    return {
      selectedVolumes,
      characterArcs: relevantCharacterArcs,
      relevantThreads: [...new Set(relevantThreads)],
    };
  }

  /**
   * Build 4-level memory context
   */
  async build4LevelContext(
    currentChapter: number,
    storyEssence: string,
    arcSummary: string,
    recentChapters: string,
    activeCharacters: string[],
    activePlotThreads: string[]
  ): Promise<MemoryContext4Level> {
    // Select relevant volumes
    const volumeSelection = await this.selectVolumesForChapter(
      currentChapter,
      activePlotThreads,
      activeCharacters
    );

    // Format volume context
    const volumeContext = this.formatVolumeContext(volumeSelection);

    return {
      storyLevel: storyEssence,
      volumeLevel: volumeContext,
      arcLevel: arcSummary,
      chapterLevel: recentChapters,
      characterLevel: this.formatCharacterArcs(volumeSelection.characterArcs),
      threadLevel: this.formatThreadHistory(volumeSelection.relevantThreads),
      totalTokens: this.estimateTokens(
        storyEssence,
        volumeContext,
        arcSummary,
        recentChapters
      ),
    };
  }

  /**
   * Helper: Generate volume title from arcs
   */
  private async generateVolumeTitle(arcSummaries: any[]): Promise<string> {
    // Use major events from arcs to generate title
    const majorEvents = arcSummaries.flatMap(a => a.majorEvents || []);
    
    if (majorEvents.some(e => e.includes('breakthrough') || e.includes('realm'))) {
      return 'Thăng Tiến và Thử Thách';
    }
    if (majorEvents.some(e => e.includes('betrayal') || e.includes('revelation'))) {
      return 'Âm Mưu và Chân Tướng';
    }
    if (majorEvents.some(e => e.includes('war') || e.includes('battle'))) {
      return 'Chiến Tranh và Huyết Chiến';
    }
    
    return `Quyển ${arcSummaries[0]?.arcNumber || 1}: Hành Trình Tiếp Theo`;
  }

  /**
   * Helper: Summarize multiple arcs into volume summary
   */
  private async summarizeArcs(arcSummaries: any[]): Promise<string> {
    const summaries = arcSummaries.map(a => a.summary || '');
    
    // Simple concatenation with focus on progression
    return summaries.join(' ').substring(0, 500) + '...';
  }

  /**
   * Helper: Extract major milestones
   */
  private extractMilestones(arcSummaries: any[]): string[] {
    return arcSummaries
      .flatMap(a => a.majorEvents || [])
      .filter(e => e.includes('breakthrough') || e.includes('death') || 
                   e.includes('revelation') || e.includes('war'))
      .slice(0, 5);
  }

  /**
   * Helper: Extract character development
   */
  private extractCharacterDevelopment(
    characterTracker: any,
    startChapter: number,
    endChapter: number
  ): Record<string, CharacterVolumeArc> {
    const development: Record<string, CharacterVolumeArc> = {};
    
    // This is a simplified version - in production would analyze character states
    const chars = characterTracker?.allies || [];
    for (const char of chars) {
      if (char.lastSeenChapter >= startChapter && char.lastSeenChapter <= endChapter) {
        development[char.name] = {
          characterName: char.name,
          startState: 'TBD',
          endState: char.emotionalState || 'TBD',
          keyEvents: [],
          relationshipsChanged: [],
        };
      }
    }
    
    return development;
  }

  /**
   * Format volume context for prompt
   */
  private formatVolumeContext(selection: VolumeSelectionResult): string {
    const parts: string[] = [];
    
    for (const vol of selection.selectedVolumes) {
      parts.push(`📚 VOLUME ${vol.volumeNumber}: ${vol.title}`);
      parts.push(`   Chapters: ${vol.startChapter}-${vol.endChapter}`);
      parts.push(`   ${vol.summary}`);
      
      if (vol.majorMilestones.length > 0) {
        parts.push(`   Milestones: ${vol.majorMilestones.join(', ')}`);
      }
      
      if (vol.plotThreadsIntroduced.length > 0) {
        parts.push(`   Threads Introduced: ${vol.plotThreadsIntroduced.join(', ')}`);
      }
      
      if (vol.plotThreadsResolved.length > 0) {
        parts.push(`   Threads Resolved: ${vol.plotThreadsResolved.join(', ')}`);
      }
    }
    
    return parts.join('\n');
  }

  /**
   * Format character arcs
   */
  private formatCharacterArcs(arcs: CharacterVolumeArc[]): string {
    if (arcs.length === 0) return '';
    
    const lines = arcs.map(arc =>
      `- ${arc.characterName}: ${arc.startState} → ${arc.endState}`
    );
    
    return `👤 CHARACTER ARCS:\n${lines.join('\n')}`;
  }

  /**
   * Format thread history
   */
  private formatThreadHistory(threads: string[]): string {
    if (threads.length === 0) return '';
    return `🧵 RELEVANT THREADS HISTORY: ${threads.join(', ')}`;
  }

  /**
   * Estimate token count
   */
  private estimateTokens(...texts: string[]): number {
    // Rough estimate: 1 token ≈ 4 characters for Vietnamese
    const totalChars = texts.join('').length;
    return Math.ceil(totalChars / 4);
  }

  /**
   * Get all volumes
   */
  getAllVolumes(): VolumeSummary[] {
    return Array.from(this.volumes.values()).sort(
      (a, b) => a.volumeNumber - b.volumeNumber
    );
  }

  /**
   * Get volume by number
   */
  getVolume(volumeNumber: number): VolumeSummary | undefined {
    return this.volumes.get(volumeNumber);
  }
}

// Export
export default VolumeSummaryManager;
