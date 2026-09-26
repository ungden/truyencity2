import type { SupabaseClient } from '@supabase/supabase-js';
import type { StoryModelProvider } from '@/services/story-factory/provider';
import { editorialNotesFromError, mergeEditorialNotes, mergeRollingCyclePlan, runSerialTick, runSerialTicks, CYCLES_PER_VOLUME, serialFailureDisposition } from '@/services/serial/runtime';
import { StoryFactoryError } from '@/services/story-factory/contracts';
import { premise, baseBible, cycle, digest as chapterDigest } from './fixtures';
import { DEFAULT_SERIAL_ROUTES } from '@/services/serial/routes';
import { CyclePlanSchema, PremiseSchema } from '@/services/serial/contracts';
import { NARRATIVE_FOUNDATION_VERSION } from '@/services/narrative/foundation';
import { seedBible } from '@/services/serial/state';

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
      gte: () => self,
      lte: () => self,
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

const livedPremise = () => {
  const protagonistId = premise.castSeed.find(member => member.role === 'protagonist')!.id;
  return PremiseSchema.parse({
    ...premise,
    schemaVersion: 3,
    narrativeFoundation: {
      craftProfile: { version: NARRATIVE_FOUNDATION_VERSION, genre: 'two_world_commerce' },
      commerceFantasy: {
        protectedStore: {
          ownerCharacterId: protagonistId,
          domain: 'Toàn bộ cửa hàng nối hai giới thuộc quyền tuyệt đối của Lâm Việt.',
          protections: [
            'hostile_action_nullified', 'forced_entry_denied', 'theft_blocked',
            'surveillance_blocked', 'owner_can_eject', 'unpaid_goods_recalled',
          ],
          outsideRisk: 'Ngoài cửa hàng, Lâm Việt vẫn chịu nguy hiểm và luật lệ bình thường của từng thế giới.',
        },
        valueContrasts: [
          {
            id: 'hang_pho_thuong_sang_mat_the',
            sourceWorldId: premise.worldKernel.worlds[0]!.id,
            destinationWorldId: premise.worldKernel.worlds[1]!.id,
            item: 'Thuốc và vật dụng phổ thông',
            ordinaryAtSource: 'Đây là hàng quen thuộc có thể mua hoặc chuẩn bị đều ở thế giới nguồn.',
            valuableAtDestination: 'Nó giải quyết một thiếu hụt cấp thiết và được khách trực tiếp nhận ra.',
            experienceProof: 'Khách dùng đúng công dụng trước quầy rồi mới tự quyết định mua.',
            commercialConsequence: 'Kết quả thật dẫn tới lần quay lại với đơn lớn hơn.',
          },
          {
            id: 'tai_nguyen_mat_the_hoi_luu',
            sourceWorldId: premise.worldKernel.worlds[1]!.id,
            destinationWorldId: premise.worldKernel.worlds[0]!.id,
            item: 'Tài nguyên tiến hóa',
            ordinaryAtSource: 'Đội săn coi đây là chiến lợi phẩm có thể đổi sau mỗi chuyến đi.',
            valuableAtDestination: 'Nguồn tài nguyên này lại hiếm và có người biết dùng ở thế giới còn lại.',
            experienceProof: 'Người có nghề kiểm một mẫu rồi chứng minh đúng một công dụng.',
            commercialConsequence: 'Giá mua rõ ràng tạo vòng thu mua hai chiều.',
          },
        ],
        simplicityRules: {
          sharedLanguage: true,
          compressRepeatedVerification: true,
          noRoutinePermissionPlots: true,
          noUnseededSubsystems: true,
        },
      },
      characters: [{
        characterId: protagonistId,
        background: 'Lâm Việt lớn lên trong một cửa hàng nhỏ và quen tự kiểm hàng.',
        presentLife: 'Anh đang giữ cửa hàng, kiểm tồn kho và xoay dòng tiền từng ngày.',
        existingCompetence: 'Anh biết so giá, ghi sổ và kiểm chất lượng hàng phổ thông.',
        limitsOfKnowledge: 'Anh không biết công nghệ cao và chưa hiểu quy tắc của thế giới bên kia.',
        relationships: 'Anh còn giữ liên hệ với người giao hàng và vài khách quen trong phố.',
        habits: 'Anh ghi mã lô, chụp tem và luôn thử món mới ở quy mô nhỏ.',
        desireBeforeAdvantage: 'Anh muốn cửa hàng sống được mà không phải bán tài sản gia đình.',
      }],
      livedWorlds: premise.worldKernel.worlds.map(world => ({
        worldId: world.id,
        everydayLife: 'Người dân ăn ở, mua bán và đi lại theo nhịp riêng trước khi main xuất hiện.',
        livelihoods: 'Cửa hàng, đội săn và thợ thủ công tạo ra sinh kế của địa phương.',
        infrastructure: 'Kho, đường vận chuyển và cơ chế kiểm định giới hạn hàng có thể lưu thông.',
        inequality: 'Quyền tiếp cận vốn và vật tư khác nhau giữa người lao động và tổ chức lớn.',
        institutionsWithoutProtagonist: 'Thành Vệ và thương hội vẫn tranh nguồn hàng theo lợi ích riêng.',
      })),
      advantageDiscovery: {
        acquisitionEvent: 'Lâm Việt phát hiện cánh cửa lạ khi kiểm kho sau giờ đóng cửa.',
        initialReaction: 'Anh khóa cửa, đánh dấu đồ vật và kiểm tra một hiện tượng nhỏ trước.',
        firstExperiments: ['Đưa một vật đánh dấu qua ngưỡng rồi kiểm đường quay về.'],
        initiallyKnownFactIds: [],
        unresolvedOrigin: 'Anh chưa biết ai tạo ra cánh cửa và vì sao nó nối hai nơi.',
      },
      facts: [{
        id: 'cua_hai_gioi', truth: 'Cánh cửa nối hai kho và cho phép quay về.',
        initiallyKnownByCharacterIds: [], revealThrough: 'Hai phép thử có đánh dấu được diễn trên trang.',
      }],
      milestones: [{
        id: 'kiem_chung_cua', intention: 'Lâm Việt tin cánh cửa tồn tại sau phép thử.',
        prerequisiteIds: ['cua_hai_gioi'], evidenceNeeded: 'Hai lần thử và đường quay về đều xuất hiện.',
      }],
    },
  });
};

const livedCycle = () => {
  const base = cycle({ cycleNumber: 1, startChapter: 1, plannedEndChapter: 5 });
  return CyclePlanSchema.parse({
    ...base,
    schemaVersion: 2,
    customerLoop: null,
    beatSheets: [1, 2, 3].map(chapterNumber => ({
      ...base.beatSheets[0], chapterNumber,
      sceneMode: 'discovery', prerequisiteIds: [], revealsFactIds: [], advancesMilestoneIds: [],
    })),
  });
};

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
        prerequisiteIds: [],
        revealsFactIds: [],
        advancesMilestoneIds: [],
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
        prerequisiteIds: [],
        revealsFactIds: [],
        advancesMilestoneIds: [],
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

  test('extractor failure preserves the private prose and never replans or deletes the cycle', async () => {
    // A digest for the wrong chapter is the one extractor error that cannot be set aside.
    const badDigest = {
      chapterNumber: 9,
      title: 'Ca kiểm hàng',
      summary: 'Lâm Việt kiểm hàng rồi ghi sổ.',
      payoffKind: null,
      endedOn: 'Anh khép sổ.',
      newNamedThings: [],
      narrativeEvidence: [],
      coreChanges: {
        storyDayDelta: 0, died: [], progressionChanges: [], assetEvents: [],
        goldenFingerRungChange: null, moved: [], worldFactsRevealed: [], newCast: [],
        hooksPlanted: [], hooksPaid: ['hook_khong_ton_tai'], learnedFinger: [],
      },
    };
    const prose = 'Lâm Việt kiểm từng kiện hàng, ghi lại dấu niêm phong rồi khép sổ. '.repeat(20);
    const provider = {
      async text() { throw new Error('unused'); },
      async json<T>(input: { system: string; model: string }) {
        const value = input.system.startsWith('Bạn là tác giả')
          ? { title: 'Ca kiểm hàng', content: prose }
          : input.system.startsWith('Bạn đọc và soát')
            ? {
                reviewBinding: { chapterNumber: 8, title: 'Ca kiểm hàng', excerpt: prose.slice(0, 40) },
                continuity: [],
                scorecard: { opening: 4, anticipation: 4, payoff: 3, newness: 3, endHook: 3 },
                craft: { protagonistAgency: 4, sceneLife: 4, worldLogic: 4, dialogueNaturalness: 4, structuralFreshness: 3 },
                repetition: [], aiFlavor: [], steering: [],
              }
            : badDigest;
        return {
          value: value as T,
          usage: { model: input.model, inputTokens: 1, outputTokens: 1, costUsd: 0.01, finishReason: 'STOP' },
        };
      },
    } as StoryModelProvider;
    const { db, writes, rpcCalls } = fakeDb({
      rows: {
        serial_novels: novelRow(),
        serial_cycles: { id: 'cy1', plan: cycle(), start_chapter: 8, end_chapter: 16 },
        serial_runs: { id: 'run1' },
        chapters: null,
      },
      rpc: { claim_serial_job: job() },
    });
    const result = await runSerialTick({ db, provider });
    expect(result.detail).toMatch(/Paused with private extractor artifact/);
    expect(rpcCalls.map(call => call.fn)).not.toContain('replan_serial_cycle');
    const saved = writes.find(write => write.table === 'serial_runs' && write.op === 'update');
    expect(saved?.value).toMatchObject({
      status: 'failed',
      draft_artifact: { reviewKind: 'extractor', chapter: { content: prose.trim() } },
    });
    const parked = writes.filter(write => write.table === 'serial_jobs').at(-1);
    expect(parked?.value).toMatchObject({ status: 'paused' });
  });

  test('a chapter that fails twice replans from itself, never erasing the chapters before it', async () => {
    const prose = 'Lâm Việt kiểm từng kiện hàng, ghi lại dấu niêm phong rồi khép sổ. '.repeat(20);
    const provider = {
      async text() { throw new Error('unused'); },
      async json<T>(input: { system: string; model: string }) {
        const value = input.system.startsWith('Bạn đọc và soát')
          ? {
              reviewBinding: { chapterNumber: 8, title: 'Ca kiểm hàng', excerpt: prose.slice(0, 40) },
              continuity: [{
                kind: 'golden_finger_scope', quote: prose.slice(0, 40),
                explain: 'Bảng đọc vượt nấc đã duyệt.',
              }],
              scorecard: { opening: 4, anticipation: 4, payoff: 3, newness: 3, endHook: 3 },
              craft: { protagonistAgency: 4, sceneLife: 4, worldLogic: 4, dialogueNaturalness: 4, structuralFreshness: 3 },
              repetition: [], aiFlavor: [], steering: [],
            }
          : { title: 'Ca kiểm hàng', content: prose };
        return {
          value: value as T,
          usage: { model: input.model, inputTokens: 1, outputTokens: 1, costUsd: 0.01, finishReason: 'STOP' },
        };
      },
    } as StoryModelProvider;
    const { db, rpcCalls } = fakeDb({
      rows: {
        serial_novels: novelRow(),
        serial_cycles: { id: 'cy1', plan: cycle(), start_chapter: 8, end_chapter: 16 },
        serial_runs: { id: 'run1' },
        chapters: null,
      },
      rpc: { claim_serial_job: job({ current_chapter: 7 }) },
    });
    const result = await runSerialTick({ db, provider });
    expect(result.detail).toMatch(/Replanned cycle/);
    const replan = rpcCalls.find(call => call.fn === 'replan_serial_cycle');
    expect(replan?.args).toMatchObject({ p_cycle_id: 'cy1', p_from_chapter: 8 });
  });

  test('the next tick consumes an extractor checkpoint instead of calling Writer and Judge again', async () => {
    const verdict = {
      continuity: [],
      scorecard: { opening: 4, anticipation: 4, payoff: 3, newness: 3, endHook: 3 },
      craft: { protagonistAgency: 4, sceneLife: 4, worldLogic: 4, dialogueNaturalness: 4, structuralFreshness: 3 },
      repetition: [], aiFlavor: [], steering: [],
    };
    const systems: string[] = [];
    const provider = {
      async text() { throw new Error('unused'); },
      async json<T>(input: { system: string; model: string }) {
        systems.push(input.system);
        if (!input.system.startsWith('Bạn đọc một chương vừa viết xong')) throw new Error('Writer or Judge was called after checkpoint resume.');
        return {
          value: chapterDigest() as T,
          usage: { model: input.model, inputTokens: 1, outputTokens: 1, costUsd: 0.01, finishReason: 'STOP' },
        };
      },
    } as StoryModelProvider;
    const { db, rpcCalls } = fakeDb({
      rows: {
        serial_novels: novelRow(),
        serial_cycles: { id: 'cy1', plan: cycle(), start_chapter: 8, end_chapter: 16, checkpoint_bible: baseBible() },
        serial_runs: {
          id: 'run2',
          draft_artifact: {
            schemaVersion: 1, resumeFrom: 'extractor', attempts: 1,
            chapter: { chapterNumber: 8, title: 'Ca kiểm hàng', content: 'x'.repeat(900) },
            verdict,
          },
        },
        chapters: null,
      },
      rpc: { claim_serial_job: job(), commit_serial_chapter: { chapterNumber: 8 } },
    });
    const result = await runSerialTick({ db, provider });
    expect(result.detail).toContain('Ca kiểm hàng');
    expect(systems).toHaveLength(1);
    expect(rpcCalls.map(call => call.fn)).toContain('commit_serial_chapter');
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

  test('a tick without time for the Writer defers without opening a run or counting a failure', async () => {
    const { db, writes } = fakeDb({
      rows: {
        serial_novels: novelRow(),
        serial_cycles: { id: 'cy1', plan: cycle(), start_chapter: 8, end_chapter: 16 },
        serial_runs: null,
        chapters: null,
      },
      rpc: { claim_serial_job: job({ retry_count: 2 }) },
    });
    const result = await runSerialTick({ db, provider: unusedProvider, deadline: Date.now() + 5_000 });
    expect(result.status).toBe('deferred');
    expect(writes.some(write => write.table === 'serial_runs' && write.op === 'insert')).toBe(false);
    expect(writes.filter(write => write.table === 'serial_jobs').at(-1)?.value).toMatchObject({ status: 'ready', retry_count: 2 });
  });

  test('a retired lived-causality premise pauses before planning or writing spends anything', async () => {
    for (const stage of ['plan_cycle', 'write'] as const) {
      const { db, writes } = fakeDb({
        rows: { serial_novels: { ...novelRow(), premise: livedPremise() } },
        rpc: { claim_serial_job: job({ stage }) },
      });
      const result = await runSerialTick({ db, provider: unusedProvider });
      expect(result.detail).toMatch(/lived-causality đã ngừng dùng/);
      expect(writes.filter(write => write.table === 'serial_jobs').at(-1)?.value).toMatchObject({ status: 'paused' });
    }
  });

  const pullVerdict = (score: number) => ({
    continuity: [],
    scorecard: { opening: score, anticipation: score, payoff: score, newness: score, endHook: score },
    craft: { protagonistAgency: 4, sceneLife: 4, worldLogic: 4, dialogueNaturalness: 4, structuralFreshness: 4 },
    repetition: [], aiFlavor: [], steering: [],
  });
  const heldCycle = (narrativeReview: unknown) => ({
    id: 'cy1', cycle_number: 3, start_chapter: 21, end_chapter: 30, narrative_review: narrativeReview,
    plan: cycle({ cycleNumber: 3, startChapter: 21, plannedEndChapter: 30, beatSheets: [{
      ...cycle().beatSheets[0], chapterNumber: 21,
    }] }),
  });

  test('a second low-pull cycle in a row stays private for a person to read', async () => {
    const { db, writes, rpcCalls } = fakeDb({
      rows: {
        serial_cycles: heldCycle(null),
        serial_runs: [{ chapter_number: 21, verdict: pullVerdict(2) }, { chapter_number: 22, verdict: pullVerdict(1) }],
      },
      rpc: { claim_serial_job: job({ stage: 'publish_cycle' }), publish_serial_cycle: { startChapter: 21, endChapter: 30 } },
    });
    const result = await runSerialTick({ db, provider: unusedProvider });
    expect(result.detail).toMatch(/Hai chu kỳ liền có điểm kéo đọc dưới 2.5/);
    expect(rpcCalls.map(call => call.fn)).not.toContain('publish_serial_cycle');
    expect(writes.find(write => write.table === 'serial_cycles')?.value).toMatchObject({ narrative_review: { lowPullHold: { current: 1.5 } } });
    expect(writes.filter(write => write.table === 'serial_jobs').at(-1)?.value).toMatchObject({ status: 'paused' });
  });

  test('resuming a held cycle is the decision to publish it', async () => {
    const { db, rpcCalls } = fakeDb({
      rows: {
        serial_cycles: heldCycle({ lowPullHold: { at: '2026-09-23T00:00:00.000Z', current: 1.5, previous: 1.5 } }),
        serial_runs: [{ chapter_number: 21, verdict: pullVerdict(1) }],
      },
      rpc: { claim_serial_job: job({ stage: 'publish_cycle' }), publish_serial_cycle: { startChapter: 21, endChapter: 30 } },
    });
    const result = await runSerialTick({ db, provider: unusedProvider });
    expect(result.detail).toBe('Published chapters 21-30.');
    expect(rpcCalls.map(call => call.fn)).toContain('publish_serial_cycle');
  });

  test('a strong cycle publishes without a hold', async () => {
    const { db, rpcCalls } = fakeDb({
      rows: { serial_cycles: heldCycle(null), serial_runs: [{ chapter_number: 21, verdict: pullVerdict(4) }] },
      rpc: { claim_serial_job: job({ stage: 'publish_cycle' }), publish_serial_cycle: { startChapter: 21, endChapter: 30 } },
    });
    await runSerialTick({ db, provider: unusedProvider });
    expect(rpcCalls.map(call => call.fn)).toContain('publish_serial_cycle');
  });

  test('a lived-causality cycle is reviewed with its plan before publish and blocking prose keeps every draft private', async () => {
    const v3 = livedPremise();
    const plan = livedCycle();
    const bible = seedBible({ premise: v3 });
    bible.symbolicCore.chapterNumber = 5;
    const chapters = Array.from({ length: 5 }, (_, index) => ({
      chapter_number: index + 1,
      title: `Phép thử ${index + 1}`,
      content: `Lâm Việt đánh dấu chai nước trong phép thử ${index + 1} rồi ghi kết quả vào sổ.`,
    }));
    const prompts: Array<Record<string, unknown>> = [];
    const provider = {
      async text() { throw new Error('unused'); },
      async json<T>(input: { prompt: string; model: string }) {
        prompts.push(JSON.parse(input.prompt) as Record<string, unknown>);
        return {
          value: {
            findings: [{
              target: 'prose', kind: 'unlived_scene', severity: 'blocking', chapterNumber: 5,
              quote: 'Lâm Việt đánh dấu chai nước trong phép thử 5 rồi ghi kết quả vào sổ.',
              explanation: 'Lựa chọn quan trọng bị nén thành một câu.',
              direction: 'Giữ draft riêng tư và diễn phép thử trước khi xuất bản.',
            }],
            readerAssessment: {
              protagonist: 'Lâm Việt có mục tiêu rõ.', world: 'Hai thế giới có đời sống riêng.',
              causality: 'Phép thử cuối bị bỏ bước.', sceneLife: 'Cảnh cuối bị kể tắt quá nhanh.',
              desireToContinue: 'Cần thấy phép thử được thực hiện.',
            },
          } as T,
          usage: { model: input.model, inputTokens: 10, outputTokens: 5, costUsd: 0.01, finishReason: 'STOP' },
        };
      },
    } as StoryModelProvider;
    const { db, writes, rpcCalls } = fakeDb({
      rows: {
        serial_novels: { id: 'sn1', premise: v3, bible, routes: DEFAULT_SERIAL_ROUTES },
        serial_cycles: {
          id: 'cy1', cycle_number: 1, start_chapter: 1, end_chapter: 5,
          plan, plan_history: [plan], checkpoint_bible: seedBible({ premise: v3 }),
          narrative_review: null, narrative_review_fingerprint: null,
        },
        chapters,
      },
      rpc: { claim_serial_job: job({ stage: 'publish_cycle', current_chapter: 5 }) },
    });
    const result = await runSerialTick({ db, provider });
    expect(result.detail).toMatch(/paused publication/);
    expect(rpcCalls.map(call => call.fn)).not.toContain('publish_serial_cycle');
    expect(writes.find(write => write.table === 'serial_cycles' && write.op === 'update')?.value)
      .toMatchObject({ narrative_review: { findings: [expect.objectContaining({ target: 'prose' })] } });
    expect(writes.filter(write => write.table === 'serial_jobs').at(-1)?.value).toMatchObject({ status: 'paused' });
    expect(prompts[0]).toMatchObject({
      approvedPlan: [expect.objectContaining({ schemaVersion: 2 })],
      stateAtSequenceStart: { chapterNumber: 0 },
      durableNarrativeState: { revealedNarrativeIds: [] },
    });
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

  test('planning is driven by the premise ladder and never by the Judge', async () => {
    const verdict = (note: string) => ({
      continuity: [], scorecard: { opening: 4, anticipation: 4, payoff: 4, newness: 4, endHook: 4 },
      craft: { protagonistAgency: 4, sceneLife: 4, worldLogic: 4, dialogueNaturalness: 4, structuralFreshness: 4 },
      repetition: [], aiFlavor: [], steering: [note],
    });
    const { db } = fakeDb({ rows: {
      serial_novels: novelRow(),
      serial_cycles: { id: 'cy1', cycle_number: 2, volume_number: 1, start_chapter: 8, end_chapter: 16, plan: cycle() },
      serial_runs: [{ status: 'committed', verdict: verdict('Buộc đối phương ghi rõ điều khoản và đóng dấu biên bản.') }],
    }, rpc: { claim_serial_job: job({ stage: 'plan_cycle' }) } });
    const prompts: string[] = [];
    const provider = { async json(args: { prompt: string }) {
      prompts.push(args.prompt);
      return { value: cycle(), usage: { model: 'test', inputTokens: 1, outputTokens: 1, costUsd: 0 } };
    } } as unknown as StoryModelProvider;
    const result = await runSerialTick({ db, provider });
    expect(result.status).toBe('completed');
    expect(prompts).toHaveLength(1);
    expect(prompts[0]).not.toContain('điều khoản và đóng dấu biên bản');
    expect(prompts[0]).toContain('loiHuaCotLoi');
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
