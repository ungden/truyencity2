// Patch project's story_outline.setupKernel to satisfy hasValidSetupKernel().

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const PROJECT_ID = '2bfd2a90-1e05-4d5f-a1e8-90f6ec2a6e1c';

const fullSetupKernel = {
  readerFantasy: 'Tôi xuyên hồn vào gia tộc sa sút, dùng Vạn Linh Phổ chỉ mình tôi thấy được — bàn tay vàng tiết lộ tuyến tiến hóa ẩn của vạn pet — bí mật tiến hóa pet phế vật thành thần thú trong kho riêng. Tôi sống mode lão lục: không ai biết tôi mạnh đến đâu, đối thủ chỉ làm nền cho tôi đè bẹp + ăn thưởng, gia tộc Cố từ phế tộc lên bá tộc đại lục.',
  protagonistEngine: 'MC Cố Diệp thắng bằng asymmetric info (Vạn Linh Phổ HUD chỉ MC thấy) + công thức BOM feed sequence concrete + pet evolution trong bí mật + kiểm soát thông tin tuyệt đối + đối thủ ngắt quãng làm nền + ăn thưởng tài nguyên/uy tín nội tộc. KHÔNG đánh nhau trực tiếp — combat luôn qua pet vs pet với MC chỉ huy.',
  pleasureLoop: [
    'MC nhìn pet phế vật → Vạn Linh Phổ scan tuyến tiến hóa ẩn',
    'MC bí mật feed sequence ở kho riêng / hậu sơn / phòng kín',
    'Pet evolve thành công, MC giấu cấp thật',
    'MC đem pet ra public ở mức kìm chế thấp hơn cấp thật 1-2 tier, thắng đối thủ làm nền',
    'Bystander shock thầm + đối thủ kinh ngạc câm họng + NPC khen lén',
    'MC ăn thưởng (tài nguyên / thông tin / uy tín nội tộc / setup-payoff cho pet tiếp theo)',
  ],
  systemMechanic: {
    input: 'MC quan sát một pet bất kỳ (pet phế trong kho gia tộc, pet đường phố, pet đối thủ) — Vạn Linh Phổ tự cập nhật khi observe pet mới',
    output: 'HUD ẩn hiện ra: cấp + thuộc tính hiện tại + 3-5 tuyến tiến hóa khả thi (mỗi tuyến có sequence feed concrete + thời gian + risk + final tier) + cảnh báo nếu feed sai sequence sẽ mutate sai/downgrade',
    limit: 'Chỉ MC thấy được, không transfer. Vạn Linh Phổ không tự feed pet — MC phải tìm nguyên liệu thật + thực hiện sequence đúng thời gian. Feed sai 1 bước → pet mutate sai/downgrade. Pet tier càng cao → nguyên liệu càng hiếm + thời gian càng dài.',
    reward: 'Pet evolve theo tuyến MC chọn → cấp tăng → MC giấu cấp thật, public ở mức kìm chế → thắng đối thủ làm nền → bystander shock + ăn thưởng tài nguyên/uy tín → resource compound cho pet tiếp theo.',
  },
  mcSecret: {
    secret: 'Cố Diệp xuyên hồn từ Trái Đất 2126, kiếp trước là sinh viên năm cuối Học Viện Ngự Thú đang viết luận văn về Tuyến Tiến Hóa Ẩn dùng pattern matching + bio-genome simulation. Tai nạn lab nổ → xuyên hồn. Vạn Linh Phổ là di sản tổ phụ Cố Lập Khải Đại Sư mất 5 năm trước, chỉ MC dùng được vì xuyên hồn synergy.',
    outsideWorldKnowledge: 'Người ngoài chỉ biết Cố Diệp là đứa con trưởng họ Cố vừa tỉnh sau suy nhược thần kinh, có thiên phú tổng kê kho và may mắn nhặt được pet phế cũ trong kho gia tộc. Không ai biết Vạn Linh Phổ, xuyên hồn, hay khả năng nhìn tuyến tiến hóa ẩn.',
    revealRule: 'Tuyệt đối không công khai trong 700 chương đầu. Không tiết lộ cho em gái Cố Tiểu Đào, quản gia Hà Thúc, đệ tử trẻ. Cultivation tiến nhanh lý giải bằng "di sản tổ phụ truyền lại" / "thiên phú đặc biệt" / "cơ duyên". Pet evolution chỉ làm trong kho riêng/phòng kín hậu sơn. Reveal full chỉ trong arc 6-7 ch.701+ khi giải mã liên kết Vạn Linh Phổ với Trái Đất.',
  },
  benefitLoop: {
    goal: 'Phục hưng gia tộc Cố từ phế tộc → tiểu tộc → trung tộc → đại tộc → bá tộc đại lục theo 7-arc ladder, mỗi arc compound từ pet evolution bí mật + thắng đối thủ làm nền + ăn thưởng tài nguyên/uy tín.',
    action: 'Quan sát pet phế trong kho gia tộc + đường phố → Vạn Linh Phổ scan tuyến tiến hóa ẩn → bí mật feed sequence + thời gian → pet evolve trong phòng kín → mang ra public ở mức kìm chế → thắng đối thủ làm nền → bystander shock thầm → MC ăn thưởng (tài nguyên / thông tin / uy tín nội tộc / setup-payoff).',
    benefit: 'Mỗi chương ≥1 dopamine peak hữu hình. Mỗi 3-5 chương ≥1 big wow (pet evolve / face-slap mass / milestone gia tộc). Compounding: tài nguyên → feed pet tốt hơn → pet mạnh hơn → thắng đối thủ lớn hơn → tài nguyên + uy tín nhiều hơn → leverage gia tộc rank lên.',
    cadence: 'Pet evolution stage mỗi 5-10 chương cho signature pet. Big face-slap mỗi 3-5 chương. Milestone gia tộc rank-up mỗi arc 100-200 chương. Adversity:dopamine = 10:90.',
  },
  interventionRule: 'MC chỉ can thiệp ngoài gia tộc khi đạt ≥1 trong 5 lợi ích cụ thể: (a) Resource (pet egg, công thức tiến hóa, nguyên liệu rare, đan dược, linh thạch); (b) Network (ally có future value, ân tình, mentor cấp Đại Sư, faction support); (c) Information (manh mối plot bố mẹ mất tích, âm mưu của chú, vị trí cấm địa pet hiếm); (d) Setup-payoff (đối tượng đã được setup làm đối thủ MC trong 1-3 chương trước → face-slap dopamine có lý do); (e) Family/faction (em gái Cố Tiểu Đào, gia tộc Cố, đệ tử trực tiếp). CẤM 4 patterns "MC chõ mồm": bênh người lạ ngẫu nhiên, lecture đạo lý cho NPC bất kỳ, mở miệng giúp uninvited không lợi, phán xét tình huống off-scope. ĐÚNG: MC bỏ qua / quan sát / tiếp tục việc của mình.',
  phase1Playground: {
    locations: [
      'Cố phủ chính sảnh — nơi tiếp khách, hội đồng trưởng lão, chú Cố Trường Khải nắm quyền họp',
      'Cố phủ kho lưu trữ pet — nơi nhốt pet phế cũ, hầu hết bị quên, MC bí mật vào để observe + feed pet',
      'Cố phủ hậu sơn — vườn sau gia tộc bỏ hoang, MC dùng làm phòng kín feed pet evolve',
      'Cố phủ thư phòng tổ phụ — phòng cũ của Cố Lập Khải Đại Sư, có sách công thức tiến hóa cổ + di sản',
      'Linh Châu Thành chợ pet — chợ giao dịch pet thuần hoá, MC observe pet đường phố',
      'Linh Châu Thành học viện ngự thú thành — học viện thành chính, có giải đấu nội thành',
      'Khu Tây nam thành — khu nhà gia tộc Cố và các tiểu tộc cùng cấp, đường phố thường ngày',
    ],
    cast: [
      'Cố Tiểu Đào (em gái MC, 12 tuổi, MC bảo vệ tuyệt đối)',
      'Hà Thúc (quản gia 60 tuổi, trung thành tuyệt đối, biết gia phả)',
      'Cố Già Tâm (trưởng lão 78 tuổi, trung lập ban đầu, dần ủng hộ MC)',
      'Cố Vân Kiếm (em họ kiêu ngạo, rival nội tộc, redemption arc 2)',
      'Tro Bụi (slime cấp F kho lưu trữ, signature pet flagship)',
      'Cơ Niệm (mech bug cấp E, pet thứ 2 acquire ch.20+)',
      'Lục Vũ (sparrow cấp F vườn nhà, pet thứ 3 acquire ch.40+)',
    ],
    localAntagonists: [
      'Cố Trường Khải (chú MC, antagonist nội tộc arc 1, ép MC ký từ bỏ thừa kế, biển thủ kho gia tộc)',
      'Cố Vân Kiếm (em họ rival ban đầu, kiêu ngạo coi thường MC)',
      'Đám trưởng lão biển thủ (3-4 người trung lập theo chú Cố Trường Khải, sẽ chuyển hướng sau face-slap đầu tiên của MC)',
    ],
    repeatableSceneTypes: [
      'MC observe pet phế trong kho → Vạn Linh Phổ scan tuyến tiến hóa',
      'MC bí mật feed sequence ở phòng kín hậu sơn',
      'Giải đấu / thi đấu nội tộc — MC dùng pet kìm chế thắng đối thủ làm nền',
      'Họp hội đồng trưởng lão — chú Cố Trường Khải gây áp lực, MC deflect bằng công thức ký từ bỏ',
      'Em gái Cố Tiểu Đào scene ấm áp — MC vỏ lạnh đạm nhưng nội tâm bảo vệ',
      'Quản gia Hà Thúc kể chuyện gia phả / tổ phụ — clue cho MC',
      'MC vào kho di sản tổ phụ — đọc sách công thức tiến hóa cổ',
      'MC bán pet/nguyên liệu ngầm để gom resource — dùng front Hà Thúc ở chợ',
    ],
  },
  noveltyLadder: [
    'Tier 1 (ch.1-50): Tro Bụi evolve Slime Tro F → Lửa Tro E. Cơ Niệm acquired ch.20. Lục Vũ acquired ch.40. MC từ Đồ Tể tầng 3 → Sơ Cấp tầng 1.',
    'Tier 2 (ch.51-150): Tro Bụi evolve Phượng Linh C, Lục Vũ Phong Linh C. MC từ Sơ Cấp → Trung Cấp. Mở chuỗi cửa hàng pet thuần hoá ngầm.',
    'Tier 3 (ch.151-300): Tro Bụi Hỏa Phụng Tế A. MC Trung Cấp peak. Cố tộc thành đại tộc thành. Em gái Cố Tiểu Đào lộ talent thông giao tâm linh.',
    'Tier 4 (ch.301-500): Cứu bố mẹ. Tro Bụi Hỏa Phụng Tế A peak. MC Cao Cấp. Diệt đại tộc Bắc Châu.',
    'Tier 5 (ch.501-700): Tro Bụi Vạn Lửa Thiên Phụng S. MC Đại Sư. Cố tộc bá tộc đại lục.',
    'Tier 6 (ch.701-900): Tro Bụi Hồng Hoang Phụng Tổ SS. MC Truyền Thuyết. Thần thú lập minh ước.',
    'Tier 7 (ch.901-1000): MC Thần Thoại. Bá chủ Vạn Linh.',
  ],
  controlRules: {
    payoffCadence: 'Mỗi chương payoff hữu hình + ≥1 đoạn reaction xã hội sảng. Trở ngại xử lý trong cùng chương hoặc tối đa 1-2 chương kèm thưởng. Mỗi 3-5 chương 1 cluster face-slap. Mỗi 5-10 chương pet evolve stage. Mỗi 20-50 chương milestone uy tín nội tộc.',
    attentionGradient: 'Arc 1 (ch.1-50): focus 100% Cố phủ + Linh Châu Thành nhỏ. Arc 2 (ch.51-150): mở rộng Linh Châu toàn thành. Arc 3 (ch.151-300): Linh Châu + lân cận thành. Arc 4 (ch.301-500): mở Bắc Vực. Arc 5 (ch.501-700): Trung Châu thủ phủ. Arc 6-7 (ch.701-1000): Vạn Thú Lĩnh + đại lục. KHÔNG cosmic-tier antagonist trước arc 6.',
    antagonistCadence: 'Đối thủ ngắt quãng 3-5 chương 1 đợt confront 1-2 chương. KHÔNG truy đuổi liên tục. Đợt confront xong → 2-3 chương breathing (em gái scene, quản gia kể chuyện, observe pet mới, feed bí mật).',
    dopamineSourcing: '80% dopamine qua phản ứng xã hội (bystander shock / đối thủ kinh ngạc / NPC khen lén / giá pet tăng / nội tộc ngầm phục). 20% qua MC internal monologue tính toán. KHÔNG MC tự khoe / MC tuyên bố / MC đắc ý.',
    secretControl: 'MC mỗi scene tương tác người ngoài: kiểm soát thông tin (lựa lời, deflect câu hỏi, chỉ tiết lộ cần thiết). Public face = "thiếu niên 16 tuổi bình thường, may mắn".',
    petTierMasking: 'Pet đã evolve cấp X public chỉ ở cấp X-1 hoặc X-2 (tier trên). MC bảo pet kìm chế. Reveal cấp thật chỉ khi đã invincible trong context đó.',
  },
  // Preserve existing rich fields
  castRoster: {
    coClanCore: [
      { name: 'Cố Diệp', role: 'MC', age: 16, realm: 'Ngự Thú Đồ Tể tầng 3', secret: 'Vạn Linh Phổ + xuyên hồn' },
      { name: 'Cố Lập Khải', role: 'tổ phụ MC (mất 5 năm trước, biểu tượng)', realm: 'Đại Sư', secret: 'thiết kế Vạn Linh Phổ chỉ MC dùng được' },
      { name: 'Cố Hành', role: 'bố MC (mất tích Bắc Vực 1 năm trước, reveal arc 4)', realm: 'Trung Cấp peak', secret: 'bị gài bẫy bởi đại tộc Bắc Châu' },
      { name: 'Lưu Tiêm Nhi', role: 'mẹ MC (mất tích cùng bố)', realm: 'Sơ Cấp', secret: 'đại sư phụ chế thuốc, biết bí mật gia phả' },
      { name: 'Cố Tiểu Đào', role: 'em gái MC (12 tuổi, MC bảo vệ tuyệt đối)', realm: 'chưa khế ước pet', secret: 'lộ talent thông giao tâm linh ở arc 3' },
    ],
    coClanInternal: [
      { name: 'Cố Trường Khải', role: 'chú MC (antagonist nội tộc arc 1)', realm: 'Sơ Cấp', motive: 'ép MC ký từ bỏ thừa kế, biển thủ kho gia tộc' },
      { name: 'Cố Vân Kiếm', role: 'em họ (cháu của Trường Khải, rival nội tộc)', realm: 'Ngự Thú Đồ Tể đỉnh', motive: 'kiêu ngạo coi thường MC, redemption arc 2' },
      { name: 'Hà Thúc', role: 'quản gia (60 tuổi, trung thành tuyệt đối)', realm: 'Sơ Cấp tầng thấp', secret: 'biết gia phả + bí mật của tổ phụ, không biết Vạn Linh Phổ' },
      { name: 'Cố Già Tâm', role: 'trưởng lão (78 tuổi, trung lập ban đầu)', realm: 'Trung Cấp', motive: 'dần ủng hộ MC sau face-slap đầu tiên' },
    ],
  },
  petSystem: {
    tierLadder: ['F (rác đường phố)', 'E (common forest)', 'D (skilled hunter)', 'C (rare forest deep)', 'B (legendary)', 'A (ancestral)', 'S (godbeast)', 'SS (mythical primordial)', 'SSS (creator-tier)'],
    tamerLadder: ['Ngự Thú Đồ Tể (1-9 sub)', 'Sơ Cấp (1-9)', 'Trung Cấp (1-9)', 'Cao Cấp (1-9)', 'Đại Sư (1-9)', 'Truyền Thuyết (1-3)', 'Thần Thoại (1-3)'],
    signaturePets: [
      { name: 'Tro Bụi', initialTier: 'F', initialForm: 'slime kho lưu trữ chỉ ăn bụi', publicView: 'phế vật cleaning slime', vanLinhPhoPath: 'Slime Tro (F) → Lửa Tro (E) → Phượng Linh (C) → Hỏa Phụng Tế (A) → Vạn Lửa Thiên Phụng (S) → Hồng Hoang Phụng Tổ (SS)', endgameRole: 'flagship pet 1000 chương' },
      { name: 'Cơ Niệm', initialTier: 'E', initialForm: 'mech bug đường phố giá rẻ', publicView: 'côn trùng cơ giới rẻ tiền', vanLinhPhoPath: 'mech bug (E) → Cơ Khí Vũ Sĩ (D) → Thần Thuật Cơ Sư (B) → Cơ Giới Thần Sứ (S)', endgameRole: 'second pet acquired ch.20+' },
      { name: 'Lục Vũ', initialTier: 'F', initialForm: 'sparrow vườn nhà', publicView: 'chim sẻ thường', vanLinhPhoPath: 'sparrow (F) → Phong Yến (E) → Phong Linh (C) → Phong Linh Vương (B) → Bão Phong Đại Đế (S) → Cuồng Phong Tổ Thần (SS)', endgameRole: 'third pet acquired ch.40+' },
    ],
  },
  worldMap: {
    tier1: 'Linh Châu Thành (đầu game arc 1-3, ch.1-300)',
    tier2: 'Bắc Vực (arc 4 ch.301-500)',
    tier3: 'Trung Châu (arc 5 ch.501-700)',
    tier4: 'Vạn Thú Lĩnh (arc 6-7 ch.701-1000)',
  },
};

async function main() {
  const { data: project, error: getErr } = await db.from('ai_story_projects').select('story_outline').eq('id', PROJECT_ID).maybeSingle();
  if (getErr) { console.error(getErr); process.exit(1); }
  if (!project) { console.error('Project not found'); process.exit(1); }

  const oldOutline = (project.story_outline as Record<string, unknown>) || {};
  const newOutline = {
    ...oldOutline,
    setupKernel: fullSetupKernel,
  };

  const { error: updErr } = await db.from('ai_story_projects').update({ story_outline: newOutline, updated_at: new Date().toISOString() }).eq('id', PROJECT_ID);
  if (updErr) { console.error(updErr); process.exit(1); }

  console.log('story_outline.setupKernel patched.');
  console.log('Validate by running:');
  console.log(`  PROJECT_ID=${PROJECT_ID} npx tsx scripts/write-chapter-flash.ts`);
}

main().catch((e) => { console.error(e); process.exit(1); });
