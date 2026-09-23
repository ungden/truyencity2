/**
 * Draft a premise package for one archetype. A person reads and edits the draft before it
 * joins the catalog; nothing here seeds, approves or publishes.
 *
 *   npm run serial:propose -- --archetype=beast_taming                 # dry run, no spend
 *   npm run serial:propose -- --archetype=beast_taming --apply         # ~$0.10
 *
 * Output: factory/serial/lanes/<archetype>.draft.json plus the validation report.
 */
import dotenv from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { geminiProvider } from '@/services/story-factory/provider';
import { proposePremise } from '@/services/serial/agents';
import { assertSerialLaunchable, LANES, premiseLint } from '@/services/serial/contracts';
import { archetypeOf } from '@/services/serial/playbook';
import { DEFAULT_SERIAL_ROUTES } from '@/services/serial/routes';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const apply = process.argv.includes('--apply');
const value = (name: string): string | undefined =>
  process.argv.find(item => item.startsWith(`--${name}=`))?.split('=').slice(1).join('=');

/** Editorial direction per lane: what Faloo readers of this lane come for, minus its IP and excess. */
const DIRECTION: Record<string, { lane: (typeof LANES)[number]; brief: string }> = {
  card_profession: {
    lane: 'toan_dan_chuc_nghiep',
    brief: 'Liên bang tự đặt tên, không phải quốc gia thật. Mọi người mười tám tuổi thức tỉnh chức nghiệp; main thức tỉnh một nghề luyện thẻ bị xem là nghề phụ, nhưng có một cách luyện thẻ không ai có và thấy ngay kết quả ở chương một. Thẻ có phẩm màu Trắng, Lục, Lam, Tím, Kim, Đỏ; quái vật và thẻ đều tự sáng tác, tuyệt đối không mượn game, anime hay truyện có thật. Đấu trường: học viện, kiểm định, hầm ngục, giải đấu liên viện. Tránh sao chép tiền đề "thuộc tính thời không" hay "làm ít được nhiều" của sách đang đứng đầu.',
  },
  clan_legacy: {
    lane: 'gia_toc_tu_tien',
    brief: 'Thế giới tu tiên tự đặt tên. Main là gia chủ trẻ của một gia tộc tu tiên sa sút bị gia tộc lớn chèn ép; hệ thống thưởng theo hậu duệ và đệ tử: mỗi người nhập tộc có tư chất càng cao thì phần thưởng càng lớn, có thành tựu theo mốc. Hôn nhân là liên minh gia tộc, kể kín đáo, không có cảnh tình dục; thu đồ đệ và nhận con nuôi cũng tính. Thời gian được nhảy tháng/năm. Đấu trường: phường thị, tông môn, cuộc chiến giành linh mạch, đại hội gia tộc.',
  },
  beast_taming: {
    lane: 'ngu_thu',
    brief: 'Thế giới ngự thú tự đặt tên. Main có con mắt nhìn ra đường tiến hóa ẩn của sủng thú mà các học giả không biết; sủng thú khởi đầu bị chê là phế vật, có tính cách và độc thoại riêng. Mỗi lần tiến hóa đổi tên, đổi hình, đổi kỹ năng. Đấu trường: kiểm định trường, giải thành phố, giải khu vực, bí cảnh, liên minh ngự thú. Tránh sao chép tiền đề "sủng thú đến từ tương lai" và "mỗi ngày một quẻ" của sách đang đứng đầu.',
  },
  rule_horror: {
    lane: 'quy_tac_quai_dam',
    brief: 'Quái đàm giáng lâm một thành phố hiện đại tự đặt tên (không phải thành phố thật). Người bị chọn phải vào phó bản có bộ quy tắc, trong đó có điều sai. Main có một lợi thế riêng giúp đọc xuyên quy tắc, thấy ngay ở chương một, và mỗi phó bản thông quan cho một bậc sức mạnh và vật phẩm quỷ dị. Nỗi sợ đến từ chi tiết đời thường lệch đi, không từ máu me. Phó bản đầu là một nơi quen thuộc (chung cư, trường học, bệnh viện). Tránh sao chép tiền đề "mỗi ngày làm mới một thân phận cấm kỵ" của sách đang đứng đầu.',
  },
};

async function main(): Promise<void> {
  const archetype = value('archetype') ?? '';
  const shape = archetypeOf(archetype);
  const direction = DIRECTION[archetype];
  if (!shape || !direction) throw new Error(`--archetype must be one of: ${Object.keys(DIRECTION).join(', ')}`);
  const outDir = join('factory', 'serial', 'lanes');
  const outFile = join(outDir, `${archetype}.draft.json`);
  console.log(JSON.stringify({ dryRun: !apply, archetype, lane: direction.lane, route: DEFAULT_SERIAL_ROUTES.premise, outFile }, null, 2));
  if (!apply) {
    console.log('\nDry run: no provider call. Re-run with --apply (~$0.10).');
    return;
  }
  let result: Awaited<ReturnType<typeof proposePremise>>;
  try {
    result = await proposePremise({
    provider: geminiProvider,
    routes: DEFAULT_SERIAL_ROUTES,
    lane: direction.lane,
    archetype,
    direction: [
      direction.brief,
      `archetype phải là ${archetype}, lane phải là ${direction.lane}, schemaVersion 2.`,
      `presentation.coverPath phải là /covers/serial-lanes/${archetype.replaceAll('_', '-')}.webp`,
      'Hook và readerFantasy nói thẳng lời hứa, không trì hoãn.',
    ],
    avoid: [
      'Song Xuyên Mạt Thế: Cửa Hàng Của Ta Bán Công Pháp Tu Tiên',
      'Tên quốc gia, thành phố, triều đại, thương hiệu, nhân vật có thật; thẻ, quái vật, nhân vật của game, anime, truyện có thật.',
    ],
    });
  } catch (error) {
    // Keep what was paid for: a near-valid draft plus its issues is a person's edit, not a re-roll.
    const evidence = (error as { evidence?: { candidate?: unknown; issues?: unknown; usage?: { costUsd?: number } } }).evidence;
    if (evidence?.candidate) {
      mkdirSync(outDir, { recursive: true });
      writeFileSync(outFile, `${JSON.stringify(evidence.candidate, null, 2)}\n`);
      writeFileSync(outFile.replace(/\.json$/, '.issues.json'), `${JSON.stringify(evidence.issues, null, 2)}\n`);
      console.error(JSON.stringify({ savedDraft: outFile, issues: evidence.issues, costUsd: evidence.usage?.costUsd }, null, 2));
    }
    throw error;
  }
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, `${JSON.stringify(result.value, null, 2)}\n`);
  let launchable: string | null = null;
  try { assertSerialLaunchable(result.value); } catch (error) { launchable = error instanceof Error ? error.message : String(error); }
  console.log(JSON.stringify({
    title: result.value.title,
    archetype: result.value.archetype,
    lint: premiseLint(result.value),
    launchable: launchable ?? 'ok',
    costUsd: result.usage.costUsd,
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
