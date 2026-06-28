import { getSupabase } from '../utils/supabase';
import { computeStyleStats } from '../utils/style-stats';

export interface StyleHabitChapter {
  chapter_number: number;
  title?: string | null;
  content: string;
}

export interface StyleHabitStats {
  chapterCount: number;
  repeatedSentences: Array<{ text: string; chapters: number[]; count: number }>;
  topPhrases: Array<{ phrase: string; count: number; chapters: number[] }>;
  openingPatternRate: number;
  endingShapeRate: number;
  paragraphRhythm: {
    avgCv: number;
    lowVarietyChapters: number;
  };
  warnings: string[];
}

const STOPWORDS = new Set([
  'và', 'của', 'là', 'một', 'những', 'các', 'trong', 'ngoài', 'đã', 'sẽ', 'đang',
  'rằng', 'thì', 'mà', 'cho', 'với', 'khi', 'này', 'đó', 'hắn', 'nàng', 'cô',
  'anh', 'ông', 'bà', 'người', 'không', 'cũng', 'lại', 'chỉ', 'như',
]);

export function analyzeStyleHabits(chapters: StyleHabitChapter[]): StyleHabitStats {
  const usable = chapters
    .filter(ch => ch.content && ch.content.trim().length > 0)
    .sort((a, b) => a.chapter_number - b.chapter_number);

  const repeatedSentences = findRepeatedSentences(usable);
  const topPhrases = findTopPhrases(usable);
  const openingPatternRate = computeOpeningPatternRate(usable);
  const endingShapeRate = computeEndingShapeRate(usable);
  const paragraphStats = usable.map(ch => computeStyleStats(ch.content).paragraphLengthCV).filter(n => n > 0);
  const avgCv = paragraphStats.length
    ? round3(paragraphStats.reduce((sum, n) => sum + n, 0) / paragraphStats.length)
    : 0;
  const lowVarietyChapters = paragraphStats.filter(cv => cv < 0.15).length;
  const warnings: string[] = [];

  if (repeatedSentences.length > 0) warnings.push(`Repeated sentence across chapters: "${repeatedSentences[0].text.slice(0, 90)}"`);
  if (topPhrases.length > 0 && topPhrases[0].count >= 5) warnings.push(`Top repeated phrase: "${topPhrases[0].phrase}" x${topPhrases[0].count}`);
  if (openingPatternRate >= 0.45) warnings.push(`Opening pattern rate high: ${(openingPatternRate * 100).toFixed(0)}% recent chapters open static/time/observation.`);
  if (endingShapeRate >= 0.5) warnings.push(`Ending shape repetition high: ${(endingShapeRate * 100).toFixed(0)}% recent chapters share the same ending shape.`);
  if (usable.length >= 3 && lowVarietyChapters / usable.length >= 0.4) warnings.push(`Paragraph rhythm too uniform in ${lowVarietyChapters}/${usable.length} recent chapters.`);

  return {
    chapterCount: usable.length,
    repeatedSentences,
    topPhrases,
    openingPatternRate: round3(openingPatternRate),
    endingShapeRate: round3(endingShapeRate),
    paragraphRhythm: { avgCv, lowVarietyChapters },
    warnings,
  };
}

export async function computeProjectStyleHabits(
  projectId: string,
  novelId: string,
  currentChapter: number,
  windowChapters = 30,
): Promise<StyleHabitStats | null> {
  const db = getSupabase();
  const { data, error } = await db
    .from('chapters')
    .select('chapter_number,title,content')
    .eq('novel_id', novelId)
    .lte('chapter_number', currentChapter)
    .gte('chapter_number', Math.max(1, currentChapter - windowChapters + 1))
    .order('chapter_number', { ascending: true });
  if (error) {
    console.warn(`[style-habits] load failed for ${projectId.slice(0, 8)}: ${error.message}`);
    return null;
  }
  return analyzeStyleHabits((data || []) as StyleHabitChapter[]);
}

export async function getStyleHabitContext(
  projectId: string,
  novelId: string,
  currentChapter: number,
): Promise<string | null> {
  const stats = await computeProjectStyleHabits(projectId, novelId, Math.max(1, currentChapter - 1), 24);
  if (!stats || stats.warnings.length === 0) return null;
  return [
    '[STYLE HABITS — CẢNH BÁO LẶP TOÀN TRUYỆN]',
    ...stats.warnings.slice(0, 6).map(w => `• ${w}`),
    '→ Chương này phải đổi nhịp mở/kết, tránh câu/phrase đã lặp, và đa dạng paragraph rhythm.',
  ].join('\n');
}

function findRepeatedSentences(chapters: StyleHabitChapter[]): StyleHabitStats['repeatedSentences'] {
  const bySentence = new Map<string, { text: string; chapters: Set<number>; count: number }>();
  for (const ch of chapters) {
    for (const sentence of splitSentences(ch.content)) {
      const normalized = normalizeSentence(sentence);
      if (normalized.length < 40 || normalized.length > 220) continue;
      const row = bySentence.get(normalized) || { text: sentence.trim(), chapters: new Set<number>(), count: 0 };
      row.chapters.add(ch.chapter_number);
      row.count += 1;
      bySentence.set(normalized, row);
    }
  }
  return [...bySentence.values()]
    .filter(r => r.chapters.size >= 2 || r.count >= 3)
    .sort((a, b) => b.count - a.count || b.chapters.size - a.chapters.size)
    .slice(0, 8)
    .map(r => ({ text: r.text, chapters: [...r.chapters].sort((a, b) => a - b), count: r.count }));
}

function findTopPhrases(chapters: StyleHabitChapter[]): StyleHabitStats['topPhrases'] {
  const phrases = new Map<string, { count: number; chapters: Set<number> }>();
  for (const ch of chapters) {
    const tokens = tokenize(ch.content);
    for (let i = 0; i <= tokens.length - 4; i++) {
      const gram = tokens.slice(i, i + 4);
      if (gram.filter(t => STOPWORDS.has(t)).length >= 3) continue;
      if (gram.some(t => t.length < 2)) continue;
      const phrase = gram.join(' ');
      const row = phrases.get(phrase) || { count: 0, chapters: new Set<number>() };
      row.count += 1;
      row.chapters.add(ch.chapter_number);
      phrases.set(phrase, row);
    }
  }
  return [...phrases.entries()]
    .filter(([, row]) => row.count >= 3 && row.chapters.size >= 2)
    .sort((a, b) => b[1].count - a[1].count || b[1].chapters.size - a[1].chapters.size)
    .slice(0, 12)
    .map(([phrase, row]) => ({ phrase, count: row.count, chapters: [...row.chapters].sort((a, b) => a - b) }));
}

function computeOpeningPatternRate(chapters: StyleHabitChapter[]): number {
  if (chapters.length === 0) return 0;
  const hits = chapters.filter(ch => {
    const first = splitSentences(ch.content)[0] || '';
    return /(sáng|đêm|chiều|trưa|ánh|gió|mưa|trời|căn phòng|hắn đứng|hắn ngồi|nhìn|quan sát|im lặng)/i.test(first);
  }).length;
  return hits / chapters.length;
}

function computeEndingShapeRate(chapters: StyleHabitChapter[]): number {
  if (chapters.length < 3) return 0;
  const shapes = chapters.map(ch => classifyEndingShape(ch.content));
  const counts = new Map<string, number>();
  for (const shape of shapes) counts.set(shape, (counts.get(shape) || 0) + 1);
  return Math.max(...counts.values()) / chapters.length;
}

function classifyEndingShape(content: string): string {
  const tail = content.slice(-900);
  if (/[?？]\s*$/.test(tail) || /(là ai|chuyện gì|vì sao|ở đâu)[?？]?$/i.test(tail.trim())) return 'question';
  if (/(im lặng|không nói|nhìn nhau|gió|đêm|ánh mắt|bóng lưng)/i.test(tail)) return 'quiet-image';
  if (/(cửa|mở ra|xuất hiện|bước vào|tiếng động|rung lên|nổ tung)/i.test(tail)) return 'arrival-reveal';
  if (/(cười|khóe miệng|gật đầu|lắc đầu)/i.test(tail)) return 'reaction';
  return 'neutral';
}

function splitSentences(content: string): string[] {
  return content.split(/(?<=[.!?。！？])\s+|\n+/).map(s => s.trim()).filter(Boolean);
}

function normalizeSentence(sentence: string): string {
  return sentence.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
}

function tokenize(content: string): string[] {
  return normalizeSentence(content).split(/\s+/).filter(Boolean);
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
