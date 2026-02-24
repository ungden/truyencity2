/**
 * Story Engine v2 — Character Arc Engine
 *
 * Tracks character development arcs over hundreds of chapters.
 * Auto-generates arc plans for recurring characters. Injects phase-appropriate
 * personality traits and relationship dynamics into Writer prompts.
 *
 * DB table: character_arcs
 *   project_id UUID, character_name TEXT, role TEXT, internal_conflict TEXT,
 *   arc_phases JSONB, signature_traits JSONB, relationship_with_mc TEXT,
 *   current_phase TEXT, appearance_count INT, last_seen_chapter INT,
 *   created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
 */

import { getSupabase } from '../utils/supabase';
import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import type { GeminiConfig, GenreType } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CharacterArc {
  characterName: string;
  role: 'protagonist' | 'rival' | 'mentor' | 'love_interest' | 'ally' | 'villain' | 'comic_relief' | 'recurring_npc';
  internalConflict: string;
  arcPhases: ArcPhase[];
  signatureTraits: SignatureTraits;
  relationshipWithMC: string;
  currentPhase: string;
  appearanceCount: number;
  lastSeenChapter: number;
}

export interface ArcPhase {
  phase: string;
  chapterRange: [number, number]; // [start, end]
  traits: string;
  triggerEvent: string; // what causes transition to next phase
}

export interface SignatureTraits {
  speechPattern: string;    // "Luôn nói mỉa mai", "Xưng ta, gọi ngươi"
  catchphrase?: string;     // Câu cửa miệng
  habit: string;            // "Hay gõ ngón tay khi suy nghĩ"
  quirk: string;            // "Sợ sấm sét dù là cao thủ"
  emotionalTell: string;    // "Siết nắm đấm khi tức giận thay vì thể hiện"
}

// ── Generate Character Arc (triggered when character appears >= 3 times) ─────

export async function generateCharacterArc(
  projectId: string,
  characterName: string,
  genre: GenreType,
  protagonistName: string,
  currentChapter: number,
  totalPlannedChapters: number,
  synopsis: string | undefined,
  characterNotes: string | undefined,
  config: GeminiConfig,
): Promise<void> {
  const db = getSupabase();

  // Check if arc already exists
  const { data: existing } = await db
    .from('character_arcs')
    .select('character_name')
    .eq('project_id', projectId)
    .eq('character_name', characterName)
    .maybeSingle();

  if (existing) return; // Already has arc

  const prompt = `Bạn là Character Architect chuyên thiết kế character arc dài hạn cho webnovel.

NHÂN VẬT: ${characterName}
MC: ${protagonistName}
Thể loại: ${genre}
Chương hiện tại: ${currentChapter}
Tổng dự kiến: ${totalPlannedChapters} chương
${synopsis ? `Tóm tắt: ${synopsis.slice(0, 1500)}` : ''}
${characterNotes ? `Thông tin hiện có: ${characterNotes}` : ''}

NHIỆM VỤ: Thiết kế character arc hoàn chỉnh cho ${characterName}.

QUY TẮC CHARACTER ARC ĐẲNG CẤP:
1. Nhân vật PHẢI có xung đột nội tâm (internal conflict) — không ai chỉ đơn giản "tốt" hay "xấu"
2. Phải có 3-5 phase chuyển đổi rõ ràng qua hàng trăm chương
3. Mỗi phase có trigger event cụ thể gây chuyển đổi (không tự nhiên thay đổi)
4. Phải có signature traits đặc trưng — đọc 1 câu thoại phải biết ai nói
5. Relationship với MC phải PHÁT TRIỂN (không tĩnh)

ROLE TYPES: protagonist, rival, mentor, love_interest, ally, villain, comic_relief, recurring_npc

Trả về JSON:
{
  "role": "rival|mentor|love_interest|ally|villain|comic_relief|recurring_npc",
  "internalConflict": "Mâu thuẫn nội tâm cốt lõi (VD: 'Lòng tự trọng vs thực tế yếu kém')",
  "arcPhases": [
    {
      "phase": "tên phase (VD: 'arrogant_rival')",
      "chapterRange": [${currentChapter}, ${currentChapter + 100}],
      "traits": "Tính cách trong phase này (VD: 'Kiêu ngạo, hay khiêu khích, coi thường MC')",
      "triggerEvent": "Sự kiện gây chuyển sang phase tiếp (VD: 'Bại trận trước MC lần đầu')"
    }
  ],
  "signatureTraits": {
    "speechPattern": "Cách nói chuyện đặc trưng (xưng hô, giọng điệu, thói quen ngôn ngữ)",
    "catchphrase": "Câu cửa miệng (nếu có)",
    "habit": "Thói quen hành vi đặc trưng",
    "quirk": "Điểm bất ngờ/contrast tính cách (GAP MOE)",
    "emotionalTell": "Cách biểu lộ cảm xúc gián tiếp (micro-expression/hành động nhỏ)"
  },
  "relationshipWithMC": "Trajectory quan hệ với MC qua toàn bộ truyện"
}`;

  const res = await callGemini(prompt, {
    ...config,
    temperature: 0.4,
    maxTokens: 2048,
    systemPrompt: 'Bạn là Character Architect chuyên thiết kế nhân vật sâu sắc cho webnovel.',
  }, { jsonMode: true });

  const parsed = parseJSON<{
    role: string;
    internalConflict: string;
    arcPhases: ArcPhase[];
    signatureTraits: SignatureTraits;
    relationshipWithMC: string;
  }>(res.content);

  if (!parsed) return;

  await db.from('character_arcs').upsert({
    project_id: projectId,
    character_name: characterName,
    role: parsed.role || 'recurring_npc',
    internal_conflict: parsed.internalConflict,
    arc_phases: parsed.arcPhases,
    signature_traits: parsed.signatureTraits,
    relationship_with_mc: parsed.relationshipWithMC,
    current_phase: parsed.arcPhases?.[0]?.phase || 'introduction',
    appearance_count: 3,
    last_seen_chapter: currentChapter,
  }, { onConflict: 'project_id,character_name' });
}

// ── Get Character Arc Context (pre-write injection) ──────────────────────────

export async function getCharacterArcContext(
  projectId: string,
  chapterNumber: number,
  charactersInChapter: string[],
): Promise<string | null> {
  if (charactersInChapter.length === 0) return null;

  const db = getSupabase();
  const { data } = await db
    .from('character_arcs')
    .select('*')
    .eq('project_id', projectId)
    .in('character_name', charactersInChapter);

  if (!data?.length) return null;

  const parts: string[] = ['═══ CHARACTER ARCS — VIẾT ĐÚNG TÍNH CÁCH ═══'];

  for (const row of data) {
    const phases: ArcPhase[] = row.arc_phases || [];
    const traits: SignatureTraits = row.signature_traits || {};

    // Find current phase based on chapter number
    const activePhase = phases.find(
      p => chapterNumber >= p.chapterRange[0] && chapterNumber <= p.chapterRange[1],
    ) || phases[phases.length - 1];

    // Check if near phase transition
    const nextPhase = phases.find(p => p.chapterRange[0] > chapterNumber);
    const nearTransition = nextPhase && (nextPhase.chapterRange[0] - chapterNumber <= 5);

    parts.push(`\n【${row.character_name}】 (${row.role})`);
    parts.push(`  Xung đột nội tâm: ${row.internal_conflict}`);

    if (activePhase) {
      parts.push(`  Phase hiện tại: "${activePhase.phase}" → ${activePhase.traits}`);
    }

    if (nearTransition && nextPhase) {
      parts.push(`  ⚠️ SẮP CHUYỂN PHASE: "${nextPhase.phase}" (trigger: ${activePhase?.triggerEvent || 'TBD'})`);
      parts.push(`  → Bắt đầu gieo dấu hiệu thay đổi nhẹ trong hành vi`);
    }

    if (traits.speechPattern) {
      parts.push(`  🗣 Cách nói: ${traits.speechPattern}`);
    }
    if (traits.catchphrase) {
      parts.push(`  💬 Câu cửa miệng: "${traits.catchphrase}"`);
    }
    if (traits.habit) {
      parts.push(`  🔄 Thói quen: ${traits.habit}`);
    }
    if (traits.quirk) {
      parts.push(`  🎭 Gap Moe: ${traits.quirk}`);
    }
    if (traits.emotionalTell) {
      parts.push(`  😤 Emotional tell: ${traits.emotionalTell}`);
    }

    parts.push(`  Quan hệ với MC: ${row.relationship_with_mc}`);
  }

  parts.push('\n⚠️ PHẢI viết đúng cách nói, thói quen, quirk của từng nhân vật. Che tên đi, người đọc vẫn phải nhận ra ai đang nói.');

  return parts.join('\n');
}

// ── Post-Write: Update Appearance Count and Phase ────────────────────────────

export async function updateCharacterArcs(
  projectId: string,
  chapterNumber: number,
  charactersInContent: string[],
  config: GeminiConfig,
): Promise<void> {
  const db = getSupabase();

  // Update last_seen for characters that appeared
  for (const name of charactersInContent) {
    await db
      .from('character_arcs')
      .update({
        last_seen_chapter: chapterNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('project_id', projectId)
      .eq('character_name', name);
  }

  // Check if any character needs an arc generated (appeared >= 3 times, no arc yet)
  const { data: frequent } = await db
    .from('character_states')
    .select('character_name')
    .eq('project_id', projectId)
    .not('character_name', 'is', null);

  if (!frequent) return;

  // Count appearances per character from character_states
  const counts = new Map<string, number>();
  for (const row of frequent) {
    counts.set(row.character_name, (counts.get(row.character_name) || 0) + 1);
  }

  // Check which frequent characters lack arcs
  const { data: existingArcs } = await db
    .from('character_arcs')
    .select('character_name')
    .eq('project_id', projectId);

  const arcNames = new Set((existingArcs || []).map(a => a.character_name));

  for (const [name, count] of counts) {
    if (count >= 3 && !arcNames.has(name) && charactersInContent.includes(name)) {
      // Generate arc for this recurring character (non-blocking)
      generateCharacterArc(
        projectId, name, 'tien-hiep', '', chapterNumber, 1000,
        undefined, undefined, config,
      ).catch(() => {}); // Non-fatal, fire-and-forget
      break; // Only generate 1 per chapter to avoid token burn
    }
  }
}

// ── Advance Character Phase (called when trigger event detected) ─────────────

export async function advanceCharacterPhase(
  projectId: string,
  characterName: string,
  newPhase: string,
): Promise<void> {
  const db = getSupabase();
  await db
    .from('character_arcs')
    .update({
      current_phase: newPhase,
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', projectId)
    .eq('character_name', characterName);
}
