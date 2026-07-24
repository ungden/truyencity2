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

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function memoryEntityIdsForArc(kernel: StoryKernel, arc: ArcPlan, state: StoryState): string[] {
  return unique([
    kernel.protagonistId,
    arc.stageId,
    ...arc.activeCharacterIds,
    ...arc.activeLocationIds,
    ...arc.activeResourceIds,
    ...arc.activeWorldRuleIds,
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

export async function loadRelevantStoryMemory(input: {
  db: SupabaseClient;
  projectId: string;
  state: StoryState;
  entityIds: string[];
  limit?: number;
}): Promise<RelevantStoryMemory[]> {
  const ids = unique(input.entityIds);
  if (!ids.length || input.state.chapterNumber <= 12) return [];
  const { data, error } = await input.db
    .from('story_state_events')
    .select('after_value,related_entity_ids,chapter_number')
    .eq('project_id', input.projectId)
    .eq('kind', 'chapter_outcome')
    .lte('chapter_number', input.state.chapterNumber - 12)
    .overlaps('related_entity_ids', ids)
    .order('chapter_number', { ascending: false })
    .limit(input.limit ?? 12);
  if (error) throw error;
  return (data ?? []).flatMap(row => {
    const parsed = ChapterOutcomeSchema.safeParse(row.after_value);
    return parsed.success ? [{
      outcome: parsed.data,
      relatedEntityIds: Array.isArray(row.related_entity_ids)
        ? row.related_entity_ids.filter((id: unknown): id is string => typeof id === 'string')
        : [],
    }] : [];
  });
}
