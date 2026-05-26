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
  if (focusKey === 'thien-dao-thu-vien') {
    return [
      'nộp bản thảo',
      'phân lâu',
      'xếp hàng',
      'quán trà',
      'ta biết ngươi là ai',
      'dấu vết tinh thần',
      'Hắc Ám Văn Đàn',
      'sát thủ',
      'áo choàng',
      'góc phố',
      'Hook:',
      'không chỉ có người tốt',
      'CONTEXT COMPACT',
      'YÊU CẦU OUTPUT',
    ];
  }
  return ['CONTEXT COMPACT', 'Hook:', 'YÊU CẦU OUTPUT'];
}

type ThienDaoSourcePlan = {
  source: string;
  sourceCharacters: string;
  landmarkScene: string;
  inWorldWork: string;
  skillPayoff: string;
  readerFaction: string;
  craftGoal: string;
};

function thienDaoSourcePlan(chapter: number): ThienDaoSourcePlan {
  if (chapter <= 50) {
    return {
      source: 'Anh Hùng Xạ Điêu',
      sourceCharacters: 'Quách Tĩnh, Hoàng Dung, Hồng Thất Công',
      landmarkScene: chapter < 25 ? 'Quách Tĩnh từ vụng thành chính, độc giả học chính khí quyền cước' : 'Hồng Thất Công truyền chưởng, Hoàng Dung dùng trí mở khóa cao trào',
      inWorldWork: 'Sơn Hà Xạ Nhật',
      skillPayoff: chapter < 25 ? 'Phá Vân Chưởng và chính khí căn cơ' : 'Phục Ma Thập Bát Chưởng bản sơ giải',
      readerFaction: 'võ sinh bình dân và thư hội Vạn Văn Hội',
      craftGoal: 'dùng nhân vật trưởng thành + võ học có cảm xúc để nghiền văn phong bản địa đơn tuyến',
    };
  }
  if (chapter <= 100) {
    return {
      source: 'Tiếu Ngạo Giang Hồ',
      sourceCharacters: 'Lệnh Hồ Xung, Phong Thanh Dương, Nhậm Doanh Doanh',
      landmarkScene: chapter < 75 ? 'Lệnh Hồ Xung học kiếm ý tự do, Phong Thanh Dương truyền Độc Cô Cửu Kiếm' : 'giang hồ chính tà va chạm, tiếng đàn và kiếm ý hóa giải giáo điều',
      inWorldWork: 'Kiếm Ca Tiêu Dao',
      skillPayoff: 'Tiêu Dao Kiếm Ý và phá chiêu căn bản',
      readerFaction: 'kiếm tu trẻ, đệ tử học viện và thư bình bảng Tân Tác Gia',
      craftGoal: 'mở nhịp tự do/kiếm ý, face-slap tác gia bắt chước chỉ biết liệt kê chiêu thức',
    };
  }
  if (chapter <= 150) {
    return {
      source: 'Tam Quốc Diễn Nghĩa',
      sourceCharacters: 'Gia Cát Lượng, Lưu Bị, Quan Vũ, Tào Tháo',
      landmarkScene: chapter < 125 ? 'thảo thuyền mượn tên và Long Trung đối' : 'Xích Bích, không thành kế và binh pháp dùng thế thắng lực',
      inWorldWork: 'Binh Thư Sơn Hà',
      skillPayoff: 'Vân Mưu Binh Pháp, trận ý hợp kích và tâm pháp thống soái',
      readerFaction: 'võ quán, quân viện, thế gia học binh pháp',
      craftGoal: 'đưa chiến tranh/mưu lược nhiều tuyến vào Thiên Đạo Thư Viện để mở dopamine bảng lớn',
    };
  }

  const cycle: ThienDaoSourcePlan[] = [
    {
      source: 'Sherlock Holmes',
      sourceCharacters: 'Sherlock Holmes, Dr. Watson, Moriarty',
      landmarkScene: 'suy luận từ dấu vết nhỏ, Watson làm góc nhìn nhập tâm, đối thủ trí tuệ tạo thế cân não',
      inWorldWork: 'Án Kiếm Trong Sương',
      skillPayoff: 'Minh Tâm Quan Sát, bộ pháp truy tung và phá trận bằng suy luận',
      readerFaction: 'chấp pháp đường, học viện trinh thám võ đạo, độc giả thích giải đố',
      craftGoal: 'biến trinh thám thành võ học quan sát, không kéo MC ra điều tra ngoài đời',
    },
    {
      source: 'Tây Du Ký',
      sourceCharacters: 'Tôn Ngộ Không, Đường Tăng, Trư Bát Giới, Sa Tăng',
      landmarkScene: 'Đại Náo Thiên Cung, ba lần thử tâm, đường thỉnh kinh vượt kiếp nạn',
      inWorldWork: 'Vạn Kiếp Hành Giả',
      skillPayoff: 'Tâm Viên Thân Pháp, định tâm pháp và ý chí phá kiếp',
      readerFaction: 'khổ tu võ giả, tăng viện, độc giả thích thần thoại',
      craftGoal: 'mở thần thoại tu tâm nhưng vẫn giữ sảng văn, mỗi kiếp nạn trả thưởng rõ',
    },
    {
      source: 'Harry Potter',
      sourceCharacters: 'Harry Potter, Hermione Granger, Dumbledore, Voldemort',
      landmarkScene: 'thư nhập học, học viện phân viện, tình bạn giải bí mật và trận cuối chống hắc ám',
      inWorldWork: 'Học Cung Pháp Văn',
      skillPayoff: 'Pháp văn phòng hộ, ký ức chú thuật và cộng minh học viện',
      readerFaction: 'học sinh võ viện, trận pháp sư trẻ, thư hội học cung',
      craftGoal: 'dùng học viện + bí mật tầng tầng để tạo cộng đồng độc giả, không để MC lộ danh',
    },
    {
      source: 'Lord of the Rings',
      sourceCharacters: 'Frodo, Gandalf, Aragorn, Legolas',
      landmarkScene: 'đoàn hộ nhẫn, Minas Tirith, hành trình nhỏ gánh vận mệnh lớn',
      inWorldWork: 'Vương Miện Và Trường Lộ',
      skillPayoff: 'Thủ Hộ Ý Chí, chiến trận đồng minh và kiếm ý vương giả',
      readerFaction: 'tông môn liên minh, độc giả chiến tranh sử thi',
      craftGoal: 'đẩy sử thi đồng đội để thế giới cảm thấy rộng mà không làm MC bị cuốn vào âm mưu đời thật',
    },
    {
      source: 'Naruto',
      sourceCharacters: 'Naruto, Sasuke, Sakura, Kakashi',
      landmarkScene: 'đội bảy, kỳ thi trung nhẫn, ý chí không bỏ cuộc và thầy trò truyền thừa',
      inWorldWork: 'Nhẫn Võ Thiếu Niên',
      skillPayoff: 'Ảnh Bộ Phân Thân, khống khí tinh vi và ý chí đồng đội',
      readerFaction: 'thiếu niên võ sinh, võ quán bình dân, bảng thiếu niên',
      craftGoal: 'dùng nhiệt huyết thiếu niên tạo độc giả đại chúng và phản hồi khí huyết dày',
    },
    {
      source: 'One Piece',
      sourceCharacters: 'Luffy, Zoro, Nami, Sanji',
      landmarkScene: 'ra khơi lập đồng đội, tuyên ngôn tự do, mỗi đảo một payoff lớn',
      inWorldWork: 'Hải Lộ Vạn Tượng',
      skillPayoff: 'Hải Triều Thân Pháp, đao ý đồng đội và khí phách tự do',
      readerFaction: 'tán tu, thương hội đường biển, thư bình phiêu lưu',
      craftGoal: 'mở phiêu lưu từng đảo để mỗi mini-arc có reader reaction rõ',
    },
    {
      source: 'Phong Thần Diễn Nghĩa',
      sourceCharacters: 'Khương Tử Nha, Na Tra, Dương Tiễn, Văn Trọng',
      landmarkScene: 'bảng phong thần, Na Tra tái tạo thân, tiên phàm đại chiến có quy tắc',
      inWorldWork: 'Phong Thần Bút Lục',
      skillPayoff: 'Hương Hỏa Pháp Thân, thần thông sơ giải và trận pháp phong danh',
      readerFaction: 'đạo viện, thần miếu võ tu, tác gia nghiên cứu Thiên Đạo công nhận',
      craftGoal: 'đưa thần thoại phương Đông vào ladder tác gia, mở quyền năng danh vọng nhưng giữ ledger',
    },
    {
      source: 'Đấu Phá Thương Khung',
      sourceCharacters: 'Tiêu Viêm, Dược Lão, Nạp Lan Yên Nhiên, Mỹ Đỗ Toa',
      landmarkScene: 'ba năm ước hẹn, lão sư trong giới chỉ, dị hỏa và luyện dược nghịch tập',
      inWorldWork: 'Viêm Đạo Nghịch Thiên',
      skillPayoff: 'Hỏa Ý Luyện Thể, luyện đan nhập môn và nghịch tập tâm pháp',
      readerFaction: 'luyện đan sư, thiếu niên bị khinh thường, bảng nhiệt huyết',
      craftGoal: 'dùng webnovel nghịch tập chuẩn để tăng dopamine, không để MC chịu nhục kéo dài',
    },
  ];

  return cycle[Math.floor((chapter - 151) / 50) % cycle.length];
}

function thienDaoPhase(chapter: number): string {
  const pos = ((chapter - 1) % 10) + 1;
  if (pos <= 2) return 'khóa template và mở hồi mới';
  if (pos <= 4) return 'đẩy độc giả nhập tâm';
  if (pos <= 6) return 'cho nhóm độc giả lĩnh ngộ';
  if (pos <= 8) return 'kéo thư bình/bảng xếp hạng phản ứng';
  return 'payoff danh vọng và hook tác phẩm kế tiếp';
}

function thienDaoForbidden(chapter: number): string[] {
  void chapter;
  return defaultForbidden('thien-dao-thu-vien');
}

function thienDaoBlueprint(chapter: number, projectId: string, version: number): BlueprintRow | null {
  if (chapter <= 10) return null;
  const plan = thienDaoSourcePlan(chapter);
  const phase = thienDaoPhase(chapter);
  const arcNumber = Math.ceil(chapter / 20);
  const local = ((chapter - 1) % 20) + 1;
  const recognition = chapter < 50 ? 'Bạch Bút/Tân Tác Gia' : chapter < 150 ? 'Thanh Bút sơ kỳ' : chapter < 300 ? 'Thanh Bút ổn định' : chapter < 600 ? 'Kim Bút dự bị' : 'Kim Bút trở lên';
  const ch11FalseTrail = chapter === 11
    ? ' Mở đầu phải hóa giải hook ch.10 thành phản hồi tinh thần theo bút danh: độc giả chỉ nhận ra Vô Danh Khách trên bảng thư bình, không biết Lâm Mặc ngoài đời.'
    : '';
  return {
    project_id: projectId,
    chapter_number: chapter,
    volume_number: Math.ceil(chapter / 100),
    arc_number: arcNumber,
    sub_arc_number: Math.ceil(chapter / 10),
    title_hint: `${plan.inWorldWork} - ${phase}`.slice(0, 180),
    goal: `Ch.${chapter} ${phase}: Lâm Mặc dùng Vạn Văn Ký Ức gọi rõ template gốc "${plan.source}" (${plan.sourceCharacters}), giữ cảnh ${plan.landmarkScene}, rồi ẩn danh khắc hồi mới của "${plan.inWorldWork}" vào Thiên Đạo Thư Viện bằng thần niệm.${ch11FalseTrail}`.slice(0, 900),
    conflict: `Trở ngại chỉ ở văn đàn/độc giả/bảng: tác gia bản địa chưa hiểu ${plan.craftGoal}; Lâm Mặc không lộ diện, không gặp địch trực tiếp, dùng dữ liệu thư bình và chương mới xử lý trong cùng nhịp.${ch11FalseTrail}`.slice(0, 500),
    payoff: `Độc giả ${plan.readerFaction} nhập tâm và lĩnh ngộ ${plan.skillPayoff}; Lâm Mặc nhận điểm công nhận, phản hồi khí huyết/danh vọng ${recognition}, thêm dữ liệu để tối ưu hồi sau.`.slice(0, 500),
    ending_hook: local === 20
      ? `Bảng Thiên Đạo mở ngưỡng kế tiếp cho bút danh Vô Danh Khách và gợi ý source template mới sau "${plan.source}".`
      : `Thư bình/điểm công nhận chỉ ra độc giả đang chờ cảnh kế tiếp của "${plan.source}" mà vẫn không biết Lâm Mặc là Vô Danh Khách.`,
    cast: ['Lâm Mặc', 'Vạn Văn Ký Ức', 'Vô Danh Khách', ...plan.readerFaction.split(/,| và /).map((s) => s.trim()).filter(Boolean).slice(0, 2)],
    location: 'Phòng thuê của Lâm Mặc / thức hải Thiên Đạo Thư Viện / khu đọc tinh thần của độc giả',
    resource_ledger_delta: `Ghi rõ điểm công nhận Thiên Đạo, chi phí tinh thần khi khắc "${plan.inWorldWork}", phản hồi khí huyết/danh vọng nhận được và dữ liệu thư bình dùng cho hồi sau.`,
    world_state_delta: `Thiên Đạo Thư Viện xuất hiện làn sóng đọc mới: ${plan.readerFaction} bàn luận, bảng ${recognition} dao động, văn đàn bản địa bị ép học narrative craft.`,
    species_delta: 'Không áp dụng loài phụ thuộc; thay bằng reader/faction delta: nhóm độc giả mới, kỹ năng lĩnh ngộ mới, thư hội/bảng xếp hạng phản ứng rõ.',
    template_inspiration: `Nguồn Trái Đất bắt buộc nêu trong nội tâm/ledger: "${plan.source}"; nhân vật/cảnh gốc: ${plan.sourceCharacters}; ${plan.landmarkScene}. Bản dị giới "${plan.inWorldWork}" chỉ đổi vừa đủ để hợp luật Thiên Đạo, không đổi sạch 100%.`,
    authority_constraints: 'Thiên Đạo Thư Viện là thư viện tinh thần gọi trong thức hải/ý niệm; chỉ dùng bút danh/thần niệm/ledger. Không nộp bản thảo vật lý, không phân lâu, không xếp hàng, không điều tra ngoài đời, không để lộ thân phận thật trước ch.100.',
    forbidden_terms: thienDaoForbidden(chapter),
    status: 'planned',
    version,
    meta: {
      generated_by: 'thien_dao_source_blueprint_map',
      earth_source: plan.source,
      earth_source_characters: plan.sourceCharacters,
      in_world_work: plan.inWorldWork,
      skill_payoff: plan.skillPayoff,
      phase,
    },
  };
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
  const thienDaoCanonTemplate = input.focusKey === 'thien-dao-thu-vien'
    ? 'Locked published canon; preserve Thiên Đạo Thư Viện mental-library kernel and any explicit Earth source ledger already present (Anh Hùng Xạ Điêu/Tiếu Ngạo/Tam Quốc etc.). Future chapters must not contradict this canon.'
    : null;
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
    template_inspiration: input.focusKey === 'sang-the-than-minh' ? 'Locked Vạn Tượng Ký Ức/Khởi Nguyên Biên Niên usage from canon.' : (thienDaoCanonTemplate || 'Locked by canon.'),
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
      || (focusKey === 'thien-dao-thu-vien' ? thienDaoBlueprint(chapter, PROJECT_ID, VERSION) : null)
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
