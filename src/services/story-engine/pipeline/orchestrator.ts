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
import { loadContext, assembleContext, generateSummaryAndCharacters } from '../context/assembler';
import { writeChapter } from './chapter-writer';
// flash-cheap-routine RETIRED 2026-05-29 (wrote chapters with flash-lite); standard 3-agent path only.
import { retrieveRAGContext, chunkAndStoreChapter, retrieveEntityContext, retrieveThemeContext } from '../memory/rag-store';
import { saveCharacterStatesFromCombined, detectCharacterContradictions, type CharacterContradiction } from '../state/character-state';
import { extractCharacterKnowledge, getCharacterKnowledgeContext } from '../state/knowledge-graph';
import { autoReviseChapter } from './auto-reviser';
import { normalizeChapterLength } from './length-normalizer';
import { defaultLengthSpec, chooseNormalizeMode } from '../utils/length-metrics';
import { polishChapter } from './polisher';
import { runPostWriteValidator } from '../quality/post-write-validator';
import { runContinuityGuardian } from '../quality/continuity-guardian';
import { runContinuityGuardianFast } from '../quality/continuity-guardian-fast';
import { buildCorrectiveDirective } from '../quality/corrective-directive';
import { buildPlotThreadContext, extractAndUpdatePlotThreads } from '../state/plot-threads';
import { buildBeatContext, detectAndRecordBeats } from '../memory/beat-ledger';
import { buildRuleContext, extractRulesFromChapter } from '../canon/world-rules';
import { checkConsistency, checkConsistencyFast } from '../quality/consistency-check';
import { runSummaryTasks } from '../pipeline/summary-orchestrator';
import { generateArcPlan } from '../context/assembler';
import { hasValidSetupKernel } from './setup-kernel-guards';
// Quality modules (Qidian Master Level)
import { getForeshadowingContext, updateForeshadowingStatus, generateForeshadowingAgenda } from '../plan/foreshadowing';
import { getCharacterArcContext, updateCharacterArcs } from '../state/character-arcs';
import { getChapterPacingContext, generatePacingBlueprint } from '../plan/pacing-director';
import { getVoiceContext, updateVoiceFingerprint } from '../memory/voice-fingerprint';
import { getPowerContext, updateMCPowerState } from '../state/mc-power-state';
import { getWorldContext, updateLocationExploration, prepareUpcomingLocation, initializeWorldMap } from '../state/world-expansion';
import type {
  WriteChapterInput, WriteChapterResult, GeminiConfig, GenreType, StyleDirectives,
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
  style_directives: StyleDirectives | null;
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
  chapterNumber?: number;
  wordCount?: number;
  targetWordCount?: number;
}): string[] {
  const issues: string[] = [];
  const c = args.chapterContent;
  const chapterLabel = args.chapterNumber ? `ch.${args.chapterNumber}` : 'chapter';

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
      issues.push(`${chapterLabel}: MC name "${args.protagonistName}" absent from entire chapter (full + tokens)`);
    }
  }

  if (args.wordCount != null && args.targetWordCount && args.targetWordCount > 0) {
    const ratio = args.wordCount / args.targetWordCount;
    if (ratio < 0.8) {
      issues.push(`${chapterLabel}: published word count ${args.wordCount}/${args.targetWordCount} (${Math.round(ratio * 100)}%) is below target`);
    }
  }

  // 3. VND currency leak (only for VN-set genres + worlds — uses templates predicate)
  // Imported lazily to avoid circular dep risk
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requiresVndCurrency } = require('../templates') as { requiresVndCurrency: (g: GenreType, w?: string | null) => boolean };
    if (requiresVndCurrency(args.genre, args.worldDescription)) {
      // Negative lookahead carves out "xu hướng", "xu thế", "xu nịnh", "xu cách",
      // "xu hào" etc. — common Vietnamese compounds where "xu" is the first
      // syllable, not a currency unit. (2026-05-12)
      const xuFollowup = /(?:\s+(?:hướng|thế|nịnh|chiến|cách|hào|hoàng|hư|niêng))/i;
      const xuLeakRaw = c.match(/\d[\d.,]*\s*xu\b[^.,!?;:]{0,20}|(?:triệu|nghìn|trăm|tỷ|ngàn)\s+xu\b[^.,!?;:]{0,20}/);
      if (xuLeakRaw && !xuFollowup.test(xuLeakRaw[0])) {
        issues.push(`VND currency leak: "${xuLeakRaw[0].slice(0, 40)}"`);
      }
      const nguyenLeak = c.match(/\d[\d.,]*\s*nguyên(?!\s*(?:tử|thủy|tắc|liệu|chất|bản|nhân))/);
      if (nguyenLeak) issues.push(`VND currency leak: "${nguyenLeak[0].slice(0, 40)}"`);
    }
  } catch { /* templates not loaded — skip */ }

  return issues;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
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
  const { installModelTierRouting, assertChapterWriterRouting } = await import('../utils/model-tier');
  installModelTierRouting();
  // Fail loudly if the writer would fall back to flash-lite (quality regression).
  // No-op under DISABLE_PRO_TIER=1. See model-tier.ts assertChapterWriterRouting.
  assertChapterWriterRouting();

  // ── Step 1: Load project ───────────────────────────────────────────────
  const { data: projectData, error: projectError } = await db
    .from('ai_story_projects')
    .select('id,novel_id,main_character,genre,current_chapter,total_planned_chapters,world_description,temperature,target_chapter_length,ai_model,topic_id,style_directives,novels!ai_story_projects_novel_id_fkey(id,title)')
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

    if (!hasValidSetupKernel(extra?.story_outline)) {
      if (currentChapter === 0) {
        throw new Error('SETUP_KERNEL_MISSING: refusing to write chapter 1 before setup state machine creates story_outline.setupKernel');
      }
      throw new Error('PUBLISHED_SETUP_KERNEL_MISSING: project has chapters but lacks story_outline.setupKernel; pause for manual review, do not auto-rewrite canon');
    }

    // Fix A: MC name sync
    const outlineMC = storyOutline?.protagonist?.name?.trim();
    const projectMC = project.main_character?.trim();
    if (outlineMC && projectMC && outlineMC !== projectMC) {
      // Authoritative source: story_outline.protagonist.name generated during setup is always authoritative.
      // This prevents a generic placeholder/seed name in project.main_character from overwriting the AI-designed MC name.
      const winner = outlineMC;
      const loser = 'project.main_character';
      const { error: syncErr } = await db.from('ai_story_projects').update({ main_character: outlineMC }).eq('id', options.projectId);
      if (syncErr) throw new Error(`MC sync (project.main_character ← outline) failed: ${syncErr.message}`);
      
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
      validationFixes.push(`MC sync: ${loser}="${projectMC}" → "${winner}" (ch.${currentChapter} written, verified)`);
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

    // Phase 23 S1: SELF-HEALING — auto-regenerate missing support artifacts.
    // StoryKernel projects must not regenerate story_outline here. Ch.0 setup is
    // owned by setup-pipeline; published projects require manual canon review.
    // If master_outline OR story_outline is null AND we're at the start of the novel
    // (current_chapter < 5), regen them in place before the chapter writes. This unblocks
    // novels that were reset (e.g. via rewrite-recent-10) without requiring a separate
    // outline-gen script pass. Skipped for chapters >5 because by then the cron already
    // reads outline several times; missing means a deliberate reset that's our job to fix.
    const needsMasterRegen = !extra?.master_outline && currentChapter < 5;
    const needsStoryRegen = false;
    const needsPowerCanon = !(extra as { power_system_canon?: unknown } | null)?.power_system_canon && currentChapter < 5;
    const needsWorldbuildingCanon = !(extra as { worldbuilding_canon?: unknown } | null)?.worldbuilding_canon && currentChapter < 5;
    if (needsMasterRegen || needsStoryRegen || needsPowerCanon || needsWorldbuildingCanon) {
      try {
        const { data: full } = await db
          .from('ai_story_projects')
          .select('genre,main_character,world_description,total_planned_chapters,novels!ai_story_projects_novel_id_fkey(title)')
          .eq('id', options.projectId)
          .single();
        const novelTitle = (full?.novels as unknown as { title: string } | null)?.title || 'Unknown';
        const totalCh = full?.total_planned_chapters || 1000;
        const worldDesc = full?.world_description || '';

        if (needsMasterRegen) {
          const { generateMasterOutline } = await import('../plan/master-outline');
          // synopsis input = world description (used by master outline as world grounding)
          await generateMasterOutline(
            options.projectId,
            novelTitle,
            (full?.genre || 'do-thi') as GenreType,
            worldDesc.slice(0, 6000),
            totalCh,
            { ...DEFAULT_CONFIG, model: 'gemini-3-flash-preview', systemPrompt: '' },
          );
          validationFixes.push(`✓ master_outline auto-regenerated (was null, current_chapter=${currentChapter})`);
        }

        // Phase 27 W2.4: power-system canon — generate ONCE per project at setup.
        if (needsPowerCanon) {
          const { generatePowerSystemCanon } = await import('../canon/power-system');
          const storyOutlineStr = extra?.story_outline ? JSON.stringify(extra.story_outline) : null;
          const canon = await generatePowerSystemCanon(
            options.projectId,
            (full?.genre || 'do-thi') as GenreType,
            worldDesc,
            storyOutlineStr,
            { ...DEFAULT_CONFIG, model: 'gemini-3.1-flash-lite' },
          );
          if (canon) {
            validationFixes.push(`✓ power_system_canon generated (${canon.ladder?.length ?? 0} tiers)`);
          }
        }

        // Phase 27 W3.3: worldbuilding canon — comprehensive bible.
        if (needsWorldbuildingCanon) {
          const { generateWorldbuildingCanon } = await import('../canon/worldbuilding');
          const storyOutlineStr = extra?.story_outline ? JSON.stringify(extra.story_outline) : null;
          const wcanon = await generateWorldbuildingCanon(
            options.projectId,
            (full?.genre || 'do-thi') as GenreType,
            worldDesc,
            storyOutlineStr,
            { ...DEFAULT_CONFIG, model: 'gemini-3.1-flash-lite' },
          );
          if (wcanon) {
            validationFixes.push(`✓ worldbuilding_canon generated (${wcanon.regions?.length ?? 0} regions, ${wcanon.cultures?.length ?? 0} cultures)`);
          }
        }

        // Phase 27 W3.1+W3.2: plot twists + themes — generate AFTER master_outline.
        // Always check (no needsX flag) — idempotent, skip if already present.
        try {
          const { generatePlotTwists } = await import('../plan/plot-twists');
          await generatePlotTwists(
            options.projectId,
            (full?.genre || 'do-thi') as GenreType,
            totalCh,
            worldDesc,
            extra?.master_outline ? JSON.stringify(extra.master_outline).slice(0, 4000) : null,
            { ...DEFAULT_CONFIG, model: 'gemini-3.1-flash-lite' },
          );
        } catch (e) {
          console.warn('[orchestrator] generatePlotTwists at setup failed:', e instanceof Error ? e.message : String(e));
        }

        try {
          const { generateStoryThemes } = await import('../plan/themes');
          await generateStoryThemes(
            options.projectId,
            (full?.genre || 'do-thi') as GenreType,
            worldDesc,
            extra?.story_outline ? JSON.stringify(extra.story_outline).slice(0, 3000) : null,
            { ...DEFAULT_CONFIG, model: 'gemini-3.1-flash-lite' },
          );
        } catch (e) {
          console.warn('[orchestrator] generateStoryThemes at setup failed:', e instanceof Error ? e.message : String(e));
        }

        // After regen, throw a soft error so cron retries this chapter on next tick (with outlines now present).
        if (needsMasterRegen || needsStoryRegen || needsPowerCanon || needsWorldbuildingCanon) {
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
    if (err instanceof Error && (
      err.message.startsWith('SETUP_KERNEL_MISSING:') ||
      err.message.startsWith('PUBLISHED_SETUP_KERNEL_MISSING:')
    )) {
      throw err;
    }
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
  const projectStyleDirectives = project.style_directives;
  const directiveOverride = projectStyleDirectives?.target_chapter_length_override;
  const disableChapterSplit = projectStyleDirectives?.disable_chapter_split === true;
  const isSplitDisabled = true; // Always disable chapter splitting to simplify the project
  const directorOnlyFlash =
    projectStyleDirectives?.codex_director_only === true &&
    projectStyleDirectives?.flash_writer_enabled === true &&
    (options.model || project.ai_model || DEFAULT_CONFIG.model) === 'gemini-3.1-flash-lite';
  // Phase Q (2026-05-12): production_enabled novels running on Flash Lite at
  // 50 ch/day get the soft gate by default. Flash Lite consistently scores 5-6
  // — strict gate (>=7) would pause them after 5 marginal-quality chapters.
  // canAcceptRoutineSoftGate still hard-rejects any chapter with critical /
  // major continuity or canon blockers, so quality floor is maintained.
  const productionFlashSoftGate =
    projectStyleDirectives?.production_enabled === true &&
    (options.model || project.ai_model || DEFAULT_CONFIG.model) === 'gemini-3.1-flash-lite';
  // Phase T (2026-05-15): fresh chapter (ch.1-3) of a brand new novel
  // auto-enables soft-gate. Steady-state production threshold (≥7) is
  // calibrated for ch.50+ context-rich writing; fresh chapters naturally
  // score 5-6 due to limited cross-chapter context + Gemini Flash Lite
  // template attractor. Soft-gate still hard-rejects continuity/logic
  // criticals so quality floor preserved.
  const isFreshNovel = (project.current_chapter || 0) < 3;
  const flashRoutineSoftGate =
    projectStyleDirectives?.flash_routine_soft_gate === true ||
    directorOnlyFlash ||
    productionFlashSoftGate ||
    isFreshNovel;
  const flashRoutineMinQualityScore = Number(
    projectStyleDirectives?.flash_routine_min_quality_score ??
    (flashRoutineSoftGate ? 5 : DEFAULT_CONFIG.minQualityScore),
  );
  const flashRoutineMaxRetries = Number(
    projectStyleDirectives?.flash_routine_max_retries ??
    (flashRoutineSoftGate ? 3 : DEFAULT_CONFIG.maxRetries),
  );
  const deepseekThinkingTasks = Array.isArray(projectStyleDirectives?.deepseek_thinking_tasks)
    ? projectStyleDirectives.deepseek_thinking_tasks.filter((task): task is string => typeof task === 'string')
    : undefined;
  const baseTargetWordCount = options.targetWordCount ?? directiveOverride ?? project.target_chapter_length ?? DEFAULT_CONFIG.targetWordCount;

  // Mood-adjusted: lookup mood from pacing blueprint (if exists) and scale (climax→long, breathing→short).
  // This is non-fatal — falls back to baseTargetWordCount if no blueprint.
  let targetWordCount = baseTargetWordCount;
  try {
    const { getChapterMood, adjustWordCountForMood } = await import('../plan/pacing-director');
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
    deepseekThinkingEnabled: projectStyleDirectives?.deepseek_thinking_enabled === true,
    deepseekReasoningEffort: projectStyleDirectives?.deepseek_reasoning_effort === 'max' ? 'max' : 'high',
    deepseekThinkingTasks,
  };

  // NOTE (2026-05-29): the flash-cheap routine path is RETIRED — it wrote chapters with
  // gemini-3.1-flash-lite ("lởm" vs deepseek-v4-pro). Every chapter now goes through the
  // standard 3-agent path below, whose writer/architect tasks route to deepseek-v4-pro via
  // installModelTierRouting(). See flash-cheap-routine.ts `shouldUseFlashBulkCheapMode`.

  // ── Step 2: Load context (4 layers from DB) ────────────────────────────
  const context = await loadContext(project.id, novel.id, nextChapter);

  // ── Step 2b: Inject genre boundary ─────────────────────────────────────
  context.genreBoundary = getGenreBoundaryText(genre);

  // ── Step 2c: Inject RAG context — 3-level retrieval (non-fatal) ────────
  // Phase N.2 (2026-05-12): build eventFocus từ "what's expected to resolve
  // around this chapter" — plot_threads active high-priority + foreshadowing
  // about to pay off. Pass vào retrieveRAGContext để StoryWriter-style
  // history compression focus theo event hiện tại thay vì semantic broad.
  let eventFocus: string[] = [];
  try {
    const [{ data: threads }, { data: hints }] = await Promise.all([
      db
        .from('plot_threads')
        .select('name, description')
        .eq('project_id', project.id)
        .eq('status', 'active')
        .order('priority', { ascending: false })
        .limit(3),
      db
        .from('foreshadowing_plans')
        .select('hint_text, payoff_chapter')
        .eq('project_id', project.id)
        .in('status', ['planted', 'seeding'])
        .lte('payoff_chapter', nextChapter + 10)
        .gte('payoff_chapter', nextChapter - 20)
        .limit(3),
    ]);
    eventFocus = [
      ...((threads || []).map((t: { name?: string }) => t.name).filter(Boolean) as string[]),
      ...((hints || []).map((h: { hint_text?: string }) => h.hint_text?.slice(0, 60)).filter(Boolean) as string[]),
    ].slice(0, 5);
  } catch {
    eventFocus = [];
  }

  try {
    const [ragCtx, entityCtx, themeCtx] = await Promise.all([
      // Level 0: Hybrid vector search (existing) + Phase N.2 event focus
      retrieveRAGContext(
        project.id, nextChapter,
        context.arcPlan?.slice(0, 300) || null,
        context.previousCliffhanger || null,
        protagonistName,
        eventFocus.length > 0 ? eventFocus : null,
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
    const { getRelationshipContext } = await import('../state/relationships');
    const { getEconomicContext } = await import('../state/economic-ledger');
    const { getCharacterBibleContext } = await import('../memory/character-bibles');
    const { getVolumeSummaryContext } = await import('../memory/volume-summaries');
    const { getGeographyContext } = await import('../state/geography');
    const { logLoaderFailure } = await import('../utils/retry-queue');
    const subGenres = context.subGenres || [];
    // Telemetry: a failed loader silently strips its guidance from the Architect/Writer.
    // Record (don't block — empty fallback is valid) so the audit dashboard sees drift.
    const onLoaderFail = (name: string) => (e: unknown) => {
      logLoaderFailure(project.id, nextChapter, name, e);
      return null;
    };

    const [foreshadowCtx, charArcCtx, pacingCtx, voiceCtx, powerCtx, worldCtx, knowledgeCtx, relationshipCtx, economicCtx, bibleCtx, volSummaryCtx, geoCtx] = await Promise.all([
      getForeshadowingContext(project.id, nextChapter).catch(onLoaderFail('foreshadowing')),
      getCharacterArcContext(project.id, nextChapter, context.knownCharacterNames).catch(onLoaderFail('character_arc')),
      getChapterPacingContext(project.id, nextChapter).catch(onLoaderFail('pacing')),
      getVoiceContext(project.id).catch(onLoaderFail('voice')),
      getPowerContext(project.id, genre).catch(onLoaderFail('power')),
      getWorldContext(project.id, nextChapter).catch(onLoaderFail('world')),
      getCharacterKnowledgeContext(project.id, nextChapter, context.knownCharacterNames).catch(onLoaderFail('character_knowledge')),
      getRelationshipContext(project.id, context.knownCharacterNames).catch(onLoaderFail('relationship')),
      getEconomicContext(project.id, genre, subGenres).catch(onLoaderFail('economic')),
      getCharacterBibleContext(project.id, nextChapter).catch(onLoaderFail('character_bible')),
      getVolumeSummaryContext(project.id, nextChapter).catch(onLoaderFail('volume_summary')),
      getGeographyContext(project.id, nextChapter, protagonistName).catch(onLoaderFail('geography')),
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
    const { runPreWriteQA } = await import('../context/pre-write-qa');
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
  // ── Step 2e': Corrective feedback from previous chapter (Goal 5) ───────
  // Deterministic, no AI call. If the previous chapter scored low / had
  // critical continuity issues / drifted, name the weak dimension(s) so the
  // Architect + Writer self-correct instead of letting a dip persist.
  const correctiveDirective = await buildCorrectiveDirective(project.id, nextChapter - 1)
    .catch(() => '');
  if (correctiveDirective) {
    context.ragContext = (context.ragContext || '') + '\n\n' + correctiveDirective;
  }

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

      const storyVision = context.storyOutline ? {
        endingVision: context.storyOutline.endingVision,
        mainConflict: context.storyOutline.mainConflict,
        endGoal: context.storyOutline.protagonist?.endGoal,
        setupKernel: context.setupKernel || context.storyOutline.setupKernel,
        majorPlotPoints: context.storyOutline.majorPlotPoints
          ?.map(p => typeof p === 'string' ? p : p.description || p.name || JSON.stringify(p))
          ?.slice(0, 6),
      } : undefined;

      await generateArcPlan(
        project.id, arcNumber, genre, protagonistName,
        outlineSynopsis || context.masterOutline,
        context.storyBible,
        totalPlanned, geminiConfig,
        storyVision,
        project.world_description || context.worldDescription,
        context.masterOutline,
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
    } catch (e) {
      // Before chapter 1, an arc plan is a hard setup artifact, not a nice-to-have.
      if (nextChapter === 1) {
        throw e;
      }
      // Existing partially written projects may continue; audit/report handles repair.
    }
  }

  // Quality Overhaul 1.6: cross-chapter repetition ban list (deterministic
  // DB read, non-fatal) — injected into the Architect dynamic suffix.
  const repetitionBanList = await import('../quality/repetition-tracker')
    .then(({ getRepetitionBanList }) => getRepetitionBanList(project.id, nextChapter))
    .catch(() => [] as string[]);

  // ── Step 3: Assemble context string ────────────────────────────────────
  // Quality Overhaul 1.3: tier-aware budget (replaces blind head-trim in
  // chapter-writer). 360K leaves ~40K headroom for the Architect's static
  // prompt sections under its 400K MAX_PROMPT_CHARS guard.
  let contextTrimInfo: { trimmedTiers: number[]; beforeChars: number; afterChars: number } | null = null;
  const contextString = assembleContext(context, nextChapter, {
    maxChars: 360_000,
    onTrim: info => { contextTrimInfo = info; },
  });

  // ── Step 4: Write chapter via 3-agent pipeline ─────────────────────────
  const isFinalArc = nextChapter >= totalPlanned - 20;

  // Phase M.6 (2026-05-12): compute soft-ending phase guidance injected vào
  // Architect. 4 phases: normal / wrapup / grace / hardstop.
  const { getEndingPhase, getArchitectGuidance } = await import('../quality/soft-ending-enforcer');
  const endingPhase = getEndingPhase(currentChapter, project.total_planned_chapters);
  const softEndingGuidance = endingPhase === 'phase_1_normal'
    ? ''
    : getArchitectGuidance(endingPhase, project.total_planned_chapters || 1000, currentChapter);

  const result: WriteChapterResult = await writeChapter(
    nextChapter,
    contextString,
    genre,
    targetWordCount,
    context.previousTitles,
    geminiConfig,
    flashRoutineMaxRetries,
    {
      projectId: project.id,
      protagonistName,
      topicId: project.topic_id || undefined,
      isFinalArc,
      genreBoundary: context.genreBoundary,
      worldBible: context.storyBible,
      worldDescription: project.world_description,
      subGenres: context.subGenres,
      qualityGateMinScore: flashRoutineMinQualityScore,
      qualityGateMode: flashRoutineSoftGate ? 'routine_soft' : 'standard',
      softEndingGuidance,
      // Quality Overhaul 1.1: default ON; style_directives.critic_revise_pass=false opts out.
      criticRevisePassEnabled: projectStyleDirectives?.critic_revise_pass !== false,
      // Quality Overhaul 1.6: [CẤM LẶP] motif ban list for the Architect.
      repetitionBanList,
    },
  );

  // ── Step 4.5: Pre-save QA — contradictions, fast consistency, guardian ──
  // Phase 24 reorder: auto-revise must run BEFORE the chapter row hits the
  // database. Previously revise ran AFTER upsert + UPDATE rows in place;
  // if revise failed (truncation, JSON parse error, model error, content too
  // short), the original (contradictory) chapter stayed in DB. Now: detect
  // criticals on the full logical chapter, revise, then split + upsert with
  // the revised content. If criticals found AND revise fails, throw — the
  // chapter is NOT saved and cron retries on next tick.
  const SPLIT_PARTS_PRE = isSplitDisabled ? 1 : 2;
  const lastChapterNumberPre = nextChapter + SPLIT_PARTS_PRE - 1;

  // Outline character names — used by guardian + downstream per-part tasks.
  const outlineCharsPre = new Set<string>();
  if (result.outline?.scenes) {
    for (const scene of result.outline.scenes) {
      for (const char of scene.characters || []) {
        outlineCharsPre.add(char);
      }
    }
  }
  outlineCharsPre.add(protagonistName);
  const charactersPre = Array.from(outlineCharsPre);

  // Pre-save contradiction extraction on full logical content.
  const preReviseCombined = await generateSummaryAndCharacters(
    lastChapterNumberPre, result.title, result.content, protagonistName, geminiConfig,
    { allowEmptyCliffhanger: isFinalArc, projectId: project.id },
  ).catch((e) => {
    console.warn(`[Orchestrator] Pre-save character extraction failed for Ch.${lastChapterNumberPre}:`, e instanceof Error ? e.message : String(e));
    return null;
  });

  let preSaveContradictions: CharacterContradiction[] = [];
  let preSaveGuardianIssues: import('../quality/continuity-guardian').GuardianIssue[] = [];

  if (preReviseCombined?.characters && preReviseCombined.characters.length > 0) {
    preSaveContradictions = await detectCharacterContradictions(
      project.id, lastChapterNumberPre, preReviseCombined.characters,
    ).catch((e) => {
      console.warn('[Orchestrator] Pre-save contradiction detection failed:', e instanceof Error ? e.message : String(e));
      return [] as CharacterContradiction[];
    });
  }

  // Fast consistency regex (dead-character resurrection). Phase 24: log error
  // explicitly instead of silent `.catch(() => [])` so DB-query failures don't
  // hide undetected resurrections.
  const fastIssuesPre = await checkConsistencyFast(
    project.id, lastChapterNumberPre, result.content,
  ).catch((e) => {
    console.warn(`[Orchestrator] Pre-save fast consistency check failed for Ch.${lastChapterNumberPre}:`, e instanceof Error ? e.message : String(e));
    return [];
  });
  for (const issue of fastIssuesPre) {
    if (issue.severity === 'critical' && issue.type === 'dead_character') {
      const charNameMatch = issue.description.match(/^(\S+(?:\s\S+)*)\s+đã chết/);
      const charName = charNameMatch?.[1] || 'unknown';
      preSaveContradictions.push({
        characterName: charName,
        type: 'resurrection',
        severity: 'critical',
        description: issue.description,
        previousChapter: 0,
        currentChapter: lastChapterNumberPre,
      });
    }
  }

  // checkConsistency (AI business-logic check) — Phase 24: was running once per
  // 3 AI writes with output discarded. Now critical/major issues throw to abort
  // the save (auto-reviser is character-focused and can't fix finance-logic
  // errors meaningfully — better to reject and let cron retry).
  let businessLogicBlock: string | null = null;
  if (charactersPre.length > 0) {
    const businessIssues = await checkConsistency(
      project.id, lastChapterNumberPre, result.content, charactersPre,
    ).catch((e) => {
      console.warn(`[Orchestrator] Pre-save business consistency check failed for Ch.${lastChapterNumberPre}:`, e instanceof Error ? e.message : String(e));
      return [];
    });
    const blocking = businessIssues.filter(
      i => (i.severity === 'critical' || i.severity === 'major') && i.type !== 'dead_character',
    );
    if (blocking.length > 0) {
      businessLogicBlock = blocking
        .map(i => `[${i.type}/${i.severity}] ${i.description}`)
        .join('; ');
    }
  }

  // Continuity Guardian — every 2 AI writes. Promoted to pre-save so its
  // critical (and major-promoted) findings can block via auto-revise.
  const aiWriteCountPre = Math.ceil(lastChapterNumberPre / SPLIT_PARTS_PRE);
  const skipGuardianPre = aiWriteCountPre % 2 !== 0;
  const guardianPre = skipGuardianPre
    ? await runContinuityGuardianFast(
        project.id, lastChapterNumberPre, result.content,
      ).catch((e) => {
        console.warn('[Orchestrator] Pre-save fast continuity guardian failed:', e instanceof Error ? e.message : String(e));
        return { issues: [], contradictions: [] };
      })
    : await runContinuityGuardian(
        project.id, lastChapterNumberPre, result.title, result.content, charactersPre, geminiConfig,
      ).catch((e) => {
        console.warn('[Orchestrator] Pre-save continuity guardian failed:', e instanceof Error ? e.message : String(e));
        return { issues: [], contradictions: [] };
      });
  if (guardianPre.contradictions.length > 0) {
    for (const c of guardianPre.contradictions) preSaveContradictions.push(c);
  }
  preSaveGuardianIssues = guardianPre.issues;

  // Auto-revise on logical content if criticals exist. Phase 24: throw if
  // criticals found AND revise fails — refuse to ship contradictory content.
  const preCriticals = preSaveContradictions.filter(c => c.severity === 'critical');
  let preReviseSucceeded = preCriticals.length === 0; // vacuously true if no criticals
  if (preCriticals.length > 0) {
    console.warn(
      `[Orchestrator] Pre-save criticals for Ch.${nextChapter}-${lastChapterNumberPre}: ${preCriticals.length}`,
      preCriticals.map(c => c.description),
    );
    try {
      const revision = await autoReviseChapter(
        lastChapterNumberPre, result.content, preSaveContradictions, geminiConfig, project.id,
      );
      if (revision.revised) {
        result.content = revision.content;
        result.wordCount = result.content.trim().split(/\s+/).filter(Boolean).length;
        preReviseSucceeded = true;
        console.warn(`[Orchestrator] Pre-save auto-revised Ch.${nextChapter}-${lastChapterNumberPre}: fixed ${revision.fixedIssues.length} issues`);

        // Override stale character extraction so saved character_states preserve
        // dead-character truth and drop spurious power downgrades.
        const namesToForceDead = new Set(
          preCriticals.filter(c => c.type === 'resurrection').map(c => c.characterName)
        );
        const namesToDropPowerDowngrade = new Set(
          preCriticals.filter(c => c.type === 'power_regression').map(c => c.characterName)
        );
        if (preReviseCombined) {
          preReviseCombined.characters = preReviseCombined.characters
            .filter(c => !namesToDropPowerDowngrade.has(c.character_name))
            .map(c => namesToForceDead.has(c.character_name)
              ? { ...c, status: 'dead' as const }
              : c
            );
        }
      } else {
        // Revision attempted but produced too-short / empty content.
        preReviseSucceeded = false;
      }
    } catch (e) {
      console.warn('[Orchestrator] Pre-save auto-revision threw:', e instanceof Error ? e.message : String(e));
      preReviseSucceeded = false;
    }

    if (!preReviseSucceeded) {
      throw new Error(
        `Chapter ${nextChapter}-${lastChapterNumberPre}: ${preCriticals.length} critical contradictions detected and auto-revise failed. Refusing to publish — cron will retry. Issues: ${preCriticals.slice(0, 3).map(c => c.description).join('; ')}`,
      );
    }
  }

  // Quality Overhaul 1.2 — warning-tier contradiction revise. High-risk
  // warning contradictions (resurrection / power_regression / info_leak /
  // location_teleport) previously shipped unrevised — only criticals got the
  // auto-reviser. Run a non-fatal targeted revise; on failure ship anyway
  // (don't break the cron) but flag for admin review.
  const HIGH_RISK_WARNING_TYPES = new Set(['resurrection', 'power_regression', 'info_leak', 'location_teleport']);
  const preWarnings = preSaveContradictions.filter(
    c => c.severity === 'warning' && HIGH_RISK_WARNING_TYPES.has(c.type),
  );
  if (preCriticals.length === 0 && preWarnings.length > 0) {
    let warningReviseFixed = false;
    try {
      const revision = await autoReviseChapter(
        lastChapterNumberPre, result.content, preWarnings, geminiConfig, project.id, 'warning',
      );
      if (revision.revised) {
        result.content = revision.content;
        result.wordCount = result.content.trim().split(/\s+/).filter(Boolean).length;
        warningReviseFixed = true;
        console.warn(`[Orchestrator] Pre-save warning-tier auto-revised Ch.${nextChapter}-${lastChapterNumberPre}: fixed ${revision.fixedIssues.length} issues`);
      }
    } catch (e) {
      console.warn('[Orchestrator] Pre-save warning-tier revision threw:', e instanceof Error ? e.message : String(e));
    }
    if (!warningReviseFixed) {
      result.recoveryFlags = [...(result.recoveryFlags || []), 'major_contradiction_unfixed'];
      console.warn(`[Orchestrator] Ch.${nextChapter}-${lastChapterNumberPre}: ${preWarnings.length} high-risk warning contradictions shipped unfixed — flagged for admin review`);
    }
  }

  // Business-logic consistency: throw without trying to revise (auto-reviser
  // is character-focused). Cron retries on next tick.
  if (businessLogicBlock) {
    throw new Error(
      `Chapter ${nextChapter}-${lastChapterNumberPre}: blocking business-logic consistency issues. Refusing to publish — cron will retry. Issues: ${businessLogicBlock}`,
    );
  }

  // ── Step 4.7: Length-Normalizer (Phase R+1, 2026-05-15) ─────────────────
  // Single-pass length adjustment if word count outside soft range. Preserves
  // plot, dialogue, character names. Cheaper + safer than retry loops.
  // Skips entirely if chapter already within ±15% of target.
  try {
    const lengthSpec = defaultLengthSpec(targetWordCount);
    const currentWords = result.content.trim().split(/\s+/).filter(Boolean).length;
    const mode = chooseNormalizeMode(currentWords, lengthSpec);
    if (mode !== 'none') {
      const normResult = await normalizeChapterLength(
        {
          chapterNumber: lastChapterNumberPre,
          chapterContent: result.content,
          lengthSpec,
          chapterIntent: result.outline?.summary || result.title,
        },
        geminiConfig,
        project.id,
      );
      if (normResult.applied) {
        result.content = normResult.normalizedContent;
        result.wordCount = normResult.finalCount;
        console.warn(
          `[Orchestrator] Length-normalize Ch.${nextChapter}-${lastChapterNumberPre}: ${normResult.mode} ${normResult.originalCount}→${normResult.finalCount} (target ${lengthSpec.target})${normResult.warning ? ' | ' + normResult.warning : ''}`,
        );
      } else if (normResult.warning) {
        console.warn(
          `[Orchestrator] Length-normalize skipped Ch.${nextChapter}-${lastChapterNumberPre}: ${normResult.warning}`,
        );
      }
    }
  } catch (e) {
    console.warn(
      `[Orchestrator] Length-normalize threw for Ch.${nextChapter}-${lastChapterNumberPre}:`,
      e instanceof Error ? e.message : String(e),
    );
  }

  // ── Step 4.8: Polisher (Phase R+1, 2026-05-15) ──────────────────────────
  // Surface-only polish — sentence variety, externalize emotion, distinct
  // character voice, kill narrator conclusions + AI-tell vocab. Cannot
  // change plot/structure/dialogue content. Runs after length-normalizer
  // so length is already in soft range.
  //
  // Gating: skip polish if post-write-validator finds ZERO critical/major
  // prose-layer issues — chapter is already clean at surface, no value
  // burning a polish call.
  //
  // Phase T (2026-05-15): FORCE polish on golden chapters (ch.1-3 of a
  // new novel). Fresh chapters need maximum surface quality for reader
  // first-impression, regardless of PWV findings.
  try {
    const prePolishIssues = runPostWriteValidator({ content: result.content });
    const hasPolishWorthyIssue = prePolishIssues.some(
      i => i.severity === 'critical' || i.severity === 'major',
    );
    const isGoldenChapter = lastChapterNumberPre <= 3;
    if (hasPolishWorthyIssue || isGoldenChapter) {
      const polishResult = await polishChapter(
        {
          chapterNumber: lastChapterNumberPre,
          chapterContent: result.content,
          chapterIntent: result.outline?.summary || result.title,
        },
        geminiConfig,
        project.id,
      );
      if (polishResult.changed) {
        result.content = polishResult.polishedContent;
        result.wordCount = result.content.trim().split(/\s+/).filter(Boolean).length;
        console.warn(
          `[Orchestrator] Polish Ch.${nextChapter}-${lastChapterNumberPre}: ${polishResult.originalLength}→${polishResult.polishedLength} chars (${prePolishIssues.filter(i => i.severity === 'critical' || i.severity === 'major').length} crit/major issues addressed)${polishResult.warning ? ' | ' + polishResult.warning : ''}`,
        );
      } else if (polishResult.warning) {
        console.warn(
          `[Orchestrator] Polish skipped Ch.${nextChapter}-${lastChapterNumberPre}: ${polishResult.warning}`,
        );
      }
    }
  } catch (e) {
    console.warn(
      `[Orchestrator] Polish threw for Ch.${nextChapter}-${lastChapterNumberPre}:`,
      e instanceof Error ? e.message : String(e),
    );
  }

  // ── Step 5: Split AI content into N reader chapters + save to DB ─────────
  // AI writes 1 logical chapter (~2800 từ). HISTORICALLY split into 2 reader chapters
  // (~1400 từ each) for mobile-friendly UX. Phase 27+: NEW novels default to NO-split
  // (style_directives.disable_chapter_split=true is now set by content-seeder for new
  // projects). Reasons:
  //   - No-split has fewer post-write doubling → ~10-15% cost saving
  //   - Cleaner state machine (1 chapter = 1 row across all tables)
  //   - Less moving parts → fewer edge cases to handle in 30+ tracking dimensions
  // Existing novels with split=2 continue to work via per-part loop fallback (Phase 24).
  // To opt into split=2 explicitly: set style_directives.disable_chapter_split=false.
  const SPLIT_PARTS = isSplitDisabled ? 1 : 2;
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

  // Phase N.3 (2026-05-12): Git-style chapter version audit log.
  // Insert version row into existing `chapter_versions` table (created
  // pre-story-engine-v2, reused). Non-fatal — version log failure không
  // block chapter save. Source = 'engine_v2_write' để distinguish với
  // ai-editor's 'auto_rewrite' source.
  try {
    const { data: savedChapters } = await db
      .from('chapters')
      .select('id, chapter_number, title, content')
      .eq('novel_id', novel.id)
      .in('chapter_number', chapterRows.map((r) => r.chapter_number));
    if (savedChapters && savedChapters.length > 0) {
      const versionRows = savedChapters.map((ch) => ({
        chapter_id: ch.id,
        chapter_number: ch.chapter_number,
        source: 'engine_v2_write',
        title: ch.title,
        content: ch.content,
        quality_score: result.qualityScore || null,
        metadata: {
          project_id: project.id,
          word_count: ch.content?.length || 0,
          attempt: 'initial',
          phase: 'N.3_audit_log',
        },
      }));
      await db.from('chapter_versions').insert(versionRows);
    }
  } catch (versionErr) {
    console.warn(`[Orchestrator] N.3 chapter_versions audit log failed (non-fatal): ${versionErr instanceof Error ? versionErr.message : String(versionErr)}`);
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

  // Phase M.6 (2026-05-12): Soft-ending check — mark project completed nếu
  // (a) phase_4_hardstop (vượt target +20 chương), HOẶC
  // (b) phase_3_grace + chương vừa viết là arc boundary của master_outline.
  try {
    const { getEndingPhase, isAtArcBoundary, shouldMarkCompleted } =
      await import('../quality/soft-ending-enforcer');
    const phaseAfter = getEndingPhase(lastChapterNumber, project.total_planned_chapters);
    if (phaseAfter !== 'phase_1_normal' && phaseAfter !== 'phase_2_wrapup') {
      const { data: moRow } = await db
        .from('ai_story_projects')
        .select('master_outline')
        .eq('id', project.id)
        .maybeSingle();
      const masterOutline = moRow?.master_outline as {
        volumes?: Array<{ subArcs?: Array<{ endChapter: number }> }>;
        majorArcs?: Array<{ endChapter: number }>;
      } | null;
      const atBoundary = isAtArcBoundary(lastChapterNumber, masterOutline);
      if (shouldMarkCompleted(phaseAfter, atBoundary)) {
        const { error: completeErr } = await db
          .from('ai_story_projects')
          .update({
            status: 'completed',
            pause_reason: `soft_ending_completed_${phaseAfter}_ch${lastChapterNumber}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', project.id);
        if (completeErr) {
          console.warn(`[Orchestrator] Soft-ending mark-completed failed for project ${project.id}: ${completeErr.message}`);
        } else {
          console.log(`[Orchestrator] Project ${project.id} marked completed at ch.${lastChapterNumber} (phase=${phaseAfter}, atBoundary=${atBoundary})`);
        }
      }
    }
  } catch (e) {
    console.warn(`[Orchestrator] Soft-ending enforcer threw: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Quality Overhaul 1.4 — surface degraded-content recovery paths to the
  // admin review queue (golden fallback / revise-pass failure / unfixed
  // high-risk contradictions). Non-fatal, post-save.
  if (result.recoveryFlags?.length) {
    try {
      const { enqueueAdminReview } = await import('../quality/admin-review-queue');
      const validReasons = new Set(['golden_fallback', 'revise_pass_failed', 'major_contradiction_unfixed']);
      for (const flag of result.recoveryFlags) {
        if (!validReasons.has(flag)) continue;
        await enqueueAdminReview({
          projectId: project.id,
          novelId: novel.id,
          chapterNumber: nextChapter,
          reason: flag as 'golden_fallback' | 'revise_pass_failed' | 'major_contradiction_unfixed',
          detail: {
            quality_score: result.qualityScore,
            title: result.title,
            gate_issues: (result.criticReport?.issues || [])
              .filter(i => i.severity === 'critical' || i.severity === 'major')
              .slice(0, 5)
              .map(i => `[${i.type}/${i.severity}] ${i.description.slice(0, 200)}`),
          },
        });
      }
    } catch (e) {
      console.warn('[Orchestrator] admin review queue enqueue failed:', e instanceof Error ? e.message : String(e));
    }
  }

  // Step 5c quality canary runs per saved reader chapter below. Running it on
  // result.content would hide split-related published chapter issues.

  // ── Step 6: Post-write tasks (Phase 24 — per-reader-chapter loop) ─────
  // Pre-save QA already ran in Step 4.5 (auto-revise on full logical content
  // + throw on critical revise-fail). What remains here:
  //   1. Per-part: summary + character_states + RAG + beats + rules +
  //      foreshadowing + voice + MC power + knowledge + geography
  //   2. Once-per-AI-write cadence: char arcs (every 3), location (every 3),
  //      upcoming location (every 3), relationships (every 3),
  //      economic (every 3, do-thi/quan-truong), char bible (every 20),
  //      volume summary (every 25), quality metrics (every write).
  const arcNumber = Math.ceil(nextChapter / 20);
  const aiWriteCount = Math.ceil(lastChapterNumber / SPLIT_PARTS);

  // Re-use pre-save outputs for downstream consumers + quality_metrics.
  const characters = charactersPre;
  const logicalCombined = preReviseCombined;
  const allContradictions: CharacterContradiction[] = preSaveContradictions;
  const allGuardianIssues: import('../quality/continuity-guardian').GuardianIssue[] = preSaveGuardianIssues;
  const logicalWordCount = countWords(result.content);
  const publishedTargetWordCount = Math.max(1, Math.round(targetWordCount / Math.max(splitResults.length, 1)));

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

      // Task 5b (Quality Overhaul 1.6): cross-chapter motif tracking — deterministic, no LLM
      import('../quality/repetition-tracker').then(({ recordMotifUsage }) =>
        recordMotifUsage(project.id, partCh, part.content),
      ).catch(e => recordTaskFailure(db, project.id, novel.id, partCh, 'task_5b_motif_tracking', e)),

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
          const { recordLocationFromCharacters } = await import('../state/geography');
          return recordLocationFromCharacters(
            project.id, partCh, part.content,
            charsForThisPart.map(c => ({ character_name: c.character_name, location: c.location })),
          );
        })().catch(e => recordTaskFailure(db, project.id, novel.id, partCh, 'task_15b_geography', e)),
      ] : []),

      // Task 15d (Phase 27 W2.2): Story timeline — chapter ↔ in-world date.
      (async () => {
        const { recordChapterTime } = await import('../state/timeline');
        return recordChapterTime(project.id, partCh, part.content, protagonistName, geminiConfig);
      })().catch(e => recordTaskFailure(db, project.id, novel.id, partCh, 'task_15d_timeline', e)),

      // Task 15e (Phase 27 W2.3): Item events — picked/used/lost/equipped.
      (async () => {
        const { recordItemEvents } = await import('../state/item-inventory');
        return recordItemEvents(project.id, partCh, part.content, characters, geminiConfig);
      })().catch(e => recordTaskFailure(db, project.id, novel.id, partCh, 'task_15e_item_events', e)),

      // Task 15g (Phase 27 W3.1): Auto-advance plot twist statuses (planned → seeding → imminent → revealed).
      (async () => {
        const { advanceTwistStatuses } = await import('../plan/plot-twists');
        return advanceTwistStatuses(project.id, partCh);
      })().catch(e => recordTaskFailure(db, project.id, novel.id, partCh, 'task_15g_twist_advance', e)),

      // Task 15h (Phase 27 W3.2): Theme reinforcement detection.
      (async () => {
        const { detectThemeReinforcement } = await import('../plan/themes');
        return detectThemeReinforcement(project.id, partCh, part.content, geminiConfig);
      })().catch(e => recordTaskFailure(db, project.id, novel.id, partCh, 'task_15h_theme_reinforcement', e)),
    ]);

    // Task 16b: published-chapter quality metrics + canary. This must run per
    // saved row. The Critic scores still describe the full logical write, while
    // word_count/word_ratio and health reflect the reader-facing chapter.
    const publishedWordCount = countWords(part.content);
    try {
      const canaryIssues = runChapterCanary({
        chapterContent: part.content,
        protagonistName,
        genre,
        worldDescription: project.world_description || undefined,
        chapterNumber: partCh,
        wordCount: publishedWordCount,
        targetWordCount: publishedTargetWordCount,
      });
      if (canaryIssues.length > 0) {
        await recordTaskFailure(
          db, project.id, novel.id, partCh, 'quality_canary',
          new Error(`Canary triggered: ${canaryIssues.join('; ')}`),
        );
      }
    } catch (e) {
      console.warn(`[Orchestrator] canary check failed for Ch.${partCh}:`, e instanceof Error ? e.message : String(e));
    }

    try {
      const { recordQualityMetrics } = await import('../quality/quality-metrics');
      const { postWriteHealthCheck } = await import('../utils/post-write-health-check');
      const health = await postWriteHealthCheck(project.id, partCh).catch(() => null);
      const critic = result.criticReport;
      await recordQualityMetrics({
        projectId: project.id,
        novelId: novel.id,
        chapterNumber: partCh,
        overallScore: critic?.overallScore ?? null,
        dopamineScore: critic?.dopamineScore ?? null,
        pacingScore: critic?.pacingScore ?? null,
        endingHookScore: critic?.endingHookScore ?? null,
        wordCount: publishedWordCount,
        wordRatio: Number((publishedWordCount / publishedTargetWordCount).toFixed(2)),
        contradictionsCritical: allContradictions.filter(c => c.severity === 'critical').length,
        contradictionsWarning: allContradictions.filter(c => c.severity === 'warning').length,
        guardianIssuesCritical: allGuardianIssues.filter(i => i.severity === 'critical').length,
        guardianIssuesMajor: allGuardianIssues.filter(i => i.severity === 'major').length,
        guardianIssuesModerate: allGuardianIssues.filter(i => i.severity === 'moderate').length,
        rewritesAttempted: 0,
        autoRevised: allContradictions.filter(c => c.severity === 'critical').length > 0,
        contextSizeChars: contextString.length,
        meta: {
          arc_number: partArc,
          ai_write_count: aiWriteCount,
          logical_chapter_number: nextChapter,
          reader_chapter_number: partCh,
          last_chapter_number: lastChapterNumber,
          split_index: idx + 1,
          split_parts: splitResults.length,
          requested_split_parts: SPLIT_PARTS,
          critic_revised_pass: result.criticRevisedPass === true,
          recovery_flags: result.recoveryFlags ?? [],
          context_trim_tiers: contextTrimInfo ? (contextTrimInfo as { trimmedTiers: number[] }).trimmedTiers : [],
          context_loader_failures: context.loaderFailures ?? [],
          score_scope: 'logical_write',
          logical_word_count: logicalWordCount,
          logical_target_words: targetWordCount,
          published_word_count: publishedWordCount,
          published_target_words: publishedTargetWordCount,
          rubric_scores: result.criticReport?.rubricScores ?? null,
          health: health ? {
            ok: health.warnings.length === 0,
            character_states: health.characterStateCount,
            has_summary: health.hasChapterSummary,
            rag_chunks: health.ragChunkCount,
            warnings: health.warnings,
          } : null,
        },
      });
    } catch (e) {
      console.warn(`[Orchestrator] Quality metrics failed for Ch.${partCh}:`, e instanceof Error ? e.message : String(e));
    }
  }

  // ── Step 6c: Once-per-AI-write aggregate tasks (cadence-gated) ────────
  // These run on lastChapterNumber + result.content because they aggregate or
  // fire at chapter-count milestones, not per reader chapter.
  await Promise.all([
    // Task 6 REMOVED (Phase M.1, 2026-05-12): checkConsistency() đã chạy pre-save
    // ở line 850 với blocking behavior. Lần thứ 2 ở đây fire-and-forget không
    // giúp gì — same call, output discarded. Drop duplicate, save ~333 DeepSeek
    // calls/novel (~$1-2/novel).

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
        const { extractRelationships } = await import('../state/relationships');
        return extractRelationships(project.id, lastChapterNumber, result.content, characters, geminiConfig);
      })().catch(e => recordTaskFailure(db, project.id, novel.id, lastChapterNumber, 'task_14_relationships', e)),
    ] : []),

    // Task 15: Economic ledger (every 3 AI writes, only do-thi/quan-truong)
    ...(aiWriteCount % 3 === 0 && ['do-thi','quan-truong'].includes(genre) ? [
      (async () => {
        const { extractEconomicState } = await import('../state/economic-ledger');
        return extractEconomicState(project.id, lastChapterNumber, result.content, protagonistName, geminiConfig);
      })().catch(e => recordTaskFailure(db, project.id, novel.id, lastChapterNumber, 'task_15_economic_ledger', e)),
    ] : []),

    // Task 15c: Plot Thread Ledger update (every AI write — Phase 24)
    extractAndUpdatePlotThreads(
      project.id, lastChapterNumber, result.content, characters, geminiConfig,
    ).catch(e => recordTaskFailure(db, project.id, novel.id, lastChapterNumber, 'task_15c_plot_thread_ledger', e)),

    // Task 15f (Phase 27 W2.5): Factions extractor — every 3 AI writes.
    // Factions evolve slowly; per-write is too expensive.
    ...(aiWriteCount % 3 === 0 ? [
      (async () => {
        const { extractAndUpdateFactions } = await import('../canon/factions');
        return extractAndUpdateFactions(project.id, lastChapterNumber, result.content, characters, geminiConfig);
      })().catch(e => recordTaskFailure(db, project.id, novel.id, lastChapterNumber, 'task_15f_factions', e)),
    ] : []),

    // Task 16: Character bible refresh (every 20 reader chapters)
    ...(lastChapterNumber % 20 === 0 && lastChapterNumber >= 20 ? [
      (async () => {
        const { refreshCharacterBibles } = await import('../memory/character-bibles');
        return refreshCharacterBibles(project.id, lastChapterNumber, geminiConfig);
      })().catch(e => recordTaskFailure(db, project.id, novel.id, lastChapterNumber, 'task_16_character_bible_refresh', e)),
    ] : []),

    // Task 15j (Phase 27 W5.4): Rolling chapter briefs — generate next 1-3 detailed
    // briefs every 5 chapters. Idempotent (skip if briefs already exist).
    ...(lastChapterNumber % 5 === 0 ? [
      (async () => {
        const { generateRollingBriefs } = await import('../plan/chapter-briefs');
        return generateRollingBriefs(project.id, lastChapterNumber, geminiConfig);
      })().catch(e => console.warn('[Orchestrator] Rolling briefs failed:', e instanceof Error ? e.message : String(e))),
    ] : []),

    // Task 15i (Phase 27 W4.2): Voice anchor capture — fires when lastChapterNumber >= 3.
    // Idempotent (UNIQUE constraint on project_id+chapter_number+snippet_type).
    ...(lastChapterNumber >= 3 ? [
      (async () => {
        const { captureVoiceAnchors } = await import('../memory/voice-anchor');
        const { data: ch13 } = await db
          .from('chapters')
          .select('chapter_number,content')
          .eq('novel_id', novel.id)
          .lte('chapter_number', 3)
          .order('chapter_number', { ascending: true });
        if (ch13?.length) {
          await captureVoiceAnchors(project.id, ch13);
        }
      })().catch(e => console.warn('[Orchestrator] Voice anchor capture failed:', e instanceof Error ? e.message : String(e))),
    ] : []),

    // Task 16c: First-10 evaluation (Phase 25) — runs ONCE per project when
    // an AI write spans/reaches ch.10. Idempotent (UNIQUE constraint on
    // project_id), so cron retries skip if already done.
    ...(nextChapter <= 10 && lastChapterNumber >= 10 ? [
      (async () => {
        const { runFirst10Evaluation } = await import('../quality/first-10-evaluator');
        return runFirst10Evaluation(project.id, novel.id, genre, protagonistName, geminiConfig);
      })().catch(e => recordTaskFailure(db, project.id, novel.id, lastChapterNumber, 'task_16c_first_10_evaluation', e)),
    ] : []),

    // Task 17: Volume summary (every 25 reader chapters)
    ...(lastChapterNumber % 25 === 0 && lastChapterNumber >= 25 ? [
      (async () => {
        const { generateVolumeSummary } = await import('../memory/volume-summaries');
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
