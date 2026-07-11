import { createHash, randomUUID } from 'crypto';
import { getSupabase } from '../utils/supabase';

export type WriteRunStatus =
  | 'running'
  | 'saved'
  | 'post_write_done'
  | 'failed'
  | 'infra_blocked'
  | 'quality_rejected'
  | 'human_gate';

export type WriteCheckpointStep =
  | 'context_assembled'
  | 'chapter_generated'
  | 'pre_save_qa_passed'
  | 'chapter_saved'
  | 'current_chapter_bumped'
  | 'post_write_tasks_done'
  | 'failed';

export interface WriteRunHandle {
  id: string;
  projectId: string;
  novelId: string;
  chapterNumber: number;
}

export interface StartWriteRunInput {
  projectId: string;
  novelId: string;
  chapterNumber: number;
  model?: string | null;
  targetWordCount?: number | null;
  contextSizeChars?: number | null;
  idempotencyKey?: string;
  pipelineVersion?: 'legacy' | 'flagship_v2';
  promptVersion?: string | null;
  modelRoute?: Record<string, string>;
  contextManifest?: unknown[];
  /** Flagship requires telemetry to exist before any model call. Legacy remains best-effort. */
  required?: boolean;
}

export async function startWriteRun(input: StartWriteRunInput): Promise<WriteRunHandle | null> {
  try {
    const db = getSupabase();
    const idempotencyKey = input.idempotencyKey || digestObject({
      projectId: input.projectId,
      chapterNumber: input.chapterNumber,
      startedAtBucket: Math.floor(Date.now() / 300_000),
    });
    const row = {
      id: randomUUID(),
      project_id: input.projectId,
      novel_id: input.novelId,
      started_chapter: input.chapterNumber,
      last_chapter_number: input.chapterNumber,
      status: 'running',
      idempotency_key: idempotencyKey,
      model: input.model || null,
      target_word_count: input.targetWordCount || null,
      context_size_chars: input.contextSizeChars || null,
      pipeline_version: input.pipelineVersion || 'legacy',
      prompt_version: input.promptVersion || null,
      model_route: input.modelRoute || {},
      context_manifest: input.contextManifest || [],
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await db
      .from('story_write_runs')
      .insert(row)
      .select('id,project_id,novel_id,started_chapter')
      .single();
    if (!error && data) return toHandle(data);

    if (isUniqueViolation(error)) {
      const { data: existing, error: selectErr } = await db
        .from('story_write_runs')
        .select('id,project_id,novel_id,started_chapter')
        .eq('project_id', input.projectId)
        .eq('started_chapter', input.chapterNumber)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (selectErr) throw selectErr;
      if (existing) return toHandle(existing);
    }

    if (error) throw error;
    return null;
  } catch (e) {
    if (input.required) throw e;
    console.warn('[write-run-ledger] startWriteRun failed:', e instanceof Error ? e.message : String(e));
    return null;
  }
}

function toHandle(row: { id: string; project_id: string; novel_id: string; started_chapter: number }): WriteRunHandle {
  return {
    id: row.id,
    projectId: row.project_id,
    novelId: row.novel_id,
    chapterNumber: row.started_chapter,
  };
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  return e.code === '23505' || /duplicate key|unique constraint/i.test(e.message || '');
}

export async function recordWriteCheckpoint(
  run: WriteRunHandle | null,
  step: WriteCheckpointStep,
  meta: Record<string, unknown> = {},
  artifactRef?: string | null,
): Promise<void> {
  if (!run) return;
  try {
    const db = getSupabase();
    const digest = digestObject({ step, artifactRef: artifactRef || null, meta });
    const { error } = await db
      .from('story_write_checkpoints')
      .upsert({
        run_id: run.id,
        project_id: run.projectId,
        chapter_number: run.chapterNumber,
        step,
        artifact_ref: artifactRef || null,
        digest,
        status: step === 'failed' ? 'failed' : 'ok',
        meta,
      }, { onConflict: 'run_id,step,digest' });
    if (error) throw error;
  } catch (e) {
    console.warn(`[write-run-ledger] checkpoint ${step} failed:`, e instanceof Error ? e.message : String(e));
  }
}

export async function finishWriteRun(
  run: WriteRunHandle | null,
  status: WriteRunStatus,
  updates: {
    lastChapterNumber?: number;
    qualityScore?: number | null;
    contextSizeChars?: number | null;
    errorMessage?: string | null;
    failureClass?: 'infrastructure' | 'quality' | 'setup' | 'unknown' | null;
    publicationDecision?: 'publish' | 'revise' | 'reject' | 'human_gate' | null;
    criticEvidence?: unknown[];
    revisionLineage?: unknown[];
  } = {},
): Promise<void> {
  if (!run) return;
  try {
    const db = getSupabase();
    const { error } = await db.from('story_write_runs').update({
      status,
      last_chapter_number: updates.lastChapterNumber ?? run.chapterNumber,
      quality_score: updates.qualityScore ?? null,
      context_size_chars: updates.contextSizeChars ?? null,
      error_message: updates.errorMessage ? updates.errorMessage.slice(0, 1000) : null,
      failure_class: updates.failureClass ?? null,
      publication_decision: updates.publicationDecision ?? null,
      critic_evidence: updates.criticEvidence ?? [],
      revision_lineage: updates.revisionLineage ?? [],
      updated_at: new Date().toISOString(),
      finished_at: status === 'running' ? null : new Date().toISOString(),
    }).eq('id', run.id);
    if (error) throw error;
  } catch (e) {
    console.warn('[write-run-ledger] finishWriteRun failed:', e instanceof Error ? e.message : String(e));
  }
}

export async function updateWriteRunTelemetry(
  run: WriteRunHandle | null,
  updates: {
    contextSizeChars?: number;
    contextManifest?: unknown[];
    promptVersion?: string | null;
    modelRoute?: Record<string, string>;
  },
): Promise<void> {
  if (!run) return;
  try {
    const db = getSupabase();
    const { error } = await db.from('story_write_runs').update({
      context_size_chars: updates.contextSizeChars,
      context_manifest: updates.contextManifest,
      prompt_version: updates.promptVersion,
      model_route: updates.modelRoute,
      updated_at: new Date().toISOString(),
    }).eq('id', run.id);
    if (error) throw error;
  } catch (e) {
    console.warn('[write-run-ledger] update telemetry failed:', e instanceof Error ? e.message : String(e));
  }
}

export function digestObject(value: unknown): string {
  const stable = JSON.stringify(sortJson(value));
  return createHash('sha256').update(stable).digest('hex');
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, sortJson(v)]),
  );
}
