/**
 * Story Engine v2 — World Expansion Tracker
 *
 * Tracks progressive worldbuilding: location progression, location bibles,
 * mystery seeding per location. Ensures MC doesn't know about unexplored areas.
 *
 * DB table: location_bibles
 *   project_id UUID, location_name TEXT, location_bible JSONB,
 *   arc_range INT[], explored BOOLEAN, mysteries JSONB,
 *   created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
 */

import { getSupabase } from '../utils/supabase';
import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import type { GeminiConfig, GenreType } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface LocationBible {
  locationName: string;
  description: string;
  geography: string;
  factions: string[];
  importantNPCs: Array<{
    name: string;
    role: string;
    personality: string;
  }>;
  rules: string[];       // Local rules/laws
  economy: string;       // Economic system
  dangers: string[];     // Known dangers
  culture: string;       // Cultural traits
  mysteries: LocationMystery[];
}

export interface LocationMystery {
  mystery: string;
  hintChapter?: number;    // When hint was planted
  revealChapter?: number;  // When it should be revealed
  status: 'hidden' | 'hinted' | 'revealed';
}

interface WorldMap {
  locations: Array<{
    locationName: string;
    arcRange: [number, number];
    explored: boolean;
  }>;
}

// ── Initialize World Map from Master Outline ─────────────────────────────────

export async function initializeWorldMap(
  projectId: string,
  masterOutline: string | undefined,
  genre: GenreType,
  totalPlannedChapters: number,
  config: GeminiConfig,
): Promise<void> {
  if (!masterOutline) return;

  const db = getSupabase();

  // Check if world map already initialized
  const { count } = await db
    .from('location_bibles')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId);

  if (count && count > 0) return;

  const prompt = `Bạn là World Architect cho webnovel ${genre}.

Master Outline:
${masterOutline.slice(0, 3000)}

Tổng dự kiến: ${totalPlannedChapters} chương

NHIỆM VỤ: Tạo World Map Progression — lộ trình MC khám phá thế giới.

QUY TẮC:
1. 5-8 locations chính, mỗi location gắn với 1 hoặc nhiều arcs
2. Progression từ nhỏ → lớn (thôn → thành → kinh đô → ngoại giới → thần giới)
3. Mỗi location CÓ 1-2 bí ẩn riêng (mystery) sẽ được seed và payoff
4. MC KHÔNG biết về locations chưa explore

Trả về JSON:
{
  "locations": [
    {
      "locationName": "Tên địa điểm",
      "arcRange": [1, 5],
      "explored": false
    }
  ]
}`;

  const res = await callGemini(prompt, {
    ...config,
    temperature: 0.5,
    maxTokens: 2048,
    systemPrompt: 'Bạn là World Architect cho webnovel.',
  }, { jsonMode: true });

  const parsed = parseJSON<WorldMap>(res.content);
  if (!parsed?.locations?.length) return;

  // Mark first location as explored
  const rows = parsed.locations.map((loc, i) => ({
    project_id: projectId,
    location_name: loc.locationName,
    arc_range: loc.arcRange,
    explored: i === 0, // First location is starting point
    location_bible: null,
    mysteries: [],
  }));

  const { error: upsertErr } = await db.from('location_bibles').upsert(rows, {
    onConflict: 'project_id,location_name',
  });
  if (upsertErr) console.warn('[WorldExpansionTracker] Failed to save world map: ' + upsertErr.message);
}

// ── Generate Location Bible (called 1 arc before MC arrives) ─────────────────

export async function generateLocationBible(
  projectId: string,
  locationName: string,
  genre: GenreType,
  synopsis: string | undefined,
  masterOutline: string | undefined,
  config: GeminiConfig,
): Promise<void> {
  const db = getSupabase();

  // Check if bible already exists
  const { data: existing } = await db
    .from('location_bibles')
    .select('location_bible')
    .eq('project_id', projectId)
    .eq('location_name', locationName)
    .maybeSingle();

  if (existing?.location_bible) return;

  const prompt = `Bạn là World Architect tạo Location Bible cho "${locationName}" trong webnovel ${genre}.

${synopsis ? `Tóm tắt: ${synopsis.slice(0, 1500)}` : ''}
${masterOutline ? `Đại cương: ${masterOutline.slice(0, 1500)}` : ''}

NHIỆM VỤ: Tạo Location Bible chi tiết cho "${locationName}".

QUY TẮC:
1. Mỗi location phải có "tính cách" riêng — không chỉ là backdrop
2. 2-3 NPC quan trọng với personality rõ ràng
3. 1-2 mysteries cần seed khi MC đến và payoff sau
4. Rules/luật lệ địa phương ảnh hưởng đến cốt truyện
5. Dangers phải cụ thể, không chung chung

Trả về JSON:
{
  "locationName": "${locationName}",
  "description": "Mô tả tổng quát 2-3 câu",
  "geography": "Địa hình, khí hậu, đặc điểm tự nhiên",
  "factions": ["Các thế lực/bang phái/tổ chức tại đây"],
  "importantNPCs": [
    {"name": "Tên NPC", "role": "Vai trò", "personality": "Tính cách ngắn gọn"}
  ],
  "rules": ["Luật lệ/quy tắc đặc thù của nơi này"],
  "economy": "Hệ thống kinh tế, giao thương",
  "dangers": ["Mối nguy hiểm cụ thể"],
  "culture": "Văn hóa, phong tục đặc trưng",
  "mysteries": [
    {"mystery": "Bí ẩn chưa giải (VD: 'Tiếng kêu lạ từ dưới lòng đất mỗi đêm trăng tròn')", "status": "hidden"},
    {"mystery": "Bí ẩn khác", "status": "hidden"}
  ]
}`;

  const res = await callGemini(prompt, {
    ...config,
    temperature: 0.5,
    maxTokens: 2048,
    systemPrompt: 'Bạn là World Architect. Tạo location có chiều sâu, không generic.',
  }, { jsonMode: true });

  const parsed = parseJSON<LocationBible>(res.content);
  if (!parsed) return;

  const { error: updateErr } = await db
    .from('location_bibles')
    .update({
      location_bible: parsed,
      mysteries: parsed.mysteries || [],
    })
    .eq('project_id', projectId)
    .eq('location_name', locationName);
  if (updateErr) console.warn('[WorldExpansionTracker] Failed to save location bible: ' + updateErr.message);
}

// ── Get World Context (pre-write injection) ──────────────────────────────────

export async function getWorldContext(
  projectId: string,
  chapterNumber: number,
): Promise<string | null> {
  const arcNumber = Math.ceil(chapterNumber / 20);
  const db = getSupabase();

  // Get all locations
  const { data: locations } = await db
    .from('location_bibles')
    .select('*')
    .eq('project_id', projectId)
    .order('arc_range', { ascending: true });

  if (!locations?.length) return null;

  // Find current location (where MC is now)
  const currentLocation = locations.find(loc => {
    const range = loc.arc_range || [0, 0];
    return arcNumber >= range[0] && arcNumber <= range[1];
  });

  // Find upcoming location (1 arc before arrival)
  const upcomingLocation = locations.find(loc => {
    const range = loc.arc_range || [0, 0];
    return !loc.explored && range[0] === arcNumber + 1;
  });

  const parts: string[] = [];

  if (currentLocation?.location_bible) {
    const bible = currentLocation.location_bible as LocationBible;
    parts.push('═══ LOCATION HIỆN TẠI ═══');
    parts.push(`📍 ${bible.locationName}: ${bible.description}`);
    parts.push(`🏔 Địa hình: ${bible.geography}`);
    if (bible.factions?.length) {
      parts.push(`⚔️ Thế lực: ${bible.factions.join(', ')}`);
    }
    if (bible.rules?.length) {
      parts.push(`📜 Luật lệ: ${bible.rules.join('; ')}`);
    }
    if (bible.dangers?.length) {
      parts.push(`⚠️ Nguy hiểm: ${bible.dangers.join('; ')}`);
    }
    if (bible.culture) {
      parts.push(`🎭 Văn hóa: ${bible.culture}`);
    }
    if (bible.importantNPCs?.length) {
      parts.push('👥 NPC quan trọng:');
      for (const npc of bible.importantNPCs.slice(0, 3)) {
        parts.push(`  • ${npc.name} (${npc.role}): ${npc.personality}`);
      }
    }

    // Active mysteries
    const mysteries = (currentLocation.mysteries || []) as LocationMystery[];
    const activeMysteries = mysteries.filter(m => m.status === 'hidden' || m.status === 'hinted');
    if (activeMysteries.length) {
      parts.push('🔮 Bí ẩn chưa giải (có thể seed/hint):');
      for (const m of activeMysteries) {
        parts.push(`  • ${m.mystery} [${m.status}]`);
      }
    }
  }

  // Unexplored locations — MC must NOT know about them
  const unexplored = locations.filter(loc => !loc.explored && loc !== upcomingLocation);
  if (unexplored.length) {
    parts.push(`\n🚫 MC KHÔNG BIẾT VỀ: ${unexplored.map(l => l.location_name).join(', ')} — KHÔNG mention trong nội dung`);
  }

  // Upcoming location — start foreshadowing
  if (upcomingLocation) {
    parts.push(`\n🔜 Sắp đến: "${upcomingLocation.location_name}" (arc tiếp) — có thể gieo hint nhẹ qua tin đồn, nhân vật phụ`);
  }

  return parts.length > 0 ? parts.join('\n') : null;
}

// ── Post-Write: Mark Location as Explored ────────────────────────────────────

export async function updateLocationExploration(
  projectId: string,
  chapterNumber: number,
): Promise<void> {
  const arcNumber = Math.ceil(chapterNumber / 20);
  const db = getSupabase();

  // Mark locations whose arc range includes current arc as explored
  const { data: locations } = await db
    .from('location_bibles')
    .select('location_name,arc_range,explored')
    .eq('project_id', projectId)
    .eq('explored', false);

  if (!locations || locations.length === 0) return;

  // Collect location names that should be marked explored, then batch update
  const toExplore = locations
    .filter(loc => {
      const range = loc.arc_range || [0, 0];
      return arcNumber >= range[0] && arcNumber <= range[1];
    })
    .map(loc => loc.location_name);

  if (toExplore.length > 0) {
    const { error: updateErr } = await db
      .from('location_bibles')
      .update({ explored: true })
      .eq('project_id', projectId)
      .in('location_name', toExplore);
    if (updateErr) console.warn('[WorldExpansionTracker] Failed to update location exploration: ' + updateErr.message);
  }
}

// ── Pre-generate Location Bible for Upcoming Location ────────────────────────

export async function prepareUpcomingLocation(
  projectId: string,
  chapterNumber: number,
  genre: GenreType,
  synopsis: string | undefined,
  masterOutline: string | undefined,
  config: GeminiConfig,
): Promise<void> {
  const arcNumber = Math.ceil(chapterNumber / 20);
  const db = getSupabase();

  // Find locations without a bible yet
  const { data: noBible } = await db
    .from('location_bibles')
    .select('location_name,location_bible,arc_range')
    .eq('project_id', projectId)
    .is('location_bible', null);

  if (!noBible?.length) return;

  // Priority 1: Generate bible for CURRENT location (MC is there now but no bible)
  for (const loc of noBible) {
    const range = loc.arc_range || [0, 0];
    if (arcNumber >= range[0] && arcNumber <= range[1]) {
      await generateLocationBible(
        projectId, loc.location_name, genre, synopsis, masterOutline, config,
      );
      return; // Only 1 per chapter — current location takes priority
    }
  }

  // Priority 2: Generate bible 1 arc before MC arrives at a NEW location
  for (const loc of noBible) {
    const range = loc.arc_range || [0, 0];
    if (range[0] === arcNumber + 1) {
      await generateLocationBible(
        projectId, loc.location_name, genre, synopsis, masterOutline, config,
      );
      return; // Only 1 per chapter
    }
  }
}
