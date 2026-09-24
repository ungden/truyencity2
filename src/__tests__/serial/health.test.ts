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
    expect(serialIncidents({ jobs: [job()], enabled: true, now })).toEqual([]);
  });

  test('a paused story is one incident, keyed to the pause', () => {
    const [incident] = serialIncidents({
      jobs: [job({ status: 'paused', stage: 'plan_cycle', last_error: 'Contradiction survived one repair.' })],
      enabled: true, now,
    });
    expect(incident).toMatchObject({ kind: 'serial_paused', key: `serial:paused:job1:${minutesAgo(60)}` });
    expect(incident.message).toContain('Contradiction survived one repair.');
  });

  test('retired v3 stories and unapproved premises never alert', () => {
    expect(serialIncidents({
      jobs: [job({ schemaVersion: 3, status: 'paused' }), job({ id: 'job2', status: 'awaiting_approval' })],
      enabled: true, now,
    })).toEqual([]);
  });

  test('an opening waiting for a person is an incident', () => {
    expect(serialIncidents({ jobs: [job({ status: 'opening_review' })], enabled: true, now })[0].kind).toBe('serial_review');
  });

  test('a due job with quota left that the cron has not claimed is stalled; a full quota is not', () => {
    const stalled = job({ next_run_at: minutesAgo(45) });
    expect(serialIncidents({ jobs: [stalled], enabled: true, now })[0].kind).toBe('serial_stalled');
    expect(serialIncidents({ jobs: [{ ...stalled, chapters_today: 3 }], enabled: true, now })).toEqual([]);
    // Yesterday's count does not hold today's quota.
    expect(serialIncidents({ jobs: [{ ...stalled, chapters_today: 3, quota_date: '2026-09-24' }], enabled: true, now })[0].kind).toBe('serial_stalled');
  });

  test('a lease long past its end is an incident', () => {
    const [incident] = serialIncidents({ jobs: [job({ status: 'running', lease_until: minutesAgo(25) })], enabled: true, now });
    expect(incident.kind).toBe('serial_lease');
    expect(serialIncidents({ jobs: [job({ status: 'running', lease_until: minutesAgo(5) })], enabled: true, now })).toEqual([]);
  });

  test('a disabled engine with stories waiting is one incident, not one per story', () => {
    const incidents = serialIncidents({ jobs: [job(), job({ id: 'job2', next_run_at: minutesAgo(90) })], enabled: false, now });
    expect(incidents.map(item => item.kind)).toEqual(['serial_disabled']);
  });

  test('the same incident renders the same text, so a reused idempotency key never conflicts', () => {
    const stalled = job({ next_run_at: minutesAgo(45) });
    const first = serialIncidents({ jobs: [stalled], enabled: true, now })[0];
    const later = serialIncidents({ jobs: [stalled], enabled: true, now: new Date(now.getTime() + 15 * 60_000) })[0];
    expect(later).toEqual(first);
  });

  test('the health-check cron watches the Serial fleet and mails through the operator alert', () => {
    const route = readFileSync('src/app/api/cron/health-check/route.ts', 'utf8');
    expect(route).toMatch(/serialIncidents\(/);
    expect(route).toMatch(/notifyStoryFactoryOperator\(/);
    expect(route).toMatch(/idempotencyKey: incident\.key/);
  });
});
