/**
 * Story Writing Factory - Constraint Extractor
 *
 * Generic constraint extraction from ANY World Bible / Blueprint.
 * Works across all genres: tiên hiệp, đô thị, sci-fi, ngôn tình, etc.
 *
 * Extracts hard facts (numbers, limits, rules) that must NEVER be contradicted.
 * Does NOT assume any specific world structure - adapts to whatever the Bible contains.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AIProviderService } from '../ai-provider';
import { WorldConstraint } from './types';
import { logger } from '@/lib/security/logger';

let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

export interface ExtractionResult {
  constraints: WorldConstraint[];
  extractionTokens: number;
}

export class ConstraintExtractor {
  private aiService: AIProviderService;
  private projectId?: string;

  constructor(projectId?: string, aiService?: AIProviderService) {
    this.projectId = projectId;
    this.aiService = aiService || new AIProviderService({
      gemini: process.env.GEMINI_API_KEY,
    });
  }

  // ========================================================================
  // EXTRACT: one-time call after World Bible is generated
  // ========================================================================

  async extract(worldBible: unknown, blueprintId?: string): Promise<ExtractionResult> {
    const bibleText = typeof worldBible === 'string'
      ? worldBible
      : JSON.stringify(worldBible, null, 2);

    // Genre-agnostic prompt — lets AI decide mutability per fact
    const prompt = `Analyze the following World Bible and extract concrete facts.

For EACH fact, you must decide: is this IMMUTABLE (cannot ever change in the story)
or MUTABLE (could change through plot events)?

IMMUTABLE examples (structural truths of the world):
- Power system tier names and their ORDER (e.g. rank 1 < rank 2 < rank 3)
- Laws of nature / magic that define how this world works
- Geography that won't change (continents, cardinal directions)
- Historical events that already happened before the story begins

MUTABLE examples (can change through story events):
- Number of members in an organization (people die, join, leave)
- Who leads a faction (leaders can be overthrown)
- Alliances between factions (can shift)
- A character's current status, wealth, possessions
- Social rules / taboos (can be broken as a plot twist)

The key distinction: if violating this fact would be a PLOT HOLE → immutable.
If violating it could be a PLOT TWIST → mutable.

DO NOT extract: opinions, personality traits, vague descriptions, future plans.

Categories:
- quantity: a number tied to something
- hierarchy: rank/tier order or chain of command
- rule: a law of this world (physics, magic, social)
- geography: spatial relationships between places
- character_limit: hard cap on what characters can do/be
- power_cap: maximum level / ceiling of power system

World Bible:
\`\`\`
${bibleText.substring(0, 10000)}
\`\`\`

Return a JSON array. Each element:
{
  "category": "quantity|hierarchy|rule|geography|character_limit|power_cap",
  "subject": "entity name (use SAME LANGUAGE as the Bible)",
  "predicate": "property_name (snake_case)",
  "value": <number or string>,
  "context": "one sentence — SAME LANGUAGE as the World Bible",
  "immutable": true or false
}

Return ONLY the JSON array.`;

    try {
      const response = await this.aiService.chat({
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        messages: [
          {
            role: 'system',
            content: 'You extract structured facts from world-building documents. Output only valid JSON arrays.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        maxTokens: 4096,
      });

      if (!response.success || !response.content) {
        throw new Error(response.error || 'Empty AI response');
      }

      const raw = this.parseConstraints(response.content);
      const unique = this.dedupConstraints(raw);
      const validated = this.validateConstraints(unique);

      if (validated.length > 0) {
        await this.saveConstraints(validated, blueprintId);
      }

      logger.info('Constraints extracted', {
        projectId: this.projectId,
        blueprintId,
        count: validated.length,
        categories: [...new Set(validated.map(c => c.category))],
      });

      return {
        constraints: validated,
        extractionTokens: response.usage?.totalTokens || 0,
      };
    } catch (error) {
      logger.error(`Constraint extraction failed: ${error instanceof Error ? error.message : String(error)}`);
      return { constraints: [], extractionTokens: 0 };
    }
  }

  // ========================================================================
  // QUERY: get relevant constraints for a specific chapter context
  // ========================================================================

  /**
   * Load constraints relevant to the current chapter.
   *
   * keywords: character names, location names, faction names, any terms
   *           that appear in the chapter outline. We match against BOTH
   *           subject AND context columns so a constraint about "Hắc Phong Trại"
   *           is found whether the keyword is the faction name or a character in it.
   *
   * Also always includes all `immutable=true` global rules (up to a budget).
   */
  async getRelevantConstraints(
    projectId: string,
    keywords: string[],
    maxCount = 30,
  ): Promise<WorldConstraint[]> {
    const supabase = getSupabase();

    // 1) Always load immutable constraints (these are non-negotiable)
    const { data: globals } = await supabase
      .from('world_constraints')
      .select('*')
      .eq('project_id', projectId)
      .eq('immutable', true)
      .limit(20);

    // 2) Load constraints matching any keyword in subject OR context
    let specifics: WorldConstraint[] = [];
    if (keywords.length > 0) {
      // Build OR condition matching keywords against subject and context
      const conditions = keywords
        .filter(k => k && k.length > 1)
        .flatMap(k => [`subject.ilike.%${k}%`, `context.ilike.%${k}%`]);

      if (conditions.length > 0) {
        const { data } = await supabase
          .from('world_constraints')
          .select('*')
          .eq('project_id', projectId)
          .or(conditions.join(','))
          .limit(maxCount);
        specifics = data || [];
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
   * Hard constraints = must never violate.
   * Soft constraints = can change, but only with explicit plot justification.
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

  // ========================================================================
  // INTERNALS
  // ========================================================================

  private parseConstraints(content: string): WorldConstraint[] {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    let jsonStr = jsonMatch[0];
    jsonStr = jsonStr.replace(/\/\/.*$/gm, '').replace(/,\s*([}\]])/g, '$1');

    try {
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private dedupConstraints(constraints: WorldConstraint[]): WorldConstraint[] {
    const seen = new Map<string, WorldConstraint>();
    for (const c of constraints) {
      const key = `${c.subject}::${c.predicate}`.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, c);
      }
    }
    return Array.from(seen.values());
  }

  private validateConstraints(constraints: WorldConstraint[]): WorldConstraint[] {
    const validCategories = new Set(['quantity', 'hierarchy', 'rule', 'geography', 'character_limit', 'power_cap']);
    const valid: WorldConstraint[] = [];

    for (const c of constraints) {
      if (!c.subject || !c.predicate || c.value === undefined || !c.context) continue;
      if (!validCategories.has(c.category)) c.category = 'rule';
      c.id = `wc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      // Respect AI's judgment — default to true only if not explicitly set
      if (c.immutable === undefined) c.immutable = true;
      valid.push(c);
    }
    return valid;
  }

  private async saveConstraints(constraints: WorldConstraint[], blueprintId?: string): Promise<void> {
    const supabase = getSupabase();

    // Clean rows: only DB columns, no extra fields
    const rows = constraints.map(c => ({
      project_id: this.projectId || null,
      blueprint_id: blueprintId || null,
      category: c.category,
      subject: c.subject,
      predicate: c.predicate,
      value: String(c.value),
      context: c.context,
      immutable: c.immutable,
    }));

    const { error } = await supabase
      .from('world_constraints')
      .upsert(rows, { onConflict: 'project_id,subject,predicate' });

    if (error) {
      logger.error(`Failed to save constraints: ${error.message}`);
    }
  }
}

// Factory function (new instance per project to avoid cross-contamination)
export function getConstraintExtractor(projectId?: string): ConstraintExtractor {
  return new ConstraintExtractor(projectId);
}
