import { readFileSync } from 'fs';
import path from 'path';

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('legacy archive cannot be revived or read accidentally', () => {
  it('keeps archive mutation dry-run by default and excludes flagship projects', () => {
    const script = source('scripts/archive-all-legacy.ts');
    expect(script).toContain("process.argv.includes('--apply')");
    expect(script).toContain("pipeline_version !== 'flagship_v2'");
    expect(script).toContain("pipeline_version === 'flagship_v2'");
    expect(script).toContain('legacy_archived_rebuild_');
    expect(script).toContain('--restore=');
  });

  it('blocks cron and admin resume paths for archived projects', () => {
    const rotate = source('src/app/api/cron/daily-rotate/route.ts');
    const writer = source('src/app/api/cron/write-chapters/route.ts');
    const operations = source('src/app/api/admin/operations/route.ts');
    const toggle = source('src/app/api/admin/production-toggle/route.ts');
    expect(rotate).toContain("'legacy_archived_'");
    expect(writer).toContain("!candidate.pause_reason?.startsWith('legacy_archived_')");
    expect(writer).toContain('pause_reason.not.like.legacy_archived_*');
    expect(operations).toContain('legacy_archived_project_cannot_resume');
    expect(operations).toContain('legacy_archived_project_cannot_write');
    expect(toggle).toContain('legacy_archived_project_cannot_enable_production');
  });

  it('requires hidden=false on detail, reader and legacy redirect routes', () => {
    for (const file of [
      'src/app/truyen/[slug]/page.tsx',
      'src/app/truyen/[slug]/read/[chapter]/page.tsx',
      'src/app/truyen/[slug]/read/[chapter]/reading-page-client.tsx',
      'src/app/novel/[id]/page.tsx',
      'src/app/novel/[id]/read/[chapter]/page.tsx',
    ]) {
      expect(source(file)).toContain(".eq('hidden', false)");
    }
  });
});
