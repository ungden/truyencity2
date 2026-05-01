/**
 * Story Engine v2 — Economic Ledger
 *
 * Tracks MC + key entities financial state per chapter for do-thi/quan-truong/kinh-doanh genres.
 * Prevents illogical wealth jumps (MC kiếm 1 tỷ ch.20 nhưng tiêu 100 tỷ ch.50 không có deal lớn).
 *
 * DB table: economic_ledger (migration 0150)
 *
 * Activation: only do-thi, quan-truong genres + projects with kinh-doanh sub-genre.
 */

import { getSupabase } from '../utils/supabase';
import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import type { GeminiConfig, GenreType } from '../types';

const ECONOMY_GENRES: GenreType[] = ['do-thi', 'quan-truong'];

interface LedgerEntry {
  entity_name: string;
  entity_type?: 'mc' | 'company' | 'family' | 'investor';
  cash_estimate?: string;
  assets?: string[];
  monthly_revenue?: string;
  team_size?: number;
  delta_summary?: string;
}

export function shouldTrackEconomy(genre: GenreType, subGenres?: string[]): boolean {
  if (ECONOMY_GENRES.includes(genre)) return true;
  if (subGenres?.some((sg) => ['kinh-doanh', 'thuong-chien'].includes(sg))) return true;
  return false;
}

// ── Extract financial state from chapter (post-write) ────────────────────────

export async function extractEconomicState(
  projectId: string,
  chapterNumber: number,
  chapterContent: string,
  protagonistName: string,
  config: GeminiConfig,
): Promise<void> {
  if (chapterNumber < 2) return;

  const prompt = `Phân tích các thay đổi TÀI CHÍNH/TÀI SẢN trong chương ${chapterNumber}.

Nhân vật chính: ${protagonistName}

Nội dung chương (cắt 3500 chars):
${chapterContent.slice(0, 3500)}

Trả về JSON: chỉ những entity có thay đổi rõ ràng trong chương này (mới có tiền, mới có deal, mới mở công ty, etc.).
{
  "entries": [
    {
      "entity_name": "MC | tên công ty | tên gia đình",
      "entity_type": "mc | company | family | investor",
      "cash_estimate": "ước lượng tiền hiện có (text flexible: '5 tỷ', '200 nguyên', 'không rõ')",
      "assets": ["tài sản 1", "tài sản 2"],
      "monthly_revenue": "doanh thu/tháng nếu có",
      "team_size": số nhân sự nếu là công ty,
      "delta_summary": "thay đổi cụ thể trong chương (max 200 chars)"
    }
  ]
}

QUY TẮC:
- Chỉ ghi entity có thay đổi RÕ RÀNG (khoản tiền cụ thể, deal cụ thể).
- KHÔNG đoán/làm tròn quá đà — nếu không rõ thì để "không rõ" hoặc bỏ field.
- Tối đa 5 entries.
- Skip chương không có sự kiện kinh tế đáng kể (chỉ slice-of-life/đối thoại).`;

  try {
    const res = await callGemini(prompt, {
      ...config,
      temperature: 0.2,
      maxTokens: 2048,
      systemPrompt: 'Bạn là Financial Analyst, trích xuất thay đổi tài chính rõ ràng từ chương.',
    }, { jsonMode: true, tracking: { projectId, task: 'economy', chapterNumber } });

    const parsed = parseJSON<{ entries: LedgerEntry[] }>(res.content);
    if (!parsed?.entries?.length) return;

    const valid = parsed.entries
      .filter((e) => e.entity_name && e.delta_summary)
      .slice(0, 5);

    if (valid.length === 0) return;

    const rows = valid.map((e) => ({
      project_id: projectId,
      chapter_number: chapterNumber,
      entity_name: e.entity_name.trim().slice(0, 100),
      entity_type: e.entity_type || null,
      cash_estimate: (e.cash_estimate || '').slice(0, 100) || null,
      assets: e.assets?.slice(0, 10) || null,
      monthly_revenue: (e.monthly_revenue || '').slice(0, 100) || null,
      team_size: e.team_size && Number.isFinite(e.team_size) ? Math.max(0, Math.floor(e.team_size)) : null,
      delta_summary: (e.delta_summary || '').slice(0, 300),
    }));

    const db = getSupabase();
    const { error } = await db.from('economic_ledger').insert(rows);
    if (error) console.warn('[EconomicLedger] Insert failed:', error.message);
  } catch (err) {
    console.warn('[EconomicLedger] Extract failed:', err instanceof Error ? err.message : String(err));
  }
}

// ── Get economic context (pre-write injection) ───────────────────────────────

export async function getEconomicContext(
  projectId: string,
  genre: GenreType,
  subGenres?: string[],
): Promise<string | null> {
  if (!shouldTrackEconomy(genre, subGenres)) return null;

  const db = getSupabase();
  const { data } = await db
    .from('economic_ledger')
    .select('chapter_number, entity_name, entity_type, cash_estimate, assets, monthly_revenue, team_size, delta_summary')
    .eq('project_id', projectId)
    .order('chapter_number', { ascending: false })
    .limit(20);

  if (!data || data.length === 0) return null;

  // Pick latest per entity
  interface Row { chapter_number: number; entity_name: string; entity_type: string | null; cash_estimate: string | null; assets: string[] | null; monthly_revenue: string | null; team_size: number | null; delta_summary: string }
  const latestByEntity = new Map<string, Row>();
  for (const r of data as Row[]) {
    if (!latestByEntity.has(r.entity_name)) latestByEntity.set(r.entity_name, r);
  }

  const entries = Array.from(latestByEntity.values()).slice(0, 8);
  if (entries.length === 0) return null;

  const lines: string[] = ['[TÀI CHÍNH / TÀI SẢN — CẤM CHI TIÊU VƯỢT TÀI CHÍNH ĐÃ THIẾT LẬP]'];
  for (const e of entries) {
    const parts: string[] = [`• ${e.entity_name}${e.entity_type ? ` (${e.entity_type})` : ''} [last ch.${e.chapter_number}]:`];
    if (e.cash_estimate) parts.push(`tiền: ${e.cash_estimate}`);
    if (e.monthly_revenue) parts.push(`doanh thu: ${e.monthly_revenue}/tháng`);
    if (e.team_size != null) parts.push(`team: ${e.team_size} người`);
    if (e.assets?.length) parts.push(`tài sản: ${e.assets.slice(0, 3).join(', ')}`);
    lines.push(parts.join(' | '));
    if (e.delta_summary) lines.push(`  Thay đổi gần nhất: ${e.delta_summary}`);
  }
  lines.push('→ Chương này KHÔNG được cho MC chi tiêu vượt số tiền/tài sản đã thiết lập, hoặc thay đổi đột ngột mà không có deal/sự kiện rõ ràng.');

  return lines.join('\n');
}
