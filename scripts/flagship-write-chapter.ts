import { writeFlagshipChapter } from '../src/services/story-engine/flagship/runtime';

async function main(): Promise<void> {
  const projectId = process.argv.find(value => value.startsWith('--project='))?.slice('--project='.length);
  if (!projectId) throw new Error('Usage: npm run flagship:write -- --project=<uuid>');
  const result = await writeFlagshipChapter({ projectId });
  console.log(JSON.stringify(result, null, 2));
}
main().catch(error => { console.error(error); process.exit(1); });
