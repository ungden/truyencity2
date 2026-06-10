/**
 * Quality Overhaul Phase 2 — long-range memory unit tests.
 *
 *  - 2.4 findDuplicateThread matches dormant threads (callback detection)
 *  - 2.5 getVoiceContext corrective mode on consecutive drift
 *  - 2.7 getInventoryContext never drops key items (importance ≥70)
 *
 * Run: npm test -- quality-overhaul-phase2
 */

// `var` so the declaration is hoisted above the jest.mock factory.
var mockTableResults: Record<string, { data: unknown }> = {};

jest.mock('../../services/story-engine/utils/supabase', () => {
  const builderMethods = ['select', 'eq', 'lte', 'lt', 'gt', 'gte', 'order', 'limit', 'in', 'neq', 'or', 'is', 'not', 'update', 'insert', 'upsert'];
  const makeBuilder = (result: { data: unknown }) => {
    const b: Record<string, unknown> = {};
    for (const m of builderMethods) b[m] = () => b;
    b.maybeSingle = () => Promise.resolve(result);
    b.single = () => Promise.resolve(result);
    b.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject);
    return b;
  };
  return {
    getSupabase: () => ({
      from: (table: string) => makeBuilder(mockTableResults[table] ?? { data: null }),
    }),
  };
});

import { findDuplicateThread, type PlotThread } from '../../services/story-engine/state/plot-threads';
import { getVoiceContext } from '../../services/story-engine/memory/voice-fingerprint';
import { getInventoryContext } from '../../services/story-engine/state/item-inventory';

beforeEach(() => {
  mockTableResults = {};
});

describe('2.4 callback detection via findDuplicateThread on dormant threads', () => {
  const dormantThread = (name: string): PlotThread => ({
    id: 't1',
    name,
    description: 'Bí mật trong cổ mộ bị phong ấn',
    priority: 'main',
    status: 'resolved',
    startChapter: 195,
    lastActiveChapter: 210,
    relatedCharacters: [],
    foreshadowingHints: [],
    importance: 70,
  });

  it('matches a ch.800 callback name against the ch.200 dormant thread', () => {
    const dormant = [dormantThread('Bí mật cổ mộ phong ấn')];
    const dup = findDuplicateThread('Cổ mộ phong ấn mở ra lần nữa', dormant);
    expect(dup).not.toBeNull();
    expect(dup?.name).toBe('Bí mật cổ mộ phong ấn');
  });

  it('does not match unrelated thread names', () => {
    const dormant = [dormantThread('Bí mật cổ mộ phong ấn')];
    expect(findDuplicateThread('Thương vụ sáp nhập công ty đối thủ', dormant)).toBeNull();
  });
});

describe('2.5 voice corrective mode', () => {
  const fingerprint = {
    emotionalRegister: 'trầm ổn pha sarcastic',
    descriptionStyle: 'cụ thể, ít tính từ',
    signaturePhrases: ['gõ nhịp lên bàn'],
  };

  it('stays descriptive when drift count is 0', async () => {
    mockTableResults['voice_fingerprints'] = {
      data: { fingerprint, anti_patterns: [], consecutive_drift_count: 0 },
    };
    const ctx = await getVoiceContext('p1');
    expect(ctx).toContain('VOICE FINGERPRINT');
    expect(ctx).not.toContain('VOICE CORRECTION');
  });

  it('switches to corrective mode at ≥2 consecutive drift events', async () => {
    mockTableResults['voice_fingerprints'] = {
      data: { fingerprint, anti_patterns: ['drift A', 'drift B'], consecutive_drift_count: 2 },
    };
    mockTableResults['voice_anchors'] = {
      data: [{ chapter_number: 1, snippet_type: 'opening', snippet_text: 'Đoạn văn mẫu chương 1.' }],
    };
    const ctx = await getVoiceContext('p1');
    expect(ctx).toContain('VOICE CORRECTION — BẮT BUỘC');
    expect(ctx).toContain('SAMPLE GỐC');
    expect(ctx).toContain('Đoạn văn mẫu chương 1.');
  });
});

describe('2.7 inventory key items never dropped', () => {
  it('lists [KEY ITEM] first and keeps it despite the 12-item cap', async () => {
    // 14 normal items picked recently + 1 key item picked long ago.
    const rows = [
      { character_name: 'MC', item_name: 'Huyết Ngọc Tổ Truyền', event_type: 'picked', chapter_number: 3, description: 'di vật của mẹ', importance: 90 },
      ...Array.from({ length: 14 }, (_, i) => ({
        character_name: 'MC',
        item_name: `Đan dược thường ${i + 1}`,
        event_type: 'picked',
        chapter_number: 100 + i,
        description: null,
        importance: 30,
      })),
    ];
    mockTableResults['item_events'] = { data: rows };

    const ctx = await getInventoryContext('p1', 150, 'MC');
    expect(ctx).toContain('Huyết Ngọc Tổ Truyền');
    expect(ctx).toContain('[KEY ITEM]');
    // key item appears before normal items
    const keyIdx = ctx!.indexOf('Huyết Ngọc Tổ Truyền');
    const firstNormalIdx = ctx!.indexOf('Đan dược thường');
    expect(keyIdx).toBeLessThan(firstNormalIdx);
  });
});
