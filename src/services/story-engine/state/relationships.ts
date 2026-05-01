/**
 * Story Engine v2 — Relationship Tracker
 *
 * Lightweight per-chapter extraction of A↔B relationship states.
 * Detects illogical flips (love→hate, ally→enemy without trigger) — supports long-form coherence.
 *
 * DB table: character_relationships (migration 0150)
 *   project_id, chapter_number, character_a, character_b, relationship_type, intensity, notes
 */

import { getSupabase } from '../utils/supabase';
import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import type { GeminiConfig } from '../types';

interface RelationshipEntry {
  character_a: string;
  character_b: string;
  relationship_type: 'love' | 'friendship' | 'rivalry' | 'hate' | 'family' | 'mentor' | 'enemy' | 'ally' | 'neutral' | 'romantic_interest';
  intensity?: number;
  notes?: string;
}

const RELATIONSHIP_TYPES = ['love', 'friendship', 'rivalry', 'hate', 'family', 'mentor', 'enemy', 'ally', 'neutral', 'romantic_interest'];

// ── Extract relationships from chapter content (post-write) ──────────────────

export async function extractRelationships(
  projectId: string,
  chapterNumber: number,
  chapterContent: string,
  knownCharacters: string[],
  config: GeminiConfig,
): Promise<void> {
  if (knownCharacters.length < 2) return;
  if (chapterNumber < 2) return; // need at least chapter 2 for relationships to exist

  const prompt = `Phân tích các mối quan hệ giữa các nhân vật được thể hiện trong chương ${chapterNumber}.

Nhân vật đã biết: ${knownCharacters.slice(0, 15).join(', ')}

Nội dung chương (cắt 3000 chars):
${chapterContent.slice(0, 3000)}

Trả về JSON: chỉ những CẶP nhân vật có TƯƠNG TÁC RÕ trong chương này (skip nếu chỉ nhắc tên).
{
  "relationships": [
    {
      "character_a": "tên A",
      "character_b": "tên B",
      "relationship_type": "love|friendship|rivalry|hate|family|mentor|enemy|ally|neutral|romantic_interest",
      "intensity": 1-10,
      "notes": "ngắn (max 100 chars) — context cụ thể từ chương"
    }
  ]
}

QUY TẮC:
- Chỉ extract cặp có TƯƠNG TÁC THỰC SỰ trong chương (nói chuyện, cùng làm việc, gặp gỡ).
- Tối đa 8 cặp (chỉ những cặp quan trọng nhất).
- Skip nếu mơ hồ hoặc cảm xúc không rõ.`;

  try {
    const res = await callGemini(prompt, {
      ...config,
      temperature: 0.2,
      maxTokens: 2048,
      systemPrompt: 'Bạn là Relationship Analyst, trích xuất quan hệ nhân vật.',
    }, { jsonMode: true, tracking: { projectId, task: 'relationships', chapterNumber } });

    const parsed = parseJSON<{ relationships: RelationshipEntry[] }>(res.content);
    if (!parsed?.relationships?.length) return;

    const valid = parsed.relationships
      .filter((r) => r.character_a && r.character_b && r.character_a !== r.character_b)
      .filter((r) => RELATIONSHIP_TYPES.includes(r.relationship_type))
      .slice(0, 8);

    if (valid.length === 0) return;

    const rows = valid.map((r) => ({
      project_id: projectId,
      chapter_number: chapterNumber,
      character_a: r.character_a.trim().slice(0, 80),
      character_b: r.character_b.trim().slice(0, 80),
      relationship_type: r.relationship_type,
      intensity: r.intensity != null ? Math.max(1, Math.min(10, Math.floor(r.intensity))) : null,
      notes: (r.notes || '').slice(0, 200),
    }));

    const db = getSupabase();
    const { error } = await db.from('character_relationships').insert(rows);
    if (error) console.warn('[RelationshipTracker] Insert failed:', error.message);
  } catch (err) {
    console.warn('[RelationshipTracker] Extract failed:', err instanceof Error ? err.message : String(err));
  }
}

// ── Get relationship context (pre-write injection) ───────────────────────────

export async function getRelationshipContext(
  projectId: string,
  knownCharacters: string[],
): Promise<string | null> {
  if (knownCharacters.length < 2) return null;

  const db = getSupabase();
  const { data } = await db
    .from('character_relationships')
    .select('chapter_number, character_a, character_b, relationship_type, intensity, notes')
    .eq('project_id', projectId)
    .in('character_a', knownCharacters.slice(0, 15))
    .order('chapter_number', { ascending: false })
    .limit(60);

  if (!data || data.length === 0) return null;

  // Pick latest entry per (a,b) pair
  interface Row { chapter_number: number; character_a: string; character_b: string; relationship_type: string; intensity: number | null; notes: string | null }
  const latestByPair = new Map<string, Row>();
  for (const r of data as Row[]) {
    const key = `${r.character_a}::${r.character_b}`;
    if (!latestByPair.has(key)) latestByPair.set(key, r);
  }

  const entries = Array.from(latestByPair.values()).slice(0, 12);
  if (entries.length === 0) return null;

  const lines: string[] = ['[QUAN HỆ NHÂN VẬT — CẤM FLIP VÔ LÝ]'];
  for (const r of entries) {
    const intensityStr = r.intensity != null ? ` (${r.intensity}/10)` : '';
    const notesStr = r.notes ? ` — ${r.notes}` : '';
    lines.push(`• ${r.character_a} → ${r.character_b}: ${r.relationship_type}${intensityStr} (last update ch.${r.chapter_number})${notesStr}`);
  }
  lines.push('→ NẾU chương này có cặp nào FLIP (yêu→thù, ally→enemy) phải có TRIGGER rõ ràng + lý do, KHÔNG đột ngột.');

  return lines.join('\n');
}
