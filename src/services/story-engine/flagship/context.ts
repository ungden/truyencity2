export type FlagshipContextLayer = 'canon' | 'plan' | 'state';

export interface FlagshipContextBlock {
  id: string;
  layer: FlagshipContextLayer;
  priority: number;
  content: string;
  sourceRef?: string;
  required?: boolean;
}

export interface FlagshipContextManifestEntry {
  id: string;
  layer: FlagshipContextLayer;
  priority: number;
  sourceRef?: string;
  originalChars: number;
  includedChars: number;
  truncated: boolean;
}

export interface FlagshipContextBudgets {
  canon: number;
  plan: number;
  state: number;
}

export interface FlagshipContextBundle {
  text: string;
  manifest: FlagshipContextManifestEntry[];
  totalChars: number;
  budgets: FlagshipContextBudgets;
}

/**
 * Context is deliberately assembled per responsibility.  A single, shared
 * blob makes it too easy for the writer to see editor instructions (or for
 * the editor to inherit a planning prompt), and it also makes the advertised
 * layer budgets meaningless.  These are plain strings so the pipeline stays
 * independent from storage and model clients.
 */
export interface FlagshipRoleContexts {
  director: string;
  writer: string;
  editor: string;
  manifest: Array<FlagshipContextManifestEntry & { role: 'director' | 'writer' | 'editor' }>;
  totalChars: number;
}

export const FLAGSHIP_CONTEXT_BUDGETS: FlagshipContextBudgets = {
  canon: 20_000,
  plan: 16_000,
  state: 24_000,
};

/**
 * Project an approved StorySpecV2 into the causal kernel needed by Director.
 * Setup-only research, similarity diagnostics, voice prose, conflict/runway
 * duplication, and the volume spine stay in storage; ArcPlanV2 owns the live
 * planning window.  This is an explicit typed projection, never truncation.
 */
export function projectDirectorStoryKernel(spec: StorySpecV2) {
  return {
    schemaVersion: spec.schemaVersion,
    title: spec.title,
    genre: spec.genre,
    genreLane: spec.genreLane,
    serialityEngine: {
      recurringSituation: spec.serialityEngine.recurringSituation,
      variationAxes: spec.serialityEngine.variationAxes,
      escalationVectors: spec.serialityEngine.escalationVectors,
    },
    progressionCurrencies: spec.progressionCurrencies.map(currency => ({
      name: currency.name,
      kind: currency.kind,
      source: currency.source,
      spend: currency.spend,
    })),
    storyIdentity: {
      uniqueMechanism: spec.storyIdentity.uniqueMechanism,
      emotionalCore: spec.storyIdentity.emotionalCore,
      forbiddenGenericMoves: spec.storyIdentity.forbiddenGenericMoves,
    },
    pleasureProfile: spec.pleasureProfile,
    readerFantasy: spec.readerFantasy,
    premise: spec.premise,
    endingDirection: spec.endingDirection,
    protagonist: {
      name: spec.protagonist.name,
      desire: spec.protagonist.desire,
      contradiction: spec.protagonist.contradiction,
      competence: spec.protagonist.competence,
      blindSpot: spec.protagonist.blindSpot,
      privateAgenda: spec.protagonist.privateAgenda,
      leverage: spec.protagonist.leverage,
      moralBoundary: spec.protagonist.moralBoundary,
      decisionSignature: spec.protagonist.decisionSignature,
    },
    cast: spec.cast.map(member => ({
      name: member.name,
      agenda: member.agenda,
      leverage: member.leverage,
      conflictWithProtagonist: member.conflictWithProtagonist,
      moralBoundary: member.moralBoundary,
      decisionSignature: member.decisionSignature,
      firstAppearanceChapter: member.firstAppearanceChapter,
    })),
    causalWorldRules: spec.causalWorldRules.map(rule => ({
      rule: rule.rule,
      beneficiary: rule.beneficiary,
      harmedParty: rule.harmedParty,
      enforcement: rule.enforcement,
      cost: rule.cost,
      consequence: rule.consequence,
      evidenceSource: rule.evidenceSource,
      exceptions: rule.exceptions,
    })),
    resourceEconomy: spec.resourceEconomy,
    promisePayoffLedger: spec.promisePayoffLedger,
  };
}

const LAYER_ORDER: Record<FlagshipContextLayer, number> = { canon: 0, plan: 1, state: 2 };

/**
 * Required story artifacts fail closed: they are never truncated or substituted.
 * Optional retrieval notes may be trimmed after higher-priority blocks in the same layer.
 */
export function assembleFlagshipContext(
  blocks: FlagshipContextBlock[],
  budgets: FlagshipContextBudgets = FLAGSHIP_CONTEXT_BUDGETS,
): FlagshipContextBundle {
  for (const layer of Object.keys(budgets) as FlagshipContextLayer[]) {
    if (budgets[layer] < 1_000) throw new Error(`Flagship ${layer} budget must be at least 1000 chars.`);
  }

  const ordered = [...blocks].sort(
    (a, b) => LAYER_ORDER[a.layer] - LAYER_ORDER[b.layer] || b.priority - a.priority || a.id.localeCompare(b.id),
  );
  const missing = ordered.filter(block => block.required && block.content.trim().length === 0);
  if (missing.length) throw new Error(`FLAGSHIP_CONTEXT_MISSING: ${missing.map(block => block.id).join(',')}`);

  const remaining = { ...budgets };
  const chunks: string[] = [];
  const manifest: FlagshipContextManifestEntry[] = [];

  for (const block of ordered) {
    const content = block.content.trim();
    if (!content) {
      manifest.push({ id: block.id, layer: block.layer, priority: block.priority, sourceRef: block.sourceRef, originalChars: 0, includedChars: 0, truncated: false });
      continue;
    }
    const header = `[${block.layer.toUpperCase()}:${block.id}]\n`;
    const needed = header.length + content.length;
    if (block.required && needed > remaining[block.layer]) {
      throw new Error(`FLAGSHIP_CONTEXT_BUDGET_EXCEEDED: required ${block.layer}:${block.id} needs ${needed}, remaining ${remaining[block.layer]}`);
    }
    const available = Math.max(0, remaining[block.layer] - header.length);
    const included = block.required ? content : content.slice(0, available);
    if (included) {
      chunks.push(header + included);
      remaining[block.layer] -= header.length + included.length;
    }
    manifest.push({
      id: block.id,
      layer: block.layer,
      priority: block.priority,
      sourceRef: block.sourceRef,
      originalChars: content.length,
      includedChars: included.length,
      truncated: included.length < content.length,
    });
  }

  const text = chunks.join('\n\n');
  return { text, manifest, totalChars: text.length, budgets };
}

export interface FlagshipRoleContextInput {
  director: FlagshipContextBlock[];
  writer: FlagshipContextBlock[];
  editor: FlagshipContextBlock[];
}

/** Assemble all role inputs and fail closed if a required block exceeds its layer budget. */
export function assembleFlagshipRoleContexts(input: FlagshipRoleContextInput): FlagshipRoleContexts {
  const roles = (Object.keys(input) as Array<keyof FlagshipRoleContextInput>).map(role => {
    const bundle = assembleFlagshipContext(input[role]);
    return {
      role,
      bundle,
    };
  });
  return {
    director: roles.find(item => item.role === 'director')!.bundle.text,
    writer: roles.find(item => item.role === 'writer')!.bundle.text,
    editor: roles.find(item => item.role === 'editor')!.bundle.text,
    manifest: roles.flatMap(({ role, bundle }) => bundle.manifest.map(entry => ({ ...entry, role }))),
    totalChars: roles.reduce((total, item) => total + item.bundle.totalChars, 0),
  };
}
import type { StorySpecV2 } from './contracts';
