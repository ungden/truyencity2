/**
 * Story Engine v2 — Constraint Extractor
 *
 * Ported from v1 constraint-extractor.ts
 * Extracts and enforces world constraints per project.
 */

import { getSupabase } from '../utils/supabase';
import type { WorldConstraint } from '../types';

export interface ExtractionResult {
  constraints: WorldConstraint[];
  extractionTokens: number;
}

export class ConstraintExtractor {
  constructor() {}

  /**
   * Get constraints relevant to the current chapter context.
   */
  async getRelevantConstraints(
    projectId: string,
    keywords: string[],
    maxCount = 30,
  ): Promise<WorldConstraint[]> {
    const db = getSupabase();

    // 1) Always load immutable constraints
    const { data: globals } = await db
      .from('world_constraints')
      .select('*')
      .eq('project_id', projectId)
      .eq('immutable', true)
      .limit(20);

    // 2) Load constraints matching any keyword
    let specifics: WorldConstraint[] = [];
    if (keywords.length > 0) {
      const conditions = keywords
        .filter(k => k && k.length > 1)
        .flatMap(k => [`subject.ilike.%${k}%`, `context.ilike.%${k}%`]);

      if (conditions.length > 0) {
        const { data } = await db
          .from('world_constraints')
          .select('*')
          .eq('project_id', projectId)
          .or(conditions.join(','))
          .limit(maxCount);
        specifics = (data || []) as WorldConstraint[];
      }
    }

    // 3) Merge and deduplicate
    const merged = new Map<string, WorldConstraint>();
    for (const c of [...(globals || []), ...specifics]) {
      merged.set(c.id, c);
    }

    return Array.from(merged.values()).slice(0, maxCount);
  }
}

// Factory function
export function getConstraintExtractor(): ConstraintExtractor {
  return new ConstraintExtractor();
}
