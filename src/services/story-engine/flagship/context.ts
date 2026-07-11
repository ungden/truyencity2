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

export const FLAGSHIP_CONTEXT_BUDGETS: FlagshipContextBudgets = {
  canon: 20_000,
  plan: 16_000,
  state: 24_000,
};

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
