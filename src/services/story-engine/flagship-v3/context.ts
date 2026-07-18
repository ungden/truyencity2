import type { ArcPlanV3, ChapterPlanV3, StoryKernelV3, StoryStateV3 } from './contracts';

export type V3Role = 'planner' | 'writer' | 'editor' | 'revision';

export const V3_CONTEXT_BUDGETS: Record<V3Role, number> = {
  planner: 28_000,
  writer: 18_000,
  editor: 24_000,
  revision: 12_000,
};

export const V3_WRITER_BRIEF_MAX_CHARS = 5_000;
export const V3_PREVIOUS_TAIL_MAX_WORDS = 1_200;

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

function relevantResourceIds(plan: ChapterPlanV3): Set<string> {
  return new Set(plan.requiredDeltas.flatMap(delta =>
    delta.kind === 'resource_numeric' || delta.kind === 'resource_state' ? [delta.resourceId] : [],
  ));
}

function relevantPromiseIds(plan: ChapterPlanV3): Set<string> {
  return new Set(plan.requiredDeltas.flatMap(delta => delta.kind === 'promise' ? [delta.promiseId] : []));
}

function relevantWorldClaimIds(plan: ChapterPlanV3): Set<string> {
  return new Set(plan.scenes.flatMap(scene => scene.worldClaimIds));
}

function projectKernel(kernel: StoryKernelV3, plan: ChapterPlanV3) {
  const ids = relevantCharacterIds(plan);
  const worldClaimIds = relevantWorldClaimIds(plan);
  return {
    title: kernel.title,
    genre: kernel.genre,
    concept: kernel.concept,
    pleasure: kernel.pleasure,
    protagonistId: kernel.protagonistId,
    characters: kernel.characters.filter(character => ids.has(character.id) || character.id === kernel.protagonistId),
    worldClaims: kernel.worldClaims.filter(claim => worldClaimIds.has(claim.id)),
    resources: kernel.resources,
    promises: kernel.promises,
    endingContract: kernel.endingContract,
  };
}

function naturalTimeCue(minutes: number, travel = false): string {
  if (minutes === 0) return travel ? 'không có quãng di chuyển riêng' : 'nối tiếp ngay sau diễn biến trước';
  if (minutes <= 5) return 'chỉ vài phút';
  if (minutes <= 15) return 'khoảng mười phút';
  if (minutes <= 35) return 'gần nửa giờ';
  if (minutes <= 75) return 'xấp xỉ một giờ';
  if (minutes <= 180) return 'một quãng trong cùng buổi';
  if (minutes <= 360) return 'nhiều giờ trong nửa ngày';
  if (minutes <= 720) return 'phần lớn một ngày';
  if (minutes <= 1_440) return 'sang một ngày khác';
  return `sau khoảng ${Math.max(2, Math.round(minutes / 1_440))} ngày`;
}

export interface WriterBriefV3 {
  story: { title: string; genre: string; uniqueMechanism: string };
  cast: unknown[];
  worldRules: unknown[];
  scenes: unknown[];
  facts: unknown[];
  characterState: unknown[];
  resources: unknown[];
  promises: unknown[];
  requiredDeltas: unknown[];
}

function writerDelta(delta: ChapterPlanV3['requiredDeltas'][number]): unknown {
  if (delta.kind === 'promise') {
    return { id: delta.id, kind: delta.kind, promiseId: delta.promiseId, statusAfter: delta.statusAfter };
  }
  return delta;
}

/** Runtime-only projection: mechanics are authoritative, wording is deliberately absent. */
export function buildWriterBriefV3(input: {
  kernel: StoryKernelV3;
  state: StoryStateV3;
  plan: ChapterPlanV3;
}): WriterBriefV3 {
  const characterIds = relevantCharacterIds(input.plan);
  const resourceIds = relevantResourceIds(input.plan);
  const promiseIds = relevantPromiseIds(input.plan);
  const worldClaimIds = relevantWorldClaimIds(input.plan);
  const factIds = new Set([
    ...input.plan.preconditions.map(item => item.factId),
    ...input.plan.requiredDeltas.flatMap(delta => delta.kind === 'fact' || delta.kind === 'character_knowledge' ? [delta.factId] : []),
    ...input.state.characters
      .filter(character => characterIds.has(character.characterId))
      .flatMap(character => character.knowledge.map(item => item.factId)),
  ]);
  const brief: WriterBriefV3 = {
    story: {
      title: input.kernel.title,
      genre: input.kernel.genre,
      uniqueMechanism: input.kernel.concept.uniqueMechanism,
    },
    cast: input.kernel.characters
      .filter(character => characterIds.has(character.id) || character.id === input.kernel.protagonistId)
      .map(character => ({
        id: character.id,
        name: character.name,
        aliases: character.aliases,
        voice: {
          register: character.voice.register,
          sentenceRhythm: character.voice.sentenceRhythm,
          directness: character.voice.directness,
          addressRules: character.voice.addressRules,
          vocabulary: character.voice.vocabulary,
          stressResponse: character.voice.stressResponse,
          avoidances: character.voice.avoidances,
        },
      })),
    worldRules: input.kernel.worldClaims
      .filter(claim => worldClaimIds.has(claim.id))
      .map(claim => ({ id: claim.id, claim: claim.claim, exceptions: claim.exceptions })),
    scenes: input.plan.scenes.map(scene => ({
      sceneId: scene.id,
      povCharacterId: scene.povCharacterId,
      participantIds: scene.participantIds,
      locationId: scene.locationId,
      durationCue: naturalTimeCue(scene.durationMinutes),
      travelCueFromPrevious: naturalTimeCue(scene.travelMinutesFromPrevious, true),
      objective: scene.objective,
      obstacle: scene.obstacle,
      action: scene.action,
      worldClaimIds: scene.worldClaimIds,
      requiredDeltaIds: scene.requiredDeltaIds,
      hookIntent: scene.hookIntent,
    })),
    facts: input.state.facts.filter(fact => factIds.has(fact.id)).map(fact => ({ id: fact.id, value: fact.value })),
    characterState: input.state.characters
      .filter(character => characterIds.has(character.characterId))
      .map(character => ({
        characterId: character.characterId,
        locationId: character.locationId,
        relationshipState: character.relationshipState,
        knownFactIds: character.knowledge.map(item => item.factId),
      })),
    resources: input.state.resources
      .filter(resource => resourceIds.has(resource.resourceId))
      .map(resource => ({
        resourceId: resource.resourceId,
        name: input.kernel.resources.find(item => item.id === resource.resourceId)?.name,
        currentValue: resource.value,
      })),
    promises: input.kernel.promises
      .filter(promise => promiseIds.has(promise.id))
      .map(promise => ({ id: promise.id, description: promise.description })),
    requiredDeltas: input.plan.requiredDeltas.map(writerDelta),
  };
  const chars = JSON.stringify(brief).length;
  if (chars > V3_WRITER_BRIEF_MAX_CHARS) {
    throw new Error(`FLAGSHIP_V3_WRITER_BRIEF_BUDGET_EXCEEDED: needs ${chars}, budget ${V3_WRITER_BRIEF_MAX_CHARS}`);
  }
  return brief;
}

export function selectPreviousChapterTailV3(content: string, maxWords = V3_PREVIOUS_TAIL_MAX_WORDS): string {
  const matches = [...content.matchAll(/\S+/gu)];
  if (matches.length <= maxWords) return content.trim();
  return content.slice(matches[matches.length - maxWords].index).trim();
}

function projectEditorKernel(kernel: StoryKernelV3, plan: ChapterPlanV3) {
  const projected = projectKernel(kernel, plan);
  const resourceIds = relevantResourceIds(plan);
  const promiseIds = relevantPromiseIds(plan);
  return {
    ...projected,
    resources: projected.resources.filter(resource => resourceIds.has(resource.id)),
    promises: projected.promises.filter(promise => promiseIds.has(promise.id)),
  };
}

function projectState(
  state: StoryStateV3,
  plan: ChapterPlanV3,
  timelineLimit = 8,
) {
  const characterIds = relevantCharacterIds(plan);
  const resourceIds = relevantResourceIds(plan);
  const promiseIds = relevantPromiseIds(plan);
  const factIds = new Set([
    ...plan.preconditions.map(item => item.factId),
    ...plan.requiredDeltas.flatMap(delta => delta.kind === 'fact' || delta.kind === 'character_knowledge' ? [delta.factId] : []),
  ]);
  return {
    chapterNumber: state.chapterNumber,
    facts: state.facts.filter(fact => factIds.has(fact.id)),
    timeline: state.timeline.slice(-timelineLimit),
    characters: state.characters.filter(character => characterIds.has(character.characterId)),
    resources: state.resources.filter(resource => resourceIds.has(resource.resourceId)),
    promises: state.promises.filter(promise => promiseIds.has(promise.promiseId)),
  };
}

export function buildV3RoleContexts(input: {
  kernel: StoryKernelV3;
  arc: ArcPlanV3;
  state: StoryStateV3;
  plan: ChapterPlanV3;
  previousChapterTail?: string;
}): V3RoleContexts {
  const editorKernel = projectEditorKernel(input.kernel, input.plan);
  const editorState = projectState(input.state, input.plan, 5);
  const writerBrief = buildWriterBriefV3(input);
  const previousTail = input.previousChapterTail
    ? selectPreviousChapterTailV3(input.previousChapterTail)
    : '';
  const writer = assemble('writer', [
      { id: 'WRITER_BRIEF_V3', sourceRef: `runtime_projection:${input.plan.chapterNumber}`, value: writerBrief },
      ...(previousTail ? [{
        id: 'PREVIOUS_CHAPTER_TAIL',
        sourceRef: `chapters:${input.plan.chapterNumber - 1}:published_tail`,
        value: previousTail,
      }] : []),
    ]);
  const editor = assemble('editor', [
      { id: 'STORY_KERNEL_V3', sourceRef: 'ai_story_projects.story_kernel_v3:editor_projection', value: editorKernel },
      { id: 'CHAPTER_PLAN_V3', sourceRef: `chapter_blueprints:${input.plan.chapterNumber}`, value: input.plan },
      { id: 'RELEVANT_STATE_V3', sourceRef: 'ai_story_projects.story_state_v3:editor_projection', value: editorState },
    ]);
  let revisionContext: V3RoleContext | null = null;
  const revision = (): V3RoleContext => {
    if (!revisionContext) {
      revisionContext = assemble('revision', [
        {
          id: 'WRITER_BRIEF_V3',
          sourceRef: `runtime_projection:${input.plan.chapterNumber}:revision`,
          value: writerBrief,
        },
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
