import { readFileSync } from 'node:fs';

describe('Story Factory stalled-cron alert', () => {
  test('uses the shared full claim predicate for stalled-cron alerts', () => {
    const route = readFileSync('src/app/api/cron/story-factory/route.ts', 'utf8');

    expect(route).toContain("rpc('story_factory_claimable_queue_health'");
    expect(route).toContain('p_engine_release: STORY_FACTORY_RELEASE');
  });
});
