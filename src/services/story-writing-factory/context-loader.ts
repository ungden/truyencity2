/**
 * Story Writing Factory - Context Loader
 *
 * Replaces the ephemeral MemoryManager.buildContext() with DB-backed context assembly.
 * Loads 4 layers of context for each chapter write:
 *
 *   Layer 1: Story Bible (~2,000 tokens) — static world/character reference
 *   Layer 2: Rolling Synopsis (~1,000-3,000 tokens) — compressed story-so-far
 *   Layer 3: Last 5 Full Chapters (~17,000 tokens) — raw text for style/continuity
 *   Layer 4: Arc Plan (~1,000-2,000 tokens) — current 20-chapter arc intelligence
 *   Anti-Repetition: Previous titles + last 20 opening sentences
 *
 * Total: ~22,000-27,000 tokens (2.5% of Gemini's 1M context — plenty of headroom)
 */

import { getSupabase } from './supabase-helper';
import { logger } from '@/lib/security/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface ContextPayload {
  /** Layer 1: Story bible text (world, characters, power system) */
  storyBible: string | null;
  /** Layer 2: Rolling synopsis of entire story so far */
  synopsis: SynopsisData | null;
  /** Layer 3: Last N full chapters (raw content) */
  recentChapters: RecentChapter[];
  /** Layer 4: Current arc plan */
  arcPlan: ArcPlanData | null;
  /** Anti-repetition: all previous chapter titles */
  previousTitles: string[];
  /** Anti-repetition: last 20 opening sentences */
  recentOpenings: string[];
  /** Anti-repetition: last 10 ending cliffhangers */
  recentCliffhangers: string[];
  /** Chapter summaries for the current arc (for synopsis generation) */
  arcChapterSummaries: ChapterSummaryRow[];
  /** Whether we're at an arc boundary (chapter % 20 == 1) */
  isArcBoundary: boolean;
  /** Current arc number */
  arcNumber: number;
  /** Whether story bible exists */
  hasStoryBible: boolean;
}

export interface RecentChapter {
  chapterNumber: number;
  title: string;
  content: string;
}

export interface SynopsisData {
  synopsisText: string;
  mcCurrentState: string | null;
  activeAllies: string[];
  activeEnemies: string[];
  openThreads: string[];
  lastUpdatedChapter: number;
}

export interface ArcPlanData {
  arcNumber: number;
  startChapter: number;
  endChapter: number;
  arcTheme: string | null;
  planText: string;
  chapterBriefs: Record<string, string> | null;
  threadsToAdvance: string[];
  threadsToResolve: string[];
  newThreads: string[];
}

export interface ChapterSummaryRow {
  chapterNumber: number;
  title: string;
  summary: string;
  openingSentence: string | null;
  mcState: string | null;
  cliffhanger: string | null;
}

// ============================================================================
// CONTEXT LOADER
// ============================================================================

const ARC_SIZE = 20;

export class ContextLoader {
  private projectId: string;
  private novelId: string;

  constructor(projectId: string, novelId: string) {
    this.projectId = projectId;
    this.novelId = novelId;
  }

  /**
   * Load all 4 layers of context for writing chapter `chapterNumber`.
   * All queries run in parallel for speed.
   */
  async load(chapterNumber: number): Promise<ContextPayload> {
    const arcNumber = Math.ceil(chapterNumber / ARC_SIZE);
    const isArcBoundary = chapterNumber === 1 || (chapterNumber - 1) % ARC_SIZE === 0;

    // Fire all queries in parallel
    const [
      storyBible,
      synopsis,
      recentChapters,
      arcPlan,
      previousTitles,
      recentOpenings,
      recentCliffhangers,
      arcChapterSummaries,
    ] = await Promise.all([
      this.loadStoryBible(),
      this.loadSynopsis(),
      this.loadRecentChapters(chapterNumber, 15),
      this.loadArcPlan(arcNumber),
      this.loadPreviousTitles(chapterNumber),
      this.loadRecentOpenings(chapterNumber, 50),
      this.loadRecentCliffhangers(chapterNumber, 10),
      isArcBoundary ? this.loadArcChapterSummaries(arcNumber - 1) : Promise.resolve([]),
    ]);

    return {
      storyBible,
      synopsis,
      recentChapters,
      arcPlan,
      previousTitles,
      recentOpenings,
      recentCliffhangers,
      arcChapterSummaries,
      isArcBoundary,
      arcNumber,
      hasStoryBible: !!storyBible,
    };
  }

  // ============================================================================
  // LAYER 1: Story Bible
  // ============================================================================

  private async loadStoryBible(): Promise<string | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('ai_story_projects')
        .select('story_bible')
        .eq('id', this.projectId)
        .single();

      if (error || !data?.story_bible) return null;
      return data.story_bible as string;
    } catch (e) {
      logger.debug('Failed to load story bible', { projectId: this.projectId, error: e });
      return null;
    }
  }

  // ============================================================================
  // LAYER 2: Rolling Synopsis
  // ============================================================================

  private async loadSynopsis(): Promise<SynopsisData | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('story_synopsis')
        .select('*')
        .eq('project_id', this.projectId)
        .single();

      if (error || !data) return null;
      return {
        synopsisText: data.synopsis_text,
        mcCurrentState: data.mc_current_state,
        activeAllies: data.active_allies || [],
        activeEnemies: data.active_enemies || [],
        openThreads: data.open_threads || [],
        lastUpdatedChapter: data.last_updated_chapter,
      };
    } catch (e) {
      logger.debug('Failed to load synopsis', { projectId: this.projectId, error: e });
      return null;
    }
  }

  // ============================================================================
  // LAYER 3: Last N Full Chapters (raw content from chapters table)
  // ============================================================================

  private async loadRecentChapters(currentChapter: number, count: number): Promise<RecentChapter[]> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('chapters')
        .select('chapter_number, title, content')
        .eq('novel_id', this.novelId)
        .lt('chapter_number', currentChapter)
        .order('chapter_number', { ascending: false })
        .limit(count);

      if (error || !data) return [];

      // Return in chronological order (oldest first)
      return (data as { chapter_number: number; title: string; content: string }[])
        .reverse()
        .map(row => ({
          chapterNumber: row.chapter_number,
          title: row.title,
          content: row.content,
        }));
    } catch (e) {
      logger.debug('Failed to load recent chapters', { novelId: this.novelId, error: e });
      return [];
    }
  }

  // ============================================================================
  // LAYER 4: Arc Plan
  // ============================================================================

  private async loadArcPlan(arcNumber: number): Promise<ArcPlanData | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('arc_plans')
        .select('*')
        .eq('project_id', this.projectId)
        .eq('arc_number', arcNumber)
        .single();

      if (error || !data) return null;
      return {
        arcNumber: data.arc_number,
        startChapter: data.start_chapter,
        endChapter: data.end_chapter,
        arcTheme: data.arc_theme,
        planText: data.plan_text,
        chapterBriefs: data.chapter_briefs as Record<string, string> | null,
        threadsToAdvance: data.threads_to_advance || [],
        threadsToResolve: data.threads_to_resolve || [],
        newThreads: data.new_threads || [],
      };
    } catch (e) {
      logger.debug('Failed to load arc plan', { projectId: this.projectId, error: e });
      return null;
    }
  }

  // ============================================================================
  // ANTI-REPETITION: Previous titles
  // ============================================================================

  private async loadPreviousTitles(currentChapter: number): Promise<string[]> {
    try {
      const supabase = getSupabase();
      // Cap at last 500 titles to preserve richer long-range title context.
      // Title dedup still works because ChapterWriter uses titleChecker on the returned list.
      const { data, error } = await supabase
        .from('chapters')
        .select('title')
        .eq('novel_id', this.novelId)
        .lt('chapter_number', currentChapter)
        .order('chapter_number', { ascending: false })
        .limit(500);

      if (error || !data) return [];
      // Return in chronological order (oldest first) for context coherence
      return (data as { title: string }[]).reverse().map(row => row.title);
    } catch (e) {
      logger.debug('Failed to load previous titles', { novelId: this.novelId, error: e });
      return [];
    }
  }

  // ============================================================================
  // ANTI-REPETITION: Recent opening sentences
  // ============================================================================

  private async loadRecentOpenings(currentChapter: number, count: number): Promise<string[]> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('chapter_summaries')
        .select('opening_sentence')
        .eq('project_id', this.projectId)
        .lt('chapter_number', currentChapter)
        .order('chapter_number', { ascending: false })
        .limit(count);

      if (error || !data) {
        // Fallback: extract openings from raw chapters if no summaries exist yet
        return this.extractOpeningsFromChapters(currentChapter, count);
      }

      const openings = (data as { opening_sentence: string | null }[])
        .map(row => row.opening_sentence)
        .filter((s): s is string => !!s)
        .reverse();

      // If we got fewer than expected, supplement from raw chapters
      if (openings.length < Math.min(count, currentChapter - 1)) {
        const fromChapters = await this.extractOpeningsFromChapters(currentChapter, count);
        // Merge without duplicates
        const seen = new Set(openings);
        for (const o of fromChapters) {
          if (!seen.has(o)) {
            openings.push(o);
            seen.add(o);
          }
        }
      }

      return openings.slice(0, count);
    } catch (e) {
      logger.debug('Failed to load recent openings', { projectId: this.projectId, error: e });
      return [];
    }
  }

  // ============================================================================
  // ANTI-REPETITION: Recent ending cliffhangers
  // ============================================================================

  private async loadRecentCliffhangers(currentChapter: number, count: number): Promise<string[]> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('chapter_summaries')
        .select('chapter_number, cliffhanger')
        .eq('project_id', this.projectId)
        .lt('chapter_number', currentChapter)
        .order('chapter_number', { ascending: false })
        .limit(count);

      if (error || !data) return [];

      return (data as { chapter_number: number; cliffhanger: string | null }[])
        .filter((row) => !!row.cliffhanger)
        .reverse()
        .map((row) => `Ch.${row.chapter_number}: ${row.cliffhanger}`);
    } catch (e) {
      logger.debug('Failed to load recent cliffhangers', { projectId: this.projectId, error: e });
      return [];
    }
  }

  /**
   * Fallback: extract first sentence from raw chapter content
   */
  private async extractOpeningsFromChapters(currentChapter: number, count: number): Promise<string[]> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('chapters')
        .select('content')
        .eq('novel_id', this.novelId)
        .lt('chapter_number', currentChapter)
        .order('chapter_number', { ascending: false })
        .limit(count);

      if (error || !data) return [];

      return (data as { content: string }[])
        .map(row => {
          // Strip the chapter header line, get first real sentence
          const lines = row.content.split('\n').filter(l => l.trim());
          // Skip lines that look like chapter headers
          const bodyLine = lines.find(l =>
            !l.startsWith('Chương ') && !l.startsWith('# ') && l.trim().length > 10
          );
          if (!bodyLine) return '';
          // Get first sentence
          const match = bodyLine.match(/^(.{10,80}?[.!?。！？])/);
          return match ? match[1].trim() : bodyLine.slice(0, 80).trim();
        })
        .filter(s => s.length > 0)
        .reverse();
    } catch {
      return [];
    }
  }

  // ============================================================================
  // ARC CHAPTER SUMMARIES (for synopsis generation at arc boundaries)
  // ============================================================================

  private async loadArcChapterSummaries(arcNumber: number): Promise<ChapterSummaryRow[]> {
    if (arcNumber < 1) return [];
    const startCh = (arcNumber - 1) * ARC_SIZE + 1;
    const endCh = arcNumber * ARC_SIZE;

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('chapter_summaries')
        .select('chapter_number, title, summary, opening_sentence, mc_state, cliffhanger')
        .eq('project_id', this.projectId)
        .gte('chapter_number', startCh)
        .lte('chapter_number', endCh)
        .order('chapter_number', { ascending: true });

      if (error || !data) return [];
      return (data as {
        chapter_number: number;
        title: string;
        summary: string;
        opening_sentence: string | null;
        mc_state: string | null;
        cliffhanger: string | null;
      }[]).map(row => ({
        chapterNumber: row.chapter_number,
        title: row.title,
        summary: row.summary,
        openingSentence: row.opening_sentence,
        mcState: row.mc_state,
        cliffhanger: row.cliffhanger,
      }));
    } catch (e) {
      logger.debug('Failed to load arc chapter summaries', { projectId: this.projectId, error: e });
      return [];
    }
  }

  // ============================================================================
  // CONTEXT ASSEMBLY — Build the `previousSummary` string for chapter writing
  // ============================================================================

  /**
   * Assemble all loaded context into a single `previousSummary` string
   * that gets injected into the Architect and Writer prompts.
   *
   * Target: ~22,000-27,000 tokens total across all layers.
   */
  static assembleContext(payload: ContextPayload, chapterNumber: number): string {
    const parts: string[] = [];

    // ── LAYER 1: Story Bible ──
    if (payload.storyBible) {
      parts.push(`═══ STORY BIBLE (thế giới quan & nhân vật cốt lõi) ═══\n${payload.storyBible}`);
    }

    // ── LAYER 2: Rolling Synopsis ──
    if (payload.synopsis) {
      let synopsisSection = `═══ TÓM TẮT TOÀN BỘ CỐT TRUYỆN (đến chương ${payload.synopsis.lastUpdatedChapter}) ═══\n${payload.synopsis.synopsisText}`;

      if (payload.synopsis.mcCurrentState) {
        synopsisSection += `\n\nTRẠNG THÁI MC HIỆN TẠI: ${payload.synopsis.mcCurrentState}`;
      }
      if (payload.synopsis.activeAllies.length > 0) {
        synopsisSection += `\nĐỒNG MINH: ${payload.synopsis.activeAllies.join(', ')}`;
      }
      if (payload.synopsis.activeEnemies.length > 0) {
        synopsisSection += `\nKẺ THÙ: ${payload.synopsis.activeEnemies.join(', ')}`;
      }
      if (payload.synopsis.openThreads.length > 0) {
        synopsisSection += `\nTUYẾN TRUYỆN CÒN MỞ: ${payload.synopsis.openThreads.join(' | ')}`;
      }

      parts.push(synopsisSection);
    }

    // ── LAYER 3: Last 5 Full Chapters ──
    if (payload.recentChapters.length > 0) {
      const chaptersText = payload.recentChapters
        .map(ch => `--- Chương ${ch.chapterNumber}: ${ch.title} ---\n${ch.content}`)
        .join('\n\n');
      parts.push(`═══ ${payload.recentChapters.length} CHƯƠNG GẦN NHẤT (ĐỌC KỸ để duy trì giọng văn, nhân vật, cốt truyện) ═══\n${chaptersText}`);
    }

    // ── LAYER 4: Arc Plan ──
    if (payload.arcPlan) {
      let arcSection = `═══ KẾ HOẠCH ARC ${payload.arcPlan.arcNumber} (Chương ${payload.arcPlan.startChapter}-${payload.arcPlan.endChapter}) ═══`;
      if (payload.arcPlan.arcTheme) {
        arcSection += `\nCHỦ ĐỀ: ${payload.arcPlan.arcTheme}`;
      }
      arcSection += `\n${payload.arcPlan.planText}`;

      // Add chapter-specific brief if available
      if (payload.arcPlan.chapterBriefs) {
        const brief = payload.arcPlan.chapterBriefs[String(chapterNumber)];
        if (brief) {
          arcSection += `\n\n📋 BRIEF CHO CHƯƠNG ${chapterNumber}: ${brief}`;
        }
      }

      if (payload.arcPlan.threadsToAdvance.length > 0) {
        arcSection += `\nTUYẾN CẦN TIẾN TRIỂN: ${payload.arcPlan.threadsToAdvance.join(' | ')}`;
      }
      if (payload.arcPlan.threadsToResolve.length > 0) {
        arcSection += `\nTUYẾN CẦN GIẢI QUYẾT: ${payload.arcPlan.threadsToResolve.join(' | ')}`;
      }

      parts.push(arcSection);
    }

    // ── ANTI-REPETITION: Opening sentences ──
    if (payload.recentOpenings.length > 0) {
      parts.push(`═══ CÂU MỞ ĐẦU ${payload.recentOpenings.length} CHƯƠNG GẦN NHẤT (CẤM LẶP LẠI CÁCH MỞ ĐẦU) ═══\n${payload.recentOpenings.map((o, i) => `${i + 1}. ${o}`).join('\n')}\n\n⚠️ Chương ${chapterNumber} PHẢI mở đầu bằng cách HOÀN TOÀN KHÁC — khác cấu trúc câu, khác nhân vật/hành động, khác bối cảnh.`);
    }

    // ── ANTI-REPETITION: Ending cliffhangers ──
    if (payload.recentCliffhangers.length > 0) {
      parts.push(`═══ KẾT THÚC/CLIFFHANGER ${payload.recentCliffhangers.length} CHƯƠNG GẦN NHẤT (CẤM LẶP LẠI MOTIF) ═══\n${payload.recentCliffhangers.join('\n')}\n\n⚠️ Chương ${chapterNumber} PHẢI kết thúc bằng motif HOÀN TOÀN KHÁC — khác kiểu hook, khác tình huống, khác cảm xúc.`);
    }

    return parts.join('\n\n');
  }
}

// ============================================================================
// PERSISTENCE HELPERS — Save chapter summaries, synopsis, arc plans
// ============================================================================

/**
 * Save a chapter summary after writing (called from cron callback)
 */
export async function saveChapterSummary(
  projectId: string,
  chapterNumber: number,
  title: string,
  summary: string,
  openingSentence: string | null,
  mcState: string | null,
  cliffhanger: string | null,
  options?: { throwOnError?: boolean },
): Promise<void> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('chapter_summaries').upsert({
      project_id: projectId,
      chapter_number: chapterNumber,
      title,
      summary,
      opening_sentence: openingSentence,
      mc_state: mcState,
      cliffhanger,
    }, { onConflict: 'project_id,chapter_number' });
    if (error) {
      throw new Error(error.message);
    }
  } catch (e) {
    if (options?.throwOnError) {
      throw e;
    }
    console.warn('[context-loader] Failed to save chapter summary — context may drift over time', {
      projectId, chapterNumber, error: e instanceof Error ? e.message : String(e),
    });
  }
}

/**
 * Save or update the rolling synopsis
 */
export async function saveSynopsis(
  projectId: string,
  synopsisText: string,
  mcCurrentState: string | null,
  activeAllies: string[],
  activeEnemies: string[],
  openThreads: string[],
  lastUpdatedChapter: number,
): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from('story_synopsis').upsert({
      project_id: projectId,
      synopsis_text: synopsisText,
      mc_current_state: mcCurrentState,
      active_allies: activeAllies,
      active_enemies: activeEnemies,
      open_threads: openThreads,
      last_updated_chapter: lastUpdatedChapter,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'project_id' });
  } catch (e) {
    console.warn('[context-loader] Failed to save synopsis — rolling synopsis will be stale', {
      projectId, error: e instanceof Error ? e.message : String(e),
    });
  }
}

/**
 * Save an arc plan
 */
export async function saveArcPlan(
  projectId: string,
  arcNumber: number,
  startChapter: number,
  endChapter: number,
  arcTheme: string | null,
  planText: string,
  chapterBriefs: Record<string, string> | null,
  threadsToAdvance: string[],
  threadsToResolve: string[],
  newThreads: string[],
  isFinaleArc: boolean = false,
): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from('arc_plans').upsert({
      project_id: projectId,
      arc_number: arcNumber,
      start_chapter: startChapter,
      end_chapter: endChapter,
      arc_theme: arcTheme,
      plan_text: planText,
      chapter_briefs: chapterBriefs,
      threads_to_advance: threadsToAdvance,
      threads_to_resolve: threadsToResolve,
      new_threads: newThreads,
      is_finale_arc: isFinaleArc,
    }, { onConflict: 'project_id,arc_number' });
  } catch (e) {
    console.warn('[context-loader] Failed to save arc plan', {
      projectId, arcNumber, error: e instanceof Error ? e.message : String(e),
    });
  }
}

/**
 * Save story bible to ai_story_projects
 */
export async function saveStoryBible(projectId: string, storyBible: string): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase
      .from('ai_story_projects')
      .update({ story_bible: storyBible })
      .eq('id', projectId);
  } catch (e) {
    console.warn('[context-loader] Failed to save story bible', {
      projectId, error: e instanceof Error ? e.message : String(e),
    });
  }
}

// ============================================================================
// STORY OUTLINE PERSISTENCE (Gap 1 fix)
// ============================================================================

/**
 * Save the full StoryOutline to ai_story_projects.story_outline (jsonb).
 * Called once after planStory() succeeds on init.
 */
export async function saveStoryOutline(projectId: string, outline: Record<string, unknown>): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase
      .from('ai_story_projects')
      .update({ story_outline: outline })
      .eq('id', projectId);
  } catch (e) {
    console.warn('[context-loader] Failed to save story outline', {
      projectId, error: e instanceof Error ? e.message : String(e),
    });
  }
}

/**
 * Load StoryOutline from DB. Returns null if not found.
 */
export async function loadStoryOutline(projectId: string): Promise<Record<string, unknown> | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('ai_story_projects')
      .select('story_outline')
      .eq('id', projectId)
      .single();

    if (error || !data?.story_outline) return null;
    return data.story_outline as Record<string, unknown>;
  } catch (e) {
    console.warn('[context-loader] Failed to load story outline', {
      projectId, error: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}
