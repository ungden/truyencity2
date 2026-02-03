import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ChapterWriter } from '@/services/story-writing-factory/chapter';
import { GenreType, WorldBible, StoryArc } from '@/services/story-writing-factory/types';
import { getStyleByGenre, getPowerSystemByGenre } from '@/services/story-writing-factory/templates';
import { RAGService, ContentExtractor } from '@/services/story-writing-factory/rag';
import { ConsistencyChecker } from '@/services/story-writing-factory/consistency';
import { PowerTracker } from '@/services/story-writing-factory/power-tracker';
// Phase 2 imports
import { CanonResolver } from '@/services/story-writing-factory/canon-resolver';
import { QCGating } from '@/services/story-writing-factory/qc-gating';
import { BeatLedger } from '@/services/story-writing-factory/beat-ledger';
import { buildStyleContext } from '@/services/story-writing-factory/style-bible';
import { CostCache } from '@/services/story-writing-factory/cost-cache';
import { AutoRewriter } from '@/services/story-writing-factory/auto-rewriter';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max per request

// Lazy initialization to avoid build-time errors
let _supabaseAdmin: SupabaseClient | null = null;
function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabaseAdmin;
}

// In-memory store for active writing sessions (in production, use Redis)
const activeSessions = new Map<string, {
  status: 'running' | 'paused' | 'stopped' | 'completed' | 'error';
  currentChapter: number;
  totalChapters: number;
  chaptersWritten: number;
  error?: string;
  shouldStop: boolean;
  isPaused: boolean;
}>();

// Build WorldBible from project and outline
function buildWorldBible(project: any, outline: any): WorldBible {
  const genre = project.genre as GenreType;
  const powerSystem = getPowerSystemByGenre(genre);

  return {
    projectId: project.id,
    storyTitle: outline?.title || project.novel?.title || 'Untitled',
    powerSystem,
    protagonist: {
      name: project.main_character,
      realm: powerSystem.realms[0].name,
      level: 1,
      age: 18,
      traits: ['kiên trì', 'thông minh'],
      abilities: [],
      inventory: [],
      goals: [outline?.main_character_motivation || 'Trở nên mạnh mẽ'],
      status: 'active',
    },
    npcRelationships: [],
    locations: [],
    openPlotThreads: [],
    resolvedPlotThreads: [],
    foreshadowing: [],
    worldRules: [
      'Sức mạnh quyết định địa vị',
      'Cảnh giới cao áp chế cảnh giới thấp',
    ],
  };
}

// Get previous chapters summary
async function getPreviousSummary(projectId: string, chapterNumber: number): Promise<string> {
  if (chapterNumber <= 1) {
    return 'Đây là chương đầu tiên.';
  }

  // Get recent chapter summaries from story_graph_nodes
  const { data: nodes } = await getSupabaseAdmin()
    .from('story_graph_nodes')
    .select('chapter_number, chapter_title, summary')
    .eq('project_id', projectId)
    .gte('chapter_number', chapterNumber - 3)
    .lt('chapter_number', chapterNumber)
    .order('chapter_number', { ascending: true });

  if (!nodes || nodes.length === 0) {
    return 'Tiếp tục từ chương trước.';
  }

  return nodes.map(n => `Chương ${n.chapter_number} (${n.chapter_title || 'Untitled'}): ${n.summary || ''}`).join('\n\n');
}

// Save chapter to database
async function saveChapter(
  projectId: string,
  novelId: string,
  chapterNumber: number,
  title: string,
  content: string,
  wordCount: number,
  summary: string
): Promise<{ success: boolean; chapterId?: string; error?: string }> {
  try {
    // Save to chapters table
    const { data: chapter, error: chapterError } = await getSupabaseAdmin()
      .from('chapters')
      .insert({
        novel_id: novelId,
        chapter_number: chapterNumber,
        title: title || `Chương ${chapterNumber}`,
        content,
        word_count: wordCount,
        status: 'draft',
      })
      .select('id')
      .single();

    if (chapterError) {
      console.error('Error saving chapter:', chapterError);
      return { success: false, error: chapterError.message };
    }

    // Save to story_graph_nodes for context tracking
    await getSupabaseAdmin()
      .from('story_graph_nodes')
      .upsert({
        project_id: projectId,
        chapter_number: chapterNumber,
        chapter_title: title,
        summary: summary || content.substring(0, 500),
      }, {
        onConflict: 'project_id,chapter_number',
      });

    // Update project current_chapter
    await getSupabaseAdmin()
      .from('ai_story_projects')
      .update({
        current_chapter: chapterNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    return { success: true, chapterId: chapter.id };
  } catch (error) {
    console.error('Error in saveChapter:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Extract characters mentioned in content
function extractCharacters(content: string, protagonistName: string): string[] {
  const characters = new Set<string>([protagonistName]);

  // Common patterns for character names in Vietnamese novels
  // Names often appear after honorifics or before actions
  const honorifics = ['lão', 'tiểu', 'đại ca', 'sư huynh', 'sư đệ', 'sư tổ', 'trưởng lão', 'chưởng môn'];

  for (const honorific of honorifics) {
    const pattern = new RegExp(`${honorific}\\s+([\\p{L}]+(?:\\s+[\\p{L}]+)?)`, 'gui');
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 1 && match[1].length < 20) {
        characters.add(match[1].trim());
      }
    }
  }

  // Names with quotes (dialogue attribution)
  const dialoguePattern = /"[^"]+"\s*[-–]?\s*([A-ZẠ-Ỹ][a-zạ-ỹ]+(?:\s+[A-ZẠ-Ỹ][a-zạ-ỹ]+)?)/g;
  const dialogueMatches = content.matchAll(dialoguePattern);
  for (const match of dialogueMatches) {
    if (match[1] && match[1].length > 1 && match[1].length < 20) {
      characters.add(match[1].trim());
    }
  }

  return Array.from(characters).slice(0, 10); // Limit to 10 characters
}

// Extract power/breakthrough events from content
function extractPowerEvents(content: string): Array<{
  character: string;
  type: 'breakthrough' | 'skill' | 'item';
  newRealm?: string;
  newLevel?: number;
  skillName?: string;
  catalyst?: string;
}> {
  const events: Array<{
    character: string;
    type: 'breakthrough' | 'skill' | 'item';
    newRealm?: string;
    newLevel?: number;
    skillName?: string;
    catalyst?: string;
  }> = [];

  // Cultivation realms to detect
  const realms = [
    'Luyện Khí', 'Trúc Cơ', 'Kim Đan', 'Nguyên Anh', 'Hóa Thần',
    'Luyện Hư', 'Hợp Thể', 'Đại Thừa', 'Độ Kiếp', 'Đại La',
    'Tiên Nhân', 'Chân Tiên', 'Kim Tiên', 'Thái Ất', 'Đại La Kim Tiên'
  ];

  // Breakthrough keywords
  const breakthroughWords = ['đột phá', 'thăng cấp', 'tiến nhập', 'bước vào', 'đạt đến'];

  for (const word of breakthroughWords) {
    for (const realm of realms) {
      if (content.includes(word) && content.includes(realm)) {
        // Found a potential breakthrough
        const levelMatch = content.match(new RegExp(`${realm}\\s*(\\d+)\\s*tầng`, 'i'));
        events.push({
          character: 'protagonist', // Will be replaced with actual name in the calling code
          type: 'breakthrough',
          newRealm: realm,
          newLevel: levelMatch ? parseInt(levelMatch[1]) : 1,
        });
        break;
      }
    }
  }

  // Skill learning keywords
  const skillPatterns = [
    /học được\s+([^,.!?]+(?:thuật|công|pháp|quyết))/gi,
    /lĩnh ngộ\s+([^,.!?]+(?:thuật|công|pháp|quyết))/gi,
    /tu luyện\s+([^,.!?]+(?:thuật|công|pháp|quyết))/gi,
  ];

  for (const pattern of skillPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        events.push({
          character: 'protagonist',
          type: 'skill',
          skillName: match[1].trim().substring(0, 50),
        });
      }
    }
  }

  return events;
}

// POST: Start or continue writing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, action = 'start', chaptersToWrite = 1 } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Handle control actions
    if (action === 'pause') {
      const session = activeSessions.get(projectId);
      if (session) {
        session.isPaused = true;
        session.status = 'paused';
      }
      return NextResponse.json({ success: true, status: 'paused' });
    }

    if (action === 'resume') {
      const session = activeSessions.get(projectId);
      if (session) {
        session.isPaused = false;
        session.status = 'running';
      }
      return NextResponse.json({ success: true, status: 'running' });
    }

    if (action === 'stop') {
      const session = activeSessions.get(projectId);
      if (session) {
        session.shouldStop = true;
        session.status = 'stopped';
      }
      return NextResponse.json({ success: true, status: 'stopped' });
    }

    // Get project data
    const { data: project, error: projectError } = await getSupabaseAdmin()
      .from('ai_story_projects')
      .select(`
        *,
        novel:novels(id, title, author, cover_url, description)
      `)
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get outline
    const { data: outline } = await getSupabaseAdmin()
      .from('story_outlines')
      .select('*')
      .eq('ai_project_id', projectId)
      .single();

    if (!outline) {
      return NextResponse.json({ error: 'Outline not found. Please generate outline first (Step 2)' }, { status: 400 });
    }

    // Get plot arcs
    const { data: arcs } = await getSupabaseAdmin()
      .from('plot_arcs')
      .select('*')
      .eq('project_id', projectId)
      .order('arc_number', { ascending: true });

    // Build context
    const worldBible = buildWorldBible(project, outline);
    const styleBible = getStyleByGenre(project.genre as GenreType);

    // Initialize writer
    const chapterWriter = new ChapterWriter({
      provider: 'openrouter',
      model: project.ai_model || 'deepseek/deepseek-chat-v3-0324',
      genre: project.genre as GenreType,
      targetWordCount: project.target_chapter_length || 2800,
    });

    // Initialize advanced systems
    const ragService = new RAGService();
    const consistencyChecker = new ConsistencyChecker(projectId);
    const powerTracker = new PowerTracker(projectId, getPowerSystemByGenre(project.genre as GenreType).realms);

    // Phase 2: Canon, QC, Beat, Cost
    const canonResolver = new CanonResolver(projectId);
    const qcGating = new QCGating(projectId);
    const beatLedger = new BeatLedger(projectId);
    const costCache = new CostCache(projectId, { dailyBudget: 20, sessionBudget: 10 });

    // Load existing state (parallel initialization)
    await Promise.all([
      consistencyChecker.initialize(),
      powerTracker.initialize(),
      canonResolver.initialize(),
      qcGating.initialize(),
      beatLedger.initialize(),
      costCache.initialize(),
    ]);

    // Initialize Auto-Rewriter
    const autoRewriter = new AutoRewriter(
      projectId,
      chapterWriter,
      qcGating,
      canonResolver,
      beatLedger,
      { maxAttempts: 3, targetScore: 65 }
    );

    // Determine starting chapter
    const startChapter = project.current_chapter + 1;
    const endChapter = Math.min(startChapter + chaptersToWrite - 1, project.total_planned_chapters);

    if (startChapter > project.total_planned_chapters) {
      return NextResponse.json({
        success: true,
        message: 'Story is already complete',
        completed: true,
      });
    }

    // Create/update session
    activeSessions.set(projectId, {
      status: 'running',
      currentChapter: startChapter,
      totalChapters: endChapter - startChapter + 1,
      chaptersWritten: 0,
      shouldStop: false,
      isPaused: false,
    });

    const results: any[] = [];
    let lastError: string | undefined;

    // Write chapters
    for (let chapterNum = startChapter; chapterNum <= endChapter; chapterNum++) {
      const session = activeSessions.get(projectId);
      if (!session) break;

      // Check stop/pause
      if (session.shouldStop) {
        session.status = 'stopped';
        break;
      }

      while (session.isPaused && !session.shouldStop) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (session.shouldStop) {
        session.status = 'stopped';
        break;
      }

      session.currentChapter = chapterNum;

      // Get current arc info
      const currentArc = arcs?.find(a => chapterNum >= a.start_chapter && chapterNum <= a.end_chapter);

      // Get previous summary
      const previousSummary = await getPreviousSummary(projectId, chapterNum);

      // Get chapter outline if available
      const chapterOutline = outline.chapter_outlines?.find(
        (ch: any) => ch.chapter_number === chapterNum
      );

      try {
        // Build arc context
        const arcContext: StoryArc | undefined = currentArc ? {
          id: currentArc.id,
          projectId: projectId,
          arcNumber: currentArc.arc_number,
          title: currentArc.arc_title,
          theme: currentArc.theme || 'growth',
          startChapter: currentArc.start_chapter,
          endChapter: currentArc.end_chapter,
          tensionCurve: currentArc.tension_curve || [],
          climaxChapter: currentArc.climax_chapter || currentArc.end_chapter,
          status: currentArc.status || 'in_progress',
        } : undefined;

        // === RAG: Build context from vector search ===
        let ragContext = '';
        try {
          const ragResult = await ragService.buildChapterContext(
            projectId,
            chapterNum,
            {
              arcDescription: arcContext?.title || '',
              chapterGoal: chapterOutline?.summary || '',
              charactersInvolved: chapterOutline?.characters_involved || [project.main_character],
            }
          );
          ragContext = ragService.formatContextForPrompt(ragResult, 3000);
        } catch (ragError) {
          console.warn('RAG context build failed (non-critical):', ragError);
        }

        // === CANON: Build canon context ===
        let canonContext = '';
        try {
          const characters = chapterOutline?.characters_involved || [project.main_character];
          canonContext = canonResolver.buildCanonContext(characters);
        } catch (canonError) {
          console.warn('Canon context build failed (non-critical):', canonError);
        }

        // === BEAT: Get beat recommendations ===
        let beatContext = '';
        try {
          beatContext = beatLedger.buildBeatContext(chapterNum);
        } catch (beatError) {
          console.warn('Beat context build failed (non-critical):', beatError);
        }

        // === STYLE: Build style context ===
        const sceneType = chapterOutline?.scene_type || 'action';
        const styleContext = buildStyleContext(project.genre as GenreType, sceneType);

        // Enhance previous summary with all contexts
        const enhancedPreviousSummary = [
          previousSummary,
          ragContext ? `\n\n### Ngữ cảnh từ các chương trước (RAG):\n${ragContext}` : '',
          canonContext ? `\n\n${canonContext}` : '',
          beatContext ? `\n\n${beatContext}` : '',
          styleContext ? `\n\n${styleContext}` : '',
        ].filter(Boolean).join('');

        // === COST: Check budget before writing ===
        const budgetCheck = costCache.canProceed(4000, 'writing');
        if (!budgetCheck.allowed) {
          console.warn(`Budget warning: ${budgetCheck.reason}`);
        }

        // Write chapter - use full method if arc exists, simple method otherwise
        let result;
        if (arcContext) {
          result = await chapterWriter.writeChapter(chapterNum, {
            worldBible,
            styleBible,
            currentArc: arcContext,
            previousSummary: enhancedPreviousSummary,
          });
        } else {
          result = await chapterWriter.writeChapterSimple(chapterNum, {
            worldBible,
            styleBible,
            previousSummary: enhancedPreviousSummary,
          });
        }

        if (result.success && result.data) {
          // Save to database
          const saveResult = await saveChapter(
            projectId,
            project.novel_id,
            chapterNum,
            result.data.title,
            result.data.content,
            result.data.wordCount,
            `${result.data.title}: Chương này tiếp nối câu chuyện.`
          );

          // === CONSISTENCY CHECK ===
          let consistencyReport = null;
          try {
            // Extract characters from content (simple extraction)
            const mentionedChars = extractCharacters(result.data.content, project.main_character);

            consistencyReport = await consistencyChecker.checkChapter(
              chapterNum,
              result.data.content,
              {
                charactersInvolved: mentionedChars,
                locations: [],
                powerEvents: extractPowerEvents(result.data.content),
              }
            );

            // Log warnings if any
            if (consistencyReport.issues.length > 0) {
              console.log(`Chapter ${chapterNum} consistency issues:`, consistencyReport.issues.length);
            }
          } catch (consistencyError) {
            console.warn('Consistency check failed (non-critical):', consistencyError);
          }

          // === POWER TRACKING ===
          try {
            const powerEvents = extractPowerEvents(result.data.content);
            for (const event of powerEvents) {
              // Use protagonist name instead of placeholder
              const characterName = event.character === 'protagonist' ? project.main_character : event.character;

              if (event.type === 'breakthrough' && event.newRealm) {
                await powerTracker.recordBreakthrough(
                  characterName,
                  chapterNum,
                  event.newRealm,
                  event.newLevel || 1,
                  event.catalyst
                );
              } else if (event.type === 'skill' && event.skillName) {
                await powerTracker.recordSkillLearned(
                  characterName,
                  chapterNum,
                  event.skillName
                );
              }
            }
          } catch (powerError) {
            console.warn('Power tracking failed (non-critical):', powerError);
          }

          // === RAG INDEXING: Store chapter for future retrieval ===
          try {
            const extractedContent = ContentExtractor.extractFromChapter(
              chapterNum,
              result.data.title,
              result.data.content,
              project.main_character
            );

            await ragService.indexChapterContent(
              projectId,
              chapterNum,
              extractedContent
            );
          } catch (indexError) {
            console.warn('RAG indexing failed (non-critical):', indexError);
          }

          // === QC GATING: Evaluate chapter quality ===
          let qcResult = null;
          let rewriteAttempts = 0;
          let finalContent = result.data.content;
          let finalTitle = result.data.title;
          let needsHumanReview = false;

          try {
            qcResult = await qcGating.evaluate(chapterNum, result.data.content, {
              protagonistPowerLevel: powerTracker.getPowerState(project.main_character)
                ? { realm: powerTracker.getPowerState(project.main_character)!.realm, realmIndex: powerTracker.getPowerState(project.main_character)!.level }
                : undefined,
              charactersInvolved: extractCharacters(result.data.content, project.main_character),
              deadCharactersMentioned: consistencyReport?.issues
                .filter(i => i.type === 'dead_character')
                .map(i => i.description.match(/["']([^"']+)["']/)?.[1])
                .filter(Boolean) as string[] || [],
            });

            // === AUTO-REWRITE: If QC fails, attempt to rewrite ===
            if (!qcResult.passed && qcResult.action === 'auto_rewrite') {
              console.log(`Chapter ${chapterNum} triggering auto-rewrite...`);

              const rewriteResult = await autoRewriter.rewriteUntilPass(
                chapterNum,
                result.data.content,
                result.data.title,
                qcResult,
                {
                  worldBible,
                  styleBible,
                  currentArc: arcContext,
                  previousSummary: enhancedPreviousSummary,
                  protagonistName: project.main_character,
                }
              );

              rewriteAttempts = rewriteResult.attempts;
              needsHumanReview = rewriteResult.needsHumanReview;

              if (rewriteResult.success) {
                // Update with rewritten content
                finalContent = rewriteResult.finalContent;
                finalTitle = rewriteResult.finalTitle;
                qcResult.scores.overall = rewriteResult.finalScore;
                qcResult.passed = true;
                console.log(`Chapter ${chapterNum} rewrite successful after ${rewriteAttempts} attempts (score: ${rewriteResult.finalScore})`);

                // Update saved chapter with new content
                await getSupabaseAdmin()
                  .from('chapters')
                  .update({
                    content: finalContent,
                    title: finalTitle,
                    word_count: finalContent.split(/\s+/).length,
                  })
                  .eq('id', saveResult.chapterId);
              } else {
                console.warn(`Chapter ${chapterNum} rewrite failed:`, rewriteResult.reviewReason);
              }
            } else if (!qcResult.passed) {
              console.warn(`Chapter ${chapterNum} QC failed:`, qcResult.action, qcResult.failures);
              needsHumanReview = qcResult.action === 'human_review';
            }
          } catch (qcError) {
            console.warn('QC gating failed (non-critical):', qcError);
          }

          // === BEAT RECORDING: Track beats used in this chapter ===
          try {
            // Use finalContent (potentially rewritten)
            const detectedBeats = beatLedger.detectBeats(finalContent);
            for (const beat of detectedBeats) {
              await beatLedger.recordBeat(
                chapterNum,
                beat.beatType,
                beat.category,
                beat.intensity
              );
            }
          } catch (beatError) {
            console.warn('Beat recording failed (non-critical):', beatError);
          }

          // === COST TRACKING ===
          try {
            await costCache.recordCost(
              project.ai_model || 'deepseek/deepseek-chat-v3-0324',
              'writing',
              result.data.wordCount * 2,  // Approximate input tokens
              result.data.wordCount       // Approximate output tokens
            );
          } catch (costError) {
            console.warn('Cost tracking failed (non-critical):', costError);
          }

          results.push({
            chapterNumber: chapterNum,
            success: true,
            title: finalTitle,
            wordCount: finalContent.split(/\s+/).length,
            chapterId: saveResult.chapterId,
            consistencyScore: consistencyReport?.overallScore,
            consistencyIssues: consistencyReport?.issues.length || 0,
            qcScore: qcResult?.scores.overall,
            qcPassed: qcResult?.passed,
            qcAction: qcResult?.action,
            rewriteAttempts,
            needsHumanReview,
          });

          session.chaptersWritten++;
        } else {
          results.push({
            chapterNumber: chapterNum,
            success: false,
            error: result.error,
          });
          lastError = result.error;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          chapterNumber: chapterNum,
          success: false,
          error: errorMsg,
        });
        lastError = errorMsg;
      }

      // Small delay between chapters
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Update session status
    const session = activeSessions.get(projectId);
    if (session && !session.shouldStop) {
      session.status = 'completed';
    }

    const successCount = results.filter(r => r.success).length;

    // Calculate aggregate consistency stats
    const successfulResults = results.filter(r => r.success);
    const avgConsistencyScore = successfulResults.length > 0
      ? Math.round(successfulResults.reduce((sum, r) => sum + (r.consistencyScore || 100), 0) / successfulResults.length)
      : null;
    const totalConsistencyIssues = successfulResults.reduce((sum, r) => sum + (r.consistencyIssues || 0), 0);

    // Calculate QC stats
    const avgQCScore = successfulResults.length > 0
      ? Math.round(successfulResults.reduce((sum, r) => sum + (r.qcScore || 100), 0) / successfulResults.length)
      : null;
    const qcFailedCount = successfulResults.filter(r => r.qcPassed === false).length;

    // Calculate rewrite stats
    const totalRewrites = successfulResults.reduce((sum, r) => sum + (r.rewriteAttempts || 0), 0);
    const chaptersNeedingReview = successfulResults.filter(r => r.needsHumanReview).length;

    // Get power progression summary
    const protagonistPower = powerTracker.getPowerState(project.main_character);

    // Get cost summary
    const costSummary = costCache.getCostSummary();

    // Get beat stats
    const beatStats = beatLedger.getArcStats();

    return NextResponse.json({
      success: successCount > 0,
      results,
      summary: {
        chaptersWritten: successCount,
        chaptersFailed: results.length - successCount,
        startChapter,
        endChapter: startChapter + results.length - 1,
        lastError,
        // Consistency stats
        avgConsistencyScore,
        totalConsistencyIssues,
        // QC stats
        avgQCScore,
        qcFailedCount,
        // Rewrite stats
        totalRewrites,
        chaptersNeedingReview,
        // Power progression
        protagonistPower: protagonistPower ? {
          realm: protagonistPower.realm,
          level: protagonistPower.level,
          abilities: protagonistPower.abilities.length,
          items: protagonistPower.items.length,
          totalBreakthroughs: protagonistPower.totalBreakthroughs,
        } : null,
        // Cost tracking
        cost: {
          sessionCost: costSummary.session,
          dailyCost: costSummary.today,
          dailyRemaining: costSummary.dailyRemaining,
        },
        // Beat diversity
        beats: {
          totalBeats: beatStats.totalBeats,
          uniqueBeats: beatStats.uniqueBeats,
        },
      },
    });
  } catch (error) {
    console.error('Story Factory Write API Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      detail: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// GET: Get current writing status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const includeDetails = searchParams.get('details') === 'true';

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
  }

  // Get session status
  const session = activeSessions.get(projectId);

  // Get project progress from database
  const { data: project } = await getSupabaseAdmin()
    .from('ai_story_projects')
    .select('current_chapter, total_planned_chapters, status, main_character, genre')
    .eq('id', projectId)
    .single();

  let powerInfo = null;
  let consistencyInfo = null;

  // If details requested, load power tracker and consistency info
  if (includeDetails && project) {
    try {
      // Get power progression data
      const { data: powerData } = await getSupabaseAdmin()
        .from('character_tracker')
        .select('character_name, current_state, status')
        .eq('project_id', projectId);

      if (powerData) {
        powerInfo = powerData.map(char => ({
          name: char.character_name,
          realm: char.current_state?.realm || 'Unknown',
          level: char.current_state?.level || 1,
          abilities: char.current_state?.abilities?.length || 0,
          status: char.status,
        }));
      }

      // Get recent consistency issues
      const { data: issues } = await getSupabaseAdmin()
        .from('consistency_issues')
        .select('chapter_number, issue_type, severity, description, status')
        .eq('project_id', projectId)
        .eq('status', 'open')
        .order('chapter_number', { ascending: false })
        .limit(10);

      if (issues) {
        consistencyInfo = {
          openIssues: issues.length,
          criticalCount: issues.filter(i => i.severity === 'critical').length,
          majorCount: issues.filter(i => i.severity === 'major').length,
          recentIssues: issues.slice(0, 5),
        };
      }
    } catch (e) {
      console.warn('Failed to load details:', e);
    }
  }

  return NextResponse.json({
    session: session || null,
    project: project ? {
      currentChapter: project.current_chapter,
      totalChapters: project.total_planned_chapters,
      progress: project.total_planned_chapters > 0
        ? Math.round((project.current_chapter / project.total_planned_chapters) * 100)
        : 0,
      status: project.status,
    } : null,
    isWriting: session?.status === 'running',
    isPaused: session?.status === 'paused',
    // Additional details if requested
    ...(includeDetails && {
      powerProgression: powerInfo,
      consistency: consistencyInfo,
    }),
  });
}
