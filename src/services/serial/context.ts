import type { Bible, ChapterDigest, CyclePlan, JudgeVerdict, PayoffKind, Premise } from './contracts';
import { payoffKindIds } from './playbook';
import { overdueHooks, recentPayoffKinds } from './state';

/**
 * What each role is allowed to see.
 *
 * The inversion against the old engine is in `mustNotContradict`. Previously the
 * Writer received a ledger of required deltas and its job was to dramatise them,
 * which is why chapters read like worked examples. Here it receives the beats it
 * has to hit and a short list of facts it may not break, and everything in
 * between is its own.
 */

const RELEVANT_CAST_LIMIT = 10;
const PREVIOUS_TAIL_WORDS = 800;
const ASSET_LOT_SLICE_LIMIT = 40;
const ASSET_EVENT_SLICE_LIMIT = 50;

export function previousTail(previousChapter: string | null, words = PREVIOUS_TAIL_WORDS): string {
  if (!previousChapter) return '';
  const parts = previousChapter.trim().split(/\s+/);
  return parts.length <= words ? previousChapter.trim() : parts.slice(-words).join(' ');
}

function nameOf(bible: Bible, id: string): string {
  return bible.castSheet.find(entry => entry.id === id)?.name ?? id;
}

function customerLoopMilestone(cycle: CyclePlan, chapterNumber: number) {
  const loop = cycle.customerLoop;
  if (loop.schedule.purchaseChapter === chapterNumber) {
    return { step: 'purchase', action: loop.purchase, assetId: loop.purchaseAssetId, terms: loop.purchaseTerms };
  }
  if (loop.schedule.useToEarnChapter === chapterNumber) {
    return { step: 'use_to_earn', action: loop.useToEarn, assetId: loop.purchaseAssetId };
  }
  if (loop.schedule.publicProofChapter === chapterNumber) {
    return { step: 'public_proof', action: loop.publicProof, assetId: loop.purchaseAssetId };
  }
  if (loop.schedule.returnUpgradeChapter === chapterNumber) {
    return {
      step: 'return_upgrade', action: loop.returnUpgrade,
      assetId: loop.returnUpgradeAssetId, terms: loop.returnUpgradeTerms,
    };
  }
  return null;
}

/** Positive, bounded ownership state: what can still be used and what recently left the account. */
export function assetLedgerSlice(bible: Bible, castIds: string[], semanticText = '', includeAll = false) {
  const focusedOwners = new Set(castIds);
  const haystack = semanticText.toLowerCase();
  const relevantAssetIds = new Set(bible.symbolicCore.activeAssetLots
    .filter(lot => focusedOwners.has(lot.ownerId)
      || haystack.includes(lot.assetName.toLowerCase())
      || haystack.includes(lot.ownerName.toLowerCase())
      || includeAll)
    .map(lot => lot.assetId));
  const activeLots = bible.symbolicCore.activeAssetLots
    .filter(lot => focusedOwners.has(lot.ownerId) || relevantAssetIds.has(lot.assetId))
    .slice(-ASSET_LOT_SLICE_LIMIT);
  const recentEvents = bible.symbolicCore.recentAssetEvents
    .filter(event => includeAll || relevantAssetIds.has(event.assetId)
      || (event.fromOwnerId ? focusedOwners.has(event.fromOwnerId) : false)
      || (event.toOwnerId ? focusedOwners.has(event.toOwnerId) : false))
    .slice(-ASSET_EVENT_SLICE_LIMIT);
  return { activeLots, recentEvents };
}

/**
 * Cast the chapter can reasonably touch: whoever the beats name, whoever shares the
 * protagonist's location, and whoever was on stage most recently. Capped so a cast of
 * eighty at chapter 400 does not quietly become the whole prompt.
 */
export function relevantCast(bible: Bible, premise: Premise, beatText: string): string[] {
  const core = bible.symbolicCore;
  const protagonistId = premise.castSeed.find(member => member.role === 'protagonist')?.id;
  const haystack = beatText.toLowerCase();
  const scored = core.cast.filter(member => member.alive).map(member => {
    const name = nameOf(bible, member.id).toLowerCase();
    const named = name.length > 1 && haystack.includes(name);
    return {
      id: member.id,
      score: (member.id === protagonistId ? 1_000 : 0)
        + (named ? 100 : 0)
        + (member.locationId === core.mc.locationId ? 10 : 0)
        + member.lastSeenChapter / 1_000,
    };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, RELEVANT_CAST_LIMIT).map(item => item.id);
}

/** The small, hard surface. Short on purpose: a Writer that reads it will obey it. */
export function mustNotContradict(bible: Bible, premise: Premise, castIds: string[]) {
  const core = bible.symbolicCore;
  const progressionName = (subjectId: string) => core.progressions
    .filter(state => state.subjectId === subjectId)
    .map(state => {
      const system = premise.worldKernel.progressionSystems.find(item => item.id === state.systemId);
      return {
        he: system?.name ?? state.systemId,
        nhanh: system?.tracks.find(track => track.id === state.trackId)?.name ?? null,
        cap: system?.ranks.find(rank => rank.id === state.rankId)?.name ?? state.rankId,
        tieuCanh: system?.minorStages.find(stage => stage.id === state.minorStageId)?.name ?? null,
      };
    });
  return {
    ngayTruyen: core.storyDay,
    nhanVatChinh: {
      tienTrien: progressionName(core.mc.characterId),
      dangO: core.mc.locationId,
      nacKimThuChi: core.mc.goldenFingerRungId,
    },
    daChet: core.cast.filter(member => !member.alive).map(member => nameOf(bible, member.id)),
    viTri: core.cast
      .filter(member => member.alive && castIds.includes(member.id))
      .map(member => ({ ten: nameOf(bible, member.id), tienTrien: progressionName(member.id), dangO: member.locationId })),
    bietBiMat: core.cast
      .filter(member => member.knowsFinger)
      .map(member => nameOf(bible, member.id)),
    phucButConNo: core.openHooks
      .filter(hook => hook.status === 'open' || hook.status === 'moving')
      .map(hook => ({ noiDung: hook.what, hanChuong: hook.dueByChapter })),
  };
}

/** Canon slice for one chapter. Planner receives the whole kernel; other roles do not. */
export function relevantWorldSlice(input: {
  premise: Premise;
  bible: Bible;
  castIds: string[];
  chapterNumber: number;
  beatText: string;
}) {
  const { premise, bible, castIds, chapterNumber } = input;
  const kernel = premise.worldKernel;
  const opening = kernel.openingContract.find(contract => contract.chapterNumber === chapterNumber);
  const semanticText = `${input.beatText} ${opening ? Object.values(opening).join(' ') : ''}`.toLowerCase();
  const protagonistId = premise.castSeed.find(member => member.role === 'protagonist')?.id;
  const focusedCastIds = new Set(castIds.filter(castId => {
    const name = nameOf(bible, castId).toLowerCase();
    return castId === protagonistId || (name.length > 1 && semanticText.includes(name));
  }));
  const locationIds = new Set(
    bible.symbolicCore.cast.filter(member => focusedCastIds.has(member.id)).map(member => member.locationId),
  );
  const worlds = kernel.worlds.map(world => ({
    id: world.id,
    name: world.name,
    civilizationState: world.civilizationState,
    locations: world.locations.filter(location => locationIds.has(location.id)
      || semanticText.includes(location.name.toLowerCase())),
    factions: world.factions.filter(faction => semanticText.includes(faction.name.toLowerCase())),
  })).filter(world => world.locations.length > 0 || world.factions.length > 0);

  const productIds = new Set(kernel.launchProducts
    .filter(product => product.introducedChapter === chapterNumber
      || semanticText.includes(product.name.toLowerCase()))
    .map(product => product.id));
  const products = kernel.launchProducts.filter(product => productIds.has(product.id));
  const systemIds = new Set(bible.symbolicCore.progressions
    .filter(state => focusedCastIds.has(state.subjectId) || bible.symbolicCore.mc.keyAssetIds.includes(state.subjectId))
    .map(state => state.systemId));
  const progressionSubjects = kernel.progressionSubjects.map(subject => ({
    ...subject,
    currentProgressions: bible.symbolicCore.progressions.filter(state => state.subjectId === subject.id),
  }));
  for (const subject of progressionSubjects) {
    for (const state of subject.currentProgressions) systemIds.add(state.systemId);
  }
  const gradeIds = new Set(products.map(product => product.gradeSystemId));
  return {
    worlds,
    // These ids are the only legal non-character subjects for progression changes.
    // A kernel contains very few of them, and omitting one makes an extractor bind a
    // business milestone to a similarly named faction instead of the tracked entity.
    progressionSubjects,
    progressionSystems: kernel.progressionSystems.filter(system => systemIds.has(system.id)),
    gradeSystems: kernel.gradeSystems.filter(system => gradeIds.has(system.id)),
    equivalences: kernel.equivalences.filter(item => systemIds.has(item.leftSystemId) || systemIds.has(item.rightSystemId)),
    economyLoops: kernel.economyLoops.filter(loop => worlds.some(world => world.id === loop.fromWorldId || world.id === loop.toWorldId)),
    launchProducts: products,
  };
}

export function buildWriterBrief(input: {
  premise: Premise;
  bible: Bible;
  cycle: CyclePlan;
  chapterNumber: number;
  previousChapter: string | null;
}) {
  const { premise, bible, cycle, chapterNumber } = input;
  const sheet = cycle.beatSheets.find(item => item.chapterNumber === chapterNumber);
  if (!sheet) throw new Error(`Cycle ${cycle.cycleNumber} has no beat sheet for chapter ${chapterNumber}.`);

  const beatText = [sheet.newNamedThing, sheet.emotionalTarget, ...sheet.beats, cycle.pressure].join(' ');
  const castIds = relevantCast(bible, premise, beatText);
  const rung = premise.goldenFinger.evolution.find(item => item.id === bible.symbolicCore.mc.goldenFingerRungId);
  const worldSlice = relevantWorldSlice({ premise, bible, castIds, chapterNumber, beatText });
  const assetLedger = assetLedgerSlice(bible, castIds, beatText);
  const openingContract = premise.worldKernel.openingContract.find(item => item.chapterNumber === chapterNumber) ?? null;

  return {
    truyen: { tieuDe: premise.title, dauTruong: premise.arena, readerFantasy: premise.readerFantasy },
    giong: {
      ngoiKe: premise.voiceSheet.pov,
      vanPhong: premise.voiceSheet.register,
      luatDatTenChuong: premise.voiceSheet.chapterTitleRule,
      luatPhanUng: premise.voiceSheet.reactionRule,
      camKy: premise.voiceSheet.taboos,
    },
    kimThuChi: {
      ten: premise.goldenFinger.name,
      luat: premise.goldenFinger.rule,
      // Optional functional scope from the approved premise.
      khongVoiToi: premise.goldenFinger.scope,
      nacHienTai: rung ? `${rung.name} — ${rung.changesUse}` : null,
    },
    nguonDoiKhang: premise.oppositionEngine,
    chuongSo: chapterNumber,
    dongLucChuKy: cycle.pressure,
    vongKhachHangChuKy: cycle.customerLoop,
    mocVongKhachHangChuongNay: customerLoopMilestone(cycle, chapterNumber),
    nhipChuong: sheet.beats,
    mucTieuCamXuc: sheet.emotionalTarget,
    thuMoiPhaiDatTen: sheet.newNamedThing,
    kieuHookKetChuong: sheet.endHookKind,
    ghiChuBienTap: cycle.editorialNotes,
    soGiaoDichMoDau: chapterNumber <= 4
      ? premise.worldKernel.openingLedger.filter(entry => entry.chapterNumber <= chapterNumber)
      : [],
    nhanVatLienQuan: castIds.map(id => ({
      ten: nameOf(bible, id),
      hoSo: bible.castSheet.find(entry => entry.id === id)?.sheet ?? '',
    })),
    boiCanh: worldSlice.worlds.flatMap(world => world.locations.map(location => ({
      ten: location.name,
      ghiChu: bible.world.find(entry => entry.id === location.id)?.note ?? location.note,
    }))),
    worldSlice,
    soTaiSanDauChuong: assetLedger,
    hopDongMoDau: openingContract,
    khongDuocTrai: mustNotContradict(bible, premise, castIds),
    doanCuoiChuongTruoc: previousTail(input.previousChapter),
    tieuDeGanDay: bible.recentSummary.map(entry => entry.title),
    cumTuDaMon: bible.styleMemory,
  };
}

export function buildJudgeBrief(input: {
  premise: Premise;
  bible: Bible;
  cycle: CyclePlan;
  chapterNumber: number;
  title: string;
  prose: string;
}) {
  const { premise, bible, cycle, chapterNumber } = input;
  const sheet = cycle.beatSheets.find(item => item.chapterNumber === chapterNumber);
  const beatText = sheet ? [sheet.newNamedThing, sheet.emotionalTarget, ...sheet.beats].join(' ') : '';
  const castIds = relevantCast(bible, premise, `${beatText} ${input.prose}`);
  const assetLedger = assetLedgerSlice(bible, castIds, `${beatText} ${input.prose}`);
  return {
    readerFantasy: premise.readerFantasy,
    kimThuChi: { ten: premise.goldenFinger.name, luat: premise.goldenFinger.rule, phamVi: premise.goldenFinger.scope },
    chuongSo: chapterNumber,
    tieuDe: input.title,
    chuong: input.prose,
    leRaPhaiLam: sheet ? { nhip: sheet.beats, camXuc: sheet.emotionalTarget, thuMoi: sheet.newNamedThing, hook: sheet.endHookKind } : null,
    vongKhachHangChuKy: cycle.customerLoop,
    mocVongKhachHangChuongNay: customerLoopMilestone(cycle, chapterNumber),
    luatPhanUng: premise.voiceSheet.reactionRule,
    worldSlice: relevantWorldSlice({ premise, bible, castIds, chapterNumber, beatText }),
    soTaiSanDauChuong: assetLedger,
    hopDongMoDau: premise.worldKernel.openingContract.find(item => item.chapterNumber === chapterNumber) ?? null,
    khongDuocTrai: mustNotContradict(bible, premise, castIds),
    tomTatChuongTruoc: bible.recentSummary,
    cumTuDaMon: bible.styleMemory,
  };
}

export function buildExtractorBrief(input: {
  premise: Premise;
  bible: Bible;
  chapterNumber: number;
  title: string;
  prose: string;
}) {
  const castIds = relevantCast(input.bible, input.premise, input.prose);
  const slice = relevantWorldSlice({
    premise: input.premise, bible: input.bible, castIds,
    chapterNumber: input.chapterNumber, beatText: input.prose,
  });
  const currentRungIndex = input.premise.goldenFinger.evolution.findIndex(
    rung => rung.id === input.bible.symbolicCore.mc.goldenFingerRungId,
  );
  const assetLedger = assetLedgerSlice(input.bible, castIds, input.prose);
  return {
    chuongSo: input.chapterNumber,
    tieuDe: input.title,
    chuong: input.prose,
    // Exact ids the extractor must reuse rather than invent, so the merge can bind them.
    nhanVatDaBiet: input.bible.castSheet.map(entry => ({ id: entry.id, ten: entry.name })),
    chuTheTienTrienHopLe: slice.progressionSubjects.map(subject => ({
      id: subject.id,
      ten: subject.name,
      loai: subject.kind,
      tienTrienHienTai: subject.currentProgressions,
      nacKeTiepDuyNhat: subject.currentProgressions.map(current => {
        const system = input.premise.worldKernel.progressionSystems.find(item => item.id === current.systemId);
        const rankIndex = system?.ranks.findIndex(rank => rank.id === current.rankId) ?? -1;
        return {
          systemId: current.systemId,
          trackId: current.trackId,
          rank: rankIndex >= 0 ? system?.ranks[rankIndex + 1] ?? null : null,
        };
      }),
    })),
    heTienTrienLienQuan: slice.progressionSystems,
    phamCapLienQuan: slice.gradeSystems,
    nacKimThuChiHopLe: input.premise.goldenFinger.evolution,
    nacKimThuChiHienTai: input.premise.goldenFinger.evolution[currentRungIndex] ?? null,
    nacKeTiepDuyNhat: input.premise.goldenFinger.evolution[currentRungIndex + 1] ?? null,
    diaDiemHopLe: slice.worlds.flatMap(world => world.locations.map(location => ({ id: location.id, ten: location.name }))),
    thucTheTheGioiHopLe: slice.worlds.flatMap(world => [
      { id: world.id, ten: world.name, loai: 'the_gioi' },
      ...world.locations.map(location => ({ id: location.id, ten: location.name, loai: 'dia_diem' })),
      ...world.factions.map(faction => ({ id: faction.id, ten: faction.name, loai: 'phe_phai' })),
    ]),
    phucButDangMo: input.bible.symbolicCore.openHooks
      .filter(hook => hook.status !== 'paid' && hook.status !== 'dropped')
      .map(hook => ({ id: hook.id, noiDung: hook.what })),
    soTaiSanDauChuong: assetLedger,
    chuSoHuuTaiSanDaBiet: [
      ...input.bible.castSheet.map(entry => ({ id: entry.id, ten: entry.name })),
      ...input.premise.worldKernel.worlds.flatMap(world => world.factions.map(faction => ({ id: faction.id, ten: faction.name }))),
    ],
  };
}

export function buildOpeningAuditBrief(input: {
  premise: Premise;
  chapters: Array<{ chapterNumber: number; title: string; content: string }>;
}) {
  return {
    truyen: {
      tieuDe: input.premise.title,
      readerFantasy: input.premise.readerFantasy,
      kimThuChi: input.premise.goldenFinger,
      camKy: input.premise.voiceSheet.taboos,
    },
    vongKinhTe: input.premise.worldKernel.economyLoops,
    hangMoMan: input.premise.worldKernel.launchProducts,
    hopDongBonChuong: input.premise.worldKernel.openingContract,
    soGiaoDichChuan: input.premise.worldKernel.openingLedger,
    chuong: input.chapters,
  };
}

export function buildCyclePlannerBrief(input: {
  premise: Premise;
  bible: Bible;
  previousCycle: CyclePlan | null;
  activeCycle?: CyclePlan | null;
  cycleNumber: number;
  volumeNumber: number;
  startChapter: number;
  fixedEndChapter?: number;
  steering: string[];
}) {
  const { premise, bible } = input;
  const used: PayoffKind[] = recentPayoffKinds(bible);
  return {
    truyen: {
      tieuDe: premise.title,
      dauTruong: premise.arena,
      readerFantasy: premise.readerFantasy,
      huongKetThuc: premise.endingDirection,
    },
    kimThuChi: premise.goldenFinger,
    nguonDoiKhang: premise.oppositionEngine,
    worldKernel: premise.worldKernel,
    luatPhanUng: premise.voiceSheet.reactionRule,
    chuKySo: input.cycleNumber,
    quyenSo: input.volumeNumber,
    chuongBatDau: input.startChapter,
    chuongKetThucCoDinh: input.fixedEndChapter ?? null,
    trangThaiHienTai: mustNotContradict(bible, premise, bible.symbolicCore.cast.map(member => member.id)),
    soTaiSanHienTai: assetLedgerSlice(bible, bible.symbolicCore.cast.map(member => member.id), [
      input.activeCycle?.customerLoop.purchase,
      input.activeCycle?.customerLoop.useToEarn,
      input.activeCycle?.customerLoop.returnUpgrade,
    ].filter(Boolean).join(' '), true),
    nhanVat: bible.castSheet,
    boiCanh: bible.world,
    tomTatGanDay: bible.recentSummary,
    tomTatCacQuyen: bible.volumeSummaries,
    chuKyTruoc: input.previousCycle
      ? {
        dongLuc: input.previousCycle.pressure,
        loaiSuong: input.previousCycle.climax.payoffKind,
        ketQua: input.previousCycle.climax.result,
        hookDeLai: input.previousCycle.nextHook,
        vongKhachHang: input.previousCycle.customerLoop,
      }
      : null,
    chuKyDangViet: input.activeCycle
      ? {
        dongLuc: input.activeCycle.pressure,
        escalation: input.activeCycle.escalation,
        climax: input.activeCycle.climax,
        vongKhachHang: input.activeCycle.customerLoop,
        aftermath: input.activeCycle.aftermath,
        nextHook: input.activeCycle.nextHook,
        chuongKetThuc: input.activeCycle.plannedEndChapter,
      }
      : null,
    // Two code-owned constraints the planner cannot argue with.
    loaiSuongHopLe: payoffKindIds(),
    loaiSuongKhongDuocDung: input.previousCycle ? [input.previousCycle.climax.payoffKind] : [],
    loaiSuongDaDungGanDay: used,
    phucButQuaHan: overdueHooks(bible, input.startChapter),
    chiDaoTuBienTap: input.steering,
  };
}

/** Steering collected from recent judge verdicts. Never applied to the chapter it came from. */
export function collectSteering(verdicts: JudgeVerdict[], limit = 8): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const verdict of [...verdicts].reverse()) {
    for (const line of verdict.steering) {
      const key = line.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(line.trim());
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/**
 * Phrases and images worn out by recent chapters, fed back to the Writer as a ban list.
 * Cheap, deterministic, and aimed at the failure the old window reviews kept reporting:
 * the same sentence shape arriving every fifth chapter.
 */
export function refreshStyleMemory(bible: Bible, verdicts: JudgeVerdict[], limit = 20): string[] {
  const quotes = verdicts.flatMap(verdict => [
    ...verdict.aiFlavor.map(item => item.quote),
    ...verdict.repetition.map(item => item.quote),
  ]);
  const merged = [...quotes, ...bible.styleMemory].map(entry => entry.trim()).filter(Boolean);
  return [...new Set(merged)].slice(0, limit);
}

/** Digest fields the planner needs to know a beat sheet was actually delivered. */
export function beatDelivery(digest: ChapterDigest, cycle: CyclePlan): { named: boolean; payoff: PayoffKind | null } {
  const sheet = cycle.beatSheets.find(item => item.chapterNumber === digest.chapterNumber);
  const expected = sheet?.newNamedThing.toLowerCase() ?? '';
  return {
    named: digest.newNamedThings.some(thing => expected.includes(thing.toLowerCase()) || thing.toLowerCase().includes(expected)),
    payoff: digest.payoffKind,
  };
}
