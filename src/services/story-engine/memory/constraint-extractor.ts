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
  private projectId?: string;

  constructor(projectId?: string) {
    this.projectId = projectId;
  }

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

  /**
   * Format constraints into a prompt section.
   */
  static formatForPrompt(constraints: WorldConstraint[]): string {
    if (constraints.length === 0) return '';

    const hard = constraints.filter(c => c.immutable);
    const soft = constraints.filter(c => !c.immutable);

    const parts: string[] = [];

    if (hard.length > 0) {
      parts.push('## RÀNG BUỘC CỨNG (TUYỆT ĐỐI KHÔNG ĐƯỢC VI PHẠM):');
      for (const c of hard) parts.push(`- ${c.context}`);
    }

    if (soft.length > 0) {
      parts.push('## TRẠNG THÁI HIỆN TẠI (có thể thay đổi nếu có lý do trong plot):');
      for (const c of soft) parts.push(`- ${c.context}`);
    }

    return '\n' + parts.join('\n') + '\n';
  }
}

// Factory function
export function getConstraintExtractor(projectId?: string): ConstraintExtractor {
  return new ConstraintExtractor(projectId);
}
