/**
 * Plot Thread Manager - Smart Thread Selection for Long-form Stories
 * 
 * Solves the problem: AI forgetting plot threads in 1000+ chapter stories
 * 
 * Key Features:
 * 1. Thread lifecycle management (Open → Developing → Resolved → Legacy)
 * 2. Smart selection: Pick top N most relevant threads for each chapter
 * 3. Deadline tracking: Ensure foreshadowing pays off
 * 4. Abandonment detection: Flag threads inactive for too long
 * 5. Character re-introduction: Auto-recap when characters return
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

export interface PlotThread {
  id: string;
  projectId: string;
  name: string;
  description: string;
  priority: 'critical' | 'main' | 'sub' | 'background';
  status: 'open' | 'developing' | 'climax' | 'resolved' | 'legacy';
  
  // Timeline
  startChapter: number;
  targetPayoffChapter?: number;
  resolvedChapter?: number;
  lastActiveChapter: number;
  
  // Relationships
  relatedCharacters: string[];
  relatedLocations: string[];
  relatedArcs: number[];
  
  // Foreshadowing
  foreshadowingHints: ForeshadowingHint[];
  payoffDescription?: string;
  
  // Metadata
  importance: number; // 0-100, calculated dynamically
  createdAt: Date;
  updatedAt: Date;
}

export interface ForeshadowingHint {
  id: string;
  chapterNumber: number;
  hint: string;
  payoffDeadline: number;
  status: 'planted' | 'developing' | 'paid_off' | 'abandoned';
  importance: 'major' | 'minor';
}

export interface ThreadSelectionConfig {
  maxThreadsInContext: number;
  maxForeshadowingHints: number;
  lookbackChapters: number;
  lookforwardChapters: number;
  deadlineThreshold: number; // Chapters before deadline to start urgency
}

export interface ThreadSelectionResult {
  selectedThreads: PlotThread[];
  foreshadowingHints: ForeshadowingHint[];
  characterRecaps: CharacterRecap[];
  urgencyWarnings: string[];
}

export interface CharacterRecap {
  characterName: string;
  lastSeenChapter: number;
  relationshipSummary: string;
  keyFacts: string[];
  pendingPromises: string[];
}

export interface ThreadAbandonmentReport {
  abandonedThreads: PlotThread[];
  atRiskThreads: PlotThread[];
  recommendations: string[];
}

// ============================================================================
// PLOT THREAD MANAGER CLASS
// ============================================================================

export class PlotThreadManager {
  private projectId: string;
  private threads: Map<string, PlotThread> = new Map();
  private config: ThreadSelectionConfig;
  
  constructor(
    projectId: string,
    config: Partial<ThreadSelectionConfig> = {}
  ) {
    this.projectId = projectId;
    this.config = {
      maxThreadsInContext: 5,
      maxForeshadowingHints: 3,
      lookbackChapters: 50,
      lookforwardChapters: 30,
      deadlineThreshold: 20,
      ...config,
    };
  }

  /**
   * Initialize by loading all threads from database
   */
  async initialize(): Promise<void> {
    const supabase = getSupabase();
    
    const { data: threads, error } = await supabase
      .from('plot_threads')
      .select('*')
      .eq('project_id', this.projectId)
      .order('importance', { ascending: false });

    if (error) {
      logger.error('Failed to load plot threads');
      return;
    }

    if (threads) {
      for (const thread of threads) {
        this.threads.set(thread.id, {
          id: thread.id,
          projectId: thread.project_id,
          name: thread.name,
          description: thread.description,
          priority: thread.priority,
          status: thread.status,
          startChapter: thread.start_chapter,
          targetPayoffChapter: thread.target_payoff_chapter,
          resolvedChapter: thread.resolved_chapter,
          lastActiveChapter: thread.last_active_chapter,
          relatedCharacters: thread.related_characters || [],
          relatedLocations: thread.related_locations || [],
          relatedArcs: thread.related_arcs || [],
          foreshadowingHints: thread.foreshadowing_hints || [],
          payoffDescription: thread.payoff_description,
          importance: thread.importance || 50,
          createdAt: new Date(thread.created_at),
          updatedAt: new Date(thread.updated_at),
        });
      }
    }

    logger.info(`Loaded ${this.threads.size} plot threads`, { projectId: this.projectId });
  }

  /**
   * Select most relevant threads for a chapter
   * 
   * Algorithm:
   * 1. Calculate relevance score for each thread
   * 2. Consider: characters in chapter, deadline proximity, priority, recent activity
   * 3. Return top N threads + foreshadowing hints
   */
  async selectThreadsForChapter(
    chapterNumber: number,
    charactersInChapter: string[],
    arcNumber: number,
    tensionLevel: number
  ): Promise<ThreadSelectionResult> {
    const threadScores: Array<{ thread: PlotThread; score: number; reasons: string[] }> = [];

    for (const thread of this.threads.values()) {
      // Skip resolved/legacy threads unless they're critical for recap
      if (thread.status === 'resolved' || thread.status === 'legacy') {
        continue;
      }

      let score = 0;
      const reasons: string[] = [];

      // Factor 1: Character overlap (40% weight)
      const characterOverlap = thread.relatedCharacters.filter(
        c => charactersInChapter.includes(c)
      ).length;
      if (characterOverlap > 0) {
        score += (characterOverlap / thread.relatedCharacters.length) * 40;
        reasons.push(`Character overlap: ${characterOverlap}`);
      }

      // Factor 2: Deadline urgency (30% weight)
      if (thread.targetPayoffChapter) {
        const chaptersUntilDeadline = thread.targetPayoffChapter - chapterNumber;
        if (chaptersUntilDeadline > 0 && chaptersUntilDeadline <= this.config.deadlineThreshold) {
          const urgency = (this.config.deadlineThreshold - chaptersUntilDeadline) / this.config.deadlineThreshold;
          score += urgency * 30;
          reasons.push(`Deadline in ${chaptersUntilDeadline} chapters`);
        }
      }

      // Factor 3: Priority (20% weight)
      const priorityWeight = {
        'critical': 20,
        'main': 15,
        'sub': 10,
        'background': 5,
      };
      score += priorityWeight[thread.priority];
      reasons.push(`Priority: ${thread.priority}`);

      // Factor 4: Recent activity (10% weight)
      const chaptersSinceActive = chapterNumber - thread.lastActiveChapter;
      if (chaptersSinceActive <= this.config.lookbackChapters) {
        score += 10 * (1 - chaptersSinceActive / this.config.lookbackChapters);
        reasons.push(`Active ${chaptersSinceActive} chapters ago`);
      } else {
        // Penalty for inactive threads
        score -= 5;
        reasons.push(`Inactive for ${chaptersSinceActive} chapters`);
      }

      // Factor 5: Arc relevance
      if (thread.relatedArcs.includes(arcNumber)) {
        score += 15;
        reasons.push('Current arc');
      }

      // Factor 6: Status bonus
      if (thread.status === 'climax') {
        score += 25;
        reasons.push('Climax phase');
      }

      threadScores.push({ thread, score: Math.max(0, score), reasons });
    }

    // Sort by score and select top N
    threadScores.sort((a, b) => b.score - a.score);
    const selectedThreads = threadScores
      .slice(0, this.config.maxThreadsInContext)
      .map(ts => ts.thread);

    // Collect foreshadowing hints for selected threads
    const foreshadowingHints: ForeshadowingHint[] = [];
    const urgencyWarnings: string[] = [];

    for (const thread of selectedThreads) {
      const pendingHints = thread.foreshadowingHints.filter(
        h => h.status === 'planted' && h.payoffDeadline >= chapterNumber
      );

      // Sort by deadline urgency
      pendingHints.sort((a, b) => a.payoffDeadline - b.payoffDeadline);
      
      // Take most urgent hints
      const urgentHints = pendingHints.slice(0, 2);
      foreshadowingHints.push(...urgentHints);

      // Check for overdue hints
      const overdueHints = thread.foreshadowingHints.filter(
        h => h.status === 'planted' && h.payoffDeadline < chapterNumber
      );
      
      if (overdueHints.length > 0) {
        urgencyWarnings.push(
          `Thread "${thread.name}" has ${overdueHints.length} overdue foreshadowing hints`
        );
      }
    }

    // Limit foreshadowing hints
    const limitedHints = foreshadowingHints.slice(0, this.config.maxForeshadowingHints);

    // Generate character recaps for returning characters
    const characterRecaps = await this.generateCharacterRecaps(
      chapterNumber,
      charactersInChapter
    );

    return {
      selectedThreads,
      foreshadowingHints: limitedHints,
      characterRecaps,
      urgencyWarnings,
    };
  }

  /**
   * Generate recap for characters returning after long absence
   */
  private async generateCharacterRecaps(
    currentChapter: number,
    charactersInChapter: string[]
  ): Promise<CharacterRecap[]> {
    const supabase = getSupabase();
    const recaps: CharacterRecap[] = [];

    for (const characterName of charactersInChapter) {
      // Check if character was seen recently
      const { data: appearances } = await supabase
        .from('character_tracker')
        .select('*')
        .eq('project_id', this.projectId)
        .eq('character_name', characterName)
        .single();

      if (!appearances) continue;

      const lastSeen = appearances.last_seen_chapter || 0;
      const chaptersSinceSeen = currentChapter - lastSeen;

      // Only recap if absent for significant time (>50 chapters)
      if (chaptersSinceSeen > 50) {
        const recap: CharacterRecap = {
          characterName,
          lastSeenChapter: lastSeen,
          relationshipSummary: appearances.relationship_summary || '',
          keyFacts: appearances.key_facts || [],
          pendingPromises: appearances.pending_promises || [],
        };
        recaps.push(recap);
      }
    }

    return recaps;
  }

  /**
   * Create a new plot thread
   */
  async createThread(
    name: string,
    description: string,
    priority: PlotThread['priority'],
    startChapter: number,
    targetPayoffChapter?: number,
    relatedCharacters: string[] = [],
    relatedLocations: string[] = []
  ): Promise<PlotThread> {
    const id = `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const thread: PlotThread = {
      id,
      projectId: this.projectId,
      name,
      description,
      priority,
      status: 'open',
      startChapter,
      targetPayoffChapter,
      lastActiveChapter: startChapter,
      relatedCharacters,
      relatedLocations,
      relatedArcs: [],
      foreshadowingHints: [],
      importance: this.calculateInitialImportance(priority),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to database
    const supabase = getSupabase();
    const { error } = await supabase.from('plot_threads').insert({
      id: thread.id,
      project_id: thread.projectId,
      name: thread.name,
      description: thread.description,
      priority: thread.priority,
      status: thread.status,
      start_chapter: thread.startChapter,
      target_payoff_chapter: thread.targetPayoffChapter,
      last_active_chapter: thread.lastActiveChapter,
      related_characters: thread.relatedCharacters,
      related_locations: thread.relatedLocations,
      related_arcs: thread.relatedArcs,
      importance: thread.importance,
    });

  if (error) {
      logger.error('Failed to create plot thread');
      throw error;
    }

    this.threads.set(id, thread);
    logger.info(`Created plot thread: ${name}`, { threadId: id });

    return thread;
  }

  /**
   * Add foreshadowing hint to a thread
   */
  async addForeshadowingHint(
    threadId: string,
    chapterNumber: number,
    hint: string,
    payoffDeadline: number,
    importance: 'major' | 'minor' = 'minor'
  ): Promise<void> {
    const thread = this.threads.get(threadId);
    if (!thread) {
      throw new Error(`Thread ${threadId} not found`);
    }

    const hintObj: ForeshadowingHint = {
      id: `hint_${Date.now()}`,
      chapterNumber,
      hint,
      payoffDeadline,
      status: 'planted',
      importance,
    };

    thread.foreshadowingHints.push(hintObj);
    thread.lastActiveChapter = chapterNumber;
    thread.updatedAt = new Date();

    // Update database
    const supabase = getSupabase();
    const { error } = await supabase
      .from('plot_threads')
      .update({
        foreshadowing_hints: thread.foreshadowingHints,
        last_active_chapter: thread.lastActiveChapter,
        updated_at: thread.updatedAt.toISOString(),
      })
      .eq('id', threadId);

    if (error) {
      logger.error('Failed to add foreshadowing hint');
    }
  }

  /**
   * Mark thread as resolved
   */
  async resolveThread(
    threadId: string,
    chapterNumber: number,
    payoffDescription: string
  ): Promise<void> {
    const thread = this.threads.get(threadId);
    if (!thread) return;

    thread.status = 'resolved';
    thread.resolvedChapter = chapterNumber;
    thread.payoffDescription = payoffDescription;
    thread.lastActiveChapter = chapterNumber;
    thread.updatedAt = new Date();

    // Update database
    const supabase = getSupabase();
    await supabase
      .from('plot_threads')
      .update({
        status: 'resolved',
        resolved_chapter: chapterNumber,
        payoff_description: payoffDescription,
        last_active_chapter: chapterNumber,
        updated_at: thread.updatedAt.toISOString(),
      })
      .eq('id', threadId);

    logger.info(`Resolved plot thread: ${thread.name}`, { threadId, chapterNumber });
  }

  /**
   * Check for abandoned threads
   */
  async detectAbandonedThreads(
    currentChapter: number
  ): Promise<ThreadAbandonmentReport> {
    const abandoned: PlotThread[] = [];
    const atRisk: PlotThread[] = [];
    const recommendations: string[] = [];

    for (const thread of this.threads.values()) {
      if (thread.status === 'resolved' || thread.status === 'legacy') continue;

      const chaptersSinceActive = currentChapter - thread.lastActiveChapter;
      
      // Abandoned: inactive for 100+ chapters
      if (chaptersSinceActive > 100) {
        abandoned.push(thread);
        recommendations.push(
          `Thread "${thread.name}" abandoned for ${chaptersSinceActive} chapters. Consider: (1) Resolve quickly, (2) Reactivate with new event, or (3) Archive as dropped plot.`
        );
      }
      // At risk: inactive for 50-100 chapters
      else if (chaptersSinceActive > 50) {
        atRisk.push(thread);
        recommendations.push(
          `Thread "${thread.name}" at risk (${chaptersSinceActive} chapters inactive). Consider reintroducing soon.`
        );
      }

      // Check missed payoff deadlines
      if (thread.targetPayoffChapter && currentChapter > thread.targetPayoffChapter) {
        recommendations.push(
          `URGENT: Thread "${thread.name}" missed payoff deadline (ch.${thread.targetPayoffChapter}). Must resolve or extend deadline.`
        );
      }
    }

    return { abandonedThreads: abandoned, atRiskThreads: atRisk, recommendations };
  }

  /**
   * Update thread importance based on story progression
   */
  private calculateInitialImportance(priority: PlotThread['priority']): number {
    const baseImportance = {
      'critical': 90,
      'main': 70,
      'sub': 50,
      'background': 30,
    };
    return baseImportance[priority];
  }

  /**
   * Get all active threads
   */
  getActiveThreads(): PlotThread[] {
    return Array.from(this.threads.values()).filter(
      t => t.status !== 'resolved' && t.status !== 'legacy'
    );
  }

  /**
   * Get thread statistics
   */
  getStats(): {
    total: number;
    open: number;
    developing: number;
    climax: number;
    resolved: number;
    abandoned: number;
  } {
    const threads = Array.from(this.threads.values());
    return {
      total: threads.length,
      open: threads.filter(t => t.status === 'open').length,
      developing: threads.filter(t => t.status === 'developing').length,
      climax: threads.filter(t => t.status === 'climax').length,
      resolved: threads.filter(t => t.status === 'resolved').length,
      abandoned: threads.filter(t => t.status === 'legacy').length,
    };
  }
}

// ============================================================================
// DATABASE MIGRATION (for reference)
// ============================================================================

/*
-- Migration: Create plot_threads table
CREATE TABLE IF NOT EXISTS plot_threads (
  id TEXT PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'main', 'sub', 'background')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'developing', 'climax', 'resolved', 'legacy')),
  start_chapter INTEGER NOT NULL,
  target_payoff_chapter INTEGER,
  resolved_chapter INTEGER,
  last_active_chapter INTEGER NOT NULL,
  related_characters TEXT[] DEFAULT '{}',
  related_locations TEXT[] DEFAULT '{}',
  related_arcs INTEGER[] DEFAULT '{}',
  foreshadowing_hints JSONB DEFAULT '[]',
  payoff_description TEXT,
  importance INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_plot_threads_project ON plot_threads(project_id);
CREATE INDEX idx_plot_threads_status ON plot_threads(project_id, status);
CREATE INDEX idx_plot_threads_priority ON plot_threads(project_id, importance DESC);

-- Migration: Add columns to character_tracker for re-introduction
ALTER TABLE character_tracker ADD COLUMN IF NOT EXISTS relationship_summary TEXT;
ALTER TABLE character_tracker ADD COLUMN IF NOT EXISTS key_facts TEXT[] DEFAULT '{}';
ALTER TABLE character_tracker ADD COLUMN IF NOT EXISTS pending_promises TEXT[] DEFAULT '{}';
*/

// Export
export default PlotThreadManager;
