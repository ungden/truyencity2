/**
 * Story Engine v2 — Power System Tracker
 *
 * Tracks MC's power progression with narrative logic.
 * Enforces: breakthrough conditions, trade-offs, anti-plot-armor.
 * Updated after each chapter via AI extraction.
 *
 * DB table: mc_power_states
 *   project_id UUID (PK), power_state JSONB,
 *   last_updated_chapter INT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
 */

import { getSupabase } from '../utils/supabase';
import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import type { GeminiConfig, GenreType } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface MCPowerState {
  currentRealm: string;
  realmIndex: number;
  subLevel?: string;
  bottleneck: string;
  tradeoffs: string[];
  hiddenPowers: string[];
  combatAbilities: Array<{
    name: string;
    proficiency: 'sơ nhập' | 'thành thạo' | 'đại thành' | 'viên mãn';
  }>;
  resources: Array<{
    name: string;
    quantity: string;
    source: string;
  }>;
  recentGains: Array<{
    chapter: number;
    gain: string;
    source: string;
  }>;
  recentLosses: Array<{
    chapter: number;
    loss: string;
    reason: string;
  }>;
  nextMilestone: string;
  combatCapability: string; // e.g., "Có thể đánh ngang Kết Đan Sơ kỳ nhờ kiếm pháp"
}

// ── Update Power State (post-write) ──────────────────────────────────────────

export async function updateMCPowerState(
  projectId: string,
  chapterNumber: number,
  chapterContent: string,
  protagonistName: string,
  genre: GenreType,
  config: GeminiConfig,
): Promise<void> {
  // Only update every 3 chapters or at breakthrough chapters
  const hasBreakthroughKeywords = /đột phá|tiến giai|bước vào|đạt đến|nâng cấp|evolve|level up|cảnh giới/.test(chapterContent);
  if (chapterNumber % 3 !== 0 && !hasBreakthroughKeywords) return;

  const db = getSupabase();

  // Load existing state
  const { data: existing } = await db
    .from('mc_power_states')
    .select('power_state')
    .eq('project_id', projectId)
    .maybeSingle();

  const currentState = existing?.power_state as MCPowerState | null;
  const contentSlice = chapterContent.slice(0, 8000);

  const prompt = `Bạn là Power System Analyst cho webnovel ${genre}.

MC: ${protagonistName}
Chương: ${chapterNumber}
${currentState ? `Trạng thái trước: ${JSON.stringify(currentState).slice(0, 2000)}` : 'Chưa có trạng thái.'}

NỘI DUNG CHƯƠNG (phân tích):
${contentSlice}

NHIỆM VỤ: Cập nhật trạng thái sức mạnh MC sau chương này.

QUY TẮC:
1. Chỉ ghi nhận thay đổi THỰC SỰ xảy ra trong chương (không suy đoán)
2. Nếu không có thay đổi sức mạnh → giữ nguyên state cũ, chỉ update bottleneck/nextMilestone nếu cần
3. recentGains/recentLosses: chỉ thêm từ chương này
4. combatCapability: đánh giá realistic dựa trên realm + abilities
5. bottleneck: rào cản cụ thể (thiếu tài nguyên, thiếu ngộ, thiếu kinh nghiệm chiến đấu...)

Trả về JSON:
{
  "currentRealm": "Tên cảnh giới/rank hiện tại",
  "realmIndex": 5,
  "subLevel": "Trung kỳ",
  "bottleneck": "Rào cản cụ thể để tiến lên",
  "tradeoffs": ["Hệ quả tiêu cực từ việc dùng sức mạnh (VD: mất 30% linh lực sau cấm thuật)"],
  "hiddenPowers": ["Sức mạnh chưa giác ngộ/giấu kín"],
  "combatAbilities": [{"name": "Tên chiêu thức", "proficiency": "thành thạo"}],
  "resources": [{"name": "Linh thạch", "quantity": "500 viên", "source": "auction chương 45"}],
  "recentGains": [{"chapter": ${chapterNumber}, "gain": "Gì MC nhận được", "source": "Từ đâu"}],
  "recentLosses": [{"chapter": ${chapterNumber}, "loss": "Gì MC mất", "reason": "Vì sao"}],
  "nextMilestone": "Mục tiêu sức mạnh tiếp theo + điều kiện",
  "combatCapability": "Đánh giá khả năng chiến đấu thực tế"
}`;

  const res = await callGemini(prompt, {
    ...config,
    temperature: 0.1,
    maxTokens: 2048,
    systemPrompt: 'Bạn là Power System Analyst. Chính xác, không phóng đại.',
  }, { jsonMode: true, tracking: { projectId, task: 'power_system', chapterNumber } });

  const parsed = parseJSON<MCPowerState>(res.content);
  if (!parsed) return;

  // Merge recent gains/losses with history (keep last 20)
  if (currentState) {
    const oldGains = (currentState.recentGains || []).filter(g => g.chapter !== chapterNumber);
    parsed.recentGains = [...oldGains, ...(parsed.recentGains || [])].slice(-20);

    const oldLosses = (currentState.recentLosses || []).filter(l => l.chapter !== chapterNumber);
    parsed.recentLosses = [...oldLosses, ...(parsed.recentLosses || [])].slice(-20);
  }

  const { error: upsertErr } = await db.from('mc_power_states').upsert({
    project_id: projectId,
    power_state: parsed,
    last_updated_chapter: chapterNumber,
  }, { onConflict: 'project_id' });
  if (upsertErr) console.warn('[PowerSystemTracker] Failed to save MC power state: ' + upsertErr.message);
}

// ── Get Power Context (pre-write injection) ──────────────────────────────────

export async function getPowerContext(
  projectId: string,
): Promise<string | null> {
  const db = getSupabase();
  const { data } = await db
    .from('mc_power_states')
    .select('power_state')
    .eq('project_id', projectId)
    .maybeSingle();

  if (!data?.power_state) return null;

  const ps = data.power_state as MCPowerState;
  const parts: string[] = ['═══ TRẠNG THÁI SỨC MẠNH MC (BẮT BUỘC TUÂN THỦ) ═══'];

  parts.push(`⚔️ Cảnh giới: ${ps.currentRealm}${ps.subLevel ? ` — ${ps.subLevel}` : ''}`);
  parts.push(`🎯 Khả năng chiến đấu: ${ps.combatCapability}`);
  parts.push(`🚧 Bottleneck: ${ps.bottleneck}`);
  parts.push(`📍 Mục tiêu tiếp: ${ps.nextMilestone}`);

  if (ps.combatAbilities?.length) {
    parts.push(`\nChiêu thức:`);
    for (const a of ps.combatAbilities) {
      parts.push(`  • ${a.name} (${a.proficiency})`);
    }
  }

  if (ps.tradeoffs?.length) {
    parts.push(`\n⚠️ Trade-offs/Hạn chế:`);
    for (const t of ps.tradeoffs) {
      parts.push(`  • ${t}`);
    }
  }

  if (ps.hiddenPowers?.length) {
    parts.push(`\n🔮 Sức mạnh ẩn (CHƯA giác ngộ — KHÔNG dùng trừ khi có trigger):`);
    for (const h of ps.hiddenPowers) {
      parts.push(`  • ${h}`);
    }
  }

  if (ps.resources?.length) {
    parts.push(`\nTài nguyên:`);
    for (const r of ps.resources.slice(-5)) {
      parts.push(`  • ${r.name}: ${r.quantity}`);
    }
  }

  parts.push('\n🚫 QUY TẮC:');
  parts.push('  - KHÔNG cho MC dùng chiêu thức chưa học');
  parts.push('  - KHÔNG đột phá nếu bottleneck chưa giải quyết');
  parts.push('  - Nếu MC thắng đối thủ mạnh hơn 2 bậc → CẦN lý do hợp lý (chiến thuật, địa hình, trợ giúp, đạo cụ, kinh nghiệm). KHÔNG nhất thiết MC phải bị thương để "cân bằng".');
  parts.push('  - Mỗi lần dùng sức mạnh lớn CÓ THỂ có hệ quả nhỏ (mệt nhẹ, tốn chút tài nguyên), KHÔNG bắt buộc hệ quả nặng. Nếu MC đã có chuẩn bị/kinh nghiệm/đồng đội → có thể giải quyết tự tin không bị thương.');
  parts.push('  - MC PHẢI thắng ≥1 trận lớn mỗi arc một cách dứt khoát (không bị thương nặng/mất nhiều tài nguyên) — anti-self-torture, tránh "thắng nhưng tả tơi".');

  return parts.join('\n');
}
