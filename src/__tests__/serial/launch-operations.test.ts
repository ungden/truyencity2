import { readFileSync } from 'node:fs';
import { readStoredOpeningAudit, storedOpeningAudit } from '@/services/serial/contracts';

const migration = readFileSync(
  'supabase/migrations/20260919160350_serial_launch_operations.sql',
  'utf8',
);
const resumeMigration = readFileSync(
  'supabase/migrations/20260919163217_serial_resume_after_review.sql',
  'utf8',
);
const resumeFeedbackMigration = readFileSync(
  'supabase/migrations/20260919211906_serial_resume_preserve_feedback.sql',
  'utf8',
);
const quotaRefundMigration = readFileSync(
  'supabase/migrations/20260919212857_serial_replan_quota_refund.sql',
  'utf8',
);
const operator = readFileSync('scripts/serial-operator.ts', 'utf8');
const adminRoute = readFileSync('src/app/api/admin/serial/route.ts', 'utf8');
const adminPage = readFileSync('src/app/admin/serial/page.tsx', 'utf8');

describe('serial launch operations', () => {
  test('automatic replans reuse the open cycle instead of incrementing its number', () => {
    const body = migration.slice(
      migration.indexOf('FUNCTION public.replan_serial_cycle'),
      migration.indexOf('FUNCTION public.restart_serial_opening'),
    );
    expect(body).toMatch(/current_cycle_id = v_cycle\.id/);
    expect(body).toMatch(/status = 'writing', replan_count = replan_count \+ 1/);
    expect(body).not.toMatch(/current_cycle_id = NULL/);
  });

  test('automatic replans refund only same-day draft chapters from quota', () => {
    expect(quotaRefundMigration).toMatch(/timezone\('Asia\/Ho_Chi_Minh', created_at\)::date = v_local_date/);
    expect(quotaRefundMigration).toMatch(/greatest\(0, v_job\.chapters_today - v_refund\)/);
    expect(quotaRefundMigration).toMatch(/'quotaRefunded', v_refund/);
  });

  test('a rejected opening rolls back only private work to the cycle checkpoint', () => {
    const body = migration.slice(
      migration.indexOf('FUNCTION public.restart_serial_opening'),
      migration.indexOf('FUNCTION public.release_serial_novel'),
    );
    expect(body).toMatch(/v_job\.status <> 'opening_review'/);
    expect(body).toMatch(/publication_state = 'draft'/);
    expect(body).toMatch(/bible = v_cycle\.checkpoint_bible/);
    expect(body).toMatch(/current_chapter = 0, current_cycle_id = v_cycle\.id/);
    expect(body).toMatch(/opening_reviewed_at = NULL/);
  });

  test('release requires an approved opening, a published first cycle and a cover', () => {
    const body = migration.slice(migration.indexOf('FUNCTION public.release_serial_novel'));
    expect(body).toMatch(/SERIAL_OPENING_NOT_APPROVED/);
    expect(body).toMatch(/cycle_number = 1 AND status = 'published'/);
    expect(body).toMatch(/SERIAL_VALID_COVER_REQUIRED/);
    expect(body).toMatch(/hidden = false/);
  });

  test('human resume atomically resets the bounded replan window', () => {
    expect(resumeMigration).toMatch(/FUNCTION public\.resume_serial_job/);
    expect(resumeMigration).toMatch(/v_job\.status <> 'paused'/);
    expect(resumeMigration).toMatch(/status = 'writing', replan_count = 0/);
    expect(resumeMigration).toMatch(/status = 'ready', consecutive_replans = 0, retry_count = 0/);
    expect(operator).toMatch(/rpc\('resume_serial_job'/);
    expect(adminRoute).toMatch(/rpc\('resume_serial_job'/);
  });

  test('human resume preserves audit feedback for the next planner', () => {
    expect(resumeFeedbackMigration).toMatch(/FUNCTION public\.resume_serial_job/);
    const update = resumeFeedbackMigration.slice(resumeFeedbackMigration.indexOf('UPDATE public.serial_jobs SET'));
    expect(update).not.toMatch(/last_error\s*=\s*NULL/);
    expect(resumeFeedbackMigration).toMatch(/feedbackPreserved/);
  });

  test('seed persists presentation data and refuses a duplicate slug', () => {
    expect(operator).toMatch(/description: premise\.presentation\.shortDescription/);
    expect(operator).toMatch(/cover_url: premise\.presentation\.coverPath/);
    expect(operator).toMatch(/genres: premise\.presentation\.tags/);
    expect(operator).toMatch(/seed is intentionally idempotent/);
  });

  test('CLI and admin expose explicit restart and release actions', () => {
    expect(operator).toMatch(/restart-opening/);
    expect(operator).toMatch(/release_serial_novel/);
    expect(operator).toMatch(/runSerialTicks/);
    expect(operator).toMatch(/case 'tick'/);
    expect(operator).toMatch(/case 'reroute'/);
    expect(operator).toMatch(/reroute is allowed only before chapter 1/);
    expect(operator).toMatch(/case 'quota'/);
    expect(adminRoute).toMatch(/restart_serial_opening/);
    expect(adminRoute).toMatch(/release_serial_novel/);
    expect(adminPage).toMatch(/Bác và viết lại opening/);
    expect(adminPage).toMatch(/Công khai truyện/);
  });
});

describe('operator writes cannot report success without changing anything', () => {
  test('every update in serial-operator asserts how many rows it touched', () => {
    const source = readFileSync('scripts/serial-operator.ts', 'utf8');
    const updates = source.match(/\.update\(/g)?.length ?? 0;
    const checks = source.match(/expectRows\((?!result)/g)?.length ?? 0;
    expect(updates).toBeGreaterThan(0);
    expect(checks).toBe(updates);
  });
});

describe('stored opening audit', () => {
  test('what the runtime writes is what the operator reads back', () => {
    const audit = { passed: false, summary: 'Chương 4 giao lại hàng.', findings: [{
      kind: 'timeline' as const, chapterNumber: 4, quote: 'Đội Tro Tàn nhận đủ hàng', explain: 'Giao hai lần.', repair: 'Giữ một lần giao.',
    }] };
    const stored = JSON.parse(JSON.stringify(storedOpeningAudit(audit, { findings: [] })));
    expect(readStoredOpeningAudit(stored)).toEqual(audit);
    expect(readStoredOpeningAudit(null)).toBeNull();
  });
});
