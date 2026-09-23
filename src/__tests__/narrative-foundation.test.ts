import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  LEGACY_NARRATIVE_FOUNDATION_VERSION,
  NARRATIVE_FOUNDATION_VERSION,
  NarrativeFoundationSchema,
  NarrativeReviewSchema,
  narrativeCraft,
  narrativeReviewGate,
} from '@/services/narrative/foundation';
import { BibleSchema, PremiseSchema, CyclePlanSchema, ChapterDigestSchema, type CyclePlan, normalizeCyclePlanShape } from '@/services/serial/contracts';
import {
  assertNarrativeDigest,
  assertNarrativePlan,
  canonicalizeNarrativeLearnerIds,
  reviewNarrativeSequence,
  serialSystemPrompt,
} from '@/services/serial/foundation';
import { applyDigest, seedBible } from '@/services/serial/state';
import { earlyPayoffsForChapterRange } from '@/services/story-factory/planner';
import { foundationSystemPrompt, reviewNarrativeWindow } from '@/services/story-factory/foundation';
import { StoryFactoryError, type StoryKernel } from '@/services/story-factory/contracts';
import type { ProviderUsage, StoryModelProvider } from '@/services/story-factory/provider';
import { requireMarketBlueprint } from '@/services/story-factory/setup';
import { validateFoundationKnowledge } from '@/services/story-factory/validation';
import { buildWriterSystemPrompt, EDITOR_SYSTEM_PROMPT, PLANNER_SYSTEM_PROMPT, WRITER_SYSTEM_PROMPT } from '@/services/story-factory/prompts';
import { STORY_FACTORY_RELEASE } from '@/services/story-factory/release';
import { SERIAL_PREMISE_CATALOG } from '@/services/serial/catalog';
import { cycle } from './serial/fixtures';
import { planNextCycle, writeOneChapter } from '@/services/serial/engine';
import { DEFAULT_SERIAL_ROUTES } from '@/services/serial/routes';

const profile = {
  version: NARRATIVE_FOUNDATION_VERSION,
  genre: 'two_world_commerce' as const,
};

const baseUsage: ProviderUsage = {
  model: 'base-review', inputTokens: 10, outputTokens: 5, costUsd: 0.01, finishReason: 'STOP',
};

function v3Premise() {
  const legacy = SERIAL_PREMISE_CATALOG[1]!.premise;
  const protagonistId = legacy.castSeed.find(member => member.role === 'protagonist')!.id;
  return PremiseSchema.parse({
    ...legacy,
    schemaVersion: 3,
    narrativeFoundation: {
      craftProfile: profile,
      commerceFantasy: {
        protectedStore: {
          ownerCharacterId: protagonistId,
          domain: 'Toàn bộ gian cửa hàng và ngưỡng cửa nối hai kho thuộc quyền tuyệt đối của Trần Khải.',
          protections: [
            'hostile_action_nullified', 'forced_entry_denied', 'theft_blocked',
            'surveillance_blocked', 'owner_can_eject', 'unpaid_goods_recalled',
          ],
          outsideRisk: 'Rời cửa hàng, Khải vẫn chịu luật lệ, cạnh tranh và giới hạn thể chất bình thường.',
        },
        valueContrasts: [
          {
            id: 'rau_tuoi_sang_tuong_lai',
            sourceWorldId: legacy.worldKernel.worlds[0]!.id,
            destinationWorldId: legacy.worldKernel.worlds[1]!.id,
            item: 'Rau quả tươi',
            ordinaryAtSource: 'Rau quả là hàng chợ quen thuộc, có nguồn đều và giá ai cũng hiểu.',
            valuableAtDestination: 'Thực phẩm thật hiếm ở khu hạ tầng tương lai và có giá trị cảm giác lẫn dinh dưỡng.',
            experienceProof: 'Khách nhìn, ngửi và nếm một phần nhỏ trước khi tự hỏi giá bằng khả năng chi trả của họ.',
            commercialConsequence: 'Một lần dùng thật dẫn tới đơn mua nhỏ và nhu cầu giữ nguồn hàng đều.',
          },
          {
            id: 'do_dan_dung_ve_hien_tai',
            sourceWorldId: legacy.worldKernel.worlds[1]!.id,
            destinationWorldId: legacy.worldKernel.worlds[0]!.id,
            item: 'Đồ dân dụng tương lai lỗi thời',
            ordinaryAtSource: 'Đây là đồ sửa chữa phổ thông đã bị khu lõi thay thế bằng đời mới.',
            valuableAtDestination: 'Một cơ cấu nhỏ vẫn vượt hàng hiện đại ở độ bền và cách sử dụng.',
            experienceProof: 'Khải và người có nghề thử đúng một công dụng nhìn thấy được trước khi định giá.',
            commercialConsequence: 'Công dụng đã chứng minh mở ra mẫu sản phẩm nhỏ có người dùng cụ thể.',
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
        background: 'Trần Khải lớn lên trong tiệm tạp hóa của gia đình và quen tự kiểm hàng.',
        presentLife: 'Anh đang giữ một cửa tiệm biên lợi nhuận thấp và tự lo mọi ca giao nhận.',
        existingCompetence: 'Anh biết quản lý tồn kho, so giá bán lẻ và làm việc với nhà cung cấp nhỏ.',
        limitsOfKnowledge: 'Anh không biết chế tạo AI, không hiểu xã hội tương lai và chưa từng lập công ty công nghệ.',
        relationships: 'Anh còn nợ sự tin cậy của người giao rau và giữ liên hệ với vài khách quen quanh phố.',
        habits: 'Anh ghi hạn dùng, chụp tem lô hàng và kiểm tiền cuối mỗi buổi tối.',
        desireBeforeAdvantage: 'Anh muốn cứu cửa tiệm khỏi đóng cửa và có một nguồn thu đủ ổn định để tự quyết.',
      }],
      livedWorlds: legacy.worldKernel.worlds.map(world => ({
        worldId: world.id,
        everydayLife: `${world.name} có nhịp ăn ở, đi lại và mua sắm riêng trước khi Trần Khải xuất hiện.`,
        livelihoods: 'Người dân kiếm sống bằng cửa hàng, lao động kỹ thuật, giao nhận và các tổ chức địa phương.',
        infrastructure: 'Kho bãi, đường vận chuyển, điện, mạng và cơ chế kiểm định quyết định thứ gì có thể lưu thông.',
        inequality: 'Khả năng tiếp cận thực phẩm, vốn và công nghệ khác nhau rõ giữa người lao động và tập đoàn.',
        institutionsWithoutProtagonist: 'Các tập đoàn, viện kiểm định và liên minh vẫn theo đuổi quyền cấp phép và thị phần riêng.',
      })),
      advantageDiscovery: {
        acquisitionEvent: 'Trong lúc kiểm kho sau một đêm mất điện, Khải thấy cánh cửa cũ mở sang căn phòng xa lạ.',
        initialReaction: 'Anh khóa tiệm, đánh dấu vị trí đồ vật và kiểm tra xem mình có hoa mắt hay bị đột nhập không.',
        firstExperiments: ['Đặt một chai nước có ký hiệu riêng qua ngưỡng rồi quan sát nó còn nguyên khi quay lại.'],
        initiallyKnownFactIds: [],
        unresolvedOrigin: 'Khải chưa biết ai tạo ra cửa và vì sao nó nối đúng hai cửa hàng.',
      },
      facts: [{
        id: 'cua_noi_hai_kho',
        truth: 'Cánh cửa nối ổn định kho tiệm Khải Minh với cửa hàng bỏ trống ở Tân Hải.',
        initiallyKnownByCharacterIds: [],
        revealThrough: 'Khải thử vật đánh dấu, kiểm đồng hồ và tự đi qua rồi quay lại trong cùng một buổi.',
      }],
      milestones: [{
        id: 'kiem_chung_cua',
        intention: 'Khải có đủ bằng chứng thực nghiệm để tin cánh cửa tồn tại và có thể quay về.',
        prerequisiteIds: ['cua_noi_hai_kho'],
        evidenceNeeded: 'Ít nhất hai lượt thử có vật đánh dấu, thời gian và đường quay về được mô tả trên trang.',
      }],
    },
  });
}

function explorationCycle() {
  const base = cycle();
  return CyclePlanSchema.parse({
    ...base,
    schemaVersion: 2,
    startChapter: 1,
    plannedEndChapter: 5,
    customerLoop: null,
    climax: { ...base.climax, witnesses: [] },
    beatSheets: [
      {
        chapterNumber: 1,
        sceneMode: 'daily_life',
        openingBridge: 'Khải kiểm kho sau một ca bán ế và phát hiện dấu hiệu bất thường ở cửa sau.',
        protagonistMove: 'Anh khóa tiệm, đánh dấu đồ vật rồi tự thiết kế phép thử nhỏ.',
        beats: ['Cho thấy ca làm và áp lực của tiệm', 'Thử chai nước qua ngưỡng cửa'],
        materialOutcome: 'Khải có quan sát đầu tiên nhưng chưa kết luận về công dụng thương mại.',
        emotionalTarget: 'Tò mò đi cùng sự thận trọng của một người quen kiểm hàng.',
        newNamedThing: null,
        endHookKind: 'question',
        prerequisiteIds: [],
        revealsFactIds: ['cua_noi_hai_kho'],
        advancesMilestoneIds: [],
      },
      {
        chapterNumber: 2,
        sceneMode: 'discovery',
        openingBridge: 'Từ phép thử tối qua, Khải chuẩn bị cách kiểm tra đường về trước khi bước qua.',
        protagonistMove: 'Anh lặp phép thử có đồng hồ, dây đánh dấu và lối rút lui.',
        beats: ['Kiểm tra sai số của lần đầu', 'Đi qua và quay lại theo mốc thời gian'],
        materialOutcome: 'Cơ chế cửa được kiểm chứng trong phạm vi nhỏ; chưa có sản phẩm hay khách hàng.',
        emotionalTarget: 'Nhẹ nhõm nhưng vẫn dè chừng điều chưa biết.',
        newNamedThing: null,
        endHookKind: 'reveal',
        prerequisiteIds: ['cua_noi_hai_kho'],
        revealsFactIds: [],
        advancesMilestoneIds: ['kiem_chung_cua'],
      },
    ],
  });
}

function digest(chapterNumber: number, narrativeEvidence: Array<{
  id: string;
  chapterNumber: number;
  quote: string;
  learnedByCharacterIds: string[];
}>) {
  return ChapterDigestSchema.parse({
    chapterNumber,
    title: `Phép thử ${chapterNumber}`,
    summary: 'Khải kiểm tra cánh cửa bằng một phép thử có đánh dấu.',
    payoffKind: null,
    endedOn: 'Anh ghi lại kết quả rồi khóa kho.',
    newNamedThings: [],
    narrativeEvidence,
    coreChanges: {
      storyDayDelta: 0,
      died: [],
      progressionChanges: [],
      assetEvents: [],
      goldenFingerRungChange: null,
      moved: [],
      worldFactsRevealed: [],
      newCast: [],
      hooksPlanted: [],
      hooksPaid: [],
      learnedFinger: [],
    },
  });
}

describe('versioned narrative foundation', () => {
  test('current two-world foundations require the store fantasy while old artifacts remain readable', () => {
    const current = v3Premise().narrativeFoundation!;
    expect(NarrativeFoundationSchema.safeParse({ ...current, commerceFantasy: undefined }).success).toBe(false);
    expect(NarrativeFoundationSchema.safeParse({
      ...current,
      craftProfile: { ...current.craftProfile, version: LEGACY_NARRATIVE_FOUNDATION_VERSION },
      commerceFantasy: undefined,
    }).success).toBe(true);
    expect(current.commerceFantasy?.protectedStore.protections).toHaveLength(6);
    expect(current.commerceFantasy?.simplicityRules.noUnseededSubsystems).toBe(true);
    expect(narrativeCraft(current.craftProfile)).toMatch(/không dựng rào cản ngôn ngữ/i);
    expect(narrativeCraft(current.craftProfile)).toMatch(/lãnh vực tuyệt đối/i);
    expect(narrativeCraft(current.craftProfile)).toMatch(/không tự thêm AI, hệ thống phụ/i);
  });

  test('legacy packages remain legacy and keep their customer loop contract', () => {
    const legacy = SERIAL_PREMISE_CATALOG[1]!.premise;
    expect(legacy.schemaVersion).toBe(2);
    expect(cycle().schemaVersion).toBe(1);
    expect(serialSystemPrompt('writer', legacy)).not.toMatch(/NỀN SÁNG TÁC/);
  });

  test('v3 accepts exploration before commerce and enforces prepared knowledge', () => {
    const premise = v3Premise();
    const bible = seedBible({ premise });
    const planned = explorationCycle();
    expect(planned.customerLoop).toBeNull();
    expect(() => assertNarrativePlan(premise, bible, planned)).not.toThrow();
    const skipped = CyclePlanSchema.parse({
      ...planned,
      beatSheets: [{ ...planned.beatSheets[1], chapterNumber: 1 }],
    });
    expect(() => assertNarrativePlan(premise, bible, skipped)).toThrow(/before the reader has seen it/);
  });

  test('product beats bind to an approved value contrast and an on-page experience', () => {
    const premise = v3Premise();
    const bible = seedBible({ premise });
    const planned = explorationCycle();
    const withProduct = CyclePlanSchema.parse({
      ...planned,
      beatSheets: [{
        ...planned.beatSheets[0],
        valueContrastId: 'rau_tuoi_sang_tuong_lai',
        valueExperience: 'Diệp Ninh ngửi, cắn thử lát dưa rồi chủ động hỏi giá cho phần mang về.',
      }],
    });
    expect(() => assertNarrativePlan(premise, bible, withProduct)).not.toThrow();
    const unknown = CyclePlanSchema.parse({
      ...withProduct,
      beatSheets: [{ ...withProduct.beatSheets[0], valueContrastId: 'hang_tu_bia' }],
    });
    expect(() => assertNarrativePlan(premise, bible, unknown)).toThrow(/unknown value contrast/i);
    // An id without its on-page experience is a mechanical slip: repaired in code, not rejected.
    const unpaired = normalizeCyclePlanShape({
      ...planned,
      beatSheets: [{ ...planned.beatSheets[0], valueContrastId: 'rau_tuoi_sang_tuong_lai', valueExperience: null }],
    }, { rolling: false });
    expect(unpaired.beatSheets[0]).toMatchObject({ valueContrastId: null, valueExperience: null });
  });

  test('Story Factory disables fixed payoff deadlines only for an opted-in profile', () => {
    const blueprint = {
      craftProfile: profile,
      earlyPayoffs: [{
        byChapter: 3,
        payoff: 'Khải hiểu thêm một giới hạn sau hai phép thử có kiểm soát.',
        visibleTo: 'Chính Khải trong kho khóa cửa.',
        positionChange: 'Anh chuyển từ nghi ngờ sang coi cánh cửa là một hiện tượng cần nghiên cứu.',
        nextPressure: 'Anh phải tìm cách quan sát thế giới bên kia mà không để lộ tiệm.',
      }],
    } as never;
    expect(earlyPayoffsForChapterRange(blueprint, 1, 5)).toEqual([]);
  });

  test('profile blueprint survives the exact setup persistence shape', () => {
    const long = 'Một mô tả đủ dài để khóa ý nghĩa sản phẩm và quan hệ nhân quả.';
    const persisted = JSON.parse(JSON.stringify({
      craftProfile: profile,
      familiarArena: long,
      noveltyCollision: long,
      protagonistStartingPosition: long,
      coreAdvantage: long,
      comparisonEngine: long,
      worldConflictEngine: long,
      earlyPayoffs: [],
      scaleLadder: Array.from({ length: 6 }, (_, index) => ({
        scope: `Bậc ${index + 1}`,
        arena: long,
        statusPrize: long,
        oppositionClass: long,
        advantageEvolution: long,
      })),
      openingExecutionProofs: [],
    }));
    expect(requireMarketBlueprint(persisted).openingExecutionProofs).toEqual([]);
  });

  test('additive foundation does not orphan the legacy Story Factory release', () => {
    expect(STORY_FACTORY_RELEASE).toBe('sf_0064f61f70c8afa1');
  });

  test('extractor evidence must quote prose and earn planned milestones', () => {
    const premise = v3Premise();
    const bible = seedBible({ premise });
    const cycle = explorationCycle();
    const fabricated = digest(1, [{
      id: 'cua_noi_hai_kho', chapterNumber: 1,
      quote: 'Câu này không hề có trong chương.', learnedByCharacterIds: [],
    }]);
    expect(() => assertNarrativeDigest({ premise, bible, cycle, digest: fabricated, prose: 'Khải đặt chai nước qua cửa.' }))
      .toThrow(/not present/);

    const skipped = digest(2, [{
      id: 'kiem_chung_cua', chapterNumber: 2,
      quote: 'Khải tin rằng mình có thể quay về.', learnedByCharacterIds: [],
    }]);
    expect(() => assertNarrativeDigest({
      premise, bible, cycle, digest: skipped, prose: 'Khải tin rằng mình có thể quay về.',
    })).toThrow(/before cua_noi_hai_kho/);
  });

  test('extractor cannot omit planned evidence and same-chapter facts unlock milestones regardless of output order', () => {
    const premise = v3Premise();
    const bible = seedBible({ premise });
    const base = explorationCycle();
    const sameChapter = CyclePlanSchema.parse({
      ...base,
      beatSheets: [{
        ...base.beatSheets[0],
        revealsFactIds: ['cua_noi_hai_kho'],
        advancesMilestoneIds: ['kiem_chung_cua'],
      }],
    });
    expect(() => assertNarrativeDigest({
      premise,
      bible,
      cycle: sameChapter,
      digest: digest(1, []),
      prose: 'Khải chưa ghi lại bằng chứng.',
    })).toThrow(/omitted planned evidence/);
    const prose = 'Khải tự bước qua rồi quay lại. Cánh cửa mở sang một căn kho khác.';
    expect(() => assertNarrativeDigest({
      premise,
      bible,
      cycle: sameChapter,
      digest: digest(1, [
        {
          id: 'kiem_chung_cua', chapterNumber: 1,
          quote: 'Khải tự bước qua rồi quay lại.', learnedByCharacterIds: [],
        },
        {
          id: 'cua_noi_hai_kho', chapterNumber: 1,
          quote: 'Cánh cửa mở sang một căn kho khác.', learnedByCharacterIds: [],
        },
      ]),
      prose,
    })).not.toThrow();
  });

  test('later character learning is preserved as a separate evidence event', () => {
    const premise = v3Premise();
    const protagonistId = premise.castSeed.find(member => member.role === 'protagonist')!.id;
    const afterReveal = applyDigest({
      premise,
      bible: seedBible({ premise }),
      digest: digest(1, [{
        id: 'cua_noi_hai_kho', chapterNumber: 1,
        quote: 'Cánh cửa mở sang một căn kho khác.', learnedByCharacterIds: [],
      }]),
    });
    const afterLearning = applyDigest({
      premise,
      bible: afterReveal,
      digest: digest(2, [{
        id: 'cua_noi_hai_kho', chapterNumber: 2,
        quote: 'Khải tự bước qua rồi quay lại.', learnedByCharacterIds: [protagonistId],
      }]),
    });
    expect(afterLearning.symbolicCore.narrativeEvidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'cua_noi_hai_kho', chapterNumber: 1, learnedByCharacterIds: [] }),
      expect.objectContaining({ id: 'cua_noi_hai_kho', chapterNumber: 2, learnedByCharacterIds: [protagonistId] }),
    ]));
  });

  test('a character introduced in the chapter may learn narrative evidence in that chapter', () => {
    const premise = v3Premise();
    const prose = 'Lan đứng cạnh Khải khi cánh cửa mở sang một căn kho khác.';
    const baseDigest = digest(1, [{
      id: 'cua_noi_hai_kho', chapterNumber: 1,
      quote: prose, learnedByCharacterIds: ['lan'],
    }]);
    const introduced = ChapterDigestSchema.parse({
      ...baseDigest,
      coreChanges: {
        ...baseDigest.coreChanges,
        newCast: [{
          id: 'lan', name: 'Lan',
          sheet: 'Người giao hàng cẩn thận, trực tiếp chứng kiến phép thử cánh cửa trong kho.',
          role: 'Người giao hàng',
          locationId: premise.castSeed[0]!.startLocationId,
          startingProgressions: [],
        }],
      },
    });
    const bible = seedBible({ premise });

    expect(() => assertNarrativeDigest({
      premise, bible, cycle: explorationCycle(), digest: introduced, prose,
    })).not.toThrow();
    const next = applyDigest({ premise, bible, digest: introduced });
    expect(next.symbolicCore.characterKnowledge).toContainEqual({
      characterId: 'lan', factIds: ['cua_noi_hai_kho'],
    });
  });

  test('unique trailing learner aliases are canonicalized but ambiguous aliases remain invalid', () => {
    const premise = v3Premise();
    const bible = seedBible({ premise });
    const protagonistId = premise.castSeed.find(member => member.role === 'protagonist')!.id;
    const aliased = digest(1, [{
      id: 'cua_noi_hai_kho', chapterNumber: 1,
      quote: 'Cánh cửa mở sang một căn kho khác.', learnedByCharacterIds: ['khai'],
    }]);
    const canonical = canonicalizeNarrativeLearnerIds(bible, aliased);
    expect(canonical.narrativeEvidence[0]?.learnedByCharacterIds).toEqual([protagonistId]);

    const ambiguousBible = BibleSchema.parse({
      ...bible,
      symbolicCore: {
        ...bible.symbolicCore,
        cast: [
          ...bible.symbolicCore.cast,
          { id: 'pham_khai', alive: true, locationId: premise.castSeed[0]!.startLocationId, lastSeenChapter: 0, knowsFinger: false },
        ],
      },
      castSheet: [
        ...bible.castSheet,
        { id: 'pham_khai', name: 'Phạm Khải', sheet: 'Một người trùng tên gọi.' },
      ],
    });
    const unresolved = canonicalizeNarrativeLearnerIds(ambiguousBible, aliased);
    expect(unresolved.narrativeEvidence[0]?.learnedByCharacterIds).toEqual(['khai']);
  });

  test('legacy Bible evidence backfills character knowledge before its quote ages out', () => {
    const premise = v3Premise();
    const protagonistId = premise.castSeed.find(member => member.role === 'protagonist')!.id;
    const legacy = seedBible({ premise });
    const raw = JSON.parse(JSON.stringify(legacy)) as Record<string, any>;
    raw.symbolicCore.chapterNumber = 240;
    raw.symbolicCore.narrativeEvidence = Array.from({ length: 240 }, (_, index) => ({
      id: 'cua_noi_hai_kho', chapterNumber: index + 1,
      quote: `Khải kiểm tra cửa lần ${index + 1}.`,
      learnedByCharacterIds: index === 0 ? [protagonistId] : [],
    }));
    delete raw.symbolicCore.revealedNarrativeIds;
    delete raw.symbolicCore.achievedNarrativeMilestoneIds;
    delete raw.symbolicCore.characterKnowledge;

    const migrated = applyDigest({
      premise,
      bible: BibleSchema.parse(raw),
      digest: digest(241, [{
        id: 'cua_noi_hai_kho', chapterNumber: 241,
        quote: 'Khải kiểm tra cửa lần 241.', learnedByCharacterIds: [],
      }]),
    });
    expect(migrated.symbolicCore.narrativeEvidence).toHaveLength(240);
    expect(migrated.symbolicCore.narrativeEvidence.some(item => item.chapterNumber === 1)).toBe(false);
    expect(migrated.symbolicCore.characterKnowledge).toContainEqual({
      characterId: protagonistId,
      factIds: ['cua_noi_hai_kho'],
    });
  });

  test('foundation IDs share Serial limits and fact/milestone namespaces cannot collide', () => {
    const premise = v3Premise();
    const collision = {
      ...premise.narrativeFoundation!,
      milestones: premise.narrativeFoundation!.milestones.map(item => ({
        ...item, id: 'cua_noi_hai_kho', prerequisiteIds: [],
      })),
    };
    expect(() => NarrativeFoundationSchema.parse(collision)).toThrow(/separate names/);
    const protagonistId = premise.castSeed.find(member => member.role === 'protagonist')!.id;
    const sharedId = 'f'.repeat(49);
    const expanded = PremiseSchema.parse({
      ...premise,
      narrativeFoundation: {
        ...premise.narrativeFoundation!,
        advantageDiscovery: {
          ...premise.narrativeFoundation!.advantageDiscovery,
          initiallyKnownFactIds: [sharedId],
        },
        facts: [{
          ...premise.narrativeFoundation!.facts[0], id: sharedId,
          initiallyKnownByCharacterIds: [protagonistId],
        }],
        milestones: premise.narrativeFoundation!.milestones.map(item => ({
          ...item, prerequisiteIds: [sharedId],
        })),
      },
    });
    expect(seedBible({ premise: expanded }).symbolicCore.revealedNarrativeIds).toContain(sharedId);
    const tooLong = {
      ...premise.narrativeFoundation!,
      facts: [{ ...premise.narrativeFoundation!.facts[0], id: 'f'.repeat(65) }],
    };
    expect(() => NarrativeFoundationSchema.parse(tooLong)).toThrow(/Invalid/);
  });

  test('durable knowledge and milestones survive the bounded evidence window', () => {
    const premise = v3Premise();
    const protagonistId = premise.castSeed.find(member => member.role === 'protagonist')!.id;
    let bible = seedBible({ premise });
    for (let chapterNumber = 1; chapterNumber <= 242; chapterNumber += 1) {
      const evidenceId = chapterNumber === 2 ? 'kiem_chung_cua' : 'cua_noi_hai_kho';
      bible = applyDigest({
        premise,
        bible,
        digest: digest(chapterNumber, [{
          id: evidenceId,
          chapterNumber,
          quote: `Phép thử cửa lần ${chapterNumber}.`,
          learnedByCharacterIds: chapterNumber === 1 ? [protagonistId] : [],
        }]),
      });
    }
    expect(bible.symbolicCore.narrativeEvidence).toHaveLength(240);
    expect(bible.symbolicCore.narrativeEvidence.some(item => item.chapterNumber <= 2)).toBe(false);
    expect(bible.symbolicCore.revealedNarrativeIds).toContain('cua_noi_hai_kho');
    expect(bible.symbolicCore.achievedNarrativeMilestoneIds).toContain('kiem_chung_cua');
    expect(bible.symbolicCore.characterKnowledge).toContainEqual({
      characterId: protagonistId,
      factIds: ['cua_noi_hai_kho'],
    });
    const later = CyclePlanSchema.parse({
      ...explorationCycle(),
      startChapter: 243,
      plannedEndChapter: 247,
      beatSheets: [{
        ...explorationCycle().beatSheets[1],
        chapterNumber: 243,
        prerequisiteIds: ['kiem_chung_cua'],
        advancesMilestoneIds: [],
      }],
    });
    expect(() => assertNarrativePlan(premise, bible, later)).not.toThrow();
  });

  test('literal but semantically unrelated extractor quotes cannot commit facts or milestones', async () => {
    const premise = v3Premise();
    const bible = seedBible({ premise });
    const planned = explorationCycle();
    const prose = `${'Khải đóng sổ, rửa tay rồi ngồi ăn cơm. '.repeat(30)}`;
    const rejected = digest(1, [{
      id: 'cua_noi_hai_kho', chapterNumber: 1,
      quote: 'Khải đóng sổ', learnedByCharacterIds: [],
    }]);
    const calls: string[] = [];
    const provider = {
      async text() { throw new Error('unused'); },
      async json<T>(input: { system: string; model: string }) {
        const value = input.system.startsWith('Bạn là tác giả')
          ? { title: 'Ca tối', content: prose }
          : input.system.startsWith('Bạn soát canon')
            ? {
                reviewBinding: { chapterNumber: 1, title: 'Ca tối', excerpt: prose.slice(0, 40) },
                continuity: [],
                scorecard: { opening: 4, anticipation: 4, payoff: 3, newness: 3, endHook: 3 },
                craft: { protagonistAgency: 3, sceneLife: 4, worldLogic: 4, dialogueNaturalness: 4, structuralFreshness: 3 },
                repetition: [], aiFlavor: [], steering: [],
              }
            : input.system.startsWith('Bạn kiểm chứng bằng chứng')
              ? { checks: [{ id: 'cua_noi_hai_kho', quote: 'Khải đóng sổ', supported: false, explanation: 'Câu này chỉ tả sinh hoạt, không cho thấy cánh cửa.' }] }
              : rejected;
        calls.push(input.system.split('\n', 1)[0]);
        return { value: value as T, usage: { ...baseUsage, model: input.model } };
      },
    } as StoryModelProvider;
    const result = await writeOneChapter({
      provider,
      routes: DEFAULT_SERIAL_ROUTES,
      premise,
      bible,
      cycle: planned,
      chapterNumber: 1,
      previousChapter: null,
    });
    expect(result.status).toBe('needs_review');
    if (result.status !== 'needs_review') return;
    expect(result.reason).toContain('narrative_evidence_semantics');
    expect(calls.filter(call => call === 'Bạn kiểm chứng bằng chứng truyện theo nghĩa, không viết lại truyện. Với từng claim, supported=true chỉ khi quote và ngữ cảnh chương thực sự cho độc giả thấy claim đó. Việc một câu xuất hiện nguyên văn không đủ. Milestone chỉ đúng khi evidenceNeeded đã xảy ra trên trang; ý định, lời hứa, suy đoán hoặc thao tác không liên quan đều là false. Với learnedByCharacterIds, nhân vật phải trực tiếp quan sát hoặc được truyền đạt thông tin trong chương. Trả đúng một check cho mỗi claim, giữ nguyên id và quote.')).toHaveLength(1);
  });

  test('Story Factory chapter-zero knowledge must mirror the foundation', () => {
    const foundation = v3Premise().narrativeFoundation!;
    const protagonistId = foundation.characters[0].characterId;
    const state = {
      chapterNumber: 0,
      facts: foundation.facts.map(fact => ({ id: fact.id, value: fact.truth })),
      characters: [{
        characterId: protagonistId,
        locationId: 'kho_hien_tai',
        knownFactIds: ['cua_noi_hai_kho'],
        encounteredCharacterIds: [],
        relationshipState: {},
      }],
    };
    expect(() => validateFoundationKnowledge({ narrativeFoundation: foundation }, state)).toThrow(/contradicts/);
    expect(() => validateFoundationKnowledge({ narrativeFoundation: foundation }, {
      ...state,
      characters: [{ ...state.characters[0], knownFactIds: [] }],
    })).not.toThrow();
  });

  test('profile prompts select the new creative policy instead of appending it to retired cadence rules', () => {
    const foundation = v3Premise().narrativeFoundation!;
    const kernel = { narrativeFoundation: foundation } as StoryKernel;
    const writer = foundationSystemPrompt(WRITER_SYSTEM_PROMPT, kernel, 'writer');
    const planner = foundationSystemPrompt(PLANNER_SYSTEM_PROMPT, kernel, 'planner');
    const editor = foundationSystemPrompt(EDITOR_SYSTEM_PROMPT, kernel, 'editor');
    const arc = foundationSystemPrompt(PLANNER_SYSTEM_PROMPT, kernel, 'arc');
    const voice = foundationSystemPrompt(buildWriterSystemPrompt({ voicePolicy: 'A/B VOICE MARKER' }), kernel, 'writer');
    expect(writer).not.toContain('khoảng 200 từ đầu');
    expect(writer).not.toContain('dù pacing còn là full_scene');
    expect(writer).toContain('Chi tiết kỹ thuật được ở trung tâm');
    expect(planner).not.toContain('earlyPayoffs chỉ là hợp đồng cho chương 1/3/5/7/10');
    expect(planner).not.toContain('Không dành cả chương cho một chi tiết nghề nghiệp vi mô');
    expect(planner).not.toContain('lần sử dụng đầu tiên của bất kỳ thiết bị');
    expect(editor).not.toContain('Đừng nhầm “đúng quy trình” với sảng cảm');
    expect(arc).not.toContain('Không dành cả chương cho một chi tiết nghề nghiệp vi mô');
    expect(arc).toContain('Khám phá cơ hội, làm được mẫu và có thị trường');
    expect(voice).toContain('A/B VOICE MARKER');
    expect(voice).toContain('Chi tiết kỹ thuật được ở trung tâm');
  });

  test('extractor does not restate durable facts when no new character learns them', () => {
    expect(serialSystemPrompt('extractor', v3Premise())).toMatch(
      /không lặp evidence chỉ vì chương nhắc lại hoặc hành động theo kiến thức cũ/,
    );
  });

  test('a blocking prose finding closes the publication gate while minor prose does not', () => {
    const assessment = {
      protagonist: 'Nhân vật chính có nghề nghiệp, giới hạn và mong muốn đủ rõ để theo dõi.',
      world: 'Thế giới có sinh kế và tổ chức tiếp tục vận hành ngoài nhân vật chính.',
      causality: 'Các quyết định quan trọng đều đi từ thông tin đã xuất hiện trên trang.',
      sceneLife: 'Cảnh có vật dụng, quan hệ và phản ứng cụ thể gắn với nơi chốn.',
      desireToContinue: 'Độc giả có lý do theo dõi phép thử tiếp theo và hệ quả của nó.',
    };
    const finding = {
      target: 'prose' as const,
      kind: 'unlived_scene' as const,
      severity: 'blocking' as const,
      chapterNumber: 3,
      quote: 'Khải đã hoàn tất mọi phép thử.',
      explanation: 'Chương tóm tắt kết quả quan trọng mà không diễn phép thử nào.',
      direction: 'Viết lại cảnh thử và phản ứng, giữ bản nháp ở trạng thái riêng tư.',
    };
    const blocking = NarrativeReviewSchema.parse({ findings: [finding], readerAssessment: assessment });
    expect(narrativeReviewGate(blocking)).toMatchObject({ mayPublish: false });
    const minor = NarrativeReviewSchema.parse({
      findings: [{ ...finding, severity: 'minor' }],
      readerAssessment: assessment,
    });
    expect(narrativeReviewGate(minor)).toMatchObject({ mayPublish: true });
  });

  test('v3 rolling plans may continue a developing discovery scene mode', async () => {
    const premise = v3Premise();
    const active = explorationCycle();
    const candidate = {
      ...active,
      startChapter: 3,
      plannedEndChapter: 5,
      beatSheets: [{
        ...active.beatSheets[1],
        chapterNumber: 3,
        sceneMode: 'discovery',
        openingBridge: 'Khải đối chiếu hai lần thử trước khi thay đổi một biến duy nhất.',
        protagonistMove: 'Anh tự chọn thử giới hạn thời gian của cánh cửa.',
        beats: ['Đối chiếu ghi chép cũ', 'Thử một biến mới có đường lui'],
        materialOutcome: 'Khải biết thêm một giới hạn mới mà chưa biến nó thành sản phẩm.',
        emotionalTarget: 'Sự thận trọng chuyển thành một phương pháp khám phá có kiểm soát.',
        prerequisiteIds: ['cua_noi_hai_kho'],
        revealsFactIds: [],
        advancesMilestoneIds: [],
      }],
    } as CyclePlan;
    const provider = {
      async text() { throw new Error('unused'); },
      async json<T>(input: { model: string }) {
        return { value: candidate as T, usage: { ...baseUsage, model: input.model } };
      },
    } as StoryModelProvider;
    const bible = seedBible({ premise });
    bible.symbolicCore.narrativeEvidence.push({
      id: 'cua_noi_hai_kho', chapterNumber: 1,
      quote: 'Cánh cửa mở sang kho khác.', learnedByCharacterIds: [],
    });
    const planned = await planNextCycle({
      provider,
      routes: DEFAULT_SERIAL_ROUTES,
      premise,
      bible,
      previousCycle: null,
      activeCycle: active,
      cycleNumber: 1,
      volumeNumber: 1,
      startChapter: 3,
      fixedEndChapter: 5,
      recentVerdicts: [],
    });
    expect(planned.cycle.beatSheets[0].sceneMode).toBe('discovery');
    expect(planned.usages).toHaveLength(1);
  });

  test('both two-world pilots carry the current protected-store contract', () => {
    for (const file of ['song-xuyen-tuong-lai-v3-review.json', 'cua-hang-cong-phap-v3-review.json']) {
      const artifact = JSON.parse(readFileSync(join(
        process.cwd(), 'factory/serial/song-xuyen/private', file,
      ), 'utf8')) as { reviewState: string; replacesPublicContent: boolean; foundation: unknown };
      expect(artifact.reviewState).toBe('private_foundation_only');
      expect(artifact.replacesPublicContent).toBe(false);
      const foundation = NarrativeFoundationSchema.parse(artifact.foundation);
      expect(foundation.commerceFantasy?.protectedStore.protections).toHaveLength(6);
      expect(foundation.commerceFantasy?.valueContrasts).toHaveLength(2);
    }
  });

  test('Story Factory adds a grounded literary review only for opted-in kernels', async () => {
    const artifact = JSON.parse(readFileSync(join(
      process.cwd(),
      'factory/serial/song-xuyen/private/song-xuyen-tuong-lai-v3-review.json',
    ), 'utf8')) as { foundation: unknown };
    const foundation = NarrativeFoundationSchema.parse(artifact.foundation);
    let calls = 0;
    const prompts: Array<Record<string, unknown>> = [];
    const provider = {
      async text() { throw new Error('unused'); },
      async json<T>(input: { prompt: string }) {
        calls += 1;
        prompts.push(JSON.parse(input.prompt) as Record<string, unknown>);
        return {
          value: {
            findings: [{
              target: 'prose',
              kind: 'unlived_scene',
              severity: 'minor',
              chapterNumber: 1,
              quote: 'Khải ghi lại hạn dùng',
              explanation: 'Chi tiết đời sống có mặt nhưng có thể gắn thêm một lựa chọn nhỏ của Khải.',
              direction: 'Giữ cảnh và cho thói quen kiểm hàng ảnh hưởng trực tiếp tới phép thử kế tiếp.',
            }],
            readerAssessment: {
              protagonist: 'Khải hiện ra như một chủ tiệm cẩn thận với áp lực và năng lực có sẵn.',
              world: 'Đời sống cửa tiệm đã có nhịp riêng trước khi yếu tố song xuyên xuất hiện.',
              causality: 'Thói quen kiểm hàng dẫn hợp lý tới cách Khải kiểm tra hiện tượng mới.',
              sceneLife: 'Cảnh có vật dụng, việc làm và lựa chọn cụ thể thay vì chỉ tóm tắt hồ sơ.',
              desireToContinue: 'Có lý do đọc tiếp để xem phép thử đầu tiên cho kết quả và giới hạn gì.',
            },
          } as T,
          usage: { ...baseUsage, model: 'literary-review', costUsd: 0.02 },
        };
      },
    } as StoryModelProvider;
    const chapters = [{ chapterNumber: 1, title: 'Ca hàng cuối ngày', content: 'Khải ghi lại hạn dùng rồi mới kéo chiếc kệ ẩm khỏi tường.' }];
    const legacy = await reviewNarrativeWindow({
      provider, model: 'judge', kernel: {} as StoryKernel, chapters, baseUsage,
    });
    expect(legacy.narrativeReview).toBeNull();
    expect(calls).toBe(0);
    const profiled = await reviewNarrativeWindow({
      provider,
      model: 'judge',
      kernel: { narrativeFoundation: foundation } as StoryKernel,
      chapters,
      baseUsage,
      diagnosticContext: {
        arc: { id: 'arc_1' },
        stateAtWindowStart: { chapterNumber: 0 },
        stateAtWindowEnd: { chapterNumber: 5 },
        approvedPlan: { plans: [{ chapterNumber: 1 }] },
        priorEvidence: [{ chapterNumber: 0, note: 'checkpoint' }],
      },
    });
    expect(profiled.narrativeReview?.findings[0]?.target).toBe('prose');
    expect(profiled.usage.costUsd).toBeCloseTo(0.03);
    expect(calls).toBe(1);
    expect(prompts[0]).toMatchObject({
      diagnosticContext: {
        arc: { id: 'arc_1' },
        stateAtWindowStart: { chapterNumber: 0 },
        stateAtWindowEnd: { chapterNumber: 5 },
        approvedPlan: { plans: [{ chapterNumber: 1 }] },
      },
    });
  });

  test('Serial literary diagnosis receives the approved plan and sequence-start knowledge', async () => {
    const premise = v3Premise();
    const bible = seedBible({ premise });
    const plan = explorationCycle();
    let payload: Record<string, unknown> | null = null;
    const provider = {
      async text() { throw new Error('unused'); },
      async json<T>(input: { prompt: string; model: string }) {
        payload = JSON.parse(input.prompt) as Record<string, unknown>;
        return {
          value: {
            findings: [],
            readerAssessment: {
              protagonist: 'Khải có đời sống và năng lực ban đầu rõ ràng.',
              world: 'Hai thế giới vận hành ngoài ý muốn của Khải.',
              causality: 'Quyết định đi theo điều đã biết và phép thử.',
              sceneLife: 'Cảnh có đồ vật, công việc và quan hệ cụ thể.',
              desireToContinue: 'Phép thử kế tiếp có mục tiêu rõ.',
            },
          } as T,
          usage: { ...baseUsage, model: input.model },
        };
      },
    } as StoryModelProvider;
    await reviewNarrativeSequence({
      provider, routes: DEFAULT_SERIAL_ROUTES, premise,
      chapters: [{ chapterNumber: 1, title: 'Ca tối', content: 'Khải đánh dấu chai nước rồi đặt nó qua ngưỡng cửa.' }],
      bible, startBible: bible, approvedPlan: plan,
    });
    expect(payload).toMatchObject({
      approvedPlan: { schemaVersion: 2, startChapter: 1 },
      stateAtSequenceStart: { chapterNumber: 0 },
      durableNarrativeState: { revealedNarrativeIds: [] },
    });
  });

  test('Serial literary review grounds a unique quote and repairs its chapter number without another call', async () => {
    const premise = v3Premise();
    let calls = 0;
    const provider = {
      async text() { throw new Error('unused'); },
      async json<T>(input: { model: string }) {
        calls += 1;
        return {
          value: {
            findings: [{
              target: 'prose', kind: 'unlived_scene', severity: 'minor', chapterNumber: 2,
              quote: 'Khải đánh dấu chai nước', explanation: 'Chi tiết cần được sống kỹ hơn.',
              direction: 'Giữ phép thử ở trên trang.',
            }],
            readerAssessment: {
              protagonist: 'Khải hiện rõ.', world: 'Đời sống đủ rõ.', causality: 'Có bước chuẩn bị.',
              sceneLife: 'Cảnh có thao tác.', desireToContinue: 'Có câu hỏi tiếp theo.',
            },
          } as T,
          usage: { ...baseUsage, model: input.model },
        };
      },
    } as StoryModelProvider;
    const result = await reviewNarrativeSequence({
      provider, routes: DEFAULT_SERIAL_ROUTES, premise,
      chapters: [
        { chapterNumber: 1, title: 'Ca tối', content: 'Khải đánh dấu chai nước rồi đặt qua cửa.' },
        { chapterNumber: 2, title: 'Sáng hôm sau', content: 'Anh khóa cửa và kiểm sổ.' },
      ],
    });

    expect(calls).toBe(1);
    expect(result?.review.findings[0]).toMatchObject({
      chapterNumber: 1,
      quote: 'Khải đánh dấu chai nước',
    });
  });

  test('Serial literary review preserves provider credential evidence for failure disposition', async () => {
    const premise = v3Premise();
    const provider = {
      async text() { throw new Error('unused'); },
      async json() {
        throw new StoryFactoryError('infra_blocked', 'Bad key', { providerCredential: true });
      },
    } as StoryModelProvider;
    await expect(reviewNarrativeSequence({
      provider, routes: DEFAULT_SERIAL_ROUTES, premise,
      chapters: [{ chapterNumber: 1, title: 'Ca tối', content: 'Khải khóa kho rồi ghi sổ.' }],
    })).rejects.toMatchObject({
      code: 'infra_blocked', evidence: { providerCredential: true },
    });
  });

  test('literary quote repair is localized and preserves all billed usage when it still fails', async () => {
    const foundation = v3Premise().narrativeFoundation!;
    let calls = 0;
    const badReview = {
      findings: [{
        target: 'prose', kind: 'unlived_scene', severity: 'blocking', chapterNumber: 1,
        quote: 'một câu không tồn tại trong chương',
        explanation: 'Kết quả quan trọng bị kể tắt.',
        direction: 'Diễn phép thử trên trang.',
      }],
      readerAssessment: {
        protagonist: 'Chưa đủ rõ.', world: 'Chưa đủ rõ.', causality: 'Thiếu bước.',
        sceneLife: 'Bị kể tắt.', desireToContinue: 'Cần sửa.',
      },
    };
    const provider = {
      async text() { throw new Error('unused'); },
      async json<T>(input: { model: string }) {
        calls += 1;
        return { value: badReview as T, usage: { ...baseUsage, model: input.model, costUsd: 0.02 } };
      },
    } as StoryModelProvider;
    await expect(reviewNarrativeWindow({
      provider,
      model: 'judge',
      kernel: { narrativeFoundation: foundation } as StoryKernel,
      chapters: [{ chapterNumber: 1, title: 'Ca tối', content: 'Khải khóa cửa rồi kiểm lại chai nước.' }],
      baseUsage,
    })).rejects.toMatchObject({
      code: 'quality_blocked',
      evidence: { usages: [expect.objectContaining({ costUsd: 0.05 })] },
    });
    expect(calls).toBe(2);
  });

  test('Story Factory preserves completed review usage when the localized correction times out', async () => {
    const foundation = v3Premise().narrativeFoundation!;
    let calls = 0;
    const provider = {
      async text() { throw new Error('unused'); },
      async json<T>(input: { model: string }) {
        calls += 1;
        if (calls === 2) throw new Error('localized correction timeout');
        return {
          value: {
            findings: [{
              target: 'prose', kind: 'unlived_scene', severity: 'blocking', chapterNumber: 1,
              quote: 'quote không tồn tại', explanation: 'Phép thử bị kể tắt.', direction: 'Diễn phép thử.',
            }],
            readerAssessment: {
              protagonist: 'Nhân vật chưa rõ.', world: 'Thế giới chưa rõ.', causality: 'Thiếu bước chuẩn bị.',
              sceneLife: 'Cảnh quan trọng bị kể tắt.', desireToContinue: 'Cần thấy phép thử.',
            },
          } as T,
          usage: { ...baseUsage, model: input.model, costUsd: 0.02 },
        };
      },
    } as StoryModelProvider;
    await expect(reviewNarrativeWindow({
      provider, model: 'judge', kernel: { narrativeFoundation: foundation } as StoryKernel,
      chapters: [{ chapterNumber: 1, title: 'Ca tối', content: 'Khải khóa kho.' }], baseUsage,
    })).rejects.toMatchObject({
      code: 'infra_blocked',
      evidence: { usages: [expect.objectContaining({ costUsd: 0.03 })] },
    });
    expect(calls).toBe(2);
  });
});
