import type { ChapterPlanV2, StoryStateV2 } from './contracts';

function upsertBy<T>(items: T[], key: (item: T) => string, incoming: T): T[] {
  const wanted = key(incoming);
  const index = items.findIndex(item => key(item) === wanted);
  if (index < 0) return [...items, incoming];
  return items.map((item, itemIndex) => itemIndex === index ? incoming : item);
}

export function applyChapterStateDelta(input: {
  state: StoryStateV2;
  plan: ChapterPlanV2;
  title: string;
  content: string;
}): StoryStateV2 {
  const { state, plan } = input;
  if (plan.chapterNumber !== state.chapterNumber + 1) {
    throw new Error(`FLAGSHIP_STATE_SEQUENCE: state=${state.chapterNumber}, plan=${plan.chapterNumber}`);
  }

  let cast = [...state.cast];
  for (const delta of plan.stateDelta.cast) {
    const previous = cast.find(item => item.name === delta.name);
    if (!previous) throw new Error(`FLAGSHIP_STATE_UNKNOWN_CAST: ${delta.name}`);
    cast = upsertBy(cast, item => item.name, {
      ...previous,
      status: delta.status ?? previous.status,
      location: delta.location ?? previous.location,
      knowledge: [...new Set([...previous.knowledge, ...delta.learned])],
      relationshipToProtagonist: delta.relationshipChange ?? previous.relationshipToProtagonist,
    });
  }

  let resources = [...state.resources];
  for (const delta of plan.stateDelta.resources) {
    const previous = resources.find(item => item.resource === delta.resource);
    if (!previous) throw new Error(`FLAGSHIP_STATE_UNKNOWN_RESOURCE: ${delta.resource}`);
    resources = upsertBy(resources, item => item.resource, {
      resource: delta.resource,
      amount: delta.amountAfter,
      source: delta.source,
      lastChangedChapter: plan.chapterNumber,
    });
  }

  let promises = [...state.promises];
  for (const delta of plan.stateDelta.promises) {
    const previous = promises.find(item => item.id === delta.id);
    if (!previous) throw new Error(`FLAGSHIP_STATE_UNKNOWN_PROMISE: ${delta.id}`);
    promises = upsertBy(promises, item => item.id, { ...previous, ...delta });
  }

  return {
    ...state,
    chapterNumber: plan.chapterNumber,
    facts: { ...state.facts, ...plan.stateAfter, ...plan.stateDelta.facts },
    timeline: [...state.timeline, { chapter: plan.chapterNumber, event: plan.chapterPromise }].slice(-80),
    cast,
    resources,
    promises,
    recentSummary: `${input.title}: ${plan.chapterPromise} Trạng thái mới: ${Object.values(plan.stateAfter).join('; ')}`.slice(0, 5000),
    previousEnding: input.content.slice(-6000),
  };
}
