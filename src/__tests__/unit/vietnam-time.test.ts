import { getVietnamDayBounds } from '@/lib/utils/vietnam-time';

describe('getVietnamDayBounds', () => {
  it('returns UTC bounds for the Vietnam calendar day without local timezone drift', () => {
    const bounds = getVietnamDayBounds(new Date('2026-05-08T11:22:26.917Z'));

    expect(bounds).toEqual({
      vnDate: '2026-05-08',
      startIso: '2026-05-07T17:00:00.000Z',
      endIso: '2026-05-08T16:59:59.999Z',
    });
  });

  it('uses the next Vietnam day after 17:00 UTC', () => {
    const bounds = getVietnamDayBounds(new Date('2026-05-08T17:00:00.000Z'));

    expect(bounds.vnDate).toBe('2026-05-09');
    expect(bounds.startIso).toBe('2026-05-08T17:00:00.000Z');
  });
});

