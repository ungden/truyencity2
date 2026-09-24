import { existsSync, readdirSync, readFileSync } from 'node:fs';

/**
 * Every HTTP cron is scheduled here, next to its route. When pg_cron held them, deleting a
 * route left its schedule calling a 404 for months (generate-covers, memory-replay,
 * quality-trend; unscheduled 2026-09-25). A schedule without a route now fails CI.
 */
describe('vercel.json crons', () => {
  const { crons } = JSON.parse(readFileSync('vercel.json', 'utf8')) as { crons: Array<{ path: string; schedule: string }> };

  test('every scheduled path has a route', () => {
    for (const { path } of crons) {
      const route = `src/app${path.split('?')[0]}/route.ts`;
      expect({ path, route: existsSync(route) }).toEqual({ path, route: true });
    }
  });

  test('every cron route is scheduled', () => {
    const scheduled = new Set(crons.map(cron => cron.path.split('?')[0]));
    for (const name of readdirSync('src/app/api/cron')) {
      expect({ name, scheduled: scheduled.has(`/api/cron/${name}`) }).toEqual({ name, scheduled: true });
    }
  });
});
