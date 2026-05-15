/**
 * Story Engine — Style stats utility (Phase R+1, 2026-05-15).
 *
 * Pure statistical text analysis (no LLM). Inspired by InkOS agents/
 * style-analyzer.ts: extracts measurable metrics from prose that can
 * be tracked over time to detect drift.
 *
 * Metrics extracted:
 *   - avgSentenceLength + stddev
 *   - avgParagraphLength + min/max range
 *   - Vocabulary diversity (TTR — unique tokens / total tokens)
 *   - Coefficient of variation (CV) of paragraph lengths
 *   - Exclamation + question density
 *   - Em-dash density (dialogue marker in VN webnovel)
 *
 * These complement the LLM-generated qualitative VoiceFingerprint by
 * grounding it in measurable numbers.
 */

export interface StyleStats {
  readonly totalWords: number;
  readonly totalChars: number;
  readonly avgSentenceLength: number;
  readonly sentenceLengthStdDev: number;
  readonly avgParagraphLength: number;
  readonly paragraphLengthMin: number;
  readonly paragraphLengthMax: number;
  readonly paragraphLengthCV: number;
  readonly vocabularyDiversity: number;
  readonly exclamationRatio: number;
  readonly questionRatio: number;
  readonly emDashDensity: number;
  readonly dialogueRatio: number;
}

export function computeStyleStats(content: string): StyleStats {
  if (!content) return emptyStats();

  // Sentences: split by VN sentence terminators
  const sentences = content
    .split(/[.!?。！？\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  const sentenceLengths = sentences.map(s => s.split(/\s+/).filter(Boolean).length);
  const totalWords = content.trim().split(/\s+/).filter(Boolean).length;
  const totalChars = content.length;
  const avgSentenceLength =
    sentenceLengths.length > 0
      ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length
      : 0;
  const sentenceLengthStdDev = computeStdDev(sentenceLengths, avgSentenceLength);

  // Paragraphs: split by double newline
  const paragraphs = content
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
  const paragraphLengths = paragraphs.map(p => p.length);
  const avgParagraphLength =
    paragraphLengths.length > 0
      ? paragraphLengths.reduce((a, b) => a + b, 0) / paragraphLengths.length
      : 0;
  const paragraphLengthMin = paragraphLengths.length > 0 ? Math.min(...paragraphLengths) : 0;
  const paragraphLengthMax = paragraphLengths.length > 0 ? Math.max(...paragraphLengths) : 0;
  const paragraphLengthCV =
    avgParagraphLength > 0
      ? computeStdDev(paragraphLengths, avgParagraphLength) / avgParagraphLength
      : 0;

  // Vocabulary diversity (TTR on words)
  const lowerWords = content.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const uniqueWords = new Set(lowerWords);
  const vocabularyDiversity = lowerWords.length > 0 ? uniqueWords.size / lowerWords.length : 0;

  // Punctuation ratios (per sentence)
  const exclamations = (content.match(/!/g) || []).length;
  const questions = (content.match(/\?/g) || []).length;
  const exclamationRatio = sentences.length > 0 ? exclamations / sentences.length : 0;
  const questionRatio = sentences.length > 0 ? questions / sentences.length : 0;

  // Em-dash density (VN dialogue marker)
  const emDashes = (content.match(/—/g) || []).length;
  const emDashDensity = totalChars > 0 ? (emDashes * 1000) / totalChars : 0;

  // Dialogue ratio (paragraphs starting with em-dash)
  const dialogueParas = paragraphs.filter(p => p.startsWith('—')).length;
  const dialogueRatio = paragraphs.length > 0 ? dialogueParas / paragraphs.length : 0;

  return {
    totalWords,
    totalChars,
    avgSentenceLength: round1(avgSentenceLength),
    sentenceLengthStdDev: round1(sentenceLengthStdDev),
    avgParagraphLength: Math.round(avgParagraphLength),
    paragraphLengthMin,
    paragraphLengthMax,
    paragraphLengthCV: round3(paragraphLengthCV),
    vocabularyDiversity: round3(vocabularyDiversity),
    exclamationRatio: round3(exclamationRatio),
    questionRatio: round3(questionRatio),
    emDashDensity: round1(emDashDensity),
    dialogueRatio: round3(dialogueRatio),
  };
}

/**
 * Detect drift between two style stats snapshots. Returns array of human-
 * readable drift warnings (used as anti-patterns in voice fingerprint).
 *
 * Drift thresholds:
 *   - Sentence length: >30% drift = warn
 *   - Paragraph length CV: <0.15 = uniform warning (always trigger)
 *   - Vocabulary diversity: >0.15 drop = warn (vocab shrinking)
 *   - Dialogue ratio: >0.20 drift = warn
 *   - Em-dash density: >0.30 drop = warn (losing dialogue style)
 */
export function detectStyleDrift(prev: StyleStats, curr: StyleStats): string[] {
  const warnings: string[] = [];

  if (prev.avgSentenceLength > 0) {
    const drift = Math.abs(curr.avgSentenceLength - prev.avgSentenceLength) / prev.avgSentenceLength;
    if (drift > 0.3) {
      const dir = curr.avgSentenceLength > prev.avgSentenceLength ? 'DÀI hơn' : 'NGẮN hơn';
      warnings.push(
        `Độ dài câu drift ${dir}: ${prev.avgSentenceLength} → ${curr.avgSentenceLength} từ/câu (${Math.round(drift * 100)}% deviation). Giữ ổn định.`,
      );
    }
  }

  if (curr.paragraphLengthCV > 0 && curr.paragraphLengthCV < 0.15) {
    warnings.push(
      `Paragraph CV ${curr.paragraphLengthCV.toFixed(3)} < 0.15 — đoạn quá đồng đều. Đa dạng: đoạn ngắn cho impact, đoạn dài cho immersion.`,
    );
  }

  if (prev.vocabularyDiversity > 0 && curr.vocabularyDiversity > 0) {
    const drop = prev.vocabularyDiversity - curr.vocabularyDiversity;
    if (drop > 0.15) {
      warnings.push(
        `Vocab diversity giảm ${(drop * 100).toFixed(1)}%: ${prev.vocabularyDiversity.toFixed(3)} → ${curr.vocabularyDiversity.toFixed(3)}. Tránh lặp từ — dùng synonyms.`,
      );
    }
  }

  if (prev.dialogueRatio > 0 || curr.dialogueRatio > 0) {
    const drift = Math.abs(curr.dialogueRatio - prev.dialogueRatio);
    if (drift > 0.2) {
      const dir = curr.dialogueRatio > prev.dialogueRatio ? 'TĂNG' : 'GIẢM';
      warnings.push(
        `Dialogue ratio ${dir}: ${(prev.dialogueRatio * 100).toFixed(0)}% → ${(curr.dialogueRatio * 100).toFixed(0)}%. Giữ cân bằng narration/dialogue.`,
      );
    }
  }

  if (prev.emDashDensity > 1 && curr.emDashDensity < prev.emDashDensity * 0.7) {
    warnings.push(
      `Em-dash density giảm: ${prev.emDashDensity.toFixed(1)} → ${curr.emDashDensity.toFixed(1)} / 1K chars. Có thể đang mất dialogue style — đảm bảo em-dash format cho thoại.`,
    );
  }

  return warnings;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function emptyStats(): StyleStats {
  return {
    totalWords: 0,
    totalChars: 0,
    avgSentenceLength: 0,
    sentenceLengthStdDev: 0,
    avgParagraphLength: 0,
    paragraphLengthMin: 0,
    paragraphLengthMax: 0,
    paragraphLengthCV: 0,
    vocabularyDiversity: 0,
    exclamationRatio: 0,
    questionRatio: 0,
    emDashDensity: 0,
    dialogueRatio: 0,
  };
}

function computeStdDev(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
