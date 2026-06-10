/**
 * Story Engine v2 — Chapter Writer
 *
 * 3-agent workflow: Architect → Writer → Critic
 * Each agent is a single Gemini call with a specialized system prompt.
 *
 * Ported features from v1:
 * - Critic fail-closed (không auto-approve khi lỗi)
 * - Critic hard-enforce continuity critical/major
 * - Critic nhận FULL content (không cắt 8000 chars)
 * - finishReason truncation check
 * - Architect scene fallback ≥ 4 scenes
 * - Scene word estimate correction
 * - Rewrite instructions → Writer (không chỉ Architect)
 * - Constraint Extractor (per-project rules)
 * - Topic section (topicPromptHints + parallel world ban)
 * - Multi-POV per scene
 * - Character Voice Guide
 * - Emotional Arc planning
 * - Golden Chapter Requirements (ch.1-3)
 * - Vocabulary Hints injection
 * - Rich Style Context + per-scene pacing
 * - Cliffhanger dedup từ structured summary
 * - Title similarity check (70% threshold)
 * - isFinalArc trong prompt
 * - ENGAGEMENT_CHECKLIST + power budget
 * - Full continuity checklist trong Critic
 * - SƯỚNG VĂN instruction
 */

import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import { getStyleByGenre, buildTitleRulesPrompt, GOLDEN_CHAPTER_REQUIREMENTS, ENGAGEMENT_CHECKLIST, getGenreEngagement, getGenreAntiCliche } from '../config';
import { VN_PRONOUN_GUIDE, SUB_GENRE_RULES, isNonCombatGenre, requiresVndCurrency } from '../templates';
import { getVoiceAnchor, getArchitectVoiceHint } from '../templates/genre-voice-anchors';
import { getGenreArchitectGuide, getGenreContractForCritic } from '../templates/genre-process-blueprints';
import { getConstraintExtractor } from '../canon/constraint-extractor';
import { GENRE_CONFIG } from '../../../lib/types/genre-config';
import { buildStyleContext, getEnhancedStyleBible, CLIFFHANGER_TECHNIQUES } from '../templates/style-bible';
import { titleChecker } from '../quality/title-checker';
import { getOverdueForeshadowingForCritic, type OverdueForeshadowingRecord } from '../plan/foreshadowing';
import { DEFAULT_CONFIG } from '../types';
import type {
  WriteChapterResult, ChapterOutline, CriticOutput, CriticIssue,
  GenreType, GeminiConfig, EmotionalArc, SceneOutline,
} from '../types';
import type { SceneType, VocabularyGuide } from '../templates/style-bible';
import { VN_PLACE_LOCK, ARCHITECT_SYSTEM, WRITER_SYSTEM, CRITIC_SYSTEM } from './chapter-writer-prompts';
import { cleanContent, extractTitle, synthesizeFallbackCliffhanger, hasCliffhangerSignal, analyzeQualitySignals, buildSignalReport, countWords, detectHardFallback, detectMcNameFlip, detectSevereRepetition, detectShortFormCharacterName, detectMcNameRate, detectEyeTemplateOveruse, detectInspirationalCluster, detectMonologueTail, detectCrossChapterRepetition, detectChapterTemplatePatterns, detectEmDashFormatBreak, repairChapterTemplatePatterns, buildRepetitionReport, generateMinimalScenes, loadConstraintSection, safeStringTrim, type QualitySignals } from './chapter-writer-helpers';


// ── Write Chapter ────────────────────────────────────────────────────────────

export interface WriteChapterOptions {
  projectId?: string;
  protagonistName?: string;
  topicId?: string;
  isFinalArc?: boolean;
  genreBoundary?: string;
  worldBible?: string;
  /** Project's world_description text. Used by Critic to detect Vietnam-set
   *  novels via regex sniff (Đại Nam / Hà Nội / Sài Gòn / Dân Quốc) so the
   *  VND currency hard-check fires on linh-di Dân Quốc / lich-su Đại Việt
   *  novels too, not just genres in VND_CURRENCY_GENRES. */
  worldDescription?: string | null;
  /** Sub-genres for blending (e.g., ['trong-sinh','kinh-doanh']). Threaded into VN pronoun + sub-genre rules. */
  subGenres?: string[];
  /** Override the global quality score floor for this write. */
  qualityGateMinScore?: number;
  /**
   * Routine bulk mode for cheap models: allow soft style/pacing revise notes to
   * ship, while still blocking hard continuity/canon/logic failures.
   */
  qualityGateMode?: 'standard' | 'routine_soft';
  /** Phase M.6 (2026-05-12): soft-ending phase guidance injected vào Architect prompt.
   * Computed orchestrator-side từ total_planned_chapters + currentChapter.
   * Empty string for Phase 1 normal mode. */
  softEndingGuidance?: string;
  /**
   * Quality Overhaul 1.1: critic-directed revise pass. When a chapter is about
   * to ship with REVISE-grade quality (score ≤6, major issues, or ≥4 moderates)
   * run one targeted auto-revision from the Critic's own notes before accepting.
   * Default ON; style_directives.critic_revise_pass=false opts out.
   */
  criticRevisePassEnabled?: boolean;
  /**
   * Quality Overhaul 1.6: motifs used ≥3 times in the last 5 chapters —
   * injected into the Architect dynamic suffix as a [CẤM LẶP] ban list.
   */
  repetitionBanList?: string[];
}

function isHardBlockingIssue(issue: CriticIssue): boolean {
  if (issue.severity === 'critical') return true;
  if (issue.severity !== 'major') return false;
  return [
    'continuity',
    'consistency',
    'logic',
    'word_count',
    'critic_error',
    'detail',
  ].includes(issue.type);
}

function canAcceptRoutineSoftGate(critic: CriticOutput, qualityScore: number, minScore: number): boolean {
  if (qualityScore < minScore) return false;
  return !(critic.issues || []).some(isHardBlockingIssue);
}

export type GateAction = 'accept' | 'revise_then_accept' | 'retry';

function countSeverity(critic: CriticOutput, severity: string): number {
  return (critic.issues || []).filter(i => i.severity === severity).length;
}

/**
 * Quality Overhaul 1.1 — pure gate decision, extracted for unit testing.
 *
 * - 'retry': chapter fails the gate and the soft gate can't accept it →
 *   existing retry/golden-fallback/throw path.
 * - 'revise_then_accept': chapter would ship (outright pass OR soft-gate
 *   accept) but carries REVISE-grade quality — run one critic-directed
 *   revision before accepting. Closes the trap where the Critic's REVISE
 *   verdict promised a "downstream auto-reviser" that never existed.
 * - 'accept': ship as-is.
 */
export function decideGateAction(
  critic: CriticOutput,
  qualityScore: number,
  minScore: number,
  mode: 'standard' | 'routine_soft',
  revisePassEnabled: boolean,
): GateAction {
  const failed = critic.requiresRewrite || !critic.approved || qualityScore < minScore;
  const softGateOk = mode === 'routine_soft' && canAcceptRoutineSoftGate(critic, qualityScore, minScore);
  if (failed && !softGateOk) return 'retry';

  if (!revisePassEnabled) return 'accept';
  const majorCount = countSeverity(critic, 'major');
  const moderateCount = countSeverity(critic, 'moderate');
  const needsRevise = failed || !critic.approved || qualityScore <= 6 || majorCount >= 1 || moderateCount >= 4;
  return needsRevise ? 'revise_then_accept' : 'accept';
}

export async function writeChapter(
  chapterNumber: number,
  contextString: string,
  genre: GenreType,
  targetWordCount: number,
  previousTitles: string[],
  config: GeminiConfig,
  maxRetries: number = 3,
  options?: WriteChapterOptions,
): Promise<WriteChapterResult> {
  const startTime = Date.now();
  const style = getStyleByGenre(genre);
  let rewriteInstructions = '';

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Step 1: Architect — throws on placeholder/empty scenes. If we have
    // retries left, treat throw as a quality failure: feed the error message
    // back as rewriteInstructions and continue. This keeps the engine from
    // falling back to silent placeholder scenes.
    let outline: ChapterOutline;
    try {
      outline = await runArchitect(
        chapterNumber,
        contextString,
        targetWordCount,
        previousTitles,
        rewriteInstructions,
        config,
        options,
        genre,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < maxRetries - 1) {
        rewriteInstructions = `Architect lỗi: ${msg}. Lần này phải trả về scenes ĐẦY ĐỦ với setting/conflict/resolution cụ thể, KHÔNG empty placeholder. Tuân thủ brief đã cấp.`;
        console.warn(`[Architect] attempt ${attempt + 1}/${maxRetries} failed: ${msg}`);
        continue;
      }
      throw err;
    }

    // Step 2: Writer
    let content = await runWriter(
      outline,
      contextString,
      genre,
      style,
      targetWordCount,
      config,
      rewriteInstructions,
      options,
    );

    // Hard-fail if Writer returned essentially nothing — likely an LLM
    // error / empty response. Don't ship a stub. Force regen with retry.
    const wordCount = countWords(content);
    if (wordCount < 200) {
      if (attempt < maxRetries - 1) {
        rewriteInstructions = `Writer trả về ${wordCount} từ, gần như trống. Có thể do LLM lỗi. Viết LẠI đầy đủ ${targetWordCount} từ theo outline.`;
        console.warn(`[Writer] Chapter ${chapterNumber} attempt ${attempt + 1}/${maxRetries}: content too short (${wordCount} words), regen`);
        continue;
      }
      throw new Error(`Writer chapter ${chapterNumber}: returned ${wordCount} words after ${maxRetries} attempts. Refusing to save stub content.`);
    }

    // Request continuation if truncated
    if (wordCount < targetWordCount * 0.7) {
      const continuation = await requestContinuation(content, outline, targetWordCount, config, options?.projectId);
      if (continuation) content = content + '\n\n' + continuation;
    }

    // Clean content
    content = cleanContent(content);

    // Phase Q 2026-05-13 Layer 6 — DETERMINISTIC TEMPLATE REPAIR.
    // PR #67 added detection + retry but Gemini Flash Lite's template attractor
    // is too strong (1/12 clean after 3 retries = 92% slip-through). This
    // surgery strips template ending sentences + repairs static opening
    // UNCONDITIONALLY after Writer succeeds. Lost content is purely AI tics
    // ("ván cờ sinh tử bắt đầu" / static establishing shots) — narrative
    // information is preserved in the concrete sentences that bookend them.
    const repair = repairChapterTemplatePatterns(content);
    if (repair.endingRepaired || repair.openingRepaired) {
      content = repair.content;
      console.log(`[Writer] Template surgery ch.${chapterNumber}: ending=${repair.endingRepaired} opening=${repair.openingRepaired} lost=${repair.lostChars}ch`);
    }

    // Phase Q 2026-05-13 Layer 7 — AI REWRITE for stubborn templates.
    // After ROOT FIX (Architect schema + validator + Writer safe-cliffhanger),
    // template generation rate at source should drop ~80%. Layer 7 is now
    // LAST RESORT safety net for the ~5-10% edge cases that slip through all
    // prior layers. Only triggers on ENDING template (opening now handled at
    // root via emotionalArc.opening schema + D2-EXEC rule + Architect validator).
    const tail500 = content.slice(-500);
    const tailSents = (tail500.match(/[^.!?。！？\n]+[.!?。！？]/g) || []).map(s => s.trim());
    const lastSent = tailSents[tailSents.length - 1] || '';
    const stillTemplateEnding = lastSent && (() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { isTemplateCliffhanger } = require('../context/generators');
      return isTemplateCliffhanger(lastSent);
    })();
    // Layer 7 opening trigger REMOVED — root fix at Architect.emotionalArc.opening
    // (D2-EXEC schema rule) prevents AI from generating "abstract emotion" that
    // Writer would render as static template. If still static opening reaches
    // here, Layer 6 surgery should have stripped or Critic flags.
    const stillTemplateOpening = false;

    if (stillTemplateEnding || stillTemplateOpening) {
      try {
        if (stillTemplateEnding) {
          const last600 = content.slice(-600);
          const beforeTail = content.slice(0, -600);
          const cliffhangerHint = outline.cliffhanger || '';
          const rewritePrompt = `Bạn là biên tập viên. Hãy VIẾT LẠI đoạn kết chương sau cho ngắn hơn (200-300 từ), CẤM:
- "trò chơi/cuộc chiến/ván cờ ... mới thật sự bắt đầu / chính thức bắt đầu / mới là kẻ làm chủ"
- "hắn là X, đây là thế giới của hắn" / "thế giới này không còn là của chúng"
- "đã sẵn sàng để đối mặt với tất cả / mọi thứ"
- "X chưa bao giờ chấp nhận thua cuộc"
- "cuộc chơi đã chính thức vượt ra khỏi tầm kiểm soát"
- Bất kỳ tuyên ngôn vĩ mô trừu tượng về vận mệnh/thế giới/cuộc chơi.

THAY VÀO ĐÓ kết bằng:
(a) EVENT cụ thể vừa xảy ra (điện thoại reo + tên người, tin nhắn nội dung gì, nhân vật mới gõ cửa, vật phẩm rơi xuống bàn), HOẶC
(b) DECISION cụ thể MC vừa quyết với thời gian+địa điểm+người ("Sáng mai 7h tới X gặp Y").

Cliffhanger hint từ outline: ${cliffhangerHint}

ĐOẠN KẾT CẦN VIẾT LẠI (giữ nguyên các sự kiện, chỉ thay câu/đoạn cuối abstract bằng concrete event/decision):
"""
${last600}
"""

Chỉ trả về phần text mới (không quote, không metadata). Tiếng Việt tự nhiên, em-dash dialogue.`;

          const rewritten = await callGemini(rewritePrompt, { ...config, temperature: 0.7, maxTokens: 1024 }, { tracking: options?.projectId ? { projectId: options.projectId, task: 'layer7_ending_rewrite', chapterNumber } : undefined });
          const newEnding = rewritten.content?.trim();
          if (newEnding && newEnding.length > 100) {
            // Re-validate: did AI produce non-template ending?
            const newTailSents = (newEnding.slice(-500).match(/[^.!?。！？\n]+[.!?。！？]/g) || []).map(s => s.trim());
            const newLast = newTailSents[newTailSents.length - 1] || '';
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { isTemplateCliffhanger: check } = require('../context/generators');
            if (!check(newLast)) {
              content = beforeTail.trimEnd() + '\n\n' + newEnding;
              console.log(`[Writer] Layer 7 AI ending rewrite ch.${chapterNumber}: replaced template ending`);
            } else {
              console.log(`[Writer] Layer 7 AI ending rewrite ch.${chapterNumber}: AI still produced template — kept original`);
            }
          }
        }

        if (stillTemplateOpening) {
          const first600 = content.slice(0, 600);
          const afterHead = content.slice(600);
          const briefHint = outline.scenes?.[0]?.goal || outline.scenes?.[0]?.conflict || '';
          const rewritePrompt = `Bạn là biên tập viên. Hãy VIẾT LẠI đoạn mở đầu chương sau cho ngắn hơn (200-300 từ), CẤM:
- "[Ánh sáng/không khí/đồng hồ/phòng tả thiết lập] + [MC] ngồi/đứng/tựa BẤT ĐỘNG + nhìn/quan sát/lặng lẽ + suy ngẫm/nhớ lại"
- Mở chương bằng tả cảnh tĩnh + MC observe + nội tâm reflection.

THAY VÀO ĐÓ mở bằng:
- MC đang ACTIVELY làm gì cụ thể trong 100 từ đầu (đi/gọi điện/mở cửa/gõ bàn phím/cầm vật/ra lệnh/viết/tính toán/bước vào phòng).
- Có thể có 1 câu setting ngắn TRƯỚC khi MC active, nhưng MC PHẢI là chủ ngữ của ≥1 verb action trong 100 từ đầu.

Scene 1 goal/conflict hint từ outline: ${briefHint}

ĐOẠN MỞ ĐẦU CẦN VIẾT LẠI (giữ nguyên các sự kiện, characters, location, chỉ thay câu mô tả tĩnh + MC observe bằng MC active action):
"""
${first600}
"""

Chỉ trả về phần text mới (không quote, không metadata). Tiếng Việt tự nhiên, em-dash dialogue.`;

          const rewritten = await callGemini(rewritePrompt, { ...config, temperature: 0.7, maxTokens: 1024 }, { tracking: options?.projectId ? { projectId: options.projectId, task: 'layer7_opening_rewrite', chapterNumber } : undefined });
          const newOpening = rewritten.content?.trim();
          if (newOpening && newOpening.length > 100) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { isTemplateOpening: check } = require('../context/generators');
            if (!check(newOpening)) {
              content = newOpening + '\n\n' + afterHead.trimStart();
              console.log(`[Writer] Layer 7 AI opening rewrite ch.${chapterNumber}: replaced static opening`);
            } else {
              console.log(`[Writer] Layer 7 AI opening rewrite ch.${chapterNumber}: AI still produced template — kept original`);
            }
          }
        }
      } catch (e) {
        console.warn(`[Writer] Layer 7 AI rewrite failed ch.${chapterNumber}:`, e instanceof Error ? e.message : String(e));
      }
    }

    const finalWordCount = countWords(content);

    // ── Hard-Fail Gate (pre-Critic) ─────────────────────────────────────────
    // Cheap regex checks that bypass the Critic round-trip. If Writer has
    // obviously fallen back to repetition padding instead of executing the
    // chapter brief, force regen with a stronger correction instruction
    // BEFORE spending tokens on Critic. Two violations are auto-rejectable:
    //   1. Setup-word density (kiếp trước / 30 năm tương lai / etc.) above
    //      a hard threshold proves Writer ignored the WRITER_SYSTEM rule.
    //   2. Golden-finger name density above threshold = same fallback.
    // If we caught a violation and have retries left, skip Critic and force
    // a tighter Writer pass with explicit correction.
    if (attempt < maxRetries - 1) {
      const hardFailReason = detectHardFallback(content, options);
      if (hardFailReason) {
        rewriteInstructions = `HARD-FAIL: ${hardFailReason}. KHÔNG được lặp setup. Chương phải narrate đúng các sự kiện trong outline, KHÔNG chèn padding hồi tưởng. Brief đã liệt kê hành động cụ thể — viết chính xác hành động đó, KHÔNG lan man về kiếp trước / golden finger.`;
        console.warn(`[Writer] Hard-fail attempt ${attempt + 1}/${maxRetries}: ${hardFailReason}`);
        continue;
      }

      // Phase Q 2026-05-13 root-cause fix: post-write deterministic gate that
      // rejects template chapter-endings ("ván cờ sinh tử bắt đầu", "hắn là X,
      // đây là thế giới của hắn", "một bản hùng ca sẽ được viết", v.v.) AND
      // template static openings ("[setting tả thiết lập] + MC bất động + quan
      // sát + suy ngẫm"). User audit confirmed these patterns are baseline
      // every chapter despite Architect/Critic prompt rules — Gemini Flash
      // Lite's training data is saturated with TQ webnovel chapters ending
      // this way. Hard regex catches them before publishing.
      const templateReason = detectChapterTemplatePatterns(content);
      if (templateReason) {
        rewriteInstructions = `TEMPLATE PATTERN HARD-FAIL: ${templateReason} VIẾT LẠI:\n• ENDING (3 câu cuối): KHÔNG dùng "ván cờ / trò chơi / cuộc chiến / kỷ nguyên / bản hùng ca / cái tên ... mới thật sự / chính thức / chuẩn bị bắt đầu". KHÔNG "hắn là X, đây là thế giới của hắn". KẾT bằng EVENT cụ thể (điện thoại reo + tên người gọi, tin nhắn nội dung, vật xuất hiện trên bàn) HOẶC DECISION cụ thể ("sáng mai 7h tới X gặp Y").\n• OPENING (100 từ đầu): KHÔNG bắt đầu bằng tả thiết lập tĩnh + MC bất động + quan sát + suy ngẫm. MỞ bằng action concrete — MC đang đi/gọi/mở/ra lệnh/viết/gõ/cầm vật cụ thể.`;
        console.warn(`[Writer] Template-pattern hard-fail attempt ${attempt + 1}/${maxRetries}: ${templateReason.slice(0, 200)}`);
        continue;
      }

      // Phase 2026-05-16: deterministic em-dash format break detector. Audit
      // of 271 production chapters found ~5-10% of long chapters (vd Dị Giới
      // Quán Net ch.16: 10.2K chars / 27 paragraphs / 0 em-dash) where Gemini
      // Flash Lite fused dialogue into narration prose, losing em-dash markers
      // entirely. cleanContent() already normalizes hyphen→em-dash for the
      // simpler substitution mode (Đại Ca Xuyên Việt). What survives that
      // normalize is true fusion — force a regen with explicit instruction.
      const emDashReason = detectEmDashFormatBreak(content);
      if (emDashReason) {
        rewriteInstructions = `EM-DASH HARD-FAIL: ${emDashReason}. DIALOGUE PHẢI dùng em-dash — (U+2014) ở đầu mỗi lời thoại, mỗi câu thoại trên 1 paragraph riêng. KHÔNG fuse dialogue vào narration prose. KHÔNG dùng hyphen "-" hay en-dash "–" thay thế. VÍ DỤ ĐÚNG:\n— Lương Hạo, anh nghĩ sao về deal này?\nLương Hạo gật đầu, đặt cốc trà xuống.\n— Tôi cần xem hợp đồng kỹ hơn.`;
        console.warn(`[Writer] Em-dash hard-fail attempt ${attempt + 1}/${maxRetries}: ${emDashReason}`);
        continue;
      }
    }

    // Step 3: Critic
    const critic = await runCritic(
      outline,
      content,
      targetWordCount,
      contextString,
      config,
      options?.isFinalArc === true,
      options?.projectId,
      genre,
      options?.worldDescription,
      options?.protagonistName,
    );

    // Step 3b: Reader persona Critic (Phase 29 Feature 2) — gated by env.
    // Adds non-blocking reader-perspective issues to the pool. Does NOT change
    // approval gate; main Critic remains the authority on requiresRewrite.
    if (process.env.ENABLE_READER_PERSONA_CRITIC === 'true') {
      try {
        const { runReaderPersonaCritic } = await import('../quality/reader-persona-critic');
        const personaIssues = await runReaderPersonaCritic(
          content,
          genre,
          config,
          options?.projectId,
          chapterNumber,
        );
        if (personaIssues.length > 0) {
          critic.issues = [...(critic.issues || []), ...personaIssues];
          console.log(`[ReaderPersona] ch.${chapterNumber}: +${personaIssues.length} persona issues appended`);
        }
      } catch (e) {
        console.warn(`[ReaderPersona] ch.${chapterNumber} threw:`, e instanceof Error ? e.message : String(e));
      }
    }

    let activeCritic = critic;
    let qualityScore = activeCritic.overallScore || 0;
    const minQualityScore = options?.qualityGateMinScore ?? DEFAULT_CONFIG.minQualityScore;
    const gateMode = options?.qualityGateMode === 'routine_soft' ? 'routine_soft' : 'standard';
    const revisePassEnabled = options?.criticRevisePassEnabled !== false;
    const recoveryFlags: string[] = [];
    let criticRevisedPass = false;
    let reviseEscalated = false;

    // Quality Overhaul 1.1 — critic-directed revise pass. Before a marginal
    // chapter ships (REVISE verdict, major issues, or moderate pile-up), run
    // one targeted revision from the Critic's notes, re-judge once, and keep
    // whichever version scores higher without a new hard blocker.
    const gateAction = decideGateAction(activeCritic, qualityScore, minQualityScore, gateMode, revisePassEnabled);
    if (gateAction === 'revise_then_accept') {
      try {
        const { reviseFromCriticNotes } = await import('./auto-reviser');
        const revision = await reviseFromCriticNotes(
          chapterNumber, content, activeCritic, config, options?.projectId,
        );
        if (revision.revised) {
          const revisedCritic = await runCritic(
            outline, revision.content, targetWordCount, contextString, config,
            options?.isFinalArc === true, options?.projectId, genre,
            options?.worldDescription, options?.protagonistName,
          );
          const revisedScore = revisedCritic.overallScore || 0;
          const hadHardBlocker = (activeCritic.issues || []).some(isHardBlockingIssue);
          const introducedHardBlocker =
            !hadHardBlocker && (revisedCritic.issues || []).some(isHardBlockingIssue);
          if (revisedScore >= qualityScore && !introducedHardBlocker) {
            content = revision.content;
            activeCritic = revisedCritic;
            criticRevisedPass = true;
            activeCritic.issues = [
              ...(activeCritic.issues || []),
              {
                type: 'quality' as const,
                severity: 'minor' as const,
                description: `[RevisePass] critic-directed revision applied: score ${qualityScore} → ${revisedScore} (${revision.fixedIssues.length} notes)`,
              },
            ];
            qualityScore = revisedScore;
            console.log(`[ChapterWriter] Ch.${chapterNumber} revise pass: score ${critic.overallScore} → ${revisedScore}`);
          } else {
            console.log(`[ChapterWriter] Ch.${chapterNumber} revise pass kept original (revised ${revisedScore} vs ${qualityScore}, newHardBlocker=${introducedHardBlocker})`);
          }
          // Escalation: if the better version STILL carries ≥3 major issues,
          // don't soft-accept — consume a retry instead (closes the soft-gate
          // hole where major pacing/quality issues shipped untouched).
          if (countSeverity(activeCritic, 'major') >= 3) {
            reviseEscalated = true;
          }
        } else {
          recoveryFlags.push('revise_pass_failed');
          activeCritic.issues = [
            ...(activeCritic.issues || []),
            {
              type: 'quality' as const,
              severity: 'moderate' as const,
              description: '[RevisePass] critic-directed revision failed — shipped original; flagged for admin review.',
            },
          ];
        }
      } catch (e) {
        console.warn(`[ChapterWriter] Ch.${chapterNumber} revise pass threw:`, e instanceof Error ? e.message : String(e));
      }
    }

    const softGateAccepted =
      gateMode === 'routine_soft' &&
      !reviseEscalated &&
      canAcceptRoutineSoftGate(activeCritic, qualityScore, minQualityScore);

    if (softGateAccepted && (activeCritic.requiresRewrite || !activeCritic.approved)) {
      activeCritic.issues = activeCritic.issues || [];
      activeCritic.issues.push({
        type: 'quality',
        severity: 'minor',
        description: `Routine Flash soft gate accepted score ${qualityScore}/${minQualityScore}: no hard continuity/canon/logic blocker.`,
      });
      activeCritic.approved = true;
      activeCritic.requiresRewrite = false;
    }

    const failedQualityGate =
      reviseEscalated || (
        !softGateAccepted && (
          activeCritic.requiresRewrite ||
          !activeCritic.approved ||
          qualityScore < minQualityScore
        )
      );

    if (failedQualityGate) {
      const gateReason = [
        reviseEscalated ? `revise pass left ≥3 major issues` : null,
        activeCritic.requiresRewrite ? 'requiresRewrite=true' : null,
        !activeCritic.approved ? 'approved=false' : null,
        qualityScore < minQualityScore
          ? `overallScore ${qualityScore} < ${minQualityScore}`
          : null,
      ].filter(Boolean).join(', ');

      if (attempt < maxRetries - 1) {
        rewriteInstructions = activeCritic.rewriteInstructions ||
          `Quality gate failed (${gateReason}). Viết lại để đạt tối thiểu ${minQualityScore}/10, sửa toàn bộ issue major/critical và đảm bảo Critic approved=true.`;
        continue;
      }

      const blockingIssueSummary = (activeCritic.issues || [])
        .filter(isHardBlockingIssue)
        .slice(0, 5)
        .map(issue => `[${issue.type}/${issue.severity}] ${issue.description.slice(0, 220)}`)
        .join(' | ');

      // Phase T (2026-05-15): Golden chapter (ch.1-3) recovery fallback.
      // Instead of throwing after retries on a golden chapter, save the
      // best attempt if score ≥4 AND no STRUCTURAL hard blocker. Detector-
      // critical (quality type) is acceptable — Phase R detectors can
      // false-positive on fresh chapter prose. Continuity/logic critical
      // still blocks. Flag for admin polish review.
      const isGoldenChapter = chapterNumber <= 3;
      const isStructuralBlocker = (issue: CriticIssue): boolean => {
        // Only block on continuity/logic/word_count/consistency/critic_error
        // criticals AND on majors of those types. Quality-type "critical"
        // from Phase R detectors (MC-rate, eye, insp, tail, PWV) does NOT
        // block golden fallback — Polisher + admin review handle those.
        const structuralTypes = ['continuity', 'consistency', 'logic', 'word_count', 'critic_error'];
        if (!structuralTypes.includes(issue.type)) return false;
        return issue.severity === 'critical' || issue.severity === 'major';
      };
      const hasHardBlocker = (activeCritic.issues || []).some(
        isGoldenChapter ? isStructuralBlocker : isHardBlockingIssue,
      );
      if (isGoldenChapter && qualityScore >= 4 && !hasHardBlocker) {
        console.warn(
          `[ChapterWriter] Golden chapter ${chapterNumber} recovery fallback: score=${qualityScore} below ${minQualityScore}, no hard blocker. Saving + flagging admin_polish_needed.`,
        );
        const title = extractTitle(content, chapterNumber, outline.title, previousTitles);
        return {
          chapterNumber,
          title,
          content,
          wordCount: countWords(content),
          qualityScore: activeCritic.overallScore,
          criticReport: {
            ...activeCritic,
            issues: [
              ...(activeCritic.issues || []),
              {
                type: 'quality' as const,
                severity: 'moderate' as const,
                description: `[Phase T recovery] Golden chapter saved with score ${qualityScore} after ${maxRetries} retries. Admin should review polish: ${gateReason}`,
              },
            ],
          },
          outline,
          duration: Date.now() - startTime,
          recoveryFlags: [...recoveryFlags, 'golden_fallback'],
          criticRevisedPass,
        };
      }

      throw new Error(
        `Chapter ${chapterNumber}: failed quality gate after ${maxRetries} attempts (${gateReason || 'unknown reason'}). Refusing to publish REVISE/unapproved content.${blockingIssueSummary ? ` Blocking issues: ${blockingIssueSummary}` : ''}`,
      );
    }

    // Extract title with similarity check
    const title = extractTitle(content, chapterNumber, outline.title, previousTitles);

    return {
      chapterNumber,
      title,
      content,
      wordCount: criticRevisedPass ? countWords(content) : finalWordCount,
      qualityScore: activeCritic.overallScore,
      criticReport: activeCritic,
      outline,
      duration: Date.now() - startTime,
      recoveryFlags: recoveryFlags.length ? recoveryFlags : undefined,
      criticRevisedPass,
    };
  }

  throw new Error(`Chapter ${chapterNumber}: all ${maxRetries} attempts failed`);
}

// ── Architect Agent ──────────────────────────────────────────────────────────

async function runArchitect(
  chapterNumber: number,
  context: string,
  targetWords: number,
  previousTitles: string[],
  rewriteInstructions: string,
  config: GeminiConfig,
  options?: WriteChapterOptions,
  genre?: GenreType,
): Promise<ChapterOutline> {
  const titleRules = buildTitleRulesPrompt(previousTitles, genre);
  const minScenes = Math.max(4, Math.ceil(targetWords / 600));
  const wordsPerScene = Math.round(targetWords / minScenes);

  // Golden Chapter requirements for ch.1-3
  const isGolden = chapterNumber <= 3;
  const goldenReqs = isGolden
    ? GOLDEN_CHAPTER_REQUIREMENTS[`chapter${chapterNumber}` as keyof typeof GOLDEN_CHAPTER_REQUIREMENTS]
    : null;

  // Load constraints if projectId available
  let constraintSection = '';
  if (options?.projectId) {
    try {
      constraintSection = await loadConstraintSection(options.projectId, context, options.protagonistName || '');
    } catch {
      // Non-fatal
    }
  }

  // Build topic section
  const topicSection = buildTopicSection(options?.topicId);

  // Emotional arc planning
  const emotionalArcGuide = `
CẢM XÚC ARC (bắt buộc lên kế hoạch):
- Mở đầu: cảm xúc gì cho người đọc? (tò mò, lo lắng, phẫn nộ...)
- Giữa chương: chuyển sang cảm xúc gì? (căng thẳng, hồi hộp, đau lòng...)
- Cao trào: đỉnh điểm cảm xúc? (phấn khích, sốc, hả hê...)
- Kết: để lại cảm xúc gì? (háo hức đọc tiếp, day dứt, mong chờ...)
Nguyên tắc: PHẢI có contrast cảm xúc giữa các phần (buồn→vui, sợ→phấn khích)`;

  // Engagement checklist — generic + genre-specific items
  const genreEngagementItems = genre ? getGenreEngagement(genre) : [];
  const engagementGuide = `
ENGAGEMENT (mỗi chương phải có):
${ENGAGEMENT_CHECKLIST.perChapter.map((e: string) => '- ' + e).join('\n')}
${genreEngagementItems.length > 0 ? `\nENGAGEMENT THỂ LOẠI (BẮT BUỘC):\n${genreEngagementItems.map(e => '- ' + e).join('\n')}` : ''}
SỨC MẠNH: Tối đa ${ENGAGEMENT_CHECKLIST.powerBudget.perArcRules.maxPowerUps} power-up/arc. KHÔNG tăng sức mạnh mỗi chương.`;

  // Final arc handling
  const finalArcGuide = options?.isFinalArc
    ? `KẾT THÚC CHƯƠNG (ARC CUỐI):
- KHÔNG dùng cliffhanger — kết thúc thỏa mãn
- Nếu đây là chương cuối cùng: viết epilogue, giải quyết mọi xung đột
- Nếu gần cuối: có thể dùng mild suspense nhưng không mở plot thread mới`
    : `CLIFFHANGER TECHNIQUES (chọn 1 — CẤM LẶP loại đã dùng gần đây):
${CLIFFHANGER_TECHNIQUES.map((c: { name: string; example: string }) => '- ' + c.name + ': ' + c.example).join('\n')}
⚠️ QUAN TRỌNG: Context đã liệt kê [CLIFFHANGER ĐÃ DÙNG]. Bạn PHẢI chọn loại KHÁC. Nếu 3 chương gần nhất đều dùng Threat → chọn Revelation/Choice/Pending Result/v.v.`;

  // Extract foreshadowing hints for forceful injection into Architect prompt
  const foreshadowingInjection = extractForeshadowingForArchitect(context);

  // Extract previous cliffhanger and MC state for direct reinforcement in current task
  const cliffhangerMatch = context.match(/Cliffhanger chương trước:\s*([^\n]*)/);
  const previousCliffhanger = cliffhangerMatch ? cliffhangerMatch[1].trim() : '';

  const mcStateMatch = context.match(/Trạng thái MC cuối chương trước:\s*([^\n]*)/);
  const previousMcState = mcStateMatch ? mcStateMatch[1].trim() : '';

  // Foreknowledge engine — active iff the assembler injected the [BIẾT-TRƯỚC] kernel block
  // (only for reincarnated/transmigrator/returnee origins). When active, Architect MUST plan a
  // concrete foreknowledgeBeat on a 1-2 chapter cadence so "biết trước" stops drifting like clouds.
  const foreknowledgeActive = context.includes('[BIẾT-TRƯỚC');
  const foreknowledgeSchemaField = foreknowledgeActive
    ? `\n  "foreknowledgeBeat": {
    "type": "<memory_trigger (cảnh-kích → flashback kiếp trước) | knowledge_action (hành động vì biết trước) | future_avoidance (né bẫy đã thấy) | modern_leverage (áp dụng kiến thức ngoài)>",
    "sceneNumber": <int — scene nào trong chương>,
    "trigger": "<mùi / người / ngày tháng / cảnh lặp / quyết định — cái gì kích hoạt ký ức hoặc nhận ra>",
    "description": "<1 câu: MC ngửi/thấy/nghe X → nhớ ra/biết trước Y → đổi nước cờ Z>",
    "benefit": "<lợi thế CỤ THỂ thu được: né bẫy sớm 1 chương / chốt deal trước / cứu đúng người>",
    "cost": "<butterfly/limit: timeline lệch, đối thủ cũng xê dịch, chỉ biết key event nên vẫn phải thử-sai>"
  },`
    : '';
  const foreknowledgeRule = foreknowledgeActive
    ? `
═══════════════════════════════════════════
BIẾT-TRƯỚC / TRỌNG SINH — BẮT BUỘC (origin foreknowledge active):
═══════════════════════════════════════════
- Outline PHẢI có "foreknowledgeBeat" trên nhịp: memory-trigger MỖI 1-2 chương; ngoài trigger, ≥1 hành động dựa-trên-biết-trước có cost mỗi arc.
- Beat phải tie vào [BIẾT-TRƯỚC] kernel trong context (whatMcKnows + futureTimeline) — KHÔNG bịa ký ức ngoài kernel.
- Flashback = 1-2 câu cảnh-kích, KHÔNG paragraph dump. MC QUYẾT ĐỊNH KHÁC vì biết trước → có hậu quả/cost.
- ANTI god-mode: MC KHÔNG biết MỌI THỨ — chỉ key events; nhiều thứ vẫn phải thử + sai. CẤM "MC biết hết, đi 1 nước thắng luôn".`
    : '';

  // Giấu nghề / 藏拙 — active iff the kernel injected a real cover story to maintain
  // (mcSecret.coverStory non-empty). Recognition dopamine STAYS (MC khoe kết quả → được
  // tung hô); what we enforce is concealing the SOURCE + keeping a moat, so MC stops "bày
  // ra trước cả thôn" lộ liễu như một người toàn tri mà không ai thắc mắc.
  const concealmentActive = context.includes('MC secret lock:') && !context.includes('cover story: N/A');
  const concealmentRule = concealmentActive
    ? `
═══════════════════════════════════════════
GIẤU NGHỀ / 藏拙 — KỶ LUẬT NGUỒN GỐC (MC có [cover story] phải giữ):
═══════════════════════════════════════════
- MC ĐƯỢC khoe KẾT QUẢ để nhận recognition (món ngon, mẻ hàng quý, phán đoán chuẩn) — đây là dopamine, GIỮ NGUYÊN.
- CHE NGUỒN: mỗi lần MC lộ năng lực hiếm so với thân phận, outline phải gán "vì sao biết" vào [cover story] trong [MC secret lock] (học lỏm / nếm bẩm sinh / thử nhiều lần / đọc sách cũ...). CẤM để MC thể hiện toàn tri lộ liễu mà cả thôn/đám đông không một ai thắc mắc.
- GIỮ MOAT: CẤM MC trao toàn bộ phương pháp tái lặp (công thức đầy đủ / tọa độ chính xác điểm đánh bắt / kỹ thuật lõi) cho đám đông MIỄN PHÍ. Lộ kết quả — giữ "how"; lộ sâu CÓ KIỂM SOÁT, đúng đối tượng đổi lợi ích.
- CÓ GIÁ: nếu chương để MC phô tài hiếm công khai, outline PHẢI kèm hệ quả thật (kẻ nhái / ganh ghét / có người rình học lỏm để cướp nghề) và MC chủ động phòng/đón trước — KHÔNG flex vô hậu quả.
- "reveal rule" trong [MC secret lock] là luật chốt — bám sát, KHÔNG để bí mật nguồn gốc trôi tuột.`
    : '';

  // Phase 22 Stage 2 Q2: Architect budget bumped 120K → 400K. DeepSeek 1M context handles
  // this trivially (~100K tokens at most). Old cap was a token-saving artifact from
  // pre-DeepSeek era; head-tail trim was DROPPING THE MIDDLE of synopsis/arc plan/character
  // bibles — exactly the scaffolding Architect needs for long-novel coherence. Real
  // long-form authors plan with ALL their notes open, not just the head + tail.
  const MAX_PROMPT_CHARS = 400_000;
  let trimmedContext = context;
  const staticParts = [constraintSection, topicSection, titleRules, emotionalArcGuide, finalArcGuide, engagementGuide, foreshadowingInjection].join('').length + 2000;
  if (trimmedContext.length + staticParts > MAX_PROMPT_CHARS) {
    // Last-resort only: the orchestrator now budgets context via the tier-aware
    // applyContextBudget (360K) BEFORE it reaches here, so this blind head-trim
    // should never fire. If it does, something upstream skipped the budget.
    trimmedContext = trimmedContext.slice(0, MAX_PROMPT_CHARS - staticParts);
    console.error(`[Architect] Chapter ${chapterNumber}: LAST-RESORT head-trim fired — context ${context.length} → ${trimmedContext.length} chars. Upstream tier budget was bypassed; investigate.`);
  } else if (process.env.DEBUG_ARCHITECT_CONTEXT === '1') {
    console.log(`[Architect] Chapter ${chapterNumber}: full context = ${context.length} chars (no trim)`);
  }

  // Phase 22 Stage 4: STRUCTURED FOR PROMPT CACHING.
  // DeepSeek caches prefix automatically when ≥1024 tokens match exactly. To maximize cache
  // hit rate (10% pricing on cached tokens), we put STATIC content (rules, JSON schema,
  // novel-stable context) FIRST and DYNAMIC content (chapter number, current bridge, retry
  // instructions) LAST. After the first chapter of any novel, this cuts ~50% of input cost.
  // Format is otherwise unchanged — same content, reordered.

  // ── STATIC PREFIX (cacheable across chapters of same novel) ──
  const staticPrefix = `⚠️ TUYỆT ĐỐI BÁM SÁT [WORLD DESCRIPTION] và [ĐẠI CƯƠNG TOÀN TRUYỆN] phía dưới — đây là PREMISE GỐC. CẤM hallucinate setting / golden finger / antagonist / MC profession khác. Nếu world_description nói MC là "ngự thú sư cuồng đọc văn học chép Tam Quốc cho tu sĩ đa vũ trụ đọc" thì CẤM viết MC bán cơm hộp hay làm freelance content. Mọi scene phải reference world_description elements (tên hệ thống, tên antagonist, setting locations, golden finger rules cụ thể).

ĐA GÓC NHÌN (MULTI-POV):
- POV mặc định là nhân vật chính
- CÓ THỂ chuyển POV sang nhân vật khác cho 1-2 scenes NẾU phù hợp cốt truyện
- Nếu đổi POV, ghi rõ "pov" trong từng scene object

JSON OUTPUT SCHEMA (output structure, không thay đổi):
{
  "chapterNumber": <int>,
  "title": "tiêu đề hấp dẫn",
  "summary": "tóm tắt 2-3 câu",
  "pov": "tên nhân vật POV mặc định",
  "location": "địa điểm chính",
  "scenes": [{"order":1, "setting":"...", "characters":["..."], "goal":"...", "conflict":"...", "resolution":"...", "estimatedWords":<int>, "pov":"nhân vật POV"}],
  "tensionLevel": <int>,
  "dopaminePoints": [{"type":"face_slap", "scene":1, "description":"...", "intensity":8, "setup":"...", "payoff":"..."}],
  "emotionalArc": {
    "opening": "<MC physical position + emotion 1 câu: WHERE+WHAT_DOING+FEELING. ĐÚNG 'MC bước vào phòng họp tầng 32, tay cầm hợp đồng, hồi hộp'. SAI 'quyết tâm' (abstract emotion alone — CẤM).>",
    "midpoint": "<emotional turn point — event trigger gì làm cảm xúc shift>",
    "climax": "<peak emotion tied to specific event happening in scene>",
    "closing": "<MC ending emotional state TIED TO concrete action MC vừa làm. ĐÚNG 'MC mỉm cười nhận hợp đồng từ tay CEO Phạm An'. SAI 'quyết tâm' / 'trầm tư' (abstract emotion alone — CẤM).>"
  },
  "comedyBeat": "...",
  "slowScene": "...",${foreknowledgeSchemaField}
  "cliffhanger": "<SỰ KIỆN BÊN NGOÀI cụ thể vừa xảy ra ở câu cuối chương — bắt buộc 1 trong 4 forms: (a) [Actor named] + verb action + object (vd 'Phụng — vợ cũ 3 năm — đẩy cửa bước vào, tay cầm phong bì niêm phong'); (b) [Specific object/sound/sight] xuất hiện (vd 'Trên màn hình hiện tin nhắn từ số ẩn: \\\"Tôi biết bí mật năm 2018\\\"'); (c) [MC name] decides verb action at TIME at PLACE với PERSON (vd 'Lê Hữu Tuấn quyết định 7h sáng mai sẽ đến biệt thự Reinhardt với 2 vệ sĩ chốt deal muối'); (d) [Channel] from [name] content '[exact words]'. CẤM TUYỆT ĐỐI: 'ván cờ/trò chơi/cuộc chiến mới bắt đầu', 'hắn là X đây là thế giới', 'X chưa bao giờ chấp nhận thua cuộc', 'sẵn sàng đối mặt với tất cả', 'cuộc chơi chính thức vượt ra khỏi tầm kiểm soát', 'thế giới này không còn là của chúng', 'kỷ nguyên mới được viết nên', 'cái tên sẽ trở thành biểu tượng'. Bất kỳ tuyên ngôn vĩ mô trừu tượng về vận mệnh/thế giới = REJECTED.>",
  "targetWordCount": <int>,
  "chapterIntent": {
    "primaryGoal": "<1-2 câu mục tiêu chính chương — actor + action + stake>",
    "cliffhangerTarget": "<concrete event/decision dạng (a)-(d) như field cliffhanger phía trên. CẤM abstract hook / tuyên ngôn trừu tượng.>",
    "mcStateDelta": "<MC state changes — power/relationship/resources delta>",
    "threadsToClose": ["thread name 1", "thread name 2"],
    "threadsToAdvance": ["thread name 1", "thread name 2"],
    "creativeConstraints": "<≤500 chars distilled constraints structured by label. Vd: [Voice] MC ngạo nghễ + sarcastic. [Pacing] 2 dopamine peaks, peak 1 trước scene 2. [Character Arc] MC accept role leader. [Foreshadowing] Hint xx planted ch.20 đến lúc payoff. [Power] MC ch.50 = Nguyên Anh trung kỳ, không đột phá. [World] Location = Vạn Hoa village.>"
  }
}

${trimmedContext}

${constraintSection}
${topicSection}
${titleRules}

${emotionalArcGuide}

${finalArcGuide}

${engagementGuide}
${foreknowledgeRule}
${concealmentRule}`;

  // ── DYNAMIC SUFFIX (changes every chapter, breaks cache) ──
  const dynamicSuffix = `

═══════════════════════════════════════════
NHIỆM VỤ HIỆN TẠI:
═══════════════════════════════════════════
Lên kế hoạch cho CHƯƠNG ${chapterNumber}.
Target: ${targetWords} từ. Tối thiểu ${minScenes} scenes (mỗi ~${wordsPerScene} từ).
${previousCliffhanger ? `\n⚠️ BẮT BUỘC KHỞI ĐẦU CHƯƠNG MỚI (D4-RESOLVE):
- Cliffhanger chương trước: "${previousCliffhanger}"
- Trạng thái MC cuối chương trước: "${previousMcState}"
- Yêu cầu: Cảnh đầu tiên (Scene 1 trong "scenes" và "emotionalArc.opening") PHẢI bắt đầu ngay tại địa điểm/thời điểm của Cliffhanger và tiếp tục trực tiếp hành động từ đó. CẤM nhảy địa điểm/thời gian tự do ở Scene 1 khi chưa có transition di chuyển hợp lý.\n` : ''}
${foreshadowingInjection}
${options?.repetitionBanList?.length ? `\n[CẤM LẶP — HÌNH ẢNH/CỤM TỪ ĐÃ DÙNG ≥3 LẦN TRONG 5 CHƯƠNG GẦN NHẤT]\nKHÔNG dùng lại các hình ảnh/cụm từ sau trong chương này (thay bằng chi tiết MỚI, cụ thể cho scene): ${options.repetitionBanList.join(' | ')}\n` : ''}
${rewriteInstructions ? `\nYÊU CẦU SỬA TỪ LẦN TRƯỚC: ${rewriteInstructions}` : ''}
${isGolden ? `\nGOLDEN CHAPTER ${chapterNumber}:\nMust have: ${goldenReqs?.mustHave.join(', ')}\nAvoid: ${goldenReqs?.avoid.join(', ')}

═══ PHASE T (2026-05-15) — Golden Chapter Ending Rule (BẮT BUỘC) ═══
Scene cuối CỦA CHƯƠNG ${chapterNumber} CẤM kết bằng monologue MC ("X sẽ là huyền thoại / vinh quang / vương quốc của hắn / đây là khởi đầu của X / bản hùng ca / ván cờ mới"). Cấm template "ego declaration" entirely.

Scene cuối PHẢI chọn 1 trong 3 dạng CONCRETE:
(a) **Dialogue ending**: 1-2 câu thoại giữa MC + character vừa giới thiệu (em-dash format), kết bằng câu hỏi rõ hoặc decision rõ. Vd: "— Sáng mai 7h, anh tới quán trà nhé? / — Được, có chuyện gì muốn nói?"
(b) **Action ending**: MC làm physical action concrete với object cụ thể (đóng cửa gỗ, cầm hộp lên, nhận thư niêm phong, gập tờ giấy bỏ vào túi áo, bước ra phố hướng cụ thể). Câu cuối là verb + object specific, KHÔNG abstract.
(c) **NPC entry cliffhanger**: 1 character UNEXPECTED xuất hiện ở cuối scene, MC nhận diện hoặc reveal danh tính, kết bằng 1 câu duy nhất ("Người này, lâu lắm rồi không gặp" / "Cô ta tìm tôi?" / hành động NPC concrete).

Outline scene 5 PHẢI specify dạng (a/b/c) + character tên + verb + object cụ thể. KHÔNG ghi "cliffhanger" chung chung — phải concretize.` : ''}
${options?.softEndingGuidance || ''}

Trả về JSON ChapterOutline đúng schema phía trên cho CHƯƠNG ${chapterNumber}.`;

  const prompt = staticPrefix + dynamicSuffix;

  const genreSuffix = genre ? buildGenreSpecificSuffix(genre, options?.subGenres || []) : '';
  // Architect gets compact voice hint (notes + opening pattern + dopamine pattern only).
  // Full prose anchor goes to Writer where voice matching matters most.
  const architectVoiceHint = genre ? getArchitectVoiceHint(genre) : '';
  // Genre process blueprint — scene types + arc template + quality floor + common failures.
  // Helps Architect plan scenes using genre-specific scene types instead of generic.
  const architectGenreGuide = genre ? getGenreArchitectGuide(genre) : '';
  const res = await callGemini(prompt, { ...config, temperature: 0.3, maxTokens: 16384, systemPrompt: ARCHITECT_SYSTEM + VN_PLACE_LOCK + genreSuffix + architectVoiceHint + architectGenreGuide }, { jsonMode: true, tracking: options?.projectId ? { projectId: options.projectId, task: 'architect', chapterNumber } : undefined });

  // Check finishReason for truncation
  if (res.finishReason === 'length' || res.finishReason === 'MAX_TOKENS') {
    console.warn(`[Architect] Chapter ${chapterNumber}: output truncated (finishReason=${res.finishReason})`);
  }

  let parsed = parseJSON<ChapterOutline>(res.content);

  if (!parsed || !parsed.scenes?.length) {
    throw new Error(`Architect chapter ${chapterNumber}: JSON parse failed — raw: ${res.content.slice(0, 300)}`);
  }

  // Phase Q 2026-05-13 ROOT FIX — Architect template validator.
  // PR #66-#69 patched Writer OUTPUT with regex/AI rewrite (Layers 1-7).
  // Real root cause: Architect produces template `cliffhanger` field, then
  // Writer faithfully renders it as the chapter ending (Writer prompt injects
  // "CLIFFHANGER: ${outline.cliffhanger}" verbatim as instruction). Patches
  // downstream can never beat poisoned upstream input.
  // This validator checks the Architect's cliffhanger + chapterIntent fields
  // immediately after JSON parse. If template detected → force ONE regen with
  // corrective instruction, citing the exact bad output back to AI. Cheap
  // (~$0.01 extra per affected chapter), eliminates poisoning at source.
  if (parsed.cliffhanger || parsed.chapterIntent?.cliffhangerTarget) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { isTemplateCliffhanger } = require('../context/generators');
    const badCliffhanger = parsed.cliffhanger && isTemplateCliffhanger(parsed.cliffhanger);
    const badIntent = parsed.chapterIntent?.cliffhangerTarget && isTemplateCliffhanger(parsed.chapterIntent.cliffhangerTarget);
    if (badCliffhanger || badIntent) {
      console.warn(`[Architect] ch.${chapterNumber} produced template cliffhanger — forcing regen. cliffhanger="${(parsed.cliffhanger || '').slice(0, 80)}" intent="${(parsed.chapterIntent?.cliffhangerTarget || '').slice(0, 80)}"`);
      const correctionSuffix = `\n\n⚠️ CẢNH BÁO — LẦN OUTPUT VỪA RỒI BẠN ĐÃ VI PHẠM D4-EXEC:
- cliffhanger = "${(parsed.cliffhanger || '').slice(0, 200)}"
- cliffhangerTarget = "${(parsed.chapterIntent?.cliffhangerTarget || '').slice(0, 200)}"

Đây là TUYÊN NGÔN TRỪU TƯỢNG bị cấm tuyệt đối. Viết lại JSON với cliffhanger/cliffhangerTarget = CONCRETE EVENT/DECISION đúng D4-EXEC forms (a)-(d). Reader phải biết NGAY ch.N+1 mở bằng action gì cụ thể.`;
      try {
        const retry = await callGemini(prompt + correctionSuffix, { ...config, temperature: 0.3, maxTokens: 16384, systemPrompt: ARCHITECT_SYSTEM + VN_PLACE_LOCK + genreSuffix + architectVoiceHint + architectGenreGuide }, { jsonMode: true, tracking: options?.projectId ? { projectId: options.projectId, task: 'architect_template_regen', chapterNumber } : undefined });
        const reparsed = parseJSON<ChapterOutline>(retry.content);
        if (reparsed && reparsed.scenes?.length && reparsed.cliffhanger) {
          const stillBad = isTemplateCliffhanger(reparsed.cliffhanger) || (reparsed.chapterIntent?.cliffhangerTarget && isTemplateCliffhanger(reparsed.chapterIntent.cliffhangerTarget));
          if (!stillBad) {
            parsed = reparsed;
            console.log(`[Architect] ch.${chapterNumber} regen succeeded — concrete cliffhanger`);
          } else {
            console.warn(`[Architect] ch.${chapterNumber} regen still template — Writer-side sanitizer + Layer 6 will handle`);
          }
        }
      } catch (e) {
        console.warn(`[Architect] ch.${chapterNumber} template regen failed:`, e instanceof Error ? e.message : String(e));
      }
    }
  }

  // Bridge validation check: check if Scene 1 connects to cliffhanger
  if (previousCliffhanger && parsed.scenes && parsed.scenes.length > 0) {
    const verifyPrompt = `Bạn là trợ lý biên tập. Hãy kiểm tra xem kế hoạch Cảnh 1 dưới đây có tiếp nối trực tiếp và logic từ Cliffhanger chương trước hay không.

Cliffhanger chương trước: "${previousCliffhanger}"
Trạng thái MC cuối chương trước: "${previousMcState}"

Kế hoạch Cảnh 1:
- Địa điểm/Bối cảnh (setting): "${parsed.scenes[0].setting || ''}"
- Mục tiêu cảnh (goal): "${parsed.scenes[0].goal || ''}"
- Mở đầu cảm xúc (emotionalArc.opening): "${parsed.emotionalArc?.opening || ''}"

QUAN TRỌNG — phân biệt 2 loại cliffhanger:
1. Cliffhanger LỜI HẸN TƯƠNG LAI (vd "Sáng mai 7h MC sẽ tới biệt thự gặp X", "Chiều nay 2h hẹn gặp ở quán"): Cảnh 1 time-skip TIẾN tới đúng thời điểm/địa điểm đã hẹn (sáng mai tại biệt thự / chiều nay tại quán) chính LÀ cách thực hiện cliffhanger → trả "OK". KHÔNG coi việc nhảy tới mốc-hẹn là lỗi.
2. Cliffhanger SỰ KIỆN ĐANG DIỄN RA (vd đang bị phục kích trong rừng lúc nửa đêm, vừa nhận tin đe dọa trong xe): Cảnh 1 phải tiếp diễn NGAY tại địa điểm/thời điểm đó.

Trả về đúng một trong hai định dạng:
- "OK" nếu Cảnh 1 (a) tiếp diễn trực tiếp từ cliffhanger sự-kiện-đang-diễn-ra, HOẶC (b) time-skip tiến tới đúng mốc thời gian/địa điểm mà cliffhanger lời-hẹn đã đặt ra.
- "ERR: [Lý do ngắn bằng tiếng Việt]" CHỈ khi Cảnh 1 nhảy sang địa điểm/thời điểm KHÁC với cả cliffhanger lẫn mốc-hẹn của nó, không có transition di chuyển và không phải mốc đã hẹn (ví dụ: chương trước hẹn 7h sáng tới biệt thự, nhưng Cảnh 1 lại đang ở sân bay nước ngoài; hoặc chương trước đang trong xe nhận tin đe dọa, chương này tự nhiên ở cửa hàng bán khách mà không nói gì về di chuyển hay xử lý tin nhắn). KHÔNG báo ERR chỉ vì có time-skip tiến tới mốc đã hẹn.`;

    try {
      // Use Flash model for cheap/fast verification
      const verifyRes = await callGemini(
        verifyPrompt,
        { ...config, model: 'gemini-3.1-flash-lite', temperature: 0, maxTokens: 100 },
        { tracking: options?.projectId ? { projectId: options.projectId, task: 'architect_bridge_verify', chapterNumber } : undefined }
      );
      const verdict = verifyRes.content?.trim();
      if (verdict && verdict.startsWith('ERR:')) {
        const errorMsg = verdict.replace('ERR:', '').trim();
        throw new Error(`Bridge broken: ${errorMsg}`);
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('Bridge broken:')) {
        throw e;
      }
      // Non-fatal fallback for other errors (e.g. rate limit, connection) so it doesn't block writing
    }
  }

  // Validate: ensure enough scenes. Previously silently synthesized empty
  // placeholder scenes (setting:'', conflict:'', resolution:'') which the
  // Writer then narrated as filler — Writer fell back to padding from
  // setup/world_description because the brief was empty. Now throw so the
  // outer retry loop calls Architect again with the rewriteInstructions.
  if (!parsed.scenes || parsed.scenes.length < minScenes) {
    throw new Error(`Architect chapter ${chapterNumber}: returned ${parsed.scenes?.length ?? 0} scenes, need ≥${minScenes}. Refusing to synthesize empty placeholder scenes (would force Writer to pad).`);
  }
  // Validate: scenes have non-empty narrative fields. If Architect returned
  // scenes with empty goal/conflict/resolution, those are essentially
  // placeholders too — Writer would pad. Force regen.
  const emptyScenes = parsed.scenes.filter(sc => !sc.goal?.trim() || !sc.setting?.trim());
  if (emptyScenes.length > parsed.scenes.length / 2) {
    throw new Error(`Architect chapter ${chapterNumber}: ${emptyScenes.length}/${parsed.scenes.length} scenes have empty goal/setting. Refusing to pass to Writer (would produce padding).`);
  }

  // Fix scene word estimates if too low
  const totalSceneWords = parsed.scenes.reduce((s, sc) => s + (sc.estimatedWords || 0), 0);
  if (totalSceneWords < targetWords * 0.8) {
    const perScene = Math.round(targetWords / parsed.scenes.length);
    for (const scene of parsed.scenes) {
      scene.estimatedWords = perScene;
    }
  }

  // Enforce targetWordCount
  parsed.targetWordCount = targetWords;

  // Enforce non-empty cliffhanger for non-finale arcs
  // Only synthesize fallback IF outline has no cliffhanger AND chapter doesn't have an
  // intentional emotional/reveal/comfort ending. Modern guidance (P0.1 cliffhanger detoxify):
  // emotional/reveal/comfort endings are valid alternatives for breathing/aftermath/comedic chapters.
  if (!options?.isFinalArc && !safeStringTrim(parsed.cliffhanger)) {
    // Check emotional arc closing intent — if intentionally calm/resolution, skip synthesis
    const closingIntent = (parsed.emotionalArc?.closing || '').toLowerCase();
    const isIntentionalSoftEnding = /resolution|aftermath|breath|peace|reflection|comfort|warm|reveal|seed/.test(closingIntent);
    if (!isIntentionalSoftEnding) {
      parsed.cliffhanger = synthesizeFallbackCliffhanger(parsed);
    }
    // else: leave cliffhanger empty — emotional/reveal ending acceptable
  }

  return parsed;
}

/**
 * Build genre + sub-genre specific suffix for systemPrompt — VN pronouns, sub-genre patterns.
 * Inject once at agent call instead of redundantly in WRITER_SYSTEM static text.
 */
function buildGenreSpecificSuffix(genre: GenreType, subGenres: string[] = []): string {
  const parts: string[] = [];

  const pronounRule = VN_PRONOUN_GUIDE[genre];
  if (pronounRule) {
    parts.push(`\n\nVN PRONOUN WHITELIST cho thể loại "${genre}":\n${pronounRule}`);
  }

  if (isNonCombatGenre(genre)) {
    parts.push(`\n\nNON-COMBAT GENRE GUARDRAIL (HARD RULE — thể loại "${genre}"):
- CẤM TUYỆT ĐỐI scene MC tham gia chiến đấu vật lý: đánh đấm tay đôi, đâm chém, bắn nhau, huyết chiến, MC vung kiếm/dao/súng, MC bị truy sát hành hung trong hẻm tối, MC thoát chết trong đám đánh nhau.
- CẤM tiêu đề chương kiểu "Huyết Chiến", "Tử Chiến", "Đại Chiến", "Quyết Chiến" — đây là dấu hiệu drift sang fantasy/wuxia.
- CẤM scene gangster/giang hồ vây MC ngoài đời thực dùng vũ lực. Đối thủ phải phản ứng qua KÊNH HỢP PHÁP/THƯƠNG MẠI: kiện tụng, phá giá, thâu tóm, lobby quan chức, dìm uy tín, cướp khách hàng, ép supplier, leak thông tin báo chí.
- CẤM scene MC tham gia "giải đấu game/võ thuật/nhảy múa" làm trục chính chương — đây là drift sang sport/combat. Nếu MC có hobby gaming/tournament, chỉ được làm scene phụ ≤1 trong arc, KHÔNG dồn 3+ chương liên tiếp.
- CONFLICT của thể loại này = THƯƠNG CHIẾN: đối thủ kinh doanh ép giá, M&A thù địch, chiến lược tranh thị phần, scandal PR, lobby chính sách, đầu tư mạo hiểm, đàm phán supplier, kiện tụng IP, chuyển nhượng nhân tài. Tuyệt đối KHÔNG quy đổi sang vũ lực.
- Trường hợp DUY NHẤT có violence: MC chứng kiến tin tức/báo chí về việc bạo lực ngoài xã hội, hoặc MC nghe kể lại — KHÔNG personally tham gia. MC luôn ở vai THƯƠNG NHÂN/QUẢN LÝ/NHÀ ĐẦU TƯ, không phải võ sĩ/giang hồ.`);
  }

  for (const sg of subGenres) {
    const rules = SUB_GENRE_RULES[sg];
    if (rules?.length) {
      parts.push('\n\n' + rules.join('\n'));
    }
  }

  return parts.join('');
}

// ── Writer Agent ─────────────────────────────────────────────────────────────

async function runWriter(
  outline: ChapterOutline,
  context: string,
  genre: GenreType,
  style: ReturnType<typeof getStyleByGenre>,
  targetWords: number,
  config: GeminiConfig,
  rewriteInstructions: string,
  options?: WriteChapterOptions,
): Promise<string> {
  const totalTargetWords = outline.targetWordCount || targetWords;

  // Build rich style context
  const richStyleContext = buildStyleContext(genre, getDominantSceneType(outline));
  const enhancedStyle = getEnhancedStyleBible(genre);

  // Build per-scene guidance with POV
  const sceneGuidance = outline.scenes.map(s => {
    const sceneType = inferSceneType(s);
    const pacing = enhancedStyle.pacingRules[sceneType];
    const povHint = s.pov && s.pov !== outline.pov
      ? `\n  👁 POV: ${s.pov} (GÓC NHÌN KHÁC — viết từ suy nghĩ, cảm xúc, nhận thức của ${s.pov}, KHÔNG của protagonist)`
      : '';
    return `- Scene ${s.order}: ${s.goal} → Conflict: ${s.conflict} → Resolution: ${s.resolution}
  Bối cảnh: ${s.setting} | Nhân vật: ${s.characters.join(', ')}${povHint}
  ⚠️ Viết TỐI THIỂU ${s.estimatedWords} từ cho scene này
  📝 Nhịp điệu: câu ${pacing.sentenceLength.min}-${pacing.sentenceLength.max} từ, tốc độ ${pacing.paceSpeed === 'fast' ? 'NHANH' : pacing.paceSpeed === 'slow' ? 'CHẬM' : 'VỪA'}`;
  }).join('\n\n');

  // Detect multi-POV
  const hasMultiPOV = outline.scenes.some(s => s.pov && s.pov !== outline.pov);
  const multiPOVGuide = hasMultiPOV
    ? `\nCHUYỂN GÓC NHÌN (MULTI-POV):
- Khi chuyển POV sang nhân vật khác, PHẢI có dấu hiệu rõ ràng (xuống dòng + dấu hiệu cảnh mới)
- Viết nội tâm, cảm xúc, nhận thức đúng nhân vật POV đó — KHÔNG biết thông tin nhân vật khác giấu
- Mỗi POV phải có giọng văn/ngữ điệu khác biệt phù hợp tính cách nhân vật\n`
    : '';

  // Vocabulary hints
  const vocabHints = buildVocabularyHints(outline, enhancedStyle.vocabulary);

  // Character voice guide
  const charVoiceGuide = buildCharacterVoiceGuide(outline, options?.worldBible);

  // Emotional arc
  const emotionalArcSection = outline.emotionalArc
    ? `\nCẢM XÚC ARC (PHẢI tuân thủ):
- Mở đầu: ${outline.emotionalArc.opening}
- Giữa chương: ${outline.emotionalArc.midpoint}
- Cao trào: ${outline.emotionalArc.climax}
- Kết thúc: ${outline.emotionalArc.closing}
→ Viết sao cho người đọc CẢM NHẬN được sự chuyển đổi cảm xúc rõ ràng.`
    : '';

  // Foreknowledge beat — render the planned biết-trước/trọng-sinh beat concretely.
  const fk = outline.foreknowledgeBeat;
  const foreknowledgeSection = fk?.description
    ? `\nBIẾT-TRƯỚC / HỒI TƯỞNG KIẾP TRƯỚC (BẮT BUỘC viết — KHÔNG cho trôi qua như mây):
- Loại beat: ${fk.type}${fk.sceneNumber ? ` (scene ${fk.sceneNumber})` : ''}
- Trigger cảnh-kích: ${fk.trigger || 'tự chọn 1 chi tiết giác quan (mùi/âm thanh/hình ảnh/ngày tháng) trong scene'}
- Nội dung: ${fk.description}
- Lợi thế MC thu được: ${fk.benefit || 'thể hiện rõ MC đi trước 1 nước nhờ biết trước'}
- Cost/hệ quả: ${fk.cost || 'timeline lệch nhẹ vì MC can thiệp'}
CÁCH VIẾT BẮT BUỘC: (1) trigger cảnh-kích cụ thể → (2) 1-2 câu flashback/nhận-ra (KHÔNG đoạn văn dump dài) → (3) MC QUYẾT ĐỊNH KHÁC vì biết trước → (4) hậu quả có cost. KHÔNG để MC "biết hết đi 1 nước thắng luôn".`
    : '';

  // Concealment discipline (藏拙) — MC có [cover story] thì khi lộ năng lực hiếm phải che NGUỒN,
  // giữ MOAT, có GIÁ. Vẫn khoe KẾT QUẢ để nhận recognition (dopamine). Đọc [MC secret lock] trong BỐI CẢNH.
  const concealmentWriterActive =
    context.includes('MC secret lock:') && !context.includes('cover story: N/A');
  const concealmentWriterSection = concealmentWriterActive
    ? `\nGIẤU NGHỀ / 藏拙 (BẮT BUỘC — xem [MC secret lock] + reveal rule trong BỐI CẢNH):
- Khoe KẾT QUẢ thì được (món ngon, mẻ hàng, phán đoán chuẩn) — nhưng khi ai đó hỏi "sao biết / sao làm được", MC trả lời bằng [cover story] (học lỏm, nếm bẩm sinh, thử nhiều lần, đọc sách cũ), KHÔNG lộ nguồn gốc thật (trọng sinh / hệ thống / tri thức kiếp khác).
- CẤM viết cảnh MC phô diễn toàn tri lộ liễu trước đám đông/cả thôn mà KHÔNG MỘT AI thắc mắc — phải có người nghi/hỏi và MC đỡ bằng cover story.
- GIỮ MOAT: CẤM MC đưa trọn phương pháp tái lặp (công thức đầy đủ / tọa độ điểm đánh bắt / kỹ thuật lõi) cho đám đông MIỄN PHÍ. Lộ "how" chỉ có kiểm soát, đúng người, đổi lợi ích.
- Nếu chương để MC phô tài hiếm công khai → phải gieo hệ quả (kẻ nhái / ganh ghét / rình học lỏm) và MC chủ động phòng.`
    : '';

  // Topic section
  const topicSection = buildTopicSection(options?.topicId);

  // Rewrite instructions for Writer
  const rewriteSection = rewriteInstructions
    ? `\nYÊU CẦU SỬA TỪ LẦN TRƯỚC: ${rewriteInstructions}\n`
    : '';

  const styleGuide = [
    `Giọng văn: ${style.authorVoice}`,
    `Tỷ lệ đối thoại: ${style.dialogueRatio[0]}-${style.dialogueRatio[1]}%`,
    `Nhịp: ${style.pacingStyle}`,
    style.genreConventions.slice(0, 10).join('\n'),
  ].join('\n');

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 22 STAGE 2 Q1: Full-Evidence Writer Context
  // ─────────────────────────────────────────────────────────────────────────
  // Old design: Writer got "lean" ~5-10K context with Architect outline distilled.
  // Problem: Architect's outline cannot carry every nuance (voice, callbacks, micro-details);
  // Writer was forced to invent details that contradicted prior chapters.
  //
  // New design: Writer gets FULL EVIDENCE PACK (~80-120K). DeepSeek 1M context handles this
  // trivially. Cost ~$0.012 extra per chapter — meaningless vs quality gain. Real "đại thần"
  // novelists re-read recent prose + open their character bible + check foreshadowing ledger
  // BEFORE writing the next chapter. We give the AI the same advantage.
  //
  // Caps below are GENEROUS — only there to prevent runaway prompts, not to optimize tokens.
  const writerContextParts: string[] = [];
  const extractSection = (regex: RegExp, budget: number): string | null => {
    const match = context.match(regex);
    if (!match) return null;
    const text = match[0];
    if (text.length <= budget) return text;
    const cut = text.lastIndexOf('\n', budget);
    return cut > budget * 0.5 ? text.slice(0, cut) : text.slice(0, budget);
  };

  // World/premise grounding (every chapter must respect)
  const worldDesc = extractSection(/\[WORLD DESCRIPTION[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 6000);
  if (worldDesc) writerContextParts.push(worldDesc);
  // Bridge: cliffhanger + MC state
  const bridge = extractSection(/\[CẦU NỐI CHƯƠNG[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 3000);
  if (bridge) writerContextParts.push(bridge);
  // Character states (snapshot — current truth)
  const charSection = extractSection(/\[NHÂN VẬT HIỆN TẠI[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 6000);
  if (charSection) writerContextParts.push(charSection);
  // Character bibles (durable consolidated profiles)
  const bibleSection = extractSection(/\[NHÂN VẬT BIBLE[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 12000);
  if (bibleSection) writerContextParts.push(bibleSection);
  // Volume summaries (macro memory)
  const volSection = extractSection(/\[VOLUME SUMMARIES[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 8000);
  if (volSection) writerContextParts.push(volSection);
  // Geography state
  const geoSection = extractSection(/\[GEOGRAPHY[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 1500);
  if (geoSection) writerContextParts.push(geoSection);
  // RAG memory (far-chapter callbacks)
  const ragSection = extractSection(/\[KÝ ỨC LIÊN QUAN[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 8000);
  if (ragSection) writerContextParts.push(ragSection);
  // Synopsis structured (active threads + state)
  const synopsisSection = extractSection(/\[TỔNG QUAN CỐT TRUYỆN\][\s\S]*?(?=\n\n\[|$)/, 4000);
  if (synopsisSection) writerContextParts.push(synopsisSection);
  // FULL PROSE of last 3 chapters — voice anchor, the BIG quality lever
  const fullProseSection = extractSection(/\[FULL PROSE [^\]]*\][\s\S]*?(?=\n\n\[|$)/, 50000);
  if (fullProseSection) writerContextParts.push(fullProseSection);
  // Recent summaries (12-chapter look-back)
  const recentSection = extractSection(/\[TÓM TẮT \d+ CHƯƠNG GẦN NHẤT[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 5000);
  if (recentSection) writerContextParts.push(recentSection);
  // Plot threads (open + closed)
  const plotSection = extractSection(/\[PLOT THREADS[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 4000);
  if (plotSection) writerContextParts.push(plotSection);
  // World rules (established laws — must not violate)
  const worldRulesSection = extractSection(/\[QUY TẮC THẾ GIỚI[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 3000);
  if (worldRulesSection) writerContextParts.push(worldRulesSection);
  // Arc plan (current arc + chapter brief)
  const arcSection = extractSection(/\[KẾ HOẠCH ARC[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 6000);
  if (arcSection) writerContextParts.push(arcSection);
  // Story kernel (carries MC secret lock + cover story + reveal rule) — Writer must honor the
  // concealment discipline, not just the Architect. Without this the Writer never sees the
  // cover story and lets MC flex toàn tri lộ liễu trước cả thôn.
  const kernelSection = extractSection(/\[STORY KERNEL[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 3000);
  if (kernelSection) writerContextParts.push(kernelSection);
  // Quality modules — generous caps (was 600-1500, now 2500-4000) so per-character/per-hint
  // data isn't truncated. Architect saw same data; Writer needs it too for execution-level fidelity.
  const qualityModuleBudgets: Record<string, number> = {
    'FORESHADOWING': 4000, 'CHARACTER ARC': 4000,
    'PACING': 2500, 'VOICE': 2500, 'POWER': 2500, 'WORLD': 2500, 'LOCATION': 2500,
    'CHARACTER KNOWLEDGE': 3000, 'RELATIONSHIPS': 3000, 'ECONOMIC LEDGER': 3000,
  };
  for (const tag of Object.keys(qualityModuleBudgets)) {
    const regex = new RegExp(`\\[${tag}[^\\]]*\\][\\s\\S]*?(?=\\n\\n\\[|$)`);
    const match = context.match(regex);
    if (match) {
      const budget = qualityModuleBudgets[tag];
      const text = match[0];
      if (text.length <= budget) {
        writerContextParts.push(text);
      } else {
        const cutPoint = text.lastIndexOf('\n', budget);
        writerContextParts.push(cutPoint > budget * 0.5 ? text.slice(0, cutPoint) : text.slice(0, budget));
      }
    }
  }
  const writerContext = writerContextParts.join('\n\n');
  if (process.env.DEBUG_WRITER_CONTEXT === '1') {
    console.log(`[Writer] Chapter ${outline.chapterNumber}: full-evidence context = ${writerContext.length} chars (${writerContextParts.length} sections)`);
  }

  // Phase Q 2026-05-13 ROOT FIX — safe-cliffhanger sanitizer before injection.
  // If Architect-regen validator above didn't catch a template cliffhanger (or
  // chapterIntent.cliffhangerTarget got polluted), strip it here so Writer
  // doesn't faithfully render template as the chapter ending. Fallback ladder:
  //   1. Use outline.cliffhanger if not template.
  //   2. Else use chapterIntent.cliffhangerTarget if not template.
  //   3. Else inject generic "concrete event/decision" instruction.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { isTemplateCliffhanger: __isTplCliff } = require('../context/generators');
  const cliffhangerCandidate = outline.cliffhanger || '';
  const intentCandidate = outline.chapterIntent?.cliffhangerTarget || '';
  let safeCliffhanger: string;
  if (cliffhangerCandidate && !__isTplCliff(cliffhangerCandidate)) {
    safeCliffhanger = cliffhangerCandidate;
  } else if (intentCandidate && !__isTplCliff(intentCandidate)) {
    safeCliffhanger = intentCandidate;
    console.warn(`[Writer] ch.${outline.chapterNumber} fallback to chapterIntent.cliffhangerTarget (outline.cliffhanger was template)`);
  } else {
    safeCliffhanger = 'KẾT BẰNG CONCRETE EVENT hoặc DECISION cụ thể từ scene cuối — named character action / external signal (điện thoại reo + tên / tin nhắn nội dung / vật phẩm xuất hiện) / time-bound decision (sáng mai 7h MC tới X gặp Y). CẤM tuyên ngôn vĩ mô về vận mệnh / thế giới / cuộc chơi. CẤM "ván cờ sinh tử bắt đầu" / "hắn là X đây là thế giới" / "đã sẵn sàng đối mặt" / "X chưa bao giờ chấp nhận thua cuộc".';
    console.warn(`[Writer] ch.${outline.chapterNumber} BOTH outline.cliffhanger AND chapterIntent.cliffhangerTarget template — generic fallback instruction`);
  }

  const prompt = `Viết CHƯƠNG ${outline.chapterNumber}: "${outline.title}"

${rewriteSection}BLUEPRINT:
${JSON.stringify(outline, null, 2)}

BỐI CẢNH:
${writerContext}

SCENES (viết ĐẦY ĐỦ cho MỖI scene — KHÔNG bỏ qua scene nào):
${sceneGuidance}
${multiPOVGuide}
${emotionalArcSection}
${foreknowledgeSection}
${concealmentWriterSection}

DOPAMINE (phải có):
${outline.dopaminePoints.map(dp => `- ${dp.type}: Setup: ${dp.setup} → Payoff: ${dp.payoff}`).join('\n')}

COMEDY BEAT (BẮT BUỘC):
${outline.comedyBeat ? `Kế hoạch: ${outline.comedyBeat}` : 'Tự chọn 1 khoảnh khắc hài hước tự nhiên.'}

SCENE NHỊP CHẬM (BẮT BUỘC):
${outline.slowScene ? `Scene nhịp chậm: ${outline.slowScene}` : 'Chọn 1 scene để giảm nhịp.'}

CLIFFHANGER: ${safeCliffhanger}
${topicSection}
PHONG CÁCH:
${styleGuide}

${vocabHints}

${charVoiceGuide}

${richStyleContext}
${buildGenreAntiClicheSection(genre)}
ĐỘ DÀI YÊU CẦU (BẮT BUỘC):
- Khoảng độ dài tối ưu: từ ${Math.round(totalTargetWords * 0.85)} từ đến ${Math.round(totalTargetWords * 1.35)} từ.
- Giới hạn cứng: KHÔNG vượt quá ${Math.round(totalTargetWords * 1.5)} từ (sẽ bị lỗi kiểm duyệt và phải viết lại).
- CẤM TÓM TẮT nhưng phải cô đọng chi tiết, tránh lan man nói nhảm, không lặp từ và không dùng các câu hội thoại vô bổ kéo dài.
- Tổng ${outline.scenes.length} scenes x ~${Math.round(totalTargetWords / outline.scenes.length)} từ/scene

Bắt đầu viết:`;

  const writerSuffix = buildGenreSpecificSuffix(genre, options?.subGenres || []);
  // Full voice anchor (prose sample + opening pattern + dopamine pattern) — Writer
  // needs this to match register/rhythm/vocabulary. Architect gets a compact version.
  //
  // Phase T (2026-05-15): if canon_spawn generated custom voice anchors
  // (3 prose samples saved as chapter_number=0 in voice_anchors table),
  // OVERRIDE the generic genre anchor with project-specific samples. This
  // gives Writer concrete tone target tuned to this novel's setup, not
  // just generic genre baseline.
  let writerVoiceAnchor = getVoiceAnchor(genre);
  if (options?.projectId) {
    try {
      const { getSupabase } = await import('../utils/supabase');
      const db = getSupabase();
      const { data: customAnchors } = await db
        .from('voice_anchors')
        .select('snippet_type, snippet_text')
        .eq('project_id', options.projectId)
        .eq('chapter_number', 0); // setup-time anchors saved at ch=0
      if (customAnchors && customAnchors.length >= 2) {
        const blocks = customAnchors.map((a: { snippet_type: string; snippet_text: string }) =>
          `### Custom voice anchor — ${a.snippet_type}\n${a.snippet_text}`,
        ).join('\n\n');
        writerVoiceAnchor = `\n\n═══ TARGET VOICE (custom anchors from setup) ═══\n${blocks}\n\nWriter PHẢI match tone/register/rhythm của các anchor trên. Đây là target voice cho TOÀN bộ novel, không chỉ chapter 1-3.`;
      }
    } catch (e) {
      // Non-fatal — fall back to generic genre anchor
      console.warn('[Writer] custom voice anchor load failed:', e instanceof Error ? e.message : String(e));
    }
  }
  // VND CURRENCY proactive rule (added 2026-04-29): Critic-side rule alone
  // wasn't enough — "X xu" / "X nguyên" leaks were appearing in 30+ chapters
  // across many do-thi/quan-truong novels. Add to Writer system prompt so AI
  // generates correct currency from the start instead of depending on Critic
  // to catch and rewrite (which sometimes accepts the leak with low score).
  const writerVndGuard = genre && requiresVndCurrency(genre, options?.worldDescription)
    ? `\n\n[CURRENCY RULE — BẮT BUỘC, KHÔNG ĐƯỢC LEAK]
- Truyện đặt ở Việt Nam (genre "${genre}"). Đơn vị tiền DUY NHẤT khi nhân vật giao dịch hàng ngày: ĐỒNG (đồng / nghìn đồng / triệu đồng / tỷ đồng).
- TUYỆT ĐỐI CẤM dùng "xu" hoặc "nguyên" làm đơn vị tiền — đây là từ Trung Quốc leak vào (元/源币), không phải tiếng Việt thực tế. Người Việt KHÔNG dùng "5 triệu xu" hay "100 nguyên" — chỉ dùng "5 triệu đồng" hoặc "100 đồng".
- Sai: "127.000 xu", "5 triệu xu", "350 nghìn xu", "1000 nguyên", "tài khoản 2 triệu nguyên".
- Đúng: "127.000 đồng", "5 triệu đồng", "350 nghìn đồng", "1000 đồng", "tài khoản 2 triệu đồng" (hoặc viết tắt "2 triệu / 350 nghìn" KHÔNG kèm "xu").
- "Lượng vàng" CHỈ cho tài sản tích trữ/đầu tư (1 lượng ≈ 4-5 triệu đồng). KHÔNG dùng cho mua bán hàng ngày.
- "Xu" CHO PHÉP duy nhất khi: từ ghép "xu nịnh" (flatter), tên riêng (vd "Tô Châu Xu"), hoặc đơn vị nhỏ trong game/hệ thống (HỆ THỐNG ban X xu thưởng — virtual currency, KHÔNG phải tiền thật).
- Khi nhân vật cầm tiền thật → ĐỒNG. Hệ thống thưởng điểm → có thể dùng "điểm" / "credit" / hoặc đơn vị riêng của hệ thống nhưng KHÔNG dùng "xu" để tránh nhầm lẫn.`
    : '';
  const res = await callGemini(prompt, { ...config, systemPrompt: WRITER_SYSTEM + VN_PLACE_LOCK + writerSuffix + writerVndGuard + writerVoiceAnchor }, { tracking: options?.projectId ? { projectId: options.projectId, task: 'writer', chapterNumber: outline.chapterNumber } : undefined });

  // Check finishReason
  if (res.finishReason === 'length' || res.finishReason === 'MAX_TOKENS') {
    console.warn(`[Writer] Chapter ${outline.chapterNumber}: output truncated`);
  }

  return res.content;
}

// ── Request Continuation ─────────────────────────────────────────────────────

async function requestContinuation(
  partialContent: string,
  outline: ChapterOutline,
  targetWords: number,
  config: GeminiConfig,
  projectId?: string,
): Promise<string | null> {
  const currentWords = countWords(partialContent);
  const remaining = targetWords - currentWords;
  if (remaining < 300) return null;

  // Take larger tail context (10K chars instead of 2K)
  const lastPart = partialContent.slice(-10000);

  const prompt = `Tiếp tục viết phần còn lại. ĐÃ VIẾT ${currentWords} từ, CẦN THÊM ${remaining} từ.

NỘI DUNG ĐÃ VIẾT (phần cuối):
...${lastPart}

SCENES CÒN LẠI THEO BLUEPRINT:
${JSON.stringify(outline.scenes.slice(-3))}

TIẾP TỤC NGAY TỪ CHỖ DỪNG — không lặp lại:`;

  const res = await callGemini(prompt, { ...config, systemPrompt: WRITER_SYSTEM + VN_PLACE_LOCK }, { tracking: projectId ? { projectId, task: 'writer_continuation', chapterNumber: outline.chapterNumber } : undefined });
  return res.content || null;
}

// ── Critic Agent ─────────────────────────────────────────────────────────────

async function runCritic(
  outline: ChapterOutline,
  content: string,
  targetWords: number,
  previousContext: string,
  config: GeminiConfig,
  isFinalArc: boolean,
  projectId?: string,
  genre?: GenreType,
  worldDescription?: string | null,
  protagonistName?: string,
): Promise<CriticOutput> {
  const wordCount = countWords(content);
  const wordRatio = wordCount / targetWords;

  // Phase 22 Stage 2 Q3: bumped to 60K so Critic sees full chapter prose without truncation.
  // A typical chapter (~10-15K) fits without trim. Long chapters (~30K) fit fully too.
  // Was 30K — meant Critic missed the middle of long chapters, blind to mid-chapter
  // contradictions. DeepSeek 1M makes this a non-cost.
  const MAX_CRITIC_CONTENT_CHARS = 60_000;
  let contentPreview = content;
  if (content.length > MAX_CRITIC_CONTENT_CHARS) {
    const headSize = Math.floor(MAX_CRITIC_CONTENT_CHARS * 0.6);
    const tailSize = MAX_CRITIC_CONTENT_CHARS - headSize;
    contentPreview = content.slice(0, headSize) + '\n\n[...phần giữa bị lược bỏ...]\n\n' + content.slice(-tailSize);
    console.warn(`[Critic] Chapter content trimmed from ${content.length} to ${contentPreview.length} chars (head+tail)`);
  }

  // Cross-chapter context for contradiction detection.
  // 2026-04-29 continuity overhaul: expanded from bridge+chars (3K cap) to bridge + chars + RAG +
  // synopsis + recent summaries (8K cap). Critic must catch contradictions across ENTIRE story,
  // not just last chapter — old cap let dead-character-reappearance, power-regression, and
  // forgotten-subplot bugs slip through because Critic literally couldn't see those events.
  let crossChapterSection = '';
  if (previousContext) {
    const relevantParts: string[] = [];
    const extractCriticSection = (regex: RegExp, budget: number): string | null => {
      const match = previousContext.match(regex);
      if (!match) return null;
      const text = match[0];
      if (text.length <= budget) return text;
      const cut = text.lastIndexOf('\n', budget);
      return cut > budget * 0.5 ? text.slice(0, cut) : text.slice(0, budget);
    };

    // Phase 22 Stage 4 Lever C': Critic focused on LOCAL quality (current chapter craft).
    // Continuity Guardian (4th agent, Pro tier) handles GLOBAL coherence with full bibles
    // + volume summaries + RAG. Critic doesn't need to duplicate that work.
    // Trimmed from 80K → 40K cross-chapter context. Saves ~$0.05/write.
    // Critic checks: word count, repetition, ending hook, dopamine, comedy, pacing, +
    // last-chapter continuity (bridge + recent prose + char states). Far-back issues are
    // Guardian's responsibility.
    const bridgeS = extractCriticSection(/\[CẦU NỐI CHƯƠNG[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 3000);
    if (bridgeS) relevantParts.push(bridgeS);
    const charS = extractCriticSection(/\[NHÂN VẬT HIỆN TẠI[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 4000);
    if (charS) relevantParts.push(charS);
    // Top 3 character bibles only (was 12K) — most relevant chars in chapter
    const bibleS = extractCriticSection(/\[NHÂN VẬT BIBLE[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 5000);
    if (bibleS) relevantParts.push(bibleS);
    // Synopsis structured (active threads/state) — small, high-value
    const synopsisS = extractCriticSection(/\[TỔNG QUAN CỐT TRUYỆN\][\s\S]*?(?=\n\n\[|$)/, 2500);
    if (synopsisS) relevantParts.push(synopsisS);
    const recentS = extractCriticSection(/\[TÓM TẮT \d+ CHƯƠNG GẦN NHẤT[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 3000);
    if (recentS) relevantParts.push(recentS);
    // Full prose of last 1-2 chapters only (was 3) — Critic checks immediate continuity
    const fullProseS = extractCriticSection(/\[FULL PROSE [^\]]*\][\s\S]*?(?=\n\n\[|$)/, 18000);
    if (fullProseS) relevantParts.push(fullProseS);
    // World rules (small, important — must not violate)
    const worldRulesS = extractCriticSection(/\[QUY TẮC THẾ GIỚI[^\]]*\][\s\S]*?(?=\n\n\[|$)/, 2000);
    if (worldRulesS) relevantParts.push(worldRulesS);

    const merged = relevantParts.join('\n\n');
    crossChapterSection = relevantParts.length > 0
      ? `BỐI CẢNH CÂU CHUYỆN (KIỂM TRA mâu thuẫn LOCAL — Continuity Guardian sẽ check global ở bước sau):\n${merged.slice(0, 40000)}\n\n`
      : `BỐI CẢNH CÂU CHUYỆN:\n${previousContext.slice(0, 3000)}\n\n`;
  }

  // Build repetition report for Critic
  const repetitionReport = buildRepetitionReport(content);

  // Extract quality module expectations for compliance verification
  const qualityComplianceSection = buildQualityComplianceSection(previousContext);

  // Phase 24: compact genre contract — Critic checks drift against the genre
  // promise/opening pattern/taboos derived from genre-process-blueprints.
  const genreContractSection = genre ? getGenreContractForCritic(genre) : '';

  // Phase 26 Module C: deterministic overdue foreshadowing list for Critic gate.
  // Loaded from foreshadowing_plans (status='planted', payoff_chapter <= currentChapter).
  // If chapter content doesn't reference overdue hints by phrase, Critic raises
  // critical issue + requiresRewrite. Forces long-range payoff debt to be paid.
  let overdueForeshadowingRecords: OverdueForeshadowingRecord[] = [];
  if (projectId) {
    overdueForeshadowingRecords = await getOverdueForeshadowingForCritic(projectId, outline.chapterNumber);
  }
  const overdueForeshadowingBlock = overdueForeshadowingRecords.length === 0
    ? ''
    : `\n[FORESHADOWING OVERDUE — CRITIC HARD GATE — payoff BẮT BUỘC trong vòng 5 chương tới]\n${overdueForeshadowingRecords
        .map((h, i) =>
          `${i + 1}. (overdue ${h.overdueBy}ch — deadline ch.${h.payoffChapter}) ` +
          `HINT: "${h.hintText}" → CALLBACK PHẢI: "${h.payoffDescription}"`,
        )
        .join('\n')}\n[/FORESHADOWING OVERDUE]`;

  const prompt = `Đánh giá chương nghiêm túc:
${genreContractSection}${overdueForeshadowingBlock}
${crossChapterSection}OUTLINE: ${outline.title} — ${outline.summary}
TARGET DOPAMINE: ${outline.dopaminePoints.map(dp => `${dp.type}: ${dp.description}`).join('; ')}
TARGET WORDS: ${targetWords}
ACTUAL WORDS: ${wordCount} (đạt ${Math.round(wordRatio * 100)}% target)

${wordRatio < 0.6 ? '⚠️ CẢNH BÁO: Số từ DƯỚI 60% target → requiresRewrite PHẢI = true' : ''}
${wordRatio < 0.8 ? '⚠️ LƯU Ý: Số từ dưới 80% target → giảm điểm overallScore' : ''}
${!isFinalArc ? '⚠️ NON-FINALE: Kết chương PHẢI có ending hook/cliffhanger rõ ràng. Nếu thiếu, tạo issue severity major và requiresRewrite=true.' : '⚠️ FINALE ARC: Có thể kết chương đóng, không bắt buộc cliffhanger.'}

BÁO CÁO LẶP TỪ (tự động phân tích):
${repetitionReport}

BÁO CÁO TÍN HIỆU CHẤT LƯỢNG (tự động phân tích):
${buildSignalReport(content)}

${(() => {
  const { analyzeSensoryBalance, formatSensoryReport } = require('../quality/sensory-balance') as typeof import('../quality/sensory-balance');
  return formatSensoryReport(analyzeSensoryBalance(content));
})()}

${(() => {
  const { evaluateHooks, formatHookReport } = require('../quality/hook-strength') as typeof import('../quality/hook-strength');
  return formatHookReport(evaluateHooks(content));
})()}
${qualityComplianceSection}
NỘI DUNG CHƯƠNG (FULL):
${contentPreview}

Đánh giá và trả về JSON:
{
  "overallScore": <1-10>,
  "dopamineScore": <1-10>,
  "pacingScore": <1-10>,
  "endingHookScore": <1-10>,
  "rubricScores": {
    "promiseClarity": <1-10 — chương có advance promise/core loop của genre không? (vd tien-hiep: có tu luyện/tài nguyên/cảnh giới? do-thi: có deal/recognition/tiền? linh-di: có rule/dread/mystery?)>,
    "sceneSpecificity": <1-10 — scenes có vật thể/số liệu/setting cụ thể không, hay vague abstraction? Cụ thể (Diablo 2, 50 linh thạch, quán net 30 PC, M&A deal 200 tỷ) = 8-10. Vague ("tài nguyên", "đối thủ", "công ty lớn") = 3-5>,
    "mcAgency": <1-10 — MC chủ động ra quyết định chiến lược không? Hay chỉ phản ứng theo sự kiện/người khác? Active+plan = 8-10. Reactive only = 3-5>,
    "payoffConsequence": <1-10 — events trong chương có thực sự THAY ĐỔI status/resource/relationship/world của MC không? Hay chỉ là throwaway scene không để lại consequence? Real change = 8-10. No change = 3-5>,
    "voiceDistinction": <1-10 — các nhân vật khác nhau có cách nói/quirk/cadence khác nhau không? 3+ nhân vật phân biệt được giọng = 8-10. Tất cả nói cùng style = 3-5>
  },
  "issues": [{"type": "word_count|pacing|logic|detail|continuity|quality|dialogue", "description": "...", "severity": "minor|moderate|major|critical"}],
  "approved": <true nếu overallScore >= 7 VÀ wordRatio >= 70%>,
  "requiresRewrite": <true nếu overallScore <= 4 HOẶC wordRatio < 60% HOẶC có lỗi continuity major/critical>,
  "rewriteInstructions": "hướng dẫn cụ thể nếu cần rewrite — PHẢI nêu rõ từ bị lặp cần thay thế, scene nào thiếu comedy, scene nào thiếu nội tâm đa lớp"
}

QUY TẮC RUBRIC SCORING (BẮT BUỘC):
- 5 rubric scores trên là PRIMARY signal cho chất lượng. Keyword counters (BÁO CÁO TÍN HIỆU) chỉ là defense layer.
- overallScore PHẢI ≤ min(rubricScores) + 2. Nếu sceneSpecificity=4 thì overallScore ≤ 6.
- Nếu BẤT KỲ rubric ≤ 4 → tạo issue type="quality" severity="major" describing dimension yếu.
- Nếu rubric promiseClarity ≤ 4 → "quality" critical + requiresRewrite=true (chương lệch genre).
- Nếu sceneSpecificity ≤ 3 → "detail" critical + requiresRewrite=true (chương quá vague).
- Nếu mcAgency ≤ 4 → "quality" major (MC bị động).
- Nếu payoffConsequence ≤ 4 → "quality" major (chương rỗng, không có hậu quả).
- Nếu voiceDistinction ≤ 4 → "dialogue" moderate (nhân vật giống giọng).

KIỂM TRA MÂU THUẪN (BẮT BUỘC):
- Nếu nhân vật đã CHẾT mà xuất hiện lại sống -> type "continuity", severity "critical", requiresRewrite=true
- Nếu sức mạnh/cảnh giới MC bị THOÁI LUI vô lý -> type "continuity", severity "critical", requiresRewrite=true
- Nếu vi phạm quy tắc thế giới đã thiết lập -> type "continuity", severity "critical", requiresRewrite=true
- Nếu nhân vật hành xử trái ngược hoàn toàn với tính cách -> type "continuity", severity "major", requiresRewrite=true

KIỂM TRA GENRE CONTRACT (xem block "[GENRE CONTRACT]" ở đầu prompt nếu có):
- Nếu chương vi phạm 1 trong các TABOOS đã liệt kê → type "quality", severity "major", requiresRewrite=true. Nêu rõ taboo bị vi phạm trong description.
- Nếu chương sai lệch hoàn toàn so với PROMISE / OPENING PATTERN của genre (ví dụ: do-thi/quan-truong mà MC đánh nhau bằng võ công, ngon-tinh mà thiếu emotional contract, linh-di mà không có rule puzzle, kiem-hiep mà tu tiên jargon nặng) → type "quality", severity "critical", requiresRewrite=true.
- Nếu STAKES escalation đi LẠC HƯỚNG so với stakes ladder (ví dụ tien-hiep arc 1 đã đẩy lên "tinh không" thay vì "cá nhân/sư môn") → type "quality", severity "major".

KIỂM TRA CLIMAX LADDER (Phase 26 — xem block "[VOLUME CONTEXT]" trong cross-chapter section):
- Nếu block báo "CHƯƠNG NÀY = MEDIUM CLIMAX sub-arc" → tensionLevel chương PHẢI ≥7 và phải có scene reveal/turn rõ ràng. Nếu chương yên ổn / tension thấp → type "pacing", severity "major", requiresRewrite=true.
- Nếu block báo "CHƯƠNG NÀY = VOLUME CLIMAX" → tensionLevel ≥9, có setpiece lớn nhất volume, dopamine peak loại "breakthrough"/"victory"/"revelation" cuối chương. Nếu thiếu → type "pacing", severity "critical", requiresRewrite=true.
- Nếu block báo "Volume climax đã qua... wind-down phase" mà chương lại mở conflict mới quy mô lớn → type "pacing", severity "major" (vi phạm wind-down — nên đóng thread của volume thay vì mở mới).

KIỂM TRA FORESHADOWING OVERDUE (xem block "[FORESHADOWING OVERDUE]" ở đầu prompt nếu có):
- Mỗi hint trong block đều có "CALLBACK PHẢI" — đó là nội dung scene cần xảy ra để đóng promise.
- Nếu chương HOÀN TOÀN KHÔNG đề cập / không có scene callback cho hint OVERDUE >0 chương → type "quality", severity "critical", requiresRewrite=true. Mô tả: "Foreshadowing hint X (overdue Y chương) chưa được payoff trong chương này".
- Nếu hint chỉ overdue 1-3 chương VÀ chương có hint khác đang phát triển → có thể defer 1-2 chương nữa, severity "moderate".
- Nếu hint overdue >5 chương MÀ chương không payoff → CRITICAL + requiresRewrite. KHÔNG được tha — đại thần không bỏ promise.

KIỂM TRA CHẤT LƯỢNG BỔ SUNG (BẮT BUỘC):
- COMEDY: Nếu KHÔNG có hài hước → issue severity "moderate". CHỈ "major" nếu chương sinh hoạt/đối thoại mà không hài.
- LẶP TỪ (recalibrated 2026-05-12): AI-tell từ (tím sẫm / vàng kim / rực rỡ / kinh hoàng / mờ ảo / lạnh lẽo / run rẩy …) >8 → critical, requiresRewrite=true; >5 → moderate. Vietnamese structural connectives ("là một / bắt đầu / mang theo / tỏa ra / dường như / như thể / đôi mắt") chỉ >22 → critical; >16 → moderate. ≤15 lần là tự nhiên, KHÔNG flag. CHỈ "major" nếu ≥3 nhóm AI-tell đều >5. TÊN MC + named characters: webnovel convention dùng họ+tên đầy đủ (60-100/10K chữ là MỤC TIÊU, KHÔNG flag lặp). FLAG khi: dùng tên cụt "Hạo" thay vì "Lương Hạo" trong narration → moderate; name flip giữa chương → critical.
- NỘI TÂM: Nếu thiếu nội tâm đa lớp → severity "minor". CHỈ "moderate" nếu toàn bộ chương không có.
- GIỌNG NÓI: ≥3 nhân vật giống nhau → severity "moderate". 2 nhân vật → "minor".
- NHỊP ĐIỆU: Toàn bộ scenes cùng cường độ → pacingScore tối đa 5

KIỂM TRA TUÂN THỦ QUALITY MODULES (NẾU CÓ THÔNG TIN):
- FORESHADOWING: Nếu mục "YÊU CẦU TUÂN THỦ" có hint cần gieo (GIEO HINT BẮT BUỘC) mà chương KHÔNG chứa chi tiết tương ứng → type "quality", severity "major", description nêu rõ hint bị bỏ qua.
  Nếu có hint cần PAYOFF mà chương không callback → type "quality", severity "major".
- CHARACTER VOICE: Nếu có "signature traits" (câu cửa miệng, thói quen, cách nói) cho nhân vật xuất hiện trong chương mà nhân vật đó KHÔNG thể hiện bất kỳ trait nào → type "quality", severity "moderate".
- PACING BLUEPRINT: Nếu pacing blueprint chỉ định mood (VD: "CALM BEFORE STORM", "CLIMAX") mà chương viết hoàn toàn ngược (VD: blueprint là calm nhưng toàn action cao trào) → type "pacing", severity "moderate".

KIỂM TRA CANON & STATE (Phase 27/28 — xem các block trong context có sẵn):

- INVENTORY (xem block "[INVENTORY]"): Nếu chương reference vật phẩm KHÔNG nằm trong roster MC's currently held items, HOẶC reference vật phẩm trong "ĐÃ MẤT/CHO" mà không có narrative reason → type "continuity", severity "critical", requiresRewrite=true. Vd MC vung kiếm Hỏa Long mà inventory không có Hỏa Long → CRITICAL.

- POWER SYSTEM CANON (xem block "[POWER SYSTEM CANON]"): commonViolations[] liệt kê những lỗi cần catch. Nếu chương vi phạm 1 trong commonViolations → type "continuity", severity "critical", requiresRewrite=true. Vd "MC skip cảnh giới mà không có lý do narrative", "Đột phá liên tục không có cooldown".

- WORLDBUILDING CANON (xem block "[WORLDBUILDING CANON]"): commonViolations[] tương tự — nếu chương mâu thuẫn cosmology/history/cultures/economy → type "continuity", severity "major", requiresRewrite=true. Vd "Linh thạch giá trị thay đổi giữa các chương", "văn hóa Đại Tấn nhầm với Đại Đường".

- FACTIONS (xem block "[FACTIONS]"): Nếu chương đột ngột flip alliance/rivalry mà không có narrative event setup → type "continuity", severity "major". Vd phe X xưa nay là enemy MC, chương này tự nhiên thành ally không có lý do.

- PLOT TWISTS (xem block "[PLOT TWISTS]"): Nếu chương được mark "HINT TO PLANT" nào trong "imminent" twists, mà chương không chứa hint đó → type "quality", severity "major", requiresRewrite=true. Plant hint TINH TẾ — KHÔNG được spoiler twist.

- THEMES (xem block "[THEMES]"): Nếu MAIN theme có "DRIFT" flag (chưa reinforce >30 chương) mà chương này KHÔNG reinforce theme đó → type "quality", severity "moderate". Encourage motif weaving.

- CAST ROSTER (xem block "[CAST ROSTER]"): Nếu chương invent ≥5 tên nhân vật MỚI không có trong roster + không có lý do narrative (vd 1 đám đông giới thiệu) → type "continuity", severity "major". Đại thần không invent NPCs random.

- TIMELINE (xem block "[STORY TIMELINE]"): Nếu chương viết "X năm sau" mà thông tin trong block báo MC mới ở vùng A vài chương trước → type "continuity", severity "major". Nếu MC age được nhắc < age trong timeline → CRITICAL.

- VOICE ANCHOR (xem block "[VOICE ANCHOR]" nếu có): Sample prose từ ch.1-3 cho thấy giọng văn cốt lõi. Nếu chương hiện tại drift xa khỏi cadence/style đó (vd 1-3 nhiều dialogue + dense paragraphs, chương này toàn description ngắn) → type "quality", severity "moderate".

- ROLLING BRIEFS (xem block "[CHƯƠNG TIẾP THEO — DỰ KIẾN]"): Nếu chương HIỆN TẠI viết hoàn toàn không setup gì cho chương kế tiếp đã planned → type "quality", severity "moderate". Plant 1-2 seeds.`;

  try {
    const nonCombatGuard = genre && isNonCombatGenre(genre)
      ? `\n\nNON-COMBAT GENRE HARD CHECK (thể loại "${genre}"):
- Nếu chương có scene MC tham gia chiến đấu vật lý (đánh đấm/đâm chém/bắn/huyết chiến/bị truy sát hành hung trong đời thực) → issue type "continuity", severity "critical", verdict REWRITE.
- Nếu tiêu đề chương có "Huyết Chiến/Tử Chiến/Đại Chiến/Quyết Chiến" hoặc các từ khóa combat fantasy → issue "continuity", severity "critical", REWRITE.
- Nếu MC tham gia "giải đấu game/võ thuật" làm trục chính chương trong khi genre "${genre}" là kinh doanh/chính trường/tình cảm → issue "continuity", severity "critical", REWRITE.
- Conflict cho thể loại này PHẢI là thương chiến/chính trị/tình cảm — KHÔNG vũ lực. Nếu chương resolve conflict bằng vũ lực → REWRITE bằng phương án thương mại/đàm phán/lobby/PR.`
      : '';
    // VND currency hard check — applies to Vietnam-set genres OR any genre
    // whose world_description contains explicit VN markers (Đại Nam, Hà Nội,
    // Sài Gòn, Dân Quốc...). Catches "X xu / X nguyên / X lượng" leakage
    // from TQ webnovel templates into Vietnamese-set business stories.
    const vndGuard = genre && requiresVndCurrency(genre, worldDescription)
      ? `\n\nVND CURRENCY HARD CHECK (Vietnam-set genre "${genre}"):
- Nếu chương có cụm \\d+ kèm "xu", "nguyên", hoặc "lượng vàng/lượng bạc" làm đơn vị tiền giao dịch hàng ngày (mua bán, vay nợ, lương, giá đất) → issue type "continuity", severity "critical", verdict REWRITE.
- Đơn vị tiền HỢP LỆ DUY NHẤT cho thể loại này: "đồng / nghìn đồng / triệu đồng / tỷ đồng" (VND).
- Cho phép "lượng vàng" CHỈ khi đề cập như tài sản tích trữ/đầu tư (1 lượng ≈ 4-5 triệu đồng), KHÔNG dùng thanh toán hàng ngày.
- Nếu phát hiện "tỷ xu" / "triệu nguyên" / "5 ngàn xu" → REWRITE thay bằng số đồng tương đương.
- MATH SANITY: nếu MC có X đồng đầu chương + chi Y mà Y > X mà KHÔNG có thu nhập / vay vốn được setup rõ ràng → REWRITE.`
      : '';
    // Phase T (2026-05-15): if chapter ≤ 3, inject GOLDEN CHAPTER MODE
    // calibration into Critic system prompt. Fresh chapters scored against
    // hook + warmth + voice standards, NOT dopamine cadence steady-state.
    const isGoldenChapter = (outline.chapterNumber || 0) <= 3;
    const goldenGuard = isGoldenChapter
      ? `\n\n═══ GOLDEN CHAPTER MODE (ch.${outline.chapterNumber} ≤ 3) ═══
Đây là chapter 1-3 của novel mới. Chấm điểm theo standards CHO FRESH CHAPTERS:

✓ HOOK STRENGTH: ch.1-3 phải hook reader trong scene đầu (opportunity-driven, không threat-driven). Yêu cầu: scene 1 có concrete action verb + sensory detail + character interaction.
✓ MC WARM BASELINE: MC ở identity tier "established competent" (chủ tiệm/đệ tử nội môn/professional). KHÔNG rock-bottom (đói lạnh / bị đuổi / ngất xỉu / amnesia). Golden finger active hoặc trigger trong scene 1-2.
✓ WORLD INTRODUCED: ≥1 concrete location + ≥1 supporting character giới thiệu. Tên cụ thể, không placeholder.
✓ VOICE ESTABLISHED: tone + register + sentence rhythm match voice anchor samples. Em-dash dialogue format proper.
✓ ENDING NOT TEMPLATE: scene cuối KHÔNG monologue MC ("X là huyền thoại..." / "đây là khởi đầu..."). Phải là dialogue / action / decision setup cho chapter sau.

NGƯỠNG PASS: overallScore ≥ 6 (KHÔNG ≥ 7 như steady-state). Reason: ch.1-3 thiếu cross-chapter context tích lũy, dopamine cadence chưa thể dense.

KHÔNG STRICT VỀ (ch.1-3 chưa cần):
- Dopamine peak count per chapter (target 2/chương) — chỉ cần 1 small wow
- Face-slap cadence (target ≥1/3-5 chương)
- Big-wow per 5 chapters
- Foreshadowing payoff (chưa có plant rooms)

CHẤM 5 DIM cho fresh chapter:
- promiseClarity: chương có set up genre promise rõ không?
- sceneSpecificity: concrete objects/events vs vague abstraction?
- mcAgency: MC drive decisions vs reactive?
- payoffConsequence: scene events có thay đổi status / resource / relationship?
- voiceDistinction: characters sound different + match anchor tone?

Mỗi dim ≥6 → pass. Tổng overallScore = avg(5 dim) ± 1.`
      : '';

    const res = await callGemini(prompt, { ...config, temperature: 0.2, maxTokens: 4096, systemPrompt: CRITIC_SYSTEM + nonCombatGuard + vndGuard + goldenGuard }, { jsonMode: true, tracking: projectId ? { projectId, task: 'critic', chapterNumber: outline.chapterNumber } : undefined });

    if (!res.content) {
      // Fail closed: don't approve on error
      return createFailClosedCriticOutput(wordCount, targetWords);
    }

    const parsed = parseJSON<CriticOutput>(res.content);

    if (!parsed) {
      console.error(`[Critic Error] Failed to parse Critic JSON response. Raw content (length=${res.content.length}):`);
      console.error(res.content);
      return createFailClosedCriticOutput(wordCount, targetWords);
    }

    // Phase T (2026-05-15): golden chapter cap relaxation helper.
    // Detector override sites cascade overallScore down to 2-5; on ch.1-3
    // fresh chapter this stacks unrecoverably. Apply per-site caps using
    // capForGolden(originalCap) — golden chapters get min cap of 5 (critical
    // detectors) or 6 (major detectors). Steady-state chapters unchanged.
    const capForGolden = (originalCap: number): number => {
      if (!isGoldenChapter) return originalCap;
      // Original cap of 2 (extreme severe, e.g. MC name flip critical) stays 2
      // — that's a fundamental defect, not "fresh chapter struggle".
      if (originalCap <= 2) return originalCap;
      // Otherwise lift cap up to 5 or 6 to give golden chapter recovery room.
      return Math.max(originalCap, originalCap === 3 ? 5 : 6);
    };

    // Hard enforcement: critical/major continuity issues must be rewritten
    const forcedRewriteIssues = (parsed.issues || []).filter((issue: CriticIssue) => {
      if (issue.type !== 'continuity') return false;
      return issue.severity === 'critical' || issue.severity === 'major';
    });

    if (forcedRewriteIssues.length > 0) {
      parsed.requiresRewrite = true;
      parsed.approved = false;
      parsed.overallScore = Math.min(parsed.overallScore || 10, capForGolden(3));
      if (!parsed.rewriteInstructions || parsed.rewriteInstructions.trim().length === 0) {
        parsed.rewriteInstructions = `Sửa lỗi continuity: ${forcedRewriteIssues.map((i: CriticIssue) => i.description).join('; ')}`;
      }
    }

    // Override: force rewrite if word count is critically low
    if (wordRatio < 0.6) {
      parsed.requiresRewrite = true;
      parsed.approved = false;
      if (!parsed.rewriteInstructions) {
        parsed.rewriteInstructions = `Chương quá ngắn (${wordCount}/${targetWords} từ). Phải viết đầy đủ.`;
      }
    }

    // P2.2: Hard MC name-flip detection (deterministic, doesn't rely on Critic AI).
    // Checks if expected MC name appears ≥3 times in content. If a DIFFERENT name
    // is used as narrator subject more than expected name, force rewrite. Catches
    // the "Băng Hà Tận Thế" bug class where chương 3 emits "Trần Vũ" instead of
    // "Lê Minh" despite project.main_character = "Lê Minh".
    if (protagonistName && protagonistName.trim().length >= 2) {
      const nameFlipDetection = detectMcNameFlip(content, protagonistName.trim());
      if (nameFlipDetection.severity === 'critical') {
        parsed.requiresRewrite = true;
        parsed.approved = false;
        parsed.overallScore = Math.min(parsed.overallScore || 10, 2);
        parsed.rewriteInstructions = `[MC NAME FLIP — CRITICAL] ${nameFlipDetection.message}\n\n` +
          (parsed.rewriteInstructions ? `Cộng với: ${parsed.rewriteInstructions}` : '');
      } else if (nameFlipDetection.severity === 'major') {
        parsed.requiresRewrite = true;
        parsed.approved = false;
        parsed.overallScore = Math.min(parsed.overallScore || 10, capForGolden(4));
        parsed.rewriteInstructions = `[MC NAME DRIFT] ${nameFlipDetection.message}\n\n` +
          (parsed.rewriteInstructions ? `Cộng với: ${parsed.rewriteInstructions}` : '');
      }

      // 2026-05-12: Webnovel convention check — narration must use full họ+tên,
      // not just personal name. Soft (moderate) issue, doesn't force rewrite,
      // but counts toward overall quality score.
      const shortFormDetection = detectShortFormCharacterName(content, protagonistName.trim());
      if (shortFormDetection.severity === 'moderate') {
        parsed.issues = parsed.issues || [];
        parsed.issues.push({
          type: 'quality',
          severity: 'moderate',
          description: shortFormDetection.message,
        });
      } else if (shortFormDetection.severity === 'minor') {
        parsed.issues = parsed.issues || [];
        parsed.issues.push({
          type: 'quality',
          severity: 'minor',
          description: shortFormDetection.message,
        });
      }

      // Phase R (2026-05-14): Absolute MC-name rate — short-form ratio detector
      // misses high-density full-name spam (e.g. "Lê Quang Khôi" 97 lần / 4680
      // từ = 20.7/1K, target webnovel = 6-10/1K). Force rewrite at critical
      // (>16/1K), flag moderate at >12/1K.
      const mcNameRate = detectMcNameRate(content, protagonistName.trim());
      if (mcNameRate.severity === 'critical') {
        parsed.requiresRewrite = true;
        parsed.approved = false;
        parsed.overallScore = Math.min(parsed.overallScore || 10, capForGolden(4));
        parsed.issues = parsed.issues || [];
        parsed.issues.push({
          type: 'quality',
          severity: 'critical',
          description: mcNameRate.message,
        });
        parsed.rewriteInstructions = `[MC NAME OVERUSE] ${mcNameRate.message}\n\n` +
          (parsed.rewriteInstructions ? `Cộng với: ${parsed.rewriteInstructions}` : '');
      } else if (mcNameRate.severity === 'moderate') {
        parsed.issues = parsed.issues || [];
        parsed.issues.push({
          type: 'quality',
          severity: 'moderate',
          description: mcNameRate.message,
        });
      }
    }

    // Phase R (2026-05-14): Eye-template overuse — combined "đôi mắt" + "ánh
    // mắt" count catches the AI tic that detectSevereRepetition misses (it
    // tracks "đôi mắt" alone with structural_connective threshold 16/22, but
    // novels split across "đôi mắt" + "ánh mắt" stay under each threshold).
    const eyeOveruse = detectEyeTemplateOveruse(content);
    if (eyeOveruse.severity === 'critical') {
      parsed.requiresRewrite = true;
      parsed.approved = false;
      parsed.overallScore = Math.min(parsed.overallScore || 10, capForGolden(5));
      parsed.issues = parsed.issues || [];
      parsed.issues.push({
        type: 'quality',
        severity: 'critical',
        description: eyeOveruse.message,
      });
      parsed.rewriteInstructions = (parsed.rewriteInstructions || '') +
        ` EYE TEMPLATE: ${eyeOveruse.message}`;
    } else if (eyeOveruse.severity === 'moderate') {
      parsed.issues = parsed.issues || [];
      parsed.issues.push({
        type: 'quality',
        severity: 'moderate',
        description: eyeOveruse.message,
      });
    }

    // Phase R (2026-05-14): Inspirational vocabulary cluster — combo of
    // "huyền thoại / vinh quang / huy hoàng / rực rỡ / định sẵn" across
    // chapter (esp. concentrated in tail) = AI inspirational closer spam.
    const inspirational = detectInspirationalCluster(content);
    if (inspirational.severity === 'critical') {
      parsed.requiresRewrite = true;
      parsed.approved = false;
      parsed.overallScore = Math.min(parsed.overallScore || 10, capForGolden(4));
      parsed.issues = parsed.issues || [];
      parsed.issues.push({
        type: 'quality',
        severity: 'critical',
        description: inspirational.message,
      });
      parsed.rewriteInstructions = (parsed.rewriteInstructions || '') +
        ` INSPIRATIONAL CLOSER SPAM: ${inspirational.message}`;
    } else if (inspirational.severity === 'moderate') {
      parsed.issues = parsed.issues || [];
      parsed.issues.push({
        type: 'quality',
        severity: 'moderate',
        description: inspirational.message,
      });
    }

    // Phase R (2026-05-14): Tail-monologue density — last 20% of chapter
    // ≥2× body density of MC-name + future-tense + abstract-noun signals
    // = model exhausted plot and looped MC inspirational tail.
    if (protagonistName && protagonistName.trim().length >= 2) {
      const tailLoop = detectMonologueTail(content, protagonistName.trim());
      if (tailLoop.severity === 'major') {
        parsed.requiresRewrite = true;
        parsed.approved = false;
        parsed.overallScore = Math.min(parsed.overallScore || 10, capForGolden(5));
        parsed.issues = parsed.issues || [];
        parsed.issues.push({
          type: 'pacing',
          severity: 'major',
          description: tailLoop.message,
        });
        parsed.rewriteInstructions = (parsed.rewriteInstructions || '') +
          ` MONOLOGUE TAIL: ${tailLoop.message}`;
      } else if (tailLoop.severity === 'moderate') {
        parsed.issues = parsed.issues || [];
        parsed.issues.push({
          type: 'pacing',
          severity: 'moderate',
          description: tailLoop.message,
        });
      }
    }

    // Phase R (2026-05-14): Hard upper word-count cap. Existing wordRatio<0.6
    // catches under-shoot but no defense against over-shoot. With
    // disable_chapter_split, Writer can run 5K+ words on a 2800-target chapter
    // and burn budget on MC monologue tail. Force REWRITE at >1.6× target.
    if (wordRatio > 1.6) {
      parsed.requiresRewrite = true;
      parsed.approved = false;
      parsed.overallScore = Math.min(parsed.overallScore || 10, capForGolden(5));
      parsed.issues = parsed.issues || [];
      const msg = `Chương vượt ${Math.round(wordRatio * 100)}% target (${wordCount}/${targetWords} từ). Cắt phần dư — bám causally outline brief, KHÔNG dùng word budget cho inspirational monologue, paraphrase chain, hay mở rộng MC tâm tư. Giữ kết thúc bằng scene/cliffhanger cụ thể, không "huy hoàng / vinh quang / huyền thoại" closer.`;
      parsed.issues.push({
        type: 'pacing',
        severity: wordRatio > 2.0 ? 'critical' : 'major',
        description: msg,
      });
      parsed.rewriteInstructions = `[WORD OVERSHOOT] ${msg}\n\n` +
        (parsed.rewriteInstructions ? `Cộng với: ${parsed.rewriteInstructions}` : '');
    } else if (wordRatio > 1.3) {
      parsed.issues = parsed.issues || [];
      parsed.issues.push({
        type: 'pacing',
        severity: 'moderate',
        description: `Chương dài hơn target (${Math.round(wordRatio * 100)}%, ${wordCount}/${targetWords} từ). Cắt ngắn nếu có monologue / paraphrase / inspirational closer.`,
      });
    }

    // Hard enforcement: severe word repetition triggers rewrite
    const repetitionIssues = detectSevereRepetition(content);
    if (repetitionIssues.length > 0) {
      parsed.issues = parsed.issues || [];
      for (const ri of repetitionIssues) {
        parsed.issues.push(ri);
      }
      // Only force rewrite for critical repetition (generic 8+ or plot_element 12+)
      const hasCritical = repetitionIssues.some(ri => ri.severity === 'critical');
      if (hasCritical) {
        parsed.requiresRewrite = true;
        parsed.approved = false;
        const repetitionGuide = repetitionIssues.map(ri => ri.description).join('; ');
        parsed.rewriteInstructions = (parsed.rewriteInstructions || '') + ` Sửa lặp từ: ${repetitionGuide}`;
      }
      // Moderate repetition: just log, don't penalize score (Critic already sees report)
    }

    // Phase R+1 (2026-05-15): post-write-validator deterministic gate.
    // 8 InkOS-derived rules adapted to Vietnamese: paragraph uniformity,
    // hedge density, meta-narration ban, analysis-report terms ban,
    // author-sermon, crowd-shock, chapter-number-ref, surprise density.
    try {
      const { runPostWriteValidator } = await import('../quality/post-write-validator');
      const validatorIssues = runPostWriteValidator({ content });
      if (validatorIssues.length > 0) {
        parsed.issues = parsed.issues || [];
        for (const vi of validatorIssues) {
          parsed.issues.push(vi);
        }
        const hasCritical = validatorIssues.some(vi => vi.severity === 'critical');
        const hasMajor = validatorIssues.some(vi => vi.severity === 'major');
        if (hasCritical || hasMajor) {
          parsed.requiresRewrite = true;
          parsed.approved = false;
          parsed.overallScore = Math.min(parsed.overallScore || 10, hasCritical ? capForGolden(4) : capForGolden(5));
          const guide = validatorIssues
            .filter(vi => vi.severity === 'critical' || vi.severity === 'major')
            .map(vi => `[${vi.severity}] ${vi.description.slice(0, 200)}`)
            .join(' | ');
          parsed.rewriteInstructions = (parsed.rewriteInstructions || '') +
            ` POST-WRITE: ${guide}`;
        }
      }
    } catch (e) {
      console.warn('[Critic] post-write-validator threw:', e instanceof Error ? e.message : String(e));
    }

    // Phase R+1 (2026-05-15): cross-chapter 3-gram repetition.
    // Catches AI re-using identical phrasing across chapters — invisible
    // to single-chapter detectors. Loads last 3 chapter contents via DB
    // (one-off query, ~10ms).
    if (projectId && outline.chapterNumber > 1) {
      try {
        const { getSupabase } = await import('../utils/supabase');
        const db = getSupabase();
        // Look up novel_id for this project
        const { data: projectRow } = await db
          .from('ai_story_projects')
          .select('novel_id')
          .eq('id', projectId)
          .maybeSingle();
        const novelId = projectRow?.novel_id as string | undefined;
        if (novelId) {
          const { data: recentRows } = await db
            .from('chapters')
            .select('content')
            .eq('novel_id', novelId)
            .lt('chapter_number', outline.chapterNumber)
            .order('chapter_number', { ascending: false })
            .limit(3);
          if (recentRows && recentRows.length > 0) {
            const recentText = recentRows.map(r => (r.content as string) || '').join('\n\n');
            const crossIssues = detectCrossChapterRepetition(content, recentText);
            if (crossIssues.length > 0) {
              parsed.issues = parsed.issues || [];
              for (const ci of crossIssues) parsed.issues.push(ci);
              const hasMajor = crossIssues.some(ci => ci.severity === 'major');
              if (hasMajor) {
                parsed.requiresRewrite = true;
                parsed.approved = false;
                parsed.overallScore = Math.min(parsed.overallScore || 10, capForGolden(5));
                parsed.rewriteInstructions = (parsed.rewriteInstructions || '') +
                  ` CROSS-CHAPTER REPETITION: ${crossIssues[0].description.slice(0, 200)}`;
              }
            }
          }
        }
      } catch (e) {
        console.warn('[Critic] cross-chapter repetition check threw:', e instanceof Error ? e.message : String(e));
      }
    }

    // Phase 26 Module C: Foreshadowing OVERDUE deterministic gate.
    // For every record in overdueForeshadowingRecords, check whether content
    // references the hint text OR payoff description (loose substring).
    // If overdue >5ch AND no reference found → force critical + rewrite.
    // If overdue 1-5ch AND no reference → moderate (logged, not force rewrite).
    parsed.issues = parsed.issues || [];
    if (overdueForeshadowingRecords.length > 0) {
      const lowerContent = content.toLowerCase();
      // Build keyword set from each hint: take first 4 words of hint + first 4 words of payoff.
      // If ANY of those fragments appears in content, treat as referenced (loose check —
      // Critic AI is the authoritative judge, this is a hard floor).
      const wordFragmentLength = 4;
      const extractFragments = (s: string): string[] => {
        if (!s) return [];
        const cleaned = s.toLowerCase().replace(/[.,;:!?"'()[\]{}]/g, ' ').trim();
        const words = cleaned.split(/\s+/).filter(w => w.length >= 3);
        const frags: string[] = [];
        for (let i = 0; i + wordFragmentLength <= words.length; i++) {
          frags.push(words.slice(i, i + wordFragmentLength).join(' '));
        }
        return frags.slice(0, 5);
      };

      const unpaid: OverdueForeshadowingRecord[] = [];
      for (const rec of overdueForeshadowingRecords) {
        const fragments = [
          ...extractFragments(rec.hintText),
          ...extractFragments(rec.payoffDescription),
        ];
        const referenced = fragments.some(f => f.length >= 6 && lowerContent.includes(f));
        if (!referenced) unpaid.push(rec);
      }

      const severelyOverdue = unpaid.filter(r => r.overdueBy >= 5);
      if (severelyOverdue.length > 0) {
        parsed.requiresRewrite = true;
        parsed.approved = false;
        parsed.overallScore = Math.min(parsed.overallScore || 10, capForGolden(4));
        for (const rec of severelyOverdue) {
          parsed.issues.push({
            type: 'quality',
            severity: 'critical',
            description: `Foreshadowing OVERDUE ${rec.overdueBy}ch chưa payoff: "${rec.hintText}" — callback "${rec.payoffDescription}". Chapter content KHÔNG đề cập hint này. ĐẠI THẦN KHÔNG BỎ PROMISE.`,
          });
        }
        const guideText = severelyOverdue
          .map(r => `Payoff: "${r.payoffDescription}" (callback hint "${r.hintText.slice(0, 60)}")`)
          .join(' | ');
        parsed.rewriteInstructions = (parsed.rewriteInstructions || '') +
          ` ƯU TIÊN: thêm scene payoff cho foreshadowing overdue: ${guideText}`;
      } else if (unpaid.length > 0) {
        for (const rec of unpaid) {
          parsed.issues.push({
            type: 'quality',
            severity: 'moderate',
            description: `Foreshadowing overdue ${rec.overdueBy}ch chưa payoff: "${rec.hintText}". Tha lần này nhưng phải payoff trong vòng 5 chương tới.`,
          });
        }
      }
    }

    // Phase 25: Rubric judge enforcement.
    // Critic prompt asks for 5 rubric scores (promiseClarity, sceneSpecificity,
    // mcAgency, payoffConsequence, voiceDistinction). Apply hard floors + cap
    // overallScore by min(rubricScores) + 2 (chương không thể tốt hơn dimension yếu nhất).
    parsed.issues = parsed.issues || [];
    if (parsed.rubricScores) {
      const r = parsed.rubricScores;
      // Sanity-check: clamp rubric scores to 1-10 in case model returned out-of-range.
      r.promiseClarity = Math.max(1, Math.min(10, r.promiseClarity || 5));
      r.sceneSpecificity = Math.max(1, Math.min(10, r.sceneSpecificity || 5));
      r.mcAgency = Math.max(1, Math.min(10, r.mcAgency || 5));
      r.payoffConsequence = Math.max(1, Math.min(10, r.payoffConsequence || 5));
      r.voiceDistinction = Math.max(1, Math.min(10, r.voiceDistinction || 5));

      const minRubric = Math.min(
        r.promiseClarity, r.sceneSpecificity, r.mcAgency, r.payoffConsequence, r.voiceDistinction,
      );

      // Cap overallScore: chương không thể trên min(rubric) + 2.
      if (parsed.overallScore > minRubric + 2) {
        parsed.overallScore = minRubric + 2;
      }

      // Hard floor enforcement per dimension.
      if (r.promiseClarity <= 4) {
        parsed.requiresRewrite = true;
        parsed.approved = false;
        parsed.issues.push({
          type: 'quality',
          severity: 'critical',
          description: `Rubric promiseClarity = ${r.promiseClarity}/10 — chương lệch khỏi promise/core loop của genre.`,
        });
      }
      if (r.sceneSpecificity <= 3) {
        parsed.requiresRewrite = true;
        parsed.approved = false;
        parsed.issues.push({
          type: 'detail',
          severity: 'critical',
          description: `Rubric sceneSpecificity = ${r.sceneSpecificity}/10 — chương quá vague (thiếu vật thể/số liệu/setting cụ thể).`,
        });
      }
      if (r.mcAgency <= 4) {
        parsed.issues.push({
          type: 'quality',
          severity: 'major',
          description: `Rubric mcAgency = ${r.mcAgency}/10 — MC bị động, không drive decisions.`,
        });
      }
      if (r.payoffConsequence <= 4) {
        parsed.issues.push({
          type: 'quality',
          severity: 'major',
          description: `Rubric payoffConsequence = ${r.payoffConsequence}/10 — chương rỗng, events không đổi status/resource/relationship.`,
        });
      }
      if (r.voiceDistinction <= 4) {
        parsed.issues.push({
          type: 'dialogue',
          severity: 'moderate',
          description: `Rubric voiceDistinction = ${r.voiceDistinction}/10 — nhân vật giống giọng.`,
        });
      }
    }

    // Hard enforcement: quality signal floor (legacy keyword counters — kept as
    // defense layer beneath rubric judge until rubric proves stable).
    const signal = analyzeQualitySignals(content);
    const missingQualityAxes: string[] = [];
    parsed.issues = parsed.issues || [];

    if (signal.comedyCount === 0) {
      missingQualityAxes.push('comedy');
      parsed.issues.push({
        type: 'quality',
        severity: 'moderate',
        description: 'Thiếu comedy beat tự nhiên (não bổ/vô sỉ/phản kém/tự giễu).',
      });
    }

    if (signal.innerCount === 0) {
      missingQualityAxes.push('inner_monologue');
      parsed.issues.push({
        type: 'quality',
        severity: 'moderate',
        description: 'Thiếu nội tâm đa lớp rõ ràng.',
      });
    }

    if (signal.slowCount === 0) {
      missingQualityAxes.push('slow_scene');
      parsed.issues.push({
        type: 'pacing',
        severity: 'moderate',
        description: 'Thiếu nhịp chậm để tạo tương phản cảm xúc.',
      });
    }

    if (signal.dialogueRatio >= 0.18 && signal.subtextCount === 0) {
      missingQualityAxes.push('subtext');
      parsed.issues.push({
        type: 'dialogue',
        severity: 'moderate',
        description: 'Đối thoại thiếu subtext (nói thẳng quá nhiều).',
      });
    }

    if (missingQualityAxes.length >= 2) {
      parsed.requiresRewrite = true;
      parsed.approved = false;
      parsed.overallScore = Math.min(parsed.overallScore || 10, capForGolden(5));
      const guidance = `Bổ sung bắt buộc: ${missingQualityAxes.join(', ')}.`;
      parsed.rewriteInstructions = parsed.rewriteInstructions
        ? `${parsed.rewriteInstructions} ${guidance}`
        : guidance;
    }

    // Hard enforcement for non-finale chapters: ending hook is required
    if (!isFinalArc && !hasCliffhangerSignal(content)) {
      parsed.issues = parsed.issues || [];
      parsed.issues.push({
        type: 'pacing',
        description: 'Kết chương thiếu lực kéo đọc tiếp (cliffhanger/ending hook yếu hoặc không có).',
        severity: 'major',
      });
      parsed.requiresRewrite = true;
      parsed.approved = false;
      parsed.overallScore = Math.min(parsed.overallScore || 10, capForGolden(5));
      if (!parsed.rewriteInstructions || parsed.rewriteInstructions.trim().length === 0) {
        parsed.rewriteInstructions = 'Viết lại đoạn kết để có cliffhanger/hook rõ ràng, tạo lý do đọc tiếp ngay chương sau.';
      }
    }

    // Phase 28 TIER 1: Centralized canon enforcement gates.
    // Runs deterministic checks (cast roster, timeline, POV, voice drift,
    // sensory floor, hook floor) and merges issues into Critic output.
    if (projectId) {
      try {
        const { enforceCanonGates } = await import('../quality/canon-enforcement');
        const expectedCharacters = (outline.scenes || [])
          .flatMap(s => s.characters || [])
          .filter(Boolean);

        // Phase 30 G7 — pull antagonist_schedule from master_outline so the
        // antagonist-scale gate can verify whether a major-tier marker has
        // pre-planned justification for this chapter index.
        let antagonistSchedule: Array<{ ch: number; tier: string }> | undefined;
        try {
          const { getSupabase } = await import('../utils/supabase');
          const db = getSupabase();
          const { data: row } = await db
            .from('ai_story_projects')
            .select('master_outline')
            .eq('id', projectId)
            .maybeSingle();
          const mo = row?.master_outline as { antagonist_schedule?: Array<{ ch: number; tier: string }> } | null;
          if (mo?.antagonist_schedule && Array.isArray(mo.antagonist_schedule)) {
            antagonistSchedule = mo.antagonist_schedule;
          }
        } catch { /* non-fatal — gate falls back to empty schedule */ }

        const canonIssues = await enforceCanonGates({
          projectId,
          chapterNumber: outline.chapterNumber,
          content,
          protagonistName: protagonistName || 'MC',
          genre,
          expectedCharacters: [...new Set(expectedCharacters)],
          antagonistSchedule,
          // expectedPov: project may set this in style_directives.pov in future
        });
        if (canonIssues.length > 0) {
          parsed.issues = parsed.issues || [];
          parsed.issues.push(...canonIssues);
          // Auto-promote: critical/major canon issues force rewrite.
          const hasMajorOrCritical = canonIssues.some(i => i.severity === 'critical' || i.severity === 'major');
          if (hasMajorOrCritical) {
            parsed.requiresRewrite = true;
            parsed.approved = false;
            parsed.overallScore = Math.min(parsed.overallScore || 10, capForGolden(5));
            const guideText = canonIssues
              .filter(i => i.severity === 'critical' || i.severity === 'major')
              .map(i => `[${i.severity}/${i.type}] ${i.description.slice(0, 200)}`)
              .join(' | ');
            parsed.rewriteInstructions = (parsed.rewriteInstructions || '') +
              ` CANON GATES: ${guideText}`;
          }
        }
      } catch (e) {
        console.warn(`[Critic] Canon enforcement gates threw:`, e instanceof Error ? e.message : String(e));
      }

      // Phase M.5 (2026-05-12): Arc enforcement gates — Supreme Goal 3
      // (directional plot progression). Deterministic checks against
      // master_outline volumes/sub-arcs. Plug-in after canon-enforcement
      // because canon focuses on character/world; arc focuses on plot
      // trajectory.
      try {
        const { enforceArcGates } = await import('../quality/arc-enforcement');
        const arcIssues = await enforceArcGates({
          projectId,
          chapterNumber: outline.chapterNumber,
          content,
        });
        if (arcIssues.length > 0) {
          parsed.issues = parsed.issues || [];
          parsed.issues.push(...arcIssues);
          const hasMajorOrCritical = arcIssues.some(
            (i) => i.severity === 'critical' || i.severity === 'major',
          );
          if (hasMajorOrCritical) {
            parsed.requiresRewrite = true;
            parsed.approved = false;
            parsed.overallScore = Math.min(parsed.overallScore || 10, capForGolden(5));
            const guideText = arcIssues
              .filter((i) => i.severity === 'critical' || i.severity === 'major')
              .map((i) => `[${i.severity}/${i.type}] ${i.description.slice(0, 200)}`)
              .join(' | ');
            parsed.rewriteInstructions =
              (parsed.rewriteInstructions || '') + ` ARC GATES: ${guideText}`;
          }
        }
      } catch (e) {
        console.warn(`[Critic] Arc enforcement gates threw:`, e instanceof Error ? e.message : String(e));
      }
    }

    return parsed;
  } catch (error) {
    // Fail closed: don't approve on error
    return createFailClosedCriticOutput(wordCount, targetWords);
  }
}

function createFailClosedCriticOutput(wordCount: number, targetWords: number): CriticOutput {
  // True fail-closed: if Critic couldn't parse, we have ZERO signal about
  // chapter quality. Previous version only required rewrite when word
  // count was <60% — meaning a decent-length but flawed chapter (logic
  // breaks, wrong MC name, fake currency) would ship silently.
  // User feedback: "cấm fallback hết, vì cứ 1 bộ nó im im nó fallback
  // là nó sẽ viết bậy nếu không theo đủ quy trình."
  // → Always force rewrite on Critic parse failure. Caller's retry loop
  // will burn an extra Writer call but the alternative is silent
  // bug-shipping. If we exhaust retries the loop throws — better than
  // saving bad content.
  return {
    overallScore: 3,
    dopamineScore: 3,
    pacingScore: 3,
    issues: [{
      type: 'critic_error',
      description: `Critic failed to parse output (wordCount=${wordCount}/${targetWords}). Forcing rewrite — no silent approval.`,
      severity: 'critical',
    }],
    approved: false,
    requiresRewrite: true,
    rewriteInstructions: `Critic không kiểm tra được chương này (parse failed). Viết lại CHẶT CHẼ theo brief, KHÔNG fallback padding. Đảm bảo: đủ từ ${targetWords}, không lặp setup, không lệch tên nhân vật/tiền tệ/địa danh.`,
  };
}


function buildTopicSection(topicId?: string): string {
  if (!topicId) return '';

  for (const genreConfig of Object.values(GENRE_CONFIG)) {
    const topic = genreConfig.topics.find(t => t.id === topicId);
    if (topic && topic.topicPromptHints) {
      return `\nTHÔNG TIN ĐẶC THÙ THỂ LOẠI (${topic.name}):\n` + 
             topic.topicPromptHints.map(h => `- ${h}`).join('\n') + '\n';
    }
  }

  return '';
}

function getDominantSceneType(outline: ChapterOutline): string {
  const sceneCounts: Record<string, number> = {};

  for (const scene of outline.scenes) {
    const type = inferSceneType(scene);
    sceneCounts[type] = (sceneCounts[type] || 0) + 1;
  }

  for (const dp of outline.dopaminePoints || []) {
    if (['face_slap', 'power_reveal', 'revenge'].includes(dp.type)) {
      sceneCounts['action'] = (sceneCounts['action'] || 0) + 1;
    } else if (['breakthrough'].includes(dp.type)) {
      sceneCounts['cultivation'] = (sceneCounts['cultivation'] || 0) + 1;
    } else if (['beauty_encounter'].includes(dp.type)) {
      sceneCounts['romance'] = (sceneCounts['romance'] || 0) + 1;
    }
  }

  let maxType = 'action';
  let maxCount = 0;
  for (const [type, count] of Object.entries(sceneCounts)) {
    if (count > maxCount) {
      maxCount = count;
      maxType = type;
    }
  }
  return maxType;
}

function inferSceneType(scene: { goal: string; conflict: string; resolution?: string; setting?: string }): SceneType {
  const text = `${scene.goal} ${scene.conflict} ${scene.resolution || ''} ${scene.setting || ''}`.toLowerCase();

  if (/chiến đấu|đánh|tấn công|kiếm|quyền|sát|giết|đấu|chiêu thức|pháp thuật/.test(text)) return 'action';
  if (/tu luyện|đột phá|đan điền|linh khí|cảnh giới|thiền/.test(text)) return 'cultivation';
  if (/tiết lộ|bí mật|phát hiện|sự thật/.test(text)) return 'revelation';
  if (/tình cảm|yêu|nhớ|thương|nàng|mỹ nhân/.test(text)) return 'romance';
  if (/hội thoại|nói chuyện|bàn bạc|thương lượng/.test(text)) return 'dialogue';
  if (/nguy hiểm|căng thẳng|bẫy|vây/.test(text)) return 'tension';
  if (/hài|cười|buồn cười/.test(text)) return 'comedy';
  return 'dialogue';
}

function buildVocabularyHints(outline: ChapterOutline, vocabulary: VocabularyGuide): string {
  if (!vocabulary) return '';

  const hints: string[] = ['TỪ VỰNG BẮT BUỘC SỬ DỤNG (dùng ít nhất 5-8 biểu đạt):'];

  const hasAction = outline.scenes.some(s => inferSceneType(s) === 'action');
  const hasCultivation = outline.scenes.some(s => inferSceneType(s) === 'cultivation');
  const dopamineTypes = (outline.dopaminePoints || []).map(d => d.type);

  if (hasAction || dopamineTypes.includes('face_slap') || dopamineTypes.includes('power_reveal')) {
    hints.push(`Chiêu thức: ${vocabulary.powerExpressions?.techniques?.slice(0, 4).join(', ') || ''}`);
    hints.push(`Uy lực: ${vocabulary.powerExpressions?.weakToStrong?.slice(0, 4).join(', ') || ''}`);
  }

  if (hasCultivation || dopamineTypes.includes('breakthrough')) {
    hints.push(`Đột phá: ${vocabulary.powerExpressions?.breakthrough?.slice(0, 4).join(', ') || ''}`);
  }

  if (dopamineTypes.includes('face_slap') || dopamineTypes.includes('revenge')) {
    hints.push(`Khinh bỉ: ${vocabulary.emotions?.contempt?.slice(0, 4).join(', ') || ''}`);
    hints.push(`Phẫn nộ: ${vocabulary.emotions?.anger?.slice(0, 4).join(', ') || ''}`);
  }

  hints.push(`Kinh ngạc: ${vocabulary.emotions?.shock?.slice(0, 4).join(', ') || ''}`);
  hints.push(`Quyết tâm: ${vocabulary.emotions?.determination?.slice(0, 3).join(', ') || ''}`);

  if ((outline.tensionLevel || 50) >= 70) {
    hints.push(`Bầu không khí: ${vocabulary.atmosphere?.tense?.slice(0, 3).join(', ') || ''}`);
  }

  hints.push(`Xưng hô bề trên: ${vocabulary.honorifics?.superior?.slice(0, 4).join(', ') || ''}`);
  hints.push(`Xưng hô ngang hàng: ${vocabulary.honorifics?.peer?.slice(0, 4).join(', ') || ''}`);

  return hints.join('\n');
}

/**
 * Build genre-specific anti-cliche section for Writer prompt.
 * Supplements the static WRITER_SYSTEM anti-cliche rules with genre-targeted bans.
 */
function buildGenreAntiClicheSection(genre: GenreType): string {
  const phrases = getGenreAntiCliche(genre);
  if (phrases.length === 0) return '';
  return `\nCẤM CỤM TỪ CLICHÉ THỂ LOẠI (${genre}):
${phrases.map(p => `- "${p}"`).join('\n')}
→ Thay bằng miêu tả cụ thể, hành động thực tế, hoặc chi tiết 5 giác quan.\n`;
}

/**
 * Extract foreshadowing GIEO/PAYOFF hints from context and format as
 * forceful instructions for the Architect. This ensures the Architect
 * explicitly plans scenes that incorporate pending foreshadowing hints
 * rather than leaving them buried in the general context.
 */
function extractForeshadowingForArchitect(context: string): string {
  if (!context) return '';

  const foreshadowMatch = context.match(/═══ FORESHADOWING[\s\S]*?(?=═══ [A-Z]|\[|$)/);
  if (!foreshadowMatch) return '';

  const parts: string[] = [];

  // Extract GIEO hints (must plant)
  const plantMatches = [...foreshadowMatch[0].matchAll(/🌱 GIEO HINT\s*\[([^\]]+)\]:\s*(.+)/g)];
  if (plantMatches.length > 0) {
    parts.push('🌱 FORESHADOWING — GIEO BẮT BUỘC (Architect PHẢI lên kế hoạch scene chứa hint):');
    for (const m of plantMatches) {
      parts.push(`  - [${m[1]}] ${m[2].trim().slice(0, 200)}`);
    }
    parts.push('  → Chọn scene PHÙ HỢP NHẤT để gieo hint một cách TỰ NHIÊN. Ghi rõ trong scene goal/resolution.');
  }

  // Extract PAYOFF hints (must resolve)
  const payoffMatches = [...foreshadowMatch[0].matchAll(/💥 PAYOFF HINT:\s*(.+)/g)];
  const payoffDescMatches = [...foreshadowMatch[0].matchAll(/→ Callback rõ ràng:\s*"([^"]+)"/g)];
  if (payoffMatches.length > 0) {
    parts.push('💥 FORESHADOWING — PAYOFF BẮT BUỘC (Architect PHẢI tạo scene callback):');
    for (let i = 0; i < payoffMatches.length; i++) {
      const hint = payoffMatches[i][1].trim().slice(0, 200);
      const desc = payoffDescMatches[i]?.[1] || '';
      parts.push(`  - Hint: ${hint}${desc ? ` → Payoff: ${desc}` : ''}`);
    }
    parts.push('  → Tạo khoảnh khắc "à, hóa ra hồi đó..." — người đọc nhớ lại chi tiết gốc.');
  }

  // Extract overdue hints
  const overdueMatches = [...foreshadowMatch[0].matchAll(/⏰ OVERDUE HINT[^:]*:\s*"([^"]+)"\s*→\s*"([^"]+)"/g)];
  if (overdueMatches.length > 0) {
    parts.push('⏰ FORESHADOWING — SẮP HẾT HẠN (ưu tiên cao):');
    for (const m of overdueMatches) {
      parts.push(`  - "${m[1].slice(0, 150)}" → payoff: "${m[2].slice(0, 150)}"`);
    }
    parts.push('  → Bắt đầu setup payoff NGAY trong chương này.');
  }

  if (parts.length === 0) return '';
  return '\n' + parts.join('\n') + '\n';
}

/**
 * Extract quality module expectations from context for Critic compliance verification.
 * Pulls foreshadowing hints, character signature traits, and pacing mood
 * so the Critic can verify the Writer actually used them.
 */
function buildQualityComplianceSection(context: string): string {
  if (!context) return '';
  const parts: string[] = [];

  // Extract foreshadowing hints (GIEO and PAYOFF sections)
  const foreshadowMatch = context.match(/═══ FORESHADOWING[\s\S]*?(?=═══ [A-Z]|$)/);
  if (foreshadowMatch) {
    const hintLines: string[] = [];
    const plantMatches = foreshadowMatch[0].matchAll(/🌱 GIEO HINT[^:]*:\s*(.+)/g);
    for (const m of plantMatches) hintLines.push(`- GIEO: ${m[1].trim().slice(0, 150)}`);
    const payoffMatches = foreshadowMatch[0].matchAll(/💥 PAYOFF HINT:\s*(.+)/g);
    for (const m of payoffMatches) hintLines.push(`- PAYOFF: ${m[1].trim().slice(0, 150)}`);

    if (hintLines.length > 0) {
      parts.push('YÊU CẦU TUÂN THỦ — FORESHADOWING:');
      parts.push(...hintLines);
    }
  }

  // Extract character signature traits
  const charArcMatch = context.match(/═══ CHARACTER ARCS[\s\S]*?(?=═══ [A-Z]|$)/);
  if (charArcMatch) {
    const traitLines: string[] = [];
    const charBlocks = charArcMatch[0].matchAll(/【([^】]+)】[\s\S]*?(?=【|$)/g);
    for (const block of charBlocks) {
      const name = block[1];
      const traits: string[] = [];
      const speechMatch = block[0].match(/🗣 Cách nói:\s*(.+)/);
      if (speechMatch) traits.push(`cách nói: ${speechMatch[1].trim()}`);
      const catchphraseMatch = block[0].match(/💬 Câu cửa miệng:\s*"([^"]+)"/);
      if (catchphraseMatch) traits.push(`câu cửa miệng: "${catchphraseMatch[1]}"`);
      const habitMatch = block[0].match(/🔄 Thói quen:\s*(.+)/);
      if (habitMatch) traits.push(`thói quen: ${habitMatch[1].trim()}`);
      const quirkMatch = block[0].match(/🎭 Gap Moe:\s*(.+)/);
      if (quirkMatch) traits.push(`quirk: ${quirkMatch[1].trim()}`);
      if (traits.length > 0) {
        traitLines.push(`- ${name}: ${traits.join(', ')}`);
      }
    }
    if (traitLines.length > 0) {
      parts.push('YÊU CẦU TUÂN THỦ — CHARACTER TRAITS:');
      parts.push(...traitLines);
    }
  }

  // Extract pacing mood
  const pacingMatch = context.match(/═══ NHỊP TRUYỆN[\s\S]*?(?=═══ [A-Z]|$)/);
  if (pacingMatch) {
    const moodMatch = pacingMatch[0].match(/(BUILDUP|RISING|CALM BEFORE STORM|CLIMAX|AFTERMATH|TRAINING|VILLAIN FOCUS|COMEDIC BREAK|REVELATION|TRANSITION)/);
    const intensityMatch = pacingMatch[0].match(/Cường độ:\s*(\d+)\/10/);
    if (moodMatch) {
      parts.push(`YÊU CẦU TUÂN THỦ — PACING: mood="${moodMatch[1]}"${intensityMatch ? `, cường độ=${intensityMatch[1]}/10` : ''}`);
    }
  }

  if (parts.length === 0) return '';
  return '\n' + parts.join('\n') + '\n';
}

function buildCharacterVoiceGuide(outline: ChapterOutline, worldBible?: string): string {
  // Extract character names from outline
  const charNames = new Set<string>();
  for (const scene of outline.scenes) {
    for (const char of scene.characters) {
      charNames.add(char);
    }
  }

  if (charNames.size === 0) return '';

  const lines: string[] = [
    'GIỌNG NÓI NHÂN VẬT (BẮT BUỘC — mỗi nhân vật PHẢI có giọng khác biệt rõ rệt):',
    '',
    'NGUYÊN TẮC VÀNG: Che tên nhân vật, người đọc vẫn PHẢI nhận ra ai đang nói qua cách dùng từ.',
    '',
    'QUY TẮC GIỌNG NÓI THEO VAI TRÒ:',
    '• MC (nhân vật chính): Câu ngắn, dứt khoát. Khi căng thẳng dùng từ thô/chửi nhẹ. Có nội tâm tự giễu nhại, bình luận khô khan. Xưng "ta/tôi" tùy hoàn cảnh.',
    '• Đồng minh nữ/AI: Dùng thuật ngữ chuyên môn khi nghiêm túc, mỉa mai khi bình thường. Xưng hô theo quan hệ (ví dụ: "Ngài" khi công việc, bỏ formality khi hoảng).',
    '• Phản diện cấp cao: KHÔNG BAO GIỜ chửi bới. Nói lịch sự, dùng ẩn dụ, giấu sát khí trong lời ngọt. Câu dài, nhấn nhá.',
    '• Phản diện cấp thấp: Nói nhiều, khoe khoang, dùng từ thô. Câu ngắn, hung hãn.',
    '• Bystander/NPC: Ngắn gọn, dùng tiếng lóng/phương ngữ. Phản ứng cảm xúc trực tiếp.',
    '• Trẻ em/em gái: Câu ngắn, từ đơn giản, ngây thơ nhưng đôi khi sâu sắc bất ngờ.',
    '',
  ];

  for (const name of charNames) {
    lines.push(`- ${name}: ÁP DỤNG quy tắc giọng nói phù hợp vai trò ở trên. Tạo ít nhất 1 đặc điểm ngôn ngữ riêng (cách xưng hô, thói quen ngôn ngữ, hoặc cách phản ứng đặc trưng).`);
  }

  return lines.join('\n');
}
