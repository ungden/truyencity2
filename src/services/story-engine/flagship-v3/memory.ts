import type { SupabaseClient } from '@supabase/supabase-js';
import type { StoryStateV3 } from './contracts';
import { retainStoryFactsV3 } from './state-transition';

type FactLedgerRow = {
  fact_id: string;
  value: string;
  scope: 'invariant' | 'arc' | 'local';
  status: 'active' | 'retired';
  source_chapter: number;
  last_seen_chapter: number;
};

export type PlannerLedgerMemoryV3 = {
  facts: FactLedgerRow[];
  knowledge: Array<{ character_id: string; fact_id: string; learned_chapter: number; source: string }>;
};

export async function loadPlannerLedgerMemoryV3(
  db: SupabaseClient,
  projectId: string,
): Promise<PlannerLedgerMemoryV3> {
  const [invariants, recent, knowledge] = await Promise.all([
    db.from('story_fact_ledger_v3').select('fact_id,value,scope,status,source_chapter,last_seen_chapter')
      .eq('project_id', projectId).eq('status', 'active').eq('scope', 'invariant').limit(100),
    db.from('story_fact_ledger_v3').select('fact_id,value,scope,status,source_chapter,last_seen_chapter')
      .eq('project_id', projectId).eq('status', 'active').neq('scope', 'invariant')
      .order('last_seen_chapter', { ascending: false }).limit(80),
    db.from('story_knowledge_ledger_v3').select('character_id,fact_id,learned_chapter,source')
      .eq('project_id', projectId).order('learned_chapter', { ascending: false }).limit(80),
  ]);
  const error = invariants.error || recent.error || knowledge.error;
  if (error) throw new Error(`FLAGSHIP_V3_LEDGER_RETRIEVAL_FAILED: ${error.message}`);
  const facts = [...(invariants.data || []), ...(recent.data || [])] as FactLedgerRow[];
  return {
    facts: facts.filter((fact, index, all) => all.findIndex(item => item.fact_id === fact.fact_id) === index),
    knowledge: (knowledge.data || []) as PlannerLedgerMemoryV3['knowledge'],
  };
}

export function mergePlannerLedgerMemoryV3(state: StoryStateV3, memory: PlannerLedgerMemoryV3): StoryStateV3 {
  const byId = new Map(state.facts.map(fact => [fact.id, fact]));
  for (const fact of memory.facts) {
    byId.set(fact.fact_id, {
      id: fact.fact_id,
      value: fact.value,
      sourceChapter: fact.source_chapter,
      scope: fact.scope,
      status: fact.status,
    });
  }
  return { ...state, facts: retainStoryFactsV3([...byId.values()]) };
}

export async function hydratePlanFactsV3(
  db: SupabaseClient,
  projectId: string,
  state: StoryStateV3,
  factIds: string[],
): Promise<StoryStateV3> {
  const missing = [...new Set(factIds)].filter(id => !state.facts.some(fact => fact.id === id));
  if (!missing.length) return state;
  const { data, error } = await db.from('story_fact_ledger_v3')
    .select('fact_id,value,scope,status,source_chapter,last_seen_chapter')
    .eq('project_id', projectId).in('fact_id', missing).eq('status', 'active');
  if (error) throw new Error(`FLAGSHIP_V3_LEDGER_RETRIEVAL_FAILED: ${error.message}`);
  return mergePlannerLedgerMemoryV3(state, { facts: (data || []) as FactLedgerRow[], knowledge: [] });
}
