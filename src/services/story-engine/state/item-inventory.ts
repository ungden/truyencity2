/**
 * Story Engine v2 — Item Inventory (Phase 27 W2.3)
 *
 * Tracks items picked up, used, lost, gifted by characters across chapters.
 *
 * Pre-Phase-27 problem:
 *   - MC picks up "Linh Hồ" artifact at ch.50, never mentioned, then "MC vung
 *     Linh Hồ" at ch.500 — but actually MC lost it to villain at ch.200.
 *   - AI invents items MC never had: "MC rút thanh kiếm cha để lại" when there's
 *     no record of such item in the inventory.
 *
 * Phase 27 W2.3 fix:
 *   1. Post-write: AI extracts item events (picked/used/lost/equipped/gifted)
 *   2. Persist to item_events table (event log, not snapshot)
 *   3. Pre-write: getInventoryContext computes current inventory from event log
 *   4. Architect prompt: knows what MC currently has + recent item events
 *
 * Đại thần workflow mapping:
 *   "Item registry" (物品系统) — top web novel authors maintain a catalog of
 *   every named artifact + chain of custody. Without it, items "appear" in
 *   plot conveniently or get forgotten. Long-form fantasy/cultivation novels
 *   especially have 50+ named items each character.
 */

import { getSupabase } from '../utils/supabase';
import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import type { GeminiConfig } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

type ItemEventType = 'picked' | 'used' | 'equipped' | 'lost' | 'gifted' | 'destroyed' | 'mentioned';

interface ItemEvent {
  characterName: string;
  itemName: string;
  eventType: ItemEventType;
  description?: string;
  importance?: number;
}

interface ItemEventsAIResponse {
  events?: Array<{
    characterName?: string;
    itemName?: string;
    eventType?: ItemEventType;
    description?: string;
    importance?: number;
  }>;
}

export interface InventorySnapshot {
  characterName: string;
  itemName: string;
  status: 'currently_held' | 'used_up' | 'lost_or_gifted' | 'destroyed';
  lastEventChapter: number;
  lastEventType: ItemEventType;
  description?: string;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Extract item events from chapter content via AI; persist to item_events.
 * Called from orchestrator post-write (per reader chapter).
 */
export async function recordItemEvents(
  projectId: string,
  chapterNumber: number,
  content: string,
  characters: string[],
  config: GeminiConfig,
): Promise<{ recorded: number }> {
  try {
    const prompt = `Bạn là item-tracker cho truyện dài kỳ. Trích các SỰ KIỆN VẬT PHẨM trong chương. Chỉ ghi vật phẩm CÓ TÊN RIÊNG quan trọng (pháp bảo, vũ khí, đan dược, vật phẩm thưởng, di vật) — KHÔNG ghi đồ thường (cốc, bát, ghế, áo).

CHARACTERS XUẤT HIỆN: ${characters.slice(0, 12).join(', ')}

CHƯƠNG ${chapterNumber}:
${content.slice(0, 8000)}

Trả về JSON:
{
  "events": [
    {
      "characterName": "<tên đầy đủ — KHÔNG mơ hồ ('người đàn ông')>",
      "itemName": "<tên riêng vật phẩm — vd 'Hỏa Long Kiếm', 'Bí Cấp Tông Môn', 'Linh Đan Cửu Chuyển'>",
      "eventType": "picked|used|equipped|lost|gifted|destroyed|mentioned",
      "description": "<bối cảnh sự kiện ngắn 5-15 từ>",
      "importance": <0-100; pháp bảo/di vật/quest item = 70-90; đan dược thường = 30-50>
    }
  ]
}

EVENT TYPES:
- picked: nhân vật mới có vật phẩm (nhặt, được tặng, mua, cướp)
- used: dùng 1 lần rồi hết (đan dược, bùa)
- equipped: trang bị/bind dài hạn (pháp bảo, vũ khí)
- lost: bị cướp/rơi/thất lạc
- gifted: cho người khác
- destroyed: bị phá hủy
- mentioned: chỉ nhắc tới, không thay đổi state

QUY TẮC:
- KHÔNG bịa item không có trong chương.
- itemName phải LÀ TÊN RIÊNG cụ thể, KHÔNG generic ("kiếm", "đan", "sách"). Nếu chương dùng generic → bỏ qua.
- KHÔNG ghi events cho đồ ăn thường, đồ trang sức nhỏ, hoặc đồ vật thoáng qua.
- Trả "events": [] nếu không có item event quan trọng nào.`;

    const res = await callGemini(
      prompt,
      { ...config, temperature: 0.2, maxTokens: 2048 },
      { jsonMode: true, tracking: { projectId, task: 'item_events_extraction', chapterNumber } },
    );

    if (!res.content) return { recorded: 0 };

    const parsed = parseJSON<ItemEventsAIResponse>(res.content);
    if (!parsed?.events?.length) return { recorded: 0 };

    const valid: ItemEvent[] = [];
    const allowedTypes = new Set<ItemEventType>(['picked', 'used', 'equipped', 'lost', 'gifted', 'destroyed', 'mentioned']);
    for (const e of parsed.events) {
      if (!e.characterName || e.characterName.length < 2) continue;
      if (!e.itemName || e.itemName.length < 2) continue;
      if (!e.eventType || !allowedTypes.has(e.eventType)) continue;
      // Reject generic item names.
      const lower = e.itemName.toLowerCase();
      if (['kiếm', 'đao', 'đan', 'sách', 'thư', 'ngọc', 'bí kíp', 'item', 'vật phẩm'].includes(lower)) continue;
      valid.push({
        characterName: e.characterName.trim(),
        itemName: e.itemName.trim(),
        eventType: e.eventType,
        description: e.description?.slice(0, 200) || undefined,
        importance: typeof e.importance === 'number' ? Math.max(0, Math.min(100, e.importance)) : 50,
      });
    }

    if (valid.length === 0) return { recorded: 0 };

    const db = getSupabase();
    const rows = valid.map(v => ({
      project_id: projectId,
      chapter_number: chapterNumber,
      character_name: v.characterName,
      item_name: v.itemName,
      event_type: v.eventType,
      description: v.description ?? null,
      importance: v.importance ?? 50,
    }));

    const { error } = await db.from('item_events').insert(rows);
    if (error) {
      console.warn(`[item-inventory] Insert failed for Ch.${chapterNumber}: ${error.message}`);
      return { recorded: 0 };
    }
    return { recorded: valid.length };
  } catch (e) {
    console.warn(`[item-inventory] recordItemEvents threw for Ch.${chapterNumber}:`, e instanceof Error ? e.message : String(e));
    return { recorded: 0 };
  }
}

/**
 * Compute current inventory snapshot from event log.
 * For each (character, item) pair, the LAST event determines current status:
 *   - picked / equipped → currently_held
 *   - used → used_up
 *   - lost / gifted → lost_or_gifted
 *   - destroyed → destroyed
 *   - mentioned → inherits previous status (or 'currently_held' if first event)
 */
export async function getCurrentInventory(
  projectId: string,
  upToChapter: number,
  characterFilter?: string,
): Promise<InventorySnapshot[]> {
  try {
    const db = getSupabase();
    let query = db
      .from('item_events')
      .select('character_name,item_name,event_type,chapter_number,description')
      .eq('project_id', projectId)
      .lte('chapter_number', upToChapter)
      .order('chapter_number', { ascending: true });
    if (characterFilter) query = query.eq('character_name', characterFilter);

    const { data } = await query;
    if (!data?.length) return [];

    // Build (char, item) → latest non-mention event.
    const map = new Map<string, InventorySnapshot>();
    for (const row of data) {
      const key = `${row.character_name}|${row.item_name}`;
      const existing = map.get(key);
      const eventType = row.event_type as ItemEventType;

      // Status derived from event type.
      let status: InventorySnapshot['status'];
      switch (eventType) {
        case 'picked':
        case 'equipped':
          status = 'currently_held'; break;
        case 'used':
          status = 'used_up'; break;
        case 'lost':
        case 'gifted':
          status = 'lost_or_gifted'; break;
        case 'destroyed':
          status = 'destroyed'; break;
        case 'mentioned':
          // Skip mention if we already have a state — don't overwrite.
          if (existing) continue;
          status = 'currently_held'; break;
        default:
          continue;
      }

      map.set(key, {
        characterName: row.character_name,
        itemName: row.item_name,
        status,
        lastEventChapter: row.chapter_number,
        lastEventType: eventType,
        description: row.description ?? undefined,
      });
    }

    return [...map.values()].sort((a, b) => b.lastEventChapter - a.lastEventChapter);
  } catch (e) {
    console.warn(`[item-inventory] getCurrentInventory threw:`, e instanceof Error ? e.message : String(e));
    return [];
  }
}

/**
 * Format inventory + recent item events as a compact context block for Architect.
 * Focuses on PROTAGONIST + key supporting characters.
 */
export async function getInventoryContext(
  projectId: string,
  currentChapter: number,
  protagonistName: string,
): Promise<string | null> {
  if (currentChapter < 5) return null;

  try {
    const inventory = await getCurrentInventory(projectId, currentChapter);
    if (inventory.length === 0) return null;

    const heldByMc = inventory.filter(i =>
      i.characterName === protagonistName && i.status === 'currently_held',
    );
    const lostByMc = inventory.filter(i =>
      i.characterName === protagonistName && (i.status === 'lost_or_gifted' || i.status === 'destroyed'),
    ).slice(0, 8);

    const lines: string[] = ['[INVENTORY — VẬT PHẨM HIỆN TẠI, KHÔNG ĐƯỢC BỊA THÊM]'];

    if (heldByMc.length > 0) {
      lines.push(`\n${protagonistName} ĐANG SỞ HỮU:`);
      for (const item of heldByMc.slice(0, 12)) {
        lines.push(`  • "${item.itemName}" (lấy ch.${item.lastEventChapter}, ${item.lastEventType})${item.description ? ` — ${item.description.slice(0, 100)}` : ''}`);
      }
    } else {
      lines.push(`\n${protagonistName}: chưa có vật phẩm đặc biệt được track.`);
    }

    if (lostByMc.length > 0) {
      lines.push(`\n${protagonistName} ĐÃ MẤT/CHO/PHÁ HỦY (KHÔNG được tự nhiên xuất hiện trở lại):`);
      for (const item of lostByMc) {
        lines.push(`  • "${item.itemName}" (${item.lastEventType} ở ch.${item.lastEventChapter})`);
      }
    }

    // Top items held by other key characters (top-5 most recent).
    const otherChars = inventory
      .filter(i => i.characterName !== protagonistName && i.status === 'currently_held')
      .slice(0, 6);
    if (otherChars.length > 0) {
      lines.push(`\nVẬT PHẨM CỦA NHÂN VẬT KHÁC (đề cập trong cùng truyện):`);
      for (const item of otherChars) {
        lines.push(`  • ${item.characterName}: "${item.itemName}" (ch.${item.lastEventChapter})`);
      }
    }

    lines.push('\n→ Khi viết chương, CHỈ tham chiếu vật phẩm CÓ TRONG roster trên. Không bịa pháp bảo/vũ khí/đan dược MC chưa từng có.');

    return lines.join('\n');
  } catch (e) {
    console.warn(`[item-inventory] getInventoryContext threw:`, e instanceof Error ? e.message : String(e));
    return null;
  }
}
