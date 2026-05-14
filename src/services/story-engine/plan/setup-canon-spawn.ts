/**
 * Story Engine — Setup canon spawn (Phase S, 2026-05-15).
 *
 * Runs AFTER story_outline stage succeeds. Generates the setup-time
 * canon artifacts that existing engine relies on but never populated
 * during setup (only after chapters are written via post-write
 * extraction). This is the database-richness upgrade.
 *
 * Generates:
 *   1. Factions registry (5-8 factions with goals + conflicts + alliances)
 *      → factions table
 *   2. Worldbuilding canon JSONB (modular: realms / cultures / tech /
 *      resources / commonViolations) → ai_story_projects.worldbuilding_canon
 *   3. Power-system canon JSONB (tier list / cost model / forbidden
 *      shortcuts) → ai_story_projects.power_system_canon
 *   4. Foreshadowing agenda (8-12 entries: plantCh, pickupCh, hint,
 *      payoff) → foreshadowing_agenda table
 *   5. Plot twists registry (3-5 pre-planned twists) → plot_twists table
 *   6. Story themes (1-2 main + 3-5 motifs) → story_themes table
 *   7. Voice anchors (3 prose samples: opening / dialogue / action)
 *      → voice_anchors table
 *
 * Each task is non-fatal — if one fails, others continue. The
 * Foundation Reviewer will check coverage afterward and recommend
 * retry of the weakest task.
 *
 * Cost: ~$0.005-0.010 per project (7 small Gemini calls). One-time
 * setup cost.
 */

import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import { getSupabase } from '../utils/supabase';
import type { GeminiConfig, GenreType } from '../types';

const SPAWN_SYSTEM = `Bạn là Setup Canon Architect cho TruyenCity. Đọc story outline + world description + master outline rồi tạo 1 artifact JSON cụ thể được yêu cầu.

Quy tắc:
- Tên character + location + faction CONCRETE (Việt-ngữ thuần hoặc Trung-âm Hán-Việt theo genre).
- KHÔNG placeholder ("nhân vật A", "tổ chức X", "địa điểm 1") — phải đặt tên thực.
- KHÔNG copy benchmark Trung Quốc verbatim — tạo names riêng phù hợp setting.
- Trả về JSON EXACT theo schema đề bài, không markdown wrap.`;

interface ProjectSetupData {
  projectId: string;
  novelId: string;
  genre: string | null;
  mainCharacter: string | null;
  worldDescription: string | null;
  storyOutline: unknown;
  masterOutline: unknown;
  storyBible: string | null;
}

export interface CanonSpawnResult {
  factions: { generated: boolean; count: number; error?: string };
  worldCanon: { generated: boolean; error?: string };
  powerSystem: { generated: boolean; error?: string };
  foreshadowing: { generated: boolean; count: number; error?: string };
  plotTwists: { generated: boolean; count: number; error?: string };
  themes: { generated: boolean; count: number; error?: string };
  voiceAnchors: { generated: boolean; count: number; error?: string };
}

export async function spawnSetupCanon(
  data: ProjectSetupData,
  config: GeminiConfig,
): Promise<CanonSpawnResult> {
  const result: CanonSpawnResult = {
    factions: { generated: false, count: 0 },
    worldCanon: { generated: false },
    powerSystem: { generated: false },
    foreshadowing: { generated: false, count: 0 },
    plotTwists: { generated: false, count: 0 },
    themes: { generated: false, count: 0 },
    voiceAnchors: { generated: false, count: 0 },
  };

  const setupContext = buildSetupContext(data);

  // Run all 7 spawns in parallel — each non-fatal
  const tasks = [
    spawnFactions(data, setupContext, config).then(r => (result.factions = r)),
    spawnWorldCanon(data, setupContext, config).then(r => (result.worldCanon = r)),
    spawnPowerSystem(data, setupContext, config).then(r => (result.powerSystem = r)),
    spawnForeshadowing(data, setupContext, config).then(r => (result.foreshadowing = r)),
    spawnPlotTwists(data, setupContext, config).then(r => (result.plotTwists = r)),
    spawnThemes(data, setupContext, config).then(r => (result.themes = r)),
    spawnVoiceAnchors(data, setupContext, config).then(r => (result.voiceAnchors = r)),
  ];

  await Promise.allSettled(tasks);
  return result;
}

function buildSetupContext(data: ProjectSetupData): string {
  const parts: string[] = [];
  parts.push(`## Genre: ${data.genre || 'unknown'}`);
  if (data.mainCharacter) parts.push(`## MC: ${data.mainCharacter}`);
  if (data.worldDescription) {
    parts.push(`## World description`);
    parts.push(data.worldDescription.slice(0, 8000));
  }
  if (data.storyOutline) {
    parts.push(`## Story outline (JSON)`);
    parts.push(JSON.stringify(data.storyOutline, null, 2).slice(0, 5000));
  }
  if (data.masterOutline) {
    parts.push(`## Master outline (JSON, truncated)`);
    parts.push(JSON.stringify(data.masterOutline, null, 2).slice(0, 4000));
  }
  return parts.join('\n');
}

// ── 1. Factions ──────────────────────────────────────────────────────────────

async function spawnFactions(
  data: ProjectSetupData,
  context: string,
  config: GeminiConfig,
): Promise<CanonSpawnResult['factions']> {
  const prompt = `${SPAWN_SYSTEM}

${context}

## Nhiệm vụ: Tạo 5-8 factions (tổ chức / phe phái / dòng dõi) trong setting truyện này.

Mỗi faction:
- name (Vietnamese / Hán-Việt concrete)
- type ('sect' | 'corp' | 'government' | 'family' | 'crime' | 'religion' | 'guild' | 'army')
- summary (1-2 sentence purpose + power)
- territory (where active)
- mc_relation ('ally' | 'rival' | 'enemy' | 'neutral' | 'unknown')
- key_members (2-3 named characters with role)
- conflicts (1-2 active conflicts with other factions)
- introduce_arc (number 1-15 — which volume/arc introduces them prominently)

Trả về JSON:
\`\`\`json
{
  "factions": [{"name": "...", "type": "...", "summary": "...", "territory": "...", "mc_relation": "...", "key_members": [{"name": "...", "role": "..."}], "conflicts": [...], "introduce_arc": 1}, ...]
}
\`\`\``;

  try {
    const res = await callGemini(
      prompt,
      { ...config, temperature: 0.5, maxTokens: 4096, systemPrompt: SPAWN_SYSTEM },
      { jsonMode: true, tracking: { projectId: data.projectId, task: 'spawn_factions', chapterNumber: 0 } },
    );
    const parsed = parseJSON<{ factions: Array<Record<string, unknown>> }>(res.content);
    if (!parsed?.factions || parsed.factions.length === 0) {
      return { generated: false, count: 0, error: 'No factions returned' };
    }
    const db = getSupabase();
    const rows = parsed.factions.map(f => ({
      project_id: data.projectId,
      name: String(f.name || ''),
      type: String(f.type || 'unknown'),
      summary: String(f.summary || ''),
      territory: String(f.territory || ''),
      mc_relation: String(f.mc_relation || 'unknown'),
      key_members: f.key_members || [],
      conflicts: f.conflicts || [],
      introduce_arc: Number(f.introduce_arc) || 1,
      first_seen_chapter: null,
      last_seen_chapter: null,
    }));
    const { error } = await db.from('factions').insert(rows);
    if (error) return { generated: false, count: 0, error: error.message };
    return { generated: true, count: rows.length };
  } catch (e) {
    return { generated: false, count: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── 2. Worldbuilding canon (modular) ────────────────────────────────────────

async function spawnWorldCanon(
  data: ProjectSetupData,
  context: string,
  config: GeminiConfig,
): Promise<CanonSpawnResult['worldCanon']> {
  const prompt = `${SPAWN_SYSTEM}

${context}

## Nhiệm vụ: Tạo modular worldbuilding canon với 6 modules:

1. realms: 3-8 named realms/regions với access rule + MC's home + relationship
2. cultures: 3-5 cultural groups với customs / language register / values
3. tech_aesthetic: tech tier + concrete cues (vũ khí / phương tiện / kiến trúc) tone (ancient / medieval / modern / futurist / steampunk)
4. resources: 3-5 critical resource types với scarcity + MC's access
5. timeline_anchors: 5-10 historical events shaping current setting (year + event + consequence)
6. commonViolations: 3-5 patterns Critic/Writer NÊN flag (vd: "MC dùng phép thuật trong khu cấm", "character từ tỉnh xa không biết tên thôn local")

Trả về JSON:
\`\`\`json
{
  "realms": [{"name": "...", "summary": "...", "access_rule": "...", "is_mc_home": false}, ...],
  "cultures": [{"name": "...", "language": "...", "customs": "...", "values": "..."}, ...],
  "tech_aesthetic": {"tier": "...", "weapons": [...], "transport": [...], "architecture": [...]},
  "resources": [{"name": "...", "scarcity": "...", "mc_access": "..."}, ...],
  "timeline_anchors": [{"year": "...", "event": "...", "consequence": "..."}, ...],
  "commonViolations": ["pattern 1", ...]
}
\`\`\``;

  try {
    const res = await callGemini(
      prompt,
      { ...config, temperature: 0.5, maxTokens: 6144, systemPrompt: SPAWN_SYSTEM },
      { jsonMode: true, tracking: { projectId: data.projectId, task: 'spawn_world_canon', chapterNumber: 0 } },
    );
    const parsed = parseJSON<Record<string, unknown>>(res.content);
    if (!parsed) return { generated: false, error: 'No canon returned' };
    const db = getSupabase();
    const { error } = await db
      .from('ai_story_projects')
      .update({ worldbuilding_canon: parsed })
      .eq('id', data.projectId);
    if (error) return { generated: false, error: error.message };
    return { generated: true };
  } catch (e) {
    return { generated: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── 3. Power system canon ────────────────────────────────────────────────────

async function spawnPowerSystem(
  data: ProjectSetupData,
  context: string,
  config: GeminiConfig,
): Promise<CanonSpawnResult['powerSystem']> {
  const prompt = `${SPAWN_SYSTEM}

${context}

## Nhiệm vụ: Tạo power system canon với:

- tier_list: 5-10 tiers từ thấp lên cao với name + description + capability summary
- cost_model: mỗi tier-up cost gì (linh thạch / kinh nghiệm / thời gian / nội lực / lifespan / sanity / etc.)
- golden_finger: MC có cheat gì? input → output → limit → reward
- scaling_curve: chương 1 → 100 → 500 → 1000 — MC ở tier nào? (cadence rule)
- forbidden_shortcuts: 3-5 cách power-up Writer NÊN tránh (instant max-tier / no-cost breakthrough / external rescue)
- commonViolations: 3-5 patterns Critic NÊN flag

Trả về JSON:
\`\`\`json
{
  "tier_list": [{"tier": 1, "name": "...", "description": "...", "capability": "..."}, ...],
  "cost_model": "...",
  "golden_finger": {"input": "...", "output": "...", "limit": "...", "reward": "..."},
  "scaling_curve": {"ch_1": "...", "ch_100": "...", "ch_500": "...", "ch_1000": "..."},
  "forbidden_shortcuts": ["...", "..."],
  "commonViolations": ["...", "..."]
}
\`\`\``;

  try {
    const res = await callGemini(
      prompt,
      { ...config, temperature: 0.4, maxTokens: 4096, systemPrompt: SPAWN_SYSTEM },
      { jsonMode: true, tracking: { projectId: data.projectId, task: 'spawn_power_system', chapterNumber: 0 } },
    );
    const parsed = parseJSON<Record<string, unknown>>(res.content);
    if (!parsed) return { generated: false, error: 'No power system returned' };
    const db = getSupabase();
    const { error } = await db
      .from('ai_story_projects')
      .update({ power_system_canon: parsed })
      .eq('id', data.projectId);
    if (error) return { generated: false, error: error.message };
    return { generated: true };
  } catch (e) {
    return { generated: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── 4. Foreshadowing agenda ──────────────────────────────────────────────────

async function spawnForeshadowing(
  data: ProjectSetupData,
  context: string,
  config: GeminiConfig,
): Promise<CanonSpawnResult['foreshadowing']> {
  const prompt = `${SPAWN_SYSTEM}

${context}

## Nhiệm vụ: Tạo 8-12 foreshadowing entries pre-planned cho toàn bộ truyện (1000 chương target).

Mỗi entry:
- plantCh: chương cài đặt (5-300)
- pickupCh: chương payoff (plantCh + 30-700)
- hintText: hint cụ thể cài chương plant (1-2 sentence)
- payoffDescription: sự kiện payoff cụ thể chương pickup (1-2 sentence)
- category: 'identity' | 'power' | 'relationship' | 'world_rule' | 'item' | 'prophecy' | 'enemy'
- importance: 'minor' | 'major' | 'critical'

Spread plant points across volumes (đừng dồn 1 volume); pickup must be ≥30 chương sau plant.

Trả về JSON:
\`\`\`json
{
  "entries": [{"plantCh": 12, "pickupCh": 87, "hintText": "...", "payoffDescription": "...", "category": "identity", "importance": "major"}, ...]
}
\`\`\``;

  try {
    const res = await callGemini(
      prompt,
      { ...config, temperature: 0.5, maxTokens: 4096, systemPrompt: SPAWN_SYSTEM },
      { jsonMode: true, tracking: { projectId: data.projectId, task: 'spawn_foreshadowing', chapterNumber: 0 } },
    );
    const parsed = parseJSON<{ entries: Array<Record<string, unknown>> }>(res.content);
    if (!parsed?.entries || parsed.entries.length === 0) {
      return { generated: false, count: 0, error: 'No foreshadowing returned' };
    }
    const db = getSupabase();
    const rows = parsed.entries.map(e => ({
      project_id: data.projectId,
      plant_chapter: Number(e.plantCh) || 1,
      pickup_chapter: Number(e.pickupCh) || 30,
      hint_text: String(e.hintText || ''),
      payoff_description: String(e.payoffDescription || ''),
      category: String(e.category || 'minor'),
      importance: String(e.importance || 'minor'),
      status: 'planned',
    }));
    const { error } = await db.from('foreshadowing_agenda').insert(rows);
    if (error) return { generated: false, count: 0, error: error.message };
    return { generated: true, count: rows.length };
  } catch (e) {
    return { generated: false, count: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── 5. Plot twists ───────────────────────────────────────────────────────────

async function spawnPlotTwists(
  data: ProjectSetupData,
  context: string,
  config: GeminiConfig,
): Promise<CanonSpawnResult['plotTwists']> {
  const prompt = `${SPAWN_SYSTEM}

${context}

## Nhiệm vụ: Tạo 3-5 plot twists pre-planned cho truyện (mỗi twist cú đảo lớn cho reader).

Mỗi twist:
- arc_number: volume/arc xảy ra (1-15)
- twist_chapter: chương cụ thể (ước lượng)
- summary: 1 sentence twist là gì
- setup_chapters: array các chương cài hint (≥3 chương trước twist)
- payoff_type: 'identity_reveal' | 'betrayal' | 'enemy_was_ally' | 'world_rule_lie' | 'mc_secret_exposed' | 'power_origin_reveal' | 'historical_truth'
- reader_impact: 'mild' | 'major' | 'mind-blowing'

Trả về JSON:
\`\`\`json
{
  "twists": [{"arc_number": 3, "twist_chapter": 250, "summary": "...", "setup_chapters": [120, 180, 230], "payoff_type": "betrayal", "reader_impact": "major"}, ...]
}
\`\`\``;

  try {
    const res = await callGemini(
      prompt,
      { ...config, temperature: 0.5, maxTokens: 3072, systemPrompt: SPAWN_SYSTEM },
      { jsonMode: true, tracking: { projectId: data.projectId, task: 'spawn_plot_twists', chapterNumber: 0 } },
    );
    const parsed = parseJSON<{ twists: Array<Record<string, unknown>> }>(res.content);
    if (!parsed?.twists || parsed.twists.length === 0) {
      return { generated: false, count: 0, error: 'No twists returned' };
    }
    const db = getSupabase();
    const rows = parsed.twists.map(t => ({
      project_id: data.projectId,
      arc_number: Number(t.arc_number) || 1,
      twist_chapter: Number(t.twist_chapter) || 1,
      summary: String(t.summary || ''),
      setup_chapters: (t.setup_chapters as number[]) || [],
      payoff_type: String(t.payoff_type || 'unknown'),
      reader_impact: String(t.reader_impact || 'minor'),
      status: 'planned',
    }));
    const { error } = await db.from('plot_twists').insert(rows);
    if (error) return { generated: false, count: 0, error: error.message };
    return { generated: true, count: rows.length };
  } catch (e) {
    return { generated: false, count: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── 6. Themes ────────────────────────────────────────────────────────────────

async function spawnThemes(
  data: ProjectSetupData,
  context: string,
  config: GeminiConfig,
): Promise<CanonSpawnResult['themes']> {
  const prompt = `${SPAWN_SYSTEM}

${context}

## Nhiệm vụ: Tạo themes registry cho truyện.

- main_themes: 1-2 themes chính (vd "trust và betrayal", "freedom qua growth")
- motifs: 3-5 recurring symbols/images (vd "rain at moments of grief", "broken mirror = identity")
- character_arcs_alignment: cách mỗi character chính embody/conflict main theme

Trả về JSON:
\`\`\`json
{
  "themes": [
    {"name": "main_theme_1", "description": "...", "type": "main"},
    {"name": "motif_1", "description": "...", "type": "motif"},
    ...
  ]
}
\`\`\``;

  try {
    const res = await callGemini(
      prompt,
      { ...config, temperature: 0.5, maxTokens: 2048, systemPrompt: SPAWN_SYSTEM },
      { jsonMode: true, tracking: { projectId: data.projectId, task: 'spawn_themes', chapterNumber: 0 } },
    );
    const parsed = parseJSON<{ themes: Array<Record<string, unknown>> }>(res.content);
    if (!parsed?.themes || parsed.themes.length === 0) {
      return { generated: false, count: 0, error: 'No themes returned' };
    }
    const db = getSupabase();
    const rows = parsed.themes.map(t => ({
      project_id: data.projectId,
      name: String(t.name || ''),
      description: String(t.description || ''),
      type: String(t.type || 'motif'),
    }));
    const { error } = await db.from('story_themes').insert(rows);
    if (error) return { generated: false, count: 0, error: error.message };
    return { generated: true, count: rows.length };
  } catch (e) {
    return { generated: false, count: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── 7. Voice anchors ─────────────────────────────────────────────────────────

async function spawnVoiceAnchors(
  data: ProjectSetupData,
  context: string,
  config: GeminiConfig,
): Promise<CanonSpawnResult['voiceAnchors']> {
  const prompt = `${SPAWN_SYSTEM}

${context}

## Nhiệm vụ: Tạo 3 voice anchor prose samples (50-80 từ mỗi sample) match tone của truyện này.

3 anchors:
1. opening — đoạn mở chương: mô tả MC bước vào scene, action verb concrete
2. dialogue — đoạn dialogue ngắn giữa MC + 1 character (em-dash format VN)
3. action — đoạn action ngắn (combat hoặc decision pressure)

Mỗi anchor:
- snippet_type: 'opening' | 'dialogue' | 'action'
- prose_text: 50-80 từ
- key_traits: 3-5 keywords characterizing voice (vd "concrete sensory", "short clauses", "ironic")

Trả về JSON:
\`\`\`json
{
  "anchors": [
    {"snippet_type": "opening", "prose_text": "...", "key_traits": ["...", "..."]},
    {"snippet_type": "dialogue", "prose_text": "...", "key_traits": [...]},
    {"snippet_type": "action", "prose_text": "...", "key_traits": [...]}
  ]
}
\`\`\``;

  try {
    const res = await callGemini(
      prompt,
      { ...config, temperature: 0.6, maxTokens: 3072, systemPrompt: SPAWN_SYSTEM },
      { jsonMode: true, tracking: { projectId: data.projectId, task: 'spawn_voice_anchors', chapterNumber: 0 } },
    );
    const parsed = parseJSON<{ anchors: Array<Record<string, unknown>> }>(res.content);
    if (!parsed?.anchors || parsed.anchors.length === 0) {
      return { generated: false, count: 0, error: 'No anchors returned' };
    }
    const db = getSupabase();
    const rows = parsed.anchors.map(a => {
      const proseText = String(a.prose_text || '');
      // Compute simple voice metrics inline (avoid importing style-stats here)
      const sentences = proseText.split(/[.!?。！？]/).filter(s => s.trim().length > 0);
      const avgSentenceLength = sentences.length > 0 ? proseText.length / sentences.length : 0;
      const emDashCount = (proseText.match(/—/g) || []).length;
      return {
        project_id: data.projectId,
        chapter_number: 0, // setup-time anchor, not tied to a specific chapter
        snippet_type: String(a.snippet_type || 'opening'),
        snippet_text: proseText,
        key_traits: (a.key_traits as string[]) || [],
        voice_metrics: {
          avgSentenceLength: Math.round(avgSentenceLength),
          emDashCount,
          dialogueRatio: proseText.includes('—') ? 0.5 : 0,
          exclamationRatio: (proseText.match(/!/g) || []).length / Math.max(1, sentences.length),
        },
      };
    });
    const { error } = await db.from('voice_anchors').insert(rows);
    if (error) return { generated: false, count: 0, error: error.message };
    return { generated: true, count: rows.length };
  } catch (e) {
    return { generated: false, count: 0, error: e instanceof Error ? e.message : String(e) };
  }
}
