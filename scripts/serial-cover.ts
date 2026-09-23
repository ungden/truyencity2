/**
 * Render the launch cover a catalog premise points at (presentation.coverPath), using the
 * same backdrop + typography pipeline as the factory. Dry run by default.
 *
 *   npm run serial:cover -- --id=beast-taming
 *   npm run serial:cover -- --id=beast-taming --apply        # ~$0.10 per OpenAI image
 */
import dotenv from 'dotenv';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { SERIAL_PREMISE_CATALOG } from '@/services/serial/catalog';
import { renderFactoryCover } from '@/services/story-factory/cover';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const apply = process.argv.includes('--apply');
const value = (name: string): string | undefined =>
  process.argv.find(item => item.startsWith(`--${name}=`))?.split('=').slice(1).join('=');

/** Scene for the backdrop, per lane: no text, no real places, the promise in one image. */
const BACKDROP: Record<string, string> = {
  'card-profession': 'Một thiếu niên châu Á mười tám tuổi đứng giữa lễ đường học viện tương lai, trong tay là tấm thẻ phát sáng đổi màu từ lục sang đỏ rực, quanh người lơ lửng nhiều lá thẻ bài trống; phía sau là cổng hầm ngục khổng lồ tỏa sương đen. Tông lam đậm và đỏ cam, bố cục dọc, nhân vật ở nửa dưới khung hình, không có chữ.',
  'clan-legacy': 'Một gia chủ trẻ mặc trường bào đứng trước từ đường cổ trên núi mây, sau lưng là cuốn gia phả phát sáng mở ra giữa không trung, dưới chân là linh điền và dòng linh mạch ánh xanh chạy vào núi; bên cạnh là một bé gái cầm kiếm băng. Tông ngọc bích và vàng kim, bố cục dọc, nhân vật ở nửa dưới, không có chữ.',
  'beast-taming': 'Một thanh niên nghèo mặc áo huấn thú cũ đứng trong đấu trường ngự thú đông khán giả, bên cạnh là con chó dị hình xấu xí đang lột xác thành chiến thú bóng tối có hàm xương sắc, những đường vân tiến hóa phát sáng quanh nó. Tông tím than và cam lửa, bố cục dọc, nhân vật ở nửa dưới, không có chữ.',
  'rule-horror': 'Một shipper trẻ mặc áo mưa giao hàng đứng trong hành lang chung cư cũ lúc nửa đêm, đèn huỳnh quang chập chờn, trên tường là tờ nội quy dán băng keo với một dòng chữ bị gạch xám phát sáng mờ, cuối hành lang là cửa thang máy hé mở tối đen. Tông xanh lạnh và vàng bệnh viện, không khí rùng rợn nhưng không máu me, bố cục dọc, không có chữ đọc được.',
};

async function main(): Promise<void> {
  const id = value('id') ?? '';
  const entry = SERIAL_PREMISE_CATALOG.find(item => item.id === id);
  const backdrop = BACKDROP[id];
  if (!entry || !backdrop) throw new Error(`--id must be one of: ${Object.keys(BACKDROP).join(', ')}`);
  const out = join('public', entry.premise.presentation.coverPath);
  console.log(JSON.stringify({ dryRun: !apply, id, title: entry.premise.title, out, exists: existsSync(out) }, null, 2));
  if (!apply) {
    console.log('\nDry run: nothing generated. Re-run with --apply (~$0.10).');
    return;
  }
  const cover = await renderFactoryCover({ title: entry.premise.title, backgroundPrompt: backdrop });
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, cover.buffer);
  console.log(JSON.stringify({ wrote: out, bytes: cover.buffer.length, model: cover.model, costUsd: cover.costUsd }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
