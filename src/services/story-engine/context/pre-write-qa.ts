/**
 * Story Engine v2 — Pre-Write Q&A Pass (Phase 22 Stage 2 Q6)
 *
 * Đại thần workflow: BEFORE writing the next chapter, a real novelist asks themselves
 * "what do I need to remember about X / Y / Z to write this scene correctly?" — and
 * looks it up in their notes.
 *
 * This module proactively ANSWERS those questions for the AI. Given the upcoming
 * chapter brief + arc plan, it extracts entities (characters, locations, items) and
 * builds a "STATE CHECK" digest with everything the engine knows about each entity.
 * Injected into Architect context so the plan is grounded in current truth.
 *
 * Deterministic (no AI calls) — pure DB queries + regex entity extraction.
 * Cost: ~50ms DB latency, $0 API cost. Quality lever: high.
 */

import { getSupabase } from '../utils/supabase';

const MAX_ENTITIES = 12;
const MAX_BLOCK_CHARS = 6000;

export interface PreWriteQAOptions {
  chapterBrief?: string;
  arcPlanText?: string;
  knownCharacterNames: string[];
  protagonistName: string;
}

/**
 * Extract entity candidates from the upcoming chapter brief + arc plan text.
 * Uses Vietnamese capitalized-noun heuristic + intersection with knownCharacterNames.
 */
function extractEntities(
  brief: string,
  arcPlanText: string,
  knownCharacters: string[],
  protagonist: string,
): { characters: string[]; locations: string[]; items: string[] } {
  const text = `${brief}\n${arcPlanText}`;

  // Characters: intersection of known names with text mentions, plus protagonist
  const charsSet = new Set<string>([protagonist]);
  for (const name of knownCharacters) {
    if (name && name.length >= 2 && text.includes(name)) charsSet.add(name);
  }

  // Locations: capitalized 2-3-word spans following "tại", "ở", "đến", "từ", "trong"
  const locRegex = /\b(?:tại|ở|đến|từ|trong|về)\s+([A-ZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ][a-zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]+(?:\s+[A-ZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ][a-zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]+){0,2})/g;
  const locsSet = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = locRegex.exec(text)) !== null) {
    const loc = m[1].trim();
    if (loc.length >= 3 && !knownCharacters.includes(loc)) locsSet.add(loc);
  }

  // Items: less reliable; skip for now (would need named-item dictionary)
  return {
    characters: [...charsSet].slice(0, MAX_ENTITIES),
    locations: [...locsSet].slice(0, 6),
    items: [],
  };
}

export async function runPreWriteQA(
  projectId: string,
  chapterNumber: number,
  options: PreWriteQAOptions,
): Promise<string | null> {
  if (chapterNumber < 5) return null; // Not enough state for Q&A early

  try {
    const db = getSupabase();
    const entities = extractEntities(
      options.chapterBrief || '',
      options.arcPlanText || '',
      options.knownCharacterNames,
      options.protagonistName,
    );

    if (entities.characters.length === 0 && entities.locations.length === 0) return null;

    const lines: string[] = [`[STATE CHECK — TRẠNG THÁI ENTITY TRƯỚC KHI VIẾT CHƯƠNG ${chapterNumber}]`];
    let totalChars = lines[0].length;

    // Character lookups
    for (const charName of entities.characters) {
      if (totalChars >= MAX_BLOCK_CHARS) break;

      const [bibleRes, latestStateRes, locTimelineRes] = await Promise.all([
        db.from('character_bibles')
          .select('bible_text,status,power_realm_index,current_location,key_relationships,last_refreshed_chapter')
          .eq('project_id', projectId).eq('character_name', charName).maybeSingle(),
        db.from('character_states')
          .select('chapter_number,status,power_level,power_realm_index,location,personality_quirks,notes')
          .eq('project_id', projectId).eq('character_name', charName)
          .lt('chapter_number', chapterNumber)
          .order('chapter_number', { ascending: false }).limit(1).maybeSingle(),
        db.from('location_timeline')
          .select('chapter_number,location,transition_type')
          .eq('project_id', projectId).eq('character_name', charName)
          .lt('chapter_number', chapterNumber)
          .order('chapter_number', { ascending: false }).limit(2),
      ]);

      const bible = bibleRes?.data;
      const latest = latestStateRes?.data;
      const locHist = locTimelineRes?.data;

      if (!bible && !latest) continue; // Skip if no data

      const block: string[] = [`\n👤 ${charName}:`];
      if (bible) {
        block.push(`  Bible (refresh ch.${bible.last_refreshed_chapter}): ${bible.status}, realm ${bible.power_realm_index ?? '?'}, @${bible.current_location ?? '?'}`);
      } else if (latest) {
        block.push(`  Snapshot ch.${latest.chapter_number}: ${latest.status}, ${latest.power_level ?? '?'} (realm ${latest.power_realm_index ?? '?'}), @${latest.location ?? '?'}`);
      }
      if (latest?.personality_quirks) block.push(`  Quirks: ${latest.personality_quirks}`);
      if (locHist && locHist.length >= 1) {
        const path = locHist.reverse().map(l => `${l.location}(ch.${l.chapter_number})`).join(' → ');
        block.push(`  Hành trình location gần: ${path}`);
      }

      const blockText = block.join('\n');
      if (totalChars + blockText.length > MAX_BLOCK_CHARS) break;
      lines.push(blockText);
      totalChars += blockText.length;
    }

    // Location lookups
    if (entities.locations.length > 0 && totalChars < MAX_BLOCK_CHARS) {
      const locsBlock: string[] = [`\n🗺️ Location đề cập trong brief:`];
      for (const loc of entities.locations) {
        const { data: lastVisits } = await db.from('location_timeline')
          .select('chapter_number,character_name,transition_type')
          .eq('project_id', projectId).eq('location', loc)
          .order('chapter_number', { ascending: false }).limit(3);
        if (lastVisits && lastVisits.length > 0) {
          const visits = lastVisits.map(v => `${v.character_name}(ch.${v.chapter_number}/${v.transition_type})`).join(', ');
          locsBlock.push(`  • ${loc}: lần cuối ${visits}`);
        } else {
          locsBlock.push(`  • ${loc}: chưa có dữ liệu — có thể là location MỚI`);
        }
      }
      const locsText = locsBlock.join('\n');
      if (totalChars + locsText.length <= MAX_BLOCK_CHARS) {
        lines.push(locsText);
      }
    }

    if (lines.length <= 1) return null;
    lines.push(`\n→ Khi planning chương này, BẮT BUỘC bám sát các trạng thái trên. Cảnh giới chỉ tăng (trừ khi narrative hợp lý). Nhân vật đã chết KHÔNG xuất hiện. Hint chưa payoff phải còn hiệu lực.`);
    return lines.join('\n');
  } catch (e) {
    console.warn('[PreWriteQA] failed:', e instanceof Error ? e.message : String(e));
    return null;
  }
}
