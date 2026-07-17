import type { ArcPlanV3, ChapterPlanV3, StoryKernelV3, StoryStateV3 } from './contracts';

export type V3Role = 'planner' | 'writer' | 'editor' | 'revision';

export const V3_CONTEXT_BUDGETS: Record<V3Role, number> = {
  planner: 28_000,
  writer: 26_000,
  editor: 24_000,
  revision: 20_000,
};

export interface V3ContextManifestEntry {
  role: V3Role;
  id: string;
  sourceRef: string;
  chars: number;
  required: boolean;
}

export interface V3RoleContext {
  role: V3Role;
  text: string;
  chars: number;
  budget: number;
  manifest: V3ContextManifestEntry[];
}

export interface V3RoleContexts {
  writer: V3RoleContext;
  editor: V3RoleContext;
  revision: () => V3RoleContext;
  used: () => V3RoleContext[];
}

type Block = { id: string; sourceRef: string; value: unknown; required?: boolean };

function assemble(role: V3Role, blocks: Block[]): V3RoleContext {
  const chunks: string[] = [];
  const manifest: V3ContextManifestEntry[] = [];
  for (const block of blocks) {
    const content = JSON.stringify(block.value);
    const chunk = `[${block.id}]\n${content}`;
    chunks.push(chunk);
    manifest.push({
      role,
      id: block.id,
      sourceRef: block.sourceRef,
      chars: chunk.length,
      required: block.required !== false,
    });
  }
  const text = chunks.join('\n\n');
  const budget = V3_CONTEXT_BUDGETS[role];
  if (text.length > budget) {
    throw new Error(`FLAGSHIP_V3_CONTEXT_BUDGET_EXCEEDED: ${role} needs ${text.length}, budget ${budget}`);
  }
  return { role, text, chars: text.length, budget, manifest };
}

function relevantCharacterIds(plan: ChapterPlanV3): Set<string> {
  return new Set([
    ...plan.scenes.flatMap(scene => scene.participantIds),
    ...plan.requiredDeltas.flatMap(delta => 'characterId' in delta ? [delta.characterId] : []),
  ]);
}

function projectKernel(kernel: StoryKernelV3, plan: ChapterPlanV3) {
  const ids = relevantCharacterIds(plan);
  return {
    title: kernel.title,
    genre: kernel.genre,
    concept: kernel.concept,
    pleasure: kernel.pleasure,
    protagonistId: kernel.protagonistId,
    characters: kernel.characters.filter(character => ids.has(character.id) || character.id === kernel.protagonistId),
    worldClaims: kernel.worldClaims,
    resources: kernel.resources,
    promises: kernel.promises,
    endingContract: kernel.endingContract,
  };
}

function projectRevisionKernel(kernel: StoryKernelV3, plan: ChapterPlanV3) {
  const characterIds = relevantCharacterIds(plan);
  const resourceIds = new Set(plan.requiredDeltas.flatMap(delta =>
    delta.kind === 'resource_numeric' || delta.kind === 'resource_state' ? [delta.resourceId] : [],
  ));
  const promiseIds = new Set(plan.requiredDeltas.flatMap(delta => delta.kind === 'promise' ? [delta.promiseId] : []));
  return {
    title: kernel.title,
    genre: kernel.genre,
    protagonistId: kernel.protagonistId,
    pleasure: kernel.pleasure,
    characters: kernel.characters
      .filter(character => characterIds.has(character.id) || character.id === kernel.protagonistId)
      .map(character => ({
        id: character.id,
        name: character.name,
        aliases: character.aliases,
        agenda: character.agenda,
        constraint: character.constraint,
        moralBoundary: character.moralBoundary,
        decisionSignature: character.decisionSignature,
        voice: character.voice,
      })),
    worldClaims: kernel.worldClaims,
    resources: kernel.resources.filter(resource => resourceIds.has(resource.id)),
    promises: kernel.promises.filter(promise => promiseIds.has(promise.id)),
  };
}

function projectState(state: StoryStateV3, plan: ChapterPlanV3) {
  const characterIds = relevantCharacterIds(plan);
  const resourceIds = new Set(plan.requiredDeltas.flatMap(delta =>
    delta.kind === 'resource_numeric' || delta.kind === 'resource_state' ? [delta.resourceId] : [],
  ));
  const promiseIds = new Set(plan.requiredDeltas.flatMap(delta => delta.kind === 'promise' ? [delta.promiseId] : []));
  const factIds = new Set([
    ...plan.preconditions.map(item => item.factId),
    ...plan.requiredDeltas.flatMap(delta => delta.kind === 'fact' || delta.kind === 'character_knowledge' ? [delta.factId] : []),
  ]);
  return {
    chapterNumber: state.chapterNumber,
    facts: state.facts.filter(fact => factIds.has(fact.id)),
    timeline: state.timeline.slice(-8),
    characters: state.characters.filter(character => characterIds.has(character.characterId)),
    resources: state.resources.filter(resource => resourceIds.has(resource.resourceId)),
    promises: state.promises.filter(promise => promiseIds.has(promise.promiseId)),
    recentSummary: state.recentSummary,
    previousEnding: state.previousEnding,
    retrievalNotes: state.retrievalNotes.slice(-4),
  };
}

export function buildV3RoleContexts(input: {
  kernel: StoryKernelV3;
  arc: ArcPlanV3;
  state: StoryStateV3;
  plan: ChapterPlanV3;
}): V3RoleContexts {
  const kernel = projectKernel(input.kernel, input.plan);
  const state = projectState(input.state, input.plan);
  const writer = assemble('writer', [
      { id: 'STORY_KERNEL_V3', sourceRef: 'ai_story_projects.story_kernel_v3:writer_projection', value: kernel },
      { id: 'CHAPTER_PLAN_V3', sourceRef: `chapter_blueprints:${input.plan.chapterNumber}`, value: input.plan },
      { id: 'RELEVANT_STATE_V3', sourceRef: 'ai_story_projects.story_state_v3:writer_projection', value: state },
    ]);
  const editor = assemble('editor', [
      { id: 'STORY_KERNEL_V3', sourceRef: 'ai_story_projects.story_kernel_v3:editor_projection', value: kernel },
      { id: 'CHAPTER_PLAN_V3', sourceRef: `chapter_blueprints:${input.plan.chapterNumber}`, value: input.plan },
      { id: 'RELEVANT_STATE_V3', sourceRef: 'ai_story_projects.story_state_v3:editor_projection', value: state },
    ]);
  let revisionContext: V3RoleContext | null = null;
  const revision = (): V3RoleContext => {
    if (!revisionContext) {
      revisionContext = assemble('revision', [
        {
          id: 'STORY_KERNEL_V3',
          sourceRef: 'ai_story_projects.story_kernel_v3:revision_projection',
          value: projectRevisionKernel(input.kernel, input.plan),
        },
        { id: 'CHAPTER_PLAN_V3', sourceRef: `chapter_blueprints:${input.plan.chapterNumber}`, value: input.plan },
        { id: 'RELEVANT_STATE_V3', sourceRef: 'ai_story_projects.story_state_v3:revision_projection', value: state },
      ]);
    }
    return revisionContext;
  };
  return {
    writer,
    editor,
    revision,
    used: () => revisionContext ? [writer, editor, revisionContext] : [writer, editor],
  };
}

export function buildV3PlannerContext(input: {
  kernel: StoryKernelV3;
  arc: ArcPlanV3;
  state: StoryStateV3;
  ledgerMemory?: unknown;
}): V3RoleContext {
  return assemble('planner', [
    { id: 'STORY_KERNEL_V3', sourceRef: 'ai_story_projects.story_kernel_v3', value: input.kernel },
    { id: 'ARC_PLAN_V3', sourceRef: 'ai_story_projects.arc_plan_v3', value: input.arc },
    { id: 'STORY_STATE_V3', sourceRef: 'ai_story_projects.story_state_v3', value: input.state },
    ...(input.ledgerMemory ? [{ id: 'LONG_TERM_LEDGER_V3', sourceRef: 'story_fact_ledger_v3+story_knowledge_ledger_v3', value: input.ledgerMemory }] : []),
  ]);
}
