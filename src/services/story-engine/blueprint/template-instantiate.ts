/**
 * Template instantiation — turn a placeholder-laced NovelBlueprint into a
 * concrete novel-specific blueprint by string-replacing `{{PLACEHOLDER}}`
 * tokens with novel-specific values.
 *
 * Use case: 13+ genres × 200-1000 novels each. Writing 1000-chapter
 * blueprint per novel = impossible. Instead: 1-3 master templates per
 * genre archetype, instantiated for each novel with novel-specific MC
 * name + world + items.
 *
 * Workflow:
 *   1. Author template file: `blueprints/_templates/<id>/index.ts`
 *      exports `BLUEPRINT_TEMPLATE` with `{{TOKEN}}` placeholders + a
 *      `RequiredVars` interface listing variables novels must supply.
 *   2. Author per-novel binding: `blueprints/<novel-slug>/index.ts`
 *      imports template + provides binding map → calls
 *      `instantiateTemplate()` to produce concrete NovelBlueprint.
 *   3. Sync via `scripts/sync-blueprint.ts` (no change needed — sync
 *      sees concrete NovelBlueprint).
 *
 * Validation: instantiate fails-fast if any required variable missing,
 * any extra placeholder leaks through, or unknown placeholder used.
 */

import type {
  NovelBlueprint,
  ArcBlueprint,
  ArcSkeleton,
  ChapterBrief,
  ItemLedgerEntry,
} from './types';

export interface TemplateBlueprint extends Omit<NovelBlueprint, 'id' | 'title' | 'slug'> {
  /** Template identifier, e.g. 'tien-hiep-returning-expert'. */
  templateId: string;
  /** Required variable names this template expects (without {{}}). */
  requiredVars: string[];
  /** Optional variable names with default fallback. */
  optionalVars?: Record<string, string>;
  /** Description of template archetype + when to use. */
  description: string;
  /** Brief recommendations for filling each required var. */
  varGuidance?: Record<string, string>;
}

export interface InstantiateInput {
  /** Stable identifier for the resulting novel (becomes blueprint.id). */
  novelId: string;
  /** Title of the resulting novel. */
  title: string;
  /** Slug for the resulting novel. */
  slug: string;
  /** Variable values for placeholder replacement. */
  vars: Record<string, string>;
}

/**
 * Walk an object/array/string and replace all {{TOKEN}} placeholders with
 * vars[TOKEN] (or throw if missing & not in optionalVars). Returns deep
 * clone — does not mutate input.
 */
function replaceTokens<T>(value: T, vars: Record<string, string>, missing: Set<string>): T {
  if (typeof value === 'string') {
    return value.replace(/\{\{([A-Z_][A-Z0-9_]*)\}\}/g, (full, token) => {
      const replacement = vars[token];
      if (replacement === undefined) {
        missing.add(token);
        return full; // leave as-is; missing reported below
      }
      return replacement;
    }) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => replaceTokens(v, vars, missing)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = replaceTokens(v, vars, missing);
    }
    return out as unknown as T;
  }
  return value;
}

/**
 * Instantiate a TemplateBlueprint into a concrete NovelBlueprint.
 *
 * @throws Error if requiredVars missing, or any placeholder leaks through.
 */
export function instantiateTemplate(
  template: TemplateBlueprint,
  input: InstantiateInput,
): NovelBlueprint {
  // Merge optional defaults with provided vars (provided wins).
  const vars: Record<string, string> = { ...(template.optionalVars || {}), ...input.vars };

  // Validate required vars present.
  const missingRequired = template.requiredVars.filter((v) => vars[v] === undefined || vars[v] === '');
  if (missingRequired.length > 0) {
    throw new Error(
      `Template ${template.templateId} requires vars: ${missingRequired.join(', ')}. Provide via input.vars.`,
    );
  }

  // Validate vars keys don't have unknown ones (catches typos).
  const allowed = new Set([...template.requiredVars, ...Object.keys(template.optionalVars || {})]);
  const extra = Object.keys(input.vars).filter((k) => !allowed.has(k));
  if (extra.length > 0) {
    throw new Error(
      `Template ${template.templateId} got unknown vars: ${extra.join(', ')}. Allowed: ${[...allowed].join(', ')}`,
    );
  }

  const missing = new Set<string>();
  const arcs: ArcBlueprint[] = template.arcs.map((arcBp) => ({
    arc: replaceTokens<ArcSkeleton>(arcBp.arc, vars, missing),
    briefs: arcBp.briefs.map((b) => replaceTokens<ChapterBrief>(b, vars, missing)),
  }));
  const itemLedger = (template.itemLedger || []).map((i) => replaceTokens<ItemLedgerEntry>(i, vars, missing));
  const extraBannedPatterns = (template.extraBannedPatterns || []).map((s) => replaceTokens(s, vars, missing));
  const extraForbiddenTerms = (template.extraForbiddenTerms || []).map((s) => replaceTokens(s, vars, missing));
  const toneDirectives = (template.toneDirectives || []).map((s) => replaceTokens(s, vars, missing));
  const cosmicTierPatterns = (template.cosmicTierPatterns || []).map((s) => replaceTokens(s, vars, missing));

  if (missing.size > 0) {
    throw new Error(
      `Template ${template.templateId} has placeholders with no replacement: ${[...missing].join(', ')}. ` +
      `Add to requiredVars or optionalVars in template, or add to input.vars.`,
    );
  }

  return {
    id: input.novelId,
    title: input.title,
    slug: input.slug,
    genre: template.genre,
    totalChapters: template.totalChapters,
    arcs,
    extraBannedPatterns,
    extraForbiddenTerms,
    toneDirectives,
    itemLedger,
    cosmicArcStartChapter: template.cosmicArcStartChapter,
    cosmicTierPatterns: cosmicTierPatterns.length > 0 ? cosmicTierPatterns : undefined,
  };
}

/**
 * List all unique placeholder tokens used inside a template (utility for
 * sanity checks + auto-deriving requiredVars from authored content).
 */
export function findUsedPlaceholders(template: TemplateBlueprint): string[] {
  const found = new Set<string>();
  const walk = (v: unknown) => {
    if (typeof v === 'string') {
      const m = v.matchAll(/\{\{([A-Z_][A-Z0-9_]*)\}\}/g);
      for (const x of m) found.add(x[1]);
    } else if (Array.isArray(v)) {
      v.forEach(walk);
    } else if (v && typeof v === 'object') {
      Object.values(v as Record<string, unknown>).forEach(walk);
    }
  };
  walk(template);
  return [...found].sort();
}
