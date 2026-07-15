import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ConceptTournamentArtifactV2Schema,
  FlagshipSetupBriefV2Schema,
  HumanConceptSelectionV2Schema,
} from './setup-contracts';
import { FlagshipSetupError } from './setup';
import {
  approveFlagshipStorySpecForProject,
  materializeFlagshipSetupForProject,
  runFlagshipConceptTournamentForProject,
} from './setup-runtime';
import { planNextFlagshipWindowForProject } from './rolling-planner';

/**
 * Advance one unattended setup job without pretending that a machine review
 * is a human review. Every machine decision is recorded with the
 * `factory-auto` reviewer ref and is still subject to the same typed launch
 * pack/foundation contracts. There is deliberately no legacy setup fallback.
 */
export async function advanceAutonomousFlagshipSetup(
  projectId: string,
  db: SupabaseClient,
): Promise<{ status: 'setup' | 'ready'; step: string; candidateId?: string }> {
  const { data, error } = await db.from('ai_story_projects').select(
    'id,status,current_chapter,style_directives,flagship_setup_status,flagship_concept_tournament_v2,flagship_setup_artifacts_v2,flagship_setup_brief_v2,story_spec_v2,arc_plan_v2,story_state_v2',
  ).eq('id', projectId).single();
  if (error || !data) throw new FlagshipSetupError('setup_blocked', error?.message || 'Factory project not found.');

  const style = (data.style_directives || {}) as Record<string, unknown>;
  if (style.pipeline_version !== 'flagship_v2' || style.publication_mode !== 'automatic' || style.factory_enabled !== true) {
    throw new FlagshipSetupError('setup_blocked', 'Autonomous setup requires explicit flagship factory opt-in.');
  }
  if (Number(data.current_chapter || 0) !== 0) {
    if (data.flagship_setup_status === 'infra_blocked' && data.arc_plan_v2 && data.story_state_v2) {
      const { error: resumeError } = await db.from('ai_story_projects').update({ flagship_setup_status: 'ready_to_write', updated_at: new Date().toISOString() }).eq('id', projectId);
      if (resumeError) throw new FlagshipSetupError('infra_blocked', `Could not resume setup after provider outage: ${resumeError.message}`);
      return { status: 'ready', step: 'infra_retry_resumed' };
    }
    if (data.flagship_setup_status !== 'ready_to_write') throw new FlagshipSetupError('setup_blocked', 'Factory setup cannot mutate a project after writing starts.');
    return { status: 'ready', step: 'already_ready' };
  }
  if (data.status !== 'paused') throw new FlagshipSetupError('setup_blocked', 'Factory setup requires a paused project until its first plan is committed.');

  const restoreAutomaticFlags = async (): Promise<void> => {
    const current = (data.style_directives || {}) as Record<string, unknown>;
    const { error: updateError } = await db.from('ai_story_projects').update({
      style_directives: {
        ...current,
        pipeline_version: 'flagship_v2',
        publication_mode: 'automatic',
        factory_enabled: true,
        flagship_setup_mode: 'autonomous_factory',
      },
      updated_at: new Date().toISOString(),
    }).eq('id', projectId);
    if (updateError) throw new FlagshipSetupError('setup_blocked', `Could not preserve factory opt-in: ${updateError.message}`);
  };

  let setupStatus = data.flagship_setup_status as string | null;
  if (setupStatus === 'infra_blocked') {
    // Setup model outages are retryable, but only by restoring the exact
    // interrupted phase from persisted artifacts. No phase is guessed from a
    // generic template or borrowed from another story.
    setupStatus = data.story_spec_v2 && data.arc_plan_v2 && data.story_state_v2
      ? 'ready_to_write'
      : data.flagship_concept_tournament_v2
        ? data.flagship_setup_artifacts_v2 ? 'story_spec_review' : 'concept_review'
      : data.flagship_setup_brief_v2 ? 'brief_ready' : null;
    if (!setupStatus) throw new FlagshipSetupError('setup_blocked', 'Factory setup outage has no persisted phase to resume.');
    const { error: resumeError } = await db.from('ai_story_projects').update({ flagship_setup_status: setupStatus, updated_at: new Date().toISOString() }).eq('id', projectId);
    if (resumeError) throw new FlagshipSetupError('infra_blocked', `Could not restore setup phase: ${resumeError.message}`);
  }
  if (setupStatus === 'brief_ready') {
    await runFlagshipConceptTournamentForProject(projectId, { db });
    await restoreAutomaticFlags();
    return { status: 'setup', step: 'concept_tournament_saved' };
  }

  if (setupStatus === 'concept_review') {
    const tournament = ConceptTournamentArtifactV2Schema.safeParse(data.flagship_concept_tournament_v2);
    if (!tournament.success) throw new FlagshipSetupError('setup_blocked', 'Factory concept tournament is missing or invalid.', tournament.error.issues);
    const byId = new Map(tournament.data.concepts.map(candidate => [candidate.id, candidate]));
    const ranked = [...tournament.data.ranking.ranking]
      .filter(item => tournament.data.ranking.finalistIds.includes(item.id) && byId.has(item.id))
      .sort((a, b) => b.wins - a.wins || a.id.localeCompare(b.id));
    const winner = ranked[0];
    const candidate = winner ? byId.get(winner.id) : undefined;
    if (!winner || !candidate) throw new FlagshipSetupError('setup_blocked', 'Factory tournament has no machine-selectable finalist.');
    const selection = HumanConceptSelectionV2Schema.parse({
      schemaVersion: 2,
      candidateId: candidate.id,
      approvedTitle: candidate.workingTitle,
      approvedBy: 'factory-auto',
      rationale: `Machine selection: finalist ${candidate.id} led the typed pairwise ranking with ${winner.wins} wins; no title or kernel fallback was used.`,
      approvedAt: new Date().toISOString(),
    });
    await materializeFlagshipSetupForProject(projectId, selection, { db });
    const { error: provenanceError } = await db.rpc('mark_flagship_factory_review_v2', {
      p_project_id: projectId,
      p_stage: 'concept',
      p_reviewer_ref: 'factory-auto',
      p_evidence: [{ kind: 'automated_factory_concept_selection', candidateId: candidate.id }],
    });
    if (provenanceError) throw new FlagshipSetupError('setup_blocked', `Factory concept provenance failed: ${provenanceError.message}`);
    await restoreAutomaticFlags();
    return { status: 'setup', step: 'launch_pack_saved', candidateId: candidate.id };
  }

  if (setupStatus === 'story_spec_review') {
    await approveFlagshipStorySpecForProject(projectId, 'factory-auto', [{ kind: 'automated_factory_review' }], db);
    const { error: provenanceError } = await db.rpc('mark_flagship_factory_review_v2', {
      p_project_id: projectId,
      p_stage: 'story_spec',
      p_reviewer_ref: 'factory-auto',
      p_evidence: [{ kind: 'automated_factory_story_spec_approval' }],
    });
    if (provenanceError) throw new FlagshipSetupError('setup_blocked', `Factory StorySpec provenance failed: ${provenanceError.message}`);
    await restoreAutomaticFlags();
    return { status: 'setup', step: 'story_spec_auto_approved' };
  }

  if (setupStatus === 'ready_to_write') {
    if (data.arc_plan_v2 && data.story_state_v2) {
      await planNextFlagshipWindowForProject(projectId, { db });
    }
    await restoreAutomaticFlags();
    return { status: 'ready', step: 'rolling_window_committed' };
  }

  throw new FlagshipSetupError('setup_blocked', `Factory setup cannot advance from ${setupStatus || 'missing'}.`);
}
