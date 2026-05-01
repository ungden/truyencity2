/**
 * Story Engine v2 — Relevance Ranking (Phase 27 W4.1)
 *
 * Smart context selection for 1000+ chapter novels. Pre-Phase-27, the context
 * assembler dumped EVERY layer fully formed into the AI prompt. At ch.500+:
 *   - Cast roster: 50+ characters × 200 chars = 10K
 *   - Plot threads: 12 active × 300 chars = 3.6K
 *   - Foreshadowing: 8 hints × 150 chars = 1.2K
 *   - Memory chunks: 1500+ rows in pgvector (unused most of the time)
 *   - World rules + factions + items + cultures = +20K
 * Total context per write at ch.800: easily 80-120K chars. AI gets overwhelmed
 * → focus loss → drift. 1M context window doesn't help if signal-to-noise is bad.
 *
 * Phase 27 W4.1: rank by relevance to the CURRENT scene.
 *
 * Inputs:
 *   - Recent chapter content (ch.N-3 to N-1) + outline brief for ch.N
 *   - Full cast roster, full plot threads, full faction list
 *
 * Outputs:
 *   - Top-K characters most likely to appear in ch.N
 *   - Top-K plot threads relevant to current arc
 *   - Top-K factions in active conflict zone
 *
 * Heuristics (no AI calls — fast):
 *   - Character relevance = recently_active_score (last_seen_chapter) +
 *     mentioned_in_recent_chapters (substring match)
 *   - Plot thread relevance = priority + last_active_chapter recency +
 *     overlap with active characters
 *   - Faction relevance = importance + last_active_chapter recency
 *
 * Đại thần workflow mapping:
 *   Real authors don't reread every page before writing each chapter — they
 *   focus on what's RELEVANT to the immediate scene. This module simulates
 *   that focus.
 */

import type { CastMember } from '../state/cast-database';

// ── Types ────────────────────────────────────────────────────────────────────

export interface RelevanceInput {
  currentChapter: number;
  recentChapterTexts?: string[]; // last 3-5 chapter contents (for substring matching)
  arcBriefText?: string;          // arc plan brief for current chapter
  protagonistName: string;
}

export interface RankedCast {
  member: CastMember;
  score: number;
  reasons: string[];
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Rank characters by relevance to current writing context.
 * Returns sorted desc by score; caller takes top-K.
 *
 * Score components:
 *   +50: protagonist (always include)
 *   +30: last_seen within 10 chapters
 *   +20: last_seen within 30 chapters
 *   +10: last_seen within 100 chapters
 *   +25: name mentioned in recent chapter texts
 *   +15: name mentioned in arc brief
 *   -20: dead status (still include for reference but lower priority)
 */
export function rankCastByRelevance(
  cast: CastMember[],
  input: RelevanceInput,
): RankedCast[] {
  const lowerRecentText = (input.recentChapterTexts || []).join('\n').toLowerCase();
  const lowerBrief = (input.arcBriefText || '').toLowerCase();
  const protagonistLower = input.protagonistName.toLowerCase();

  const ranked: RankedCast[] = cast.map(c => {
    let score = 0;
    const reasons: string[] = [];

    // Protagonist always priority.
    if (c.characterName.toLowerCase() === protagonistLower) {
      score += 50;
      reasons.push('protagonist');
    }

    const recencyGap = input.currentChapter - c.lastSeenChapter;
    if (recencyGap <= 10) {
      score += 30; reasons.push(`recent (gap ${recencyGap})`);
    } else if (recencyGap <= 30) {
      score += 20; reasons.push(`mid-recent (gap ${recencyGap})`);
    } else if (recencyGap <= 100) {
      score += 10; reasons.push(`distant (gap ${recencyGap})`);
    } else {
      reasons.push(`stale (gap ${recencyGap})`);
    }

    if (lowerRecentText.includes(c.characterName.toLowerCase())) {
      score += 25;
      reasons.push('mentioned in recent chapters');
    }

    if (lowerBrief.includes(c.characterName.toLowerCase())) {
      score += 15;
      reasons.push('mentioned in arc brief');
    }

    if (c.status === 'dead') {
      score -= 20;
      reasons.push('dead (deprioritized)');
    }

    return { member: c, score, reasons };
  });

  return ranked.sort((a, b) => b.score - a.score);
}

/**
 * Format ranked cast for context injection. Returns top-K with concise lines.
 * Each line: name | status | location | last_seen | reasons.
 */
export function formatRankedCastContext(
  ranked: RankedCast[],
  options: { topK?: number; maxChars?: number } = {},
): string {
  const topK = options.topK ?? 25;
  const maxChars = options.maxChars ?? 4000;

  const top = ranked.slice(0, topK);
  if (top.length === 0) return '';

  const lines: string[] = ['[CAST RELEVANCE-RANKED — focused selection cho chương này]'];
  let total = lines[0].length;

  for (const r of top) {
    const c = r.member;
    const power = c.powerLevel ? ` | ${c.powerLevel}` : '';
    const loc = c.location ? ` @${c.location}` : '';
    const line = `  • ${c.characterName} [${c.status}${power}${loc}] last ch.${c.lastSeenChapter} (score ${r.score})`;
    if (total + line.length > maxChars) {
      lines.push(`  ... (${ranked.length - lines.length + 1} more truncated)`);
      break;
    }
    lines.push(line);
    total += line.length;
  }
  return lines.join('\n');
}

// ── Budget enforcement ──────────────────────────────────────────────────────

/**
 * Enforce a token budget on a list of context parts. Drops lowest-priority
 * parts (caller-provided priority order) until total chars fit budget.
 *
 * Used by context/assembler.ts at ch.500+ to prevent context bloat.
 */
export function enforceBudget(
  parts: Array<{ name: string; content: string; priority: number }>,
  maxTotalChars: number,
): { kept: Array<{ name: string; content: string }>; dropped: string[] } {
  // Sort by priority desc so highest priority is kept first.
  const sorted = [...parts].sort((a, b) => b.priority - a.priority);
  const kept: Array<{ name: string; content: string }> = [];
  const dropped: string[] = [];
  let total = 0;

  for (const p of sorted) {
    if (total + p.content.length <= maxTotalChars) {
      kept.push({ name: p.name, content: p.content });
      total += p.content.length;
    } else {
      // Try to truncate to fit.
      const remaining = maxTotalChars - total;
      if (remaining > 500) {
        kept.push({
          name: p.name,
          content: p.content.slice(0, remaining - 50) + '\n... [truncated]',
        });
        total = maxTotalChars;
      } else {
        dropped.push(p.name);
      }
    }
  }

  return { kept, dropped };
}

/**
 * Suggested priority weights for context layers (higher = keep first under budget).
 * Caller can override.
 */
export const DEFAULT_LAYER_PRIORITIES: Record<string, number> = {
  worldDescription: 100,
  bridge: 95,
  recentChapterFullText: 90,
  cast: 85, // ranked subset
  characterStates: 80,
  storyOutline: 75,
  volumeContext: 70,
  recentChapters: 65,
  worldbuildingCanon: 60,
  plotThreads: 58,
  foreshadowing: 55,
  powerSystemCanon: 50,
  pacingDirector: 48,
  rag: 45,
  factions: 40,
  characterArcs: 38,
  voiceFingerprint: 35,
  plotTwists: 32,
  themes: 30,
  inventory: 28,
  timeline: 25,
  pacingBeat: 20,
  worldRules: 18,
  geography: 15,
  knowledge: 12,
  relationships: 10,
  economic: 8,
  characterBibles: 5,
};
