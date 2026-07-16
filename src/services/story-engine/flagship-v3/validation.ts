import type { ArcPlanV3, ChapterPlanV3, StoryKernelV3, StoryStateV3 } from './contracts';

export interface V3ValidationIssue {
  code: string;
  path: string;
  message: string;
}

const closeEnough = (left: number, right: number): boolean => Math.abs(left - right) < 1e-8;

export function validateV3Artifacts(input: {
  kernel: StoryKernelV3;
  arc: ArcPlanV3;
  state: StoryStateV3;
  plan: ChapterPlanV3;
}): V3ValidationIssue[] {
  const { kernel, arc, state, plan } = input;
  const issues: V3ValidationIssue[] = [];
  const characters = new Set(kernel.characters.map(item => item.id));
  const resources = new Map(kernel.resources.map(item => [item.id, item]));
  const promises = new Set(kernel.promises.map(item => item.id));
  const facts = new Map(state.facts.map(item => [item.id, item.value]));
  const stateCharacters = new Map(state.characters.map(item => [item.characterId, item]));
  const stateResources = new Map(state.resources.map(item => [item.resourceId, item]));
  const statePromises = new Set(state.promises.map(item => item.promiseId));
  const createdFactIds = new Set(plan.requiredDeltas.flatMap(delta =>
    delta.kind === 'fact' && delta.valueBefore === null ? [delta.factId] : [],
  ));

  if (plan.chapterNumber !== state.chapterNumber + 1) {
    issues.push({ code: 'chapter_sequence', path: 'chapterNumber', message: `Expected chapter ${state.chapterNumber + 1}.` });
  }
  if (plan.chapterNumber < arc.startChapter || plan.chapterNumber > arc.endChapter) {
    issues.push({ code: 'arc_coverage', path: 'chapterNumber', message: 'Chapter is outside the current arc.' });
  }
  for (const precondition of plan.preconditions) {
    if (!facts.has(precondition.factId)) {
      issues.push({ code: 'unknown_fact', path: `preconditions.${precondition.factId}`, message: 'Plan references an unknown fact.' });
    } else if (facts.get(precondition.factId) !== precondition.expectedValue) {
      issues.push({ code: 'stale_precondition', path: `preconditions.${precondition.factId}`, message: 'Plan was prepared against stale state.' });
    }
  }

  const usedDeltas = new Set(plan.scenes.flatMap(scene => scene.requiredDeltaIds));
  for (const delta of plan.requiredDeltas) {
    if (!usedDeltas.has(delta.id)) {
      issues.push({ code: 'orphan_delta', path: `requiredDeltas.${delta.id}`, message: 'Required delta is not owned by a scene.' });
    }
  }

  for (const [index, scene] of plan.scenes.entries()) {
    if (!characters.has(scene.povCharacterId)) {
      issues.push({ code: 'unknown_pov', path: `scenes.${index}.povCharacterId`, message: 'POV character is outside the story kernel.' });
    }
    if (!scene.participantIds.includes(scene.povCharacterId)) {
      issues.push({ code: 'pov_not_present', path: `scenes.${index}.participantIds`, message: 'POV character must be present in the scene.' });
    }
    for (const participantId of scene.participantIds) {
      if (!characters.has(participantId) || !stateCharacters.has(participantId)) {
        issues.push({ code: 'unknown_participant', path: `scenes.${index}.participantIds`, message: `Unknown participant ${participantId}.` });
      }
    }
  }

  for (const [index, delta] of plan.requiredDeltas.entries()) {
    const path = `requiredDeltas.${index}`;
    if ('characterId' in delta && (!characters.has(delta.characterId) || !stateCharacters.has(delta.characterId))) {
      issues.push({ code: 'unknown_character_delta', path, message: `Unknown character ${delta.characterId}.` });
    }
    if (delta.kind === 'character_knowledge' && !facts.has(delta.factId) && !createdFactIds.has(delta.factId)) {
      issues.push({ code: 'unknown_knowledge_fact', path, message: `Knowledge delta references unknown fact ${delta.factId}.` });
    }
    if (delta.kind === 'fact') {
      const current = facts.get(delta.factId);
      if (current === undefined && delta.valueBefore !== null) {
        issues.push({ code: 'fact_create_requires_null_before', path, message: `New fact ${delta.factId} must use valueBefore=null.` });
      } else if (current !== undefined && delta.valueBefore !== current) {
        issues.push({ code: 'fact_stale_before', path, message: `Fact ${delta.factId} valueBefore does not match committed state.` });
      }
    }
    if (delta.kind === 'promise' && (!promises.has(delta.promiseId) || !statePromises.has(delta.promiseId))) {
      issues.push({ code: 'unknown_promise_delta', path, message: `Unknown promise ${delta.promiseId}.` });
    }
    if (delta.kind === 'resource_numeric' || delta.kind === 'resource_state') {
      const definition = resources.get(delta.resourceId);
      const current = stateResources.get(delta.resourceId);
      if (!definition || !current) {
        issues.push({ code: 'unknown_resource_delta', path, message: `Unknown resource ${delta.resourceId}.` });
        continue;
      }
      if (definition.mode !== (delta.kind === 'resource_numeric' ? 'numeric' : 'state') || current.value.mode !== definition.mode) {
        issues.push({ code: 'resource_mode_mismatch', path, message: `Resource ${delta.resourceId} uses the wrong value mode.` });
        continue;
      }
      if (delta.kind === 'resource_numeric' && current.value.mode === 'numeric') {
        if (current.value.unit !== delta.unit || definition.unit !== delta.unit) {
          issues.push({ code: 'resource_unit_mismatch', path, message: `Resource ${delta.resourceId} changed unit.` });
        }
        if (!closeEnough(current.value.amount, delta.before)) {
          issues.push({ code: 'resource_stale_before', path, message: `Resource ${delta.resourceId} before value does not match committed state.` });
        }
        if (!closeEnough(delta.before + delta.delta, delta.after)) {
          issues.push({ code: 'resource_arithmetic', path, message: `Resource ${delta.resourceId} before + delta must equal after.` });
        }
      }
      if (delta.kind === 'resource_state' && current.value.mode === 'state' && current.value.value !== delta.before) {
        issues.push({ code: 'resource_stale_before', path, message: `Resource ${delta.resourceId} state does not match committed state.` });
      }
    }
  }

  for (const conflict of arc.activeConflicts) {
    for (const actorId of conflict.actorIds) {
      if (!characters.has(actorId)) {
        issues.push({ code: 'unknown_arc_actor', path: `arc.activeConflicts.${conflict.id}`, message: `Arc references unknown character ${actorId}.` });
      }
    }
  }
  for (const promiseId of arc.duePromiseIds) {
    if (!promises.has(promiseId)) {
      issues.push({ code: 'unknown_arc_promise', path: 'arc.duePromiseIds', message: `Arc references unknown promise ${promiseId}.` });
    }
  }
  return issues;
}
