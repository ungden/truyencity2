/**
 * Story Engine v2 — Plot Tracker
 *
 * Consolidated module for 3 scalability systems:
 * 1. PlotThreadManager — track/score plot threads + foreshadowing
 * 2. BeatLedger — track beat usage with cooldowns + arc budgets
 * 3. RuleIndexer — extract and suggest world rules
 *
 * Replaces v1: plot-thread-manager.ts (604 lines) + beat-ledger.ts (649 lines)
 *              + rule-indexer.ts (538 lines) + consistency.ts (partial)
 *
 * All operations are non-fatal.
 */

import { getSupabase } from '../utils/supabase';

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 1: PLOT THREADS
// ══════════════════════════════════════════════════════════════════════════════

interface PlotThread {
  id: string;
  name: string;
  description: string;
  priority: 'critical' | 'main' | 'sub' | 'background';
  status: 'open' | 'developing' | 'climax' | 'resolved' | 'legacy';
  startChapter: number;
  targetPayoffChapter?: number;
  lastActiveChapter: number;
  relatedCharacters: string[];
  foreshadowingHints: ForeshadowingHint[];
  importance: number; // 0-100
}

interface ForeshadowingHint {
  id: string;
  chapterNumber: number;
  hint: string;
  payoffDeadline: number;
  status: 'planted' | 'developing' | 'paid_off' | 'abandoned';
  importance: 'major' | 'minor';
}

const PRIORITY_SCORES: Record<string, number> = {
  critical: 20, main: 15, sub: 10, background: 5,
};

/**
 * Load active plot threads for a project, score them for relevance,
 * and return a formatted context string.
 */
export async function buildPlotThreadContext(
  projectId: string,
  chapterNumber: number,
  charactersInChapter: string[],
  arcNumber: number,
): Promise<string | null> {
  try {
    const db = getSupabase();
    const { data } = await db
      .from('plot_threads')
      .select('*')
      .eq('project_id', projectId)
      .not('status', 'in', '("resolved","legacy")')
      .order('importance', { ascending: false });

    if (!data || data.length === 0) return null;

    // Map to typed threads
    const threads: PlotThread[] = data.map(mapThreadRow);

    // Score and rank
    const scored = threads.map(t => ({
      thread: t,
      score: scoreThread(t, chapterNumber, charactersInChapter, arcNumber),
    }));
    scored.sort((a, b) => b.score - a.score);

    const top = scored.slice(0, 5);
    if (top.length === 0) return null;

    // Build context string
    const lines: string[] = ['═══ TUYẾN TRUYỆN ĐANG MỞ ═══'];
    for (const { thread: t } of top) {
      lines.push(`• [${t.priority}] ${t.name}: ${t.description.slice(0, 200)}`);
      if (t.status === 'climax') lines.push(`  → ĐANG Ở CAO TRÀO — cần giải quyết sớm`);

      // Urgent foreshadowing
      const urgentHints = t.foreshadowingHints
        .filter(h => h.status === 'planted' && h.payoffDeadline <= chapterNumber + 20)
        .sort((a, b) => a.payoffDeadline - b.payoffDeadline)
        .slice(0, 2);

      for (const h of urgentHints) {
        const remaining = h.payoffDeadline - chapterNumber;
        if (remaining <= 0) {
          lines.push(`  ⚠️ QUÁ HẠN: "${h.hint}" — cần payoff NGAY`);
        } else {
          lines.push(`  ⏳ Foreshadowing: "${h.hint}" (còn ${remaining} chương)`);
        }
      }
    }

    // Check for abandoned threads (inactive > 100 chapters)
    const abandoned = threads.filter(t =>
      chapterNumber - t.lastActiveChapter > 100 && t.importance > 50,
    );
    if (abandoned.length > 0) {
      lines.push(`\n⚠️ Tuyến bị bỏ rơi: ${abandoned.map(t => t.name).join(', ')}`);
    }

    // 2026-04-29 continuity overhaul: Subplot Resurrection Guard.
    // Surface most-recently-resolved threads so Architect/Writer don't accidentally
    // re-open them. If a closed thread MUST come back, it should do so via explicit
    // [CALLBACK] flag, not silent resurrection.
    try {
      const { data: closed } = await db
        .from('plot_threads')
        .select('name,description,last_active_chapter')
        .eq('project_id', projectId)
        .eq('status', 'resolved')
        .order('last_active_chapter', { ascending: false })
        .limit(10);
      if (closed?.length) {
        // 2026-04-29 audit fix: removed `[🔒 ...]` brackets — was creating `\n\n[` inside the plot
        // threads section, which then confused regex extraction in Writer/Critic (RAG section
        // extraction would terminate prematurely at this internal bracketed marker, leaking RAG
        // boundary into plot-threads content). Use plain emoji prefix instead.
        lines.push(`\n🔒 TUYẾN ĐÃ ĐÓNG — KHÔNG ĐƯỢC MỞ LẠI TRỪ KHI CALLBACK CHỦ ĐỘNG:`);
        for (const t of closed) {
          lines.push(`• "${t.name}" (đóng ch.${t.last_active_chapter ?? '?'}): ${(t.description || '').slice(0, 150)}`);
        }
        lines.push(`→ Nếu chương này tự nhiên kéo lại nhân vật/sự kiện thuộc các tuyến trên, BẮT BUỘC viết rõ "callback có chủ đích" với lý do narrative — không phải lỗi continuity.`);
      }
    } catch {
      // Non-fatal
    }

    return lines.join('\n');
  } catch {
    return null;
  }
}

function scoreThread(
  t: PlotThread,
  chapter: number,
  characters: string[],
  arcNumber: number,
): number {
  let score = 0;

  // Character overlap (40%)
  if (t.relatedCharacters.length > 0) {
    const overlap = t.relatedCharacters.filter(c => characters.includes(c)).length;
    score += (overlap / t.relatedCharacters.length) * 40;
  }

  // Deadline urgency (30%)
  if (t.targetPayoffChapter) {
    const remaining = t.targetPayoffChapter - chapter;
    if (remaining <= 0) score += 30; // overdue
    else if (remaining <= 20) score += (1 - remaining / 20) * 30;
  }

  // Priority (20%)
  score += PRIORITY_SCORES[t.priority] || 5;

  // Recent activity (10%)
  const gap = chapter - t.lastActiveChapter;
  if (gap <= 50) score += (1 - gap / 50) * 10;
  else score -= 5;

  // Bonuses
  if (t.status === 'climax') score += 25;

  return score;
}

interface PlotThreadRow {
  id: string;
  name: string;
  description: string | null;
  priority: PlotThread['priority'] | string | null;
  status: PlotThread['status'] | string | null;
  start_chapter: number | null;
  target_payoff_chapter: number | null;
  last_active_chapter: number | null;
  related_characters: string[] | null;
  foreshadowing_hints: ForeshadowingHint[] | null;
  importance: number | null;
}

function mapThreadRow(row: PlotThreadRow): PlotThread {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    priority: (row.priority || 'sub') as PlotThread['priority'],
    status: (row.status || 'open') as PlotThread['status'],
    startChapter: row.start_chapter || 0,
    targetPayoffChapter: row.target_payoff_chapter ?? undefined,
    lastActiveChapter: row.last_active_chapter || 0,
    relatedCharacters: row.related_characters || [],
    foreshadowingHints: Array.isArray(row.foreshadowing_hints) ? row.foreshadowing_hints : [],
    importance: row.importance || 50,
  };
}

// ── Plot Thread Ledger Writer (Phase 24) ─────────────────────────────────────
// Phase 24: V2 had a plot_threads READER (buildPlotThreadContext) but NO writer.
// Threads were planted by arc plans then went stale. This extractor reads the
// just-finished AI write, asks the model what threads were advanced/resolved/
// opened, and upserts plot_threads so context-assembler can ground the next
// chapter in actual thread state instead of stale arc-plan promises.

interface PlotThreadAIResponse {
  updates?: Array<{
    id?: string;
    name?: string;
    status?: PlotThread['status'];
    description?: string;
    targetPayoffChapter?: number;
    importance?: number;
    payoffDescription?: string;
    relatedCharacters?: string[];
  }>;
  newThreads?: Array<{
    name?: string;
    description?: string;
    priority?: PlotThread['priority'];
    status?: PlotThread['status'];
    targetPayoffChapter?: number;
    relatedCharacters?: string[];
    importance?: number;
  }>;
}

export async function extractAndUpdatePlotThreads(
  projectId: string,
  chapterNumber: number,
  content: string,
  characters: string[],
  config: import('../types').GeminiConfig,
): Promise<{ created: number; updated: number }> {
  try {
    const db = getSupabase();
    const { data: activeRows, error: activeErr } = await db
      .from('plot_threads')
      .select('*')
      .eq('project_id', projectId)
      .not('status', 'in', '("resolved","legacy")')
      .order('importance', { ascending: false })
      .limit(12);

    if (activeErr) {
      console.warn(`[plot-tracker] Load active threads failed for Ch.${chapterNumber}: ${activeErr.message}`);
    }

    const active = (activeRows || []).map(mapThreadRow);
    const activeBrief = active.length > 0
      ? active
          .map(t => `- id=${t.id}; name=${t.name}; status=${t.status}; priority=${t.priority}; last=${t.lastActiveChapter}; desc=${t.description.slice(0, 160)}`)
          .join('\n')
      : '(chưa có thread đang mở)';

    const prompt = `Bạn là plot-thread ledger cho truyện dài kỳ. Đọc chương vừa viết và cập nhật TUYẾN TRUYỆN dài hạn (KHÔNG ghi beat nhỏ một-chương).

CHARACTERS XUẤT HIỆN: ${characters.slice(0, 12).join(', ')}

ACTIVE THREADS:
${activeBrief}

CHƯƠNG ${chapterNumber}:
${content.slice(0, 9000)}

Trả về JSON. Update thread cũ nếu chương vừa rồi đẩy/đóng nó. Tạo thread mới nếu chương vừa MỞ rõ một promise dài hạn (>10 chương). KHÔNG tạo thread cho beat ngắn.

{
  "updates": [
    {
      "id": "<id thread cũ>",
      "name": "<dùng tên cũ>",
      "status": "open|developing|climax|resolved|legacy",
      "description": "<nếu thay đổi mô tả>",
      "targetPayoffChapter": <số chương>,
      "importance": <0-100>,
      "payoffDescription": "<chỉ điền nếu status=resolved>",
      "relatedCharacters": ["..."]
    }
  ],
  "newThreads": [
    {
      "name": "<tên cụ thể, không generic>",
      "description": "<thread này hứa payoff gì trong tương lai>",
      "priority": "critical|main|sub|background",
      "status": "open",
      "targetPayoffChapter": <số chương>,
      "relatedCharacters": ["..."],
      "importance": <0-100>
    }
  ]
}

QUY TẮC:
- KHÔNG bịa thread không có trong chương.
- name PHẢI cụ thể (vd "Tìm di vật của tổ phụ" KHÔNG phải "tìm kiếm").
- description ngắn gọn, mô tả PROMISE chứ không phải tóm tắt.
- Trả JSON rỗng {"updates":[],"newThreads":[]} nếu chương không thay đổi tuyến nào.`;

    const { callGemini } = await import('../utils/gemini');
    const { parseJSON } = await import('../utils/json-repair');
    const res = await callGemini(
      prompt,
      { ...config, temperature: 0.2, maxTokens: 4096 },
      { jsonMode: true, tracking: { projectId, task: 'plot_thread_ledger', chapterNumber } },
    );

    const parsed = parseJSON<PlotThreadAIResponse>(res.content);
    if (!parsed) return { created: 0, updated: 0 };

    let created = 0;
    let updated = 0;

    // Apply updates to existing threads.
    for (const u of parsed.updates || []) {
      const target = active.find(t => (u.id && t.id === u.id) || (u.name && t.name === u.name));
      if (!target) continue;
      const updateRow: Record<string, unknown> = {
        last_active_chapter: chapterNumber,
        updated_at: new Date().toISOString(),
      };
      if (u.status && u.status !== target.status) updateRow.status = u.status;
      if (u.description && u.description !== target.description) updateRow.description = u.description;
      if (typeof u.targetPayoffChapter === 'number') updateRow.target_payoff_chapter = u.targetPayoffChapter;
      if (typeof u.importance === 'number') updateRow.importance = Math.max(0, Math.min(100, u.importance));
      if (Array.isArray(u.relatedCharacters) && u.relatedCharacters.length > 0) {
        updateRow.related_characters = u.relatedCharacters;
      }

      const { error: upErr } = await db
        .from('plot_threads')
        .update(updateRow)
        .eq('id', target.id);
      if (upErr) {
        console.warn(`[plot-tracker] Update thread ${target.id} failed: ${upErr.message}`);
      } else {
        updated++;
      }
    }

    // Insert new threads — bound to 3 per chapter so model can't spam.
    const newThreads = (parsed.newThreads || []).slice(0, 3);
    for (const nt of newThreads) {
      if (!nt.name || nt.name.length < 3) continue;
      // Skip if a thread with the same name already exists.
      if (active.some(t => t.name.toLowerCase() === nt.name!.toLowerCase())) continue;
      const insertRow = {
        project_id: projectId,
        name: nt.name,
        description: nt.description || '',
        priority: nt.priority || 'sub',
        status: nt.status || 'open',
        start_chapter: chapterNumber,
        target_payoff_chapter: nt.targetPayoffChapter ?? null,
        last_active_chapter: chapterNumber,
        related_characters: Array.isArray(nt.relatedCharacters) ? nt.relatedCharacters : [],
        foreshadowing_hints: [],
        importance: typeof nt.importance === 'number' ? Math.max(0, Math.min(100, nt.importance)) : 50,
      };
      const { error: insErr } = await db.from('plot_threads').insert(insertRow);
      if (insErr) {
        console.warn(`[plot-tracker] Insert thread "${nt.name}" failed: ${insErr.message}`);
      } else {
        created++;
      }
    }

    if (created > 0 || updated > 0) {
      console.log(`[plot-tracker] Ch.${chapterNumber}: created ${created}, updated ${updated} threads`);
    }

    return { created, updated };
  } catch (e) {
    console.warn(`[plot-tracker] extractAndUpdatePlotThreads failed for Ch.${chapterNumber}:`, e instanceof Error ? e.message : String(e));
    return { created: 0, updated: 0 };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 2: BEAT LEDGER
// ══════════════════════════════════════════════════════════════════════════════

type BeatCategory = 'plot' | 'emotional' | 'setting';

interface BeatEntry {
  beatType: string;
  category: BeatCategory;
  chapterNumber: number;
  cooldownUntil: number;
}

// Cooldown in chapters before beat can be reused
const BEAT_COOLDOWNS: Record<string, number> = {
  // Plot beats
  war: 50, betrayal: 40, sacrifice: 40, inheritance: 35,
  tournament: 30, family_reunion: 30, auction: 25, revelation: 25,
  secret_realm: 20, assassination: 20, alliance: 20, rescue_mission: 15,
  treasure_hunt: 18, sect_conflict: 15, escape: 15, trial: 12,
  investigation: 12, duel: 10, breakthrough: 8, merchant: 8, training: 5,
  // Emotional beats
  revenge: 25, loss: 25, humiliation: 20, despair: 15,
  reunion: 20, romance: 15, triumph: 12, shock: 10,
  loyalty: 10, satisfaction: 10, hope: 8, growth: 8,
  relief: 8, anger: 8, tension: 5, curiosity: 3,
  // Setting beats
  underworld: 25, prison: 25, ancient_ruins: 20, battlefield: 20,
  divine_realm: 20, mortal_realm: 15, ocean: 15, palace: 12,
  sky: 12, cave: 10, mountain: 8, marketplace: 8,
  wilderness: 8, city: 5, sect_grounds: 3,
};

// Vietnamese patterns for beat detection
const BEAT_PATTERNS: Array<{ type: string; re: RegExp }> = [
  { type: 'tournament',    re: /(?:thi đấu|đại hội|võ đài|tranh đoạt|tỷ thí)/i },
  { type: 'auction',       re: /(?:đấu giá|phiên chợ|mua bán|trả giá)/i },
  { type: 'breakthrough',  re: /(?:đột phá|lên cảnh giới|ngưng tụ|hóa thần|thông mạch)/i },
  { type: 'betrayal',      re: /(?:phản bội|lật mặt|đâm sau lưng|bán đứng)/i },
  { type: 'revenge',       re: /(?:báo thù|trả thù|rửa hận|phục thù)/i },
  { type: 'treasure_hunt', re: /(?:kho báu|di tích|bảo vật|thần khí|linh dược)/i },
  { type: 'duel',          re: /(?:quyết đấu|sinh tử chiến|đối đầu|thách đấu)/i },
  { type: 'training',      re: /(?:tu luyện|tập luyện|bế quan|đóng cửa tu hành)/i },
  { type: 'face_slap',     re: /(?:quỳ xuống|xin tha|nhận sai|bẽ mặt|mất mặt|tát vào mặt)/i },
  { type: 'romance',       re: /(?:tình cảm|yêu|thương|hôn|ôm|e thẹn)/i },
  { type: 'secret_realm',  re: /(?:bí cảnh|không gian bí mật|cổ tích|di tích cổ)/i },
  { type: 'war',           re: /(?:đại chiến|chiến tranh|công thành|vạn quân)/i },
];

/**
 * Build beat guidance context: which beats to use and avoid.
 */
export async function buildBeatContext(
  projectId: string,
  chapterNumber: number,
  arcNumber: number,
): Promise<string | null> {
  try {
    const db = getSupabase();

    // Load recent beat usage
    const { data: entries } = await db
      .from('beat_usage')
      .select('beat_type,beat_category,chapter_number,cooldown_until')
      .eq('project_id', projectId)
      .order('chapter_number', { ascending: false })
      .limit(200);

    if (!entries) return null;

    const beats: BeatEntry[] = entries.map(e => ({
      beatType: e.beat_type,
      category: e.beat_category as BeatCategory,
      chapterNumber: e.chapter_number,
      cooldownUntil: e.cooldown_until || 0,
    }));

    // Beats on cooldown (cannot use)
    const onCooldown = beats
      .filter(b => b.cooldownUntil > chapterNumber)
      .map(b => b.beatType);
    const cooldownSet = new Set(onCooldown);

    // Recent beats (last 5 chapters)
    const recentBeats = beats
      .filter(b => b.chapterNumber >= chapterNumber - 5)
      .map(b => `${b.beatType} (ch.${b.chapterNumber})`);

    // Suggested: beats not on cooldown and not recently used
    const recentTypes = new Set(beats.filter(b => b.chapterNumber >= chapterNumber - 5).map(b => b.beatType));
    const allBeatTypes = Object.keys(BEAT_COOLDOWNS);
    const suggested = allBeatTypes
      .filter(b => !cooldownSet.has(b) && !recentTypes.has(b))
      .slice(0, 5);

    // Build context
    const lines: string[] = ['═══ BEAT GUIDELINES ═══'];
    if (suggested.length > 0) {
      lines.push(`Gợi ý beats: ${suggested.join(', ')}`);
    }
    if (cooldownSet.size > 0) {
      lines.push(`TRÁNH (đang cooldown): ${[...cooldownSet].slice(0, 10).join(', ')}`);
    }
    if (recentBeats.length > 0) {
      lines.push(`Gần đây: ${recentBeats.slice(0, 5).join(', ')}`);
    }

    return lines.join('\n');
  } catch {
    return null;
  }
}

/**
 * Detect beats in chapter content and record them.
 */
export async function detectAndRecordBeats(
  projectId: string,
  chapterNumber: number,
  arcNumber: number,
  content: string,
): Promise<void> {
  try {
    // Detect beats via patterns
    const detected: Array<{ beatType: string; category: BeatCategory; intensity: number }> = [];

    for (const { type, re } of BEAT_PATTERNS) {
      const matches = content.match(new RegExp(re.source, 'gi'));
      if (matches && matches.length > 0) {
        const category = categorize(type);
        detected.push({
          beatType: type,
          category,
          intensity: Math.min(10, matches.length * 2),
        });
      }
    }

    if (detected.length === 0) return;

    // Record in DB
    const db = getSupabase();
    const rows = detected.map(d => ({
      project_id: projectId,
      chapter_number: chapterNumber,
      arc_number: arcNumber,
      beat_category: d.category,
      beat_type: d.beatType,
      intensity: d.intensity,
      cooldown_until: chapterNumber + (BEAT_COOLDOWNS[d.beatType] || 10),
    }));

    await db.from('beat_usage').insert(rows);
  } catch {
    // Non-fatal
  }
}

const EMOTIONAL_BEATS = new Set([
  'humiliation', 'revenge', 'triumph', 'despair', 'hope', 'shock',
  'romance', 'sacrifice', 'loyalty', 'growth', 'loss', 'reunion',
  'tension', 'relief', 'curiosity', 'anger', 'satisfaction',
]);

const SETTING_BEATS = new Set([
  'sect_grounds', 'wilderness', 'city', 'ancient_ruins', 'mortal_realm',
  'divine_realm', 'underworld', 'mountain', 'ocean', 'sky', 'cave',
  'palace', 'marketplace', 'battlefield', 'prison',
]);

function categorize(beatType: string): BeatCategory {
  if (EMOTIONAL_BEATS.has(beatType)) return 'emotional';
  if (SETTING_BEATS.has(beatType)) return 'setting';
  return 'plot';
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 3: RULE INDEXER
// ══════════════════════════════════════════════════════════════════════════════

interface WorldRule {
  id: string;
  ruleText: string;
  category: string;
  tags: string[];
  importance: number;
  usageCount: number;
}

/**
 * Suggest relevant world rules for a chapter based on characters, context, and location.
 */
export async function buildRuleContext(
  projectId: string,
  chapterNumber: number,
  contextSnippet: string,
  characters: string[],
  location?: string,
): Promise<string | null> {
  try {
    const db = getSupabase();
    const { data } = await db
      .from('world_rules_index')
      .select('id,rule_text,category,tags,importance,usage_count')
      .eq('project_id', projectId)
      .order('importance', { ascending: false })
      .limit(50);

    if (!data || data.length === 0) return null;

    const rules: WorldRule[] = data.map(r => ({
      id: r.id,
      ruleText: r.rule_text,
      category: r.category,
      tags: r.tags || [],
      importance: r.importance || 50,
      usageCount: r.usage_count || 0,
    }));

    // Build search tags from chapter context
    const searchTags: string[] = [];
    for (const c of characters) searchTags.push(`character=${c}`);
    if (location) searchTags.push(`location=${location}`);

    // Score rules
    const scored = rules.map(rule => {
      let score = 0;

      // Tag match (+40 each)
      for (const tag of searchTags) {
        if (rule.tags.includes(tag)) score += 40;
      }

      // Keyword match from context (+20 max)
      const keywords = contextSnippet
        .split(/\s+/)
        .filter(w => w.length > 3)
        .slice(0, 10);
      const matched = keywords.filter(k => rule.ruleText.toLowerCase().includes(k.toLowerCase()));
      if (keywords.length > 0) {
        score += (matched.length / keywords.length) * 20;
      }

      // Importance bonus (+10 max)
      score += (rule.importance / 100) * 10;

      return { rule, score };
    });

    // 2026-04-29 continuity overhaul: previous logic returned null when no rule scored ≥20,
    // which was the common case (rules need explicit tag matches that contextSnippet rarely has).
    // Result: world_rules_index was effectively write-only. Now always surface top 8 rules:
    // first the relevance-scored matches, then top-importance fallbacks to fill the slate.
    const matched = scored
      .filter(s => s.score >= 15)
      .sort((a, b) => b.score - a.score);

    const matchedIds = new Set(matched.map(s => s.rule.id));
    const fallback = rules
      .filter(r => !matchedIds.has(r.id))
      .sort((a, b) => b.importance - a.importance);

    const top: WorldRule[] = [
      ...matched.slice(0, 5).map(s => s.rule),
      ...fallback.slice(0, 8 - Math.min(matched.length, 5)),
    ];

    if (top.length === 0) return null;

    const lines: string[] = ['[QUY TẮC THẾ GIỚI ĐÃ THIẾT LẬP — TUYỆT ĐỐI KHÔNG VI PHẠM]'];
    for (const rule of top) {
      lines.push(`• [${rule.category}] ${rule.ruleText.slice(0, 240)}`);
    }

    return lines.join('\n');
  } catch {
    return null;
  }
}

/**
 * Extract world rules from chapter content using Vietnamese patterns.
 */
export async function extractRulesFromChapter(
  projectId: string,
  chapterNumber: number,
  content: string,
): Promise<void> {
  try {
    const patterns: Array<{ re: RegExp; category: string }> = [
      { re: /cảnh giới\s+(.{10,80})\s+có\s+(.{10,120})/g, category: 'power_system' },
      { re: /([A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬ][a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệ]+(?:\s+[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬ][a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệ]+)*)\s+là\s+(.{10,120})/g, category: 'geography' },
      { re: /luật lệ\s+(.{5,60})\s+quy định\s+(.{10,120})/g, category: 'restrictions' },
      { re: /truyền thuyết\s+kể rằng\s+(.{20,200})/g, category: 'history' },
    ];

    const db = getSupabase();
    const rows: Array<Record<string, unknown>> = [];

    for (const { re, category } of patterns) {
      let match: RegExpExecArray | null;
      const regex = new RegExp(re.source, re.flags);
      while ((match = regex.exec(content)) !== null) {
        const ruleText = match[0].slice(0, 300);

        // Generate tags from category + capitalized words
        const tags = [category];
        const caps = ruleText.match(/[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬ][a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệ]+(?:\s+[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬ][a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệ]+)*/g);
        if (caps) tags.push(...caps.slice(0, 3));

        rows.push({
          id: crypto.randomUUID(),
          project_id: projectId,
          rule_text: ruleText,
          category,
          tags,
          introduced_chapter: chapterNumber,
          importance: 60,
          usage_count: 0,
        });
      }
    }

    if (rows.length > 0) {
      await db.from('world_rules_index').insert(rows);
    }
  } catch {
    // Non-fatal
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 4: CONSISTENCY CHECK
// ══════════════════════════════════════════════════════════════════════════════

interface ConsistencyIssue {
  type: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  description: string;
}

/**
 * Quick consistency check: dead character appearances + relationship contradictions.
 * AI-based checks (character traits, world rules) are skipped for speed.
 * Returns issues array (empty = all clear).
 */
/**
 * 2026-04-29 continuity overhaul: split into fast (regex) + deep (LLM) variants.
 * Fast variant runs every chapter pre-save; deep variant runs every 3 chapters.
 */
export async function checkConsistencyFast(
  projectId: string,
  chapterNumber: number,
  content: string,
): Promise<ConsistencyIssue[]> {
  try {
    const issues: ConsistencyIssue[] = [];
    const db = getSupabase();

    // Dead character regex check — must catch every chapter
    const { data: deadChars } = await db
      .from('character_states')
      .select('character_name, chapter_number')
      .eq('project_id', projectId)
      .eq('status', 'dead');

    if (deadChars) {
      // Stricter flashback check: must contain explicit time-jump markers near the dead char's name.
      // 2026-04-29 audit fix: scan ALL mentions of the dead char (not just first). A char might
      // legitimately appear in flashback in scene 1 but illegally appear alive in scene 4 — we must
      // flag any mention without a nearby flashback marker. Also flag bare dialogue/action mentions
      // that lack a time-jump context cue.
      const TIME_JUMP_PATTERNS = /(nhớ lại|hồi tưởng|ký ức|trước đây \d+|năm xưa|hồi đó|kiếp trước|trước khi (chết|qua đời|mất)|trong giấc mơ|trong mơ|tưởng tượng|hình bóng)/i;
      // Action/dialogue verbs near the mention indicate the char is being treated as ALIVE
      // (speaking, moving, fighting, deciding). These are red flags — a flashback narration
      // doesn't have the dead char taking present-tense actions.
      const LIVING_ACTION_PATTERNS = /(nói|hỏi|đáp|cười|cau mày|gật đầu|lắc đầu|đứng dậy|ngồi xuống|đi tới|bước|vung tay|ra lệnh|quyết định|nhìn thấy)/i;

      for (const { character_name, chapter_number: deathChapter } of deadChars) {
        if (!character_name || !content.includes(character_name)) continue;

        // Find ALL mentions of this dead char (not just first)
        let searchFrom = 0;
        let flagged = false;
        while (!flagged) {
          const idx = content.indexOf(character_name, searchFrom);
          if (idx < 0) break;
          // 200-char window around this specific mention
          const windowStart = Math.max(0, idx - 200);
          const windowEnd = Math.min(content.length, idx + character_name.length + 200);
          const window = content.slice(windowStart, windowEnd);
          const hasFlashback = TIME_JUMP_PATTERNS.test(window);
          const hasLivingAction = LIVING_ACTION_PATTERNS.test(window);

          // Flag if: no flashback context, OR has explicit living-action verb (even with flashback marker —
          // dead char shouldn't be taking present actions in any context).
          if (!hasFlashback || hasLivingAction) {
            issues.push({
              type: 'dead_character',
              severity: 'critical',
              description: `${character_name} đã chết ở chương ${deathChapter ?? '?'} nhưng xuất hiện ở chương ${chapterNumber}${hasLivingAction ? ' với hành động sống (nói/đi/quyết định)' : ' không có ngữ cảnh flashback rõ ràng'}`,
            });
            flagged = true; // One issue per dead char per chapter is enough
            break;
          }
          searchFrom = idx + character_name.length;
        }
      }
    }

    return issues;
  } catch {
    return [];
  }
}

export async function checkConsistency(
  projectId: string,
  chapterNumber: number,
  content: string,
  _characters: string[],
): Promise<ConsistencyIssue[]> {
  try {
    const issues: ConsistencyIssue[] = await checkConsistencyFast(projectId, chapterNumber, content);

    // 2. Fast LLM check for logic/world rules if business/finance context detected
    const BUSINESS_WORDS = /tỷ|triệu|công ty|cổ phần|doanh thu|lợi nhuận|giá|mua|bán|đầu tư|tài sản/i;
    if (BUSINESS_WORDS.test(content) && content.length < 15000) {
      // Lazy load to avoid circular deps
      const { callGemini } = await import('../utils/gemini');
      const { parseJSON } = await import('../utils/json-repair');
      
      const prompt = `Kiểm tra logic tài chính/thương mại trong chương truyện sau.
Chỉ trả về JSON rỗng [] nếu không có lỗi rõ ràng. Nếu có lỗi logic nực cười (ví dụ: nhân vật đang nghèo tự nhiên lấy ra tỷ đô mà không có lý do, hoặc định giá sai lệch hàng nghìn lần), hãy trả về:
[
  {
    "type": "logic_error",
    "severity": "major",
    "description": "Lý do lỗi logic"
  }
]

Nội dung:
${content.slice(0, 5000)}`;

      try {
        const res = await callGemini(prompt, { model: 'deepseek-v4-flash', temperature: 0.1, maxTokens: 1024 }, { jsonMode: true, tracking: { projectId, task: 'plot_tracker', chapterNumber } });
        if (res.content && res.content.trim().length > 5) { // not just []
           const parsedIssues = parseJSON<ConsistencyIssue[]>(res.content);
           if (Array.isArray(parsedIssues)) {
             issues.push(...parsedIssues);
           }
        }
      } catch (e) {
        // ignore LLM failures
      }
    }

    return issues;
  } catch {
    return [];
  }
}
