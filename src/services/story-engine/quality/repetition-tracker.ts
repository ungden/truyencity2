/**
 * Quality Overhaul 1.6 — cross-chapter repetition tracker (deterministic, no LLM).
 *
 * The Critic's repetition check is intra-chapter only: "ánh ban mai" 5 times
 * in ONE chapter gets flagged, but 4 times across each of 5 consecutive
 * chapters does not — and that's exactly what readers notice ("the author is
 * obsessed with morning light"). Post-write we extract motif candidates
 * (curated imagery lexicon hits + 4-gram pet phrases repeated within the
 * chapter) and upsert per-project usage. Pre-write, motifs used in ≥3 of the
 * last 5 chapters become a [CẤM LẶP] ban list in the Architect prompt's
 * dynamic suffix (already uncached, so no prompt-cache cost).
 */

import { getSupabase } from '../utils/supabase';

// Distinctive imagery phrases AI Vietnamese webnovel prose overuses. These are
// motif-level (scene dressing / body language), not function words — common
// verbs like "gật đầu" are deliberately excluded to avoid constant false bans.
const IMAGERY_LEXICON: string[] = [
  'ánh ban mai', 'ánh trăng', 'ánh hoàng hôn', 'tia nắng đầu tiên', 'nắng chiều nhạt',
  'hít một hơi thật sâu', 'hít sâu một hơi',
  'khóe miệng cong lên', 'khóe miệng nhếch lên', 'nhếch mép cười',
  'tim đập thình thịch', 'tim đập nhanh hơn',
  'siết chặt nắm đấm', 'bàn tay siết chặt',
  'ánh mắt sắc bén', 'ánh mắt sáng lên', 'đôi mắt híp lại', 'ánh mắt phức tạp',
  'nụ cười nhạt', 'cười khổ một tiếng',
  'sống lưng lạnh toát', 'nổi da gà',
  'không khí như đông đặc', 'không khí trầm hẳn xuống', 'không khí ngưng trệ',
  'một luồng khí lạnh', 'lóe lên một tia', 'thoáng qua một tia',
  'mồ hôi lạnh', 'thở phào nhẹ nhõm',
  'góc phòng tối', 'màn đêm buông xuống', 'gió đêm lành lạnh',
];

const VI_STOPWORDS = new Set([
  'của', 'và', 'là', 'một', 'các', 'những', 'đã', 'đang', 'sẽ', 'không', 'có',
  'được', 'trong', 'với', 'này', 'đó', 'cũng', 'như', 'lại', 'ra', 'vào', 'lên',
  'xuống', 'thì', 'mà', 'ở', 'cho', 'khi', 'từ', 'về', 'người', 'hắn', 'cô',
  'anh', 'tôi', 'ta', 'nàng', 'gã', 'nó', 'họ', 'mình', 'rồi', 'nên', 'để',
  'bị', 'còn', 'chỉ', 'rất', 'nhưng', 'nếu', 'vì', 'sao', 'gì', 'ai', 'đây',
]);

const MAX_BAN_LIST = 15;
const RECENT_WINDOW = 5;
const BAN_THRESHOLD = 3; // used in ≥3 of the last RECENT_WINDOW chapters
const CHAPTERS_ARRAY_CAP = 20;

/**
 * Deterministic motif extraction — exported for unit tests.
 * Returns lexicon phrases present in the content + 4-gram "pet phrases"
 * repeated ≥2 times within the chapter (mostly-content-word n-grams only).
 */
export function extractMotifs(content: string): string[] {
  const motifs = new Set<string>();
  const lower = content.toLowerCase();

  for (const phrase of IMAGERY_LEXICON) {
    if (lower.includes(phrase)) motifs.add(phrase);
  }

  // 4-gram pet phrases: normalize → tokenize → count → keep repeats.
  const tokens = lower
    .replace(/[“”"‘’'…—–\-.,!?;:()«»\[\]]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const counts = new Map<string, number>();
  for (let i = 0; i + 4 <= tokens.length; i++) {
    const gram = tokens.slice(i, i + 4);
    const stopRatio = gram.filter(t => VI_STOPWORDS.has(t)).length / 4;
    if (stopRatio > 0.5) continue;
    const key = gram.join(' ');
    if (key.length < 12) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  for (const [gram, n] of counts) {
    if (n >= 2) motifs.add(gram);
  }

  return [...motifs];
}

/**
 * Pure windowed ban decision — exported for unit tests.
 * chapters = all chapter numbers where the motif appeared.
 */
export function isBannedMotif(chapters: number[], currentChapter: number): boolean {
  const recent = chapters.filter(c => c >= currentChapter - RECENT_WINDOW && c < currentChapter);
  return recent.length >= BAN_THRESHOLD;
}

/** Post-write task: record this chapter's motifs. Non-fatal. */
export async function recordMotifUsage(
  projectId: string,
  chapterNumber: number,
  content: string,
): Promise<void> {
  try {
    const motifs = extractMotifs(content);
    if (motifs.length === 0) return;
    const db = getSupabase();

    const { data: existing } = await db
      .from('motif_usage')
      .select('motif, first_chapter, use_count, chapters')
      .eq('project_id', projectId)
      .in('motif', motifs);

    const existingMap = new Map(
      (existing || []).map(r => [r.motif as string, r as { motif: string; first_chapter: number; use_count: number; chapters: number[] }]),
    );

    const rows = motifs.map(motif => {
      const prev = existingMap.get(motif);
      const chapters = prev
        ? [...(prev.chapters || []).filter(c => c !== chapterNumber), chapterNumber].slice(-CHAPTERS_ARRAY_CAP)
        : [chapterNumber];
      return {
        project_id: projectId,
        motif,
        first_chapter: prev?.first_chapter ?? chapterNumber,
        last_chapter: chapterNumber,
        use_count: (prev?.use_count ?? 0) + (prev?.chapters?.includes(chapterNumber) ? 0 : 1),
        chapters,
      };
    });

    const { error } = await db.from('motif_usage').upsert(rows, { onConflict: 'project_id,motif' });
    if (error) console.warn(`[RepetitionTracker] upsert failed ch.${chapterNumber}:`, error.message);
  } catch (e) {
    console.warn(`[RepetitionTracker] recordMotifUsage threw ch.${chapterNumber}:`, e instanceof Error ? e.message : String(e));
  }
}

/** Pre-write: motifs overused in the recent window → Architect [CẤM LẶP] list. */
export async function getRepetitionBanList(
  projectId: string,
  chapterNumber: number,
): Promise<string[]> {
  try {
    const db = getSupabase();
    const { data } = await db
      .from('motif_usage')
      .select('motif, chapters')
      .eq('project_id', projectId)
      .gte('last_chapter', chapterNumber - RECENT_WINDOW);

    const banned = (data || [])
      .map(r => ({
        motif: r.motif as string,
        recentUses: ((r.chapters as number[]) || []).filter(c => c >= chapterNumber - RECENT_WINDOW && c < chapterNumber).length,
      }))
      .filter(r => r.recentUses >= BAN_THRESHOLD)
      .sort((a, b) => b.recentUses - a.recentUses)
      .slice(0, MAX_BAN_LIST)
      .map(r => r.motif);

    return banned;
  } catch (e) {
    console.warn(`[RepetitionTracker] getRepetitionBanList threw:`, e instanceof Error ? e.message : String(e));
    return [];
  }
}
