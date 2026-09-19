import type { Bible, ChapterDigest, CyclePlan, JudgeVerdict, PayoffKind, Premise } from './contracts';
import { overdueHooks, recentPayoffKinds, tierIndex } from './state';

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

export function previousTail(previousChapter: string | null, words = PREVIOUS_TAIL_WORDS): string {
  if (!previousChapter) return '';
  const parts = previousChapter.trim().split(/\s+/);
  return parts.length <= words ? previousChapter.trim() : parts.slice(-words).join(' ');
}

function nameOf(bible: Bible, id: string): string {
  return bible.castSheet.find(entry => entry.id === id)?.name ?? id;
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
  const tierName = (tierId: string | null) =>
    premise.tierLadder.find(tier => tier.id === tierId)?.name ?? null;
  return {
    ngayTruyen: core.storyDay,
    nhanVatChinh: {
      capBac: tierName(core.mc.tierId),
      dangO: core.mc.locationId,
    },
    daChet: core.cast.filter(member => !member.alive).map(member => nameOf(bible, member.id)),
    viTri: core.cast
      .filter(member => member.alive && castIds.includes(member.id))
      .map(member => ({ ten: nameOf(bible, member.id), capBac: tierName(member.tierId), dangO: member.locationId })),
    bietBiMat: core.cast
      .filter(member => member.knowsFinger)
      .map(member => nameOf(bible, member.id)),
    phucButConNo: core.openHooks
      .filter(hook => hook.status === 'open' || hook.status === 'moving')
      .map(hook => ({ noiDung: hook.what, hanChuong: hook.dueByChapter })),
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
  const rung = premise.goldenFinger.evolution[
    Math.max(0, Math.min(premise.goldenFinger.evolution.length - 1, tierIndex(premise, bible.symbolicCore.mc.tierId)))
  ];

  return {
    truyen: { tieuDe: premise.title, dauTruong: premise.arena },
    giong: {
      ngoiKe: premise.voiceSheet.pov,
      vanPhong: premise.voiceSheet.register,
      luatDatTenChuong: premise.voiceSheet.chapterTitleRule,
      camKy: premise.voiceSheet.taboos,
    },
    kimThuChi: {
      ten: premise.goldenFinger.name,
      luat: premise.goldenFinger.rule,
      gioiHan: premise.goldenFinger.limit,
      nacHienTai: rung ? `${rung.name} — ${rung.changesUse}` : null,
    },
    chuongSo: chapterNumber,
    apLucChuKy: cycle.pressure,
    nhipChuong: sheet.beats,
    mucTieuCamXuc: sheet.emotionalTarget,
    thuMoiPhaiDatTen: sheet.newNamedThing,
    kieuHookKetChuong: sheet.endHookKind,
    nhanVatLienQuan: castIds.map(id => ({
      ten: nameOf(bible, id),
      hoSo: bible.castSheet.find(entry => entry.id === id)?.sheet ?? '',
    })),
    boiCanh: bible.world.map(entry => ({ ten: entry.name, ghiChu: entry.note })),
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
  const castIds = bible.symbolicCore.cast.map(member => member.id);
  return {
    chuongSo: chapterNumber,
    tieuDe: input.title,
    chuong: input.prose,
    leRaPhaiLam: sheet ? { nhip: sheet.beats, camXuc: sheet.emotionalTarget, thuMoi: sheet.newNamedThing, hook: sheet.endHookKind } : null,
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
  return {
    chuongSo: input.chapterNumber,
    tieuDe: input.title,
    chuong: input.prose,
    // Exact ids the extractor must reuse rather than invent, so the merge can bind them.
    nhanVatDaBiet: input.bible.castSheet.map(entry => ({ id: entry.id, ten: entry.name })),
    capBacHopLe: input.premise.tierLadder.map(tier => ({ id: tier.id, ten: tier.name })),
    diaDiemDaBiet: input.bible.world.map(entry => ({ id: entry.id, ten: entry.name })),
    phucButDangMo: input.bible.symbolicCore.openHooks
      .filter(hook => hook.status !== 'paid' && hook.status !== 'dropped')
      .map(hook => ({ id: hook.id, noiDung: hook.what })),
  };
}

export function buildCyclePlannerBrief(input: {
  premise: Premise;
  bible: Bible;
  previousCycle: CyclePlan | null;
  cycleNumber: number;
  volumeNumber: number;
  startChapter: number;
  steering: string[];
}) {
  const { premise, bible } = input;
  const used: PayoffKind[] = recentPayoffKinds(bible);
  return {
    truyen: {
      tieuDe: premise.title,
      dauTruong: premise.arena,
      fantasyDocGia: premise.readerFantasy,
      huongKetThuc: premise.endingDirection,
    },
    kimThuChi: premise.goldenFinger,
    thangCapBac: premise.tierLadder,
    chuKySo: input.cycleNumber,
    quyenSo: input.volumeNumber,
    chuongBatDau: input.startChapter,
    trangThaiHienTai: mustNotContradict(bible, premise, bible.symbolicCore.cast.map(member => member.id)),
    nhanVat: bible.castSheet,
    boiCanh: bible.world,
    tomTatGanDay: bible.recentSummary,
    tomTatCacQuyen: bible.volumeSummaries,
    chuKyTruoc: input.previousCycle
      ? {
        apLuc: input.previousCycle.pressure,
        loaiSuong: input.previousCycle.climax.payoffKind,
        ketQua: input.previousCycle.climax.result,
        hookDeLai: input.previousCycle.nextHook,
      }
      : null,
    // Two code-owned constraints the planner cannot argue with.
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
