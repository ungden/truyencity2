/**
 * Story Engine v2 — Voice Anchor (Phase 27 W4.2)
 *
 * Combats voice drift in 1000+ chapter novels.
 *
 * Pre-Phase-27 problem:
 *   - voice_fingerprint module DETECTS drift but doesn't INTERVENE.
 *   - Over 800 chapters, AI's prose style slowly diverges from the "intended"
 *     voice established at ch.1-3. By ch.800 sentences have different rhythm,
 *     dialogue is different cadence, narration tone shifts.
 *   - Even with 1M context, AI can't perfectly maintain stylistic consistency
 *     without explicit anchoring.
 *
 * Phase 27 W4.2 fix:
 *   1. After ch.3 is written: extract 3-5 prose snippets from ch.1-3 (opening,
 *      dialogue, narration, inner_monologue, action_scene). Persist as
 *      voice_anchors (immutable canonical voice).
 *   2. Every 50 chapters from ch.50 onwards: re-feed these anchors to Writer
 *      prompt as "VOICE REFERENCE — sample prose của truyện này, viết theo
 *      cùng cadence/style".
 *   3. voice_fingerprint at ch.X compares against anchor for drift detection.
 *
 * Đại thần workflow mapping:
 *   "声音锚" — top web novel authors re-read chương 1-3 before writing each
 *   new chapter to ground their voice. Without this, AI's style drifts.
 */

import { getSupabase } from '../utils/supabase';

// ── Types ────────────────────────────────────────────────────────────────────

type SnippetType = 'opening' | 'dialogue' | 'narration' | 'inner_monologue' | 'action_scene';

export interface VoiceAnchor {
  chapterNumber: number;
  snippetType: SnippetType;
  snippetText: string;
  voiceMetrics: VoiceMetrics | null;
}

export interface VoiceMetrics {
  avgSentenceLength: number;
  dialogueRatio: number;
  paragraphAvgLength: number;
  emDashCount: number;
  exclamationRatio: number;
}

// ── Anchor extraction (called after ch.3 written) ────────────────────────────

/**
 * Extract voice anchors from chapters 1-3 content. Idempotent — skip if
 * anchors already captured for this project.
 */
export async function captureVoiceAnchors(
  projectId: string,
  chapters: Array<{ chapter_number: number; content: string }>,
): Promise<{ captured: number }> {
  try {
    const db = getSupabase();
    const { count } = await db
      .from('voice_anchors')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId);
    if ((count ?? 0) >= 3) return { captured: 0 };

    const rows: Array<{
      project_id: string;
      chapter_number: number;
      snippet_type: SnippetType;
      snippet_text: string;
      voice_metrics: VoiceMetrics;
    }> = [];

    for (const ch of chapters.slice(0, 3)) {
      if (!ch.content || ch.content.length < 1000) continue;

      // 1. Opening snippet — first 800 chars.
      const opening = ch.content.slice(0, 800).trim();
      if (opening.length >= 400) {
        rows.push({
          project_id: projectId,
          chapter_number: ch.chapter_number,
          snippet_type: 'opening',
          snippet_text: opening,
          voice_metrics: computeVoiceMetrics(opening),
        });
      }

      // 2. Dialogue snippet — first 800 chars containing em-dash dialogue.
      const dialogue = extractDialogueSnippet(ch.content);
      if (dialogue && dialogue.length >= 400) {
        rows.push({
          project_id: projectId,
          chapter_number: ch.chapter_number,
          snippet_type: 'dialogue',
          snippet_text: dialogue,
          voice_metrics: computeVoiceMetrics(dialogue),
        });
      }

      // 3. Narration snippet — first 800 chars NOT containing em-dash.
      const narration = extractNarrationSnippet(ch.content);
      if (narration && narration.length >= 400) {
        rows.push({
          project_id: projectId,
          chapter_number: ch.chapter_number,
          snippet_type: 'narration',
          snippet_text: narration,
          voice_metrics: computeVoiceMetrics(narration),
        });
      }
    }

    if (rows.length === 0) return { captured: 0 };

    const { error } = await db.from('voice_anchors').upsert(rows, {
      onConflict: 'project_id,chapter_number,snippet_type',
    });
    if (error) {
      console.warn(`[voice-anchor] Insert failed: ${error.message}`);
      return { captured: 0 };
    }

    console.log(`[voice-anchor] Captured ${rows.length} anchor snippets for project ${projectId}.`);
    return { captured: rows.length };
  } catch (e) {
    console.warn(`[voice-anchor] captureVoiceAnchors threw:`, e instanceof Error ? e.message : String(e));
    return { captured: 0 };
  }
}

// ── Anchor refresh injection ─────────────────────────────────────────────────

/**
 * Returns voice anchor context for the Writer prompt.
 * Cadence: every 50 chapters from ch.50, plus every chapter from ch.500+.
 *
 * Logic:
 *   - currentChapter < 30: return null (anchors not yet captured / unnecessary)
 *   - 30 ≤ currentChapter < 500: return anchors only at multiples of 50
 *   - currentChapter ≥ 500: always return (drift accumulates faster at scale)
 */
export async function getVoiceAnchorContext(
  projectId: string,
  currentChapter: number,
): Promise<string | null> {
  if (currentChapter < 30) return null;
  if (currentChapter < 500 && currentChapter % 50 !== 0) return null;

  try {
    const db = getSupabase();
    const { data } = await db
      .from('voice_anchors')
      .select('chapter_number,snippet_type,snippet_text')
      .eq('project_id', projectId)
      .order('chapter_number', { ascending: true });

    if (!data?.length) return null;

    const lines: string[] = [
      '[VOICE ANCHOR — SAMPLE PROSE TỪ CHƯƠNG 1-3, VIẾT THEO CADENCE/STYLE NÀY]',
      'Đây là giọng văn cốt lõi đã thiết lập. KHÔNG được drift sang style khác sau hàng trăm chương.',
    ];

    // Limit total chars: 3 snippets × 800 = 2400 chars.
    const seenTypes = new Set<string>();
    let totalChars = lines.join('\n').length;
    for (const a of data) {
      if (seenTypes.has(a.snippet_type)) continue;
      seenTypes.add(a.snippet_type);
      const block = `\n--- ${a.snippet_type.toUpperCase()} (ch.${a.chapter_number}) ---\n${a.snippet_text}`;
      if (totalChars + block.length > 4000) break;
      lines.push(block);
      totalChars += block.length;
    }

    lines.push('\n→ Khi viết chương này, GIỮ NGUYÊN cadence + tone + dialogue style trên. KHÔNG đổi giọng văn theo "AI default".');
    return lines.join('\n');
  } catch (e) {
    console.warn(`[voice-anchor] getVoiceAnchorContext threw:`, e instanceof Error ? e.message : String(e));
    return null;
  }
}

// ── Extractors ───────────────────────────────────────────────────────────────

function extractDialogueSnippet(content: string): string | null {
  // Find first paragraph with em-dash dialogue.
  const paragraphs = content.split(/\n\n+/);
  let collected = '';
  for (const p of paragraphs) {
    if (p.includes('—') || p.includes('-')) {
      collected += p + '\n\n';
      if (collected.length >= 800) break;
    }
  }
  return collected.trim().slice(0, 800) || null;
}

function extractNarrationSnippet(content: string): string | null {
  const paragraphs = content.split(/\n\n+/);
  let collected = '';
  for (const p of paragraphs) {
    // Skip paragraphs that are dialogue-heavy.
    if (p.includes('—')) continue;
    if (p.length < 100) continue;
    collected += p + '\n\n';
    if (collected.length >= 800) break;
  }
  return collected.trim().slice(0, 800) || null;
}

function computeVoiceMetrics(text: string): VoiceMetrics {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  const emDashCount = (text.match(/—/g) || []).length;
  const exclamations = (text.match(/!/g) || []).length;
  const dialogueParagraphs = paragraphs.filter(p => p.includes('—')).length;

  return {
    avgSentenceLength: sentences.length > 0 ? text.length / sentences.length : 0,
    dialogueRatio: paragraphs.length > 0 ? dialogueParagraphs / paragraphs.length : 0,
    paragraphAvgLength: paragraphs.length > 0 ? text.length / paragraphs.length : 0,
    emDashCount,
    exclamationRatio: sentences.length > 0 ? exclamations / sentences.length : 0,
  };
}
