import { z } from 'zod';
import { parseAfterTrimmingArrayOverflows } from '@/services/story-factory/provider';

describe('provider schema overflow recovery', () => {
  test('trims only overflowing arrays without mutating the provider payload', () => {
    const schema = z.object({
      beats: z.array(z.string()).max(2),
      chapters: z.array(z.object({ notes: z.array(z.string()).max(1) })).max(2),
    });
    const raw = {
      beats: ['one', 'two', 'three'],
      chapters: [
        { notes: ['keep', 'trim'] },
        { notes: ['also keep'] },
        { notes: ['drop chapter'] },
      ],
    };

    expect(parseAfterTrimmingArrayOverflows(schema, raw)?.data).toEqual({
      beats: ['one', 'two'],
      chapters: [{ notes: ['keep'] }, { notes: ['also keep'] }],
    });
    expect(raw).toEqual({
      beats: ['one', 'two', 'three'],
      chapters: [
        { notes: ['keep', 'trim'] },
        { notes: ['also keep'] },
        { notes: ['drop chapter'] },
      ],
    });
  });

  test('fails closed when any schema issue is not an array overflow', () => {
    const schema = z.object({ beats: z.array(z.string()).max(1), title: z.string() });
    expect(parseAfterTrimmingArrayOverflows(schema, { beats: ['one', 'two'], title: 9 })).toBeNull();
  });
});
