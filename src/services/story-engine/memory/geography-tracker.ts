/**
 * Story Engine v2 — Geography Tracker
 *
 * Detects geography teleportation: a character at location A in chapter N
 * suddenly at location B in chapter N+1 without travel/transition scene.
 *
 * Strategy:
 *  - Post-write: record location for each character that had a state update
 *  - Pre-write: surface "MC currently at X (since ch.Y)" to Architect/Writer
 *  - Critic: flag teleportation if previous location ≠ current location
 *    AND chapter content lacks travel verbs (đi, bay, đến, rời, tới, bước vào)
 */

import { getSupabase } from '../utils/supabase';

const TRAVEL_VERBS = /\b(đi|bay|đến|rời|tới|bước vào|trở về|quay về|vào|ra khỏi|tiến vào|chạy đến|lao đến|ghé qua|ghé thăm|hạ cánh|đáp xuống|teleport|dịch chuyển|không gian)\b/i;

export interface LocationTimelineEntry {
  chapter_number: number;
  character_name: string;
  location: string;
  transition_type: string;
  notes?: string | null;
}

// ── Public: load context for Writer ────────────────────────────────────────

export async function getGeographyContext(
  projectId: string,
  chapterNumber: number,
  protagonistName: string,
): Promise<string | null> {
  if (chapterNumber <= 1) return null;
  try {
    const db = getSupabase();
    const { data } = await db
      .from('location_timeline')
      .select('chapter_number,location,transition_type')
      .eq('project_id', projectId)
      .eq('character_name', protagonistName)
      .order('chapter_number', { ascending: false })
      .limit(3);

    if (!data?.length) return null;
    const latest = data[0];
    const prior = data[1];

    const lines: string[] = [`[GEOGRAPHY — VỊ TRÍ MC HIỆN TẠI]`];
    lines.push(`📍 ${protagonistName} đang ở: ${latest.location} (từ chương ${latest.chapter_number})`);
    if (prior && prior.location !== latest.location) {
      lines.push(`   (trước đó: ${prior.location} — ch.${prior.chapter_number})`);
    }
    lines.push(`→ Nếu chương này MC chuyển địa điểm khác, BẮT BUỘC viết scene di chuyển/chuyển cảnh rõ ràng (đi xe, bước vào, hạ cánh, v.v.) — KHÔNG được teleport vô lý.`);
    return lines.join('\n');
  } catch {
    return null;
  }
}

// ── Public: post-write record ──────────────────────────────────────────────

export async function recordLocationFromCharacters(
  projectId: string,
  chapterNumber: number,
  content: string,
  characters: Array<{ character_name: string; location: string | null }>,
): Promise<void> {
  try {
    const db = getSupabase();
    const rows: Array<{ project_id: string; chapter_number: number; character_name: string; location: string; transition_type: string; notes: string | null }> = [];

    for (const c of characters) {
      if (!c.location || !c.character_name) continue;
      // Lookup previous location
      const { data: prev } = await db
        .from('location_timeline')
        .select('location,chapter_number')
        .eq('project_id', projectId)
        .eq('character_name', c.character_name)
        .lt('chapter_number', chapterNumber)
        .order('chapter_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      let transitionType = 'stayed';
      let notes: string | null = null;
      if (!prev) {
        transitionType = 'arrived';
      } else if (prev.location !== c.location) {
        // Location changed — check if travel verbs present in chapter content
        if (TRAVEL_VERBS.test(content)) {
          transitionType = 'arrived';
        } else {
          transitionType = 'teleport_flag';
          notes = `from "${prev.location}" (ch.${prev.chapter_number}) — no travel scene detected`;
        }
      }

      rows.push({
        project_id: projectId,
        chapter_number: chapterNumber,
        character_name: c.character_name,
        location: c.location,
        transition_type: transitionType,
        notes,
      });
    }

    if (rows.length === 0) return;
    const { error } = await db.from('location_timeline').upsert(rows, {
      onConflict: 'project_id,chapter_number,character_name',
    });
    if (error) {
      console.warn(`[GeographyTracker] Failed to record location timeline: ${error.message}`);
    }
  } catch (e) {
    console.warn(`[GeographyTracker] recordLocationFromCharacters failed:`, e instanceof Error ? e.message : String(e));
  }
}
