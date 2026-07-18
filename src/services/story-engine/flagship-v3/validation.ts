import type { ArcPlanV3, ChapterPlanV3, StoryKernelV3, StoryStateV3 } from './contracts';

export interface V3ValidationIssue {
  code: string;
  path: string;
  message: string;
}

const closeEnough = (left: number, right: number): boolean => Math.abs(left - right) < 1e-8;
const purchaseLanguage = /(?:\bmua\b|\bthu mua\b|\bđổi lấy\b|\bthanh toán\b)/iu;

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
  const workingFacts = new Map(facts);
  const workingResources = new Map(state.resources.map(item => [item.resourceId, item.value]));
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
      const current = workingFacts.get(delta.factId);
      if (current === undefined && delta.valueBefore !== null) {
        issues.push({ code: 'fact_create_requires_null_before', path, message: `New fact ${delta.factId} must use valueBefore=null.` });
      } else if (current !== undefined && delta.valueBefore !== current) {
        issues.push({ code: 'fact_stale_before', path, message: `Fact ${delta.factId} valueBefore does not match committed state.` });
      }
      workingFacts.set(delta.factId, delta.valueAfter);
    }
    if (delta.kind === 'promise' && (!promises.has(delta.promiseId) || !statePromises.has(delta.promiseId))) {
      issues.push({ code: 'unknown_promise_delta', path, message: `Unknown promise ${delta.promiseId}.` });
    }
    if (delta.kind === 'resource_numeric' || delta.kind === 'resource_state') {
      const definition = resources.get(delta.resourceId);
      const committed = stateResources.get(delta.resourceId);
      const currentValue = workingResources.get(delta.resourceId);
      if (!definition || !committed || !currentValue) {
        issues.push({ code: 'unknown_resource_delta', path, message: `Unknown resource ${delta.resourceId}.` });
        continue;
      }
      if (definition.mode !== (delta.kind === 'resource_numeric' ? 'numeric' : 'state') || currentValue.mode !== definition.mode) {
        issues.push({ code: 'resource_mode_mismatch', path, message: `Resource ${delta.resourceId} uses the wrong value mode.` });
        continue;
      }
      if (delta.kind === 'resource_numeric' && currentValue.mode === 'numeric') {
        if (currentValue.unit !== delta.unit || definition.unit !== delta.unit) {
          issues.push({ code: 'resource_unit_mismatch', path, message: `Resource ${delta.resourceId} changed unit.` });
        }
        if (!closeEnough(currentValue.amount, delta.before)) {
          issues.push({ code: 'resource_stale_before', path, message: `Resource ${delta.resourceId} before value does not match committed state.` });
        }
        if (!closeEnough(delta.before + delta.delta, delta.after)) {
          issues.push({ code: 'resource_arithmetic', path, message: `Resource ${delta.resourceId} before + delta must equal after.` });
        }
        if (definition.minimumValue !== null && delta.after < definition.minimumValue) {
          issues.push({ code: 'resource_below_minimum', path, message: `Resource ${delta.resourceId} fell below its story-specific minimum.` });
        }
        if (definition.maximumValue !== null && delta.after > definition.maximumValue) {
          issues.push({ code: 'resource_above_maximum', path, message: `Resource ${delta.resourceId} exceeded its story-specific maximum.` });
        }
        const looksLikePurchase = delta.delta < 0 && purchaseLanguage.test(`${delta.source} ${delta.sink}`);
        if (looksLikePurchase && delta.transactionKind !== 'purchase') {
          issues.push({
            code: 'resource_purchase_untyped',
            path: `${path}.transactionKind`,
            message: 'A purchase must be typed as purchase and list its concrete consideration; prose cannot repair an unpriced plan.',
          });
        }
        if (delta.transactionKind === 'gain' && delta.delta <= 0) {
          issues.push({ code: 'resource_transaction_sign', path, message: 'A gain transaction must increase the numeric resource.' });
        }
        if (['purchase', 'fee', 'consume'].includes(delta.transactionKind) && delta.delta >= 0) {
          issues.push({ code: 'resource_transaction_sign', path, message: `${delta.transactionKind} must decrease the numeric resource.` });
        }
        if (delta.transactionKind !== 'purchase' && delta.consideration.length > 0) {
          issues.push({
            code: 'resource_consideration_without_purchase',
            path: `${path}.consideration`,
            message: 'Concrete purchase consideration is only valid on purchase transactions.',
          });
        }
        if (delta.transactionKind === 'purchase') {
          if (delta.consideration.length === 0) {
            issues.push({
              code: 'resource_purchase_missing_consideration',
              path: `${path}.consideration`,
              message: 'Purchase transaction must list the goods or services received.',
            });
          } else {
            const anchors = new Map(definition.exchangeAnchors.map(anchor => [anchor.itemId, anchor]));
            let expectedCost = 0;
            let allowedVariance = 0;
            const seenItems = new Set<string>();
            for (const item of delta.consideration) {
              if (seenItems.has(item.itemId)) {
                issues.push({ code: 'resource_duplicate_consideration', path: `${path}.consideration`, message: `Purchase repeats consideration ${item.itemId}.` });
                continue;
              }
              seenItems.add(item.itemId);
              const anchor = anchors.get(item.itemId);
              if (!anchor) {
                issues.push({
                  code: 'resource_missing_exchange_anchor',
                  path: `${path}.consideration.${item.itemId}`,
                  message: `Story kernel has no exchange anchor for ${item.itemId}; operator must repair the story-specific economy before writing.`,
                });
                continue;
              }
              if (anchor.unit.toLocaleLowerCase('vi') !== item.unit.toLocaleLowerCase('vi')) {
                issues.push({
                  code: 'resource_exchange_unit_mismatch',
                  path: `${path}.consideration.${item.itemId}.unit`,
                  message: `Consideration ${item.itemId} must use story-kernel unit ${anchor.unit}.`,
                });
                continue;
              }
              const itemCost = (item.quantity / anchor.quantity) * anchor.costAmount;
              expectedCost += itemCost;
              allowedVariance += itemCost * (anchor.tolerancePercent / 100);
            }
            const actualCost = Math.abs(delta.delta);
            if (expectedCost > 0 && Math.abs(actualCost - expectedCost) > Math.max(allowedVariance, 1e-8)) {
              issues.push({
                code: 'resource_exchange_implausible',
                path,
                message: `Purchase costs ${actualCost} ${delta.unit}, but story-specific exchange anchors imply ${expectedCost.toFixed(2)} ± ${allowedVariance.toFixed(2)} ${delta.unit}.`,
              });
            }
          }
        }
        workingResources.set(delta.resourceId, { ...currentValue, amount: delta.after });
      }
      if (delta.kind === 'resource_state' && currentValue.mode === 'state') {
        if (currentValue.value !== delta.before) {
          issues.push({ code: 'resource_stale_before', path, message: `Resource ${delta.resourceId} state does not match committed state.` });
        }
        workingResources.set(delta.resourceId, { ...currentValue, value: delta.after });
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
