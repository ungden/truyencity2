import { readFileSync } from 'node:fs';
import { hoChiMinhDate, serialIncidents, type SerialJobHealthRow } from '@/services/serial/health';

const now = new Date('2026-09-25T02:00:00Z'); // 09:00 in Ho Chi Minh City
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

const job = (over: Partial<SerialJobHealthRow> = {}): SerialJobHealthRow => ({
  id: 'job1', title: 'Ngự Thú', schemaVersion: 2,
  status: 'ready', stage: 'write', current_chapter: 7,
  daily_target: 3, chapters_today: 1, quota_date: hoChiMinhDate(now),
  next_run_at: minutesAgo(2), lease_until: null, last_error: null,
  updated_at: minutesAgo(60),
  ...over,
});

describe('serial fleet health', () => {
  test('a healthy fleet is silent', () => {
    expect(serialIncidents({ jobs: [job()], enabled: true, now, lastRunAt: minutesAgo(3) })).toEqual([]);
  });

  test('a paused story is one incident, keyed to the pause', () => {
    const [incident] = serialIncidents({
      jobs: [job({ status: 'paused', stage: 'plan_cycle', last_error: 'Contradiction survived one repair.' })],
      enabled: true, now, lastRunAt: minutesAgo(3),
    });
    expect(incident).toMatchObject({ kind: 'serial_paused', key: `serial:paused:job1:${minutesAgo(60)}` });
    expect(incident.message).toContain('Contradiction survived one repair.');
  });

  test('retired v3 stories and unapproved premises never alert', () => {
    expect(serialIncidents({
      jobs: [job({ schemaVersion: 3, status: 'paused' }), job({ id: 'job2', status: 'awaiting_approval' })],
      enabled: true, now, lastRunAt: minutesAgo(3),
    })).toEqual([]);
  });

  test('an opening waiting for a person is an incident', () => {
    expect(serialIncidents({ jobs: [job({ status: 'opening_review' })], enabled: true, now, lastRunAt: minutesAgo(3) })[0].kind).toBe('serial_review');
  });

  test('midnight is not a stall: every quota resets at once and the cron drains stories in turn', () => {
    // 2026-09-26 00:00: five stories with yesterday's full quota and yesterday's next_run_at.
    const fleet = [1, 2, 3, 4, 5].map(n => job({
      id: `job${n}`, quota_date: '2026-09-25', chapters_today: 3, next_run_at: '2026-09-24T18:30:00Z',
    }));
    const yesterdaysLastRun = '2026-09-24T18:40:00Z';
    const at = (vn: string) => new Date(`2026-09-26T${vn}:00+07:00`);
    expect(serialIncidents({ jobs: fleet, enabled: true, now: at('00:00'), lastRunAt: yesterdaysLastRun })).toEqual([]);
    // 00:30: the last story still waits its turn, but the cron started a run at 00:25.
    expect(serialIncidents({ jobs: fleet, enabled: true, now: at('00:31'), lastRunAt: '2026-09-25T17:25:00Z' })).toEqual([]);
    // 00:45 with nothing run since yesterday: that is a dead cron.
    expect(serialIncidents({ jobs: fleet, enabled: true, now: at('00:45'), lastRunAt: yesterdaysLastRun })[0].kind).toBe('serial_stalled');
  });

  test('a stall is one fleet incident: stories long due and no run started lately', () => {
    const due = job({ next_run_at: minutesAgo(45) });
    const [incident] = serialIncidents({ jobs: [due, job({ id: 'job2', next_run_at: minutesAgo(50) })], enabled: true, now, lastRunAt: minutesAgo(40) });
    expect(incident).toMatchObject({ kind: 'serial_stalled', key: `serial:stalled:${minutesAgo(40)}` });
    expect(serialIncidents({ jobs: [due], enabled: true, now, lastRunAt: null })[0].kind).toBe('serial_stalled');
    // A full quota is not due; yesterday's full quota is.
    expect(serialIncidents({ jobs: [{ ...due, chapters_today: 3 }], enabled: true, now, lastRunAt: minutesAgo(40) })).toEqual([]);
  });

  test('a lease long past its end is an incident', () => {
    const [incident] = serialIncidents({ jobs: [job({ status: 'running', lease_until: minutesAgo(25) })], enabled: true, now, lastRunAt: minutesAgo(3) });
    expect(incident.kind).toBe('serial_lease');
    expect(serialIncidents({ jobs: [job({ status: 'running', lease_until: minutesAgo(5) })], enabled: true, now, lastRunAt: minutesAgo(3) })).toEqual([]);
  });

  test('a disabled engine with stories waiting is one incident, not one per story', () => {
    const incidents = serialIncidents({ jobs: [job(), job({ id: 'job2', next_run_at: minutesAgo(90) })], enabled: false, now, lastRunAt: minutesAgo(3) });
    expect(incidents.map(item => item.kind)).toEqual(['serial_disabled']);
  });

  test('the same incident renders the same text, so a reused idempotency key never conflicts', () => {
    const stalled = job({ next_run_at: minutesAgo(45) });
    const first = serialIncidents({ jobs: [stalled], enabled: true, now, lastRunAt: minutesAgo(40) })[0];
    const later = serialIncidents({
      jobs: [stalled, job({ id: 'job2', next_run_at: minutesAgo(60) })], enabled: true,
      now: new Date(now.getTime() + 15 * 60_000), lastRunAt: minutesAgo(40),
    })[0];
    expect(later).toEqual(first);
  });

  test('the health-check cron watches the Serial fleet and mails through the operator alert', () => {
    const route = readFileSync('src/app/api/cron/health-check/route.ts', 'utf8');
    expect(route).toMatch(/serialIncidents\(/);
    expect(route).toMatch(/notifyStoryFactoryOperator\(/);
    expect(route).toMatch(/idempotencyKey: incident\.key/);
  });
});
