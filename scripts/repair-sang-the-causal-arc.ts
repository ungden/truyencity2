import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const PROJECT_ID = '533d8455-9c28-4b48-994f-ab7090329db4';
const CHECKPOINT_CHAPTER = 33;
const REWRITE_FROM = 34;
const DEFAULT_REWRITE_TO = 60;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const db = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CHAPTER_SCOPED_PROJECT_TABLES = [
  'chapter_summaries',
  'quality_metrics',
  'character_states',
  'story_memory_chunks',
  'story_timeline',
  'item_events',
  'character_knowledge',
  'character_relationships',
  'location_timeline',
  'beat_usage',
  'world_rules_index',
];

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function numberArg(name: string, fallback: number): number {
  const raw = process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=')[1];
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function stringArg(name: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=')[1];
}

function joinedNovelTitle(novels: unknown): string {
  if (Array.isArray(novels)) return String((novels[0] as { title?: string } | undefined)?.title || '');
  return String((novels as { title?: string } | null | undefined)?.title || '');
}

function vnDate(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function cleanArcChapterBriefs() {
  const briefs = [
    [34, 'Lâm Duy dùng Ruộng Sương Trên Đá Xám làm nền để nhận một thử thách sinh thái nhỏ do Học Viện giao chính thức, không mở xuyên giới tự do hay cổng/tàn tích.', 'Cảnh nhận nhiệm vụ qua bảng học viện, xác nhận phạm vi mô phỏng.', 'Có nhiệm vụ hợp pháp và phần thưởng điểm công nhỏ.'],
    [35, 'Lâm Duy trồng mầm cây phù sa bằng tài nguyên đã có, chốt ledger đất-sương-rêu trước khi chuyển sang tuyến Băng Lộ.', 'Cảnh canh tác, cân bằng tài nguyên, không artifact hook.', 'Mầm phù sa ổn định, chuẩn bị bước vào khảo hạch lạnh.'],
    [36, 'Lâm Duy khép lại vùng Hỏa Sơn Long Thai bằng ledger ổn định, không mở tàn tích/cổng mới; Học Viện gửi thông báo khảo hạch sinh thái Băng Lộ-Rêu Lam qua kênh chính thức.', 'Cảnh tổng kết Thần Vực, nhận thư học viện, kiểm chi phí đăng ký.', 'Ổn định hỏa-thổ, nhận mục tiêu hợp pháp cho arc học viện.'],
    [37, 'Lâm Duy dùng điểm công và hồ sơ lớp Bảy đăng ký vòng sơ khảo; Tô Thanh Hòa phổ biến quy tắc phòng mô phỏng, mọi tài nguyên đều bị log.', 'Đặt luật học viện và cơ chế giám sát rõ.', 'Có quyền vào khu mô phỏng sơ cấp, biết luật không thể gian lận.'],
    [38, 'Lăng Hạo được giới thiệu là đối thủ cùng lớp trên bảng xếp hạng công khai. Động cơ của hắn: kiếm điểm công và dữ liệu thứ hạng bằng cách bán một gói quan sát vòng ngoài ở khu giao dịch công khai; hắn chỉ biết dữ liệu lớp, không biết bí mật Thần Vực của Lâm Duy.', 'Giới thiệu rival đúng quyền hạn: có quầy giao dịch, hợp đồng, giá, lợi ích cho Lăng Hạo và giới hạn thông tin rõ.', 'Tạo cạnh tranh nhẹ, hợp pháp, không bẻ logic access.'],
    [39, 'Lâm Duy chuẩn bị bộ template Băng Lộ từ ký ức kiếp trước, đổi tài nguyên hỏa-thổ dư lấy điểm công và nguyên liệu lạnh sơ cấp.', 'Bridge sạch từ arc hỏa-thổ sang arc băng-mộc.', 'Có ledger tài nguyên để bước vào ch40.'],
    [40, 'Lâm Duy nhận thông báo khảo hạch Băng Lộ hợp pháp từ Học Viện, dùng điểm công đăng ký phòng mô phỏng sơ cấp; xác lập mọi tài nguyên phải qua bảng nhiệm vụ và giám sát.', 'Cảnh đăng ký, kiểm ledger, vào mô phỏng lạnh đầu tiên.', 'Có quyền vào mô phỏng sơ cấp, tiêu điểm công, thu mẫu Băng Lộ thô.'],
    [41, 'Lâm Duy thử ghép template ký ức sinh thái băng nguyên với Rêu Lam; Kiến Đá học cách vận chuyển giọt lạnh mà không chết rét.', 'Tập trung thế giới Thần Vực và loài phụ thuộc.', 'Rêu Lam có biến chủng chịu lạnh đầu tiên.'],
    [42, 'Lăng Hạo xuất hiện ở khu giao dịch công khai, đề nghị trao đổi dữ liệu nhiệm vụ vòng ngoài bằng hợp đồng học viện; Lâm Duy kiểm nguồn và chỉ mua phần giá rẻ.', 'Không cho Lăng Hạo vào khu cấm; tất cả qua quầy giao dịch.', 'Lâm Duy có dữ liệu mờ nhưng hợp pháp, không nhận bảo vật miễn phí.'],
    [43, 'Trong phòng mô phỏng Tuế Nguyệt có giám sát, Lâm Duy dùng dữ liệu mờ để tìm lỗi cân bằng giữa Băng Lộ và Rêu Lam, rồi báo cáo đổi điểm công.', 'Cảnh payoff gọn: quan sát, sửa luật, nhận thưởng.', 'Thần Vực tăng ổn định lạnh 1 cấp, điểm công tăng.'],
    [44, 'Học Viện kiểm tra báo cáo của Lâm Duy; Tô Thanh Hòa xác nhận hắn không vượt quyền và mở quyền mua hạt giống Mộc Linh sơ cấp.', 'Phản ứng xã hội và công nhận chính thức.', 'Mua được hạt Mộc Linh bằng điểm công, không có kỳ ngộ lớn.'],
    [45, 'Lâm Duy gieo Mộc Linh vào vùng Rêu Lam-Băng Lộ, giải quyết xung đột sinh thái bằng lưới sương lạnh; Lăng Hạo chỉ đứng ngoài nhìn lợi ích giao dịch tăng.', 'Payoff sinh thái, rival ghen nhưng hợp lệ.', 'Mộc Linh non nảy mầm, mở mini-hook khảo hạch top 100.'],
    [46, 'Khảo hạch top 100 bắt đầu: mỗi học viên được một ô mô phỏng riêng, Lâm Duy chọn chiến lược ổn định thay vì đốt tài nguyên.', 'Cạnh tranh công bằng trong luật học viện.', 'Lâm Duy lọt nhóm đầu nhờ chỉ số ổn định.'],
    [47, 'Một học viên khác mua dữ liệu giả ngoài chợ và thất bại; Lâm Duy dùng Vạn Tượng Ký Ức nhận ra bẫy mô phỏng, thắng nhẹ nhưng không hại người quá mức.', 'Sảng văn trí tuệ, setback ngắn.', 'Có điểm danh vọng và cảnh báo hợp pháp về dữ liệu bẩn.'],
    [48, 'Kiến Đá xây kênh vận chuyển Băng Lộ, Rêu Lam tạo màng giữ nhiệt, Mộc Linh non hút phần lạnh dư; ba loài thành vòng tuần hoàn đầu tiên.', 'World-state rõ, ledger rõ.', 'Chu trình sinh thái mini hoàn chỉnh.'],
    [49, 'Tô Thanh Hòa mời Lâm Duy trình bày phương án trước lớp, Lăng Hạo đặt câu hỏi khó nhưng trong phạm vi công khai.', 'Đấu trí học viện, không đột nhập.', 'Lâm Duy nhận công nhận và thêm quyền mô phỏng trung cấp.'],
    [50, 'Mốc giữa arc: Lâm Duy dùng quyền trung cấp thử bão lạnh giả lập, phát hiện Mộc Linh có thể làm neo pháp tắc nhỏ.', 'Không Thần Cách, chỉ neo pháp tắc sơ cấp.', 'Mộc Linh có kỹ năng neo lạnh nhỏ, hook top 50.'],
    [51, 'Lâm Duy tối ưu chi phí: đổi bớt Băng Lộ lấy khoáng vi lượng, giúp Kiến Đá nâng cấp vỏ lạnh.', 'Ledger giao dịch và sinh vật tiến hóa.', 'Kiến Đá có vỏ băng mỏng, sức vận chuyển tăng.'],
    [52, 'Một lỗi mô phỏng khiến nhiệt độ tụt mạnh, nhưng vì có giám sát học viện nên nguy hiểm được giới hạn; Lâm Duy cứu mẫu sinh thái và nhận điểm xử lý sự cố.', 'Nguy cơ nhỏ, xử gọn, không bi kịch.', 'Danh vọng tăng, được vào vòng top 50.'],
    [53, 'Top 50 yêu cầu mỗi học viên chứng minh thế giới có khả năng tự phục hồi; Lâm Duy dùng vòng Rêu Lam-Mộc Linh để vượt bài.', 'Payoff vòng tuần hoàn.', 'Thần Vực có chỉ số tự phục hồi đầu tiên.'],
    [54, 'Lăng Hạo đề nghị hợp tác chia dữ liệu top 50; Lâm Duy ký điều khoản một chiều có lợi, bảo vệ bí mật Khởi Nguyên Biên Niên.', 'Rival là đối tác bị MC dẫn dắt.', 'Có nguồn dữ liệu đối thủ nhưng không lộ bàn tay vàng.'],
    [55, 'Lâm Duy tái hiện template vườn treo/đầm lầy lạnh từ ký ức kiếp trước để mở vùng đệm cho Mộc Linh.', 'Template inspiration rõ, chi phí rõ.', 'Vùng đệm sinh thái mới xuất hiện.'],
    [56, 'Học Viện công bố bảng điểm, vài người nghi ngờ Lâm Duy gian lận nhưng Tô Thanh Hòa dùng log giám sát chứng minh mọi bước hợp lệ.', 'Chặn logic "hack học viện", tạo face-slap sạch.', 'Danh tiếng hợp pháp tăng, đối thủ câm miệng.'],
    [57, 'Bài thi stress-test đưa thú băng mô phỏng vào phá hệ sinh thái; Kiến Đá và Rêu Lam phối hợp giữ tuyến, MC chỉ đạo qua luật Thần Vực.', 'Combat proxy bằng civilization, không MC tự đánh vượt cấp.', 'Loài phụ thuộc có chiến thuật phòng thủ.'],
    [58, 'Lâm Duy dùng phần thưởng đổi quyền đặt tên mô hình, biến Lưới Sương Lạnh thành tiêu chuẩn tham khảo sơ cấp của lớp.', 'Công nhận xã hội và payoff quyền lợi.', 'Mô hình được ghi danh, mở cửa tài nguyên tốt hơn.'],
    [59, 'Trước vòng cuối arc, Lăng Hạo thừa nhận chỉ có thể cạnh tranh bằng hợp đồng công khai; hắn tung dữ liệu thị trường khiến giá Băng Lộ biến động.', 'Rival gây áp lực kinh tế hợp pháp.', 'MC chuẩn bị khóa giá và giữ ổn định ledger.'],
    [60, 'Arc payoff: Lâm Duy vượt top 50 bằng hệ sinh thái Băng Lộ-Rêu Lam-Mộc Linh, nhận quyền mô phỏng dài hạn và hook sang arc chiến trường proxy.', 'Kết arc sạch, mở arc sau vừa đủ.', 'Top 50, quyền dài hạn, Thần Vực ổn định hơn.'],
  ];

  return briefs.map(([chapterNumber, brief, sceneDirection, mcBenefit]) => ({
    chapterNumber,
    brief,
    sceneDirection,
    mcBenefit,
  }));
}

function cleanArcPlan() {
  return {
    project_id: PROJECT_ID,
    arc_number: 3,
    start_chapter: REWRITE_FROM,
    end_chapter: DEFAULT_REWRITE_TO,
    arc_theme: 'hoc_vien_bang_lo_reu_lam_moc_linh_causal_repair',
    plan_text: [
      'CLEAN CAUSAL ARC ch34-60: Lâm Duy chuyển từ ruộng sương/đất phù sa sang khảo hạch học viện bằng quyền hạn hợp pháp, điểm công, phòng mô phỏng có giám sát và ledger tài nguyên rõ.',
      'Core payoff: Băng Lộ + Rêu Lam + Kiến Đá + Mộc Linh tạo vòng sinh thái lạnh sơ cấp, đưa Lâm Duy vào top 50.',
      'Hard no: không mở đại kỳ ngộ Thần Cách, không kẻ săn Thần Cách, không sát thủ Hư Không, không tháp đen/tàn tích cấp cao, không cho đối thủ đột nhập Học Viện hoặc vượt quyền học viện.',
      'Lăng Hạo chỉ là rival/đối tác giao dịch công khai: mọi dữ liệu hắn đưa phải qua hợp đồng, nguồn vòng ngoài, điểm công, bảng nhiệm vụ hoặc khu giao dịch có giám sát.',
      'Mọi tài nguyên phải có nguồn và chi phí: điểm công, quyền mua, phần thưởng khảo hạch, trao đổi Băng Lộ/khoáng vi lượng. Không vật phẩm tự rơi vào tay nhân vật.',
      'MC thắng bằng trí nhớ kiếp trước + Khởi Nguyên Biên Niên/Vạn Tượng Ký Ức, nhưng mọi template phải chuyển hóa thành luật sống có rủi ro nhỏ và ledger rõ.',
    ].join('\n'),
    sub_arcs: [
      { sub_arc_number: 1, start_chapter: 34, end_chapter: 39, theme: 'Bridge sạch từ ruộng sương sang học viện Băng Lộ', mini_payoff: 'Có quyền hạn và ledger hợp pháp trước khi vào mô phỏng.' },
      { sub_arc_number: 2, start_chapter: 40, end_chapter: 45, theme: 'Vào khảo hạch hợp pháp và dựng lõi Băng Lộ-Rêu Lam', mini_payoff: 'Mộc Linh non nảy mầm bằng điểm công hợp lệ.' },
      { sub_arc_number: 3, start_chapter: 46, end_chapter: 52, theme: 'Top 100 và chu trình sinh thái lạnh', mini_payoff: 'Lâm Duy vào top 50 nhờ chỉ số tự phục hồi.' },
      { sub_arc_number: 4, start_chapter: 53, end_chapter: 60, theme: 'Top 50 và công nhận mô hình Lưới Sương Lạnh', mini_payoff: 'Nhận quyền mô phỏng dài hạn, mở arc proxy chiến trường sau.' },
    ],
    chapter_briefs: cleanArcChapterBriefs(),
    threads_to_advance: [
      'Khảo hạch học viện hợp pháp',
      'Hệ sinh thái Băng Lộ-Rêu Lam-Mộc Linh',
      'Lăng Hạo rival giao dịch công khai',
    ],
    threads_to_resolve: [
      'Nghi ngờ Lâm Duy gian lận trong mô phỏng sơ cấp',
    ],
    new_threads: [
      'Chiến trường proxy bằng civilization sau top 50',
    ],
  };
}

async function selectRange(table: string, projectId: string, from: number, to: number) {
  const { data, error } = await db
    .from(table)
    .select('*')
    .eq('project_id', projectId)
    .gte('chapter_number', from)
    .lte('chapter_number', to);
  if (error) throw new Error(`${table} select failed: ${error.message}`);
  return data || [];
}

async function backupRows(novelId: string, toChapter: number): Promise<string> {
  const backup: Record<string, unknown> = {};
  const { data: chapters, error: chaptersError } = await db
    .from('chapters')
    .select('*')
    .eq('novel_id', novelId)
    .gte('chapter_number', REWRITE_FROM)
    .lte('chapter_number', toChapter)
    .order('chapter_number', { ascending: true });
  if (chaptersError) throw chaptersError;
  backup.chapters = chapters || [];

  for (const table of CHAPTER_SCOPED_PROJECT_TABLES) {
    try {
      backup[table] = await selectRange(table, PROJECT_ID, REWRITE_FROM, toChapter);
    } catch (error) {
      backup[table] = { skipped: error instanceof Error ? error.message : String(error) };
    }
  }

  const backupDir = path.join(process.cwd(), '.codex', 'story-repairs');
  await fs.mkdir(backupDir, { recursive: true });
  const file = path.join(backupDir, `sang-the-causal-arc-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  await fs.writeFile(file, JSON.stringify({
    projectId: PROJECT_ID,
    novelId,
    checkpointChapter: CHECKPOINT_CHAPTER,
    rewriteFrom: REWRITE_FROM,
    rewriteTo: toChapter,
    backedUpAt: new Date().toISOString(),
    backup,
  }, null, 2));
  return file;
}

async function deleteRange(table: string, from: number, to: number): Promise<number> {
  const { data, error } = await db
    .from(table)
    .delete()
    .eq('project_id', PROJECT_ID)
    .gte('chapter_number', from)
    .lte('chapter_number', to)
    .select('id');
  if (error) throw new Error(`${table} delete failed: ${error.message}`);
  return data?.length || 0;
}

async function resetToCheckpoint(toChapter: number, apply: boolean): Promise<void> {
  const { data: project, error: projectError } = await db
    .from('ai_story_projects')
    .select('id,novel_id,status,current_chapter,style_directives,novels!ai_story_projects_novel_id_fkey(title)')
    .eq('id', PROJECT_ID)
    .maybeSingle();
  if (projectError) throw projectError;
  if (!project) throw new Error(`Project not found: ${PROJECT_ID}`);
  const title = joinedNovelTitle(project.novels);
  console.log(`project=${PROJECT_ID} title="${title}" status=${project.status} current_chapter=${project.current_chapter}`);

  const backupFile = apply ? await backupRows(project.novel_id, toChapter) : '(dry-run only)';
  console.log(`backup=${backupFile}`);

  const { count: chapterCount, error: chapterCountError } = await db
    .from('chapters')
    .select('id', { count: 'exact', head: true })
    .eq('novel_id', project.novel_id)
    .gte('chapter_number', REWRITE_FROM)
    .lte('chapter_number', toChapter);
  if (chapterCountError) throw chapterCountError;
  console.log(`chapters_to_archive=${chapterCount || 0}`);

  if (!apply) {
    console.log('dry_run=true; add --apply-reset to archive/delete/reset.');
    return;
  }

  const { error: pauseError } = await db.from('ai_story_projects').update({
    status: 'paused',
    pause_reason: `causal_logic_repair: archive ch.${REWRITE_FROM}-${toChapter}, reset to ch.${CHECKPOINT_CHAPTER}`,
    paused_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', PROJECT_ID);
  if (pauseError) throw pauseError;

  const { data: deletedChapters, error: deleteChaptersError } = await db
    .from('chapters')
    .delete()
    .eq('novel_id', project.novel_id)
    .gte('chapter_number', REWRITE_FROM)
    .lte('chapter_number', toChapter)
    .select('id');
  if (deleteChaptersError) throw deleteChaptersError;
  console.log(`deleted chapters=${deletedChapters?.length || 0}`);

  for (const table of CHAPTER_SCOPED_PROJECT_TABLES) {
    try {
      const deleted = await deleteRange(table, REWRITE_FROM, toChapter);
      console.log(`deleted ${table}=${deleted}`);
    } catch (error) {
      console.warn(`warn ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  await db.from('plot_threads').update({
    status: 'legacy',
    updated_at: new Date().toISOString(),
  }).eq('project_id', PROJECT_ID).gte('last_active_chapter', REWRITE_FROM);

  await db.from('mc_power_states').delete().eq('project_id', PROJECT_ID);

  await db.from('arc_plans').update({
    end_chapter: CHECKPOINT_CHAPTER,
  }).eq('project_id', PROJECT_ID).eq('arc_number', 2);

  const { data: checkpointSummary } = await db
    .from('chapter_summaries')
    .select('summary,mc_state,cliffhanger')
    .eq('project_id', PROJECT_ID)
    .eq('chapter_number', CHECKPOINT_CHAPTER)
    .maybeSingle();
  if (checkpointSummary) {
    await db.from('story_synopsis').upsert({
      project_id: PROJECT_ID,
      synopsis_text: `CANON CHECKPOINT ch.${CHECKPOINT_CHAPTER}: ${checkpointSummary.summary}`,
      mc_current_state: checkpointSummary.mc_state || null,
      open_threads: [checkpointSummary.cliffhanger || 'Chuẩn bị vào khảo hạch học viện Băng Lộ-Rêu Lam hợp pháp.'],
      last_updated_chapter: CHECKPOINT_CHAPTER,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'project_id' });
  }

  const { error: arcError } = await db.from('arc_plans').upsert(cleanArcPlan(), {
    onConflict: 'project_id,arc_number',
  });
  if (arcError) throw arcError;

  const { error: resetError } = await db.from('ai_story_projects').update({
    current_chapter: CHECKPOINT_CHAPTER,
    updated_at: new Date().toISOString(),
  }).eq('id', PROJECT_ID);
  if (resetError) throw resetError;

  console.log(`reset_applied checkpoint=${CHECKPOINT_CHAPTER}`);
}

async function writeUntil(toChapter: number): Promise<void> {
  const { writeOneChapter } = await import('../src/services/story-engine/pipeline/orchestrator');
  while (true) {
    const { data: project, error } = await db
      .from('ai_story_projects')
      .select('current_chapter')
      .eq('id', PROJECT_ID)
      .maybeSingle();
    if (error) throw error;
    const current = Number(project?.current_chapter || 0);
    if (current >= toChapter) break;
    const next = current + 1;
    console.log(`writing ch.${next}...`);
    const result = await writeOneChapter({ projectId: PROJECT_ID });
    console.log(`wrote ch.${result.lastChapterNumber || result.chapterNumber} "${result.title}" words=${result.wordCount} score=${result.qualityScore}`);
  }
}

async function activateProject(): Promise<void> {
  const date = vnDate();
  const now = new Date().toISOString();
  const { error: projectError } = await db.from('ai_story_projects').update({
    status: 'active',
    pause_reason: null,
    paused_at: null,
    updated_at: now,
  }).eq('id', PROJECT_ID);
  if (projectError) throw projectError;

  const { error: quotaError } = await db.from('project_daily_quotas').upsert({
    project_id: PROJECT_ID,
    vn_date: date,
    target_chapters: 50,
    written_chapters: 0,
    status: 'active',
    retry_count: 0,
    next_due_at: now,
    updated_at: now,
  }, { onConflict: 'project_id,vn_date' });
  if (quotaError) throw quotaError;
  console.log(`activated project quota vn_date=${date} target=50 next_due_at=now`);
}

async function main(): Promise<void> {
  const toChapter = numberArg('to', DEFAULT_REWRITE_TO);
  const mode = stringArg('mode') || 'dry-run';
  if (mode === 'dry-run') {
    await resetToCheckpoint(toChapter, false);
    return;
  }
  if (mode === 'reset') {
    await resetToCheckpoint(toChapter, hasFlag('apply-reset'));
    return;
  }
  if (mode === 'write') {
    await writeUntil(toChapter);
    return;
  }
  if (mode === 'activate') {
    await activateProject();
    return;
  }
  throw new Error(`Unknown --mode=${mode}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
