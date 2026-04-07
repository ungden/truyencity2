/**
 * Story Engine v2 — Character Knowledge Graph
 *
 * Tracks what each character KNOWS at each point in the story.
 * Inspired by GOAT-Storytelling-Agent's per-character knowledge tracking
 * and Graphiti's temporal knowledge graphs.
 *
 * Prevents bugs like: Character A reveals secret to B in Ch.30,
 * but Ch.50 writes B as if they don't know.
 *
 * DB table: character_knowledge
 *   project_id UUID, character_name TEXT, knowledge_type TEXT,
 *   knowledge TEXT, source_chapter INT, source_character TEXT,
 *   is_secret BOOLEAN, revealed_to TEXT[]
 *
 * Non-fatal: all errors are caught so chapter writing continues.
 */

import { getSupabase } from '../utils/supabase';
import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import type { GeminiConfig } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

export type KnowledgeType =
  | 'secret'          // Hidden information (identity, plan, weakness)
  | 'relationship'    // Who knows who, alliances, enmities
  | 'event'           // Witnessed or told about events
  | 'location'        // Knowledge of places, hideouts, treasures
  | 'ability'         // Knowledge of someone's powers/skills
  | 'plan'            // Awareness of plans/schemes
  | 'identity';       // Knowledge of true identities

export interface CharacterKnowledge {
  characterName: string;
  knowledgeType: KnowledgeType;
  knowledge: string;
  sourceChapter: number;
  sourceCharacter: string | null;  // Who told them / how they learned
  isSecret: boolean;               // Only this character knows
  revealedTo: string[];            // Who else knows this
}

interface KnowledgeExtractionResult {
  knowledge_events: Array<{
    character_name: string;
    knowledge_type: string;
    knowledge: string;
    source_character: string | null;
    is_secret: boolean;
    revealed_to: string[];
  }>;
}

// ── Constants ────────────────────────────────────────────────────────────────

const VALID_KNOWLEDGE_TYPES = new Set<string>([
  'secret', 'relationship', 'event', 'location', 'ability', 'plan', 'identity',
]);

const MAX_KNOWLEDGE_CONTEXT_CHARS = 1200;

// ── Public: Extract Knowledge from Chapter ──────────────────────────────────

/**
 * Extract character knowledge events from a chapter.
 * Runs as post-write task every 2 chapters to save tokens.
 */
export async function extractCharacterKnowledge(
  projectId: string,
  chapterNumber: number,
  chapterContent: string,
  characters: string[],
  config: GeminiConfig,
): Promise<void> {
  try {
    if (characters.length === 0) return;
    // Cap content to avoid token overflow
    const content = chapterContent.slice(0, 8000);

    const prompt = `Phân tích chương truyện sau và trích xuất các SỰ KIỆN KIẾN THỨC — tức là nhân vật nào BIẾT ĐƯỢC điều gì mới trong chương này.

Nhân vật hiện có: ${characters.join(', ')}

Nội dung chương ${chapterNumber}:
${content}

Trả về JSON:
{
  "knowledge_events": [
    {
      "character_name": "Tên nhân vật",
      "knowledge_type": "secret|relationship|event|location|ability|plan|identity",
      "knowledge": "Mô tả ngắn gọn điều nhân vật biết được (1-2 câu)",
      "source_character": "Ai tiết lộ / null nếu tự phát hiện",
      "is_secret": true/false,
      "revealed_to": ["Danh sách nhân vật khác cũng biết điều này"]
    }
  ]
}

QUY TẮC:
- CHỈ trích xuất kiến thức MỚI được tiết lộ/phát hiện trong chương này
- KHÔNG liệt kê những gì nhân vật đã biết từ trước
- is_secret=true nếu chỉ 1-2 người biết, false nếu ai cũng biết
- Tối đa 8 knowledge events quan trọng nhất
- Trả về [] rỗng nếu không có kiến thức mới nào đáng ghi nhận`;

    const response = await callGemini(prompt, {
      ...config,
      maxTokens: 4096,
      temperature: 0.3,
    }, { jsonMode: true });

    const parsed = parseJSON<KnowledgeExtractionResult>(response.content);
    if (!parsed?.knowledge_events?.length) return;

    const db = getSupabase();

    const rows = parsed.knowledge_events
      .filter(k =>
        k.character_name &&
        k.knowledge &&
        VALID_KNOWLEDGE_TYPES.has(k.knowledge_type) &&
        characters.some(c => c === k.character_name)
      )
      .slice(0, 8)
      .map(k => ({
        project_id: projectId,
        chapter_number: chapterNumber,
        character_name: k.character_name.trim(),
        knowledge_type: k.knowledge_type,
        knowledge: k.knowledge.slice(0, 500),
        source_character: k.source_character?.trim() || null,
        is_secret: !!k.is_secret,
        revealed_to: Array.isArray(k.revealed_to) ? k.revealed_to : [],
      }));

    if (rows.length === 0) return;

    const { error } = await db.from('character_knowledge').insert(rows);
    if (error) {
      console.warn('[CharacterKnowledge] Insert failed:', error.message);
    }
  } catch {
    // Non-fatal
  }
}

// ── Public: Get Knowledge Context for Chapter Writing ───────────────────────

/**
 * Build a context string showing what key characters know/don't know.
 * Injected into Architect prompt to prevent knowledge inconsistencies.
 */
export async function getCharacterKnowledgeContext(
  projectId: string,
  chapterNumber: number,
  characterNames: string[],
): Promise<string | null> {
  try {
    if (characterNames.length === 0 || chapterNumber <= 2) return null;

    const db = getSupabase();

    // Get all knowledge for active characters, ordered by recency
    const { data: knowledge } = await db
      .from('character_knowledge')
      .select('character_name, knowledge_type, knowledge, source_chapter, is_secret, revealed_to')
      .eq('project_id', projectId)
      .in('character_name', characterNames.slice(0, 10))
      .lte('chapter_number', chapterNumber)
      .order('chapter_number', { ascending: false })
      .limit(50);

    if (!knowledge || knowledge.length === 0) return null;

    // Group by character, deduplicate similar knowledge
    interface KnowledgeRow {
      character_name: string;
      knowledge_type: string;
      knowledge: string;
      source_chapter: number;
      is_secret: boolean;
      revealed_to: string[] | null;
    }
    const byCharacter = new Map<string, KnowledgeRow[]>();
    for (const k of knowledge as KnowledgeRow[]) {
      const list = byCharacter.get(k.character_name) ?? [];
      list.push(k);
      byCharacter.set(k.character_name, list);
    }

    const lines: string[] = ['[KIẾN THỨC NHÂN VẬT — CẤM MÂU THUẪN]'];
    let totalChars = 0;

    for (const [name, items] of byCharacter) {
      if (totalChars >= MAX_KNOWLEDGE_CONTEXT_CHARS) break;

      // Take most recent & important knowledge per character (max 4)
      const secrets = items.filter((k: KnowledgeRow) => k.is_secret).slice(0, 2);
      const others = items.filter((k: KnowledgeRow) => !k.is_secret).slice(0, 2);
      const selected = [...secrets, ...others].slice(0, 4);

      if (selected.length === 0) continue;

      const charLines: string[] = [`• ${name} BIẾT:`];
      for (const k of selected) {
        const prefix = k.is_secret ? '🔒' : '📌';
        const revealInfo = k.is_secret && k.revealed_to?.length
          ? ` (cũng biết: ${(k.revealed_to as string[]).join(', ')})`
          : '';
        charLines.push(`  ${prefix} ${k.knowledge}${revealInfo} [từ Ch.${k.source_chapter}]`);
      }

      const block = charLines.join('\n');
      if (totalChars + block.length > MAX_KNOWLEDGE_CONTEXT_CHARS) break;
      lines.push(block);
      totalChars += block.length;
    }

    if (lines.length <= 1) return null;
    lines.push('→ Nhân vật KHÔNG ĐƯỢC hành xử dựa trên thông tin họ CHƯA BIẾT.');
    return lines.join('\n');
  } catch {
    return null; // Non-fatal
  }
}
