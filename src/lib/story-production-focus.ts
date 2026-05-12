/**
 * Production focus allowlist.
 *
 * 2026-05-05: lock story production to 10 selected ch.0 projects while the
 * setup pipeline is repaired. Default is ON; set STORY_FOCUS_MODE=0 to disable.
 * Override the IDs with FOCUSED_PROJECT_IDS=uuid1,uuid2,...
 */

export const DEFAULT_FOCUSED_PROJECT_IDS = [
  '6c281b11-95ad-4346-8bee-f3a94fdfa60d',
  '79a984e1-d79b-4a87-8524-81725cd80863',
  'b8391d26-a1c4-4499-926e-bed6f750ae10',
  '2260a481-4a7c-4e78-9ce7-9bd8d4178d86',
  'b1a04865-51a0-4fb5-bc19-506f6413b0a9',
  'e41075c3-e09f-4783-a992-d19840de345e',
  '0a7eddbf-8107-4474-84b7-5c7838dd45a9',
  '37b9b877-e524-4957-b365-f3e98dd7d7da',
  'c8d72480-6355-49a7-b4a7-c53c3a675cb0',
  'a38b1bfd-3350-4fc1-8158-c37947b2cc1c',
  // 2026-05-12: Mạt Thế: Ta Có Hầm Trú Ẩn Vạn Năng — first production
  // novel on Gemini-only pipeline (Phase Q). Cron writes 50 ch/day.
  'c97b1d28-3421-44bb-bcfe-98055c44943a',
] as const;

function parseFocusedIds(raw?: string): string[] {
  return (raw || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

export const FOCUS_MODE_ENABLED = process.env.STORY_FOCUS_MODE !== '0';
// 2026-05-12: Default switched OFF (was ON for engine-repair freeze).
// Pipeline now uses Gemini-only routing; set STORY_PRODUCTION_PAUSED=1 explicitly to pause.
export const STORY_PRODUCTION_PAUSED = process.env.STORY_PRODUCTION_PAUSED === '1';

export const FOCUSED_PROJECT_IDS = parseFocusedIds(process.env.FOCUSED_PROJECT_IDS);
if (FOCUSED_PROJECT_IDS.length === 0) {
  FOCUSED_PROJECT_IDS.push(...DEFAULT_FOCUSED_PROJECT_IDS);
}

const FOCUSED_PROJECT_ID_SET = new Set<string>(FOCUSED_PROJECT_IDS);

export function isFocusedProject(projectId?: string | null): boolean {
  if (!FOCUS_MODE_ENABLED) return true;
  return !!projectId && FOCUSED_PROJECT_ID_SET.has(projectId);
}

export function filterFocusedProjects<T extends { id?: string | null }>(rows: T[]): T[] {
  if (!FOCUS_MODE_ENABLED) return rows;
  return rows.filter((row) => isFocusedProject(row.id));
}
