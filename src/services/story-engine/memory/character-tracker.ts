/**
 * Story Engine v2 — Character Tracker
 *
 * Extracts character states from chapter content via AI and stores in DB.
 * Replaces extractAndSaveCharacterStates() from v1 context-generators.ts.
 *
 * Non-fatal: all errors are caught so chapter writing continues.
 */

import { getSupabase } from '../utils/supabase';
import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import type { GeminiConfig } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

interface CharacterStateRow {
  character_name: string;
  status: 'alive' | 'dead' | 'missing' | 'unknown';
  power_level: string | null;
  power_realm_index: number | null;
  location: string | null;
  personality_quirks: string | null;
  notes: string | null;
}

const VALID_STATUSES = new Set(['alive', 'dead', 'missing', 'unknown']);

// ── Public: Extract & Save Character States ──────────────────────────────────

/**
 * Send chapter content to Gemini to extract every character's current state,
 * then upsert into character_states table.
 */
export async function extractAndSaveCharacterStates(
  projectId: string,
  chapterNumber: number,
  content: string,
  protagonistName: string,
  config: GeminiConfig,
): Promise<void> {
  try {
    // Truncate content: first 8000 + last 3000 chars if long
    let truncated = content;
    if (content.length > 11000) {
      truncated = content.slice(0, 8000) + '\n...\n' + content.slice(-3000);
    }

    const prompt = `Trích xuất trạng thái TỪNG nhân vật xuất hiện trong chương. Trả về JSON array:
[
  {
    "character_name": "tên",
    "status": "alive|dead|missing|unknown",
    "power_level": "cảnh giới/sức mạnh hiện tại hoặc null",
    "power_realm_index": null,
    "location": "vị trí cuối chương hoặc null",
    "personality_quirks": "đặc điểm tính cách, thói quen nổi bật, tấu hài hoặc điểm nhấn (rất quan trọng để giữ cái hồn nhân vật) hoặc null",
    "notes": "ghi chú ngắn quan trọng hoặc null"
  }
]

Nhân vật chính: ${protagonistName}
Chỉ liệt kê nhân vật THỰC SỰ xuất hiện hoặc được nhắc đến.

NỘI DUNG CHƯƠNG ${chapterNumber}:
${truncated}`;

    const res = await callGemini(prompt, {
      ...config,
      temperature: 0.2,
      maxTokens: 4096,
    }, { jsonMode: true });

    let states: CharacterStateRow[];
    try {
      states = JSON.parse(res.content);
    } catch {
      const repaired = parseJSON<CharacterStateRow[]>(res.content);
      if (!repaired) return;
      states = repaired;
    }

    if (!Array.isArray(states) || states.length === 0) return;

    // Validate and clean
    const rows = states
      .filter(s => s.character_name && s.character_name.trim().length > 0)
      .map(s => ({
        project_id: projectId,
        chapter_number: chapterNumber,
        character_name: s.character_name.trim(),
        status: VALID_STATUSES.has(s.status) ? s.status : 'alive',
        power_level: s.power_level || null,
        power_realm_index: typeof s.power_realm_index === 'number' ? s.power_realm_index : null,
        location: s.location || null,
        personality_quirks: s.personality_quirks || null,
        notes: s.notes || null,
      }));

    if (rows.length === 0) return;

    // Batch upsert
    const db = getSupabase();
    await db.from('character_states').upsert(rows, {
      onConflict: 'project_id,chapter_number,character_name',
    });
  } catch {
    // Non-fatal
  }
}

// ── Public: Load Latest Character States for Context ─────────────────────────

/**
 * Load the latest state of each character (deduplicated by name, most recent chapter wins).
 * Returns a formatted Vietnamese string for prompt injection, or undefined.
 */
export async function loadCharacterStatesText(
  projectId: string,
): Promise<string | undefined> {
  try {
    const db = getSupabase();
    const { data } = await db
      .from('character_states')
      .select('character_name,status,power_level,power_realm_index,location,personality_quirks,notes,chapter_number')
      .eq('project_id', projectId)
      .order('chapter_number', { ascending: false })
      .limit(50);

    if (!data || data.length === 0) return undefined;

    // Deduplicate: keep latest per character
    const map = new Map<string, (typeof data)[0]>();
    for (const row of data) {
      if (!map.has(row.character_name)) map.set(row.character_name, row);
    }

    const chars = [...map.values()];
    const alive = chars.filter(c => c.status === 'alive');
    const dead = chars.filter(c => c.status === 'dead');

    if (chars.length === 0) return undefined;

    const parts: string[] = ['[NHÂN VẬT HIỆN TẠI — CẤM MÂU THUẪN]'];
    for (const c of alive) {
      let line = `• ${c.character_name} (${c.status})`;
      if (c.power_level) line += ` — ${c.power_level}`;
      if (c.location) line += ` tại ${c.location}`;
      if (c.personality_quirks) line += ` | Tính cách/Thói quen: ${c.personality_quirks}`;
      if (c.notes) line += ` | ${c.notes}`;
      parts.push(line);
    }
    if (dead.length > 0) {
      parts.push(`\nĐÃ CHẾT (KHÔNG ĐƯỢC XUẤT HIỆN): ${dead.map(c => c.character_name).join(', ')}`);
    }

    return parts.join('\n');
  } catch {
    return undefined;
  }
}
