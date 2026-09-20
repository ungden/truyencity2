import type { SupabaseClient } from '@supabase/supabase-js';
import type { StoryModelProvider } from '@/services/story-factory/provider';
import { editorialNotesFromError, mergeEditorialNotes, mergeRollingCyclePlan, runSerialTick, runSerialTicks, CYCLES_PER_VOLUME, serialFailureDisposition } from '@/services/serial/runtime';
import { StoryFactoryError } from '@/services/story-factory/contracts';
import { premise, baseBible, cycle } from './fixtures';
import { DEFAULT_SERIAL_ROUTES } from '@/services/serial/routes';

/**
 * A thenable stand-in for the Supabase query builder. Supabase's builder resolves when
 * awaited and chains everything else, so the fake only needs to record what was asked
 * for and hand back a scripted row.
 */
type Row = Record<string, unknown>;
interface Script {
  rows: Record<string, Row | Row[] | null>;
  rpc: Record<string, unknown>;
}

function fakeDb(script: Script) {
  const writes: Array<{ op: 'insert' | 'update'; table: string; value: Row }> = [];
  const rpcCalls: Array<{ fn: string; args: Row }> = [];

  const builder = (table: string) => {
    let pending: Row | null = null;
    const result = () => {
      const row = script.rows[table];
      return { data: Array.isArray(row) ? row : row ?? null, error: null };
    };
    const self: Record<string, unknown> = {
      select: () => self,
      eq: () => self,
      in: () => self,
      not: () => self,
      order: () => self,
      limit: () => self,
      insert: (value: Row) => { pending = value; writes.push({ op: 'insert', table, value }); return self; },
      update: (value: Row) => { pending = value; writes.push({ op: 'update', table, value }); return self; },
      delete: () => self,
      single: async () => result(),
      maybeSingle: async () => result(),
      then: (resolve: (value: unknown) => unknown) => resolve(pending ? { data: null, error: null } : result()),
    };
    return self;
  };

  const db = {
    from: (table: string) => builder(table),
    rpc: async (fn: string, args: Row) => {
      rpcCalls.push({ fn, args });
      return { data: script.rpc[fn] ?? null, error: null };
    },
  } as unknown as SupabaseClient;

  return { db, writes, rpcCalls };
}

const job = (over: Row = {}): Row => ({
  id: 'job1', serial_novel_id: 'sn1', novel_id: 'nv1',
  stage: 'write', current_chapter: 7, current_cycle_id: 'cy1',
  lease_token: 'lease-token', daily_target: 3, consecutive_replans: 0,
  ...over,
});

const novelRow = (): Row => ({
  id: 'sn1', premise, bible: baseBible(), routes: DEFAULT_SERIAL_ROUTES,
});

const unusedProvider = {
  async text() { throw new Error('unused'); },
  async json() { throw new Error('provider should not have been called'); },
} as unknown as StoryModelProvider;

describe('serial runtime', () => {
  test('audit feedback is split into bounded writer-visible notes', () => {
    const notes = editorialNotesFromError(`Opening audit failed: ${'a'.repeat(1_300)} | Ch.3 source missing`);
    expect(notes).toHaveLength(2);
    expect(notes[0]).toHaveLength(1_200);
    expect(notes[1]).toBe('Ch.3 source missing');
  });

  test('rolling plans inherit editorial notes after the job error is cleared', () => {
    expect(mergeEditorialNotes(['lỗi mới'], ['nguồn hàng phải có người giao', 'lỗi mới']))
      .toEqual(['lỗi mới', 'nguồn hàng phải có người giao']);
  });

  test('rolling plans replace only beats and cannot move a cycle boundary', () => {
    const active = cycle({
      cycleNumber: 1, volumeNumber: 1, startChapter: 1, plannedEndChapter: 10,
      pressure: 'Lời hứa ban đầu của chu kỳ.',
      editorialNotes: ['giữ nguồn hàng rõ'],
    });
    const rolling = cycle({
      cycleNumber: 1, volumeNumber: 1, startChapter: 10, plannedEndChapter: 16,
      pressure: 'Planner vô tình đổi lời hứa.',
      editorialNotes: ['khóa sổ đúng giá'],
      beatSheets: [{
        chapterNumber: 10,
        sceneMode: 'public_showcase',
        openingBridge: 'Trả ngay lời hẹn mang chiến lợi phẩm về chợ.',
        protagonistMove: 'Lâm Việt tự mở buổi đối chiếu giá trước đám đông.',
        beats: ['Khép trận bãi săn', 'Chốt hợp đồng'],
        materialOutcome: 'Hợp đồng bãi săn được ký và đặt cọc.',
        emotionalTarget: 'Chu kỳ kết thúc bằng thành quả nhìn thấy.',
        newNamedThing: 'Hợp đồng bãi săn',
        endHookKind: 'reward',
      }],
    });

    const merged = mergeRollingCyclePlan({
      active, rolling, cycleNumber: 1, volumeNumber: 1, startChapter: 1, endChapter: 10,
    });
    expect(merged).toMatchObject({
      startChapter: 1,
      plannedEndChapter: 10,
      pressure: 'Lời hứa ban đầu của chu kỳ.',
      beatSheets: rolling.beatSheets,
      editorialNotes: ['khóa sổ đúng giá', 'giữ nguồn hàng rõ'],
    });
  });

  test('rolling plans drop beat sheets beyond the immutable cycle end', () => {
    const active = cycle({
      cycleNumber: 1, volumeNumber: 1, startChapter: 1, plannedEndChapter: 10,
    });
    const rolling = cycle({
      cycleNumber: 1, volumeNumber: 1, startChapter: 9, plannedEndChapter: 13,
      beatSheets: [9, 10, 11].map((chapterNumber, index) => ({
        chapterNumber,
        sceneMode: (['transaction', 'hunt', 'public_showcase'] as const)[index],
        openingBridge: `Trả lời câu cuối chương ${chapterNumber - 1}.`,
        protagonistMove: `Lâm Việt chọn cách giải quyết mốc ${chapterNumber}.`,
        beats: ['Đưa lời hứa lên sân khấu', 'Trả kết quả nhìn thấy'],
        materialOutcome: `Mốc ${chapterNumber} tạo ra một kết quả có người nhận.`,
        emotionalTarget: 'Thỏa mãn vì lời hứa được thực hiện.',
        newNamedThing: `Mốc ${chapterNumber}`,
        endHookKind: 'reward' as const,
      })),
    });

    const merged = mergeRollingCyclePlan({
      active, rolling, cycleNumber: 1, volumeNumber: 1, startChapter: 1, endChapter: 10,
    });
    expect(merged.beatSheets.map(sheet => sheet.chapterNumber)).toEqual([9, 10]);
  });

  test('an empty queue is idle and costs nothing', async () => {
    const { db, rpcCalls } = fakeDb({ rows: {}, rpc: { claim_serial_job: null } });
    await expect(runSerialTick({ db, provider: unusedProvider })).resolves.toEqual({ status: 'idle' });
    expect(rpcCalls.map(call => call.fn)).toEqual(['claim_serial_job']);
  });

  test('the PostgREST literal null shape is also an empty queue', async () => {
    const { db } = fakeDb({ rows: {}, rpc: { claim_serial_job: 'null' } });
    await expect(runSerialTick({ db, provider: unusedProvider })).resolves.toEqual({ status: 'idle' });
  });

  test('a null composite row from PostgREST is also an empty queue', async () => {
    const { db } = fakeDb({ rows: {}, rpc: { claim_serial_job: { id: null, stage: null } } });
    await expect(runSerialTick({ db, provider: unusedProvider })).resolves.toEqual({ status: 'idle' });
  });

  test('the write stage returns to planning when the rolling beats run out', async () => {
    const { db, writes } = fakeDb({
      rows: {
        serial_novels: novelRow(),
        // Beats cover chapter 8 only; the job is already past it.
        serial_cycles: { id: 'cy1', plan: cycle(), start_chapter: 8, end_chapter: 16 },
      },
      rpc: { claim_serial_job: job({ current_chapter: 8 }) },
    });

    const result = await runSerialTick({ db, provider: unusedProvider });
    expect(result.status).toBe('completed');
    expect(result.detail).toMatch(/No beat sheet for chapter 9/);

    const release = writes.find(write => write.op === 'update' && write.table === 'serial_jobs');
    expect(release?.value).toMatchObject({ stage: 'plan_cycle', status: 'ready', lease_token: null });
  });

  test('a job with no open cycle is sent to planning rather than writing blind', async () => {
    const { db } = fakeDb({
      rows: { serial_novels: novelRow() },
      rpc: { claim_serial_job: job({ current_cycle_id: null }) },
    });
    const result = await runSerialTick({ db, provider: unusedProvider });
    expect(result.detail).toMatch(/No open cycle/);
  });

  test('publishing hands the job to volume folding on a volume boundary', async () => {
    const { db, rpcCalls } = fakeDb({
      rows: { serial_cycles: { cycle_number: CYCLES_PER_VOLUME } },
      rpc: {
        claim_serial_job: job({ stage: 'publish_cycle' }),
        publish_serial_cycle: { startChapter: 91, endChapter: 100 },
      },
    });
    const result = await runSerialTick({ db, provider: unusedProvider });
    expect(result.detail).toBe('Published chapters 91-100.');
    expect(rpcCalls.find(call => call.fn === 'publish_serial_cycle')?.args.p_next_stage).toBe('fold_volume');
  });

  test('publishing mid-volume goes straight back to planning the next cycle', async () => {
    const { db, rpcCalls } = fakeDb({
      rows: { serial_cycles: { cycle_number: 3 } },
      rpc: {
        claim_serial_job: job({ stage: 'publish_cycle' }),
        publish_serial_cycle: { startChapter: 21, endChapter: 30 },
      },
    });
    await runSerialTick({ db, provider: unusedProvider });
    expect(rpcCalls.find(call => call.fn === 'publish_serial_cycle')?.args.p_next_stage).toBe('plan_cycle');
  });

  test('folding a volume bounds the stored Bible and resumes planning', async () => {
    const { db, writes } = fakeDb({
      rows: { serial_novels: novelRow() },
      rpc: { claim_serial_job: job({ stage: 'fold_volume' }) },
    });
    const result = await runSerialTick({ db, provider: unusedProvider });
    expect(result.detail).toBe('Folded volume 1.');

    const saved = writes.find(write => write.table === 'serial_novels');
    const bible = saved?.value.bible as { recentSummary: unknown[]; volumeSummaries: unknown[] };
    expect(bible.volumeSummaries).toHaveLength(1);
    expect(bible.recentSummary.length).toBeLessThanOrEqual(3);
  });

  test('an invalid stage releases its lease and pauses instead of retrying the same bug forever', async () => {
    const { db, writes } = fakeDb({
      rows: {},
      rpc: { claim_serial_job: job({ stage: 'nonsense' }) },
    });
    const before = Date.now();
    const result = await runSerialTick({ db, provider: unusedProvider });

    expect(result.status).toBe('failed');
    expect(result.detail).toMatch(/Unknown serial stage nonsense/);
    const release = writes.find(write => write.table === 'serial_jobs');
    expect(release?.value).toMatchObject({ status: 'paused', lease_token: null, retry_count: 1 });
    // Backed off rather than retried immediately.
    expect(new Date(release?.value.next_run_at as string).getTime()).toBeGreaterThan(before + 4 * 60_000);
  });

  test('configuration and schema errors pause; transient errors have a cross-tick budget', () => {
    expect(serialFailureDisposition(new StoryFactoryError('infra_blocked', 'Bad key', { providerCredential: true }), 1)).toBe('paused');
    expect(serialFailureDisposition(new StoryFactoryError('infra_blocked', 'Bad output', { issues: ['wrong id'] }), 1)).toBe('paused');
    expect(serialFailureDisposition(new Error('Connection timed out'), 1)).toBe('ready');
    expect(serialFailureDisposition(new Error('Connection timed out'), 3)).toBe('paused');
  });

  test('planning receives failed verdicts with newest feedback first', async () => {
    const verdict = (note: string) => ({
      continuity: [], scorecard: { opening: 4, anticipation: 4, payoff: 4, newness: 4, endHook: 4 },
      craft: { protagonistAgency: 4, sceneLife: 4, worldLogic: 4, dialogueNaturalness: 4, structuralFreshness: 4 },
      repetition: [], aiFlavor: [], steering: [note],
    });
    const { db } = fakeDb({ rows: {
      serial_novels: novelRow(),
      serial_cycles: { id: 'cy1', cycle_number: 2, volume_number: 1, start_chapter: 8, end_chapter: 16, plan: cycle() },
      serial_runs: [
        { status: 'failed', verdict: verdict('Mới: sửa nguồn hàng đã bị chấm sai.') },
        { status: 'committed', verdict: verdict('Cũ: mở cơ hội mua bán tiếp theo.') },
      ],
    }, rpc: { claim_serial_job: job({ stage: 'plan_cycle' }) } });
    const prompts: string[] = [];
    const provider = { async json(args: { prompt: string }) {
      prompts.push(args.prompt);
      return { value: cycle(), usage: { model: 'test', inputTokens: 1, outputTokens: 1, costUsd: 0 } };
    } } as unknown as StoryModelProvider;
    const result = await runSerialTick({ db, provider });
    expect(result.status).toBe('completed');
    expect(prompts).toHaveLength(1);
    expect(prompts[0].indexOf('Mới:')).toBeLessThan(prompts[0].indexOf('Cũ:'));
    expect(prompts[0]).toContain('Mới: sửa nguồn hàng đã bị chấm sai.');
  });

  test('draining stops at the first idle claim', async () => {
    const { db } = fakeDb({ rows: {}, rpc: { claim_serial_job: null } });
    await expect(runSerialTicks({ db, provider: unusedProvider })).resolves.toEqual({ results: [], costUsd: 0 });
  });

  test('draining stops after a failure rather than burning the budget on it', async () => {
    const { db } = fakeDb({ rows: {}, rpc: { claim_serial_job: job({ stage: 'nonsense' }) } });
    const { results } = await runSerialTicks({ db, provider: unusedProvider });
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('failed');
  });
});
