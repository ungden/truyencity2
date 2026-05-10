import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { validateChapterBlueprintCoverage } from '../src/services/story-engine/plan/chapter-blueprints';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const PROJECT_ID = stringArg('project-id') || '533d8455-9c28-4b48-994f-ab7090329db4';
const VERSION = numberArg('version', 1);
const APPLY = process.argv.includes('--apply');
const ACTIVATE = process.argv.includes('--activate');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Missing Supabase env');

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

type JsonRecord = Record<string, unknown>;
type BlueprintRow = {
  project_id: string;
  chapter_number: number;
  volume_number: number | null;
  arc_number: number;
  sub_arc_number: number | null;
  title_hint: string;
  goal: string;
  conflict: string;
  payoff: string;
  ending_hook: string;
  cast: string[];
  location: string;
  resource_ledger_delta: string;
  world_state_delta: string;
  species_delta: string;
  template_inspiration: string;
  authority_constraints: string;
  forbidden_terms: string[];
  status: 'planned' | 'used';
  version: number;
  actual_summary_delta?: string | null;
  meta: JsonRecord;
};

function stringArg(name: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=')[1];
}

function numberArg(name: string, fallback: number): number {
  const raw = stringArg(name);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function asTitle(novels: unknown): string {
  if (Array.isArray(novels)) return String((novels[0] as { title?: string } | undefined)?.title || '');
  return String((novels as { title?: string } | null | undefined)?.title || '');
}

function parseMaster(master: unknown): JsonRecord {
  if (!master) return {};
  if (typeof master === 'string') {
    try { return JSON.parse(master) as JsonRecord; } catch { return {}; }
  }
  return typeof master === 'object' ? master as JsonRecord : {};
}

function getVolumes(master: JsonRecord): Array<JsonRecord> {
  return Array.isArray(master.volumes) ? master.volumes as JsonRecord[] : [];
}

function getFlatArcs(master: JsonRecord): Array<JsonRecord> {
  if (Array.isArray(master.majorArcs)) return master.majorArcs as JsonRecord[];
  return getVolumes(master).flatMap((v) => Array.isArray(v.subArcs) ? v.subArcs as JsonRecord[] : []);
}

function findByChapter(rows: Array<JsonRecord>, chapter: number, startKey: string, endKey: string): JsonRecord | undefined {
  return rows.find((row) => Number(row[startKey] || 0) <= chapter && chapter <= Number(row[endKey] || 0));
}

function phaseLabel(chapter: number, start: number, end: number): string {
  const span = Math.max(1, end - start + 1);
  const pos = (chapter - start + 1) / span;
  if (pos < 0.2) return 'mở nhịp';
  if (pos < 0.55) return 'tích lũy';
  if (pos < 0.8) return 'chuyển ngoặt';
  if (chapter === end) return 'payoff sub-arc';
  return 'đẩy tới cao trào';
}

function defaultForbidden(focusKey?: string | null): string[] {
  if (focusKey === 'sang-the-than-minh') {
    return ['Thần Cách', 'kẻ săn Thần Cách', 'sát thủ Hư Không', 'tháp đen', 'tàn tích Thần Cách'];
  }
  return ['CONTEXT COMPACT', 'Hook:', 'YÊU CẦU OUTPUT'];
}

function sangTheRepairBlueprint(chapter: number, projectId: string, version: number): BlueprintRow | null {
  const rows: Record<number, Partial<BlueprintRow>> = {
    36: {
      title_hint: 'Thư Mời Băng Lộ',
      goal: 'Lâm Duy chốt ledger Mầm Phù Sa và nhận thông báo khảo hạch Băng Lộ qua kênh học viện hợp pháp.',
      conflict: 'Nhiệt-lạnh trong Thần Vực bắt đầu lệch, buộc hắn chọn cách chuẩn bị an toàn thay vì mở tàn tích mới.',
      payoff: 'Có quyền đăng ký sơ khảo Băng Lộ, biết chi phí điểm công và giới hạn phòng mô phỏng.',
      ending_hook: 'Bảng nhiệm vụ mở khung đăng ký phòng mô phỏng sơ cấp.',
      resource_ledger_delta: 'Tiêu hao một phần nước nhạt/đất phù sa dự trữ, khóa điểm công đăng ký sơ khảo.',
      world_state_delta: 'Thần Vực có vùng đệm phù sa chịu lạnh đầu tiên.',
      species_delta: 'Rêu Lam/Rêu Thử Mặn được chuẩn bị chống lạnh sơ cấp.',
      template_inspiration: 'Ký ức băng nguyên/vườn lạnh được Vạn Tượng Ký Ức chuyển thành template sơ cấp.',
    },
    37: {
      title_hint: 'Phòng Mô Phỏng Có Giám Sát',
      goal: 'Lâm Duy dùng điểm công và hồ sơ lớp Bảy đăng ký vòng sơ khảo trong phòng mô phỏng có log học viện.',
      conflict: 'Quy tắc mô phỏng hạn chế lượng tài nguyên mang vào, buộc hắn tối ưu thay vì đốt tài nguyên.',
      payoff: 'Có quyền vào khu mô phỏng sơ cấp và nhận mẫu Băng Lộ thô hợp pháp.',
      ending_hook: 'Mẫu Băng Lộ thô phản ứng với Rêu Lam trong Thần Vực.',
    },
    38: {
      title_hint: 'Giao Dịch Vòng Ngoài',
      goal: 'Lăng Hạo xuất hiện như rival giao dịch công khai, bán dữ liệu vòng ngoài qua hợp đồng học viện.',
      conflict: 'Dữ liệu của Lăng Hạo mờ và có rủi ro, Lâm Duy chỉ mua phần rẻ sau khi kiểm nguồn.',
      payoff: 'MC có dữ liệu nhiệm vụ hợp pháp mà không lộ bí mật Khởi Nguyên Biên Niên.',
      ending_hook: 'Dữ liệu mờ chỉ ra một lỗi cân bằng giữa Băng Lộ và Rêu Lam.',
    },
    39: {
      title_hint: 'Template Băng Nguyên Nhỏ',
      goal: 'Lâm Duy chuẩn bị template Băng Lộ từ trí nhớ kiếp trước và đổi tài nguyên hỏa-thổ dư lấy vật liệu lạnh sơ cấp.',
      conflict: 'Nguồn lực ít nên mỗi luật lạnh phải ghi chi phí rõ.',
      payoff: 'Thần Vực có mô hình thử nghiệm lạnh an toàn trước chặng mô phỏng.',
      ending_hook: 'Phòng mô phỏng Tuế Nguyệt mở slot kiểm tra đầu tiên.',
    },
    40: {
      title_hint: 'Lỗi Cân Bằng Đầu Tiên',
      goal: 'Trong phòng mô phỏng có giám sát, Lâm Duy tìm lỗi cân bằng Băng Lộ-Rêu Lam và báo cáo đổi điểm công.',
      conflict: 'Dữ liệu mờ của Lăng Hạo không đủ, MC phải dùng Vạn Tượng Ký Ức tự suy luận.',
      payoff: 'Nhận điểm công, mẫu Băng Lộ ổn định và quyền mua hạt Mộc Linh sơ cấp.',
      ending_hook: 'Tô Thanh Hòa yêu cầu hắn trình bày log kiểm chứng.',
    },
  };
  const base = rows[chapter];
  if (!base) return null;
  return {
    project_id: projectId,
    chapter_number: chapter,
    volume_number: 1,
    arc_number: Math.ceil(chapter / 20),
    sub_arc_number: Math.ceil((chapter - 35) / 5),
    title_hint: base.title_hint || `Khảo hạch Băng Lộ ${chapter}`,
    goal: base.goal || 'Lâm Duy phát triển khảo hạch học viện hợp pháp.',
    conflict: base.conflict || 'Giới hạn điểm công/tài nguyên buộc MC tối ưu bằng trí nhớ kiếp trước.',
    payoff: base.payoff || 'Thần Vực tăng ổn định và MC nhận lợi ích hợp pháp.',
    ending_hook: base.ending_hook || 'Bảng học viện mở thử thách kế tiếp.',
    cast: ['Lâm Duy', ...(chapter === 38 ? ['Lăng Hạo'] : []), ...(chapter >= 37 ? ['Tô Thanh Hòa'] : [])],
    location: 'Học Viện / phòng mô phỏng sơ cấp / Thần Vực',
    resource_ledger_delta: base.resource_ledger_delta || 'Điểm công, Băng Lộ, Rêu Lam hoặc Mộc Linh phải có nguồn/giá/chi phí.',
    world_state_delta: base.world_state_delta || 'Thần Vực mở vòng Băng Lộ-Rêu Lam-Mộc Linh từng bước.',
    species_delta: base.species_delta || 'Rêu Lam/Kiến Đá/Mộc Linh có tiến triển nhỏ, không nhảy cấp.',
    template_inspiration: base.template_inspiration || 'Vạn Tượng Ký Ức chuyển ký ức băng nguyên/vườn treo/đầm lầy lạnh thành luật sống.',
    authority_constraints: 'Mọi quyền vào Học Viện/phòng mô phỏng/giao dịch đều phải qua đăng ký, điểm công, hợp đồng hoặc log giám sát; Lăng Hạo không được đột nhập/khoắng đồ.',
    forbidden_terms: defaultForbidden('sang-the-than-minh'),
    status: 'planned',
    version,
    meta: { generated_by: 'deterministic_blueprint_repair_arc_36_40' },
  };
}

function makeFutureBlueprint(input: {
  projectId: string;
  chapter: number;
  total: number;
  version: number;
  mainCharacter: string;
  focusKey?: string | null;
  master: JsonRecord;
}): BlueprintRow {
  const volumes = getVolumes(input.master);
  const arcs = getFlatArcs(input.master);
  const volume = findByChapter(volumes, input.chapter, 'startChapter', 'endChapter');
  const arc = findByChapter(arcs, input.chapter, 'startChapter', 'endChapter');
  const arcNumber = Number(arc?.arcNumber || Math.ceil(input.chapter / 20));
  const start = Number(arc?.startChapter || ((arcNumber - 1) * 20 + 1));
  const end = Number(arc?.endChapter || Math.min(arcNumber * 20, input.total));
  const phase = phaseLabel(input.chapter, start, end);
  const arcName = String(arc?.arcName || volume?.name || `Arc ${arcNumber}`);
  const volumeNumber = Number(volume?.volumeNumber || Math.ceil(input.chapter / 100));
  const subArcNumber = Number(arc?.arcNumber || Math.ceil(input.chapter / 20));
  const isSangThe = input.focusKey === 'sang-the-than-minh';
  const topic = String(arc?.description || volume?.primaryConflict || input.master.mainPlotline || 'đẩy core loop của truyện');
  const milestone = String(arc?.keyMilestone || volume?.theme || 'một lợi ích cụ thể');
  const titleHint = `${arcName} - ${phase}`;

  return {
    project_id: input.projectId,
    chapter_number: input.chapter,
    volume_number: volumeNumber,
    arc_number: arcNumber,
    sub_arc_number: subArcNumber,
    title_hint: titleHint.slice(0, 180),
    goal: `Ch.${input.chapter} ${phase} trong "${arcName}": ${topic}`.slice(0, 900),
    conflict: `Trở ngại routine có giới hạn, phục vụ ${milestone}; không mở tuyến vượt cấp ngoài outline.`.slice(0, 500),
    payoff: `MC nhận payoff đo được hướng tới milestone: ${milestone}`.slice(0, 500),
    ending_hook: input.chapter === end
      ? `Đóng mini-payoff của ${arcName} và mở cầu sang nhịp kế tiếp.`
      : `Gieo bước kế tiếp của ${arcName} mà không mở thread lớn ngoài outline.`,
    cast: [input.mainCharacter],
    location: isSangThe ? 'Thần Vực / Học Viện / khu mô phỏng hợp pháp' : 'Bối cảnh đã establish trong outline',
    resource_ledger_delta: isSangThe
      ? 'Mọi điểm công/tài nguyên/template phải có nguồn, chi phí, luật và rủi ro nhỏ.'
      : 'Nếu có tài nguyên/tiền/thông tin mới, phải nêu nguồn và chi phí.',
    world_state_delta: isSangThe
      ? 'Thần Vực phải có delta cụ thể: luật, diện tích, sinh thái, tín ngưỡng hoặc độ ổn định.'
      : 'Thế giới/quan hệ/trạng thái xã hội phải có thay đổi cụ thể.',
    species_delta: isSangThe ? 'Loài phụ thuộc/quyến thuộc có tiến triển nhỏ theo logic sinh thái.' : 'Nếu có dependent cast/system, ghi tiến triển rõ.',
    template_inspiration: isSangThe
      ? 'Ký ức kiếp trước được Vạn Tượng Ký Ức chuyển thành template hợp luật, không copy thô.'
      : 'Dùng lợi thế/golden finger đúng story kernel.',
    authority_constraints: isSangThe
      ? 'Học viện/khu cấm/phòng mô phỏng/giao dịch cần quyền hạn, đăng ký, điểm công, hợp đồng hoặc giám sát.'
      : 'Không cho nhân vật vượt quyền hoặc lấy tài nguyên cấp cao nếu chưa có cơ chế hợp pháp.',
    forbidden_terms: defaultForbidden(input.focusKey),
    status: 'planned',
    version: input.version,
    meta: { generated_by: 'deterministic_blueprint_map', arc_name: arcName, phase },
  };
}

function makeArcBriefBlueprint(input: {
  projectId: string;
  chapter: number;
  total: number;
  version: number;
  mainCharacter: string;
  focusKey?: string | null;
  arcRow: JsonRecord;
  brief: JsonRecord;
}): BlueprintRow {
  const arcNumber = Number(input.arcRow.arc_number || Math.ceil(input.chapter / 20));
  const subArcNumber = Number(input.brief.sub_arc_number || Math.ceil(input.chapter / 5));
  return {
    project_id: input.projectId,
    chapter_number: input.chapter,
    volume_number: Math.ceil(input.chapter / 100),
    arc_number: arcNumber,
    sub_arc_number: subArcNumber,
    title_hint: String(input.brief.sceneDirection || input.brief.brief || `Arc ${arcNumber} ch.${input.chapter}`).slice(0, 180),
    goal: String(input.brief.brief || input.arcRow.plan_text || `Advance arc ${arcNumber}`).slice(0, 900),
    conflict: String(input.brief.sceneDirection || input.arcRow.arc_theme || 'Trở ngại routine trong phạm vi arc.').slice(0, 500),
    payoff: String(input.brief.mcBenefit || 'MC nhận lợi ích cụ thể theo arc brief.').slice(0, 500),
    ending_hook: `Dẫn sang ch.${Math.min(input.chapter + 1, input.total)} theo chapter map, không mở tuyến ngoài arc.`,
    cast: [input.mainCharacter],
    location: input.focusKey === 'sang-the-than-minh' ? 'Thần Vực / Học Viện / khu mô phỏng hợp pháp' : 'Bối cảnh theo arc plan',
    resource_ledger_delta: input.focusKey === 'sang-the-than-minh'
      ? 'Mọi điểm công/tài nguyên/template phải có nguồn, chi phí, luật và rủi ro nhỏ.'
      : 'Nếu có tài nguyên/tiền/thông tin mới, phải nêu nguồn và chi phí.',
    world_state_delta: input.focusKey === 'sang-the-than-minh'
      ? 'Thần Vực phải có delta cụ thể: luật, diện tích, sinh thái, tín ngưỡng hoặc độ ổn định.'
      : 'Thế giới/quan hệ/trạng thái xã hội phải có thay đổi cụ thể.',
    species_delta: input.focusKey === 'sang-the-than-minh' ? 'Loài phụ thuộc/quyến thuộc có tiến triển nhỏ theo logic sinh thái.' : 'Nếu có dependent cast/system, ghi tiến triển rõ.',
    template_inspiration: input.focusKey === 'sang-the-than-minh'
      ? 'Ký ức kiếp trước được Vạn Tượng Ký Ức chuyển thành template hợp luật, không copy thô.'
      : 'Dùng lợi thế/golden finger đúng story kernel.',
    authority_constraints: input.focusKey === 'sang-the-than-minh'
      ? 'Học viện/khu cấm/phòng mô phỏng/giao dịch cần quyền hạn, đăng ký, điểm công, hợp đồng hoặc giám sát.'
      : 'Không cho nhân vật vượt quyền hoặc lấy tài nguyên cấp cao nếu chưa có cơ chế hợp pháp.',
    forbidden_terms: defaultForbidden(input.focusKey),
    status: 'planned',
    version: input.version,
    meta: { generated_by: 'arc_plan_chapter_brief_blueprint', arc_theme: input.arcRow.arc_theme || null },
  };
}

function makeCanonBlueprint(input: {
  projectId: string;
  chapter: number;
  title?: string | null;
  summary?: string | null;
  cliffhanger?: string | null;
  mcState?: string | null;
  version: number;
  mainCharacter: string;
  focusKey?: string | null;
}): BlueprintRow {
  return {
    project_id: input.projectId,
    chapter_number: input.chapter,
    volume_number: Math.ceil(input.chapter / 100),
    arc_number: Math.ceil(input.chapter / 20),
    sub_arc_number: Math.ceil(input.chapter / 5),
    title_hint: input.title || `Canon ch.${input.chapter}`,
    goal: input.summary || `Canon chapter ${input.chapter} already published.`,
    conflict: input.mcState || 'Use published canon as locked history.',
    payoff: input.summary || `Canon chapter ${input.chapter} payoff is locked by published history.`,
    ending_hook: input.cliffhanger || 'Follow published canon.',
    cast: [input.mainCharacter],
    location: 'Locked published canon',
    resource_ledger_delta: 'Locked by published canon.',
    world_state_delta: 'Locked by published canon.',
    species_delta: input.focusKey === 'sang-the-than-minh' ? 'Locked dependent-species progress from canon.' : 'Locked by canon.',
    template_inspiration: input.focusKey === 'sang-the-than-minh' ? 'Locked Vạn Tượng Ký Ức/Khởi Nguyên Biên Niên usage from canon.' : 'Locked by canon.',
    authority_constraints: 'Do not rewrite or contradict published canon.',
    forbidden_terms: defaultForbidden(input.focusKey),
    status: 'used',
    version: input.version,
    actual_summary_delta: input.summary || null,
    meta: { generated_by: 'canon_lock_blueprint' },
  };
}

async function main(): Promise<void> {
  const { data: project, error: projectErr } = await db.from('ai_story_projects')
    .select('id,novel_id,current_chapter,total_planned_chapters,main_character,master_outline,style_directives,novels!ai_story_projects_novel_id_fkey(title)')
    .eq('id', PROJECT_ID)
    .single();
  if (projectErr) throw projectErr;
  const total = numberArg('target', Number(project.total_planned_chapters || 1000));
  const current = Number(project.current_chapter || 0);
  const style = (project.style_directives || {}) as JsonRecord;
  const focusKey = typeof style.focus_key === 'string' ? style.focus_key : null;
  const master = parseMaster(project.master_outline);
  const title = asTitle(project.novels);

  const { data: chapters, error: chapterErr } = await db.from('chapters')
    .select('chapter_number,title')
    .eq('novel_id', project.novel_id)
    .lte('chapter_number', current)
    .order('chapter_number', { ascending: true });
  if (chapterErr) throw chapterErr;

  const { data: summaries, error: summaryErr } = await db.from('chapter_summaries')
    .select('chapter_number,summary,cliffhanger,mc_state')
    .eq('project_id', PROJECT_ID)
    .lte('chapter_number', current)
    .order('chapter_number', { ascending: true });
  if (summaryErr) throw summaryErr;

  const { data: arcPlans, error: arcErr } = await db.from('arc_plans')
    .select('arc_number,start_chapter,end_chapter,arc_theme,plan_text,chapter_briefs')
    .eq('project_id', PROJECT_ID)
    .order('arc_number', { ascending: true });
  if (arcErr) throw arcErr;
  const arcBriefByChapter = new Map<number, { arcRow: JsonRecord; brief: JsonRecord }>();
  for (const arcRow of (arcPlans || []) as JsonRecord[]) {
    for (const brief of (Array.isArray(arcRow.chapter_briefs) ? arcRow.chapter_briefs as JsonRecord[] : [])) {
      const chapterNumber = Number(brief.chapterNumber || brief.chapter_number || 0);
      if (chapterNumber > 0) arcBriefByChapter.set(chapterNumber, { arcRow, brief });
    }
  }

  const titleByChapter = new Map((chapters || []).map((row) => [Number(row.chapter_number), row.title as string]));
  const summaryByChapter = new Map((summaries || []).map((row) => [Number(row.chapter_number), row]));
  const rows: BlueprintRow[] = [];

  for (let chapter = 1; chapter <= total; chapter++) {
    const summary = summaryByChapter.get(chapter);
    if (chapter <= current) {
      rows.push(makeCanonBlueprint({
        projectId: PROJECT_ID,
        chapter,
        title: titleByChapter.get(chapter),
        summary: summary?.summary,
        cliffhanger: summary?.cliffhanger,
        mcState: summary?.mc_state,
        version: VERSION,
        mainCharacter: String(project.main_character || 'MC'),
        focusKey,
      }));
      continue;
    }
    rows.push(
      sangTheRepairBlueprint(chapter, PROJECT_ID, VERSION)
      || (arcBriefByChapter.has(chapter)
        ? makeArcBriefBlueprint({
            projectId: PROJECT_ID,
            chapter,
            total,
            version: VERSION,
            mainCharacter: String(project.main_character || 'MC'),
            focusKey,
            arcRow: arcBriefByChapter.get(chapter)!.arcRow,
            brief: arcBriefByChapter.get(chapter)!.brief,
          })
        : null)
      || makeFutureBlueprint({
        projectId: PROJECT_ID,
        chapter,
        total,
        version: VERSION,
        mainCharacter: String(project.main_character || 'MC'),
        focusKey,
        master,
      }),
    );
  }

  console.log(`project=${PROJECT_ID} title="${title}" current=${current} target=${total} version=${VERSION} rows=${rows.length} apply=${APPLY}`);
  if (!APPLY) {
    console.log(JSON.stringify(rows.slice(Math.max(0, current - 2), current + 8), null, 2));
    return;
  }

  const now = new Date().toISOString();
  await db.from('ai_story_projects').update({
    status: 'paused',
    pause_reason: 'chapter_blueprint_planning: generating full chapter blueprint coverage',
    paused_at: now,
    updated_at: now,
  }).eq('id', PROJECT_ID);

  const { error: runStartErr } = await db.from('story_blueprint_runs').upsert({
    project_id: PROJECT_ID,
    target_chapters: total,
    generated_chapters: 0,
    version: VERSION,
    status: 'generating',
    coverage_ok: false,
    last_error: null,
    updated_at: now,
  }, { onConflict: 'project_id,version' });
  if (runStartErr) throw runStartErr;

  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    const { error } = await db.from('chapter_blueprints').upsert(batch, { onConflict: 'project_id,chapter_number' });
    if (error) throw error;
    console.log(`upserted ${Math.min(i + batch.length, rows.length)}/${rows.length}`);
  }

  const coverage = await validateChapterBlueprintCoverage(PROJECT_ID, total, VERSION, db);
  const status = coverage.ok ? 'valid' : 'invalid';
  const { error: runDoneErr } = await db.from('story_blueprint_runs').upsert({
    project_id: PROJECT_ID,
    target_chapters: total,
    generated_chapters: coverage.generatedChapters,
    version: VERSION,
    status,
    coverage_ok: coverage.ok,
    last_error: coverage.ok ? null : `missing=${coverage.missingChapters.slice(0, 20).join(',')} invalid=${coverage.invalidChapters.slice(0, 20).join(',')}`,
    meta: { checked_at: new Date().toISOString(), missing_count: coverage.missingChapters.length, invalid_count: coverage.invalidChapters.length },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'project_id,version' });
  if (runDoneErr) throw runDoneErr;

  if (!coverage.ok) {
    throw new Error(`blueprint coverage failed: ${JSON.stringify(coverage)}`);
  }

  const nextStyle = {
    ...style,
    require_full_chapter_blueprint: true,
    chapter_blueprint_version: VERSION,
  };
  const projectUpdate: JsonRecord = {
    style_directives: nextStyle,
    pause_reason: ACTIVATE ? null : 'chapter_blueprint_planning: full blueprint valid; waiting for activation',
    paused_at: ACTIVATE ? null : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  projectUpdate.status = ACTIVATE ? 'active' : 'paused';
  const { error: projectUpdateErr } = await db.from('ai_story_projects').update(projectUpdate).eq('id', PROJECT_ID);
  if (projectUpdateErr) throw projectUpdateErr;

  console.log(`blueprint_coverage=pass generated=${coverage.generatedChapters}/${coverage.targetChapters} activate=${ACTIVATE}`);
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error);
  try {
    await db.from('story_blueprint_runs').upsert({
      project_id: PROJECT_ID,
      target_chapters: numberArg('target', 1000),
      generated_chapters: 0,
      version: VERSION,
      status: 'failed',
      coverage_ok: false,
      last_error: message.slice(0, 1000),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'project_id,version' });
  } catch {
    // ignore
  }
  console.error(message);
  process.exit(1);
});
