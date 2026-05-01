/**
 * Story Engine v2 — Hook Strength Evaluator (Phase 27 W5.3)
 *
 * Evaluates per-chapter hooks (opening + closing) for retention.
 *
 * Đại thần workflow mapping:
 *   Top web novel authors craft hooks deliberately. Opening hook (first 200
 *   chars) determines whether reader continues past 1st paragraph. Closing
 *   hook (last 300 chars) determines whether reader clicks "next chapter."
 *
 * Heuristic-only — fast keyword + structure analysis.
 */

export interface HookReport {
  openingScore: number; // 0-10
  closingScore: number; // 0-10
  combinedScore: number;
  openingType: string; // 'action' | 'mystery' | 'dialogue' | 'description' | 'setting' | 'monologue'
  closingType: string; // 'cliffhanger' | 'mystery' | 'emotional' | 'reveal' | 'continuation' | 'resolution'
  weaknesses: string[];
}

const OPENING_PATTERNS = {
  action:      /^[\s\S]{0,300}?(?:vung|đâm|chém|đánh|bắn|tấn công|chạy|nhảy|ngã|đập|né|trốn|hét|thét|gào)/i,
  mystery:     /^[\s\S]{0,300}?(?:bỗng|đột nhiên|kỳ lạ|không hiểu|ngạc nhiên|lạ thường|ai đó|một người lạ|thế nào|tại sao|cái gì)/i,
  dialogue:    /^[\s\S]{0,200}?[—-]\s*[A-ZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆ]/,
  description: /^[\s\S]{0,300}?(?:ánh nắng|mặt trời|gió|mưa|tuyết|cây|đường phố|tòa nhà|sân|phòng)/i,
  monologue:   /^[\s\S]{0,300}?(?:tôi|hắn|nàng).{0,30}(?:nghĩ|cảm thấy|trong lòng|tự hỏi)/i,
};

const CLOSING_PATTERNS = {
  cliffhanger: /(?:bỗng|đột nhiên|chớp mắt|sét đánh|tiếng động|rung chuyển|hét lên|phát hiện|nhìn thấy)[\s\S]{0,200}?(?:[?!]|\.\.\.|$)/i,
  mystery:     /(?:nhưng|tuy nhiên|sự thật|bí mật|còn|nếu|hóa ra|không ngờ)[\s\S]{0,200}?(?:[?!]|\.\.\.|$)/i,
  emotional:   /(?:nước mắt|trái tim|đau|đớn|xé lòng|nhung nhớ|hối hận|tiếc nuối|cô đơn)[\s\S]{0,150}?$/i,
  reveal:      /(?:thì ra|thực ra|hóa ra|ta là|chính là|hắn chính là|đó là|chính ngươi)[\s\S]{0,200}?$/i,
};

export function evaluateHooks(content: string): HookReport {
  const trimmed = content.trim();
  const opening = trimmed.slice(0, 500);
  const closing = trimmed.slice(-600);

  // === Opening analysis ===
  let openingType = 'description';
  let openingScore = 4; // Default: serviceable

  if (OPENING_PATTERNS.action.test(opening)) { openingType = 'action'; openingScore = 8; }
  else if (OPENING_PATTERNS.mystery.test(opening)) { openingType = 'mystery'; openingScore = 8; }
  else if (OPENING_PATTERNS.dialogue.test(opening)) { openingType = 'dialogue'; openingScore = 7; }
  else if (OPENING_PATTERNS.description.test(opening)) { openingType = 'description'; openingScore = 5; }
  else if (OPENING_PATTERNS.monologue.test(opening)) { openingType = 'monologue'; openingScore = 4; }

  // Penalty: opening starts with weather/setting + boring tone
  if (/^(?:hôm nay|sáng nay|buổi chiều|ngày hôm sau)\s+(?:là một ngày|trời|nắng|mưa)/i.test(opening)) {
    openingScore -= 2;
  }

  // Bonus: hook ends sentence with cliffhanger-like punctuation in first 300 chars
  if (/[?!](?:\s|$)/.test(opening.slice(0, 300))) openingScore += 1;

  // === Closing analysis ===
  let closingType = 'continuation';
  let closingScore = 4;

  if (CLOSING_PATTERNS.cliffhanger.test(closing)) { closingType = 'cliffhanger'; closingScore = 9; }
  else if (CLOSING_PATTERNS.reveal.test(closing)) { closingType = 'reveal'; closingScore = 8; }
  else if (CLOSING_PATTERNS.mystery.test(closing)) { closingType = 'mystery'; closingScore = 7; }
  else if (CLOSING_PATTERNS.emotional.test(closing)) { closingType = 'emotional'; closingScore = 6; }

  // Penalty: closing is just "ngày hôm sau" / "kết thúc" / boring resolution
  if (/(?:ngày hôm sau bắt đầu|kết thúc|hôm đó qua đi|đêm khuya buông xuống)\.\s*$/i.test(closing)) {
    closingScore -= 2;
  }

  // Penalty: closing has ending punctuation = boring full-stop, no hook
  if (/[.]\s*$/.test(closing) && !CLOSING_PATTERNS.cliffhanger.test(closing) && !CLOSING_PATTERNS.mystery.test(closing)) {
    closingScore = Math.min(closingScore, 5);
  }

  openingScore = Math.max(1, Math.min(10, openingScore));
  closingScore = Math.max(1, Math.min(10, closingScore));

  const weaknesses: string[] = [];
  if (openingScore <= 4) weaknesses.push(`opening yếu (type=${openingType}) — cần action/mystery/dialogue mạnh hơn`);
  if (closingScore <= 4) weaknesses.push(`closing yếu (type=${closingType}) — cần cliffhanger/reveal/mystery hook`);

  return {
    openingScore,
    closingScore,
    combinedScore: Math.round((openingScore + closingScore) / 2),
    openingType,
    closingType,
    weaknesses,
  };
}

export function formatHookReport(report: HookReport): string {
  const lines = [
    `[HOOK STRENGTH — combined ${report.combinedScore}/10]`,
    `  Opening: ${report.openingType} (${report.openingScore}/10)`,
    `  Closing: ${report.closingType} (${report.closingScore}/10)`,
  ];
  if (report.weaknesses.length > 0) {
    for (const w of report.weaknesses) {
      lines.push(`  ⚠️ ${w}`);
    }
  }
  return lines.join('\n');
}
