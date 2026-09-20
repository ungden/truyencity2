/**
 * Apply a human-read editorial bundle to a paused production serial.
 *
 * The database RPC checks every old title/content byte-for-byte and records a
 * recoverable revision before replacing the public chapter.
 */
import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { BibleSchema, ChapterDigestSchema, PremiseSchema } from '@/services/serial/contracts';
import { SERIAL_PROMPT_VERSION } from '@/services/serial/prompts';
import { rebuildBibleFromDigests, seedBible } from '@/services/serial/state';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const value = (name: string): string | undefined =>
  process.argv.find(item => item.startsWith(`--${name}=`))?.split('=').slice(1).join('=');

const bundlePath = value('bundle');
const confirmation = value('confirm-reviewed');
const dryRun = value('dry-run') === 'yes';
if (!bundlePath || confirmation !== 'yes') {
  throw new Error('Usage: --bundle=/tmp/rewrite.json --confirm-reviewed=yes');
}
const reviewedBundlePath = bundlePath;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const BundleSchema = z.object({
  book: z.enum(['mat-the', 'rau-tuoi']),
  novelId: z.string().uuid(),
  serialNovelId: z.string().uuid(),
  model: z.string().min(3),
  rewrites: z.array(z.object({
    chapterId: z.string().uuid(),
    chapterNumber: z.number().int().positive(),
    oldTitle: z.string(),
    oldContent: z.string(),
    newTitle: z.string(),
    newContent: z.string(),
    review: z.unknown(),
    usage: z.unknown(),
    costUsd: z.number().nonnegative(),
    direction: z.unknown(),
  }).passthrough()).min(1),
}).passthrough();

const books = {
  'mat-the': {
    premisePath: 'factory/serial/song-xuyen/01-cua-hang-cong-phap-tu-tien.json',
    customerLoop: {
      customerId: 'chu_da',
      entryNeed: 'Không có dị năng, bị xem là gánh nặng và cần một con đường sức mạnh tự mình luyện được.',
      purchaseAssetId: 'man_nguu_luyen_the_quyet_nhat_giai_trung_pham',
      purchaseMode: 'first_acquisition',
      purchase: 'Mua Man Ngưu Luyện Thể Quyết Nhất giai trung phẩm bằng tài sản hoặc phần thu hoạch của chính mình.',
      useToEarn: 'Dùng công pháp gia nhập chuyến săn Bãi Săn Bờ Đông, giết lang canh ổ rồi nhận phần tinh hạch.',
      publicProof: 'Gánh đòn và chia chiến lợi phẩm trước Tro Tàn cùng những người từng coi thường người không dị năng.',
      returnUpgradeAssetId: 'ho_than_phu_nhat_giai_ha_pham',
      returnUpgradeMode: 'new_capability',
      returnUpgrade: 'Mang tinh hạch kiếm được trở lại Song Giới mua Hộ Thân Phù Nhất giai hạ phẩm.',
    },
  },
  'rau-tuoi': {
    premisePath: 'factory/serial/song-xuyen/02-rau-tuoi-doi-ai.json',
    customerLoop: {
      customerId: 'diep_ninh',
      entryNeed: 'Xưởng máy thiếu vốn và bản thân cần thực phẩm tự nhiên để giữ trạng thái nghề nghiệp.',
      purchaseAssetId: 'nguon_rau_tuoi_dinh_ky',
      purchaseMode: 'first_acquisition',
      purchase: 'Đổi robot kiểm phẩm cùng công nghệ truy xuất lấy nguồn rau tươi định kỳ.',
      useToEarn: 'Dùng thực phẩm ổn định năng lực, hoàn thiện robot và giành đơn khai phá mới cho xưởng.',
      publicProof: 'Robot phân loại lô thật trước kỹ sư và chủ nông trại, giúp Diệp Ninh được công nhận năng lực nghề.',
      returnUpgradeAssetId: 'nguon_nguyen_lieu_tu_nhien_thuong_pham',
      returnUpgradeMode: 'higher_grade',
      returnUpgrade: 'Quay lại ký hợp đồng nguồn cung phẩm cấp cao hơn và đổi công nghệ thế hệ tiếp theo.',
    },
  },
} as const;

type JsonRecord = Record<string, any>;

const summaryPatches: Record<'mat-the' | 'rau-tuoi', Record<number, string>> = {
  'mat-the': {
    3: 'Lâm Việt bán sáu cân thịt và năm tinh hạch Hỏa lấy bốn mươi bốn linh thạch, giao đủ ba bí tịch; phiếu số dư thủ công của Tro Tàn giữ đúng sáu đơn vị thịt và năm đơn vị hạch.',
    5: 'Lâm Việt dùng bốn mươi mốt linh thạch nhập phù, vật tư, nguyên liệu, trả phí thi và thuê lò; Kho thu mua mở rồi đổi phiếu thủ công của Tro Tàn thành mười một điểm.',
    8: 'Tro Tàn hạ Liệt Trảo Lang hậu kỳ; Chu Dã dùng tinh hạch tự kiếm mua Hộ Thân Phù số 01, còn năm xác sạch vào Phiếu 001 và xác lang canh ổ được giữ làm vật chứng.',
    9: 'Lâm Việt mua đủ bốn mươi ba cân huyết nhục, lưu hai bộ mẫu, dùng nguyên liệu và mười hai cân thịt luyện đủ sáu Tịnh Mạch Đan, giao đơn Thành Vệ và được công nhận Nhất giai Luyện Đan Sư.',
    10: 'Lâm Việt bác yêu cầu tịch thu bằng đúng sổ Phiếu 001; Tô Vãn cùng Hứa An hạ Lang Vương Nhị giai mới và ký gửi tài sản theo phần sở hữu 6/4.',
  },
  'rau-tuoi': {
    3: 'La Chính dùng cà chua của Trần Khải làm Hồng Ngọc Bồi Dưỡng Nhất giai thượng phẩm, nhận quyền vận hành quầy; bốn tuần đầu được bảo đảm còn bốn tuần sau chỉ là quyền ưu tiên khi có nguồn mới.',
    4: 'Trần Khải đối soát đúng quota La Chính rồi tự qua cửa ký hợp đồng robot với Diệp Ninh: tám mươi kilôgam mỗi tuần trong tám tuần, buộc Khải Minh phải mở rộng mạng nguồn cung.',
    8: 'Trần Khải đổi rau lấy mô-đun Nhãn khóa chuỗi, tự mang về Vân Cảng phát hiện vật chứng tráo nhãn và giúp Liên minh tự trao quyền kiểm soát nhãn cho Lưu Dũng.',
    9: 'Khải Minh hoàn tất Nghiệm thu Tuyến Kho Gió Nam, khiến Vạn Tượng rút khiếu nại, khóa quyền vào kho của Ngô Thừa và ký tuyến mẫu ba tháng với Hải Đăng.',
    10: 'Diệp Ninh nhận lô tám mươi kilôgam, giành đơn dịch vụ robot có phí và KPI; Đồi Gió từ chối bán dữ liệu đất, còn Viện Dinh Dưỡng mở đơn thử rau trồng đất bằng ký quỹ chờ Trần Khải ký trực tiếp.',
  },
};

function patchBible(book: 'mat-the' | 'rau-tuoi', raw: unknown): unknown {
  const bible = structuredClone(raw) as JsonRecord;
  bible.styleMemory = [];
  for (const item of bible.recentSummary ?? []) {
    if (summaryPatches[book][item.chapterNumber]) item.summary = summaryPatches[book][item.chapterNumber];
  }
  const core = bible.symbolicCore as JsonRecord;
  if (book === 'mat-the') {
    core.storyDay = 4;
    core.mc.goldenFingerRungId = 'kho_thu_mua';
    for (const hook of core.openHooks ?? []) {
      if (hook.id === 'tieng_dap_tram_trong_bai_bun') hook.status = 'paid';
    }
    for (const p of core.progressions ?? []) {
      if (p.subjectId === 'lam_viet' && p.systemId === 'nghe_tu_tien' && p.trackId === 'luyen_dan_su') {
        p.rankId = 'nghe_nhat_giai';
      }
    }
  } else {
    core.storyDay = 10;
    core.mc.goldenFingerRungId = 'hop_dong_nguon_cung';
    for (const hook of core.openHooks ?? []) {
      if (['van_tuong_giai_thich_nhan', 'nghiem_thu_tuyen_kho_gio_nam'].includes(hook.id)) hook.status = 'paid';
    }
    for (const p of core.progressions ?? []) {
      if (p.subjectId === 'nguon_cung_khai_minh' && p.systemId === 'cap_cua_hang') p.rankId = 'hop_dong_nguon_cung';
      if (p.subjectId === 'diep_ninh' && p.systemId === 'duong_su_nghiep') p.rankId = 'moc_2';
      if (p.subjectId === 'la_chinh' && p.systemId === 'duong_su_nghiep') p.rankId = 'moc_2';
    }
  }
  return BibleSchema.parse(bible);
}

function patchDigest(book: 'mat-the' | 'rau-tuoi', chapterNumber: number, raw: unknown): unknown {
  const digest = structuredClone(raw) as JsonRecord;
  if (summaryPatches[book][chapterNumber]) digest.summary = summaryPatches[book][chapterNumber];
  const changes = digest.coreChanges as JsonRecord;
  if (book === 'mat-the') {
    changes.storyDayDelta = [2, 5, 6, 9].includes(chapterNumber) ? 1 : 0;
    if (chapterNumber === 8 && !changes.hooksPaid.includes('tieng_dap_tram_trong_bai_bun')) {
      changes.hooksPaid.push('tieng_dap_tram_trong_bai_bun');
    }
    if (chapterNumber === 5) {
      changes.goldenFingerRungChange = {
        toRungId: 'kho_thu_mua',
        why: 'Lâm Việt công khai danh mục thu mua, đổi phiếu thủ công của Tro Tàn thành điểm và mở Kho thu mua.',
      };
      changes.progressionChanges = [
        ...changes.progressionChanges.filter((p: JsonRecord) =>
          !(p.subjectId === 'song_gioi_thuong_diem' && p.systemId === 'cap_thuong_diem')),
        {
          subjectId: 'song_gioi_thuong_diem', systemId: 'cap_thuong_diem', trackId: null,
          toRankId: 'kho_thu_mua', toMinorStageId: null,
          why: 'Cửa hàng chuyển từ Kệ bán lẻ sang Kho thu mua sau khi nhận và định giá lô hàng có nguồn.',
        },
      ];
    }
    if (chapterNumber === 9) {
      changes.progressionChanges = [
        ...changes.progressionChanges.filter((p: JsonRecord) => !(p.subjectId === 'lam_viet' && p.systemId === 'nghe_tu_tien')),
        {
          subjectId: 'lam_viet', systemId: 'nghe_tu_tien', trackId: 'luyen_dan_su',
          toRankId: 'nghe_nhat_giai', toMinorStageId: null,
          why: 'Lâm Việt nộp phí, thuê lò, luyện đủ sáu Tịnh Mạch Đan cùng chuẩn và được Hàn Dược Sư đóng thẻ Nhất giai Luyện Đan Sư.',
        },
      ];
    }
  } else {
    changes.storyDayDelta = chapterNumber === 3 || chapterNumber === 6 || chapterNumber === 9
      ? 1 : chapterNumber === 10 ? 7 : 0;
    if (chapterNumber === 3) {
      changes.progressionChanges = [
        ...changes.progressionChanges,
        {
          subjectId: 'la_chinh', systemId: 'duong_su_nghiep', trackId: 'duong_la_chinh',
          toRankId: 'moc_2', toMinorStageId: null,
          why: 'La Chính nhận quyền vận hành dài hạn tại Bếp Hồng Ngọc và biến món Nhất giai thượng phẩm thành quầy kinh doanh của mình.',
        },
      ];
    }
    if (chapterNumber === 4) {
      changes.goldenFingerRungChange = {
        toRungId: 'hop_dong_nguon_cung',
        why: 'Trần Khải và Diệp Ninh ký trực tiếp hợp đồng nguồn cung tám kỳ đổi Robot phân loại thế hệ I.',
      };
      changes.progressionChanges = [
        ...changes.progressionChanges,
        {
          subjectId: 'nguon_cung_khai_minh', systemId: 'cap_cua_hang', trackId: null,
          toRankId: 'hop_dong_nguon_cung', toMinorStageId: null,
          why: 'Nguồn cung Khải Minh chuyển từ gom kho sang hợp đồng định lượng nhiều kỳ có đối giá công nghệ.',
        },
      ];
    }
    if (chapterNumber === 9) {
      changes.hooksPaid = [...new Set([
        ...changes.hooksPaid,
        'van_tuong_giai_thich_nhan', 'nghiem_thu_tuyen_kho_gio_nam', 'truy_tim_nguoi_dat_nhan_phu',
      ])];
      changes.hooksPlanted = changes.hooksPlanted.filter((h: JsonRecord) =>
        !['nghiem_thu_tuyen_kho_gio_nam', 'truy_tim_nguoi_dat_nhan_phu'].includes(h.id));
    }
    if (chapterNumber === 10) {
      changes.progressionChanges = [
        ...changes.progressionChanges,
        {
          subjectId: 'diep_ninh', systemId: 'duong_su_nghiep', trackId: 'duong_diep_ninh',
          toRankId: 'moc_2', toMinorStageId: null,
          why: 'Diệp Ninh dùng lô rau đầu tiên hoàn thiện robot và nhận đơn chạy dây chuyền có phí cùng KPI trước người trong nghề.',
        },
      ];
    }
  }
  return ChapterDigestSchema.parse(digest);
}

async function main(): Promise<void> {
  const bundle = BundleSchema.parse(JSON.parse(readFileSync(reviewedBundlePath, 'utf8')));
  const config = books[bundle.book];
  const premise = PremiseSchema.parse(JSON.parse(readFileSync(config.premisePath, 'utf8')));

  const jobResult = await db.from('serial_jobs')
    .select('id,status,current_chapter,lease_owner,lease_token,lease_until')
    .eq('serial_novel_id', bundle.serialNovelId).single();
  if (jobResult.error) throw jobResult.error;
  const [serialResult, chaptersBefore, runsBefore] = await Promise.all([
    db.from('serial_novels').select('id,novel_id,premise,bible')
      .eq('id', bundle.serialNovelId).single(),
    db.from('chapters').select('id,chapter_number,title,content')
      .eq('novel_id', bundle.novelId)
      .in('chapter_number', bundle.rewrites.map(item => item.chapterNumber))
      .order('chapter_number'),
    db.from('serial_runs').select('id,chapter_number,digest,finished_at')
      .eq('serial_novel_id', bundle.serialNovelId).eq('kind', 'chapter')
      .in('status', ['committed', 'published']).not('digest', 'is', null)
      .gte('chapter_number', 1).lte('chapter_number', jobResult.data?.current_chapter ?? 10)
      .order('finished_at', { ascending: false }),
  ]);
  if (serialResult.error) throw serialResult.error;
  if (chaptersBefore.error) throw chaptersBefore.error;
  if (runsBefore.error) throw runsBefore.error;
  if (jobResult.data.status !== 'paused' || jobResult.data.lease_owner
      || jobResult.data.lease_token || jobResult.data.lease_until) {
    throw new Error('Serial job must be paused with no active lease.');
  }
  if (serialResult.data.novel_id !== bundle.novelId) throw new Error('Bundle novel does not match serial.');
  for (const rewrite of bundle.rewrites) {
    const live = chaptersBefore.data.find(row => row.id === rewrite.chapterId);
    if (!live || live.title !== rewrite.oldTitle || live.content !== rewrite.oldContent) {
      throw new Error(`Live source changed at chapter ${rewrite.chapterNumber}.`);
    }
  }

  const latestRunByChapter = new Map<number, { id: string; digest: unknown }>();
  for (const run of runsBefore.data ?? []) {
    if (run.chapter_number && !latestRunByChapter.has(run.chapter_number)) {
      latestRunByChapter.set(run.chapter_number, { id: run.id, digest: run.digest });
    }
  }
  const patchedDigests = [...latestRunByChapter.entries()].map(([chapterNumber, run]) =>
    patchDigest(bundle.book, chapterNumber, run.digest));
  const patchedBible = rebuildBibleFromDigests({
    premise,
    digests: patchedDigests.map(digest => ChapterDigestSchema.parse(digest)),
    throughChapter: jobResult.data.current_chapter,
  });
  if (dryRun) {
    console.log(JSON.stringify({
      dryRun: true,
      book: bundle.book,
      chapters: bundle.rewrites.map(item => item.chapterNumber),
      sourceMatched: true,
      bibleValid: true,
      digestsValid: latestRunByChapter.size,
    }, null, 2));
    return;
  }

  const revisions = bundle.rewrites.map(item => ({
    chapterId: item.chapterId,
    chapterNumber: item.chapterNumber,
    oldTitle: item.oldTitle,
    oldContent: item.oldContent,
    newTitle: item.newTitle,
    newContent: item.newContent,
    review: item.review,
    usage: item.usage,
    costUsd: item.costUsd,
    direction: item.direction,
  }));
  const { data: applied, error: applyError } = await db.rpc('apply_serial_editorial_revisions', {
    p_serial_novel_id: bundle.serialNovelId,
    p_revisions: revisions,
    p_reason: 'Human-directed rewrite of the first ten public chapters after full-sequence review.',
    p_model: bundle.model,
    p_prompt_version: SERIAL_PROMPT_VERSION,
  });
  if (applyError) throw applyError;

  const cycleRows = await db.from('serial_cycles').select('id,plan,start_chapter')
    .eq('serial_novel_id', bundle.serialNovelId);
  if (cycleRows.error) throw cycleRows.error;
  for (const row of cycleRows.data ?? []) {
    const plan = row.plan as Record<string, unknown>;
    const end = Number(plan.plannedEndChapter);
    const beatSheets = Array.isArray(plan.beatSheets)
      ? plan.beatSheets.filter(beat => Number((beat as { chapterNumber?: number }).chapterNumber) <= end)
      : [];
    const updated = await db.from('serial_cycles').update({
      plan: { ...plan, beatSheets, customerLoop: config.customerLoop },
      checkpoint_bible: Number(row.start_chapter) === 1
        ? seedBible({ premise })
        : rebuildBibleFromDigests({
          premise,
          digests: patchedDigests.map(digest => ChapterDigestSchema.parse(digest)),
          throughChapter: Number(row.start_chapter) - 1,
        }),
      updated_at: new Date().toISOString(),
    }).eq('id', row.id);
    if (updated.error) throw updated.error;
  }

  const serialUpdate = await db.from('serial_novels').update({
    premise,
    bible: patchedBible,
    prompt_version: SERIAL_PROMPT_VERSION,
    updated_at: new Date().toISOString(),
  }).eq('id', bundle.serialNovelId);
  if (serialUpdate.error) throw serialUpdate.error;

  for (const [chapterNumber, run] of latestRunByChapter) {
    const updated = await db.from('serial_runs').update({
      digest: patchDigest(bundle.book, chapterNumber, run.digest),
    }).eq('id', run.id);
    if (updated.error) throw updated.error;
  }

  const [chaptersAfter, revisionsAfter, serialAfter] = await Promise.all([
    db.from('chapters').select('id,chapter_number,title,content')
      .eq('novel_id', bundle.novelId)
      .in('chapter_number', bundle.rewrites.map(item => item.chapterNumber))
      .order('chapter_number'),
    db.from('serial_chapter_revisions').select('chapter_number,revision_number,new_title')
      .eq('serial_novel_id', bundle.serialNovelId)
      .in('chapter_number', bundle.rewrites.map(item => item.chapterNumber))
      .order('chapter_number'),
    db.from('serial_novels').select('prompt_version,premise').eq('id', bundle.serialNovelId).single(),
  ]);
  if (chaptersAfter.error) throw chaptersAfter.error;
  if (revisionsAfter.error) throw revisionsAfter.error;
  if (serialAfter.error) throw serialAfter.error;
  for (const rewrite of bundle.rewrites) {
    const live = chaptersAfter.data.find(row => row.id === rewrite.chapterId);
    if (!live || live.title !== rewrite.newTitle || live.content !== rewrite.newContent) {
      throw new Error(`Production readback failed at chapter ${rewrite.chapterNumber}.`);
    }
  }
  PremiseSchema.parse(serialAfter.data.premise);
  console.log(JSON.stringify({
    applied,
    chapters: chaptersAfter.data.map(row => row.chapter_number),
    revisionRows: revisionsAfter.data.length,
    promptVersion: serialAfter.data.prompt_version,
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
