/**
 * Generate the same cover backdrop on several image models so a person can look at them
 * side by side and pick. Nothing about cover quality can be settled from a leaderboard.
 *
 *   npm run cover:bakeoff                                  # dry run: prints the plan and the cost
 *   npm run cover:bakeoff -- --apply
 *   npm run cover:bakeoff -- --models=gpt-image-2.5-sunburst,gemini-3-pro-image --apply
 */
import dotenv from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateCoverBackdrop, COVER_IMAGE_QUALITY } from '@/services/story-factory/cover-image';

dotenv.config({ path: '.env.runtime', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const apply = process.argv.includes('--apply');
const value = (name: string): string | undefined =>
  process.argv.find(item => item.startsWith(`--${name}=`))?.split('=').slice(1).join('=');

const DEFAULT_MODELS = ['gpt-image-2.5-sunburst', 'gpt-image-2.5-flare', 'gemini-3-pro-image'];
const DEFAULT_PROMPT =
  'Một thanh niên Việt trẻ đứng giữa gian tiệm đồ cổ chật chội ở một thành phố lớn, '
  + 'ánh đèn vàng hắt lên những kệ gốm sứ và đồng hồ cũ, trên tay anh là một chiếc chén sứt mẻ '
  + 'phát ra quầng sáng xanh mờ. Không khí đô thị hiện đại pha huyền ảo, tông xanh lam và vàng đồng, '
  + 'bố cục dọc, nhân vật ở nửa dưới khung hình.';

async function main(): Promise<void> {
  const models = (value('models') ?? DEFAULT_MODELS.join(',')).split(',').map(model => model.trim()).filter(Boolean);
  const prompt = value('prompt') ?? DEFAULT_PROMPT;
  const outDir = value('out') ?? join('factory', 'covers', new Date().toISOString().replace(/[:.]/g, '-'));

  console.log(JSON.stringify({ apply, models, quality: COVER_IMAGE_QUALITY, outDir, prompt }, null, 2));
  if (!apply) {
    console.log('\nDry run: nothing was generated. Re-run with --apply (roughly $0.10 per OpenAI image).');
    return;
  }

  mkdirSync(outDir, { recursive: true });
  let spend = 0;
  for (const model of models) {
    const startedAt = Date.now();
    try {
      const backdrop = await generateCoverBackdrop({ prompt, model });
      const file = join(outDir, `${model.replace(/[^a-z0-9.-]/gi, '_')}.png`);
      writeFileSync(file, backdrop.buffer);
      spend += backdrop.costUsd;
      console.log(`${model}  ${((Date.now() - startedAt) / 1000).toFixed(1)}s  $${backdrop.costUsd.toFixed(3)} (${backdrop.costBasis})  → ${file}`);
    } catch (error) {
      console.error(`${model}  failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  console.log(`\nTotal $${spend.toFixed(3)}. Look at them and set COVER_IMAGE_MODEL to the winner.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
