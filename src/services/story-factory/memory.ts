import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ChapterOutcomeSchema,
  type ArcPlan,
  type ChapterOutcome,
  type ChapterPlan,
  type StoryKernel,
  type StoryState,
} from './contracts';

export interface RelevantStoryMemory {
  outcome: ChapterOutcome;
  relatedEntityIds: string[];
}

export interface RelevantStoryTransition {
  chapterNumber: number;
  deltaId: string;
  kind: string;
  entityId: string;
  before: unknown;
  after: unknown;
  source: string | null;
  relatedEntityIds: string[];
}

export interface ContinuityPacket {
  recentOutcomes: RelevantStoryMemory[];
  firstAndLastRelationships: RelevantStoryTransition[];
  latestEntityTransitions: RelevantStoryTransition[];
  promiseOriginsAndProgress: RelevantStoryTransition[];
  recentMechanicUses: RelevantStoryTransition[];
}

type EventRow = {
  chapter_number: number;
  delta_id: string;
  kind: string;
  entity_id: string;
  before_value: unknown;
  after_value: unknown;
  source: string | null;
  related_entity_ids: unknown;
};

export interface ContinuityEvent {
  chapterNumber: number;
  deltaId: string;
  kind: string;
  entityId: string;
  before: unknown;
  after: unknown;
  source: string | null;
  relatedEntityIds: string[];
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function transition(row: EventRow): RelevantStoryTransition {
  return {
    chapterNumber: row.chapter_number,
    deltaId: row.delta_id,
    kind: row.kind,
    entityId: row.entity_id,
    before: row.before_value,
    after: row.after_value,
    source: row.source ?? null,
    relatedEntityIds: Array.isArray(row.related_entity_ids)
      ? row.related_entity_ids.filter((id: unknown): id is string => typeof id === 'string')
      : [],
  };
}

function identity(event: RelevantStoryTransition): string {
  return `${event.kind}:${event.entityId}:${event.chapterNumber}:${event.deltaId}`;
}

function dedupe(events: RelevantStoryTransition[]): RelevantStoryTransition[] {
  const seen = new Set<string>();
  return events.filter(event => {
    const key = identity(event);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function emptyPacket(): ContinuityPacket {
  return {
    recentOutcomes: [],
    firstAndLastRelationships: [],
    latestEntityTransitions: [],
    promiseOriginsAndProgress: [],
    recentMechanicUses: [],
  };
}

function firstByEntity(events: RelevantStoryTransition[]) {
  const seen = new Set<string>();
  return events.filter(event => {
    const key = `${event.kind}:${event.entityId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function lastByEntity(events: RelevantStoryTransition[], count = 1) {
  const counts = new Map<string, number>();
  return events.filter(event => {
    const key = `${event.kind}:${event.entityId}`;
    const current = counts.get(key) ?? 0;
    if (current >= count) return false;
    counts.set(key, current + 1);
    return true;
  });
}

function assembleContinuityPacket(input: {
  throughChapter: number;
  entityIds: string[];
  events: RelevantStoryTransition[];
}): ContinuityPacket {
  const ids = new Set(unique(input.entityIds));
  if (!ids.size || input.throughChapter === 0) return emptyPacket();
  const relevant = dedupe(input.events)
    .filter(event => (
      event.chapterNumber <= input.throughChapter
      && event.relatedEntityIds.some(id => ids.has(id))
    ));
  const ascending = (events: RelevantStoryTransition[]) => [...events]
    .sort((left, right) => left.chapterNumber - right.chapterNumber);
  const descending = (events: RelevantStoryTransition[]) => [...events]
    .sort((left, right) => right.chapterNumber - left.chapterNumber);
  const byKind = (...kinds: string[]) => relevant.filter(event => kinds.includes(event.kind));
  const outcomes = descending(byKind('chapter_outcome'));
  const relationships = byKind('relationship', 'encounter');
  const promises = byKind('promise');

  return {
    recentOutcomes: outcomes.flatMap(event => {
      const parsed = ChapterOutcomeSchema.safeParse(event.after);
      return parsed.success ? [{ outcome: parsed.data, relatedEntityIds: event.relatedEntityIds }] : [];
    }).slice(0, 8),
    firstAndLastRelationships: dedupe([
      ...firstByEntity(ascending(relationships)),
      ...lastByEntity(descending(relationships)),
    ]).slice(0, 24),
    latestEntityTransitions: lastByEntity(descending(
      byKind('resource_numeric', 'resource_state', 'location', 'knowledge'),
    )).slice(0, 12),
    promiseOriginsAndProgress: dedupe([
      ...firstByEntity(ascending(promises)),
      ...lastByEntity(descending(promises)),
    ]).slice(0, 24),
    recentMechanicUses: lastByEntity(descending(byKind('mechanic_use')), 2).slice(0, 24),
  };
}

/**
 * Build the exact same bounded packet from an in-memory immutable event ledger.
 * Offline sequential benchmarks use this instead of inventing a state snapshot
 * that production never sees.
 */
export function buildContinuityPacketFromEvents(input: {
  state: StoryState;
  entityIds: string[];
  events: ContinuityEvent[];
}): ContinuityPacket {
  return assembleContinuityPacket({
    throughChapter: input.state.chapterNumber,
    entityIds: input.entityIds,
    events: input.events.map(event => ({ ...event })),
  });
}

export function memoryEntityIdsForArc(kernel: StoryKernel, arc: ArcPlan, state: StoryState): string[] {
  return unique([
    kernel.protagonistId,
    arc.stageId,
    ...arc.activeCharacterIds,
    ...arc.activeLocationIds,
    ...arc.activeResourceIds,
    ...arc.activeWorldRuleIds,
    ...arc.activeMechanicIds,
    ...arc.duePromiseIds,
    ...state.promises
      .filter(promise => promise.status === 'open' || promise.status === 'progressed')
      .map(promise => promise.promiseId),
  ]);
}

export function memoryEntityIdsForPlan(kernel: StoryKernel, plan: ChapterPlan): string[] {
  return unique([
    kernel.protagonistId,
    ...plan.requiredWorldRuleIds,
    ...plan.mechanicUses.flatMap(use => [use.mechanicId, use.actorId, ...use.preconditionFactIds]),
    ...plan.scenes.flatMap(scene => [scene.locationId, ...scene.participantIds]),
    ...plan.requiredDeltas.flatMap(delta => {
      if (delta.kind === 'fact') return [delta.factId];
      if (delta.kind === 'knowledge' || delta.kind === 'location') return [delta.characterId];
      if (delta.kind === 'relationship') return [delta.characterId, delta.counterpartId];
      if (delta.kind === 'promise') return [delta.promiseId];
      return [delta.resourceId];
    }),
  ]);
}

async function queryEvents(input: {
  db: SupabaseClient;
  projectId: string;
  throughChapter: number;
  entityIds: string[];
  kinds: string[];
  ascending: boolean;
  limit: number;
}): Promise<RelevantStoryTransition[]> {
  if (!input.entityIds.length || input.throughChapter <= 0) return [];
  const { data, error } = await input.db
    .from('story_state_events')
    .select('chapter_number,delta_id,kind,entity_id,before_value,after_value,source,related_entity_ids')
    .eq('project_id', input.projectId)
    .in('kind', input.kinds)
    .lte('chapter_number', input.throughChapter)
    .overlaps('related_entity_ids', input.entityIds)
    .order('chapter_number', { ascending: input.ascending })
    .limit(input.limit);
  if (error) throw error;
  return (data ?? []).map(row => transition(row as EventRow));
}

/**
 * Build a bounded exact-ID continuity packet. It performs no semantic search,
 * embeddings, summarization, or model calls.
 */
export async function loadContinuityPacket(input: {
  db: SupabaseClient;
  projectId: string;
  state: StoryState;
  entityIds: string[];
}): Promise<ContinuityPacket> {
  const ids = unique(input.entityIds);
  if (!ids.length || input.state.chapterNumber === 0) {
    return emptyPacket();
  }
  const common = {
    db: input.db,
    projectId: input.projectId,
    throughChapter: input.state.chapterNumber,
    entityIds: ids,
  };
  const [outcomes, relationshipsFirst, relationshipsLast, entityLatest, promiseFirst, promiseLast, mechanicUses] = await Promise.all([
    queryEvents({ ...common, kinds: ['chapter_outcome'], ascending: false, limit: 8 }),
    queryEvents({ ...common, kinds: ['relationship', 'encounter'], ascending: true, limit: 24 }),
    queryEvents({ ...common, kinds: ['relationship', 'encounter'], ascending: false, limit: 24 }),
    queryEvents({ ...common, kinds: ['resource_numeric', 'resource_state', 'location', 'knowledge'], ascending: false, limit: 24 }),
    queryEvents({ ...common, kinds: ['promise'], ascending: true, limit: 24 }),
    queryEvents({ ...common, kinds: ['promise'], ascending: false, limit: 24 }),
    queryEvents({ ...common, kinds: ['mechanic_use'], ascending: false, limit: 24 }),
  ]);

  return assembleContinuityPacket({
    throughChapter: input.state.chapterNumber,
    entityIds: ids,
    events: [
      ...outcomes,
      ...relationshipsFirst,
      ...relationshipsLast,
      ...entityLatest,
      ...promiseFirst,
      ...promiseLast,
      ...mechanicUses,
    ],
  });
}

export function flattenContinuityPacket(packet: ContinuityPacket): RelevantStoryTransition[] {
  return dedupe([
    ...packet.firstAndLastRelationships,
    ...packet.latestEntityTransitions,
    ...packet.promiseOriginsAndProgress,
    ...packet.recentMechanicUses,
  ]).slice(0, 48);
}

// Compatibility readers remain read-only while callers migrate to one packet.
export async function loadRelevantStoryMemory(input: {
  db: SupabaseClient;
  projectId: string;
  state: StoryState;
  entityIds: string[];
  limit?: number;
}): Promise<RelevantStoryMemory[]> {
  const packet = await loadContinuityPacket(input);
  return packet.recentOutcomes.slice(0, input.limit ?? 8);
}

export async function loadRelevantStoryTransitions(input: {
  db: SupabaseClient;
  projectId: string;
  state: StoryState;
  entityIds: string[];
  limit?: number;
}): Promise<RelevantStoryTransition[]> {
  const packet = await loadContinuityPacket(input);
  return flattenContinuityPacket(packet).slice(0, input.limit ?? 12);
}
