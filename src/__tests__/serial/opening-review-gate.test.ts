import { readFileSync } from 'node:fs';

const migration = readFileSync(
  'supabase/migrations/20260919093526_serial_opening_review_gate.sql',
  'utf8',
);
const auditMigration = readFileSync(
  'supabase/migrations/20260919205759_serial_opening_audit.sql',
  'utf8',
);
const runtime = readFileSync('src/services/serial/runtime.ts', 'utf8');
const adminRoute = readFileSync('src/app/api/admin/serial/route.ts', 'utf8');
const operator = readFileSync('scripts/serial-operator.ts', 'utf8');

describe('chapter-four human review gate', () => {
  test('the database records opening approval separately from premise approval', () => {
    expect(migration).toMatch(/opening_reviewed_at timestamptz/);
    expect(migration).toMatch(/opening_reviewed_by text/);
    expect(migration).toMatch(/'opening_review'/);
  });

  test('chapter four is audited across the full opening before it can enter review', () => {
    expect(auditMigration).toMatch(/ADD COLUMN IF NOT EXISTS opening_audit jsonb/);
    const auditAt = runtime.indexOf('auditFourChapterOpening');
    const commitAt = runtime.indexOf("db.rpc('commit_serial_chapter'");
    expect(auditAt).toBeGreaterThan(0);
    expect(commitAt).toBeGreaterThan(auditAt);
    expect(runtime).toMatch(/Opening audit failed/);
    expect(runtime).toMatch(/rpc\('replan_serial_cycle'/);
  });

  test('chapter four enters opening review in the same transaction that commits it', () => {
    const commit = migration.slice(migration.indexOf('FUNCTION public.commit_serial_chapter'));
    expect(commit).toMatch(/p_expected_chapter = 4/);
    expect(commit).toMatch(/v_next_status := CASE WHEN v_needs_opening_review THEN 'opening_review'/);
    expect(commit).toMatch(/status = v_next_status/);
    expect(commit).toMatch(/'needsOpeningReview', v_needs_opening_review/);
    expect(runtime).toMatch(/paused for opening review/);
  });

  test('claiming remains fail-closed even if an old client writes ready', () => {
    const claim = migration.slice(
      migration.indexOf('FUNCTION public.claim_serial_job'),
      migration.indexOf('FUNCTION public.commit_serial_chapter'),
    );
    expect(claim).toMatch(/j\.current_chapter < 4 OR n\.opening_reviewed_at IS NOT NULL/);
    expect(claim).toMatch(/j\.status = 'ready'/);
  });

  test('admin and CLI cannot use resume to bypass the review state', () => {
    expect(adminRoute).toMatch(/Only a paused job can be resumed/);
    expect(adminRoute).toMatch(/A review gate cannot be replaced by pause/);
    expect(operator).toMatch(/resume requires a paused job; it cannot bypass a review gate/);
    expect(operator).toMatch(/opening_reviewed_at/);
  });
});
