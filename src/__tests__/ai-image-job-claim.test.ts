import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Gemini cover Edge Function claim boundary', () => {
  const source = readFileSync(resolve(process.cwd(), 'supabase/functions/gemini-cover-generate/index.ts'), 'utf8');

  test('claims only the caller-owned pending job before calling Gemini', () => {
    expect(source).toContain(".eq('user_id', authData.user.id)");
    expect(source).toContain(".eq('status', 'pending')");
    expect(source).toContain(".update({ status: 'running'");
    expect(source).not.toContain("await updateJobStatus(supabase, jobId, 'running')");
  });
});
