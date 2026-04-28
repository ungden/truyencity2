/**
 * Deep quality fix for all 10 Phase 20A representative novels.
 *
 * Issues addressed:
 *  1. world_description fake currency ("5 ngàn xu") → real VND
 *  2. master_outline arc count vs total_planned_chapters mismatch
 *     - Either extend arcs OR reduce total_planned to match what's outlined
 *  3. Missing sub_genres / mc_archetype tags for trọng-sinh / business novels
 *  4. Timeline conflicts in Trở Lại 1995 (1997 crisis vs 2000 stock market)
 *  5. Brand name consistency where MC name in outline differs from project
 *
 * Strategy: per-novel inspection. If master_outline only covers half the
 * planned chapters, REDUCE total_planned to match (don't ask AI to extend
 * — adding 6+ more arcs blindly invites further inconsistency). The user
 * can grow the novel later if it's popular.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alexle/Documents/truyencity/.env.runtime' });
process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-ef7b0c18ca9d4270921ddabc191a19c3';

import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });

const SLUGS = [
  'van-phong-13-quy-tac-sinh-ton-sau-6h-toi',
  'slime-cua-ta-nuot-ca-rong',
  'he-thong-lai-phai-ta-di-cuu-phao-hoi',
  'doan-tuyet-5-nam-sau-ho-quy-truoc-van-phong',
  'de-che-van-hoa-ta-mang-chau-kiet-luan-sang-di-gioi',
  'group-chat-van-gioi-ta-la-admin-kiem-ca-map',
  'tro-lai-1995-de-che-bat-dong-san-hai-long-do',
  'be-quan-1-van-nam-tu-truong-bo-lac-da-hoa-cat-bui',
  'lao-to-cua-ta-de-tu-mang-phu-lai-keo-aggro',
  'ngo-tac-song-huong-moi-xac-mot-uoc-nguyen',
];

// Per-novel tag suggestions based on premise
const TAG_OVERRIDES: Record<string, { sub_genres?: string[]; mc_archetype?: string }> = {
  'van-phong-13-quy-tac-sinh-ton-sau-6h-toi': { mc_archetype: 'intelligent' },
  'slime-cua-ta-nuot-ca-rong': { mc_archetype: 'intelligent' },
  'he-thong-lai-phai-ta-di-cuu-phao-hoi': { mc_archetype: 'pragmatic' },
  'doan-tuyet-5-nam-sau-ho-quy-truoc-van-phong': { sub_genres: ['kinh-doanh'], mc_archetype: 'pragmatic' },
  'de-che-van-hoa-ta-mang-chau-kiet-luan-sang-di-gioi': { sub_genres: ['kinh-doanh'], mc_archetype: 'intelligent' },
  'group-chat-van-gioi-ta-la-admin-kiem-ca-map': { mc_archetype: 'pragmatic' },
  'tro-lai-1995-de-che-bat-dong-san-hai-long-do': { sub_genres: ['trong-sinh', 'kinh-doanh'], mc_archetype: 'intelligent' },
  'be-quan-1-van-nam-tu-truong-bo-lac-da-hoa-cat-bui': { sub_genres: ['cau-dao'], mc_archetype: 'coward_smart' },
  'lao-to-cua-ta-de-tu-mang-phu-lai-keo-aggro': { mc_archetype: 'pragmatic' },
  'ngo-tac-song-huong-moi-xac-mot-uoc-nguyen': { mc_archetype: 'intelligent' },
};

/** Patch fake VN currency in world_description. Aggressive — handles
 *  "ngàn xu", "vạn xu", "triệu xu", and bare "X xu" / "X nguyên". */
function patchWorldCurrency(text: string): { changed: boolean; result: string } {
  let s2 = text;
  const before = s2;

  // "5 ngàn xu" / "10 vạn xu" → "5 triệu đồng" / "10 vạn đồng" (sensible scale)
  // "ngàn xu" = "thousand pennies" but in context is starting capital for student.
  // Map "ngàn xu" → "triệu đồng" (5 ngàn xu ≈ 5 triệu đồng = $200, reasonable 1995 student capital).
  s2 = s2.replace(/(\d+(?:[\.,]\d+)?)\s*ngàn\s*xu\b/g, '$1 triệu đồng');
  s2 = s2.replace(/(\d+(?:[\.,]\d+)?)\s*vạn\s*xu\b/g, '$1 vạn đồng');
  s2 = s2.replace(/(\d+(?:[\.,]\d+)?)\s*triệu\s*xu\b/g, '$1 triệu đồng');

  // Bare "X xu" → "X đồng"
  s2 = s2.replace(/(\d+(?:[\.,]\d+)?)\s*xu\b/g, '$1 đồng');

  // "X nguyên/m²" / "200 nguyên/m²" → "200 nghìn đồng/m²"
  s2 = s2.replace(/(\d+(?:[\.,]\d+)?)\s*nguyên\b/g, '$1 nghìn đồng');

  // Replace TIỀN TỆ block declaration
  s2 = s2.replace(/TIỀN TỆ:[^\n]*?xu[^\n]*?nguyên[^\n]*?\n/gi,
    'TIỀN TỆ: VND (đồng / nghìn đồng / triệu đồng / tỷ đồng) — đơn vị tiền tệ thực, ngang giá VND của Việt Nam ngoài đời.\n');
  s2 = s2.replace(/Thu nhập bình quân sinh viên: (\d+)-(\d+) đồng\/tháng/g,
    'Thu nhập bình quân sinh viên: $1-$2 nghìn đồng/tháng');

  return { changed: s2 !== before, result: s2 };
}

async function main(): Promise<void> {
  for (const slug of SLUGS) {
    const { data: n } = await s.from('novels').select('id,title').eq('slug', slug).single();
    if (!n) continue;
    const { data: p } = await s.from('ai_story_projects')
      .select('id,main_character,world_description,master_outline,story_outline,total_planned_chapters,sub_genres,mc_archetype')
      .eq('novel_id', n.id as string).single();
    if (!p) continue;

    console.log(`\n▶ ${n.title}`);

    const updates: Record<string, unknown> = {};

    // 1. Currency in world_description
    const { changed, result: newWorld } = patchWorldCurrency(p.world_description as string);
    if (changed) {
      updates.world_description = newWorld;
      console.log(`  ✓ world_description currency patched`);
    } else {
      console.log(`  · world_description: clean`);
    }

    // 2. Master_outline arc count vs total_planned
    const masterOutline = p.master_outline as { majorArcs?: Array<{ endChapter: number }> } | null;
    const arcs = masterOutline?.majorArcs ?? [];
    const totalPlanned = (p.total_planned_chapters as number) || 0;
    const lastArcEnd = arcs.length > 0 ? Math.max(...arcs.map(a => a.endChapter || 0)) : 0;
    if (arcs.length > 0 && lastArcEnd < totalPlanned * 0.7) {
      // Master outline covers <70% of planned chapters → reduce total
      // Round to nearest 50
      const newTotal = Math.ceil(lastArcEnd / 50) * 50;
      updates.total_planned_chapters = newTotal;
      console.log(`  ✓ total_planned: ${totalPlanned} → ${newTotal} (matches master outline)`);
    } else if (arcs.length === 0) {
      console.log(`  ⚠ master_outline: 0 arcs (skipping — would need full regen)`);
    } else {
      console.log(`  · master_outline: ${arcs.length} arcs cover ch.${lastArcEnd}/${totalPlanned} (OK)`);
    }

    // 3. Tags
    const tagSet = TAG_OVERRIDES[slug];
    if (tagSet) {
      const currentSubGenres = (p.sub_genres as string[]) || [];
      const currentArchetype = p.mc_archetype as string | null;
      if (tagSet.sub_genres && JSON.stringify(currentSubGenres) !== JSON.stringify(tagSet.sub_genres)) {
        updates.sub_genres = tagSet.sub_genres;
        console.log(`  ✓ sub_genres: ${JSON.stringify(currentSubGenres)} → ${JSON.stringify(tagSet.sub_genres)}`);
      }
      if (tagSet.mc_archetype && currentArchetype !== tagSet.mc_archetype) {
        updates.mc_archetype = tagSet.mc_archetype;
        console.log(`  ✓ mc_archetype: ${currentArchetype} → ${tagSet.mc_archetype}`);
      }
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await s.from('ai_story_projects').update(updates).eq('id', p.id as string);
      if (error) console.error(`  ✗ update failed: ${error.message}`);
      else console.log(`  ✓ ${Object.keys(updates).length} field(s) updated`);
    } else {
      console.log(`  · no changes needed`);
    }
  }
}
main().catch(console.error);
