import type { SupabaseClient } from '@supabase/supabase-js';
import { FlagshipSetupError, type FlagshipSetupRole } from './setup';

export type FlagshipSetupPhase = 'concept_tournament' | 'launch_pack' | 'rolling_plan';

export async function startFlagshipSetupRun(input: {
  db: SupabaseClient;
  projectId: string;
  phase: FlagshipSetupPhase;
  model: string;
  modelRoutes?: Record<string, string>;
  promptVersion: string;
}): Promise<string> {
  const { data, error } = await input.db.from('story_flagship_setup_runs').insert({
    project_id: input.projectId,
    phase: input.phase,
    model: input.model,
    model_routes: input.modelRoutes || {},
    prompt_version: input.promptVersion,
    status: 'running',
  }).select('id').single();
  if (error || !data?.id) throw new FlagshipSetupError('setup_blocked', `Required flagship setup telemetry could not start: ${error?.message || 'missing run id'}`);
  return data.id as string;
}

export async function finishFlagshipSetupRun(input: {
  db: SupabaseClient;
  runId: string | null;
  status: 'saved' | 'setup_blocked' | 'infra_blocked' | 'human_gate';
  callRoles?: FlagshipSetupRole[] | string[];
  errorMessage?: string;
  artifact?: unknown;
}): Promise<void> {
  if (!input.runId) return;
  const { error } = await input.db.from('story_flagship_setup_runs').update({
    status: input.status,
    call_roles: input.callRoles || [],
    error_message: input.errorMessage?.slice(0, 1000) || null,
    artifact_snapshot: input.artifact ?? null,
    finished_at: new Date().toISOString(),
  }).eq('id', input.runId);
  if (error) throw new FlagshipSetupError('setup_blocked', `Required flagship setup telemetry could not finish: ${error.message}`);
}
