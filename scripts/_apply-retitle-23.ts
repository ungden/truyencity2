/**
 * Phase P (2026-05-12): Re-title 23 hard-flagged novels.
 *
 * Strategy:
 * - UPDATE novels.title (keep slug → SEO safe)
 * - UPDATE ai_story_projects.story_outline.title JSONB (Phase J 8 cases có outline)
 *
 * Drops: mã giáp / phá phòng / Sequence / Cosmic / Stand / DBZ / Pokemon /
 * Bakery / Cyber / AI-7 / Cửu Châu / Trường An / Đại Đường — these are
 * jargon/English/TQ-placename leaks confusing reader Việt baseline.
 *
 * Usage:
 *   npx tsx scripts/_apply-retitle-23.ts          # dry run
 *   npx tsx scripts/_apply-retitle-23.ts --apply  # execute
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime', quiet: true });
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.local', quiet: true, override: true });

const APPLY = process.argv.includes('--apply');

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

interface Rewrite {
  project_id: string;
  novel_id: string;
  old_title: string;
  new_title: string;
  has_story_outline: boolean; // Phase J có, others usually không
}

const REWRITES: Rewrite[] = [
  // ── Phase J 8 (story_outline có JSONB → patch luôn) ──
  {
    project_id: 'c0cb5518-f81a-4b7a-9a78-34e82235640d',
    novel_id: '33252afe-21d5-42e2-abe0-36e109c2800b',
    old_title: 'Quỷ Bí Chi Tử: Sequence 9 Đêm Thánh Đoàn',
    new_title: 'Quỷ Bí Chi Tử: Đêm Thánh Đoàn Tầng Thứ Chín',
    has_story_outline: true,
  },
  {
    project_id: '59588b52-6aa4-4050-8458-c25a998d3af5',
    novel_id: 'd024bac5-36c0-4055-ac69-58ad38d4cc60',
    old_title: 'Tổng Mạn: Phơi Bày Itachi Bí Mật, Konoha Phá Phòng',
    new_title: 'Tổng Mạn: Itachi Bí Mật Được Phơi Bày, Konoha Chấn Động',
    has_story_outline: true,
  },
  {
    project_id: '37804a4c-f205-4872-8fdc-9716877761ef',
    novel_id: '23e60baf-0ecf-47bb-bbec-455840e20ad4',
    old_title: 'Phu Nhân, Cô Lại Rớt Mã Giáp #5 Rồi!',
    new_title: 'Phu Nhân, Cô Lại Lộ Thân Phận Thứ 5 Rồi!',
    has_story_outline: true,
  },
  {
    project_id: 'aaac7415-59c8-4c43-96df-1a9e37c15a2f',
    novel_id: 'a945ee96-6cfe-4183-a525-da8a097e4781',
    old_title: 'Tổng Mạn: Bị Ta Phơi Bày, Phản Phái Tập Thể Phá Phòng',
    new_title: 'Tổng Mạn: Bị Ta Phơi Bày, Phản Phái Tập Thể Chấn Động',
    has_story_outline: true,
  },
  {
    project_id: 'ce0d30d3-cc44-43c2-9d32-84d3af7e0443',
    novel_id: '6f260ac6-d594-43ba-a3c1-7c072483095b',
    old_title: 'Hiểu Lầm Tu Tiên: Bịa Cosmic, Ai Ngờ Thành Thật',
    new_title: 'Hiểu Lầm Tu Tiên: Bịa Hỗn Nguyên Đạo, Ai Ngờ Thành Thật',
    has_story_outline: true,
  },
  {
    project_id: '8e56f103-150a-4289-9bbd-4eb900c307ec',
    novel_id: 'fef4c747-2f50-49f3-a775-85a19450f85d',
    old_title: 'Tô Tô Trên Mạng Lộ Vạn Mã Giáp, Cả Hào Môn Quỳ Gọi Tổ Tông',
    new_title: 'Tô Tô Trên Mạng Lộ Vạn Thân Phận, Cả Hào Môn Quỳ Gọi Tổ Tông',
    has_story_outline: true,
  },
  {
    project_id: 'd7609419-9644-4dff-9271-0bf5760dd3ec',
    novel_id: '3eeb7f55-5d07-4eb9-97d0-3bacbbd23d5b',
    old_title: 'Đại Tiểu Thư Bị Coi Là Phế Vật, Ai Ngờ Là Thiên Tài 7 Mã Giáp',
    new_title: 'Đại Tiểu Thư Bị Coi Là Phế Vật, Ai Ngờ Ẩn 7 Thân Phận Đại Lão',
    has_story_outline: true,
  },
  {
    project_id: 'b3453201-5cbf-4038-aaa0-9e738c8e03f6',
    novel_id: '5df26c0c-7f7c-4c57-9c71-c62a887a98b5',
    old_title: 'Mã Giáp Phu Nhân: Đại Lão Vô Hình Trong Hào Môn',
    new_title: 'Phu Nhân Ẩn Thân: Đại Lão Vô Hình Trong Hào Môn',
    has_story_outline: true,
  },

  // ── Reset 672 (5 entries — TQ placename) ──
  {
    project_id: '25fa5b1a-4c9c-4c05-a324-092a3886f014',
    novel_id: 'b5846d06-06d7-48a2-95c8-c1f1504e71c9',
    old_title: 'Trường An Thực Thánh: Nhất Vị Định Giang Sơn',
    new_title: 'Phú Xuân Thực Thánh: Nhất Vị Định Giang Sơn',
    has_story_outline: false,
  },
  {
    project_id: 'd2e12e5d-d798-4cca-bd73-6bfb3fc70046',
    novel_id: 'ece727ab-fc04-45b2-8d04-a02cd607764f',
    old_title: 'Cửu Châu Diễn Võ Lục',
    new_title: 'Vạn Hà Diễn Võ Lục',
    has_story_outline: false,
  },
  {
    project_id: 'f6d5f678-be27-41eb-9d66-b5840d040f1e',
    novel_id: '80b61852-0e2e-404f-85ac-0d3833510dfb',
    old_title: 'Đại Đường Thương Hoàng: Ta Tại Trường An Có Siêu Thị',
    new_title: 'Đại Việt Thương Hoàng: Ta Tại Thăng Long Có Siêu Thị',
    has_story_outline: false,
  },
  {
    project_id: '6a37af2a-2f06-457a-be4e-0e693c20a10a',
    novel_id: '585894be-99d9-471c-b5e1-ae94b2a5a7ec',
    old_title: 'Đại Đường Thực Thần: Khai Cục Một Đao Chấn Kinh Trường An',
    new_title: 'Đại Việt Thực Thần: Khai Cục Một Đao Chấn Kinh Thăng Long',
    has_story_outline: false,
  },
  {
    project_id: '356a7f92-baa9-4ba4-9cbc-8a705c7c2643',
    novel_id: '83b6c1e8-d07c-4dd2-8665-39b25d023ae8',
    old_title: 'Cửu Châu Kiếm Chủ: Khai Cục Diễn Võ Đạo Tàng',
    new_title: 'Vạn Hà Kiếm Chủ: Khai Cục Diễn Võ Đạo Tàng',
    has_story_outline: false,
  },

  // ── Phase L 100 (10 entries — English mix / TQ placename / mã giáp) ──
  {
    project_id: 'e7edfa77-136a-4e80-b5e1-36b8ae04572e',
    novel_id: '86aa39a8-a5fd-43b1-8e68-a26f0ed7c87d',
    old_title: 'Mở Quán Net Trong Cửu Châu Bí Cảnh',
    new_title: 'Mở Quán Net Trong Vạn Cổ Bí Cảnh',
    has_story_outline: false,
  },
  {
    project_id: '9d9cc3e2-41f0-4a5a-a45f-c4a8a9fdb43e',
    novel_id: '8a1b6357-562e-4ba0-ab46-c344c94b3c3f',
    old_title: 'AI-7 Hỏi: Loài Người Có Còn Cần Tôi Nữa Không?',
    new_title: 'Hệ Thống Hỏi: Loài Người Còn Cần Tôi Nữa Không?',
    has_story_outline: false,
  },
  {
    project_id: 'bcf4a7d2-ece7-4e49-ac7e-e8873e95ebc3',
    novel_id: 'cb64176a-53b4-4e8f-b6b4-17c03fe045d5',
    old_title: 'JoJo Stand: Ta Là Người Việt Nam Đầu Tiên Có Stand',
    new_title: 'Linh Thể Đại Diện: Ta Là Người Việt Đầu Tiên Sở Hữu',
    has_story_outline: false,
  },
  {
    project_id: '05f66d56-ac73-47c0-9891-0ae8111b4371',
    novel_id: 'e4171628-3e9d-4b7d-907d-a0f43294f762',
    old_title: 'Cyber Sài Gòn 2099: Ta Là Hacker Đặc Biệt Của Viettel',
    new_title: 'Sài Gòn 2099: Ta Là Tin Tặc Đặc Biệt Của Viettel',
    has_story_outline: false,
  },
  {
    project_id: 'cfb311cd-2cca-45e6-9373-0f28c7de6e47',
    novel_id: 'c5015e7b-cfb4-44b7-b41f-2b8827ee907a',
    old_title: 'DBZ: Ta Là Saiyan Cuối Cùng Của Vegeta-2',
    new_title: 'Bảy Viên Ngọc Rồng: Ta Là Saiyan Cuối Cùng Của Vegeta-2',
    has_story_outline: false,
  },
  {
    project_id: '2d2dd850-d264-40c5-913e-15ba87b2be5b',
    novel_id: 'd42de727-6246-4089-9859-1f537108025e',
    old_title: 'Bleach: Ta Là Shinigami Squad -1 — Trên Aizen Dưới Yhwach',
    new_title: 'Sứ Mệnh Thần Chết: Ta Là Tử Thần Đội -1 — Trên Aizen Dưới Yhwach',
    has_story_outline: false,
  },
  {
    project_id: '7c9baf0d-f70c-404f-9066-8e2b22cfa6aa',
    novel_id: '61340883-e486-415e-9085-a60273ee2244',
    old_title: 'Tận Thế: Tôi Là Người Duy Nhất Có Mã Vạch Cosmic',
    new_title: 'Tận Thế: Tôi Là Người Duy Nhất Có Mã Vạch Vũ Trụ',
    has_story_outline: false,
  },
  {
    project_id: '45a994b2-228f-4181-bb9a-9c3b165eb6bd',
    novel_id: 'df2ac810-45dd-47a1-a37a-9db80d290e0b',
    old_title: 'Pokemon Trainer VN: Bộ 6 Của Tôi Là 6 Loài Thú Mới',
    new_title: 'Ngự Thú Sư Việt Nam: Bộ 6 Của Tôi Là 6 Loài Thú Mới',
    has_story_outline: false,
  },
  {
    project_id: '5a82c25c-ecdc-40dc-820a-11fdfb4a9960',
    novel_id: 'abf24453-e773-4ece-a1b6-c851a241f979',
    old_title: 'Tổng Tài Ơi, Vợ Anh Lại Trên Mạng Lộ Mã Giáp Rồi',
    new_title: 'Tổng Tài Ơi, Vợ Anh Lại Trên Mạng Lộ Thân Phận Rồi!',
    has_story_outline: false,
  },
  {
    project_id: '9bd0da2f-05d3-48bb-86e8-02baf76012f0',
    novel_id: '06975d54-6450-4a7d-a246-aae833cdf2c9',
    old_title: 'Ngày Tận Thế, Ta Là Người Duy Nhất Còn WiFi',
    new_title: 'Ngày Tận Thế, Ta Là Người Duy Nhất Còn Sóng Mạng',
    has_story_outline: false,
  },
];

async function main() {
  console.log(`\n━━━━ Phase P Re-title: ${REWRITES.length} novels ━━━━`);
  console.log(`Mode: ${APPLY ? '✅ APPLY' : '🟡 DRY RUN'}\n`);

  for (const [i, r] of REWRITES.entries()) {
    console.log(`${i + 1}. ${r.old_title}`);
    console.log(`   → ${r.new_title}`);
  }

  if (!APPLY) {
    console.log('\n🟡 DRY RUN — pass --apply to execute UPDATE');
    return;
  }

  console.log('\n━━━━ Applying ━━━━\n');

  let ok = 0;
  let fail = 0;

  for (const r of REWRITES) {
    // 1. UPDATE novels.title (keep slug)
    const { error: novelErr } = await db
      .from('novels')
      .update({ title: r.new_title, updated_at: new Date().toISOString() })
      .eq('id', r.novel_id);

    if (novelErr) {
      console.error(`✗ ${r.novel_id} novels: ${novelErr.message}`);
      fail++;
      continue;
    }

    // 2. UPDATE ai_story_projects.story_outline.title JSONB (Phase J only)
    if (r.has_story_outline) {
      // Read existing outline first
      const { data: proj } = await db
        .from('ai_story_projects')
        .select('story_outline')
        .eq('id', r.project_id)
        .single();
      if (proj?.story_outline && typeof proj.story_outline === 'object') {
        const patched = { ...(proj.story_outline as Record<string, unknown>), title: r.new_title };
        const { error: outlineErr } = await db
          .from('ai_story_projects')
          .update({ story_outline: patched, updated_at: new Date().toISOString() })
          .eq('id', r.project_id);
        if (outlineErr) {
          console.error(`⚠ ${r.project_id} story_outline patch: ${outlineErr.message}`);
        }
      }
    }

    console.log(`✓ ${r.new_title.slice(0, 70)}`);
    ok++;
  }

  console.log(`\n━━━━ Summary: ${ok} success, ${fail} failed ━━━━`);
}

main().catch((e) => { console.error(e); process.exit(1); });
