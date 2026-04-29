/**
 * Story Engine v2 — Orchestrator
 *
 * The main entry point that ties everything together.
 * Replaces v1: canonical-write.ts + runner.ts writeArc() + 7 parallel post-write tasks.
 *
 * Flow:
 * 1. Load project from DB
 * 2. Load context (4 layers + character states + genre boundary + RAG + scalability)
 * 3. Write chapter via 3-agent pipeline
 * 4. Save chapter to DB
 * 5. Run 7 parallel post-write tasks (summary, character, RAG, beats, rules, consistency, synopsis)
 * 6. Update project current_chapter
 */

import { getSupabase } from '../utils/supabase';
import { getGenreBoundaryText } from '../config';
import { loadContext, assembleContext } from './context-assembler';
import { writeChapter } from './chapter-writer';
import { retrieveRAGContext, chunkAndStoreChapter, retrieveEntityContext, retrieveThemeContext } from '../memory/rag-store';
import { saveCharacterStatesFromCombined, detectCharacterContradictions } from '../memory/character-tracker';
import { extractCharacterKnowledge, getCharacterKnowledgeContext } from '../memory/character-knowledge';
import { autoReviseChapter } from './auto-reviser';
import {
  buildPlotThreadContext,
  buildBeatContext,
  buildRuleContext,
  detectAndRecordBeats,
  extractRulesFromChapter,
  checkConsistency,
} from '../memory/plot-tracker';
import { runSummaryTasks } from '../memory/summary-manager';
import { generateArcPlan } from './context-assembler';
// Quality modules (Qidian Master Level)
import { getForeshadowingContext, updateForeshadowingStatus, generateForeshadowingAgenda } from '../memory/foreshadowing-planner';
import { getCharacterArcContext, updateCharacterArcs } from '../memory/character-arc-engine';
import { getChapterPacingContext, generatePacingBlueprint } from '../memory/pacing-director';
import { getVoiceContext, updateVoiceFingerprint } from '../memory/voice-fingerprint';
import { getPowerContext, updateMCPowerState } from '../memory/power-system-tracker';
import { getWorldContext, updateLocationExploration, prepareUpcomingLocation, initializeWorldMap } from '../memory/world-expansion-tracker';
import type {
  WriteChapterInput, WriteChapterResult, GeminiConfig, GenreType,
} from '../types';
import { DEFAULT_CONFIG } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

interface ProjectRow {
  id: string;
  novel_id: string;
  main_character: string | null;
  genre: string | null;
  current_chapter: number | null;
  total_planned_chapters: number | null;
  world_description: string | null;
  temperature: number | null;
  target_chapter_length: number | null;
  ai_model: string | null;
  topic_id: string | null;
  novels: { id: string; title: string } | { id: string; title: string }[] | null;
}

export interface OrchestratorResult {
  chapterNumber: number;
  title: string;
  wordCount: number;
  qualityScore: number;
  projectId: string;
  novelId: string;
  duration: number;
  /** Number of reader-facing chapters created from this AI write (typically 2 after split) */
  chaptersCreated: number;
  /** Last DB chapter_number created in this write (for daily quota tracking) */
  lastChapterNumber: number;
}

export interface OrchestratorOptions {
  projectId: string;
  customPrompt?: string;
  temperature?: number;
  targetWordCount?: number;
  model?: string;
}

// ── Public: Write One Chapter ────────────────────────────────────────────────

/**
 * Write a single chapter for a project. This is the primary entry point.
 *
 * Loads all context, writes via 3-agent pipeline, saves, runs post-write tasks.
 */
export async function writeOneChapter(options: OrchestratorOptions): Promise<OrchestratorResult> {
  const startTime = Date.now();
  const db = getSupabase();

  // ── Step 1: Load project ───────────────────────────────────────────────
  const { data: projectData, error: projectError } = await db
    .from('ai_story_projects')
    .select('id,novel_id,main_character,genre,current_chapter,total_planned_chapters,world_description,temperature,target_chapter_length,ai_model,topic_id,novels!ai_story_projects_novel_id_fkey(id,title)')
    .eq('id', options.projectId)
    .single();

  if (projectError || !projectData) {
    throw new Error(projectError?.message || 'Project not found');
  }

  const project = projectData as unknown as ProjectRow;
  const novel = normalizeNovel(project.novels);
  if (!novel) throw new Error('Project has no linked novel');

  const currentChapter = project.current_chapter || 0;
  const nextChapter = currentChapter + 1;
  // No silent default for genre — every project must have one set explicitly.
  // Previous fallback to 'tien-hiep' would silently write a tu-tien chapter
  // for a do-thi project missing its genre column, shipping wrong-genre
  // content. Fail loudly instead.
  if (!project.genre) {
    throw new Error(`Project ${options.projectId} has no genre set. Refusing to write chapter — silent fallback to 'tien-hiep' would produce wrong-genre content.`);
  }
  const genre = project.genre as GenreType;

  // ── Step 1b: Pre-flight metadata validation + auto-repair ──────────────
  // Catches three classes of bug we've seen ship to readers:
  //   (A) project.main_character ≠ story_outline.protagonist.name
  //       — the engine reads outline.protagonist.name when writing chapters,
  //         so a mismatch means description shows one name and chapters
  //         show another. Pick the authoritative source by chapter count
  //         (chapters > 0 → outline wins, else seed wins) and sync the
  //         loser side back.
  //   (D) total_planned_chapters wildly exceeds master_outline arc coverage
  //       — story will end at the last arc's endChapter, so quota past
  //         that is dead weight. Auto-trim.
  //   (E) total_planned_chapters way SHORTER than master_outline arcs
  //       — extend to cover the outlined story.
  // All repairs are persisted to DB before chapter generation.
  const validationFixes: string[] = [];
  // Default 'Nhân vật chính' is a debugging escape hatch, not a real fallback.
  // If project.main_character is truly missing we'll catch it in pre-flight
  // validation (Step 1b) by reading from outline.protagonist.name. If both
  // missing → throw at end of validation block instead of writing a chapter
  // with a generic placeholder name.
  let resolvedMainCharacter = (project.main_character || '').trim();
  try {
    const { data: extra } = await db
      .from('ai_story_projects')
      .select('story_outline,master_outline')
      .eq('id', options.projectId)
      .single();
    const storyOutline = extra?.story_outline as { protagonist?: { name?: string } } | null;
    const masterOutline = extra?.master_outline as { majorArcs?: Array<{ endChapter?: number }> } | null;

    // Fix A: MC name sync
    const outlineMC = storyOutline?.protagonist?.name?.trim();
    const projectMC = project.main_character?.trim();
    if (outlineMC && projectMC && outlineMC !== projectMC) {
      // Authoritative source: whichever side already has chapters written
      const winner = currentChapter > 0 ? outlineMC : projectMC;
      const loser = currentChapter > 0 ? 'project.main_character' : 'outline.protagonist.name';
      if (currentChapter > 0) {
        // chapters use outlineMC → sync project field to match
        await db.from('ai_story_projects').update({ main_character: outlineMC }).eq('id', options.projectId);
      } else {
        // no chapters yet → seed name wins, sync outline
        const newOutline = { ...(storyOutline || {}), protagonist: { ...(storyOutline?.protagonist || {}), name: projectMC } };
        await db.from('ai_story_projects').update({ story_outline: newOutline as unknown as Record<string, unknown> }).eq('id', options.projectId);
      }
      resolvedMainCharacter = winner;
      validationFixes.push(`MC sync: ${loser}="${currentChapter > 0 ? projectMC : outlineMC}" → "${winner}" (ch.${currentChapter} written)`);
    } else if (projectMC) {
      resolvedMainCharacter = projectMC;
    }

    // Fix F: story_outline canonical schema check (defense-in-depth, post 2026-04-29 incident).
    // If story_outline lacks the fields context-assembler reads, the engine
    // silently produces off-premise content. Detect early and warn loudly so
    // operator notices BEFORE 10 chapters of drift ship to readers.
    if (storyOutline) {
      const outlineObj = storyOutline as Record<string, unknown>;
      const canonicalFields = ['premise', 'mainConflict', 'themes', 'majorPlotPoints'];
      const presentCount = canonicalFields.filter(f => outlineObj[f] !== undefined && outlineObj[f] !== null).length;
      if (presentCount < 2) {
        const wrongSchemaFields = ['antagonists', 'powerSystem', 'openingHook', 'majorThemes', 'settingDetails'].filter(f => f in outlineObj);
        validationFixes.push(`⚠ story_outline schema thin: only ${presentCount}/4 canonical fields present${wrongSchemaFields.length ? ` (legacy schema detected: ${wrongSchemaFields.join(',')} — should be premise/mainConflict/themes/majorPlotPoints)` : ''}. Engine will fall back to world_description but coverage will be reduced.`);
      }
    }

    // Fix D/E: total_planned_chapters ↔ master_outline coverage alignment
    const arcs = masterOutline?.majorArcs ?? [];
    if (arcs.length > 0) {
      const lastArcEnd = Math.max(...arcs.map((a) => a?.endChapter || 0));
      const planned = project.total_planned_chapters || 0;
      // Tolerate ≤10% drift; otherwise auto-correct
      const driftRatio = planned > 0 ? Math.abs(lastArcEnd - planned) / planned : 1;
      if (lastArcEnd > 0 && driftRatio > 0.1) {
        // Round to nearest 50 for cleaner numbers
        const newTotal = Math.round(lastArcEnd / 50) * 50 || lastArcEnd;
        await db.from('ai_story_projects').update({ total_planned_chapters: newTotal }).eq('id', options.projectId);
        validationFixes.push(`total_planned: ${planned} → ${newTotal} (master outline covers ch.${lastArcEnd})`);
      }
    }
  } catch (err) {
    console.warn('[orchestrator] Pre-flight validation failed (non-fatal):', err instanceof Error ? err.message : String(err));
  }
  if (validationFixes.length > 0) {
    console.log(`[orchestrator] Pre-flight auto-repair (project ${options.projectId}):`);
    for (const f of validationFixes) console.log(`  ✓ ${f}`);
  }

  // Hard fail if validation block didn't resolve a name. This would happen
  // only if both project.main_character AND outline.protagonist.name are
  // empty — a corrupt project. Silent fallback to "Nhân vật chính" would
  // ship chapters with a placeholder name. Throw instead.
  if (!resolvedMainCharacter) {
    throw new Error(`Project ${options.projectId} has neither main_character nor outline.protagonist.name set. Refusing to write — silent fallback to placeholder would ship "Nhân vật chính" as MC name.`);
  }
  const protagonistName = resolvedMainCharacter;
  const storyTitle = novel.title || project.world_description || `Project ${project.id}`;
  // Hard fail on missing total_planned_chapters. Silent fallback to 1000
  // would write 1000 chapters of a possibly-finished story or stop arc
  // logic from triggering at the right point. Project.total_planned_chapters
  // is set at spawn time (capped at MAX_PLANNED_CHAPTERS=600) — if missing
  // here, project is corrupt.
  if (!project.total_planned_chapters || project.total_planned_chapters < 50) {
    throw new Error(`Project ${options.projectId} has invalid total_planned_chapters (${project.total_planned_chapters}). Refusing to write — silent fallback to 1000 would mis-pace the story.`);
  }
  const totalPlanned = project.total_planned_chapters;
  // Base target: explicit option > project setting > default. style_directives override takes precedence over project setting.
  const projectStyleDirectives = (project as { style_directives?: { target_chapter_length_override?: number; disable_chapter_split?: boolean } }).style_directives;
  const directiveOverride = projectStyleDirectives?.target_chapter_length_override;
  const disableChapterSplit = projectStyleDirectives?.disable_chapter_split === true;
  const baseTargetWordCount = options.targetWordCount ?? directiveOverride ?? project.target_chapter_length ?? DEFAULT_CONFIG.targetWordCount;

  // Mood-adjusted: lookup mood from pacing blueprint (if exists) and scale (climax→long, breathing→short).
  // This is non-fatal — falls back to baseTargetWordCount if no blueprint.
  let targetWordCount = baseTargetWordCount;
  try {
    const { getChapterMood, adjustWordCountForMood } = await import('../memory/pacing-director');
    const mood = await getChapterMood(project.id, nextChapter);
    if (mood) {
      targetWordCount = adjustWordCountForMood(baseTargetWordCount, mood);
    }
  } catch (err) {
    console.warn('[orchestrator] Mood-adjusted word count failed, using base:', err);
  }

  const geminiConfig: GeminiConfig = {
    model: options.model || project.ai_model || DEFAULT_CONFIG.model,
    temperature: options.temperature ?? project.temperature ?? DEFAULT_CONFIG.temperature,
    maxTokens: DEFAULT_CONFIG.maxTokens,
  };

  // ── Step 2: Load context (4 layers from DB) ────────────────────────────
  const context = await loadContext(project.id, novel.id, nextChapter);

  // ── Step 2b: Inject genre boundary ─────────────────────────────────────
  context.genreBoundary = getGenreBoundaryText(genre);

  // ── Step 2c: Inject RAG context — 3-level retrieval (non-fatal) ────────
  try {
    const [ragCtx, entityCtx, themeCtx] = await Promise.all([
      // Level 0: Hybrid vector search (existing)
      retrieveRAGContext(
        project.id, nextChapter,
        context.arcPlan?.slice(0, 300) || null,
        context.previousCliffhanger || null,
        protagonistName,
      ).catch(() => null),
      // Level 1: Entity-level retrieval (character-specific events)
      retrieveEntityContext(
        project.id, nextChapter, context.knownCharacterNames,
      ).catch(() => null),
      // Level 2: Theme-level retrieval (arc theme + synopsis connections)
      // NOTE: uses synopsis (available from Step 2 DB load), NOT plotThreads (set later in Step 2d)
      retrieveThemeContext(
        project.id, nextChapter,
        context.arcPlan?.slice(0, 200) || null,
        context.synopsis?.slice(0, 200) || null,
      ).catch(() => null),
    ]);

    const ragParts: string[] = [];
    if (ragCtx) ragParts.push(ragCtx);
    if (entityCtx) ragParts.push(entityCtx);
    if (themeCtx) ragParts.push(themeCtx);
    if (ragParts.length > 0) context.ragContext = smartTruncate(ragParts.join('\n\n'), 6000);
  } catch {
    // Non-fatal
  }

  // ── Step 2d: Inject scalability modules (non-fatal) ────────────────────
  try {
    const arcNumber = Math.ceil(nextChapter / 20);
    // Use all known characters from DB (not just protagonist) for better
    // plot thread scoring and rule matching with secondary characters
    const characters = context.knownCharacterNames.length > 0
      ? context.knownCharacterNames
      : [protagonistName];

    const [plotCtx, beatCtx, ruleCtx] = await Promise.all([
      buildPlotThreadContext(project.id, nextChapter, characters, arcNumber),
      buildBeatContext(project.id, nextChapter, arcNumber),
      buildRuleContext(project.id, nextChapter, context.arcPlan?.slice(0, 300) || '', characters),
    ]);

    if (plotCtx) context.plotThreads = plotCtx;
    if (beatCtx) context.beatGuidance = beatCtx;
    if (ruleCtx) context.worldRules = ruleCtx;
  } catch {
    // Non-fatal
  }

  // ── Step 2d+: Inject quality modules + character knowledge (all non-fatal, parallel) ──
  try {
    const { getRelationshipContext } = await import('../memory/relationship-tracker');
    const { getEconomicContext } = await import('../memory/economic-ledger');
    const subGenres = context.subGenres || [];

    const [foreshadowCtx, charArcCtx, pacingCtx, voiceCtx, powerCtx, worldCtx, knowledgeCtx, relationshipCtx, economicCtx] = await Promise.all([
      getForeshadowingContext(project.id, nextChapter).catch(() => null),
      getCharacterArcContext(project.id, nextChapter, context.knownCharacterNames).catch(() => null),
      getChapterPacingContext(project.id, nextChapter).catch(() => null),
      getVoiceContext(project.id).catch(() => null),
      getPowerContext(project.id, genre).catch(() => null),
      getWorldContext(project.id, nextChapter).catch(() => null),
      getCharacterKnowledgeContext(project.id, nextChapter, context.knownCharacterNames).catch(() => null),
      getRelationshipContext(project.id, context.knownCharacterNames).catch(() => null),
      getEconomicContext(project.id, genre, subGenres).catch(() => null),
    ]);

    // Smart truncation: per-module budgets
    if (foreshadowCtx) context.foreshadowingContext = smartTruncate(foreshadowCtx, 1500);
    if (charArcCtx) context.characterArcContext = smartTruncate(charArcCtx, 1500);
    if (pacingCtx) context.pacingContext = smartTruncate(pacingCtx, 600);
    if (voiceCtx) context.voiceContext = smartTruncate(voiceCtx, 600);
    if (powerCtx) context.powerContext = smartTruncate(powerCtx, 600);
    if (worldCtx) context.worldContext = smartTruncate(worldCtx, 600);
    if (knowledgeCtx) context.characterKnowledgeContext = smartTruncate(knowledgeCtx, 2000);
    if (relationshipCtx) context.relationshipContext = smartTruncate(relationshipCtx, 1200);
    if (economicCtx) context.economicContext = smartTruncate(economicCtx, 1200);
  } catch {
    // Non-fatal
  }

  // ── Step 2e: Inject progressive finale wind-down ───────────────────────
  const finaleContext = buildFinaleContext(nextChapter, totalPlanned);
  if (finaleContext) {
    context.ragContext = (context.ragContext || '') + '\n\n' + finaleContext;
  }

  // ── Step 2f: Inject custom prompt ──────────────────────────────────────
  if (options.customPrompt) {
    context.ragContext = (context.ragContext || '') +
      `\n\n[YÊU CẦU ĐẶC BIỆT CHO CHƯƠNG ${nextChapter}]: ${options.customPrompt}`;
  }

  // ── Step 2g: Auto-generate arc plan for arc 1 if missing ──────────────
  // When writing chapters 1-20, if no arc plan exists, generate it from
  // story_outline + master_outline to give the writer proper direction.
  if (!context.arcPlan && nextChapter <= 20) {
    try {
      const arcNumber = 1;
      // Build synopsis-like context from story outline for arc planning
      let outlineSynopsis: string | undefined;
      if (context.storyOutline) {
        const o = context.storyOutline;
        const parts: string[] = [];
        if (o.premise) parts.push(`Premise: ${o.premise}`);
        if (o.mainConflict) parts.push(`Xung đột: ${o.mainConflict}`);
        if (o.protagonist?.name) parts.push(`MC: ${o.protagonist.name} — ${o.protagonist.startingState || ''}`);
        if (o.endingVision) parts.push(`Kết cục: ${o.endingVision}`);
        outlineSynopsis = parts.join('\n');
      }

      await generateArcPlan(
        project.id, arcNumber, genre, protagonistName,
        outlineSynopsis || context.masterOutline,
        context.storyBible,
        totalPlanned, geminiConfig,
      );

      // Reload arc plan from DB
      const { data: arcRow } = await db.from('arc_plans')
        .select('plan_text,chapter_briefs,threads_to_advance,threads_to_resolve,new_threads')
        .eq('project_id', project.id).eq('arc_number', arcNumber).maybeSingle();

      if (arcRow) {
        context.arcPlan = arcRow.plan_text;
        if (arcRow.chapter_briefs && Array.isArray(arcRow.chapter_briefs)) {
          const brief = (arcRow.chapter_briefs as Array<{ chapterNumber: number; brief: string }>)
            .find(b => b.chapterNumber === nextChapter);
          context.chapterBrief = brief?.brief;
        }
        context.arcPlanThreads = {
          threads_to_advance: arcRow.threads_to_advance || [],
          threads_to_resolve: arcRow.threads_to_resolve || [],
          new_threads: arcRow.new_threads || [],
        };
      }
    } catch {
      // Non-fatal: arc plan generation failure shouldn't block chapter writing
    }
  }

  // ── Step 3: Assemble context string ────────────────────────────────────
  const contextString = assembleContext(context, nextChapter);

  // ── Step 4: Write chapter via 3-agent pipeline ─────────────────────────
  const isFinalArc = nextChapter >= totalPlanned - 20;

  const result: WriteChapterResult = await writeChapter(
    nextChapter,
    contextString,
    genre,
    targetWordCount,
    context.previousTitles,
    geminiConfig,
    DEFAULT_CONFIG.maxRetries,
    {
      projectId: project.id,
      protagonistName,
      topicId: project.topic_id || undefined,
      isFinalArc,
      genreBoundary: context.genreBoundary,
      worldBible: context.storyBible,
      worldDescription: project.world_description,
      subGenres: context.subGenres,
    },
  );

  // ── Step 5: Split AI content into N reader chapters + save to DB ─────────
  // AI writes 1 logical chapter (~2800 từ). Split into 2 reader-friendly chapters
  // (~1400 từ each) at natural paragraph boundary. This keeps narrative coherence
  // for the AI write while delivering shorter mobile-friendly chapters to readers.
  // Per-project override: style_directives.disable_chapter_split = true → keep AI output as 1 reader chapter.
  const SPLIT_PARTS = disableChapterSplit ? 1 : 2;
  const splitResults = splitChapterContent(result.content, result.title, SPLIT_PARTS);
  const lastChapterNumber = nextChapter + splitResults.length - 1;

  const chapterRows = splitResults.map((part, idx) => ({
    novel_id: novel.id,
    chapter_number: nextChapter + idx,
    title: part.title,
    content: part.content,
    quality_score: result.qualityScore || null,
  }));

  const { error: upsertErr } = await db.from('chapters').upsert(
    chapterRows,
    { onConflict: 'novel_id,chapter_number' },
  );

  if (upsertErr) {
    throw new Error(`Chapter upsert failed: ${upsertErr.message}`);
  }

  // ── Step 6: 7 parallel post-write tasks (all non-fatal) ───────────────
  const arcNumber = Math.ceil(nextChapter / 20);

  // Extract all unique character names from the Architect outline
  const outlineChars = new Set<string>();
  if (result.outline?.scenes) {
    for (const scene of result.outline.scenes) {
      for (const char of scene.characters || []) {
        outlineChars.add(char);
      }
    }
  }
  // Always include protagonist, then add outline characters
  outlineChars.add(protagonistName);
  const characters = Array.from(outlineChars);

  // Task 1: Combined summary + character extraction (single AI call)
  // Returns combined result so we can save character states without a separate AI call.
  const combinedResult = await runSummaryTasks(
    project.id, novel.id, nextChapter, result.title, result.content,
    protagonistName, genre, totalPlanned,
    project.world_description || storyTitle, geminiConfig,
  ).catch(() => null);

  // Task 2: Detect contradictions + auto-revise + save character states
  if (combinedResult?.characters && combinedResult.characters.length > 0) {
    // 2a: Detect contradictions BEFORE saving (compare new vs previous states)
    const contradictions = await detectCharacterContradictions(
      project.id, nextChapter, combinedResult.characters,
    ).catch(e => {
      console.warn('[Orchestrator] Task 2a contradiction detection failed:', e instanceof Error ? e.message : String(e));
      return [];
    });

    if (contradictions.length > 0) {
      const criticals = contradictions.filter(c => c.severity === 'critical');
      const warnings = contradictions.filter(c => c.severity === 'warning');
      console.warn(
        `[Orchestrator] Character contradictions in Ch.${nextChapter}: ${criticals.length} critical, ${warnings.length} warnings`,
        contradictions.map(c => c.description),
      );

      // 2a+: Auto-revise if critical contradictions found
      if (criticals.length > 0) {
        try {
          const revision = await autoReviseChapter(
            nextChapter, result.content, contradictions, geminiConfig, project.id,
          );
          if (revision.revised) {
            // Update chapter in DB with revised content
            const { error: revErr } = await db.from('chapters')
              .update({ content: revision.content })
              .eq('novel_id', novel.id).eq('chapter_number', nextChapter);
            if (revErr) {
              console.warn(`[Orchestrator] Auto-revision DB update failed: ${revErr.message}, keeping original content`);
            } else {
              result.content = revision.content;
              console.warn(`[Orchestrator] Auto-revised Ch.${nextChapter}: fixed ${revision.fixedIssues.length} issues`);
            }
          }
        } catch (e) {
          console.warn('[Orchestrator] Auto-revision failed:', e instanceof Error ? e.message : String(e));
        }
      }
    }

    // 2b: Save character states
    await saveCharacterStatesFromCombined(
      project.id, nextChapter, combinedResult.characters,
    ).catch(e => console.warn('[Orchestrator] Task 2b character state save failed:', e instanceof Error ? e.message : String(e)));
  }

  await Promise.all([
    // Task 3: RAG chunking + embedding
    chunkAndStoreChapter(
      project.id, nextChapter, result.content, result.title,
      `Chương ${nextChapter}: ${result.title}`, characters,
    ).catch(e => console.warn('[Orchestrator] Task 3 RAG chunking failed:', e instanceof Error ? e.message : String(e))),

    // Task 4: Beat detection + recording
    detectAndRecordBeats(
      project.id, nextChapter, arcNumber, result.content,
    ).catch(e => console.warn('[Orchestrator] Task 4 beat detection failed:', e instanceof Error ? e.message : String(e))),

    // Task 5: Rule extraction
    extractRulesFromChapter(
      project.id, nextChapter, result.content,
    ).catch(e => console.warn('[Orchestrator] Task 5 rule extraction failed:', e instanceof Error ? e.message : String(e))),

    // Task 6: Consistency check — every 3 chapters to reduce AI calls
    // (dead character regex runs every chapter; business logic AI check runs every 3)
    ...(nextChapter % 3 === 0 ? [
      checkConsistency(
        project.id, nextChapter, result.content, characters,
      ).catch(e => console.warn('[Orchestrator] Task 6 consistency check failed:', e instanceof Error ? e.message : String(e))),
    ] : []),

    // ── Quality modules post-write (Tasks 7-12, all non-fatal) ──────────

    // Task 7: Update foreshadowing status
    updateForeshadowingStatus(
      project.id, nextChapter,
    ).catch((e) => console.warn(`[Orchestrator] Task 7 foreshadowing status failed:`, e instanceof Error ? e.message : String(e))),

    // Task 8: Update character arcs (every 3 chapters to save tokens — arcs evolve slowly)
    ...(nextChapter % 3 === 0 ? [
      updateCharacterArcs(
        project.id, nextChapter, characters, geminiConfig, genre, protagonistName,
      ).catch((e) => console.warn(`[Orchestrator] Task 8 character arcs failed:`, e instanceof Error ? e.message : String(e))),
    ] : []),

    // Task 9: Update voice fingerprint (every 10 chapters)
    updateVoiceFingerprint(
      project.id, novel.id, nextChapter, geminiConfig,
    ).catch((e) => console.warn(`[Orchestrator] Task 9 voice fingerprint failed:`, e instanceof Error ? e.message : String(e))),

    // Task 10: Update MC power state (every 3 chapters or on breakthrough) — SKIP for non-combat genres
    ...(['do-thi','ngon-tinh','quan-truong'].includes(genre) ? [] : [
      updateMCPowerState(
        project.id, nextChapter, result.content, protagonistName, genre, geminiConfig,
      ).catch((e) => console.warn(`[Orchestrator] Task 10 MC power failed:`, e instanceof Error ? e.message : String(e))),
    ]),

    // Task 11: Update location exploration (every 3 chapters to save tokens)
    ...(nextChapter % 3 === 0 ? [
      updateLocationExploration(
        project.id, nextChapter,
      ).catch((e) => console.warn(`[Orchestrator] Task 11 location exploration failed:`, e instanceof Error ? e.message : String(e))),
    ] : []),

    // Task 12: Pre-generate upcoming location bible (every 3 chapters to save tokens)
    ...(nextChapter % 3 === 0 ? [
      prepareUpcomingLocation(
        project.id, nextChapter, genre, context.synopsis, context.masterOutline, geminiConfig,
      ).catch((e) => console.warn(`[Orchestrator] Task 12 upcoming location failed:`, e instanceof Error ? e.message : String(e))),
    ] : []),

    // Task 13: Extract character knowledge (every 2 chapters to save tokens)
    ...(nextChapter % 2 === 0 ? [
      extractCharacterKnowledge(
        project.id, nextChapter, result.content, characters, geminiConfig,
      ).catch((e) => console.warn(`[Orchestrator] Task 13 character knowledge failed:`, e instanceof Error ? e.message : String(e))),
    ] : []),

    // Task 14: Extract relationships (every 3 chapters — new in 0150)
    ...(nextChapter % 3 === 0 ? [
      (async () => {
        const { extractRelationships } = await import('../memory/relationship-tracker');
        return extractRelationships(project.id, nextChapter, result.content, characters, geminiConfig);
      })().catch((e) => console.warn(`[Orchestrator] Task 14 relationships failed:`, e instanceof Error ? e.message : String(e))),
    ] : []),

    // Task 15: Extract economic ledger (every 3 chapters, only do-thi/quan-truong — new in 0150)
    ...(nextChapter % 3 === 0 && ['do-thi','quan-truong'].includes(genre) ? [
      (async () => {
        const { extractEconomicState } = await import('../memory/economic-ledger');
        return extractEconomicState(project.id, nextChapter, result.content, protagonistName, geminiConfig);
      })().catch((e) => console.warn(`[Orchestrator] Task 15 economic ledger failed:`, e instanceof Error ? e.message : String(e))),
    ] : []),
  ]);

  // ── Step 7: Update project current_chapter (use LAST chapter of split) ──
  const { error: stepSevenErr } = await db
    .from('ai_story_projects')
    .update({ current_chapter: lastChapterNumber, updated_at: new Date().toISOString() })
    .eq('id', project.id);

  if (stepSevenErr) {
    console.warn(`[Orchestrator] CRITICAL: Failed to update current_chapter to ${lastChapterNumber} for project ${project.id}: ${stepSevenErr.message}`);
  }

  return {
    chapterNumber: nextChapter,
    title: result.title,
    wordCount: result.wordCount,
    qualityScore: result.qualityScore,
    projectId: project.id,
    novelId: novel.id,
    duration: Date.now() - startTime,
    /** Number of reader-facing chapters created from this AI write (after split) */
    chaptersCreated: splitResults.length,
    /** Last chapter number written to DB (for daily quota/cron tracking) */
    lastChapterNumber,
  };
}

// ── Progressive Finale Wind-down ─────────────────────────────────────────────

function buildFinaleContext(chapterNumber: number, totalPlanned: number): string | null {
  const progressPct = chapterNumber / totalPlanned;
  const remaining = totalPlanned - chapterNumber;

  if (chapterNumber >= totalPlanned) {
    // Past target — MUST finish
    return [
      `🏁 GIAI ĐOẠN KẾT THÚC (đã vượt target ${totalPlanned} chương):`,
      `- PHẢI kết thúc bộ truyện trong arc hiện tại`,
      `- Giải quyết TẤT CẢ xung đột còn lại ngay lập tức`,
      `- Không mở thêm bất kỳ xung đột hoặc bí ẩn mới nào`,
    ].join('\n');
  }

  if (remaining <= 20) {
    return [
      `🏁 FINAL PUSH (còn ~${remaining} chương):`,
      `- Giải quyết NGAY các plot threads còn lại — KHÔNG trì hoãn`,
      `- Không mở thêm xung đột mới hoặc bí ẩn mới`,
      `- Đẩy protagonist lên cảnh giới cao hơn nhanh chóng`,
      `- Chuẩn bị climax lớn nhất và kết cục`,
    ].join('\n');
  }

  if (progressPct >= 0.90) {
    return [
      `⚡ GIAI ĐOẠN CUỐI (90%+ truyện, còn ~${remaining} chương):`,
      `- Tích cực giải quyết các tuyến truyện đang mở`,
      `- HẠN CHẾ mở tuyến mới (chỉ nếu phục vụ kết cục)`,
      `- Đẩy nhanh tiến triển sức mạnh MC`,
      `- Bắt đầu thiết lập final confrontation`,
    ].join('\n');
  }

  if (progressPct >= 0.80) {
    return [
      `📋 CHUẨN BỊ KẾT THÚC (80%+ truyện, còn ~${remaining} chương):`,
      `- Bắt đầu gieo hạt cho kết cục — các tuyến truyện nên hội tụ`,
      `- Ưu tiên giải quyết tuyến phụ trước, để dành xung đột chính cho cuối`,
      `- Vẫn có thể có twist nhưng phải phục vụ hướng đến kết cục`,
    ].join('\n');
  }

  return null;
}

// ── Smart Truncation ─────────────────────────────────────────────────────────

/**
 * Truncate text at the last newline boundary before maxChars.
 * Preserves complete lines/sections instead of cutting mid-sentence.
 * If no newline found before maxChars, falls back to hard cut.
 */
function smartTruncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const cutPoint = text.lastIndexOf('\n', maxChars);
  if (cutPoint > maxChars * 0.5) {
    return text.slice(0, cutPoint);
  }
  // Fallback: no good newline boundary, cut at maxChars
  return text.slice(0, maxChars);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeNovel(
  novels: ProjectRow['novels'],
): { id: string; title: string } | null {
  const novel = Array.isArray(novels) ? novels[0] : novels;
  if (!novel?.id || !novel?.title) return null;
  return novel;
}

// ── Chapter Splitter (post-write reader-friendly split) ───────────────────────

/**
 * Split AI-generated chapter content into N reader chapters at natural paragraph
 * boundaries. Each split chapter inherits a continuation-aware title.
 *
 * Algorithm:
 * 1. Compute target split points (e.g., 50% for 2-part split)
 * 2. Find nearest paragraph boundary (\n\n) within ±15% search window
 * 3. Avoid splitting mid-dialogue (line starts with em dash —)
 * 4. Title scheme: original title for part 1, "(Tiếp)" / "(Phần N)" suffix for parts 2+
 *
 * Falls back to single-part return if content too short to meaningfully split.
 */
export function splitChapterContent(
  content: string,
  title: string,
  numParts: number = 2,
): Array<{ title: string; content: string }> {
  const trimmed = content.trim();
  // Don't split if content is too short for clean parts
  if (numParts <= 1 || trimmed.length < 4000) {
    return [{ title, content: trimmed }];
  }

  const totalLen = trimmed.length;
  const targetChunkLen = totalLen / numParts;
  const splitPoints: number[] = [0];

  for (let i = 1; i < numParts; i++) {
    const targetPos = Math.round(targetChunkLen * i);
    const searchStart = Math.max(splitPoints[splitPoints.length - 1] + 500, Math.round(targetPos - targetChunkLen * 0.15));
    const searchEnd = Math.min(totalLen - 500, Math.round(targetPos + targetChunkLen * 0.15));

    // Find paragraph boundary (\n\n) closest to target within search window
    let bestBoundary = -1;
    let bestDistance = Infinity;
    let pos = trimmed.indexOf('\n\n', searchStart);
    while (pos !== -1 && pos < searchEnd) {
      // Skip boundaries immediately before dialogue (em dash) — keep dialogue blocks together
      const nextNonWs = trimmed.slice(pos + 2).match(/\S/);
      const isMidDialogue = nextNonWs && nextNonWs[0] === '—';
      if (!isMidDialogue) {
        const distance = Math.abs(pos - targetPos);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestBoundary = pos + 2; // include the \n\n
        }
      }
      pos = trimmed.indexOf('\n\n', pos + 1);
    }

    // Fallback: if no good paragraph break found, use single newline closest to target
    if (bestBoundary === -1) {
      let nlPos = trimmed.indexOf('\n', searchStart);
      while (nlPos !== -1 && nlPos < searchEnd) {
        const distance = Math.abs(nlPos - targetPos);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestBoundary = nlPos + 1;
        }
        nlPos = trimmed.indexOf('\n', nlPos + 1);
      }
    }

    // Last resort: hard split at target
    if (bestBoundary === -1) bestBoundary = targetPos;

    splitPoints.push(bestBoundary);
  }
  splitPoints.push(totalLen);

  const result: Array<{ title: string; content: string }> = [];
  for (let i = 0; i < numParts; i++) {
    const partContent = trimmed.slice(splitPoints[i], splitPoints[i + 1]).trim();
    if (partContent.length === 0) continue;

    let partTitle: string;
    if (i === 0) {
      partTitle = title;
    } else if (numParts === 2) {
      partTitle = `${title} (Tiếp)`;
    } else {
      partTitle = `${title} (Phần ${i + 1})`;
    }
    result.push({ title: partTitle, content: partContent });
  }

  // Sanity check: if split somehow produced 1 part, return original
  if (result.length === 0) {
    return [{ title, content: trimmed }];
  }
  return result;
}
