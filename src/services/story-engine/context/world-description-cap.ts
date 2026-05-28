// world_description is the hand-crafted canonical premise (golden-finger rules,
// phase roadmap, world laws, endgame). It anchors every chapter. When it exceeds the
// prompt budget, a blind head-slice silently drops late rule lines — a coherence
// hazard (Supreme Goal 1). This selector keeps rule-bearing lines first, then fills
// the rest of the budget with prose in original order, so scattered late rules survive.

const RULE_MARKERS =
  /(^\s*[-*•]|^\s*\d+[.)]|quy tắc|nguyên tắc|\bluật\b|cấm |bắt buộc|giai đoạn|phase\s*\d|lộ trình|bàn tay vàng|golden finger|kết thúc|endgame|hệ thống|cảnh giới|sức mạnh)/i;

export function capWorldDescription(text: string, budget = 8000): string {
  if (text.length <= budget) return text;

  const lines = text.split('\n');
  const keep = new Array<boolean>(lines.length).fill(false);
  let used = 0;

  // Pass 1: reserve rule-bearing lines (in order) within budget.
  for (let i = 0; i < lines.length; i++) {
    if (RULE_MARKERS.test(lines[i])) {
      const cost = lines[i].length + 1;
      if (used + cost <= budget) {
        keep[i] = true;
        used += cost;
      }
    }
  }

  // Pass 2: fill remaining budget with prose lines (in order) — premise opener wins.
  for (let i = 0; i < lines.length; i++) {
    if (!keep[i]) {
      const cost = lines[i].length + 1;
      if (used + cost <= budget) {
        keep[i] = true;
        used += cost;
      }
    }
  }

  const result = lines.filter((_, i) => keep[i]).join('\n');
  // Fallback: a single over-budget line (no newlines) leaves nothing kept.
  return result || text.slice(0, budget);
}
