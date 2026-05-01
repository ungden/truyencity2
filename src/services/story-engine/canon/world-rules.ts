/**
 * Story Engine v2 — World Rules Indexer (canon layer)
 *
 * Extracts and indexes world rules (cultivation laws, geographic facts, taboos,
 * historical truths) from chapter content. The index is queried during writing
 * to remind Architect/Writer of established rules so they don't contradict.
 *
 * Phase 27 split: extracted from memory/plot-tracker.ts (was 4-in-1 file).
 *
 * Note: this is a deterministic regex-based extractor. The Phase 26+ vision
 * is a richer canon/worldbuilding.ts and canon/power-system.ts that hold
 * comprehensive bibles. This module remains as the FALLBACK rule indexer for
 * rules that emerge organically during writing.
 */

import { getSupabase } from '../utils/supabase';

// ── Types ────────────────────────────────────────────────────────────────────

interface WorldRule {
  id: string;
  ruleText: string;
  category: string;
  tags: string[];
  importance: number;
  usageCount: number;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Suggest relevant world rules for a chapter based on characters, context, and location.
 * Returns formatted [QUY TẮC THẾ GIỚI ...] block or null.
 */
export async function buildRuleContext(
  projectId: string,
  chapterNumber: number,
  contextSnippet: string,
  characters: string[],
  location?: string,
): Promise<string | null> {
  void chapterNumber;
  try {
    const db = getSupabase();
    const { data } = await db
      .from('world_rules_index')
      .select('id,rule_text,category,tags,importance,usage_count')
      .eq('project_id', projectId)
      .order('importance', { ascending: false })
      .limit(50);

    if (!data || data.length === 0) return null;

    const rules: WorldRule[] = data.map(r => ({
      id: r.id,
      ruleText: r.rule_text,
      category: r.category,
      tags: r.tags || [],
      importance: r.importance || 50,
      usageCount: r.usage_count || 0,
    }));

    const searchTags: string[] = [];
    for (const c of characters) searchTags.push(`character=${c}`);
    if (location) searchTags.push(`location=${location}`);

    const scored = rules.map(rule => {
      let score = 0;

      for (const tag of searchTags) {
        if (rule.tags.includes(tag)) score += 40;
      }

      const keywords = contextSnippet
        .split(/\s+/)
        .filter(w => w.length > 3)
        .slice(0, 10);
      const matched = keywords.filter(k => rule.ruleText.toLowerCase().includes(k.toLowerCase()));
      if (keywords.length > 0) {
        score += (matched.length / keywords.length) * 20;
      }

      score += (rule.importance / 100) * 10;

      return { rule, score };
    });

    // 2026-04-29 fix: previous logic returned null when no rule scored ≥20. Now always
    // surface top 8: relevance-scored matches first, then importance-ordered fallbacks.
    const matched = scored
      .filter(s => s.score >= 15)
      .sort((a, b) => b.score - a.score);

    const matchedIds = new Set(matched.map(s => s.rule.id));
    const fallback = rules
      .filter(r => !matchedIds.has(r.id))
      .sort((a, b) => b.importance - a.importance);

    const top: WorldRule[] = [
      ...matched.slice(0, 5).map(s => s.rule),
      ...fallback.slice(0, 8 - Math.min(matched.length, 5)),
    ];

    if (top.length === 0) return null;

    const lines: string[] = ['[QUY TẮC THẾ GIỚI ĐÃ THIẾT LẬP — TUYỆT ĐỐI KHÔNG VI PHẠM]'];
    for (const rule of top) {
      lines.push(`• [${rule.category}] ${rule.ruleText.slice(0, 240)}`);
    }

    return lines.join('\n');
  } catch {
    return null;
  }
}

/**
 * Extract world rules from chapter content using Vietnamese patterns.
 * Runs post-write to catch rules introduced organically (vd "cảnh giới X có Y").
 */
export async function extractRulesFromChapter(
  projectId: string,
  chapterNumber: number,
  content: string,
): Promise<void> {
  try {
    const patterns: Array<{ re: RegExp; category: string }> = [
      { re: /cảnh giới\s+(.{10,80})\s+có\s+(.{10,120})/g, category: 'power_system' },
      { re: /([A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬ][a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệ]+(?:\s+[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬ][a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệ]+)*)\s+là\s+(.{10,120})/g, category: 'geography' },
      { re: /luật lệ\s+(.{5,60})\s+quy định\s+(.{10,120})/g, category: 'restrictions' },
      { re: /truyền thuyết\s+kể rằng\s+(.{20,200})/g, category: 'history' },
    ];

    const db = getSupabase();
    const rows: Array<Record<string, unknown>> = [];

    for (const { re, category } of patterns) {
      let match: RegExpExecArray | null;
      const regex = new RegExp(re.source, re.flags);
      while ((match = regex.exec(content)) !== null) {
        const ruleText = match[0].slice(0, 300);

        const tags = [category];
        const caps = ruleText.match(/[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬ][a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệ]+(?:\s+[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬ][a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệ]+)*/g);
        if (caps) tags.push(...caps.slice(0, 3));

        rows.push({
          id: crypto.randomUUID(),
          project_id: projectId,
          rule_text: ruleText,
          category,
          tags,
          introduced_chapter: chapterNumber,
          importance: 60,
          usage_count: 0,
        });
      }
    }

    if (rows.length > 0) {
      await db.from('world_rules_index').insert(rows);
    }
  } catch {
    // Non-fatal
  }
}
