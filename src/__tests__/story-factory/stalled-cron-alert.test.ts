import { readFileSync } from 'node:fs';

describe('Story Factory stalled-cron alert', () => {
  test('does not count a job leased by another cron invocation as runnable', () => {
    const route = readFileSync('src/app/api/cron/story-factory/route.ts', 'utf8');

    expect(route).toContain(".in('status', ['setup', 'ready', 'finale'])");
    expect(route).toContain('.or(`lease_until.is.null,lease_until.lt.${checkedAt}`)');
  });
});
