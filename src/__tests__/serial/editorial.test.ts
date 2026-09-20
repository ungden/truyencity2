import type { StoryModelProvider } from '@/services/story-factory/provider';
import { EditorialReviewSchema, rewriteChapterEditorially, type EditorialRewriteInput } from '@/services/serial/editorial';
import { applyEditorialPatch, factsForChapter, selectEditorialRepairChapters } from '@/services/serial/editorial-policy';
import { EDITORIAL_PILOTS } from '@/services/serial/editorial-pilots';
import { premise } from './fixtures';

const chapter = { title: 'Khách trở lại', content: `Chu Dã mua lá phù. ${'Một câu truyện có hành động. '.repeat(240)}`.trim() };
const review = (issues: unknown[] = [], overrides: Record<string, number> = {}) => EditorialReviewSchema.parse({
  scores: { protagonistAgency: 4, sceneLife: 4, worldLogic: 4, dialogueNaturalness: 4,
    structuralFreshness: 4, customerMomentum: 4, payoff: 4, continuity: 4, ...overrides },
  issues, summary: 'Khách đã kiếm được tiền và quay lại mua hàng cao hơn.',
});
const issue = (overrides = {}) => ({
  severity: 'important', target: 'prose', quote: 'Chu Dã mua lá phù.',
  explain: 'Cần hiện phần tài nguyên hắn vừa tự kiếm được.',
  positiveDirection: 'Chu Dã đặt tinh hạch đã săn được lên quầy.', ...overrides,
});
const input = (overrides: Partial<EditorialRewriteInput> = {}): EditorialRewriteInput => ({
  premise, chapterNumber: 8, chapter, previousTail: '', nextHead: '',
  canonicalDigest: { summary: 'STALE_DIGEST' }, plannedBeat: { text: 'STALE_BEAT' },
  direction: ['Chu Dã dùng chiến lợi phẩm mua phù.'], model: 'test', ...overrides,
});
const provider = (...values: unknown[]) => {
  const calls: Array<{ prompt: string }> = [];
  return { calls, text: jest.fn(), async json(args: { prompt: string }) {
    calls.push(args);
    if (!values.length) throw new Error('Unexpected paid call');
    return { value: values.shift(), usage: { model: 'test', inputTokens: 10, outputTokens: 10, costUsd: 0.01 } };
  } } as unknown as StoryModelProvider & { calls: Array<{ prompt: string }> };
};

describe('editorial learning and retry policy', () => {
  test('retry selection ignores superseded and digest-only findings', () => {
    const chapters = [{ chapterNumber: 8, newContent: chapter.content }];
    expect(selectEditorialRepairChapters(chapters, [{ ...issue(), chapterNumber: 8 }])).toEqual([8]);
    expect(selectEditorialRepairChapters(chapters, [{ ...issue({ quote: 'Digest nói đã có tám tuần.' }), chapterNumber: 8 }])).toEqual([]);
    expect(selectEditorialRepairChapters(chapters, [{ ...issue({ target: 'context' }), chapterNumber: 8 }])).toEqual([]);
  });
  test('clean output costs one write and one review, with no stale digest/beat in either prompt', async () => {
    const model = provider(chapter, review());
    const result = await rewriteChapterEditorially(model, input());
    expect(result.accepted).toBe(true);
    expect(model.calls).toHaveLength(2);
    expect(JSON.stringify(model.calls)).not.toMatch(/STALE_DIGEST|STALE_BEAT/);
  });

  test('conflicting canon is rejected before the first paid call', async () => {
    const model = provider();
    const canon = ['Đan đồ', 'Nhất giai'].map(value => ({ key: 'profession', fromChapter: 9, throughChapter: 9, value }));
    await expect(rewriteChapterEditorially(model, input({ chapterNumber: 9, canon }))).rejects.toThrow('EDITORIAL_CANON_CONFLICT');
    expect(model.calls).toHaveLength(0);
  });

  test.each([
    issue({ target: 'context' }),
    issue({ quote: 'Câu chỉ có trong chương kế tiếp cũ.' }),
  ])('context/evidence errors do not trigger a prose retry', async finding => {
    const model = provider(chapter, review([finding]));
    const result = await rewriteChapterEditorially(model, input());
    expect(result.decision).toBe('context_review');
    expect(result.accepted).toBe(false);
    expect(model.calls).toHaveLength(2);
  });

  test('a low score without a diagnosis retains the quality gate without guessing a rewrite', async () => {
    const model = provider(chapter, review([], { sceneLife: 3 }));
    const result = await rewriteChapterEditorially(model, input());
    expect(result.accepted).toBe(false);
    expect(result.decision).toBe('needs_review');
    expect(model.calls).toHaveLength(2);
  });

  test('repairing an existing candidate patches only the diagnosed text', async () => {
    const model = provider(review([issue()]), {
      edits: [{ before: 'Chu Dã mua lá phù.', after: 'Chu Dã đặt tinh hạch vừa săn được lên quầy mua lá phù.' }],
    }, review());
    const result = await rewriteChapterEditorially(model, input({ mode: 'repair' }));
    expect(result.accepted).toBe(true);
    expect(result.attempts).toBe(1);
    expect(result.chapter.content.slice(result.chapter.content.indexOf('Một câu'))).toBe(chapter.content.slice(chapter.content.indexOf('Một câu')));
    expect(result.history.map(item => item.action)).toEqual(['review_existing', 'targeted_patch']);
    expect(model.calls).toHaveLength(3);
  });

  test('a worse repair is retained in history but cannot replace the stronger candidate', async () => {
    const model = provider(chapter, review([issue()]), {
      edits: [{ before: 'Chu Dã mua lá phù.', after: 'Chu Dã nhận lá phù.' }],
    }, review([issue({ severity: 'blocking', quote: 'Chu Dã nhận lá phù.' })]));
    const result = await rewriteChapterEditorially(model, input());
    expect(result.decision).toBe('repair_rejected');
    expect(result.chapter).toEqual(chapter);
    expect(result.history).toHaveLength(2);
    expect(result.costUsd).toBeCloseTo(0.04);
  });

  test('invalid patch anchors stop locally without spending on a review or another rewrite', async () => {
    const model = provider(chapter, review([issue()]), { edits: [{ before: 'Không có đoạn này', after: 'Thay thế' }] });
    const result = await rewriteChapterEditorially(model, input());
    expect(result.chapter).toEqual(chapter);
    expect(result.decision).toBe('repair_rejected');
    expect(model.calls).toHaveLength(3);
  });

  test('an interrupted reviewed candidate resumes at repair and retains already-spent usage', async () => {
    let checkpoint: import('@/services/serial/editorial').EditorialRewriteResult | undefined;
    const first = provider(chapter, review([issue()]));
    await rewriteChapterEditorially(first, input({ onCheckpoint: value => { checkpoint = value; } }));
    expect(checkpoint?.usages).toHaveLength(2);
    const resumed = provider({ edits: [{ before: 'Chu Dã mua lá phù.', after: 'Chu Dã đổi hạch săn được lấy lá phù.' }] }, review());
    const result = await rewriteChapterEditorially(resumed, input({ resume: checkpoint }));
    expect(result.accepted).toBe(true);
    expect(resumed.calls).toHaveLength(2);
    expect(result.usages).toHaveLength(4);
    expect(result.history).toHaveLength(2);
  });

  test('patches reject ambiguous anchors, overlapping spans, and whole-chapter replacement', () => {
    expect(() => applyEditorialPatch(chapter, { edits: [{ before: 'Một câu', after: 'Khác' }] })).toThrow('ANCHOR');
    expect(() => applyEditorialPatch(chapter, { edits: [
      { before: 'Chu Dã mua', after: 'Chu Dã nhận' }, { before: 'Dã mua lá phù.', after: 'Dã nhận phù.' },
    ] })).toThrow('OVERLAP');
    expect(() => applyEditorialPatch(chapter, { edits: [{ before: chapter.content, after: 'Bản khác' }] })).toThrow('SCOPE');
  });

  test('pilot canon removes contradictory profession instructions and scopes unrelated future lots out', () => {
    const book = EDITORIAL_PILOTS['mat-the'];
    expect(book.directions[9].join(' ')).toContain('trao thẻ Nhất giai Luyện Đan Sư');
    expect(book.directions[9].join(' ')).not.toContain('chưa trao cấp');
    expect(factsForChapter(book.canon, 2).some(fact => fact.key === 'lot001')).toBe(false);
    for (const pilot of Object.values(EDITORIAL_PILOTS)) for (const number of pilot.chapters) {
      expect(() => factsForChapter(pilot.canon, number)).not.toThrow();
    }
  });
});
