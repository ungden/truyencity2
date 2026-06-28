import { getSupabase } from '../utils/supabase';

export interface CastLedgerEntry {
  characterName: string;
  briefRole: string | null;
  firstSeenChapter: number;
  lastSeenChapter: number;
  appearanceCount: number;
  status: 'alive' | 'dead' | 'missing' | 'unknown';
  lastKnownLocation: string | null;
}

export async function updateCastLedgerFromCharacters(
  projectId: string,
  chapterNumber: number,
  characters: Array<{
    character_name: string;
    status: string;
    location: string | null;
    personality_quirks: string | null;
    notes: string | null;
  }>,
): Promise<void> {
  const rows = characters
    .map((c) => ({
      name: c.character_name?.trim(),
      status: normalizeStatus(c.status),
      location: c.location || null,
      briefRole: inferBriefRole(c),
    }))
    .filter((c) => c.name && c.name.length >= 2 && c.name.length <= 50);
  if (rows.length === 0) return;

  try {
    const db = getSupabase();
    const names = rows.map(r => r.name as string);
    const { data: existing } = await db
      .from('story_cast_ledger')
      .select('character_name,first_seen_chapter,appearance_count,brief_role')
      .eq('project_id', projectId)
      .in('character_name', names);
    const byName = new Map(
      (existing || []).map((r: { character_name: string; first_seen_chapter: number; appearance_count: number; brief_role: string | null }) => [r.character_name, r]),
    );

    const upsertRows = rows.map((r) => {
      const prior = byName.get(r.name as string);
      return {
        project_id: projectId,
        character_name: r.name,
        brief_role: prior?.brief_role || r.briefRole,
        first_seen_chapter: Math.min(prior?.first_seen_chapter ?? chapterNumber, chapterNumber),
        last_seen_chapter: chapterNumber,
        appearance_count: (prior?.appearance_count ?? 0) + 1,
        status: r.status,
        last_known_location: r.location,
        updated_at: new Date().toISOString(),
      };
    });

    const { error } = await db
      .from('story_cast_ledger')
      .upsert(upsertRows, { onConflict: 'project_id,character_name' });
    if (error) throw error;
  } catch (e) {
    console.warn('[cast-ledger] update failed:', e instanceof Error ? e.message : String(e));
  }
}

export async function getCastLedger(
  projectId: string,
  currentChapter: number,
  limit = 120,
): Promise<CastLedgerEntry[]> {
  try {
    const db = getSupabase();
    const { data, error } = await db
      .from('story_cast_ledger')
      .select('character_name,brief_role,first_seen_chapter,last_seen_chapter,appearance_count,status,last_known_location')
      .eq('project_id', projectId)
      .lte('first_seen_chapter', currentChapter)
      .order('last_seen_chapter', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return ((data || []) as Array<{
      character_name: string;
      brief_role: string | null;
      first_seen_chapter: number;
      last_seen_chapter: number;
      appearance_count: number;
      status: string;
      last_known_location: string | null;
    }>).map((r) => ({
      characterName: r.character_name,
      briefRole: r.brief_role,
      firstSeenChapter: r.first_seen_chapter,
      lastSeenChapter: r.last_seen_chapter,
      appearanceCount: r.appearance_count,
      status: normalizeStatus(r.status),
      lastKnownLocation: r.last_known_location,
    }));
  } catch {
    return [];
  }
}

function inferBriefRole(c: {
  personality_quirks: string | null;
  notes: string | null;
}): string | null {
  const text = [c.personality_quirks, c.notes].filter(Boolean).join(' | ').trim();
  return text ? text.slice(0, 160) : null;
}

function normalizeStatus(status: string): CastLedgerEntry['status'] {
  return status === 'dead' || status === 'missing' || status === 'unknown' || status === 'alive'
    ? status
    : 'alive';
}
