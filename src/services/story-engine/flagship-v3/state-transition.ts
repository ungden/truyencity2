import type { ChapterDeltaV3, ChapterPlanV3, StoryStateV3 } from './contracts';

function replaceBy<T>(items: T[], key: (item: T) => string, wanted: string, update: (item: T) => T): T[] {
  let found = false;
  const next = items.map(item => {
    if (key(item) !== wanted) return item;
    found = true;
    return update(item);
  });
  if (!found) throw new Error(`FLAGSHIP_V3_STATE_REFERENCE_MISSING: ${wanted}`);
  return next;
}

export function applyChapterStateV3(input: {
  state: StoryStateV3;
  plan: ChapterPlanV3;
  title: string;
  content: string;
  realizedDeltaIds: string[];
}): StoryStateV3 {
  if (input.plan.chapterNumber !== input.state.chapterNumber + 1) {
    throw new Error(`FLAGSHIP_V3_STATE_SEQUENCE: state=${input.state.chapterNumber}, plan=${input.plan.chapterNumber}`);
  }
  const realized = new Set(input.realizedDeltaIds);
  const missing = input.plan.requiredDeltas.filter(delta => delta.evidenceRequired && !realized.has(delta.id));
  if (missing.length) throw new Error(`FLAGSHIP_V3_UNREALIZED_DELTAS: ${missing.map(delta => delta.id).join(',')}`);

  let facts = [...input.state.facts];
  let characters = [...input.state.characters];
  let resources = [...input.state.resources];
  let promises = [...input.state.promises];
  const chapter = input.plan.chapterNumber;

  const apply = (delta: ChapterDeltaV3): void => {
    if (delta.kind === 'fact') {
      const existing = facts.some(item => item.id === delta.factId);
      facts = (existing
        ? replaceBy(facts, item => item.id, delta.factId, item => ({ ...item, value: delta.valueAfter, sourceChapter: chapter }))
        : [...facts, { id: delta.factId, value: delta.valueAfter, sourceChapter: chapter }]
      ).slice(-100);
    } else if (delta.kind === 'character_location') {
      characters = replaceBy(characters, item => item.characterId, delta.characterId, item => ({ ...item, locationId: delta.locationAfter }));
    } else if (delta.kind === 'character_knowledge') {
      characters = replaceBy(characters, item => item.characterId, delta.characterId, item => ({
        ...item,
        knowledge: [...item.knowledge, { factId: delta.factId, learnedChapter: chapter, source: delta.learnedFrom }]
          .filter((entry, index, all) => all.findIndex(candidate => candidate.factId === entry.factId) === index)
          .slice(-40),
      }));
    } else if (delta.kind === 'relationship') {
      characters = replaceBy(characters, item => item.characterId, delta.characterId, item => ({ ...item, relationshipState: delta.relationshipAfter }));
    } else if (delta.kind === 'resource_numeric') {
      resources = replaceBy(resources, item => item.resourceId, delta.resourceId, item => ({
        ...item,
        value: { mode: 'numeric', amount: delta.after, unit: delta.unit },
        source: `${delta.source}; sink=${delta.sink}`,
        lastChangedChapter: chapter,
      }));
    } else if (delta.kind === 'resource_state') {
      resources = replaceBy(resources, item => item.resourceId, delta.resourceId, item => ({
        ...item,
        value: { mode: 'state', value: delta.after },
        source: delta.source,
        lastChangedChapter: chapter,
      }));
    } else {
      promises = replaceBy(promises, item => item.promiseId, delta.promiseId, item => ({
        ...item,
        status: delta.statusAfter,
        pressure: delta.pressureAfter,
      }));
    }
  };
  input.plan.requiredDeltas.forEach(apply);
  const previousTimeline = input.state.timeline[input.state.timeline.length - 1];
  const previousEndMinute = previousTimeline
    ? previousTimeline.startMinute + previousTimeline.durationMinutes
    : 0;
  const chapterStartMinute = previousEndMinute + input.plan.elapsedMinutesSincePreviousChapter;
  const chapterDurationMinutes = input.plan.scenes.reduce(
    (sum, scene) => sum + scene.travelMinutesFromPrevious + scene.durationMinutes,
    0,
  );
  const last = input.plan.scenes[input.plan.scenes.length - 1];
  return {
    ...input.state,
    chapterNumber: chapter,
    facts,
    characters,
    resources,
    promises,
    timeline: [...input.state.timeline, {
      chapter,
      startMinute: chapterStartMinute,
      durationMinutes: chapterDurationMinutes,
      locationId: last.locationId,
      event: input.plan.chapterPromise,
    }].slice(-100),
    recentSummary: `${input.title}: ${input.plan.chapterPromise}`.slice(0, 5000),
    previousEnding: input.content.slice(-6000),
    retrievalNotes: input.state.retrievalNotes.slice(-8),
  };
}
