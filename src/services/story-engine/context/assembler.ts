/**
 * Story Engine v2 — Context Assembler
 *
 * Loads and assembles the 4-layer context from DB before writing a chapter.
 * Also handles post-write persistence (summary, synopsis, arc plan, bible).
 */

import { getSupabase } from '../utils/supabase';
import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import { GOLDEN_CHAPTER_REQUIREMENTS, UNIVERSAL_ANTI_SEEDS, SUB_GENRE_RULES } from '../templates';

/**
 * P3.3: Validate sub_genres keys against known SUB_GENRE_RULES.
 * Unknown keys (typos, deprecated tags) get logged + dropped so they don't
 * silently fall through. Returns the filtered list.
 */
function validateSubGenreKeys(rawKeys: string[], projectId: string): string[] {
  if (!rawKeys || rawKeys.length === 0) return [];
  const known = Object.keys(SUB_GENRE_RULES);
  const valid: string[] = [];
  const unknown: string[] = [];
  for (const k of rawKeys) {
    if (known.includes(k)) valid.push(k);
    else unknown.push(k);
  }
  if (unknown.length > 0) {
    console.warn(`[context-assembler] project ${projectId.slice(0, 8)} has unknown sub_genres: ${unknown.join(', ')}. Known keys: ${known.join(', ')}. Typos? Dropping unknown keys.`);
  }
  return valid;
}
import { getArchitectVoiceHint } from '../templates/genre-voice-anchors';
import { getGenreArchitectGuide } from '../templates/genre-process-blueprints';

import type {
  ContextPayload, ChapterSummary, GenreType, GeminiConfig, StoryKernel,
} from '../types';

// ── AI Response Interfaces ───────────────────────────────────────────────────

interface CombinedAIResponse {
  summary?: string;
  openingSentence?: string;
  mcState?: string;
  cliffhanger?: string;
  characters?: Array<{
    character_name: string;
    status: string;
    power_level: string | null;
    power_realm_index: number | null;
    location: string | null;
    personality_quirks: string | null;
    notes: string | null;
  }>;
}

function formatStoryKernelContext(kernel: StoryKernel): string {
  const parts: string[] = ['[STORY KERNEL — MÁY TRUYỆN PHẢI PHỤC VỤ]'];
  parts.push(`Reader fantasy: ${kernel.readerFantasy}`);
  parts.push(`Protagonist engine: ${kernel.protagonistEngine}`);
  if (kernel.pleasureLoop?.length) parts.push(`Pleasure loop: ${kernel.pleasureLoop.join(' → ')}`);
  if (kernel.systemMechanic) {
    parts.push(`System mechanic: ${kernel.systemMechanic.name} | input: ${kernel.systemMechanic.input} | output: ${kernel.systemMechanic.output} | limit: ${kernel.systemMechanic.limit} | reward: ${kernel.systemMechanic.reward}`);
  }
  if (kernel.phase1Playground) {
    parts.push(`Phase 1 playground: ${[
      kernel.phase1Playground.locations?.join(', '),
      kernel.phase1Playground.cast?.join(', '),
      kernel.phase1Playground.repeatableSceneTypes?.join(', '),
    ].filter(Boolean).join(' | ')}`);
  }
  if (kernel.socialReactor) {
    parts.push(`Social reactor: ${kernel.socialReactor.witnesses?.join(', ')} | reactions: ${kernel.socialReactor.reactionModes?.join(', ')} | cadence: ${kernel.socialReactor.reportBackCadence}`);
  }
  if (kernel.noveltyLadder?.length) {
    parts.push(`Novelty ladder: ${kernel.noveltyLadder.map(n => `${n.chapterRange}: ${n.newToy}`).join(' / ')}`);
  }
  if (kernel.controlRules) {
    parts.push(`Control rules: payoff ${kernel.controlRules.payoffCadence}; attention ${kernel.controlRules.attentionGradient}; open ${kernel.controlRules.openThreadsPerArc}/arc, close ${kernel.controlRules.closeThreadsPerArc}/arc.`);
  }
  parts.push('→ Chapter này phải phục vụ pleasureLoop + noveltyLadder + controlRules; mở rộng scene nhưng không đổi engine.');
  return parts.join('\n');
}

interface SynopsisAIResponse {
  synopsis_text?: string;
  mc_current_state?: string;
  active_allies?: string[];
  active_enemies?: string[];
  open_threads?: string[];
}

interface ArcSubArcEntry {
  sub_arc_number: number;
  start_chapter: number;
  end_chapter: number;
  theme: string;
  mini_payoff: string;
}

interface ArcPlanAIResponse {
  arc_theme?: string;
  plan_text?: string;
  sub_arcs?: ArcSubArcEntry[];
  chapter_briefs?: Array<{ chapterNumber: number; brief: string; sub_arc_number?: number }>;
  threads_to_advance?: string[];
  threads_to_resolve?: string[];
  new_threads?: string[];
}

// ── Phase 26: Volume context block (đại thần workflow simulation) ───────────
//
// MasterOutline (post-Phase-26) carries `volumes` hierarchy: 5-15 volumes ×
// 4-6 sub-arcs each. At any chapter we inject a compact ~2K-char block telling
// the Architect:
//   - Where in the overall novel are we (volume index, % through novel)?
//   - What's THIS volume's theme/conflict/villain/payoffs?
//   - What sub-arc are we in + its medium-climax target?
//   - Distance to next medium-climax + this volume's major-climax
//   - Brief preview of the next volume (so transitions don't surprise readers)
//
// Returns null if outline doesn't have volumes (legacy pre-Phase-26 novels).

interface RawVolume {
  volumeNumber?: number;
  name?: string;
  startChapter?: number;
  endChapter?: number;
  theme?: string;
  primaryConflict?: string;
  primaryVillain?: string | null;
  keyPayoffsOpened?: string[];
  keyPayoffsClosed?: string[];
  volumeClimaxAt?: number;
  subArcs?: Array<{
    arcName?: string;
    arcNumber?: number;
    startChapter?: number;
    endChapter?: number;
    description?: string;
    keyMilestone?: string;
    theme?: string;
    mood?: string;
    biggestSetpiece?: string;
    characterArcBeat?: string;
    worldExpansion?: string;
    pacingTarget?: string;
    mediumClimaxAt?: number;
  }>;
}

function buildVolumeContextBlock(
  rawMasterOutline: unknown,
  chapterNumber: number,
): string | undefined {
  if (!rawMasterOutline || typeof rawMasterOutline !== 'object') return undefined;
  const mo = rawMasterOutline as { volumes?: RawVolume[]; mainPlotline?: string };
  if (!Array.isArray(mo.volumes) || mo.volumes.length === 0) return undefined;

  const volumes = mo.volumes;
  const currentVol = volumes.find(
    v => typeof v.startChapter === 'number' &&
         typeof v.endChapter === 'number' &&
         chapterNumber >= v.startChapter &&
         chapterNumber <= v.endChapter,
  );
  if (!currentVol) return undefined;

  const currentSubArc = (currentVol.subArcs || []).find(
    s => typeof s.startChapter === 'number' &&
         typeof s.endChapter === 'number' &&
         chapterNumber >= s.startChapter &&
         chapterNumber <= s.endChapter,
  );

  const totalVolumes = volumes.length;
  const volStart = currentVol.startChapter || 0;
  const volEnd = currentVol.endChapter || 0;
  const volLen = Math.max(1, volEnd - volStart + 1);
  const positionPct = Math.round(((chapterNumber - volStart) / volLen) * 100);

  let positionLabel = 'mid';
  if (positionPct < 25) positionLabel = 'early (setup)';
  else if (positionPct < 60) positionLabel = 'mid (escalation)';
  else if (positionPct < 85) positionLabel = 'late (pre-climax)';
  else positionLabel = 'climax / wind-down';

  const distanceToVolumeClimax = currentVol.volumeClimaxAt
    ? currentVol.volumeClimaxAt - chapterNumber
    : null;
  const distanceToMediumClimax = currentSubArc?.mediumClimaxAt
    ? currentSubArc.mediumClimaxAt - chapterNumber
    : null;
  const distanceToVolumeEnd = volEnd - chapterNumber;

  const nextVol = volumes.find(v => (v.volumeNumber || 0) === ((currentVol.volumeNumber || 0) + 1));

  const lines: string[] = [
    '[VOLUME CONTEXT — VỊ TRÍ TRONG ĐẠI CƯƠNG, BẮT BUỘC GIỮ NHẤT QUÁN VỚI VOLUME ARC]',
    `📚 Truyện chia ${totalVolumes} cuốn. Đang ở: Cuốn ${currentVol.volumeNumber}/${totalVolumes} — "${currentVol.name || ''}"`,
    `   • Chương ${chapterNumber} — ${positionPct}% qua volume (${positionLabel})`,
    `   • Volume range: ch.${volStart} → ch.${volEnd} (${volLen} chương). Còn ${distanceToVolumeEnd} chương đến hết volume.`,
  ];

  if (currentVol.theme) lines.push(`   • Theme cuốn: ${currentVol.theme}`);
  if (currentVol.primaryConflict) lines.push(`   • Xung đột chính cuốn: ${currentVol.primaryConflict}`);
  if (currentVol.primaryVillain) lines.push(`   • Đối thủ chính cuốn: ${currentVol.primaryVillain}`);

  if (currentVol.keyPayoffsOpened?.length) {
    lines.push(`   • Promise volume này MỞ (cần payoff sau): ${currentVol.keyPayoffsOpened.slice(0, 4).join(' | ')}`);
  }
  if (currentVol.keyPayoffsClosed?.length) {
    lines.push(`   • Promise volume này ĐÓNG (đã hoặc sẽ resolve trong volume): ${currentVol.keyPayoffsClosed.slice(0, 4).join(' | ')}`);
  }

  if (distanceToVolumeClimax !== null) {
    if (distanceToVolumeClimax > 0) {
      lines.push(`   ⚡ Volume CLIMAX (setpiece lớn) ở ch.${currentVol.volumeClimaxAt} — còn ${distanceToVolumeClimax} chương. ${distanceToVolumeClimax <= 10 ? 'BUILD-UP intensify ngay từ bây giờ.' : 'Còn xa — KHÔNG triển climax sớm.'}`);
    } else if (distanceToVolumeClimax === 0) {
      lines.push(`   ⚡ CHƯƠNG NÀY = VOLUME CLIMAX. Setpiece lớn nhất volume PHẢI xảy ra trong chương này.`);
    } else {
      lines.push(`   ⚡ Volume climax đã qua (ch.${currentVol.volumeClimaxAt}). Đang ở wind-down phase — đóng các thread của volume.`);
    }
  }

  if (currentSubArc) {
    lines.push('');
    lines.push(`📖 Sub-arc hiện tại: "${currentSubArc.arcName || ''}" (ch.${currentSubArc.startChapter}-${currentSubArc.endChapter})`);
    if (currentSubArc.theme) lines.push(`   • Theme: ${currentSubArc.theme}`);
    if (currentSubArc.mood) lines.push(`   • Mood: ${currentSubArc.mood}`);
    if (currentSubArc.pacingTarget) lines.push(`   • Pacing: ${currentSubArc.pacingTarget}`);
    if (currentSubArc.biggestSetpiece) lines.push(`   • Setpiece sub-arc: ${currentSubArc.biggestSetpiece}`);
    if (currentSubArc.characterArcBeat) lines.push(`   • MC inner arc: ${currentSubArc.characterArcBeat}`);
    if (currentSubArc.keyMilestone) lines.push(`   • Milestone đạt được cuối sub-arc: ${currentSubArc.keyMilestone}`);
    if (distanceToMediumClimax !== null) {
      if (distanceToMediumClimax > 0) {
        lines.push(`   • Medium climax sub-arc ở ch.${currentSubArc.mediumClimaxAt} — còn ${distanceToMediumClimax} chương.`);
      } else if (distanceToMediumClimax === 0) {
        lines.push(`   • CHƯƠNG NÀY = MEDIUM CLIMAX sub-arc. Reveal/turn quan trọng trong sub-arc PHẢI xảy ra.`);
      }
    }
  }

  if (nextVol && distanceToVolumeEnd <= 15) {
    lines.push('');
    lines.push(`🔮 Cuốn kế: ${nextVol.volumeNumber}/${totalVolumes} — "${nextVol.name || ''}"${nextVol.theme ? ` (theme: ${nextVol.theme})` : ''}`);
    lines.push(`   → Còn ${distanceToVolumeEnd} chương đến volume transition. KHÔNG mở plot thread mới quá lớn — wind down volume hiện tại trước.`);
  }

  if (mo.mainPlotline) {
    lines.push('');
    lines.push(`🎯 Mục tiêu xuyên suốt truyện: ${mo.mainPlotline}`);
  }

  lines.push('[/VOLUME CONTEXT]');
  return lines.join('\n');
}

// ── Load Context ─────────────────────────────────────────────────────────────

export async function loadContext(
  projectId: string,
  novelId: string,
  chapterNumber: number,
): Promise<ContextPayload> {
  const db = getSupabase();
  const prevChapter = chapterNumber - 1;

  // Parallel DB queries
  const [
    bridgeResult,
    bibleResult,
    synopsisResult,
    recentResult,
    arcResult,
    masterOutlineResult,
    titlesResult,
    openingsResult,
    cliffhangersResult,
    charStatesResult,
    recentFullTextResult,
  ] = await Promise.all([
    // Layer 0: Chapter Bridge
    prevChapter > 0
      ? Promise.all([
          db.from('chapter_summaries').select('summary,mc_state,cliffhanger').eq('project_id', projectId).eq('chapter_number', prevChapter).maybeSingle(),
          db.from('chapters').select('content').eq('novel_id', novelId).eq('chapter_number', prevChapter).maybeSingle(),
        ])
      : Promise.resolve([{ data: null }, { data: null }] as const),
    // Layer 1: Story Bible
    db.from('ai_story_projects').select('story_bible').eq('id', projectId).maybeSingle(),
    // Layer 2: Synopsis
    db.from('story_synopsis').select('synopsis_text,mc_current_state,active_allies,active_enemies,open_threads,last_updated_chapter').eq('project_id', projectId).order('last_updated_chapter', { ascending: false }).limit(1).maybeSingle(),
    // Layer 3: Recent Chapter Summaries — keep summaries for the 12-chapter look-back window.
    // Full prose of last 3 chapters is loaded separately below (Q1 Stage 2).
    db.from('chapter_summaries').select('chapter_number,title,summary,mc_state,cliffhanger').eq('project_id', projectId).lt('chapter_number', chapterNumber).order('chapter_number', { ascending: false }).limit(12),
    // Layer 4: Arc Plan (incl. hyperpop sub-arcs from migration 0149)
    db.from('arc_plans').select('arc_number,start_chapter,end_chapter,arc_theme,plan_text,sub_arcs,chapter_briefs,threads_to_advance,threads_to_resolve,new_threads').eq('project_id', projectId).order('arc_number', { ascending: false }).limit(1).maybeSingle(),
    // Master Outline + Story Outline + WORLD DESCRIPTION (canonical premise source)
    db.from('ai_story_projects').select('master_outline,story_outline,world_description,sub_genres,mc_archetype,anti_tropes,style_directives').eq('id', projectId).maybeSingle(),
    // Anti-repetition: titles (cap at 50 most recent to reduce context size)
    db.from('chapters').select('title').eq('novel_id', novelId).order('chapter_number', { ascending: false }).limit(50),
    // Anti-repetition: openings
    db.from('chapter_summaries').select('opening_sentence').eq('project_id', projectId).order('chapter_number', { ascending: false }).limit(50),
    // Anti-repetition: cliffhangers
    db.from('chapter_summaries').select('cliffhanger').eq('project_id', projectId).order('chapter_number', { ascending: false }).limit(10),
    // Character states
    db.from('character_states').select('character_name,status,power_level,power_realm_index,location,personality_quirks,notes,chapter_number').eq('project_id', projectId).order('chapter_number', { ascending: false }).limit(50),
    // Phase 22 Q1: full prose of last 3 chapters for Writer voice/detail anchor
    db.from('chapters').select('chapter_number,title,content').eq('novel_id', novelId).lt('chapter_number', chapterNumber).order('chapter_number', { ascending: false }).limit(3),
  ]);

  // Build payload
  const [summaryData, endingData] = bridgeResult as [{ data: { summary?: string; mc_state?: string; cliffhanger?: string } | null }, { data: { content?: string } | null }];
  const bridge = summaryData?.data;
  const ending = endingData?.data;

  const bible = bibleResult?.data?.story_bible;
  const synopsis = synopsisResult?.data;
  const recentSummaries = (recentResult?.data || []).reverse();
  const arc = arcResult?.data;
  const rawMasterOutline = masterOutlineResult?.data?.master_outline;
  const masterOutline = rawMasterOutline
    ? (typeof rawMasterOutline === 'string' ? rawMasterOutline : JSON.stringify(rawMasterOutline))
    : undefined;
  const storyOutline = masterOutlineResult?.data?.story_outline;
  const setupKernel = storyOutline && typeof storyOutline === 'object'
    ? (storyOutline as { setupKernel?: StoryKernel }).setupKernel
    : undefined;
  // Layer -1: world_description — canonical premise source (hand-crafted at spawn).
  // CRITICAL: even if story_outline schema is wrong/incomplete, this guarantees Architect sees
  // the actual premise (golden finger, antagonists, setting). Was missing pre-Phase-21 fix.
  const worldDescription = (masterOutlineResult?.data as { world_description?: string } | null)?.world_description;

  // Modern narrative metadata (migration 0149)
  const projectMeta = masterOutlineResult?.data as {
    sub_genres?: string[];
    mc_archetype?: string;
    anti_tropes?: string[];
    style_directives?: Record<string, unknown>;
  } | null;

  // Build structured synopsis fields
  const synopsisStructured = synopsis ? {
    mc_current_state: synopsis.mc_current_state,
    active_allies: synopsis.active_allies || [],
    active_enemies: synopsis.active_enemies || [],
    open_threads: synopsis.open_threads || [],
  } : undefined;

  // Build arc plan threads
  const arcPlanThreads = arc ? {
    threads_to_advance: arc.threads_to_advance || [],
    threads_to_resolve: arc.threads_to_resolve || [],
    new_threads: arc.new_threads || [],
  } : undefined;

  // Deduplicate character states (latest per character)
  interface CharacterStateRow {
    character_name: string;
    status: string;
    power_level: string | null;
    power_realm_index: number | null;
    location: string | null;
    personality_quirks: string | null;
    notes: string | null;
    chapter_number: number;
  }
  const charMap = new Map<string, CharacterStateRow>();
  for (const cs of (charStatesResult?.data || [])) {
    if (!charMap.has(cs.character_name)) charMap.set(cs.character_name, cs);
  }
  const characters = [...charMap.values()];
  const aliveChars = characters.filter(c => c.status === 'alive');
  const deadChars = characters.filter(c => c.status === 'dead');

  let charText: string | undefined;
  if (characters.length > 0) {
    const parts: string[] = ['[NHÂN VẬT HIỆN TẠI — CẤM MÂU THUẪN]'];
    for (const c of aliveChars) {
      let line = `• ${c.character_name} (${c.status})`;
      if (c.power_level) line += ` — ${c.power_level}`;
      if (c.location) line += ` tại ${c.location}`;
      // 2026-04-29 audit fix: personality_quirks was saved by character-tracker
      // but never rendered into context. Engine had character speech consistency
      // signals it was throwing away. Now included before generic notes.
      if (c.personality_quirks) line += ` | quirks: ${c.personality_quirks}`;
      if (c.notes) line += ` | ${c.notes}`;
      parts.push(line);
    }
    if (deadChars.length > 0) {
      parts.push(`\nĐÃ CHẾT (KHÔNG ĐƯỢC XUẤT HIỆN): ${deadChars.map(c => c.character_name).join(', ')}`);
    }
    charText = parts.join('\n');
  }

  // Chapter brief from arc plan
  let chapterBrief: string | undefined;
  let currentSubArc: string | undefined;
  if (arc?.chapter_briefs && Array.isArray(arc.chapter_briefs)) {
    const brief = (arc.chapter_briefs as Array<{ chapterNumber: number; brief: string; sub_arc_number?: number }>)
      .find(b => b.chapterNumber === chapterNumber);
    chapterBrief = brief?.brief;

    // Hyperpop sub-arc context: find the sub-arc containing this chapter
    if (arc?.sub_arcs && Array.isArray(arc.sub_arcs)) {
      const subArc = (arc.sub_arcs as ArcSubArcEntry[])
        .find(sa => chapterNumber >= sa.start_chapter && chapterNumber <= sa.end_chapter);
      if (subArc) {
        const chaptersIntoSubArc = chapterNumber - subArc.start_chapter + 1;
        const subArcLength = subArc.end_chapter - subArc.start_chapter + 1;
        const isClosing = chapterNumber === subArc.end_chapter;
        const closingNote = isClosing ? ' ← CHƯƠNG CUỐI SUB-ARC: BẮT BUỘC PAYOFF cho mini-payoff này.' : '';
        currentSubArc = `Sub-arc ${subArc.sub_arc_number} (${subArc.start_chapter}-${subArc.end_chapter}, chương ${chaptersIntoSubArc}/${subArcLength}): "${subArc.theme}"\n  Mini-payoff cuối sub-arc: ${subArc.mini_payoff}${closingNote}`;
      }
    }
  }

  // Anti-self-torture: build recent_beat_history from last 3 chapter summaries.
  // Heuristic: scan summary/mc_state/cliffhanger for setback signals to flag chapters
  // that beat down MC, so Architect can avoid back-to-back beat-downs.
  const SETBACK_PATTERNS = /(thất bại|bại trận|bị thương|bị đánh|bị dập|bị bắt|bị giam|tuyệt vọng|đau khổ|tủi nhục|nhục nhã|bế tắc|nguy kịch|hấp hối|sắp chết|kẻ thù chèn ép|bị truy sát|thua thiệt|bất lực|phẫn uất|tan vỡ|sụp đổ|mất hết|cướp mất)/i;
  const recentBeatHistoryLines: string[] = [];
  const last3 = recentSummaries.slice(-3) as Array<{ chapter_number: number; title: string; summary: string; mc_state?: string; cliffhanger?: string }>;
  for (const ch of last3) {
    const blob = `${ch.summary || ''} ${ch.mc_state || ''} ${ch.cliffhanger || ''}`;
    const isSetback = SETBACK_PATTERNS.test(blob);
    recentBeatHistoryLines.push(`Ch.${ch.chapter_number}: ${isSetback ? '⚠️ SETBACK/CONFLICT' : '✓ ổn/tích cực'} — ${(ch.cliffhanger || ch.mc_state || ch.summary || '').slice(0, 100)}`);
  }
  const recentBeatHistory = recentBeatHistoryLines.length > 0 ? recentBeatHistoryLines.join('\n') : undefined;

  return {
    previousSummary: bridge?.summary,
    previousMcState: bridge?.mc_state,
    previousCliffhanger: bridge?.cliffhanger,
    previousEnding: ending?.content ? ending.content.slice(-500) : undefined,
    recentBeatHistory,
    storyBible: bible,
    hasStoryBible: !!bible,
    synopsis: synopsis?.synopsis_text,
    synopsisStructured,
    recentChapters: recentSummaries.map((c: { chapter_number: number; title: string; summary: string; mc_state?: string; cliffhanger?: string }) => {
      // Use summaries instead of full text — saves ~5-20K chars per chapter
      const parts = [`[Ch.${c.chapter_number}: "${c.title}"]`, c.summary || ''];
      if (c.mc_state) parts.push(`MC: ${c.mc_state}`);
      if (c.cliffhanger) parts.push(`Hook: ${c.cliffhanger}`);
      return parts.join('\n');
    }),
    arcPlan: arc?.plan_text,
    chapterBrief,
    currentSubArc,
    arcPlanThreads,
    previousTitles: (titlesResult?.data || []).map((t: { title: string }) => t.title).filter(Boolean),
    recentOpenings: (openingsResult?.data || []).map((o: { opening_sentence: string }) => o.opening_sentence).filter(Boolean),
    recentCliffhangers: (cliffhangersResult?.data || []).map((c: { cliffhanger: string }) => c.cliffhanger).filter(Boolean),
    characterStates: charText,
    knownCharacterNames: characters.map(c => c.character_name),
    genreBoundary: undefined, // set by orchestrator
    ragContext: undefined,    // set by orchestrator
    arcChapterSummaries: undefined, // loaded separately for synopsis generation
    recentChapterFullText: ((recentFullTextResult?.data as Array<{ chapter_number: number; title: string; content: string }> | null) || []).reverse(),
    masterOutline: typeof masterOutline === 'string' ? masterOutline : (masterOutline ? JSON.stringify(masterOutline) : undefined),
    volumeContext: buildVolumeContextBlock(rawMasterOutline, chapterNumber),
    castRoster: await (async () => {
      const { getCastRosterContext } = await import('../state/cast-database');
      return getCastRosterContext(projectId, chapterNumber).catch(() => null);
    })() || undefined,
    timelineContext: await (async () => {
      const { getTimelineContext } = await import('../state/timeline');
      return getTimelineContext(projectId, chapterNumber).catch(() => null);
    })() || undefined,
    inventoryContext: await (async () => {
      const { getInventoryContext } = await import('../state/item-inventory');
      // Use protagonist from project meta — fallback to first character if missing.
      const { data: projectRow } = await db.from('ai_story_projects').select('main_character').eq('id', projectId).maybeSingle();
      const protagonist = (projectRow as { main_character?: string } | null)?.main_character || characters[0]?.character_name || 'MC';
      return getInventoryContext(projectId, chapterNumber, protagonist).catch(() => null);
    })() || undefined,
    powerSystemCanonContext: await (async () => {
      const { getPowerSystemCanonContext } = await import('../canon/power-system');
      return getPowerSystemCanonContext(projectId).catch(() => null);
    })() || undefined,
    factionsContext: await (async () => {
      const { getFactionsContext } = await import('../canon/factions');
      return getFactionsContext(projectId, chapterNumber).catch(() => null);
    })() || undefined,
    plotTwistsContext: await (async () => {
      const { getPlotTwistsContext } = await import('../plan/plot-twists');
      return getPlotTwistsContext(projectId, chapterNumber).catch(() => null);
    })() || undefined,
    themesContext: await (async () => {
      const { getThemesContext } = await import('../plan/themes');
      return getThemesContext(projectId, chapterNumber).catch(() => null);
    })() || undefined,
    worldbuildingCanonContext: await (async () => {
      const { getWorldbuildingCanonContext } = await import('../canon/worldbuilding');
      return getWorldbuildingCanonContext(projectId).catch(() => null);
    })() || undefined,
    voiceAnchorContext: await (async () => {
      const { getVoiceAnchorContext } = await import('../memory/voice-anchor');
      return getVoiceAnchorContext(projectId, chapterNumber).catch(() => null);
    })() || undefined,
    rollingBriefsContext: await (async () => {
      const { getRollingBriefsContext } = await import('../plan/chapter-briefs');
      return getRollingBriefsContext(projectId, chapterNumber).catch(() => null);
    })() || undefined,
    storyOutline: storyOutline || undefined,
    setupKernel,
    worldDescription: worldDescription || undefined,
    // Modern narrative metadata (migration 0149)
    subGenres: validateSubGenreKeys((projectMeta?.sub_genres || []) as string[], projectId),
    mcArchetype: projectMeta?.mc_archetype as ContextPayload['mcArchetype'],
    antiTropes: (projectMeta?.anti_tropes || []) as ContextPayload['antiTropes'],
    styleDirectives: (projectMeta?.style_directives || undefined) as ContextPayload['styleDirectives'],
  };
}

// ── Assemble Context String ──────────────────────────────────────────────────

export function assembleContext(payload: ContextPayload, chapterNumber: number): string {
  const parts: string[] = [];

  if (payload.setupKernel) {
    parts.push(formatStoryKernelContext(payload.setupKernel));
  }

  // Layer -1: WORLD DESCRIPTION (canonical premise — HIGHEST PRIORITY)
  // Hand-crafted at spawn time, contains golden finger rules, antagonist details, setting,
  // MC starting state. CRITICAL guarantee: even if story_outline schema is wrong or
  // master_outline is generic, world_description anchors every chapter to the real premise.
  if (payload.worldDescription) {
    parts.push('[WORLD DESCRIPTION — PREMISE GỐC, BÁM SÁT TUYỆT ĐỐI, KHÔNG ĐƯỢC LẠC ĐỀ]');
    parts.push(payload.worldDescription.slice(0, 8000));  // Cap to keep prompt budget; trim from end if needed
  }

  // Layer 0.5: Master Outline
  if (payload.masterOutline) {
    parts.push('[ĐẠI CƯƠNG TOÀN TRUYỆN - BẮT BUỘC BÁM SÁT LỘ TRÌNH ĐỂ TRÁNH LAN MAN]');
    parts.push(payload.masterOutline.slice(0, 5000));
  }

  // Layer 0.5b: Phase 26 — Volume + Sub-arc context (đại thần workflow)
  // Compact ~2K block telling Architect where in the 1000-chapter map we are.
  if (payload.volumeContext) {
    parts.push(payload.volumeContext);
  }

  // Layer 0.5c: Phase 27 W2.1 — Comprehensive cast roster (đại thần 角色档案)
  if (payload.castRoster) {
    parts.push(payload.castRoster);
  }

  // Layer 0.5d: Phase 27 W2.4 — Power system canon (đại thần 修炼体系)
  // Generated ONCE at project setup. Comprehensive ladder + breakthrough rules.
  if (payload.powerSystemCanonContext) {
    parts.push(payload.powerSystemCanonContext);
  }

  // Layer 0.5e: Phase 27 W2.5 — Active factions registry (đại thần 势力档案)
  if (payload.factionsContext) {
    parts.push(payload.factionsContext);
  }

  // Layer 0.5f: Phase 27 W2.2 — Story timeline (đại thần 时间线)
  if (payload.timelineContext) {
    parts.push(payload.timelineContext);
  }

  // Layer 0.5g: Phase 27 W2.3 — Item inventory (đại thần 物品系统)
  if (payload.inventoryContext) {
    parts.push(payload.inventoryContext);
  }

  // Layer 0.5h: Phase 27 W3.3 — Worldbuilding canon (đại thần 设定集)
  if (payload.worldbuildingCanonContext) {
    parts.push(payload.worldbuildingCanonContext);
  }

  // Layer 0.5i: Phase 27 W3.1 — Plot twists (đại thần 反转表)
  if (payload.plotTwistsContext) {
    parts.push(payload.plotTwistsContext);
  }

  // Layer 0.5j: Phase 27 W3.2 — Themes (đại thần 主题)
  if (payload.themesContext) {
    parts.push(payload.themesContext);
  }

  // Layer 0.5k: Phase 27 W4.2 — Voice anchor (đại thần 声音锚)
  if (payload.voiceAnchorContext) {
    parts.push(payload.voiceAnchorContext);
  }

  // Layer 0.5l: Phase 27 W5.4 — Rolling chapter briefs (đại thần 日大纲)
  // Detailed briefs for next 1-3 chapters; Architect plants seeds + avoids dead-ends.
  if (payload.rollingBriefsContext) {
    parts.push(payload.rollingBriefsContext);
  }

  // Layer 0.6: Story Outline (premise, protagonist, plot points, ending vision)
  if (payload.storyOutline) {
    const outline = payload.storyOutline;
    const outlineParts: string[] = ['[STORY OUTLINE — HƯỚNG ĐI CỐT TRUYỆN]'];
    if (outline.premise) outlineParts.push(`Premise: ${outline.premise}`);
    if (outline.mainConflict) outlineParts.push(`Xung đột chính: ${outline.mainConflict}`);
    if (outline.themes?.length) outlineParts.push(`Chủ đề: ${outline.themes.join(', ')}`);
    if (outline.protagonist) {
      const p = outline.protagonist;
      outlineParts.push(`MC: ${p.name || 'MC'}`);
      if (p.startingState) outlineParts.push(`  Khởi điểm: ${p.startingState}`);
      if (p.endGoal) outlineParts.push(`  Mục tiêu cuối: ${p.endGoal}`);
      if (p.characterArc) outlineParts.push(`  Hành trình: ${p.characterArc}`);
    }
    if (outline.majorPlotPoints?.length) {
      outlineParts.push('Plot Points chính:');
      for (const pp of outline.majorPlotPoints.slice(0, 8)) {
        const name = pp.name || pp.event || '';
        const desc = pp.description || '';
        outlineParts.push(`  • ${name}${desc ? ': ' + desc : ''}`);
      }
    }
    if (outline.endingVision) outlineParts.push(`Kết cục: ${outline.endingVision}`);
    if (outline.uniqueHooks?.length) outlineParts.push(`Hooks: ${outline.uniqueHooks.join(', ')}`);

    // P2.3: Cast roster — Architect/Writer DÙNG TÊN NÀY thay vì invent. Without this,
    // Architect tự sáng tạo supporting characters mỗi chương (Khánh ch.1 → Khang ch.3).
    const castRoster = (outline as { castRoster?: Array<{ name?: string; role?: string; relationToMC?: string; introduceArc?: number; archeType?: string }> }).castRoster;
    if (castRoster && castRoster.length > 0) {
      outlineParts.push('');
      outlineParts.push('[CAST ROSTER — DÙNG ĐÚNG TÊN NÀY, KHÔNG INVENT]');
      for (const c of castRoster) {
        if (!c.name) continue;
        const role = c.role || '';
        const rel = c.relationToMC || '';
        const arc = c.introduceArc ? ` (xuất hiện từ arc ${c.introduceArc})` : '';
        const type = c.archeType ? ` [${c.archeType}]` : '';
        outlineParts.push(`  • ${c.name} — ${role}${rel ? ' / ' + rel : ''}${arc}${type}`);
      }
      outlineParts.push('→ KHI cần named NPC trong scene, chọn từ roster trên. CHỈ invent NPC nhỏ (vd "anh shipper", "chị bán cá") khi roster không có vai phù hợp.');
    }

    // World rules + tone flags + anti-tropes — Architect/Critic dùng để enforce.
    const worldRules = (outline as { worldRules?: string[] }).worldRules;
    if (worldRules && worldRules.length > 0) {
      outlineParts.push('');
      outlineParts.push('[WORLD RULES — TUÂN THỦ XUYÊN SUỐT]');
      for (const r of worldRules) outlineParts.push(`  • ${r}`);
    }
    const antiTropes = (outline as { antiTropes?: string[] }).antiTropes;
    if (antiTropes && antiTropes.length > 0) {
      outlineParts.push('');
      outlineParts.push('[ANTI-TROPES — CẤM TUYỆT ĐỐI]');
      for (const t of antiTropes) outlineParts.push(`  ✗ ${t}`);
    }

    // Diagnostic: warn if story_outline yielded only the header (schema-mismatch
    // signature). This was the silent-bug pattern from the 2026-04-29 incident
    // where 2 spawn scripts saved wrong-schema outlines → context-assembler
    // dropped every field. With validator at spawn time this should never
    // happen, but the runtime warning is a safety net for legacy data.
    if (outlineParts.length <= 2) {
      console.warn(`[context-assembler] story_outline yielded ${outlineParts.length - 1} fields (only header). Schema may be wrong — check fields: premise/mainConflict/themes/majorPlotPoints. Falling back to world_description for premise grounding.`);
    }
    parts.push(outlineParts.join('\n'));
  }

  // ── Modern narrative metadata (migration 0149) — INJECTED EARLY (high priority) ──
  const hasMeta = (payload.subGenres?.length || payload.mcArchetype || payload.antiTropes?.length || payload.styleDirectives);
  if (hasMeta) {
    const metaParts: string[] = ['[NARRATIVE DIRECTIVES — TUYỆT ĐỐI BẮT BUỘC]'];

    if (payload.subGenres?.length) {
      metaParts.push(`Genre blending: PRIMARY + sub-genres = [${payload.subGenres.join(', ')}]. Truyện này blend conventions từ MULTIPLE genres — KHÔNG ép theo single-genre formula. Đặc biệt khi nội dung overlap (vd: do-thi+trong-sinh+kinh-doanh thì phải có yếu tố trọng sinh advantage + business cycle proactive cùng lúc).`);
    }

    if (payload.mcArchetype) {
      const archetypeGuide: Record<string, string> = {
        power_fantasy: 'POWER_FANTASY: MC leveling-grinding, classic Qidian-style. Power-up moments, breakthroughs, escalating combat.',
        intelligent: 'INTELLIGENT MC (Qixia 《十日终焉》-style): MC THẮNG BẰNG KIẾN THỨC, MƯU KẾ, TÂM LÝ — KHÔNG qua power-up/hệ thống. Mỗi conflict resolve qua observation + deduction + manipulation. CẤM cho MC dùng "ngộ tính siêu phàm" hoặc "đột phá lực" làm key. Phải show thinking process explicit.',
        pragmatic: 'PRAGMATIC MC: tính toán, risk-averse, business-minded. KHÔNG impulsive. Mọi quyết định có cost-benefit analysis. Thắng bằng strategy + resource management.',
        coward_smart: 'COWARD-SMART MC: yếu sức mạnh nhưng cunning. CẤM heroics; MC chọn trốn/lừa/bargain trước khi đối đầu. Hài hước qua self-aware "tôi sống là chính".',
        family_pillar: 'FAMILY PILLAR MC: gia tộc multi-gen focus, trách nhiệm với người thân là động cơ chính. Side characters (cha mẹ, huynh đệ, con cháu) có arc riêng. KHÔNG lone-wolf.',
        career_driven: 'CAREER-DRIVEN MC (大女主-style): sự nghiệp/danh tiếng là MAIN tuyến, romance là phụ. MC tự đưa quyết định lớn, không cần "tổng tài bảo hộ". Empowering + pragmatic tone.',
      };
      metaParts.push(`MC ARCHETYPE: ${archetypeGuide[payload.mcArchetype] || payload.mcArchetype}`);
    }

    if (payload.antiTropes?.length) {
      const antiTropeGuide: Record<string, string> = {
        no_system: 'CẤM "hệ thống cheat" / "lão gia trong nhẫn" / "system báo nhiệm vụ" — MC không có golden finger.',
        no_harem: 'CẤM harem — single love interest hoặc no romance.',
        no_invincible: 'CẤM MC vô địch — MC có thể thua, gặp thất bại thực tế. Power không tự động giải quyết mọi việc.',
        no_face_slap: 'CẤM pattern "kẻ thù coi thường → MC nghiền nát" — đối thủ không tồn tại để bị đánh mặt.',
        no_rebirth_advantage: 'CẤM dùng kiến thức tương lai trắng trợn — trọng sinh có thể có nhưng MC phải có lý do hợp lý cho quyết định, không phải "tôi biết tương lai nên...".',
        no_misery_porn: 'CẤM tự ngược — MC vượt qua khó khăn không quá đau khổ, không khóc lóc lê thê.',
        no_secret_identity: 'CẤM "thân phận bí ẩn cực khủng" — MC là MC, không phải "con rơi gia tộc đỉnh / binh vương trở về".',
        no_tournament: 'CẤM tournament arc / sect war / faction rivalry cliché.',
        no_cliffhanger_mandate: 'KHÔNG ép cliffhanger nguy hiểm mọi chương — emotional/reveal/comfort endings được khuyến khích.',
      };
      const activeFlags = payload.antiTropes.map(f => `• ${antiTropeGuide[f] || f}`).join('\n');
      metaParts.push(`ANTI-TROPE FLAGS (TUYỆT ĐỐI BẮT BUỘC):\n${activeFlags}`);
    }

    if (payload.styleDirectives) {
      const sd = payload.styleDirectives;
      const directives: string[] = [];
      if (sd.cliffhanger_density) directives.push(`Cliffhanger density: ${sd.cliffhanger_density}`);
      if (sd.sub_arc_length) directives.push(`Sub-arc length: ${sd.sub_arc_length} chương resolve`);
      if (sd.target_chapter_length_override) directives.push(`Chapter target length override: ${sd.target_chapter_length_override} từ`);
      if (sd.variant_id) directives.push(`Variant: ${sd.variant_id}`);
      if (directives.length) metaParts.push(`STYLE DIRECTIVES: ${directives.join(' | ')}`);

      // MC starting archetype guide
      if (sd.starting_archetype) {
        const archetypeGuide: Record<string, string> = {
          'phe-vat': 'PHẾ VẬT classic: MC bắt đầu ở vị trí thấp (cô nhi, bị khinh, gia đình nghèo) NHƯNG có tiềm năng. CẨN THẬN: TQ 2024 đã chán pattern này, chỉ dùng cho fantasy/wuxia genre. Tránh "khổ vãi đái" sến.',
          'professional': 'PROFESSIONAL REBORN (TRENDING 2024-2026): MC đã có nghề (kỹ sư, bác sĩ, doanh nhân nhỏ, sinh viên giỏi), gia đình OK, KHÔNG có bi kịch. MC chỉ cần "ngón tay vàng" để cất cánh. Tone pragmatic, không cần khóc lóc trước khi thành công.',
          'privileged': 'PRIVILEGED BACKGROUND: MC con nhà giàu / thiếu gia tập đoàn / hậu duệ gia tộc. Bắt đầu đã có resource, chỉ cần khôn ngoan + cơ duyên để phát triển lên đỉnh. KHÔNG cần "phế vật → bá chủ" arc.',
          'rebirth-memory': 'REBIRTH MEMORY ONLY: MC trọng sinh nhưng KHÔNG có hệ thống/huyền bí. Power duy nhất = ký ức tương lai 25 năm. Pure pragmatic — biết deal nào đáng, tránh bẫy nào, đầu tư đâu trúng. KHÔNG combat/fantasy.',
          'quasi-normal': 'QUASI-NORMAL LIFE: MC đời sống bình thường, một sự kiện nhỏ kích hoạt (gặp người, nhặt vật, đọc sách). Tone slice-of-life cozy. Ít drama, low-stakes nhưng warm. Match cozy-trend 2024.',
          'family-pillar': 'FAMILY PILLAR: MC là core của gia tộc multi-gen. Bắt đầu đã có trách nhiệm gia đình (cha mẹ, anh em, con cháu sau). Group narrative thay vì lone wolf. Side characters quan trọng có arc riêng.',
        };
        metaParts.push(`MC STARTING ARCHETYPE: ${archetypeGuide[sd.starting_archetype] || sd.starting_archetype}`);
      }

      // Tone profile guide
      if (sd.tone_profile) {
        const toneGuide: Record<string, string> = {
          empowering: 'EMPOWERING: MC tự tin từ đầu, action-oriented, không tự ti. Tone hào sảng, tích cực.',
          pragmatic: 'PRAGMATIC: MC tính toán, không cảm tính, business-minded. Mọi quyết định có cost-benefit analysis. Tone calculated, mature.',
          hopeful: 'HOPEFUL: MC ngây thơ nhưng có tiềm năng. Tone optimistic, mild stakes, curious về thế giới.',
          cozy: 'COZY: MC nhẹ nhàng, low-drama, warm. Slice-of-life vibes. Mỗi chương có khoảnh khắc bình yên.',
          'bi-revenge': 'BI-REVENGE: Khắc khổ, revenge-driven. CHỈ dùng khi genre yêu cầu (kiem-hiep, classic tien-hiep). Bi tráng nhưng không tự ngược.',
          cynical: 'CYNICAL: MC adult, biết đời, không ảo tưởng. Tone slightly dark humor, world-weary nhưng không bitter.',
        };
        metaParts.push(`TONE PROFILE: ${toneGuide[sd.tone_profile] || sd.tone_profile}`);
      }

      // Anti-seeds blacklist (per-project — beyond UNIVERSAL_ANTI_SEEDS in Architect)
      if (sd.anti_seeds && sd.anti_seeds.length) {
        metaParts.push(`PROJECT ANTI-SEEDS: ${sd.anti_seeds.join('; ')}`);
      }
    }

    parts.push(metaParts.join('\n'));
  }

  // Layer 0: Chapter Bridge (highest priority)
  if (payload.previousCliffhanger || payload.previousSummary) {
    parts.push('[CẦU NỐI CHƯƠNG — BẮT BUỘC TUÂN THỦ]');
    if (payload.previousCliffhanger) {
      parts.push(`Cliffhanger chương trước: ${payload.previousCliffhanger}`);
      parts.push('→ PHẢI bắt đầu NGAY SAU tình huống này. KHÔNG skip, KHÔNG tóm tắt lại.');
    }
    if (payload.previousMcState) parts.push(`Trạng thái MC: ${payload.previousMcState}`);
    if (payload.previousSummary) parts.push(`Tóm tắt: ${payload.previousSummary}`);
    if (payload.previousEnding) parts.push(`300 ký tự cuối: ...${payload.previousEnding.slice(-300)}`);
  }

  // Anti-self-torture: recent beat history (last 3 chapters)
  if (payload.recentBeatHistory) {
    parts.push('[TRẠNG THÁI 3 CHƯƠNG GẦN ĐÂY — CHỐNG TỰ NGƯỢC, TƯ DUY THEO GIAI ĐOẠN]');
    parts.push(payload.recentBeatHistory);
    parts.push('→ Phân tích: chuỗi SETBACK liên tiếp = đang ở giữa 1 GIAI ĐOẠN ngược (cùng 1 sự kiện). Nếu giai đoạn đó đã 4+ chương → chương này PHẢI bắt đầu resolution.');
    parts.push('→ Nếu chương N-1 là SETBACK NHƯNG đã RESOLVE (kết thúc sự kiện) → chương này PHẢI là breathing, CẤM mở giai đoạn ngược mới ngay.');
    parts.push('→ Nếu chương N-1 là "ổn/tích cực" → có thể tiếp tục breathing, hoặc khởi đầu giai đoạn ngược mới NẾU đã có ≥1-3 chương breathing trước đó.');
    parts.push('→ KHÔNG cắt vụn 1 sự kiện đang diễn biến — diễn biến tự nhiên được ưu tiên hơn cắt nhịp cứng nhắc.');
  }

  // Character states
  if (payload.characterStates) parts.push(payload.characterStates);

  // Genre boundary
  if (payload.genreBoundary) parts.push(payload.genreBoundary);

  // RAG context — wrap with stable header tag so Writer can extract it from full context.
  // 2026-04-29 continuity overhaul: Writer now reads RAG too (was Architect-only before).
  if (payload.ragContext) {
    parts.push(`[KÝ ỨC LIÊN QUAN — TỪ CÁC CHƯƠNG XA, BẮT BUỘC GIỮ NHẤT QUÁN]\n${payload.ragContext}`);
  }

  // Scalability modules
  // 2026-04-29 audit fix: wrap with [TAG] headers so the assembled context has consistent
  // section boundaries. Without [TAG] prefix, regex extraction in Writer/Critic (terminator
  // `\n\n[`) extends past these sections into following content, causing leakage. The original
  // `═══ TUYẾN TRUYỆN ĐANG MỞ ═══` heading is now redundant but harmless inside the wrapped block.
  if (payload.plotThreads) parts.push(`[PLOT THREADS — TUYẾN TRUYỆN ĐANG MỞ + ĐÃ ĐÓNG]\n${payload.plotThreads}`);
  if (payload.beatGuidance) parts.push(`[BEAT GUIDANCE — NHỊP & COOLDOWN]\n${payload.beatGuidance}`);
  if (payload.worldRules) parts.push(payload.worldRules);

  // 2026-04-29 audit fix: wrap all context modules with [TAG] headers so Writer/Critic regex
  // extraction (`\[TAG[^\]]*\]...(?=\n\n\[|$)`) can both find them AND properly terminate at
  // section boundaries. Previously these returned with `═══ ... ═══` or freeform headers, so
  // Writer's quality-module extraction (looking for `[FORESHADOWING]` etc.) NEVER matched.
  // This is a major pre-existing bug — Writer was getting empty quality-module context all along.
  // Character knowledge graph
  if (payload.characterKnowledgeContext) parts.push(`[CHARACTER KNOWLEDGE — AI ĐÃ BIẾT GÌ]\n${payload.characterKnowledgeContext}`);
  if (payload.relationshipContext) parts.push(`[RELATIONSHIPS — TRẠNG THÁI MỐI QUAN HỆ]\n${payload.relationshipContext}`);
  if (payload.economicContext) parts.push(`[ECONOMIC LEDGER — TÀI CHÍNH]\n${payload.economicContext}`);

  // Quality modules (Qidian Master Level)
  if (payload.foreshadowingContext) parts.push(`[FORESHADOWING — GIEO/PAYOFF HINT]\n${payload.foreshadowingContext}`);
  if (payload.characterArcContext) parts.push(`[CHARACTER ARC — XUNG ĐỘT NỘI TÂM]\n${payload.characterArcContext}`);
  if (payload.pacingContext) parts.push(`[PACING — NHỊP CHƯƠNG]\n${payload.pacingContext}`);
  if (payload.voiceContext) parts.push(`[VOICE — GIỌNG VĂN]\n${payload.voiceContext}`);
  if (payload.powerContext) parts.push(`[POWER — CẢNH GIỚI MC]\n${payload.powerContext}`);
  if (payload.worldContext) parts.push(`[WORLD — LOCATION + WORLD STATE]\n${payload.worldContext}`);

  // Phase 22 continuity overhaul: durable bibles (refreshed every 50ch / 100ch).
  // Injected high — these are the consolidated truth Architect should anchor against.
  if (payload.characterBibleContext) parts.push(payload.characterBibleContext);
  if (payload.volumeSummaryContext) parts.push(payload.volumeSummaryContext);
  if (payload.geographyContext) parts.push(payload.geographyContext);

  // Layer 1: Story Bible
  if (payload.storyBible) {
    parts.push('[STORY BIBLE]');
    parts.push(payload.storyBible.slice(0, 4000));
  }

  // Layer 2: Synopsis
  if (payload.synopsis) {
    parts.push('[TỔNG QUAN CỐT TRUYỆN]');
    parts.push(payload.synopsis.slice(0, 3000));
    if (payload.synopsisStructured) {
      if (payload.synopsisStructured.mc_current_state) {
        parts.push(`Trạng thái MC: ${payload.synopsisStructured.mc_current_state}`);
      }
      if (payload.synopsisStructured.active_allies?.length) {
        parts.push(`Đồng minh: ${payload.synopsisStructured.active_allies.join(', ')}`);
      }
      if (payload.synopsisStructured.active_enemies?.length) {
        parts.push(`Kẻ thù: ${payload.synopsisStructured.active_enemies.join(', ')}`);
      }
      if (payload.synopsisStructured.open_threads?.length) {
        parts.push(`Tuyến truyện đang mở: ${payload.synopsisStructured.open_threads.join(', ')}`);
      }
    }
  }

  // Layer 3a: Full prose of last 3 chapters (Phase 22 Stage 2 Q1).
  // Writer/Critic must see actual prose to maintain voice consistency, capture micro-details
  // (callbacks, character mannerisms, specific items mentioned), and avoid contradicting
  // recent events. Summaries lose ~90% of detail — only full prose preserves the human-novel
  // quality bar where ch.800 reads like ch.8.
  if (payload.recentChapterFullText && payload.recentChapterFullText.length > 0) {
    parts.push(`[FULL PROSE ${payload.recentChapterFullText.length} CHƯƠNG GẦN NHẤT — ĐỌC VERBATIM ĐỂ GIỮ GIỌNG VĂN + CHI TIẾT]`);
    for (const ch of payload.recentChapterFullText) {
      // Cap at 15K chars per chapter to bound prompt size while preserving full narrative.
      const content = ch.content.length > 15000
        ? ch.content.slice(0, 7500) + '\n\n[...phần giữa lược...]\n\n' + ch.content.slice(-7500)
        : ch.content;
      parts.push(`### Chương ${ch.chapter_number}: "${ch.title}"\n${content}`);
    }
  }

  // Layer 3b: Recent Chapter Summaries (12-chapter look-back). Complements full-prose layer
  // by giving longer context window at lower fidelity.
  if (payload.recentChapters.length > 0) {
    parts.push(`[TÓM TẮT ${payload.recentChapters.length} CHƯƠNG GẦN NHẤT — DÒNG THỜI GIAN]`);
    for (const ch of payload.recentChapters) {
      parts.push(ch);
    }
  }

  // Layer 4: Arc Plan
  // Sub-arc context (hyperpop 2024-2026 standard) — inject before arc plan
  if (payload.currentSubArc) {
    parts.push('[SUB-ARC HIỆN TẠI — TUYỆT ĐỐI BÁM SÁT]');
    parts.push(payload.currentSubArc);
    parts.push('→ Hyperpop standard: sub-arc 5-10 chương resolve TỰ THÂN. Chương này phải đóng góp vào mini-payoff của sub-arc.');
  }

  if (payload.arcPlan) {
    parts.push('[KẾ HOẠCH ARC HIỆN TẠI]');
    parts.push(payload.arcPlan.slice(0, 3000));
    if (payload.chapterBrief) {
      parts.push(`[BRIEF CHO CHƯƠNG ${chapterNumber}]: ${payload.chapterBrief}`);
    }
    if (payload.arcPlanThreads) {
      if (payload.arcPlanThreads.threads_to_advance?.length) {
        parts.push(`Tuyến cần đẩy: ${payload.arcPlanThreads.threads_to_advance.join(', ')}`);
      }
      if (payload.arcPlanThreads.threads_to_resolve?.length) {
        parts.push(`Tuyến cần giải quyết: ${payload.arcPlanThreads.threads_to_resolve.join(', ')}`);
      }
      if (payload.arcPlanThreads.new_threads?.length) {
        parts.push(`Tuyến mới: ${payload.arcPlanThreads.new_threads.join(', ')}`);
      }
    }
  }

  // Anti-repetition
  if (payload.recentOpenings.length > 0) {
    parts.push(`[CÂU MỞ ĐẦU ĐÃ DÙNG — KHÔNG LẶP]: ${payload.recentOpenings.slice(0, 10).join(' | ')}`);
  }
  if (payload.recentCliffhangers.length > 0) {
    parts.push(`[CLIFFHANGER ĐÃ DÙNG — KHÔNG LẶP]: ${payload.recentCliffhangers.slice(0, 5).join(' | ')}`);
  }

  return parts.join('\n\n');
}


// Phase 28 TIER 2 — Post-write generators extracted to ./generators.ts
export {
  saveChapterSummary,
  generateChapterSummary,
  generateSummaryAndCharacters,
  generateSynopsis,
  generateArcPlan,
  generateStoryBible,
} from "./generators";
export type { CombinedSummaryAndCharacters } from "./generators";
