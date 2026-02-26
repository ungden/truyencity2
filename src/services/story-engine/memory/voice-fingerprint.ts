/**
 * Story Engine v2 — Voice Fingerprint
 *
 * Analyzes written chapters to extract a consistent writing style "fingerprint".
 * Injected into Writer prompt to prevent voice drift over hundreds of chapters.
 * Updated every 10 chapters from the 3 most recent chapters.
 *
 * DB table: voice_fingerprints
 *   project_id UUID (PK), fingerprint JSONB,
 *   sample_chapters INT[], anti_patterns TEXT[],
 *   last_updated_chapter INT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
 */

import { getSupabase } from '../utils/supabase';
import { callGemini } from '../utils/gemini';
import { parseJSON } from '../utils/json-repair';
import type { GeminiConfig } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface VoiceFingerprint {
  avgSentenceLength: number;
  dialogueRatio: number;
  innerThoughtRatio: number;
  signaturePhrases: string[];
  avoidedPhrases: string[];
  narrativePatterns: string[];
  emotionalRegister: string;
  descriptionStyle: string;
  openingPatterns: string[];    // How chapters typically open
  transitionStyle: string;     // How scenes transition
  dialogueStyle: string;       // How characters speak (formal, casual, mixed)
}

// ── Constants ────────────────────────────────────────────────────────────────

const UPDATE_INTERVAL = 10; // Update fingerprint every 10 chapters
const FIRST_UPDATE = 5;     // First fingerprint after chapter 5
const SAMPLE_SIZE = 3;      // Analyze last 3 chapters

// ── Generate/Update Voice Fingerprint ────────────────────────────────────────

export async function updateVoiceFingerprint(
  projectId: string,
  novelId: string,
  chapterNumber: number,
  config: GeminiConfig,
): Promise<void> {
  // Only update at specific intervals
  if (chapterNumber < FIRST_UPDATE) return;
  if (chapterNumber !== FIRST_UPDATE && chapterNumber % UPDATE_INTERVAL !== 0) return;

  const db = getSupabase();

  // Load last 3 chapters
  const { data: chapters } = await db
    .from('chapters')
    .select('content,chapter_number')
    .eq('novel_id', novelId)
    .lte('chapter_number', chapterNumber)
    .order('chapter_number', { ascending: false })
    .limit(SAMPLE_SIZE);

  if (!chapters?.length || chapters.length < 2) return;

  // Take representative samples from each chapter (opening + middle + ending)
  const samples = chapters.map(ch => {
    const content = ch.content || '';
    const len = content.length;
    const opening = content.slice(0, 1500);
    const middle = content.slice(Math.floor(len / 2) - 750, Math.floor(len / 2) + 750);
    const ending = content.slice(-1500);
    return `[Chương ${ch.chapter_number}]\nMở đầu:\n${opening}\n\nGiữa:\n${middle}\n\nKết:\n${ending}`;
  }).join('\n\n---\n\n');

  // Load existing fingerprint for comparison
  const { data: existing } = await db
    .from('voice_fingerprints')
    .select('fingerprint')
    .eq('project_id', projectId)
    .maybeSingle();

  const prompt = `Bạn là Style Analyst chuyên phân tích văn phong cho webnovel.

Phân tích 3 chương mẫu sau để tạo Voice Fingerprint — "dấu vân tay" giọng văn:

${samples.slice(0, 12000)}

${existing?.fingerprint ? `Fingerprint trước đó (so sánh để phát hiện drift): ${JSON.stringify(existing.fingerprint).slice(0, 2000)}` : ''}

NHIỆM VỤ: Trích xuất đặc điểm giọng văn nhất quán qua các chương.

Trả về JSON:
{
  "avgSentenceLength": 15,
  "dialogueRatio": 0.35,
  "innerThoughtRatio": 0.15,
  "signaturePhrases": ["3-5 cụm từ tác giả hay dùng (đặc trưng, không phải cliché)"],
  "avoidedPhrases": ["3-5 cụm từ tác giả KHÔNG bao giờ dùng"],
  "narrativePatterns": [
    "Cách tác giả thường mở scene (VD: 'Bắt đầu bằng miêu tả môi trường')",
    "Cách tác giả thường kết scene (VD: 'Kết bằng nội tâm MC')"
  ],
  "emotionalRegister": "Mô tả tông cảm xúc chung (VD: 'sardonic_humor_with_warmth')",
  "descriptionStyle": "Cách miêu tả (VD: 'concise_but_vivid — ít tính từ, nhiều động từ')",
  "openingPatterns": ["Cách mở chương thường thấy (VD: 'Mở bằng đối thoại', 'Mở bằng action')"],
  "transitionStyle": "Cách chuyển scene (VD: 'Dùng dấu *** + câu miêu tả không gian mới')",
  "dialogueStyle": "Phong cách hội thoại (VD: 'Formal với bề trên, casual với bạn bè, mỉa mai với kẻ thù')"
}`;

  const res = await callGemini(prompt, {
    ...config,
    temperature: 0.2,
    maxTokens: 2048,
    systemPrompt: 'Bạn là Style Analyst chuyên nghiệp. Phân tích chính xác, cụ thể.',
  }, { jsonMode: true });

  const parsed = parseJSON<VoiceFingerprint>(res.content);
  if (!parsed) return;

  // Detect drift across 7 dimensions and add anti-patterns
  const antiPatterns: string[] = [];
  if (existing?.fingerprint) {
    const old = existing.fingerprint as VoiceFingerprint;

    // 1. Opening pattern repetition
    if (parsed.openingPatterns?.length === 1 && old.openingPatterns?.length === 1
      && parsed.openingPatterns[0] === old.openingPatterns[0]) {
      antiPatterns.push(`KHÔNG mở chương bằng "${parsed.openingPatterns[0]}" liên tục — thay đổi`);
    }

    // 2. Dialogue ratio drift (>15% change)
    if (old.dialogueRatio && parsed.dialogueRatio) {
      const drift = Math.abs(parsed.dialogueRatio - old.dialogueRatio);
      if (drift > 0.15) {
        antiPatterns.push(`Tỷ lệ đối thoại drift: ${(old.dialogueRatio * 100).toFixed(0)}% → ${(parsed.dialogueRatio * 100).toFixed(0)}% — điều chỉnh lại`);
      }
    }

    // 3. Sentence length drift (>30% change)
    if (old.avgSentenceLength && parsed.avgSentenceLength) {
      const drift = Math.abs(parsed.avgSentenceLength - old.avgSentenceLength) / old.avgSentenceLength;
      if (drift > 0.3) {
        const dir = parsed.avgSentenceLength > old.avgSentenceLength ? 'DÀI hơn' : 'NGẮN hơn';
        antiPatterns.push(`Độ dài câu đang drift ${dir}: ${old.avgSentenceLength} → ${parsed.avgSentenceLength} từ/câu — giữ ổn định`);
      }
    }

    // 4. Inner thought ratio drift (>10% absolute change)
    if (old.innerThoughtRatio !== undefined && parsed.innerThoughtRatio !== undefined) {
      const drift = Math.abs(parsed.innerThoughtRatio - old.innerThoughtRatio);
      if (drift > 0.10) {
        const dir = parsed.innerThoughtRatio > old.innerThoughtRatio ? 'TĂNG' : 'GIẢM';
        antiPatterns.push(`Tỷ lệ nội tâm ${dir}: ${(old.innerThoughtRatio * 100).toFixed(0)}% → ${(parsed.innerThoughtRatio * 100).toFixed(0)}% — giữ cân bằng`);
      }
    }

    // 5. Emotional register change
    if (old.emotionalRegister && parsed.emotionalRegister
      && old.emotionalRegister !== parsed.emotionalRegister) {
      antiPatterns.push(`Tông cảm xúc đã thay đổi: "${old.emotionalRegister}" → "${parsed.emotionalRegister}" — giữ nhất quán trừ khi cốt truyện yêu cầu`);
    }

    // 6. Description style change
    if (old.descriptionStyle && parsed.descriptionStyle
      && old.descriptionStyle !== parsed.descriptionStyle) {
      antiPatterns.push(`Phong cách miêu tả đã thay đổi: "${old.descriptionStyle}" → "${parsed.descriptionStyle}" — giữ nhất quán`);
    }

    // 7. Signature phrase erosion (old phrases disappearing)
    if (old.signaturePhrases?.length && parsed.signaturePhrases?.length) {
      const lost = old.signaturePhrases.filter(p => !parsed.signaturePhrases.includes(p));
      if (lost.length >= 2) {
        antiPatterns.push(`Đang MẤT cụm từ đặc trưng: "${lost.slice(0, 3).join('", "')}" — DUY TRÌ các cụm từ này`);
      }
    }
  }

  const { error: upsertErr } = await db.from('voice_fingerprints').upsert({
    project_id: projectId,
    fingerprint: parsed,
    sample_chapters: chapters.map(c => c.chapter_number),
    anti_patterns: antiPatterns,
    last_updated_chapter: chapterNumber,
  }, { onConflict: 'project_id' });
  if (upsertErr) console.warn('[VoiceFingerprint] Failed to save voice fingerprint: ' + upsertErr.message);
}

// ── Get Voice Fingerprint Context (pre-write injection) ──────────────────────

export async function getVoiceContext(
  projectId: string,
): Promise<string | null> {
  const db = getSupabase();
  const { data } = await db
    .from('voice_fingerprints')
    .select('fingerprint,anti_patterns')
    .eq('project_id', projectId)
    .maybeSingle();

  if (!data?.fingerprint) return null;

  const fp = data.fingerprint as VoiceFingerprint;
  const antiPatterns = (data.anti_patterns || []) as string[];

  const parts: string[] = ['═══ VOICE FINGERPRINT — GIỮ GIỌNG VĂN NHẤT QUÁN ═══'];

  if (fp.emotionalRegister) {
    parts.push(`Tông cảm xúc: ${fp.emotionalRegister}`);
  }
  if (fp.descriptionStyle) {
    parts.push(`Cách miêu tả: ${fp.descriptionStyle}`);
  }
  if (fp.dialogueStyle) {
    parts.push(`Phong cách hội thoại: ${fp.dialogueStyle}`);
  }
  if (fp.transitionStyle) {
    parts.push(`Chuyển scene: ${fp.transitionStyle}`);
  }
  if (fp.signaturePhrases?.length) {
    parts.push(`Cụm từ đặc trưng (DUY TRÌ): ${fp.signaturePhrases.join(', ')}`);
  }
  if (fp.avoidedPhrases?.length) {
    parts.push(`CẤM dùng: ${fp.avoidedPhrases.join(', ')}`);
  }
  if (fp.narrativePatterns?.length) {
    parts.push(`Patterns: ${fp.narrativePatterns.join('; ')}`);
  }

  // Anti-drift warnings
  if (antiPatterns.length) {
    parts.push('\n⚠️ CẢNH BÁO DRIFT:');
    for (const w of antiPatterns) {
      parts.push(`  - ${w}`);
    }
  }

  // Opening variety
  if (fp.openingPatterns?.length) {
    parts.push(`\nCách mở thường dùng: ${fp.openingPatterns.join(', ')}`);
    parts.push('→ ĐA DẠNG HÓA: Đổi cách mở nếu 2 chương liên tiếp dùng cùng pattern');
  }

  return parts.join('\n');
}
