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
import { loadContext, assembleContext, generateSummaryAndCharacters } from './context-assembler';
import { writeChapter } from './chapter-writer';
import { retrieveRAGContext, chunkAndStoreChapter, retrieveEntityContext, retrieveThemeContext } from '../memory/rag-store';
import { saveCharacterStatesFromCombined, detectCharacterContradictions, type CharacterContradiction } from '../memory/character-tracker';
import { extractCharacterKnowledge, getCharacterKnowledgeContext } from '../memory/character-knowledge';
import { autoReviseChapter } from './auto-reviser';
import { runContinuityGuardian } from './continuity-guardian';
import {
  buildPlotThreadContext,
  buildBeatContext,
  buildRuleContext,
  detectAndRecordBeats,
  extractRulesFromChapter,
  checkConsistency,
  checkConsistencyFast,
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

// ── P2.5: Failed task persistence helper ────────────────────────────────────
//
// Post-write tasks (synopsis / character states / arc plan / etc.) are non-fatal:
// failure of one shouldn't block chapter from saving. But silent .catch(() => null)
// swallow means failures are invisible — engine reads stale state on next chapter.
// Persist failures to failed_memory_tasks so cron retry routine can pick up + admin
// UI can surface.
async function recordTaskFailure(
  db: ReturnType<typeof getSupabase>,
  projectId: string,
  novelId: string | null,
  chapterNumber: number,
  taskName: string,
  error: unknown,
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.warn(`[Orchestrator] Task ${taskName} failed (ch.${chapterNumber}): ${errorMessage}`);
  try {
    await db.from('failed_memory_tasks').insert({
      project_id: projectId,
      novel_id: novelId,
      chapter_number: chapterNumber,
      task_name: taskName,
      error_message: errorMessage.slice(0, 1000),
      attempts: 1,
      status: 'pending',
      // Retry in ~5 minutes (next cron tick) with exponential backoff for retries.
      next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
  } catch (insertErr) {
    // Last-resort log if even the insert fails — don't recurse / re-throw.
    console.error(`[Orchestrator] Could not persist task failure to failed_memory_tasks:`, insertErr);
  }
}

// ── P4.2: Per-chapter quality canary ────────────────────────────────────────
//
// Deterministic regex check on saved chapter for forbidden patterns. NOT blocking;
// just surfaces drift to admin UI via failed_memory_tasks. Catches:
//   - <MC> / <LOVE> / <CITY> placeholder literal leaks (voice anchor escape)
//   - VND currency leak (digit + xu / digit + nguyên) on VN-set chapters
//   - MC name absent from chapter (suggests 100% drift to a different name)
function runChapterCanary(args: {
  chapterContent: string;
  protagonistName: string;
  genre: GenreType;
  worldDescription?: string;
}): string[] {
  const issues: string[] = [];
  const c = args.chapterContent;

  // 1. Placeholder leak — should never happen if voice anchor instructions followed
  const placeholderMatches = c.match(/<(MC|LOVE|CITY|COMPANY|NUMBER|TITLE|SKILL)>/g);
  if (placeholderMatches && placeholderMatches.length > 0) {
    issues.push(`placeholder leak: ${[...new Set(placeholderMatches)].join(', ')}`);
  }

  // 2. MC name absence — if chapter doesn't contain MC name even ONCE, likely drift
  if (args.protagonistName && args.protagonistName.length >= 2) {
    const tokens = args.protagonistName.split(/\s+/).filter(t => t.length >= 2);
    let found = c.includes(args.protagonistName);
    if (!found) {
      for (const t of tokens) {
        if (c.includes(t)) { found = true; break; }
      }
    }
    if (!found) {
      issues.push(`MC name "${args.protagonistName}" absent from entire chapter (full + tokens)`);
    }
  }

  // 3. VND currency leak (only for VN-set genres + worlds — uses templates predicate)
  // Imported lazily to avoid circular dep risk
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requiresVndCurrency } = require('../templates') as { requiresVndCurrency: (g: GenreType, w?: string | null) => boolean };
    if (requiresVndCurrency(args.genre, args.worldDescription)) {
      const xuLeak = c.match(/\d[\d.,]*\s*xu\b|(?:triệu|nghìn|trăm|tỷ|ngàn)\s+xu\b/);
      if (xuLeak) issues.push(`VND currency leak: "${xuLeak[0].slice(0, 40)}"`);
      const nguyenLeak = c.match(/\d[\d.,]*\s*nguyên(?!\s*(?:tử|thủy|tắc|liệu|chất|bản|nhân))/);
      if (nguyenLeak) issues.push(`VND currency leak: "${nguyenLeak[0].slice(0, 40)}"`);
    }
  } catch { /* templates not loaded — skip */ }

  return issues;
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

  // Phase 22 Stage 3: install tier-based model routing (Pro for critical reasoning,
  // Flash for volume/low-stakes). Idempotent — safe to call every chapter.
  // Disable via DISABLE_PRO_TIER=1 env var to A/B test against all-Flash baseline.
  const { installModelTierRouting } = await import('../utils/model-tier');
  installModelTierRouting();

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
        const { error: syncErr } = await db.from('ai_story_projects').update({ main_character: outlineMC }).eq('id', options.projectId);
        if (syncErr) throw new Error(`MC sync (project.main_character ← outline) failed: ${syncErr.message}`);
      } else {
        // no chapters yet → seed name wins, sync outline
        const newOutline = { ...(storyOutline || {}), protagonist: { ...(storyOutline?.protagonist || {}), name: projectMC } };
        const { error: syncErr } = await db.from('ai_story_projects').update({ story_outline: newOutline as unknown as Record<string, unknown> }).eq('id', options.projectId);
        if (syncErr) throw new Error(`MC sync (story_outline.protagonist.name ← project) failed: ${syncErr.message}`);
      }
      // P2.1: HARD-VALIDATE post-sync. Re-fetch and confirm both sides match `winner`.
      // Without this, silent DB write failures (rare but possible under load / RLS edge
      // cases) leave mismatch in DB → next cron tick re-syncs, infinite loop possible.
      const { data: verify } = await db
        .from('ai_story_projects')
        .select('main_character,story_outline')
        .eq('id', options.projectId)
        .single();
      const verifyProj = (verify?.main_character || '').trim();
      const verifyOutline = (verify?.story_outline as { protagonist?: { name?: string } } | null)?.protagonist?.name?.trim() || '';
      if (verifyProj !== winner || verifyOutline !== winner) {
        throw new Error(`MC sync verification FAILED: expected "${winner}" on both sides; got project="${verifyProj}", outline="${verifyOutline}". Aborting chapter write to prevent name flip.`);
      }
      resolvedMainCharacter = winner;
      validationFixes.push(`MC sync: ${loser}="${currentChapter > 0 ? projectMC : outlineMC}" → "${winner}" (ch.${currentChapter} written, verified)`);
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

    // Phase 23 S1: SELF-HEALING — auto-regenerate missing outlines.
    // If master_outline OR story_outline is null AND we're at the start of the novel
    // (current_chapter < 5), regen them in place before the chapter writes. This unblocks
    // novels that were reset (e.g. via rewrite-recent-10) without requiring a separate
    // outline-gen script pass. Skipped for chapters >5 because by then the cron already
    // reads outline several times; missing means a deliberate reset that's our job to fix.
    const needsMasterRegen = !extra?.master_outline && currentChapter < 5;
    const needsStoryRegen = !extra?.story_outline && currentChapter < 5;
    if (needsMasterRegen || needsStoryRegen) {
      try {
        const { data: full } = await db
          .from('ai_story_projects')
          .select('genre,main_character,world_description,total_planned_chapters,novels!ai_story_projects_novel_id_fkey(title)')
          .eq('id', options.projectId)
          .single();
        const novelTitle = (full?.novels as unknown as { title: string } | null)?.title || 'Unknown';
        const totalCh = full?.total_planned_chapters || 1000;
        const worldDesc = full?.world_description || '';
        const mc = full?.main_character || resolvedMainCharacter;

        if (needsMasterRegen) {
          const { generateMasterOutline } = await import('./master-outline');
          // synopsis input = world description (used by master outline as world grounding)
          await generateMasterOutline(
            options.projectId,
            novelTitle,
            (full?.genre || 'do-thi') as GenreType,
            worldDesc.slice(0, 6000),
            totalCh,
            { ...DEFAULT_CONFIG, model: 'deepseek-v4-pro', systemPrompt: '' },
          );
          validationFixes.push(`✓ master_outline auto-regenerated (was null, current_chapter=${currentChapter})`);
        }

        if (needsStoryRegen) {
          const { generateStoryOutline } = await import('./story-outline');
          const outline = await generateStoryOutline(
            options.projectId,
            novelTitle,
            (full?.genre || 'do-thi') as GenreType,
            mc,
            worldDesc,
            totalCh,
            { ...DEFAULT_CONFIG, model: 'deepseek-v4-flash' },
          );
          if (outline) {
            await db.from('ai_story_projects').update({ story_outline: outline as unknown as Record<string, unknown> }).eq('id', options.projectId);
            validationFixes.push(`✓ story_outline auto-regenerated (was null)`);
          }
        }

        // After regen, throw a soft error so cron retries this chapter on next tick (with outlines now present).
        // This avoids using stale `extra` reference in subsequent code paths.
        if (needsMasterRegen || needsStoryRegen) {
          throw new Error(`OUTLINE_REGEN_DONE: novels self-heal complete; cron will pick up next tick`);
        }
      } catch (regenErr) {
        if (regenErr instanceof Error && regenErr.message.startsWith('OUTLINE_REGEN_DONE:')) {
          // Re-throw so orchestrator re-triggers on next cron tick with regen'd outlines
          throw regenErr;
        }
        validationFixes.push(`⚠ outline auto-regen failed: ${regenErr instanceof Error ? regenErr.message : String(regenErr)}`);
      }
    }

    // Fix D/E: total_planned_chapters ↔ master_outline coverage alignment.
    // 2026-04-30: standardized novel target ~1000 chương. Validation now only auto-EXPANDS
    // total_planned (when outline plans MORE than declared) — never auto-CONTRACTS. If user
    // sets total=1000 but old master_outline plans 1500, leave total alone and let arc-plan
    // generation cap arcs at total. This way: setting total=1000 + wiping master_outline
    // (or just setting total) gracefully truncates the story without auto-revert to 1500.
    const arcs = masterOutline?.majorArcs ?? [];
    if (arcs.length > 0) {
      const lastArcEnd = Math.max(...arcs.map((a) => a?.endChapter || 0));
      const planned = project.total_planned_chapters || 0;
      // Only auto-expand total_planned if master_outline goes >10% BEYOND it (user wants
      // the longer plan). Don't auto-contract — that overrides explicit total_planned.
      if (lastArcEnd > 0 && planned > 0 && lastArcEnd > planned * 1.1) {
        const newTotal = Math.round(lastArcEnd / 50) * 50 || lastArcEnd;
        await db.from('ai_story_projects').update({ total_planned_chapters: newTotal }).eq('id', options.projectId);
        validationFixes.push(`total_planned: ${planned} → ${newTotal} (master outline covers ch.${lastArcEnd})`);
      } else if (lastArcEnd > planned * 1.05) {
        // Mild drift (5-10%) — log only, don't change. Arc plan generator will cap at total.
        validationFixes.push(`note: master outline ends at ch.${lastArcEnd} but total_planned=${planned}; story will gracefully wind down at total.`);
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

    // 2026-04-29 continuity overhaul: pass richer search context to buildRuleContext.
    // Was 300 chars of arcPlan only — too thin for keyword scoring against rule texts.
    // Now combines cliffhanger + chapterBrief + arcPlan for better rule recall.
    const ruleSearchCtx = [
      context.previousCliffhanger || '',
      context.chapterBrief || '',
      (context.arcPlan || '').slice(0, 800),
    ].filter(Boolean).join('\n').slice(0, 2000);
    const [plotCtx, beatCtx, ruleCtx] = await Promise.all([
      buildPlotThreadContext(project.id, nextChapter, characters, arcNumber),
      buildBeatContext(project.id, nextChapter, arcNumber),
      buildRuleContext(project.id, nextChapter, ruleSearchCtx, characters),
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
    const { getCharacterBibleContext } = await import('../memory/character-bible');
    const { getVolumeSummaryContext } = await import('../memory/volume-summarizer');
    const { getGeographyContext } = await import('../memory/geography-tracker');
    const subGenres = context.subGenres || [];

    const [foreshadowCtx, charArcCtx, pacingCtx, voiceCtx, powerCtx, worldCtx, knowledgeCtx, relationshipCtx, economicCtx, bibleCtx, volSummaryCtx, geoCtx] = await Promise.all([
      getForeshadowingContext(project.id, nextChapter).catch(() => null),
      getCharacterArcContext(project.id, nextChapter, context.knownCharacterNames).catch(() => null),
      getChapterPacingContext(project.id, nextChapter).catch(() => null),
      getVoiceContext(project.id).catch(() => null),
      getPowerContext(project.id, genre).catch(() => null),
      getWorldContext(project.id, nextChapter).catch(() => null),
      getCharacterKnowledgeContext(project.id, nextChapter, context.knownCharacterNames).catch(() => null),
      getRelationshipContext(project.id, context.knownCharacterNames).catch(() => null),
      getEconomicContext(project.id, genre, subGenres).catch(() => null),
      getCharacterBibleContext(project.id, nextChapter).catch(() => null),
      getVolumeSummaryContext(project.id, nextChapter).catch(() => null),
      getGeographyContext(project.id, nextChapter, protagonistName).catch(() => null),
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
    if (bibleCtx) context.characterBibleContext = smartTruncate(bibleCtx, 8000);
    if (volSummaryCtx) context.volumeSummaryContext = smartTruncate(volSummaryCtx, 6000);
    if (geoCtx) context.geographyContext = smartTruncate(geoCtx, 800);
  } catch {
    // Non-fatal
  }

  // ── Step 2d++: Pre-Write Q&A Pass (Phase 22 Stage 2 Q6) ─────────────────
  // Proactively answer "what does the engine know about each entity in the upcoming chapter?"
  // Deterministic DB queries — no AI cost. Output injected as [STATE CHECK] block.
  try {
    const { runPreWriteQA } = await import('./pre-write-qa');
    const qaBlock = await runPreWriteQA(project.id, nextChapter, {
      chapterBrief: context.chapterBrief,
      arcPlanText: context.arcPlan,
      knownCharacterNames: context.knownCharacterNames,
      protagonistName,
    });
    if (qaBlock) {
      // Append to ragContext so it lands high in the assembled context (before quality modules)
      context.ragContext = (context.ragContext || '') + '\n\n' + qaBlock;
    }
  } catch (e) {
    console.warn('[Orchestrator] Pre-Write QA failed:', e instanceof Error ? e.message : String(e));
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

  // ── Step 5b: Bump current_chapter IMMEDIATELY after chapter upsert ──
  // Phase 23 race-fix: previously current_chapter was updated AFTER 17 post-write tasks (Step 7).
  // If Vercel timed out mid-post-write, chapters were saved but current_chapter stayed stale →
  // next cron tick re-wrote ch.N+1 onto the same row, or saw 0 chapters and thought nothing
  // had been written. Post-write tasks are all non-fatal so they don't need to block this.
  const { error: bumpErr } = await db
    .from('ai_story_projects')
    .update({ current_chapter: lastChapterNumber, updated_at: new Date().toISOString() })
    .eq('id', project.id);
  if (bumpErr) {
    console.warn(`[Orchestrator] CRITICAL: Failed to bump current_chapter to ${lastChapterNumber} for project ${project.id}: ${bumpErr.message}`);
  }

  // ── Step 5c: Quality canary — deterministic post-save check ───────────
  // P4.2: scan saved chapter content for forbidden patterns and persist to
  // failed_memory_tasks if any caught. NOT blocking — chapter already saved —
  // but surfaces drift to admin UI for manual investigation.
  try {
    const canaryIssues = runChapterCanary({
      chapterContent: result.content,
      protagonistName,
      genre,
      worldDescription: project.world_description || undefined,
    });
    if (canaryIssues.length > 0) {
      await recordTaskFailure(
        db, project.id, novel.id, nextChapter, 'quality_canary',
        new Error(`Canary triggered: ${canaryIssues.join('; ')}`)
      );
    }
  } catch (e) {
    // Canary itself failed — log but don't block.
    console.warn(`[Orchestrator] canary check failed:`, e instanceof Error ? e.message : String(e));
  }

  // ── Step 6: Post-write tasks (Phase 24 — per-reader-chapter loop) ─────
  // Every reader chapter gets its own summary, character_states, RAG chunks,
  // beats, rules, foreshadowing/voice/MC-power update. Pre-Phase-24 the entire
  // post-write block keyed off nextChapter + result.content (= logical chapter,
  // pre-split), so when SPLIT_PARTS=2 the second reader chapter (nextChapter+1)
  // had no summary/RAG/state row — the next AI write's bridge read from the
  // first part, losing the actual cliffhanger readers saw.
  //
  // Layout:
  //   1. Compute aiWriteCount + characters list
  //   2. Detect contradictions on the FULL logical chapter (single AI call —
  //      character extraction) so we can run guardian + auto-revise + re-split
  //      BEFORE per-part summaries reflect stale (pre-revise) content.
  //   3. Per-part: summary + character_states + RAG + beats + rules +
  //      foreshadowing + voice + MC power + knowledge + geography
  //   4. Once-per-AI-write cadence: char arcs (every 3), location (every 3),
  //      upcoming location (every 3), relationships (every 3),
  //      economic (every 3, do-thi/quan-truong), char bible (every 20),
  //      volume summary (every 25), quality metrics (every write).
  const arcNumber = Math.ceil(nextChapter / 20);
  // 2026-04-29 audit fix: aiWriteCount tracks the number of AI writes (vs reader chapters).
  // With chapter splits enabled, 1 AI write = 2 reader chapters, so nextChapter is always odd.
  // Tasks gated on `nextChapter % 2 === 0` would NEVER fire; use aiWriteCount for cadence
  // gates that are about *AI write frequency* rather than reader-chapter milestones.
  const aiWriteCount = Math.ceil(lastChapterNumber / SPLIT_PARTS);

  // Hoisted for quality_metrics aggregation at end of post-write block.
  let allContradictions: CharacterContradiction[] = [];
  let allGuardianIssues: import('./continuity-guardian').GuardianIssue[] = [];

  // Extract all unique character names from the Architect outline.
  const outlineChars = new Set<string>();
  if (result.outline?.scenes) {
    for (const scene of result.outline.scenes) {
      for (const char of scene.characters || []) {
        outlineChars.add(char);
      }
    }
  }
  outlineChars.add(protagonistName);
  const characters = Array.from(outlineChars);

  // ── Step 6a: Logical-level contradiction detection + auto-revise ──────
  // Run ONCE on the full pre-split logical chapter so a revise can operate on
  // coherent content (cross-split issues like "char dies in part 1 then walks
  // alive in part 2" need to see both halves). After revise, we re-split and
  // update DB rows for every part before per-part work begins.
  const logicalCombined = await generateSummaryAndCharacters(
    lastChapterNumber, result.title, result.content, protagonistName, geminiConfig,
    { allowEmptyCliffhanger: isFinalArc, projectId: project.id },
  ).catch((e) => {
    console.warn(`[Orchestrator] Logical character extraction failed for Ch.${lastChapterNumber}:`, e instanceof Error ? e.message : String(e));
    return null;
  });

  if (logicalCombined?.characters && logicalCombined.characters.length > 0) {
    const contradictions: CharacterContradiction[] = await detectCharacterContradictions(
      project.id, lastChapterNumber, logicalCombined.characters,
    ).catch(e => {
      console.warn('[Orchestrator] Logical contradiction detection failed:', e instanceof Error ? e.message : String(e));
      return [] as CharacterContradiction[];
    });

    // Fast consistency regex (dead-character resurrection) on full content.
    const fastIssues = await checkConsistencyFast(project.id, lastChapterNumber, result.content).catch(() => []);
    for (const issue of fastIssues) {
      if (issue.severity === 'critical' && issue.type === 'dead_character') {
        const charNameMatch = issue.description.match(/^(\S+(?:\s\S+)*)\s+đã chết/);
        const charName = charNameMatch?.[1] || 'unknown';
        contradictions.push({
          characterName: charName,
          type: 'resurrection',
          severity: 'critical',
          description: issue.description,
          previousChapter: 0,
          currentChapter: lastChapterNumber,
        });
      }
    }

    // Continuity Guardian — 4th-agent biên-tập-viên pass.
    // Phase 24 fix: was `nextChapter % 2 !== 0`; with SPLIT_PARTS=2 nextChapter is
    // always odd → guardian NEVER ran in split mode. Switched to aiWriteCount so
    // the every-2-AI-writes cadence (≈ every 4 reader chapters) actually fires.
    const skipGuardian = aiWriteCount % 2 !== 0;
    const guardian = skipGuardian
      ? { issues: [], contradictions: [] }
      : await runContinuityGuardian(
          project.id, lastChapterNumber, result.title, result.content, characters, geminiConfig,
        ).catch((e) => {
          console.warn('[Orchestrator] Continuity guardian failed:', e instanceof Error ? e.message : String(e));
          return { issues: [], contradictions: [] };
        });
    if (guardian.contradictions.length > 0) {
      for (const c of guardian.contradictions) contradictions.push(c);
    }

    if (contradictions.length > 0) {
      const criticals = contradictions.filter(c => c.severity === 'critical');
      const warnings = contradictions.filter(c => c.severity === 'warning');
      console.warn(
        `[Orchestrator] Contradictions in Ch.${nextChapter}-${lastChapterNumber}: ${criticals.length} critical, ${warnings.length} warnings`,
        contradictions.map(c => c.description),
      );

      if (criticals.length > 0) {
        try {
          const revision = await autoReviseChapter(
            lastChapterNumber, result.content, contradictions, geminiConfig, project.id,
          );
          if (revision.revised) {
            // Re-split the revised content and update DB rows for every part.
            const newSplits = splitChapterContent(revision.content, result.title, SPLIT_PARTS);
            // Replace splitResults in place so the per-part block below uses revised content.
            splitResults.length = 0;
            splitResults.push(...newSplits);
            result.content = revision.content;
            result.wordCount = result.content.trim().split(/\s+/).filter(Boolean).length;

            // Update DB rows for every reader chapter (not just the first).
            for (let i = 0; i < newSplits.length; i++) {
              const partCh = nextChapter + i;
              const { error: revErr } = await db.from('chapters')
                .update({ content: newSplits[i].content })
                .eq('novel_id', novel.id).eq('chapter_number', partCh);
              if (revErr) {
                console.warn(`[Orchestrator] Auto-revision DB update failed for Ch.${partCh}: ${revErr.message}`);
              }
            }
            console.warn(`[Orchestrator] Auto-revised Ch.${nextChapter}-${lastChapterNumber}: fixed ${revision.fixedIssues.length} issues, re-split + updated ${newSplits.length} reader chapter rows`);

            // Override stale character extraction so saved character_states preserve
            // dead-character truth and drop spurious power downgrades.
            const namesToForceDead = new Set(
              criticals.filter(c => c.type === 'resurrection').map(c => c.characterName)
            );
            const namesToDropPowerDowngrade = new Set(
              criticals.filter(c => c.type === 'power_regression').map(c => c.characterName)
            );
            logicalCombined.characters = logicalCombined.characters
              .filter(c => !namesToDropPowerDowngrade.has(c.character_name))
              .map(c => namesToForceDead.has(c.character_name)
                ? { ...c, status: 'dead' as const }
                : c
              );
          }
        } catch (e) {
          console.warn('[Orchestrator] Auto-revision failed:', e instanceof Error ? e.message : String(e));
        }
      }
    }

    allContradictions = contradictions;
    allGuardianIssues = guardian.issues;
  }

  // ── Step 6b: Per-reader-chapter post-write tasks ──────────────────────
  // Each part gets its own chapter_summaries row (via runSummaryTasks),
  // character_states snapshot, RAG chunks, beats, rules, and per-chapter
  // memory updates. runSummaryTasks ALSO triggers cadence-gated synopsis /
  // arc plan / story bible refreshes at the correct chapter-modulo
  // boundaries on whichever part hits them.
  for (let idx = 0; idx < splitResults.length; idx++) {
    const part = splitResults[idx];
    const partCh = nextChapter + idx;
    const partArc = Math.ceil(partCh / 20);
    const isLastPart = idx === splitResults.length - 1;

    // Task 1: Combined summary + chapter_summaries + cadence-gated module triggers.
    const partCombined = await runSummaryTasks(
      project.id, novel.id, partCh, part.title, part.content,
      protagonistName, genre, totalPlanned,
      project.world_description || storyTitle, geminiConfig,
    ).catch((e) => {
      console.warn(`[Orchestrator] runSummaryTasks failed for Ch.${partCh}:`, e instanceof Error ? e.message : String(e));
      return null;
    });

    // Task 2: Save character_states snapshot for THIS reader chapter.
    // For the last part we prefer logicalCombined (it incorporates auto-revise
    // overrides like force-dead and dropped power downgrades). For middle parts
    // we use their own runSummaryTasks output so each reader chapter has its
    // own snapshot of character locations/state at that boundary.
    const charsForThisPart = isLastPart && logicalCombined?.characters?.length
      ? logicalCombined.characters
      : partCombined?.characters || [];
    if (charsForThisPart.length > 0) {
      await saveCharacterStatesFromCombined(
        project.id, partCh, charsForThisPart,
      ).catch(async (e) => {
        console.warn(`[Orchestrator] Character state save failed for Ch.${partCh}:`, e instanceof Error ? e.message : String(e));
        const { recordFailedTask } = await import('../utils/retry-queue');
        await recordFailedTask({
          projectId: project.id,
          novelId: novel.id,
          chapterNumber: partCh,
          taskName: 'character_states_save',
          payload: { characters: charsForThisPart },
          error: e,
        });
      });
    }

    // Tasks 3-15 in parallel for THIS reader chapter.
    await Promise.all([
      // Task 3: RAG chunks
      chunkAndStoreChapter(
        project.id, partCh, part.content, part.title,
        `Chương ${partCh}: ${part.title}`, characters,
      ).catch(async (e) => {
        console.warn(`[Orchestrator] RAG chunking failed for Ch.${partCh}:`, e instanceof Error ? e.message : String(e));
        const { recordFailedTask } = await import('../utils/retry-queue');
        await recordFailedTask({
          projectId: project.id,
          novelId: novel.id,
          chapterNumber: partCh,
          taskName: 'rag_chunking',
          payload: {
            content: part.content,
            title: part.title,
            summary: `Chương ${partCh}: ${part.title}`,
            characters,
          },
          error: e,
        });
      }),

      // Task 4: Beat detection
      detectAndRecordBeats(
        project.id, partCh, partArc, part.content,
      ).catch(e => recordTaskFailure(db, project.id, novel.id, partCh, 'task_4_beat_detection', e)),

      // Task 5: Rule extraction
      extractRulesFromChapter(
        project.id, partCh, part.content,
      ).catch(e => recordTaskFailure(db, project.id, novel.id, partCh, 'task_5_rule_extraction', e)),

      // Task 7: Foreshadowing status update (advance/payoff/abandon hints)
      updateForeshadowingStatus(
        project.id, partCh,
      ).catch(e => recordTaskFailure(db, project.id, novel.id, partCh, 'task_7_foreshadowing_status', e)),

      // Task 9: Voice fingerprint update (every 10 chapters internally)
      updateVoiceFingerprint(
        project.id, novel.id, partCh, geminiConfig,
      ).catch(e => recordTaskFailure(db, project.id, novel.id, partCh, 'task_9_voice_fingerprint', e)),

      // Task 10: MC power state update (skip for non-combat genres)
      ...(['do-thi','ngon-tinh','quan-truong'].includes(genre) ? [] : [
        updateMCPowerState(
          project.id, partCh, part.content, protagonistName, genre, geminiConfig,
        ).catch(e => recordTaskFailure(db, project.id, novel.id, partCh, 'task_10_mc_power', e)),
      ]),

      // Task 13: Character knowledge — runs every part (was every 2 AI writes;
      // per-reader semantics is "what does this character now know after this chapter").
      extractCharacterKnowledge(
        project.id, partCh, part.content, characters, geminiConfig,
      ).catch(e => recordTaskFailure(db, project.id, novel.id, partCh, 'task_13_character_knowledge', e)),

      // Task 15b: Geography timeline (uses this part's character locations).
      ...(charsForThisPart.length > 0 ? [
        (async () => {
          const { recordLocationFromCharacters } = await import('../memory/geography-tracker');
          return recordLocationFromCharacters(
            project.id, partCh, part.content,
            charsForThisPart.map(c => ({ character_name: c.character_name, location: c.location })),
          );
        })().catch((e) => console.warn(`[Orchestrator] Geography timeline failed for Ch.${partCh}:`, e instanceof Error ? e.message : String(e))),
      ] : []),
    ]);
  }

  // ── Step 6c: Once-per-AI-write aggregate tasks (cadence-gated) ────────
  // These run on lastChapterNumber + result.content because they aggregate or
  // fire at chapter-count milestones, not per reader chapter.
  await Promise.all([
    // Task 6: Consistency check (every 3 AI writes — business logic AI check)
    ...(aiWriteCount % 3 === 0 ? [
      checkConsistency(
        project.id, lastChapterNumber, result.content, characters,
      ).catch(e => recordTaskFailure(db, project.id, novel.id, lastChapterNumber, 'task_6_consistency_check', e)),
    ] : []),

    // Task 8: Character arcs (every 3 AI writes — arcs evolve slowly)
    ...(aiWriteCount % 3 === 0 ? [
      updateCharacterArcs(
        project.id, lastChapterNumber, characters, geminiConfig, genre, protagonistName,
      ).catch(e => recordTaskFailure(db, project.id, novel.id, lastChapterNumber, 'task_8_character_arcs', e)),
    ] : []),

    // Task 11: Location exploration (every 3 AI writes)
    ...(aiWriteCount % 3 === 0 ? [
      updateLocationExploration(
        project.id, lastChapterNumber,
      ).catch(e => recordTaskFailure(db, project.id, novel.id, lastChapterNumber, 'task_11_location_exploration', e)),
    ] : []),

    // Task 12: Upcoming location bible pre-gen (every 3 AI writes)
    ...(aiWriteCount % 3 === 0 ? [
      prepareUpcomingLocation(
        project.id, lastChapterNumber, genre, context.synopsis, context.masterOutline, geminiConfig,
      ).catch(e => recordTaskFailure(db, project.id, novel.id, lastChapterNumber, 'task_12_upcoming_location', e)),
    ] : []),

    // Task 14: Relationships (every 3 AI writes)
    ...(aiWriteCount % 3 === 0 ? [
      (async () => {
        const { extractRelationships } = await import('../memory/relationship-tracker');
        return extractRelationships(project.id, lastChapterNumber, result.content, characters, geminiConfig);
      })().catch(e => recordTaskFailure(db, project.id, novel.id, lastChapterNumber, 'task_14_relationships', e)),
    ] : []),

    // Task 15: Economic ledger (every 3 AI writes, only do-thi/quan-truong)
    ...(aiWriteCount % 3 === 0 && ['do-thi','quan-truong'].includes(genre) ? [
      (async () => {
        const { extractEconomicState } = await import('../memory/economic-ledger');
        return extractEconomicState(project.id, lastChapterNumber, result.content, protagonistName, geminiConfig);
      })().catch(e => recordTaskFailure(db, project.id, novel.id, lastChapterNumber, 'task_15_economic_ledger', e)),
    ] : []),

    // Task 16: Character bible refresh (every 20 reader chapters)
    ...(lastChapterNumber % 20 === 0 && lastChapterNumber >= 20 ? [
      (async () => {
        const { refreshCharacterBibles } = await import('../memory/character-bible');
        return refreshCharacterBibles(project.id, lastChapterNumber, geminiConfig);
      })().catch(e => recordTaskFailure(db, project.id, novel.id, lastChapterNumber, 'task_16_character_bible_refresh', e)),
    ] : []),

    // Task 16b: Quality metrics + post-write health check (every AI write)
    (async () => {
      const { recordQualityMetrics } = await import('../memory/quality-metrics');
      const { postWriteHealthCheck } = await import('../utils/post-write-health-check');
      const health = await postWriteHealthCheck(project.id, lastChapterNumber).catch(() => null);
      const critic = result.criticReport;
      return recordQualityMetrics({
        projectId: project.id,
        novelId: novel.id,
        chapterNumber: lastChapterNumber,
        overallScore: critic?.overallScore ?? null,
        dopamineScore: critic?.dopamineScore ?? null,
        pacingScore: critic?.pacingScore ?? null,
        endingHookScore: critic?.endingHookScore ?? null,
        wordCount: result.content ? result.content.split(/\s+/).filter(Boolean).length : null,
        wordRatio: targetWordCount > 0 && result.content
          ? Number((result.content.split(/\s+/).filter(Boolean).length / targetWordCount).toFixed(2))
          : null,
        contradictionsCritical: allContradictions.filter(c => c.severity === 'critical').length,
        contradictionsWarning: allContradictions.filter(c => c.severity === 'warning').length,
        guardianIssuesCritical: allGuardianIssues.filter(i => i.severity === 'critical').length,
        guardianIssuesMajor: allGuardianIssues.filter(i => i.severity === 'major').length,
        guardianIssuesModerate: allGuardianIssues.filter(i => i.severity === 'moderate').length,
        rewritesAttempted: 0,
        autoRevised: allContradictions.filter(c => c.severity === 'critical').length > 0,
        contextSizeChars: contextString.length,
        meta: {
          arc_number: arcNumber,
          ai_write_count: aiWriteCount,
          last_chapter_number: lastChapterNumber,
          split_parts: SPLIT_PARTS,
          health: health ? {
            ok: health.warnings.length === 0,
            character_states: health.characterStateCount,
            has_summary: health.hasChapterSummary,
            rag_chunks: health.ragChunkCount,
            warnings: health.warnings,
          } : null,
        },
      });
    })().catch(e => console.warn('[Orchestrator] Quality metrics failed:', e instanceof Error ? e.message : String(e))),

    // Task 17: Volume summary (every 25 reader chapters)
    ...(lastChapterNumber % 25 === 0 && lastChapterNumber >= 25 ? [
      (async () => {
        const { generateVolumeSummary } = await import('../memory/volume-summarizer');
        return generateVolumeSummary(project.id, lastChapterNumber, geminiConfig);
      })().catch(e => recordTaskFailure(db, project.id, novel.id, lastChapterNumber, 'task_17_volume_summary', e)),
    ] : []),
  ]);

  // Step 7 removed: current_chapter is bumped right after chapter upsert (Step 5b).

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
